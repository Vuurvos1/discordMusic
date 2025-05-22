use std::sync::Arc;

// Event related imports to detect track creation failures.
use songbird::events::{Event, TrackEvent};

// To turn user URLs into playable audio, we'll use yt-dlp.
use songbird::input::YoutubeDl;
// Import for running yt-dlp as an external command
use tokio::process::Command as TokioCommand;

use crate::{
    check_msg, create_default_message, create_error_message, CommandResult, Context,
    TrackEndNotifier, TrackErrorNotifier,
};

/// Play a song
#[poise::command(slash_command, guild_only)]
pub async fn play(
    ctx: Context<'_>,
    #[description = "Search term or url of the song"] search: String,
) -> CommandResult {
    // DEFER IMMEDIATELY!
    // Use ctx.defer_ephemeral().await? if you want the "Bot is thinking..." to be ephemeral
    // or ctx.defer().await? for a public "Bot is thinking..."
    if let Err(e) = ctx.defer_ephemeral().await {
        println!("Error deferring interaction: {:?}", e);
        return Ok(());
    }

    let do_search = !search.starts_with("http");

    // TODO: handle playlists and other platforms

    let guild_id = ctx.guild_id().unwrap();
    let data = ctx.data();
    let manager = &data.songbird;

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
            Ok(handler_lock) => {
                // Successfully joined, add the error notifier.
                let mut handler = handler_lock.lock().await;
                handler.add_global_event(TrackEvent::Error.into(), TrackErrorNotifier);
                handler.add_global_event(
                    Event::Track(TrackEvent::End),
                    TrackEndNotifier {
                        guild_id: guild_id,
                        songbird: Arc::clone(&manager),
                    },
                );

                drop(handler); // Release lock before returning
                handler_lock // Return the handler lock for later use
            }
            Err(e) => {
                println!("Error joining channel: {:?}", e);
                let reply = create_error_message("Error joining channel".to_string());
                check_msg(ctx.send(reply).await);
                return Ok(());
            }
        }
    } else {
        // Already in a channel, get the existing handler lock.
        // .unwrap() is safe here because we checked is_none() above.
        manager.get(guild_id).unwrap()
    };

    // Now we have the handler lock, either from joining or because we were already in.
    let mut handler = handler_lock.lock().await;

    // Deafen the bot
    if !handler.is_deaf() {
        // TODO: redeafen the bot if it gets undeafened
        if let Err(e) = handler.deafen(true).await {
            println!("Failed to deafen: {:?}", e);
        }
    }

    if is_youtube_playlist(&search) {
        // Playlist handling logic
        let processing_msg_builder = create_default_message(
            format!("Processing playlist: {}. This may take a moment...", search),
            false,
        );
        check_msg(ctx.send(processing_msg_builder).await);

        let cmd_output = match TokioCommand::new("yt-dlp")
            .arg("--get-id")
            .arg("--flat-playlist")
            .arg("-i") // Ignore download errors for individual videos in the playlist
            .arg(&search) // The playlist URL
            .output()
            .await
        {
            Ok(out) => out,
            Err(e) => {
                println!(
                    "[ERROR] Failed to spawn yt-dlp for playlist {}: {:?}",
                    search, e
                );
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
            println!("[ERROR] yt-dlp failed for playlist {}: {}", search, stderr);
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
        let queue_was_empty = handler.queue().is_empty();
        let mut first_song_from_playlist_msg_sent = false;

        for (index, video_url) in video_urls.iter().enumerate() {
            let src = YoutubeDl::new(data.http.clone(), video_url.clone());
            let _track_handle = handler.enqueue_input(src.into()).await;

            if queue_was_empty && index == 0 && !first_song_from_playlist_msg_sent {
                let playing_msg = create_default_message(
                    format!("Playing: {} (first from playlist)", video_url),
                    false,
                );
                check_msg(ctx.send(playing_msg).await);
                first_song_from_playlist_msg_sent = true;
            }
        }

        let success_msg = create_default_message(
            format!(
                "Added {} songs from playlist \"{}\" to the queue.",
                num_videos, search
            ),
            false,
        );
        check_msg(ctx.send(success_msg).await);
    } else {
        // Existing logic for single track or search
        let http_client = data.http.clone();
        let input_for_message = search.clone(); // Clone for use in messages

        let src = if do_search {
            YoutubeDl::new_search(http_client, search) // search is moved here
        } else {
            YoutubeDl::new(http_client, search) // search is moved here
        };

        if handler.queue().is_empty() {
            let reply = create_default_message(format!("Playing: {}", input_for_message), false);
            check_msg(ctx.send(reply).await);
        } else {
            let reply = create_default_message(
                format!("Added \"{}\" to the queue", input_for_message),
                false,
            );
            check_msg(ctx.send(reply).await);
        }

        // Enqueue the source using songbird's built-in queue
        let _track_handle = handler.enqueue_input(src.into()).await;
    }

    Ok(())
}

/// Helper function to check if a URL is a YouTube playlist.
fn is_youtube_playlist(url: &str) -> bool {
    // Ensure it's a HTTPS URL
    if !url.starts_with("https://") {
        return false;
    }

    // Check for common YouTube domains and "/playlist?list=" pattern
    // This pattern is quite specific to direct playlist links.
    if (url.starts_with("https://www.youtube.com/")
        || url.starts_with("https://youtube.com/")
        || url.starts_with("https://m.youtube.com/")
        || url.starts_with("https://music.youtube.com/"))
        && url.contains("/playlist?list=")
    {
        // Further check to ensure it's not a video-in-playlist link like /watch?v=...&list=...
        // If "/watch?" is present, YoutubeDl::new() will correctly play the single video.
        if url.contains("/watch?") {
            return false;
        }
        return true;
    }

    false
}
