use crate::{requests, responses, responses::Response};
use aes_gcm::{
    Aes256Gcm, KeyInit,
    aead::{Aead, generic_array::GenericArray},
};
use hex;
use lazy_static::lazy_static;
use reqwest::header;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{error::Error, fmt, ops::Deref};
use tokio::sync::Mutex;
use tracing::{debug, error, info, warn};

struct BlockedSession {
    token: String,
    blocked_at: std::time::SystemTime,
}

lazy_static! {
    pub static ref TOKEN: Mutex<Option<String>> = Mutex::new(None);
    static ref PROFILE_REQUESTS: std::sync::Mutex<ProfileRequests> = std::sync::Mutex::new(ProfileRequests::default());
    static ref PROFILE_PACING: Mutex<Option<tokio::time::Instant>> = Mutex::new(None);
    static ref PROFILE_SLOTS: tokio::sync::Semaphore = tokio::sync::Semaphore::new(4);
    static ref BLOCKED_TOKEN: Mutex<Option<BlockedSession>> = Mutex::new(None);

    /// Reusing a single client maintains a connection pool and
    /// ensures stable SNI/TLS handling across requests.
    /// Idle connections are dropped before the GGST server's keep-alive
    /// timeout closes them under us ("connection closed before message
    /// completed" on reuse).
    pub static ref HTTP_CLIENT: reqwest::Client = reqwest::Client::builder()
        .user_agent("GGST/Steam")
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(60))
        .pool_idle_timeout(std::time::Duration::from_secs(20))
        .build()
        .expect("Failed to create reqwest client");
}

#[derive(Debug)]
pub enum ReplayPageError {
    /// The request did not complete reliably. Reusing the current GGST session
    /// is safe, so the puller may try it again later.
    Transient(String),
    /// GGST answered, but the response was not one the client understands.
    /// Continuing to send requests with this session could make a bad server
    /// response loop indefinitely.
    Session(String),
}

impl ReplayPageError {
    pub fn blocks_session(&self) -> bool {
        matches!(self, Self::Session(_))
    }
}

impl fmt::Display for ReplayPageError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Transient(message) | Self::Session(message) => formatter.write_str(message),
        }
    }
}

impl Error for ReplayPageError {}

pub async fn block_session(token: &str, error: &str) {
    if mark_session_blocked(token).await {
        warn!(%error, "Paused GGST requests for the current API session");
    }
}

async fn mark_session_blocked(token: &str) -> bool {
    let mut blocked = BLOCKED_TOKEN.lock().await;
    if blocked
        .as_ref()
        .is_some_and(|session| session.token == token)
    {
        false
    } else {
        *blocked = Some(BlockedSession {
            token: token.to_owned(),
            blocked_at: std::time::SystemTime::now(),
        });
        true
    }
}

pub async fn session_is_blocked(token: &str) -> bool {
    let mut blocked = BLOCKED_TOKEN.lock().await;
    let resume_reason = match blocked.deref() {
        None => return false,
        Some(session) if session.token != token => "a new API session arrived",
        // Touching token.txt after the block (e.g. once server maintenance
        // ends) requests a retry of the same session without a new token.
        Some(session) if file_modified_since("token.txt", session.blocked_at) => {
            "token.txt was touched to request a retry"
        }
        Some(_) => return true,
    };
    info!("Resuming GGST server requests; {resume_reason}");
    *blocked = None;
    false
}

fn file_modified_since(path: &str, reference: std::time::SystemTime) -> bool {
    std::fs::metadata(path)
        .and_then(|metadata| metadata.modified())
        .map(|modified| modified > reference)
        .unwrap_or(false)
}

async fn ensure_session_is_active(token: &str) -> Result<(), String> {
    if session_is_blocked(token).await {
        Err("the current GGST API session is blocked".to_owned())
    } else {
        Ok(())
    }
}

fn is_transient_status(status: reqwest::StatusCode) -> bool {
    status.as_u16() == 408 || status.as_u16() == 429 || status.is_server_error()
}

async fn decode_session_response<T: for<'a> Deserialize<'a>>(
    response: reqwest::Response,
    token: &str,
    operation: &str,
) -> Result<Response<T>, String> {
    let status = response.status();
    if !status.is_success() {
        let message = format!("{operation} returned HTTP {status}");
        if !is_transient_status(status) {
            block_session(token, &message).await;
        }
        return Err(message);
    }

    // Reading the body can fail because the connection dropped mid-response.
    // That remains retryable and must not poison the current session.
    let response_bytes = response
        .bytes()
        .await
        .map_err(|error| format!("{operation} response body failed: {error}"))?;

    match decrypt_response(&response_bytes) {
        Ok(response) => Ok(response),
        Err(error) => {
            let message = format!("{operation} response could not be decoded: {error}");
            block_session(token, &message).await;
            Err(message)
        }
    }
}

pub async fn get_player_stats(player_id: String) -> Result<String, String> {
    let token = get_token(false).await?;
    ensure_session_is_active(&token).await?;
    let request_data = requests::generate_player_stats_request(player_id, &token);
    let request_data = encrypt_data(&request_data);

    let response = HTTP_CLIENT
        .post("https://ggst-game.guiltygear.com/api/statistics/get")
        .header(header::CACHE_CONTROL, "no-store")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .header("x-client-version", "1")
        .form(&[("data", request_data)])
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let decoded =
        decode_session_response::<responses::PlayerStats>(response, &token, "get_player_stats")
            .await?;
    if let Err(error) = serde_json::from_str::<Value>(&decoded.body.json) {
        let message = format!("get_player_stats returned invalid JSON: {error}");
        block_session(&token, &message).await;
        return Err(message);
    }
    Ok(decoded.body.json)
}

// State locks are never held across network operations. Track token changes
// separately from cooldowns: late successes cannot clear a cooldown, but fatal
// responses for the current token must still pause that session.
#[derive(Default)]
struct ProfileRequests {
    token: String,
    cooldown: Option<tokio::time::Instant>,
    token_epoch: u64,
    cooldown_epoch: u64,
    in_flight: usize,
}

impl ProfileRequests {
    fn is_probe(&self, now: tokio::time::Instant) -> Result<bool, String> {
        match self.cooldown {
            Some(until) if now < until || self.in_flight > 0 => {
                Err("GGST avatars/comments are cooling down or probing; retry later".into())
            }
            Some(_) => Ok(true),
            None => Ok(false),
        }
    }

    fn finish(
        &mut self,
        probe: bool,
        error: Option<&ProfileError>,
        now: tokio::time::Instant,
    ) -> bool {
        match error {
            None => {
                self.cooldown = None;
                false
            }
            Some(_) if probe => {
                self.cooldown = None;
                true
            }
            Some(ProfileError::Status(1 | 201, _)) => {
                self.cooldown = Some(now + std::time::Duration::from_secs(60));
                self.cooldown_epoch += 1;
                false
            }
            Some(ProfileError::Fatal(_) | ProfileError::Status(_, _)) => true,
            Some(ProfileError::Transient(_)) => false,
        }
    }
}

struct ProfileFlight<'a> {
    state: &'a std::sync::Mutex<ProfileRequests>,
    token_epoch: u64,
    cooldown_epoch: u64,
    probe: bool,
}

impl<'a> ProfileFlight<'a> {
    fn begin(
        state: &'a std::sync::Mutex<ProfileRequests>,
        token: &str,
        current_token: Option<&str>,
    ) -> Result<Self, String> {
        if current_token != Some(token) {
            return Err("GGST session changed while waiting; retry the request".into());
        }
        let mut gate = state.lock().unwrap();
        if gate.token != token {
            gate.token = token.to_owned();
            gate.cooldown = None;
            gate.token_epoch += 1;
        }
        let probe = gate.is_probe(tokio::time::Instant::now())?;
        gate.in_flight += 1;
        Ok(Self {
            state,
            token_epoch: gate.token_epoch,
            cooldown_epoch: gate.cooldown_epoch,
            probe,
        })
    }

    fn finish(&self, error: Option<&ProfileError>) -> bool {
        let mut gate = self.state.lock().unwrap();
        if gate.token_epoch != self.token_epoch {
            return false;
        }
        if gate.cooldown_epoch != self.cooldown_epoch {
            // Preserve the newer cooldown, except that fatal current-session
            // errors still take the existing session pause path.
            return match error {
                Some(ProfileError::Fatal(_)) => true,
                Some(ProfileError::Status(code, _)) => !matches!(code, 1 | 201),
                _ => false,
            };
        }
        gate.finish(self.probe, error, tokio::time::Instant::now())
    }
}

impl Drop for ProfileFlight<'_> {
    fn drop(&mut self) {
        self.state.lock().unwrap().in_flight -= 1;
    }
}

// Serialize the final admission check with pacing, but release the lock before
// awaiting the response. Admission may stall: record the next start only after
// it succeeds, so requests cannot bunch up behind token/session locks.
async fn dispatch_profile<A>(
    pacing: &Mutex<Option<tokio::time::Instant>>,
    admit: impl std::future::Future<Output = Result<A, String>>,
) -> Result<A, String> {
    let mut next = pacing.lock().await;
    if let Some(deadline) = *next {
        tokio::time::sleep_until(deadline).await;
    }
    let admitted = admit.await?;
    *next = Some(tokio::time::Instant::now() + std::time::Duration::from_millis(200));
    Ok(admitted)
}

#[cfg(test)]
async fn pace_profile(pacing: &Mutex<Option<tokio::time::Instant>>) {
    dispatch_profile(pacing, async { Ok(()) }).await.unwrap();
}

enum ProfileValue {
    Comment(String),
    Avatar(axum::body::Bytes),
}

enum ProfileError {
    Status(i64, String),
    Fatal(String),
    Transient(String),
}

impl ProfileError {
    fn message(&self) -> &str {
        match self {
            Self::Status(_, message) | Self::Fatal(message) | Self::Transient(message) => message,
        }
    }
}

async fn profile_response<T: for<'a> Deserialize<'a>>(
    url: &str,
    request_data: String,
) -> Result<Response<T>, ProfileError> {
    let request = HTTP_CLIENT
        .post(url)
        .header(header::CACHE_CONTROL, "no-store")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .header("x-client-version", "1")
        .form(&[("data", request_data)]);
    let response = request
        .send()
        .await
        .map_err(|e| ProfileError::Transient(e.to_string()))?;
    let status = response.status();
    if !status.is_success() {
        let message = format!("HTTP {status}");
        return Err(if is_transient_status(status) {
            ProfileError::Transient(message)
        } else {
            ProfileError::Fatal(message)
        });
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|e| ProfileError::Transient(e.to_string()))?;
    decrypt_response(&bytes).map_err(|message| {
        match decrypt_response::<responses::ServerStatus>(&bytes) {
            Ok(status) => ProfileError::Status(status.body.code, message),
            Err(_) => ProfileError::Fatal(message),
        }
    })
}

async fn get_profile(player_id: String, avatar: bool) -> Result<ProfileValue, String> {
    let token = get_token(false).await?;
    {
        let gate = PROFILE_REQUESTS.lock().unwrap();
        if gate.token == token {
            gate.is_probe(tokio::time::Instant::now())?;
        }
    }
    let data = if avatar {
        encrypt_data(&requests::generate_player_avatar_request(
            player_id.clone(),
            &token,
        ))
    } else {
        encrypt_data(&requests::generate_player_stats_request(
            player_id.clone(),
            &token,
        ))
    };
    let (_slot, flight) = tokio::time::timeout(std::time::Duration::from_secs(5), async {
        let slot = PROFILE_SLOTS.acquire().await.unwrap();
        // Keep token refresh and gate admission ordered. Merely calling
        // get_token again would leave an await/race before begin().
        let flight = dispatch_profile(&PROFILE_PACING, async {
            let mut current = TOKEN.lock().await;
            load_token_file("token.txt", &mut current)?;
            if current.as_deref() != Some(token.as_str()) {
                return Err("GGST session changed while waiting; retry the request".into());
            }
            ensure_session_is_active(&token).await?;
            ProfileFlight::begin(&PROFILE_REQUESTS, &token, current.as_deref())
        })
        .await?;
        Ok::<_, String>((slot, flight))
    })
    .await
    .map_err(|_| "GGST avatar/comment request queue is busy; retry later".to_owned())??;
    let probe = flight.probe;
    let operation = if avatar {
        "get_player_avatar"
    } else {
        "get_player_comment"
    };
    info!(operation, player_id, probe, "Starting GGST profile request");
    let result = async {
        if avatar {
            let response = profile_response::<responses::PlayerAvatar>(
                "https://ggst-game.guiltygear.com/api/tus/read",
                data,
            )
            .await?;
            let image = crate::handlers::avatar::handle_get_avatar(&response.body.png)
                .map_err(ProfileError::Transient)?;
            Ok(ProfileValue::Avatar(image))
        } else {
            let response = profile_response::<responses::PlayerStats>(
                "https://ggst-game.guiltygear.com/api/statistics/get",
                data,
            )
            .await?;
            let parsed: Value = serde_json::from_str(&response.body.json)
                .map_err(|e| ProfileError::Fatal(e.to_string()))?;
            parsed
                .get("PublicComment")
                .and_then(Value::as_str)
                .map(|text| ProfileValue::Comment(text.to_owned()))
                .ok_or_else(|| ProfileError::Transient("Comment not found".into()))
        }
    }
    .await;
    let pause = flight.finish(result.as_ref().err());
    match result {
        Ok(value) => {
            info!(
                operation,
                player_id, probe, "GGST profile request succeeded"
            );
            Ok(value)
        }
        Err(error) => {
            let message = format!("{operation} failed: {}", error.message());
            warn!(operation, player_id, probe, pause, error = %message, "GGST profile request failed");
            if pause {
                block_session(&token, &message).await;
            }
            Err(message)
        }
    }
}

pub async fn get_player_comment(player_id: String) -> Result<String, String> {
    match get_profile(player_id, false).await? {
        ProfileValue::Comment(comment) => Ok(comment),
        _ => unreachable!(),
    }
}

pub async fn get_player_avatar(player_id: String) -> Result<axum::body::Bytes, String> {
    match get_profile(player_id, true).await? {
        ProfileValue::Avatar(avatar) => Ok(avatar),
        _ => unreachable!(),
    }
}

pub async fn get_token(create_token: bool) -> Result<String, String> {
    // Hold the lock for the entire check-and-fetch so concurrent callers
    // block here rather than racing to open duplicate GGST login requests.
    let mut token = TOKEN.lock().await;

    // The API and puller share token.txt. Pick up a replacement session
    // without restarting either process.
    if let Some(disk_token) = load_token_file("token.txt", &mut token)? {
        return Ok(disk_token);
    }

    if !create_token {
        return Err(
            "GGST API token is unavailable; waiting for Puller to create token.txt".to_owned(),
        );
    }

    warn!("Grabbing steam token");
    let (request_data, _steam_client) = requests::generate_login_request().await?;
    let request_data = encrypt_data(&request_data);

    let response = HTTP_CLIENT
        .post("https://ggst-game.guiltygear.com/api/user/login")
        .header(header::CACHE_CONTROL, "no-store")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .header("x-client-version", "1")
        .form(&[("data", request_data)])
        .send()
        .await
        .map_err(|error| {
            error!("get_token send() error: {}", error);
            format!("GGST login request failed: {error}")
        })?;

    let response_bytes = response.bytes().await.map_err(|error| {
        error!("get_token response body error: {}", error);
        format!("GGST login response failed: {error}")
    })?;

    match decrypt_response::<responses::Login>(&response_bytes) {
        Ok(r) => {
            info!("Got GGST API token");
            write_token_file(&r.header.token)?;
            *token = Some(r.header.token.to_owned());
            Ok(r.header.token)
        }
        Err(error) => Err(format!("Couldn't get strive token: {error}")),
    }
}

fn load_token_file(path: &str, token: &mut Option<String>) -> Result<Option<String>, String> {
    match std::fs::read_to_string(path) {
        Ok(disk_token) if !disk_token.trim().is_empty() => {
            let disk_token = disk_token.trim();
            if token.as_deref() != Some(disk_token) {
                info!("Loaded updated GGST API token from token.txt");
                *token = Some(disk_token.to_owned());
            }
            Ok(Some(disk_token.to_owned()))
        }
        Ok(_) => {
            if token.take().is_some() {
                info!("token.txt is empty; discarded the cached GGST API token");
            }
            Ok(None)
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            if token.take().is_some() {
                info!("token.txt was removed; discarded the cached GGST API token");
            }
            Ok(None)
        }
        Err(error) => Err(format!("Could not read {path}: {error}")),
    }
}

fn write_token_file(token: &str) -> Result<(), String> {
    let temporary_path = format!(".token.txt.{}.tmp", std::process::id());
    std::fs::write(&temporary_path, token)
        .map_err(|error| format!("Could not write temporary GGST API token: {error}"))?;
    if let Err(error) = std::fs::rename(&temporary_path, "token.txt") {
        let _ = std::fs::remove_file(&temporary_path);
        return Err(format!("Could not publish GGST API token: {error}"));
    }
    Ok(())
}

pub const REPLAYS_PER_PAGE: usize = 127;
const REPLAY_REQUEST_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(60);

pub async fn get_replay_page(
    token: &str,
    index: usize,
) -> Result<Vec<responses::Replay>, ReplayPageError> {
    debug!("Grabbing replays (page {index})");
    let request_data = requests::generate_replay_request(index, REPLAYS_PER_PAGE, token);
    let request_data = encrypt_data(&request_data);

    // One retry: a pooled connection can still be closed by the server at the
    // exact moment it is reused, which surfaces as a transient send() error.
    let mut response = None;
    for attempt in 0..2 {
        match HTTP_CLIENT
            .post("https://ggst-game.guiltygear.com/api/catalog/get_replay")
            .header(header::CACHE_CONTROL, "no-store")
            .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
            .header("x-client-version", "1")
            .form(&[("data", &request_data)])
            .timeout(REPLAY_REQUEST_TIMEOUT)
            .send()
            .await
        {
            Ok(r) => {
                response = Some(r);
                break;
            }
            Err(err) if attempt == 0 => {
                warn!(
                    "get_replay (page {}) send() failed, retrying: {}",
                    index, err
                );
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            }
            Err(err) => {
                error!("get_replay (page {}) send() error: {}", index, err);
                return Err(ReplayPageError::Transient(err.to_string()));
            }
        }
    }
    let response = response.expect("response set when loop breaks");

    let status = response.status();
    if !status.is_success() {
        let message = format!("get_replay (page {index}) returned HTTP {status}");
        return if is_transient_status(status) {
            Err(ReplayPageError::Transient(message))
        } else {
            Err(ReplayPageError::Session(message))
        };
    }

    let response_bytes = response
        .bytes()
        .await
        .map_err(|error| ReplayPageError::Transient(error.to_string()))?;

    match decrypt_response::<responses::Replays>(&response_bytes) {
        Ok(r) => Ok(r.body.replays),
        Err(err) => {
            error!("get_replay decrypt_response() error: {}", err);
            Err(ReplayPageError::Session(format!(
                "failed to decode replay data: {err}"
            )))
        }
    }
}

pub async fn get_rank_match_legend() -> Result<Vec<responses::LegendPlayer>, String> {
    let token = get_token(false).await?;
    ensure_session_is_active(&token).await?;
    let request_data = requests::generate_rank_match_legend_request(&token);
    let request_data = encrypt_data(&request_data);

    let response = HTTP_CLIENT
        .post("https://ggst-game.guiltygear.com/api/ranking/get_rank_match_legend")
        .header(header::CACHE_CONTROL, "no-store")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .header("x-client-version", "1")
        .form(&[("data", request_data)])
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let message = format!("get_rank_match_legend returned HTTP {status}");
        if !is_transient_status(status) {
            block_session(&token, &message).await;
        }
        return Err(message);
    }

    let response_bytes = response.bytes().await.map_err(|e| e.to_string())?;

    match decrypt_response::<responses::RankMatchLegend>(&response_bytes) {
        Ok(r) => Ok(r.body.players),
        Err(e) => {
            error!("get_rank_match_legend decrypt_response() error: {}", e);
            let message = format!("Couldn't decode rank match legend: {e}");
            block_session(&token, &message).await;
            Err(message)
        }
    }
}

pub async fn get_rank_match_mr(
    page: i64,
    char_id: i64,
) -> Result<Vec<responses::MrPlayer>, String> {
    let token = get_token(false).await?;
    ensure_session_is_active(&token).await?;
    let request_data = requests::generate_rank_match_mr_request(&token, page, char_id);
    let request_data = encrypt_data(&request_data);

    let response = HTTP_CLIENT
        .post("https://ggst-game.guiltygear.com/api/ranking/rank_match_mr")
        .header(header::CACHE_CONTROL, "no-store")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .header("x-client-version", "1")
        .form(&[("data", request_data)])
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let message = format!("get_rank_match_mr returned HTTP {status}");
        if !is_transient_status(status) {
            block_session(&token, &message).await;
        }
        return Err(message);
    }

    let response_bytes = response.bytes().await.map_err(|e| e.to_string())?;

    match decrypt_response::<responses::RankMatchMr>(&response_bytes) {
        Ok(r) => Ok(r.body.players),
        Err(e) => {
            error!("get_rank_match_mr decrypt_response() error: {}", e);
            let message = format!("Couldn't decode rank match MR: {e}");
            block_session(&token, &message).await;
            Err(message)
        }
    }
}

pub async fn get_rank_match_lp(
    page: i64,
    char_id: i64,
) -> Result<Vec<responses::LpPlayer>, String> {
    let token = get_token(false).await?;
    ensure_session_is_active(&token).await?;
    let request_data = requests::generate_rank_match_lp_request(&token, page, char_id);
    let request_data = encrypt_data(&request_data);

    let response = HTTP_CLIENT
        .post("https://ggst-game.guiltygear.com/api/ranking/rank_match_lp")
        .header(header::CACHE_CONTROL, "no-store")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .header("x-client-version", "1")
        .form(&[("data", request_data)])
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let message = format!("get_rank_match_lp returned HTTP {status}");
        if !is_transient_status(status) {
            block_session(&token, &message).await;
        }
        return Err(message);
    }

    let response_bytes = response.bytes().await.map_err(|e| e.to_string())?;

    match decrypt_response::<responses::RankMatchLp>(&response_bytes) {
        Ok(r) => Ok(r.body.players),
        Err(e) => {
            error!("get_rank_match_lp decrypt_response() error: {}", e);
            let message = format!("Couldn't decode rank match LP: {e}");
            block_session(&token, &message).await;
            Err(message)
        }
    }
}

fn encrypt_data<T: Serialize>(data: &T) -> String {
    let key =
        hex::decode("EEBC1F57487F51921C0465665F8AE6D1658BB26DE6F8A069A3520293A572078F").unwrap();

    let bytes = rmp_serde::to_vec(data).unwrap();
    //let mut nonce = [0u8; 12];
    //getrandom(&mut nonce).unwrap();
    let nonce: [u8; 12] = *b"\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00";
    let nonce_ga = nonce.into();

    let aes_gcm = Aes256Gcm::new_from_slice(&key).unwrap();
    let encrypted = aes_gcm.encrypt(&nonce_ga, &bytes[..]).unwrap();

    let mut data: Vec<u8> = Vec::new();
    data.extend_from_slice(&nonce);
    data.extend_from_slice(&encrypted);

    let r = base64_url::encode(&data);

    r
}

fn decrypt_response<T: for<'a> Deserialize<'a>>(bytes: &[u8]) -> Result<Response<T>, String> {
    let key =
        hex::decode("EEBC1F57487F51921C0465665F8AE6D1658BB26DE6F8A069A3520293A572078F").unwrap();
    let aes_gcm = Aes256Gcm::new_from_slice(&key).unwrap();

    if bytes.len() < 12 {
        error!(
            "decrypt_response: response too short ({} bytes)",
            bytes.len()
        );
        return Err(format!("response too short: {} bytes", bytes.len()));
    }

    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&bytes[..12]);
    let nonce = GenericArray::from(nonce);

    let decrypted = match aes_gcm.decrypt(&nonce, &bytes[12..]) {
        Ok(decrypted) => decrypted,
        Err(e) => {
            error!("decrypt_response: AES-GCM decrypt failed: {:?}", e);
            return Err(format!("decrypt failed: {:?}", e));
        }
    };

    deserialize_response(&decrypted)
}

fn deserialize_response<T: for<'a> Deserialize<'a>>(
    decrypted: &[u8],
) -> Result<Response<T>, String> {
    match rmp_serde::from_slice::<responses::Response<T>>(decrypted) {
        Ok(r) => Ok(r),
        Err(payload_error) => {
            if let Ok(response) =
                rmp_serde::from_slice::<responses::Response<responses::ServerStatus>>(decrypted)
            {
                let (version1, version2, version3) = response.header.versions();
                return Err(format!(
                    "GGST server returned status {} (advertised versions: {version1}, {version2}, {version3})",
                    response.body.code
                ));
            }

            error!(
                error = %payload_error,
                length = decrypted.len(),
                "Could not deserialize GGST response payload"
            );
            Err(payload_error.to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{ProfileError, ProfileRequests};
    use super::{
        ReplayPageError, deserialize_response, file_modified_since, is_transient_status,
        load_token_file, mark_session_blocked, session_is_blocked,
    };

    #[tokio::test(start_paused = true)]
    async fn delayed_token_lock_does_not_burst_outbound_requests() {
        use std::sync::Arc;
        use std::time::Duration;

        // Measure the dispatch boundary with Tokio's virtual clock. Server
        // accept/read timestamps can bunch together when the OS delays the
        // receiver and therefore cannot establish client-side pacing.
        let token_lock = Arc::new(tokio::sync::Mutex::new(()));
        let held_token = token_lock.lock().await;
        let pacing = Arc::new(tokio::sync::Mutex::new(None));
        let mut tasks = Vec::new();
        for _ in 0..4 {
            let (token_lock, pacing) = (token_lock.clone(), pacing.clone());
            tasks.push(tokio::spawn(async move {
                super::dispatch_profile(&pacing, async {
                    let _token = token_lock.lock().await;
                    Ok(())
                })
                .await
                .unwrap();
                tokio::time::Instant::now()
            }));
        }
        // Longer than three pacing intervals: previously this contention let
        // every task consume its pacing wait before the token was available.
        tokio::time::sleep(Duration::from_millis(650)).await;
        assert!(tasks.iter().all(|task| !task.is_finished()));
        let released = tokio::time::Instant::now();
        drop(held_token);
        let mut starts = Vec::new();
        for task in tasks {
            starts.push(task.await.unwrap());
        }
        starts.sort();
        assert_eq!(starts.len(), 4);
        assert!(starts[0] >= released);
        for pair in starts.windows(2) {
            assert!(pair[1].duration_since(pair[0]) >= Duration::from_millis(200));
        }
        assert!(starts[3].duration_since(released) >= Duration::from_millis(600));
    }

    #[tokio::test]
    async fn queued_dispatches_recheck_cooldown_and_session_pause() {
        use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
        for code in [1, 201, 4] {
            let state = std::sync::Mutex::new(ProfileRequests::default());
            let pacing = tokio::sync::Mutex::new(None);
            let paused = AtomicBool::new(false);
            let sent = AtomicUsize::new(0);
            let first = super::dispatch_profile(&pacing, async {
                super::ProfileFlight::begin(&state, "token", Some("token"))
            })
            .await
            .unwrap();
            sent.fetch_add(1, Ordering::SeqCst);
            let waiting = || async {
                let result = super::dispatch_profile(&pacing, async {
                    if paused.load(Ordering::SeqCst) {
                        return Err("session paused".into());
                    }
                    super::ProfileFlight::begin(&state, "token", Some("token"))
                })
                .await;
                if result.is_ok() {
                    sent.fetch_add(1, Ordering::SeqCst);
                }
                assert!(
                    result.is_err(),
                    "queued request must not send after status {code}"
                );
            };
            let response = async {
                // The other three requests have reached pacing when the first
                // response arrives, before their next permitted outbound start.
                tokio::time::sleep(std::time::Duration::from_millis(20)).await;
                let pause = first.finish(Some(&ProfileError::Status(code, "status".into())));
                assert_eq!(pause, code == 4);
                paused.store(pause, Ordering::SeqCst);
                drop(first);
            };
            tokio::join!(response, waiting(), waiting(), waiting());
            assert_eq!(sent.load(Ordering::SeqCst), 1);
            assert_eq!(state.lock().unwrap().in_flight, 0);
        }
    }

    #[tokio::test]
    async fn profile_requests_are_spaced_without_catch_up_bursts() {
        let pacing = tokio::sync::Mutex::new(None);
        super::pace_profile(&pacing).await;
        let first = tokio::time::Instant::now();
        super::pace_profile(&pacing).await;
        assert!(first.elapsed() >= std::time::Duration::from_millis(190));
        *pacing.lock().await =
            Some(tokio::time::Instant::now() - std::time::Duration::from_secs(1));
        super::pace_profile(&pacing).await;
        assert!(pacing.lock().await.unwrap() > tokio::time::Instant::now());
    }

    #[tokio::test]
    async fn slow_response_does_not_serialize_other_requests() {
        let state = std::sync::Mutex::new(ProfileRequests::default());
        let pacing = tokio::sync::Mutex::new(None);
        super::pace_profile(&pacing).await;
        let slow = super::ProfileFlight::begin(&state, "token", Some("token")).unwrap();
        // Keep the first flight alive while another request gets its start slot.
        super::pace_profile(&pacing).await;
        let second = super::ProfileFlight::begin(&state, "token", Some("token")).unwrap();
        assert_eq!(state.lock().unwrap().in_flight, 2);
        assert!(!second.finish(None));
        drop(second);
        drop(slow);
        assert_eq!(state.lock().unwrap().in_flight, 0);
    }

    #[test]
    fn late_success_cannot_clear_cooldown_and_probe_is_exclusive() {
        let state = std::sync::Mutex::new(ProfileRequests::default());
        let first = super::ProfileFlight::begin(&state, "token", Some("token")).unwrap();
        let late = super::ProfileFlight::begin(&state, "token", Some("token")).unwrap();
        assert!(!first.finish(Some(&ProfileError::Status(1, "status".into()))));
        drop(first);
        assert!(!late.finish(None));
        assert!(state.lock().unwrap().cooldown.is_some());
        state.lock().unwrap().cooldown = Some(tokio::time::Instant::now());
        assert!(super::ProfileFlight::begin(&state, "token", Some("token")).is_err());
        drop(late);
        let probe = super::ProfileFlight::begin(&state, "token", Some("token")).unwrap();
        assert!(probe.probe);
        assert!(super::ProfileFlight::begin(&state, "token", Some("token")).is_err());
        // Dropping an unfinished future drops its flight guard too.
        drop(probe);
        let retry = super::ProfileFlight::begin(&state, "token", Some("token")).unwrap();
        assert!(retry.probe);
        assert!(!retry.finish(None));
        drop(retry);
        assert!(
            !super::ProfileFlight::begin(&state, "token", Some("token"))
                .unwrap()
                .probe
        );
    }

    #[test]
    fn cooldown_does_not_suppress_concurrent_fatal_errors_for_current_token() {
        for trigger in [1, 201] {
            for error in [
                ProfileError::Status(4, "renew session".into()),
                ProfileError::Status(2, "maintenance".into()),
                ProfileError::Fatal("HTTP 403".into()),
                ProfileError::Fatal("invalid JSON".into()),
            ] {
                let state = std::sync::Mutex::new(ProfileRequests::default());
                let first = super::ProfileFlight::begin(&state, "token", Some("token")).unwrap();
                let late = super::ProfileFlight::begin(&state, "token", Some("token")).unwrap();
                assert!(!first.finish(Some(&ProfileError::Status(trigger, "status".into()))));
                let cooldown = state.lock().unwrap().cooldown;
                assert!(
                    late.finish(Some(&error)),
                    "fatal response must request a session pause"
                );
                assert_eq!(state.lock().unwrap().cooldown, cooldown);
            }
        }
    }

    #[test]
    fn late_retryable_errors_do_not_extend_or_clear_cooldown() {
        for error in [
            ProfileError::Status(1, "status".into()),
            ProfileError::Status(201, "status".into()),
            ProfileError::Transient("HTTP 503".into()),
        ] {
            let state = std::sync::Mutex::new(ProfileRequests::default());
            let first = super::ProfileFlight::begin(&state, "token", Some("token")).unwrap();
            let late = super::ProfileFlight::begin(&state, "token", Some("token")).unwrap();
            assert!(!first.finish(Some(&ProfileError::Status(1, "status".into()))));
            let cooldown = state.lock().unwrap().cooldown;
            assert!(!late.finish(Some(&error)));
            assert_eq!(state.lock().unwrap().cooldown, cooldown);
        }
    }

    #[test]
    fn queued_old_token_cannot_restore_epoch_or_hide_current_fatal_error() {
        let state = std::sync::Mutex::new(ProfileRequests::default());
        let old = super::ProfileFlight::begin(&state, "old", Some("old")).unwrap();
        drop(old); // Another old-token request is still waiting in the queue.
        let first = super::ProfileFlight::begin(&state, "new", Some("new")).unwrap();
        let concurrent = super::ProfileFlight::begin(&state, "new", Some("new")).unwrap();
        assert!(!first.finish(Some(&ProfileError::Status(1, "cooldown".into()))));
        let before = {
            let gate = state.lock().unwrap();
            (
                gate.token_epoch,
                gate.cooldown_epoch,
                gate.cooldown,
                gate.in_flight,
            )
        };
        assert!(super::ProfileFlight::begin(&state, "old", Some("new")).is_err());
        assert!(super::ProfileFlight::begin(&state, "old", None).is_err());
        {
            let gate = state.lock().unwrap();
            assert_eq!(gate.token, "new");
            assert_eq!(
                (
                    gate.token_epoch,
                    gate.cooldown_epoch,
                    gate.cooldown,
                    gate.in_flight
                ),
                before
            );
        }
        assert!(concurrent.finish(Some(&ProfileError::Status(4, "renew session".into()))));
    }

    #[test]
    fn old_session_response_cannot_change_new_session_state() {
        let state = std::sync::Mutex::new(ProfileRequests::default());
        let old = super::ProfileFlight::begin(&state, "old", Some("old")).unwrap();
        let new = super::ProfileFlight::begin(&state, "new", Some("new")).unwrap();
        assert!(!old.finish(Some(&ProfileError::Status(1, "status".into()))));
        assert!(!old.finish(Some(&ProfileError::Status(4, "renew session".into()))));
        assert!(!old.finish(Some(&ProfileError::Fatal("invalid JSON".into()))));
        assert!(state.lock().unwrap().cooldown.is_none());
        drop(old);
        drop(new);
    }

    #[test]
    fn profile_cooldown_allows_one_probe_after_sixty_seconds() {
        for code in [1, 201] {
            let now = tokio::time::Instant::now();
            let mut gate = ProfileRequests::default();
            assert!(!gate.finish(
                false,
                Some(&ProfileError::Status(code, "status".into())),
                now
            ));
            assert!(
                gate.is_probe(now + std::time::Duration::from_secs(59))
                    .is_err()
            );
            assert_eq!(
                gate.is_probe(now + std::time::Duration::from_secs(60)),
                Ok(true)
            );
            assert!(!gate.finish(true, None, now));
            assert_eq!(gate.is_probe(now), Ok(false));
        }
    }

    #[test]
    fn every_probe_failure_pauses_but_normal_transport_failure_does_not() {
        let now = tokio::time::Instant::now();
        for error in [
            ProfileError::Status(1, "status 1".into()),
            ProfileError::Status(201, "status 201".into()),
            ProfileError::Transient("HTTP 503".into()),
            ProfileError::Transient("timeout".into()),
            ProfileError::Transient("invalid avatar".into()),
            ProfileError::Transient("Comment not found".into()),
            ProfileError::Fatal("invalid JSON".into()),
        ] {
            let mut gate = ProfileRequests::default();
            assert!(gate.finish(true, Some(&error), now));
            assert!(gate.cooldown.is_none());
        }
        let mut gate = ProfileRequests::default();
        assert!(!gate.finish(
            false,
            Some(&ProfileError::Transient("HTTP 503".into())),
            now
        ));
        assert!(gate.finish(
            false,
            Some(&ProfileError::Status(4, "renew session".into())),
            now
        ));
    }

    #[test]
    fn only_server_and_protocol_errors_block_the_session() {
        assert!(!ReplayPageError::Transient("connection reset".into()).blocks_session());
        assert!(ReplayPageError::Session("unexpected response".into()).blocks_session());
        for status in [
            reqwest::StatusCode::REQUEST_TIMEOUT,
            reqwest::StatusCode::TOO_MANY_REQUESTS,
            reqwest::StatusCode::SERVICE_UNAVAILABLE,
            reqwest::StatusCode::BAD_GATEWAY,
        ] {
            assert!(is_transient_status(status));
        }
        assert!(!is_transient_status(reqwest::StatusCode::FORBIDDEN));
    }

    #[tokio::test]
    async fn a_different_session_clears_the_block() {
        assert!(mark_session_blocked("old-session").await);
        assert!(session_is_blocked("old-session").await);
        assert!(!mark_session_blocked("old-session").await);
        assert!(!session_is_blocked("new-session").await);
    }

    #[test]
    fn a_touched_token_file_counts_as_modified_since_the_block() {
        let path = std::env::temp_dir().join(format!("pf-touch-test-{}", std::process::id()));
        std::fs::write(&path, "token").unwrap();
        let path = path.to_str().unwrap();
        let hour = std::time::Duration::from_secs(3600);
        assert!(file_modified_since(
            path,
            std::time::SystemTime::now() - hour
        ));
        assert!(!file_modified_since(
            path,
            std::time::SystemTime::now() + hour
        ));
        assert!(!file_modified_since(
            "missing-token.txt",
            std::time::SystemTime::now() - hour
        ));
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn recognizes_server_status_without_exposing_the_session_token() {
        let response = (
            (
                "secret-session-token",
                1,
                "2026/09/01 07:00:04",
                "0.4.8",
                "0.0.2",
                "0.0.2",
                "",
                "",
            ),
            (2,),
        );
        let msgpack = rmp_serde::to_vec(&response).unwrap();

        let error = deserialize_response::<crate::responses::Replays>(&msgpack).unwrap_err();

        assert_eq!(
            error,
            "GGST server returned status 2 (advertised versions: 0.4.8, 0.0.2, 0.0.2)"
        );
        assert!(!error.contains("secret-session-token"));
    }

    #[test]
    fn read_only_consumer_loads_a_token_created_after_startup() {
        let path =
            std::env::temp_dir().join(format!("pf-token-watch-test-{}", uuid::Uuid::new_v4()));
        let path = path.to_str().unwrap();
        let mut cached_token = None;

        assert_eq!(load_token_file(path, &mut cached_token).unwrap(), None);

        std::fs::write(path, "new-session-token\n").unwrap();
        assert_eq!(
            load_token_file(path, &mut cached_token).unwrap(),
            Some("new-session-token".to_owned())
        );
        assert_eq!(cached_token.as_deref(), Some("new-session-token"));

        std::fs::remove_file(path).unwrap();
        assert_eq!(load_token_file(path, &mut cached_token).unwrap(), None);
        assert_eq!(cached_token, None);
    }
}
