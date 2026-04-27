use serde::Deserialize;
use songbird::events::{Event, TrackEvent};
use songbird::input::YoutubeDl;
use std::sync::Arc;
use tokio::process::Command as TokioCommand;
use tracing::{debug, error, info};

use crate::spotify::{SpotifyError, SpotifyResource};
use crate::utils::get_guild_data;
use crate::{
    check_msg, create_default_message, create_error_message, CommandResult, Context, GuildData,
    TrackEndNotifier, TrackErrorNotifier, TrackMetadata,
};

// TODO: support soundcloud sets

/// Play a song
#[poise::command(slash_command, guild_only)]
pub async fn play(
    ctx: Context<'_>,
    #[description = "Search term or url of the song"] search: String,
) -> CommandResult {
    if let Err(e) = ctx.defer().await {
        error!("Error deferring interaction: {:?}", e);
        return Ok(());
    }

    // Validate URL if it looks like a URL
    if search.starts_with("http") && !validate_url(&search) {
        let reply = create_error_message(
            "This platform is not supported. Currently supported platforms: YouTube, SoundCloud, and Spotify."
        );
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    let guild_id = ctx
        .guild_id()
        .ok_or("guild_only command called outside a guild")?;
    let data = ctx.data();
    let manager = &data.songbird;

    let guild_data = get_guild_data(ctx, guild_id).await;

    // Check if the bot is already in a voice channel in this guild.
    let handler_lock = if let Some(handler) = manager.get(guild_id) {
        handler
    } else {
        // Not in a channel, try to join the user's channel.
        let channel_id = {
            let Some(guild) = ctx.guild() else {
                let reply = create_error_message("Could not fetch guild data.");
                check_msg(ctx.send(reply).await);
                return Ok(());
            };
            guild
                .voice_states
                .get(&ctx.author().id)
                .and_then(|voice_state| voice_state.channel_id)
        };

        let connect_to = match channel_id {
            Some(channel) => channel,
            None => {
                let reply = create_error_message("You are not in a voice channel.");
                check_msg(ctx.send(reply).await);
                return Ok(());
            }
        };

        // Attempt to join the channel.
        match manager.join(guild_id, connect_to).await {
            Ok(handler_lock_success) => {
                // Successfully joined, add the error notifier.
                {
                    let mut handler = handler_lock_success.lock().await;
                    handler.add_global_event(TrackEvent::Error.into(), TrackErrorNotifier);
                    handler.add_global_event(
                        Event::Track(TrackEvent::End),
                        TrackEndNotifier {
                            guild_id,
                            songbird: Arc::clone(manager),
                            guild_data: Arc::clone(&guild_data),
                            http_client: data.http.clone(),
                            handler_lock: Arc::clone(&handler_lock_success),
                        },
                    );
                }
                handler_lock_success
            }
            Err(e) => {
                error!("Error joining channel: {:?}", e);
                let reply = create_error_message("Error joining channel");
                check_msg(ctx.send(reply).await);
                return Ok(());
            }
        }
    };

    {
        let mut handler = handler_lock.lock().await;
        if !handler.is_deaf() {
            if let Err(e) = handler.deafen(true).await {
                error!("Failed to deafen: {:?}", e);
            }
        }
    }

    if let Some(resource) = crate::spotify::parse_url(&search) {
        process_spotify(
            ctx,
            resource,
            Arc::clone(&guild_data),
            Arc::clone(&handler_lock),
        )
        .await?;
    } else if is_youtube_playlist(&search) {
        process_playlist(
            ctx,
            search,
            Arc::clone(&guild_data),
            Arc::clone(&handler_lock),
        )
        .await?;
    } else {
        // Single track handling
        let (queue_len, input_for_message) = {
            let mut guild_data_lock = guild_data.lock().await;
            let input_for_message = search.clone();
            let metadata = get_video_metadata(&search, ctx).await;
            guild_data_lock.queue.push(metadata);
            let queue_len = guild_data_lock.queue.len();
            (queue_len, input_for_message)
        };

        info!("Added \"{}\" to queue", input_for_message);

        if queue_len == 1 {
            let track_handler =
                play_next_in_queue(ctx, &handler_lock, Arc::clone(&guild_data)).await;
            match track_handler {
                Some(handler) => {
                    let mut guild_data_lock = guild_data.lock().await;
                    guild_data_lock.track_handle = Some(handler);
                }
                None => {
                    let reply = create_error_message("Failed to play the track.");
                    check_msg(ctx.send(reply).await);
                }
            }
        } else {
            let reply = create_default_message(
                &format!("Added \"{}\" to the queue", input_for_message),
                false,
            );
            check_msg(ctx.send(reply).await);
        }
    }

    Ok(())
}

async fn process_playlist(
    ctx: Context<'_>,
    search: String,
    guild_data: Arc<tokio::sync::Mutex<GuildData>>,
    handler_lock: Arc<tokio::sync::Mutex<songbird::Call>>,
) -> CommandResult {
    let processing_msg =
        create_default_message(&format!("Processing playlist: {}...", search), false);
    let send_msg = ctx.send(processing_msg).await?;

    // Single yt-dlp call to fetch playlist entries (flat: title/id only)
    let cmd_output = match TokioCommand::new("yt-dlp")
        .arg("-J")
        .arg("--flat-playlist")
        .arg("-i")
        .arg(&search)
        .output()
        .await
    {
        Ok(out) => out,
        Err(e) => {
            error!("Failed to spawn yt-dlp for playlist {}: {:?}", search, e);
            let err_reply = create_error_message(&format!(
                "Failed to start fetching playlist details (yt-dlp command failed to run). Is yt-dlp installed and in your system's PATH? Error: {}",
                e
            ));
            check_msg(ctx.send(err_reply).await);
            return Ok(());
        }
    };

    if !cmd_output.status.success() {
        let stderr = String::from_utf8_lossy(&cmd_output.stderr);
        error!("yt-dlp failed for playlist {}: {}", search, stderr);
        let error_msg = format!(
            "Failed to fetch playlist details for \"{}\". yt-dlp error: {}",
            search, stderr
        );
        check_msg(ctx.send(create_error_message(&error_msg)).await);
        return Ok(());
    }

    #[derive(Debug, Deserialize)]
    struct FlatEntry {
        id: Option<String>,
        title: Option<String>,
        // Some providers may expose different fields; we use only these two
    }
    #[derive(Debug, Deserialize)]
    struct FlatPlaylist {
        entries: Vec<Option<FlatEntry>>, // some entries can be null on errors
    }

    let json_str = String::from_utf8_lossy(&cmd_output.stdout);
    let parsed: FlatPlaylist = match serde_json::from_str(&json_str) {
        Ok(p) => p,
        Err(e) => {
            error!(
                "Failed to parse yt-dlp JSON for playlist {}: {:?}",
                search, e
            );
            let reply = create_error_message("Failed to parse playlist details");
            check_msg(ctx.send(reply).await);
            return Ok(());
        }
    };

    let mut items: Vec<TrackMetadata> = Vec::new();
    for entry in parsed.entries.into_iter().flatten() {
        if let Some(id) = entry.id {
            let url = format!("https://www.youtube.com/watch?v={}", id);
            let title = entry.title.unwrap_or_else(|| url.clone());
            items.push(TrackMetadata {
                title,
                url,
                artist: String::new(),
                duration: String::new(),
                requested_by: ctx.author().id.get(),
                platform: "youtube".into(),
            });
        }
    }

    if items.is_empty() {
        let err_reply = create_error_message(&format!(
            "No videos found in the playlist \"{}\", or it might be private/empty.",
            search
        ));
        check_msg(ctx.send(err_reply).await);
        return Ok(());
    }

    let added_count = items.len();
    enqueue_and_maybe_start(ctx, items, &guild_data, &handler_lock).await;

    let final_msg = create_default_message(
        &format!(
            "Added {} songs from playlist \"{}\" to queue.",
            added_count, search
        ),
        false,
    );
    send_msg.edit(ctx, final_msg).await?;

    Ok(())
}

/// Enqueue tracks under a single lock; if the queue was previously empty, start playback.
async fn enqueue_and_maybe_start(
    ctx: Context<'_>,
    items: Vec<TrackMetadata>,
    guild_data: &Arc<tokio::sync::Mutex<GuildData>>,
    handler_lock: &Arc<tokio::sync::Mutex<songbird::Call>>,
) {
    let queue_was_empty = {
        let mut data = guild_data.lock().await;
        let was_empty = data.queue.is_empty();
        for m in items {
            data.queue.push(m);
        }
        was_empty
    };

    if queue_was_empty {
        if let Some(handler) = play_next_in_queue(ctx, handler_lock, Arc::clone(guild_data)).await {
            let mut data = guild_data.lock().await;
            data.track_handle = Some(handler);
        }
    }
}

async fn process_spotify(
    ctx: Context<'_>,
    resource: SpotifyResource,
    guild_data: Arc<tokio::sync::Mutex<GuildData>>,
    handler_lock: Arc<tokio::sync::Mutex<songbird::Call>>,
) -> CommandResult {
    let Some(spotify) = ctx.data().spotify.clone() else {
        let reply = create_error_message(
            "Spotify support is not configured on this bot. Ask the operator to set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
        );
        check_msg(ctx.send(reply).await);
        return Ok(());
    };

    let kind = match &resource {
        SpotifyResource::Track(_) => "track",
        SpotifyResource::Playlist(_) => "playlist",
        SpotifyResource::Album(_) => "album",
    };

    let processing_msg = create_default_message(&format!("Processing Spotify {kind}..."), false);
    let send_msg = ctx.send(processing_msg).await?;

    let result = match &resource {
        SpotifyResource::Track(id) => spotify.fetch_track(id).await.map(|t| vec![t]),
        SpotifyResource::Playlist(id) => spotify.fetch_playlist_tracks(id).await,
        SpotifyResource::Album(id) => spotify.fetch_album_tracks(id).await,
    };

    let tracks = match result {
        Ok(t) => t,
        Err(e) => {
            error!("Spotify fetch failed for {kind}: {:?}", e);
            let user_msg = match e {
                SpotifyError::NotFound => format!("Spotify {kind} not found."),
                SpotifyError::Empty => format!("No tracks found in this Spotify {kind}."),
                SpotifyError::Auth(_) => "Failed to authenticate with Spotify.".to_string(),
                SpotifyError::Network(_) => "Failed to reach Spotify.".to_string(),
                SpotifyError::BadResponse(_) => "Unexpected response from Spotify.".to_string(),
            };
            send_msg.edit(ctx, create_error_message(&user_msg)).await?;
            return Ok(());
        }
    };

    let requested_by = ctx.author().id.get();
    let items: Vec<TrackMetadata> = tracks
        .into_iter()
        .map(|t| {
            let search_query = if t.artist.is_empty() {
                t.name.clone()
            } else {
                format!("{} {}", t.name, t.artist)
            };
            TrackMetadata {
                title: t.name,
                url: search_query,
                artist: t.artist,
                duration: format_duration(Some(t.duration_ms / 1000)),
                requested_by,
                platform: "spotify".into(),
            }
        })
        .collect();

    let added_count = items.len();
    enqueue_and_maybe_start(ctx, items, &guild_data, &handler_lock).await;

    let final_msg = create_default_message(
        &format!(
            "Added {} song(s) from Spotify {} to queue.",
            added_count, kind
        ),
        false,
    );
    send_msg.edit(ctx, final_msg).await?;

    Ok(())
}

async fn play_next_in_queue(
    ctx: Context<'_>,
    handler_lock: &Arc<tokio::sync::Mutex<songbird::Call>>,
    guild_data: Arc<tokio::sync::Mutex<GuildData>>,
) -> Option<songbird::tracks::TrackHandle> {
    let data = ctx.data();

    // Extract required metadata without holding the lock longer than necessary
    let (url, title) = {
        let guild_data_lock = guild_data.lock().await;
        if let Some(metadata) = guild_data_lock.queue.front() {
            (metadata.url.clone(), metadata.title.clone())
        } else {
            debug!("play_next_in_queue called but custom queue was empty.");
            return None;
        }
    };

    let src = if url.starts_with("http") {
        YoutubeDl::new(data.http.clone(), url.clone())
    } else {
        YoutubeDl::new_search(data.http.clone(), url.clone())
    };

    // Acquire the handler lock only for the duration of starting playback
    let track_handle = {
        let mut handler = handler_lock.lock().await;
        handler.play_only_input(src.into())
    };

    // Send the message after releasing all locks
    check_msg(
        ctx.send(create_default_message(
            &format!("Playing: [{}]({})", title, url),
            false,
        ))
        .await,
    );

    Some(track_handle)
}

/// Helper function to check if a URL is a YouTube playlist.
///
/// Matches any YouTube URL that carries a `list=` query parameter, which covers:
/// - Pure playlist pages:  `.../playlist?list=PLxxx`
/// - Video-in-playlist:    `.../watch?v=ID&list=PLxxx`
/// - Short URLs:           `youtu.be/ID?list=PLxxx`
/// - YouTube Music:        `music.youtube.com/playlist?list=PLxxx`
fn is_youtube_playlist(url: &str) -> bool {
    if !url.starts_with("https://") {
        return false;
    }
    if !url.contains("youtube.com") && !url.contains("youtu.be") {
        return false;
    }
    url.contains("?list=") || url.contains("&list=")
}

#[derive(Debug, Deserialize)]
struct VideoMetadata {
    title: String,
    duration: Option<u64>,
    uploader: Option<String>,
}

async fn get_video_metadata(url: &str, ctx: Context<'_>) -> TrackMetadata {
    let output = TokioCommand::new("yt-dlp")
        .arg("-j")
        .arg("--no-playlist") // Prevent playlist expansion
        .arg(url)
        .output()
        .await;

    let default_metadata = || TrackMetadata {
        title: url.to_string(),
        url: url.to_string(),
        artist: String::new(),
        requested_by: ctx.author().id.get(),
        platform: "youtube".to_string(),
        duration: String::new(),
    };

    match output {
        Ok(output) if output.status.success() => {
            match serde_json::from_str::<VideoMetadata>(&String::from_utf8_lossy(&output.stdout)) {
                Ok(metadata) => TrackMetadata {
                    title: metadata.title,
                    url: url.to_string(),
                    artist: metadata.uploader.unwrap_or_default(),
                    requested_by: ctx.author().id.get(),
                    platform: "youtube".to_string(),
                    duration: format_duration(metadata.duration),
                },
                Err(_) => default_metadata(),
            }
        }
        _ => default_metadata(),
    }
}

fn validate_url(url: &str) -> bool {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return false;
    }

    // YouTube URLs
    if url.contains("youtube.com") || url.contains("youtu.be") || url.contains("music.youtube.com")
    {
        return true;
    }

    // SoundCloud URLs
    if url.contains("soundcloud.com") {
        return true;
    }

    // Spotify URLs
    if url.contains("open.spotify.com") {
        return true;
    }

    false
}

fn format_duration(duration: Option<u64>) -> String {
    let Some(duration) = duration else {
        return String::new();
    };
    let hours = duration / 3600;
    let minutes = (duration % 3600) / 60;
    let secs = duration % 60;

    if hours > 0 {
        return format!("{:02}:{:02}:{:02}", hours, minutes, secs);
    }

    format!("{:02}:{:02}", minutes, secs)
}
