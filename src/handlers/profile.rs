use std::time::Duration;

use axum::{
    Router,
    body::Bytes,
    extract::{Path, State},
    http::{StatusCode, header},
    routing::{get, post},
};
use diesel::{
    dsl::sql,
    prelude::*,
    sql_types::{Nullable, Timestamptz},
};
use diesel_async::RunQueryDsl;

use crate::{
    AppState, Pool, db, ggst_api,
    schema::{player_profile_refreshes as refreshes, player_profile_values as values},
};

type ApiError = (StatusCode, String);

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/avatar/:player_id", get(avatar))
        .route("/api/comment/:player_id", get(comment))
        .route("/api/profile_refresh/:player_id", post(refresh))
}

#[derive(Clone, Copy)]
enum ProfileField {
    Avatar,
    Comment,
}

impl ProfileField {
    fn name(self) -> &'static str {
        match self {
            Self::Avatar => "avatar",
            Self::Comment => "comment",
        }
    }

    async fn fetch(self, player_id: i64) -> Result<Vec<u8>, String> {
        match self {
            Self::Avatar => ggst_api::get_player_avatar(player_id.to_string())
                .await
                .map(|image| image.to_vec()),
            Self::Comment => ggst_api::get_player_comment(player_id.to_string())
                .await
                .map(String::into_bytes),
        }
    }
}

fn storage_error(error: impl std::fmt::Display) -> ApiError {
    tracing::error!(%error, "GGST profile storage failed");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Could not access stored GGST profile".into(),
    )
}

fn unavailable(message: impl Into<String>) -> ApiError {
    (StatusCode::SERVICE_UNAVAILABLE, message.into())
}

fn check_connection() -> Result<(), ApiError> {
    if !std::path::Path::new("token.txt").exists() {
        return Err(unavailable("GGST is not connected, patch?"));
    }
    Ok(())
}

async fn ensure_player(pool: &Pool, player_id: i64) -> Result<(), ApiError> {
    let mut db = pool.get().await.map_err(storage_error)?;
    if !db::player_exists(&mut db, player_id)
        .await
        .map_err(storage_error)?
    {
        return Err((StatusCode::NOT_FOUND, "Player not found".into()));
    }
    Ok(())
}

async fn load_payload(
    pool: &Pool,
    player_id: i64,
    field: ProfileField,
) -> Result<Vec<u8>, ApiError> {
    let mut db = pool.get().await.map_err(storage_error)?;
    values::table
        .find((player_id, field.name()))
        .select(values::payload)
        .first::<Option<Vec<u8>>>(&mut db)
        .await
        .optional()
        .map_err(storage_error)?
        .flatten()
        .ok_or_else(|| (StatusCode::NOT_FOUND, "No saved GGST profile value".into()))
}

// A lease prevents multiple API replicas from fetching the same field at once.
// Its expiry lets a later request recover if a worker exits before saving.
async fn claim_fetch(
    pool: &Pool,
    player_id: i64,
    field: ProfileField,
    fetch_id: &str,
) -> Result<bool, ApiError> {
    let mut db = pool.get().await.map_err(storage_error)?;
    let expiry = || sql::<Nullable<Timestamptz>>("now() + interval '90 seconds'");
    let available = values::fetch_until
        .is_null()
        .or(values::fetch_until.le(sql::<Nullable<Timestamptz>>("now()")));
    let claim = diesel::insert_into(values::table)
        .values((
            values::player_id.eq(player_id),
            values::kind.eq(field.name()),
            values::fetch_id.eq(fetch_id),
            values::fetch_until.eq(expiry()),
        ))
        .on_conflict((values::player_id, values::kind))
        .do_update()
        .set((
            values::fetch_id.eq(fetch_id),
            values::fetch_until.eq(expiry()),
        ));
    let affected = diesel::query_dsl::methods::FilterDsl::filter(claim, available)
        .execute(&mut db)
        .await
        .map_err(storage_error)?;
    Ok(affected == 1)
}

async fn fetch_and_save(
    pool: &Pool,
    player_id: i64,
    field: ProfileField,
    fetch_id: &str,
) -> Result<(), ApiError> {
    let result = tokio::time::timeout(Duration::from_secs(75), field.fetch(player_id))
        .await
        .unwrap_or_else(|_| Err("GGST profile fetch timed out".into()));
    let mut db = pool.get().await.map_err(storage_error)?;
    let row = values::table
        .find((player_id, field.name()))
        .filter(values::fetch_id.eq(fetch_id));
    let release = (
        values::fetch_id.eq(None::<&str>),
        values::fetch_until.eq(None::<chrono::DateTime<chrono::Utc>>),
    );

    match result {
        Ok(payload) => {
            let affected = diesel::update(row)
                .set((
                    values::payload.eq(&payload),
                    values::fetched_at.eq(sql::<Nullable<Timestamptz>>("now()")),
                    release,
                ))
                .execute(&mut db)
                .await
                .map_err(storage_error)?;
            if affected == 0 {
                return Err(unavailable("GGST profile fetch expired; retry later"));
            }
            Ok(())
        }
        Err(error) => {
            diesel::update(row)
                .set(release)
                .execute(&mut db)
                .await
                .map_err(storage_error)?;
            Err(unavailable(error))
        }
    }
}

async fn avatar(
    Path(player_id): Path<i64>,
    State(state): State<AppState>,
) -> Result<([(header::HeaderName, &'static str); 2], Bytes), ApiError> {
    let payload = load_payload(&state.db_pool, player_id, ProfileField::Avatar).await?;
    Ok((
        [
            (header::CONTENT_TYPE, "image/png"),
            (header::CACHE_CONTROL, "no-store"),
        ],
        Bytes::from(payload),
    ))
}

async fn comment(
    Path(player_id): Path<i64>,
    State(state): State<AppState>,
) -> Result<String, ApiError> {
    let payload = load_payload(&state.db_pool, player_id, ProfileField::Comment).await?;
    String::from_utf8(payload).map_err(storage_error)
}

async fn claim_refresh(pool: &Pool, player_id: i64) -> Result<(), ApiError> {
    let mut db = pool.get().await.map_err(storage_error)?;
    let claim = diesel::insert_into(refreshes::table)
        .values((
            refreshes::player_id.eq(player_id),
            refreshes::requested_at.eq(diesel::dsl::now),
        ))
        .on_conflict(refreshes::player_id)
        .do_update()
        .set(refreshes::requested_at.eq(diesel::dsl::now));
    let affected = diesel::query_dsl::methods::FilterDsl::filter(
        claim,
        refreshes::requested_at.le(sql::<Timestamptz>("now() - interval '24 hours'")),
    )
    .execute(&mut db)
    .await
    .map_err(storage_error)?;
    if affected == 0 {
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            "Avatars and comments can be refreshed once every 24 hours per player.".into(),
        ));
    }
    Ok(())
}

async fn refresh_field(pool: &Pool, player_id: i64, field: ProfileField) -> Result<(), ApiError> {
    let fetch_id = uuid::Uuid::new_v4().to_string();
    if !claim_fetch(pool, player_id, field, &fetch_id).await? {
        return Err(unavailable("GGST profile fetch is already in progress"));
    }
    fetch_and_save(pool, player_id, field, &fetch_id).await
}

async fn refresh(
    Path(player_id): Path<i64>,
    State(state): State<AppState>,
) -> Result<StatusCode, ApiError> {
    let pool = &state.db_pool;
    ensure_player(pool, player_id).await?;
    check_connection()?;
    claim_refresh(pool, player_id).await?;

    // Replace each stored value after a successful fetch so an outage preserves
    // the previous profile. Each successful field is saved independently.
    let pool = pool.clone();
    tokio::spawn(async move {
        let (avatar, comment) = tokio::join!(
            refresh_field(&pool, player_id, ProfileField::Avatar),
            refresh_field(&pool, player_id, ProfileField::Comment),
        );
        avatar?;
        comment?;
        Ok(StatusCode::NO_CONTENT)
    })
    .await
    .map_err(storage_error)?
}
