use std::sync::Arc;

use rspotify::{
    clients::BaseClient,
    model::{AlbumId, PlayableItem, PlaylistId, SimplifiedArtist, TrackId},
    ClientCredsSpotify, ClientError, Credentials,
};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SpotifyError {
    #[error("Spotify auth failed: {0}")]
    Auth(String),
    #[error("Spotify network error: {0}")]
    Network(String),
    #[error("Spotify resource not found")]
    NotFound,
    #[error("Spotify resource has no playable tracks")]
    Empty,
    #[error("Unexpected Spotify response: {0}")]
    BadResponse(String),
}

impl From<ClientError> for SpotifyError {
    fn from(e: ClientError) -> Self {
        match &e {
            ClientError::Http(http_err) => {
                use rspotify::http::HttpError;
                match http_err.as_ref() {
                    HttpError::StatusCode(resp) => {
                        let status = resp.status();
                        if status == reqwest::StatusCode::NOT_FOUND {
                            SpotifyError::NotFound
                        } else if status == reqwest::StatusCode::UNAUTHORIZED
                            || status == reqwest::StatusCode::FORBIDDEN
                        {
                            SpotifyError::Auth(format!("status {status}"))
                        } else {
                            SpotifyError::BadResponse(format!("status {status}"))
                        }
                    }
                    HttpError::Client(re) => SpotifyError::Network(re.to_string()),
                }
            }
            ClientError::InvalidToken => SpotifyError::Auth(e.to_string()),
            ClientError::ParseJson(_) | ClientError::Model(_) => {
                SpotifyError::BadResponse(e.to_string())
            }
            _ => SpotifyError::BadResponse(e.to_string()),
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum SpotifyResource {
    Track(String),
    Playlist(String),
    Album(String),
}

#[derive(Debug, Clone)]
pub struct SpotifyTrack {
    pub name: String,
    pub artist: String,
    pub duration_ms: u64,
}

/// Parse an `open.spotify.com` URL into a resource.
/// Accepts optional `intl-xx/` locale prefix and ignores any query string.
/// Returns `None` for non-Spotify URLs or unsupported resource kinds.
pub fn parse_url(url: &str) -> Option<SpotifyResource> {
    let rest = url
        .strip_prefix("https://open.spotify.com/")
        .or_else(|| url.strip_prefix("http://open.spotify.com/"))?;

    // Strip query string / fragment.
    let rest = rest.split(['?', '#']).next().unwrap_or("");

    // Drop `intl-xx/` locale prefix if present.
    let rest = match rest.split_once('/') {
        Some((first, tail)) if first.starts_with("intl-") => tail,
        _ => rest,
    };

    let (kind, id) = rest.split_once('/')?;
    let id = id.split('/').next().unwrap_or("");
    if id.is_empty() {
        return None;
    }

    match kind {
        "track" => Some(SpotifyResource::Track(id.to_string())),
        "playlist" => Some(SpotifyResource::Playlist(id.to_string())),
        "album" => Some(SpotifyResource::Album(id.to_string())),
        _ => None,
    }
}

pub struct SpotifyClient {
    inner: ClientCredsSpotify,
}

fn make_spotify_track(
    name: String,
    artists: Vec<SimplifiedArtist>,
    duration_ms: i64,
) -> SpotifyTrack {
    SpotifyTrack {
        name,
        artist: artists
            .into_iter()
            .next()
            .map(|a| a.name)
            .unwrap_or_default(),
        duration_ms: u64::try_from(duration_ms).unwrap_or(0),
    }
}

impl SpotifyClient {
    pub fn new(client_id: String, client_secret: String) -> Arc<Self> {
        let creds = Credentials::new(&client_id, &client_secret);
        let inner = ClientCredsSpotify::new(creds);
        Arc::new(Self { inner })
    }

    /// Fetches the initial access token. Must be called once before the first
    /// API call. After that, rspotify's `auto_reauth` (enabled by default)
    /// transparently refreshes the token when it expires.
    pub async fn request_token(&self) -> Result<(), SpotifyError> {
        self.inner.request_token().await?;
        Ok(())
    }

    pub async fn fetch_track(&self, id: &str) -> Result<SpotifyTrack, SpotifyError> {
        let track_id = TrackId::from_id(id).map_err(|_| SpotifyError::NotFound)?;
        let track = self.inner.track(track_id, None).await?;
        Ok(make_spotify_track(
            track.name,
            track.artists,
            track.duration.num_milliseconds(),
        ))
    }

    pub async fn fetch_playlist_tracks(&self, id: &str) -> Result<Vec<SpotifyTrack>, SpotifyError> {
        let playlist_id = PlaylistId::from_id(id).map_err(|_| SpotifyError::NotFound)?;

        let mut tracks = Vec::new();
        let mut offset: u32 = 0;
        let limit: u32 = 100;
        loop {
            let page = self
                .inner
                .playlist_items_manual(playlist_id.as_ref(), None, None, Some(limit), Some(offset))
                .await?;

            let items_count = page.items.len() as u32;
            for item in page.items {
                if item.is_local {
                    continue;
                }
                let Some(PlayableItem::Track(track)) = item.item else {
                    continue;
                };
                if track.is_local {
                    continue;
                }
                tracks.push(make_spotify_track(
                    track.name,
                    track.artists,
                    track.duration.num_milliseconds(),
                ));
            }

            if page.next.is_none() || items_count == 0 {
                break;
            }
            offset += items_count;
        }

        if tracks.is_empty() {
            return Err(SpotifyError::Empty);
        }
        Ok(tracks)
    }

    pub async fn fetch_album_tracks(&self, id: &str) -> Result<Vec<SpotifyTrack>, SpotifyError> {
        let album_id = AlbumId::from_id(id).map_err(|_| SpotifyError::NotFound)?;

        let mut tracks = Vec::new();
        let mut offset: u32 = 0;
        let limit: u32 = 50;
        loop {
            let page = self
                .inner
                .album_track_manual(album_id.as_ref(), None, Some(limit), Some(offset))
                .await?;

            let items_count = page.items.len() as u32;
            for track in page.items {
                if track.is_local {
                    continue;
                }
                tracks.push(make_spotify_track(
                    track.name,
                    track.artists,
                    track.duration.num_milliseconds(),
                ));
            }

            if page.next.is_none() || items_count == 0 {
                break;
            }
            offset += items_count;
        }

        if tracks.is_empty() {
            return Err(SpotifyError::Empty);
        }
        Ok(tracks)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_track_url() {
        assert_eq!(
            parse_url("https://open.spotify.com/track/abc123"),
            Some(SpotifyResource::Track("abc123".into()))
        );
    }

    #[test]
    fn parse_playlist_url() {
        assert_eq!(
            parse_url("https://open.spotify.com/playlist/xyz"),
            Some(SpotifyResource::Playlist("xyz".into()))
        );
    }

    #[test]
    fn parse_album_url() {
        assert_eq!(
            parse_url("https://open.spotify.com/album/aaa"),
            Some(SpotifyResource::Album("aaa".into()))
        );
    }

    #[test]
    fn parse_url_with_intl_prefix() {
        assert_eq!(
            parse_url("https://open.spotify.com/intl-de/track/abc123"),
            Some(SpotifyResource::Track("abc123".into()))
        );
    }

    #[test]
    fn parse_url_strips_query_string() {
        assert_eq!(
            parse_url("https://open.spotify.com/track/abc123?si=foo"),
            Some(SpotifyResource::Track("abc123".into()))
        );
    }

    #[test]
    fn parse_url_rejects_non_spotify() {
        assert_eq!(parse_url("https://www.youtube.com/watch?v=x"), None);
    }

    #[test]
    fn parse_url_rejects_unsupported_kind() {
        assert_eq!(parse_url("https://open.spotify.com/artist/abc"), None);
    }

    #[test]
    fn parse_url_rejects_missing_id() {
        assert_eq!(parse_url("https://open.spotify.com/track/"), None);
    }
}
