//! Fallback Spotify metadata source that scrapes the public `open.spotify.com/embed/...`
//! pages. Used when the official Web API is not available (e.g. the developer account
//! lacks Premium, which Spotify now requires for Web API access).
//!
//! The embed pages ship a `__NEXT_DATA__` JSON blob with enough metadata for our
//! YouTube-search flow: track title, artist, and duration. They require no auth,
//! but only return up to ~100 items per playlist and the markup is unofficial,
//! so this is a best-effort fallback rather than a primary source.

use reqwest::Client;
use serde_json::Value;
use tracing::{info, warn};

use crate::spotify::{SpotifyError, SpotifyTrack};

const USER_AGENT: &str = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 \
    (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const NEXT_DATA_OPEN: &str = "<script id=\"__NEXT_DATA__\"";
const SCRIPT_CLOSE: &str = "</script>";

pub async fn fetch_track(client: &Client, id: &str) -> Result<SpotifyTrack, SpotifyError> {
    let url = format!("https://open.spotify.com/embed/track/{id}");
    let html = fetch_html(client, &url).await?;
    let entity = entity_from_html(&html)?;
    parse_track_entity(&entity)
}

pub async fn fetch_playlist_tracks(
    client: &Client,
    id: &str,
) -> Result<Vec<SpotifyTrack>, SpotifyError> {
    let url = format!("https://open.spotify.com/embed/playlist/{id}");
    let html = fetch_html(client, &url).await?;
    let entity = entity_from_html(&html)?;
    let (raw_count, tracks) = parse_track_list(&entity);
    if tracks.is_empty() {
        return Err(SpotifyError::Empty);
    }
    // The embed page caps trackList at 100 items, with no pagination cursor accessible
    // without API auth. We check the raw count (pre-filter) so the warning still fires
    // when the page shipped 100 items but some were unplayable.
    if raw_count == 100 {
        warn!(
            "Spotify embed returned exactly 100 tracks for playlist {id}; \
             playlist may have additional tracks that cannot be fetched without API access"
        );
    }
    Ok(tracks)
}

pub async fn fetch_album_tracks(
    client: &Client,
    id: &str,
) -> Result<Vec<SpotifyTrack>, SpotifyError> {
    let url = format!("https://open.spotify.com/embed/album/{id}");
    let html = fetch_html(client, &url).await?;
    let entity = entity_from_html(&html)?;
    let (_, tracks) = parse_track_list(&entity);
    if tracks.is_empty() {
        return Err(SpotifyError::Empty);
    }
    Ok(tracks)
}

async fn fetch_html(client: &Client, url: &str) -> Result<String, SpotifyError> {
    info!("Fetching Spotify embed: {}", url);
    let resp = client
        .get(url)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| SpotifyError::Network(e.to_string()))?;
    let status = resp.status();
    if status == reqwest::StatusCode::NOT_FOUND {
        return Err(SpotifyError::NotFound);
    }
    if !status.is_success() {
        return Err(SpotifyError::BadResponse(format!("embed status {status}")));
    }
    resp.text()
        .await
        .map_err(|e| SpotifyError::Network(e.to_string()))
}

fn entity_from_html(html: &str) -> Result<Value, SpotifyError> {
    let json = extract_next_data(html)?;
    json.pointer("/props/pageProps/state/data/entity")
        .cloned()
        .ok_or_else(|| {
            SpotifyError::BadResponse("Spotify embed missing /props/.../entity".into())
        })
}

fn extract_next_data(html: &str) -> Result<Value, SpotifyError> {
    let tag_start = html
        .find(NEXT_DATA_OPEN)
        .ok_or_else(|| SpotifyError::BadResponse("__NEXT_DATA__ script not found".into()))?;
    let after_open_rel = html[tag_start..]
        .find('>')
        .ok_or_else(|| SpotifyError::BadResponse("__NEXT_DATA__ tag not closed".into()))?;
    let body_start = tag_start + after_open_rel + 1;
    let body_end_rel = html[body_start..]
        .find(SCRIPT_CLOSE)
        .ok_or_else(|| SpotifyError::BadResponse("__NEXT_DATA__ script unterminated".into()))?;
    let body = &html[body_start..body_start + body_end_rel];
    serde_json::from_str(body)
        .map_err(|e| SpotifyError::BadResponse(format!("__NEXT_DATA__ JSON parse: {e}")))
}

fn parse_track_entity(entity: &Value) -> Result<SpotifyTrack, SpotifyError> {
    let name = entity
        .get("title")
        .and_then(Value::as_str)
        .ok_or_else(|| SpotifyError::BadResponse("track entity missing title".into()))?
        .to_string();
    let artist = entity
        .get("artists")
        .and_then(Value::as_array)
        .and_then(|a| a.first())
        .and_then(|a| a.get("name"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let duration_ms = entity
        .get("duration")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    Ok(SpotifyTrack {
        name,
        artist,
        duration_ms,
    })
}

/// Returns `(raw_count, playable_tracks)`. The raw count is the unfiltered trackList
/// length — useful for detecting the embed's 100-item truncation regardless of how many
/// of those 100 were unplayable.
fn parse_track_list(entity: &Value) -> (usize, Vec<SpotifyTrack>) {
    let Some(items) = entity.get("trackList").and_then(Value::as_array) else {
        return (0, Vec::new());
    };
    let tracks = items
        .iter()
        .filter_map(|item| {
            // Skip items the embed flags as not playable (region-locked, removed, etc.).
            if !item.get("isPlayable").and_then(Value::as_bool).unwrap_or(true) {
                return None;
            }
            let name = item.get("title").and_then(Value::as_str)?.to_string();
            let artist = item
                .get("subtitle")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            let duration_ms = item.get("duration").and_then(Value::as_u64).unwrap_or(0);
            Some(SpotifyTrack {
                name,
                artist,
                duration_ms,
            })
        })
        .collect();
    (items.len(), tracks)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn wrap_in_next_data(entity_json: &str) -> String {
        format!(
            r#"<html><body><script id="__NEXT_DATA__" type="application/json">{{"props":{{"pageProps":{{"state":{{"data":{{"entity":{entity_json}}}}}}}}}}}</script></body></html>"#
        )
    }

    #[test]
    fn extracts_entity_from_next_data_html() {
        let html = wrap_in_next_data(r#"{"title":"Fireflies"}"#);
        let entity = entity_from_html(&html).unwrap();
        assert_eq!(entity.get("title").and_then(Value::as_str), Some("Fireflies"));
    }

    #[test]
    fn missing_next_data_is_bad_response() {
        let err = entity_from_html("<html><body>nothing here</body></html>").unwrap_err();
        assert!(matches!(err, SpotifyError::BadResponse(_)));
    }

    #[test]
    fn malformed_next_data_json_is_bad_response() {
        let html = r#"<script id="__NEXT_DATA__" type="application/json">not json</script>"#;
        let err = entity_from_html(html).unwrap_err();
        assert!(matches!(err, SpotifyError::BadResponse(_)));
    }

    #[test]
    fn missing_entity_path_is_bad_response() {
        let html = r#"<script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>"#;
        let err = entity_from_html(html).unwrap_err();
        assert!(matches!(err, SpotifyError::BadResponse(_)));
    }

    #[test]
    fn parses_track_entity() {
        let entity: Value = serde_json::from_str(
            r#"{"title":"Fireflies","artists":[{"name":"Owl City"}],"duration":228346}"#,
        )
        .unwrap();
        let track = parse_track_entity(&entity).unwrap();
        assert_eq!(track.name, "Fireflies");
        assert_eq!(track.artist, "Owl City");
        assert_eq!(track.duration_ms, 228346);
    }

    #[test]
    fn track_entity_without_artists_yields_empty_artist() {
        let entity: Value =
            serde_json::from_str(r#"{"title":"Untitled","duration":1000}"#).unwrap();
        let track = parse_track_entity(&entity).unwrap();
        assert_eq!(track.name, "Untitled");
        assert_eq!(track.artist, "");
    }

    #[test]
    fn track_entity_missing_title_is_bad_response() {
        let entity: Value = serde_json::from_str(r#"{"duration":1000}"#).unwrap();
        assert!(matches!(
            parse_track_entity(&entity),
            Err(SpotifyError::BadResponse(_))
        ));
    }

    #[test]
    fn parses_track_list_with_playable_filter() {
        let entity: Value = serde_json::from_str(
            r#"{"trackList":[
                {"title":"a","subtitle":"x","duration":1000,"isPlayable":true},
                {"title":"b","subtitle":"y","duration":2000,"isPlayable":false},
                {"title":"c","subtitle":"z","duration":3000}
            ]}"#,
        )
        .unwrap();
        let (raw, tracks) = parse_track_list(&entity);
        assert_eq!(raw, 3, "raw count should include unplayable items");
        assert_eq!(tracks.len(), 2);
        assert_eq!(tracks[0].name, "a");
        assert_eq!(tracks[0].artist, "x");
        assert_eq!(tracks[0].duration_ms, 1000);
        assert_eq!(tracks[1].name, "c");
    }

    #[test]
    fn parse_track_list_without_field_returns_empty() {
        let entity: Value = serde_json::from_str("{}").unwrap();
        let (raw, tracks) = parse_track_list(&entity);
        assert_eq!(raw, 0);
        assert!(tracks.is_empty());
    }
}
