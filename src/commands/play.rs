use songbird::events::{Event, TrackEvent};
use songbird::input::YoutubeDl;
use std::sync::Arc;
use tokio::process::Command as TokioCommand;
use tracing::{debug, error, info};

use crate::utils::get_guild_data;
use crate::{
    check_msg, create_default_message, create_error_message, CommandResult, Context, GuildData,
    TrackEndNotifier, TrackErrorNotifier, TrackMetadata,
};

/// Play a song
#[poise::command(slash_command, guild_only)]
pub async fn play(
    ctx: Context<'_>,
    #[description = "Search term or url of the song"] search: String,
) -> CommandResult {
    if let Err(e) = ctx.defer().await {
        println!("Error deferring interaction: {:?}", e);
        return Ok(());
    }

    let guild_id = ctx.guild_id().unwrap();
    let data = ctx.data();
    let manager = &data.songbird;

    let guild_data = get_guild_data(ctx, guild_id.get()).await;

    // Check if the bot is already in a voice channel in this guild.
    let handler_lock = if manager.get(guild_id).is_none() {
        // Not in a channel, try to join the user's channel.
        let channel_id = {
            let guild = ctx.guild().unwrap();
            guild
                .voice_states
                .get(&ctx.author().id)
                .and_then(|voice_state| voice_state.channel_id)
        };

        let connect_to = match channel_id {
            Some(channel) => channel,
            None => {
                let reply = create_error_message("You are not in a voice channel.".to_string());
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
                            songbird: Arc::clone(&manager),
                            guild_data: Arc::clone(&guild_data),
                            http_client: data.http.clone(),
                            handler_lock: Arc::clone(&handler_lock_success),
                        },
                    );
                } // handler lock dropped here
                handler_lock_success // Return the handler lock for later use
            }
            Err(e) => {
                error!("Error joining channel: {:?}", e);
                let reply = create_error_message("Error joining channel".to_string());
                check_msg(ctx.send(reply).await);
                return Ok(());
            }
        }
    } else {
        // Already in a channel, get the existing handler lock.
        manager.get(guild_id).unwrap()
    };

    // Now we have the handler lock, either from joining or because we were already in.
    {
        let mut handler = handler_lock.lock().await;

        // Deafen the bot
        if !handler.is_deaf() {
            if let Err(e) = handler.deafen(true).await {
                error!("Failed to deafen: {:?}", e);
            }
        }
        // handler lock dropped here
    }

    if is_youtube_playlist(&search) {
        println!("[INFO] Processing YouTube playlist: {}", search);

        // Send processing message
        let processing_msg = create_default_message(
            format!("Processing playlist: {}. This may take a moment...", search),
            false,
        );
        check_msg(ctx.send(processing_msg).await);

        // Use yt-dlp to get video IDs
        let cmd_output = match TokioCommand::new("yt-dlp")
            .arg("--get-id")
            .arg("--flat-playlist")
            .arg("-i") // Ignore download errors for individual videos
            .arg(&search)
            .output()
            .await
        {
            Ok(out) => out,
            Err(e) => {
                error!("Failed to spawn yt-dlp for playlist {}: {:?}", search, e);
                let err_reply = create_error_message(format!(
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
            check_msg(ctx.send(create_error_message(error_msg)).await);
            return Ok(());
        }

        let video_ids_str = String::from_utf8_lossy(&cmd_output.stdout);
        let video_urls: Vec<String> = video_ids_str
            .lines()
            .filter(|s| !s.trim().is_empty())
            .map(|id| format!("https://www.youtube.com/watch?v={}", id.trim()))
            .collect();

        if video_urls.is_empty() {
            let err_reply = create_error_message(format!(
                "No videos found in the playlist \"{}\", or it might be private/empty.",
                search
            ));
            check_msg(ctx.send(err_reply).await);
            return Ok(());
        }

        let num_videos = video_urls.len();
        let mut first_song_added_to_empty_queue = false;
        {
            let mut guild_data_lock = guild_data.lock().await;
            first_song_added_to_empty_queue =
                guild_data_lock.queue.is_empty() && !video_urls.is_empty();

            for video_url in video_urls {
                let metadata = TrackMetadata {
                    title: video_url.clone(), // Using URL as placeholder title
                    url: video_url,
                    requested_by: ctx.author().name.clone(),
                    requested_by_id: ctx.author().id.get(),
                };
                guild_data_lock.queue.push_back(metadata);
            }
        } // guild_data_lock is dropped here

        let success_msg = create_default_message(
            format!(
                "Added {} songs from playlist \"{}\" to queue.",
                num_videos, search
            ),
            false,
        );
        check_msg(ctx.send(success_msg).await);

        // If this was the first song(s) added and queue was empty, start playing
        if first_song_added_to_empty_queue {
            let track_handler =
                play_next_in_queue(ctx, &handler_lock, Arc::clone(&guild_data)).await;

            if let Some(handler) = track_handler {
                let mut guild_data_lock = guild_data.lock().await;
                guild_data_lock.track_handle = Some(handler);
            } else {
                let reply = create_error_message(
                    "Failed to play the first track from playlist.".to_string(),
                );
                check_msg(ctx.send(reply).await);
            }
        }
    } else {
        println!("[INFO] Single track or search: {}", search);

        // Lock only for queue operations, then drop before calling play_next_in_queue
        let (queue_len, input_for_message) = {
            let mut guild_data_lock = guild_data.lock().await;

            let input_for_message = search.clone();
            let metadata = TrackMetadata {
                title: input_for_message.clone(), // Placeholder, ideally fetch title for searches/urls
                url: search,
                requested_by: ctx.author().name.clone(),
                requested_by_id: ctx.author().id.get(),
            };

            guild_data_lock.queue.push_back(metadata);

            let queue_len = guild_data_lock.queue.len();

            (queue_len, input_for_message)
        }; // lock dropped here

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
                    let reply = create_error_message("Failed to play the track.".to_string());
                    check_msg(ctx.send(reply).await);
                }
            }
        } else {
            let reply = create_default_message(
                format!("Added \"{}\" to the queue", input_for_message),
                false,
            );
            check_msg(ctx.send(reply).await);
        }
    }

    Ok(())
}

async fn play_next_in_queue(
    ctx: Context<'_>,
    handler_lock: &Arc<tokio::sync::Mutex<songbird::Call>>,
    guild_data: Arc<tokio::sync::Mutex<GuildData>>,
) -> Option<songbird::tracks::TrackHandle> {
    let data = ctx.data();
    let mut handler = handler_lock.lock().await;
    let guild_data_lock = guild_data.lock().await;

    if let Some(metadata) = guild_data_lock.queue.front() {
        info!("Playing next in custom queue: {}", metadata.title);

        let search = metadata.url.clone();
        let do_search = !search.starts_with("http");

        let src = if do_search {
            YoutubeDl::new_search(data.http.clone(), search)
        } else {
            YoutubeDl::new(data.http.clone(), search)
        };

        let track_handle = handler.play_only_input(src.into());

        let reply = create_default_message(format!("Playing: {}", metadata.title), false);
        check_msg(ctx.send(reply).await);

        Some(track_handle)
    } else {
        debug!("play_next_in_queue called but custom queue was empty.");
        None
    }
}

/// Helper function to check if a URL is a YouTube playlist.
fn is_youtube_playlist(url: &str) -> bool {
    if !url.starts_with("https://") {
        return false;
    }
    if (url.starts_with("https://www.youtube.com/")
        || url.starts_with("https://youtube.com/")
        || url.starts_with("https://m.youtube.com/")
        || url.starts_with("https://music.youtube.com/"))
        && url.contains("/playlist?list=")
    {
        if url.contains("/watch?") {
            return false;
        }
        return true;
    }
    false
}
