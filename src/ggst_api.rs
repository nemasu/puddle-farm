use crate::{requests, responses, responses::Response};
use aes_gcm::{
    aead::{generic_array::GenericArray, Aead},
    Aes256Gcm, KeyInit,
};
use hex;
use lazy_static::lazy_static;
use reqwest::header;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tracing::{debug, error, info, warn};
use std::{error::Error, ops::Deref};
use tokio::sync::Mutex;

lazy_static! {
    pub static ref TOKEN: Mutex<Option<String>> = Mutex::new(None);
    
    /// Reusing a single client maintains a connection pool and 
    /// ensures stable SNI/TLS handling across requests.
    pub static ref HTTP_CLIENT: reqwest::Client = reqwest::Client::builder()
        .user_agent("GGST/Steam")
        .build()
        .expect("Failed to create reqwest client");
}

pub async fn get_player_stats(player_id: String) -> Result<String, String> {
    let request_data = requests::generate_player_stats_request(player_id);
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

    let response_bytes = response.bytes().await.map_err(|e| e.to_string())?;

    if let Ok(r) = decrypt_response::<responses::PlayerStats>(&response_bytes) {
        Ok(r.body.json)
    } else {
        Err("Couldn't get player stats".to_owned())
    }
}

pub async fn get_player_comment(player_id: String) -> Result<String, String> {
    let request_data = requests::generate_player_stats_request(player_id);
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

    let response_bytes = response.bytes().await.map_err(|e| e.to_string())?;

    if let Ok(r) = decrypt_response::<responses::PlayerStats>(&response_bytes) {
        let parsed: Value = serde_json::from_str(&r.body.json)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;

        if let Some(comment) = parsed.get("PublicComment").and_then(|v| v.as_str()) {
            return Ok(comment.to_owned());
        }
        Err("Comment not found".to_owned())
    } else {
        Err("Couldn't get player stats".to_owned())
    }
}

pub async fn get_player_avatar(player_id: String) -> Result<String, String> {
    let request_data = requests::generate_player_avatar_request(player_id);
    let request_data = encrypt_data(&request_data);

    let response = HTTP_CLIENT
        .post("https://ggst-game.guiltygear.com/api/tus/read")
        .header(header::CACHE_CONTROL, "no-store")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .header("x-client-version", "1")
        .form(&[("data", request_data)])
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let response_bytes = response.bytes().await.map_err(|e| e.to_string())?;

    if let Ok(r) = decrypt_response::<responses::PlayerAvatar>(&response_bytes) {
        Ok(r.body.png)
    } else {
        Err("Couldn't get player avatar".to_owned())
    }
}

pub async fn get_token() -> Result<String, String> {
    {
        let token = TOKEN.lock().await;
        if let Some(t) = token.deref() {
            debug!("Already have a strive token");
            return Ok(t.to_owned());
        }
    }

    warn!("Grabbing steam token");
    let request_data = requests::generate_login_request().await;
    let request_data = encrypt_data(&request_data);

    let response = HTTP_CLIENT
        .post("https://ggst-game.guiltygear.com/api/user/login")
        .header(header::CACHE_CONTROL, "no-store")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .header("x-client-version", "1")
        .form(&[("data", request_data)])
        .send()
        .await
        .unwrap_or_else(|err| {
            error!("get_token send() error: {}", err);
            panic!("Critical TLS or Network failure: {}", err);
        });

    let response_bytes = response.bytes().await.unwrap();
    
    info!("Waiting for strive token");
    let mut t = TOKEN.lock().await;

    if let Ok(r) = decrypt_response::<responses::Login>(&response_bytes) {
        info!("Got token: {}", r.header.token);
        *t = Some(r.header.token.to_owned());
        let _ = std::fs::write("token.txt", r.header.token.clone());
        Ok(r.header.token)
    } else {
        Err("Couldn't get strive token".to_owned())
    }
}

pub async fn get_replays() -> Result<Vec<responses::Replay>, String> {
    let token = get_token().await?;
    let mut replays = Vec::new();

    for i in 0..5 {
        debug!("Grabbing replays (page {i})");
        let request_data = requests::generate_replay_request(i, 127, &token);
        let request_data = encrypt_data(&request_data);

        let response = HTTP_CLIENT
            .post("https://ggst-game.guiltygear.com/api/catalog/get_replay")
            .header(header::CACHE_CONTROL, "no-store")
            .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
            .header("x-client-version", "1")
            .form(&[("data", request_data)])
            .send()
            .await
            .map_err(|err| {
                error!("get_replay (page {}) send() error: {}", i, err);
                err.to_string()
            })?;

        let response_bytes = response.bytes().await.map_err(|e| e.to_string())?;

        match decrypt_response::<responses::Replays>(&response_bytes) {
            Ok(r) => replays.extend_from_slice(&r.body.replays),
            Err(err) => {
                error!("get_replay decrypt_response() error: {}", err);
                return Err("Failed to decrypt replay data".to_owned());
            }
        };
    }

    Ok(replays)
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

fn decrypt_response<T: for<'a> Deserialize<'a>>(
    bytes: &[u8],
) -> Result<Response<T>, Box<dyn Error>> {
    let key =
        hex::decode("EEBC1F57487F51921C0465665F8AE6D1658BB26DE6F8A069A3520293A572078F").unwrap();
    let aes_gcm = Aes256Gcm::new_from_slice(&key).unwrap();

    if bytes.len() < 12 {
        error!("decrypt_response: response too short ({} bytes)", bytes.len());
        return Err(format!("response too short: {} bytes", bytes.len()).into());
    }

    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&bytes[..12]);
    let nonce = GenericArray::from(nonce);

    let decrypted = match aes_gcm.decrypt(&nonce, &bytes[12..]) {
        Ok(decrypted) => decrypted,
        Err(e) => {
            error!("decrypt_response: AES-GCM decrypt failed: {:?}", e);
            return Err(format!("decrypt failed: {:?}", e).into());
        }
    };

    match rmp_serde::from_slice::<responses::Response<T>>(&decrypted) {
        Ok(r) => Ok(r),
        Err(e) => {
            error!("Error in received msgpack!");
            error!("Deserialization error: {:?}", e);
            let mut owned_string: String = "".to_owned();

            for b in &decrypted {
                owned_string.push_str(&format!("{:02X}", b));
            }
            error!("Raw msgpack hex: {}", owned_string);
            error!("Decrypted length: {} bytes", decrypted.len());

            Err(Box::new(e))
        }
    }
}
