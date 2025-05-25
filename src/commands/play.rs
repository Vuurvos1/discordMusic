use std::sync::Arc;

use songbird::events::{Event, TrackEvent};
use songbird::input::YoutubeDl;

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
    // Use ctx.defer_ephemeral().await? if you want the "Bot is thinking..." to be ephemeral
    // or ctx.defer().await? for a public "Bot is thinking..."
    if let Err(e) = ctx.defer().await {
        println!("Error deferring interaction: {:?}", e);
        return Ok(());
    }

    // let do_search = !search.starts_with("http");

    let guild_id = ctx.guild_id().unwrap();
    let guild_uid = guild_id.get();
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
                let mut handler = handler_lock_success.lock().await;
                handler.add_global_event(TrackEvent::Error.into(), TrackErrorNotifier);
                handler.add_global_event(
                    Event::Track(TrackEvent::End),
                    TrackEndNotifier {
                        guild_id: guild_id,
                        songbird: Arc::clone(&manager),
                        guild_data: Arc::clone(&guild_data),
                        http_client: data.http.clone(),
                        handler_lock: Arc::clone(&handler_lock_success),
                    },
                );

                drop(handler); // Release lock before returning
                handler_lock_success // Return the handler lock for later use
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
        // // Playlist handling logic
        // let processing_msg_builder = create_default_message(
        //     format!("Processing playlist: {}. This may take a moment...", search),
        //     false,
        // );
        // check_msg(ctx.send(processing_msg_builder).await);

        // let cmd_output = match TokioCommand::new("yt-dlp")
        //     .arg("--get-id")
        //     .arg("--flat-playlist")
        //     // .arg("--print-json") // Instead of --get-id and --flat-playlist to get titles too
        //     .arg("-i") // Ignore download errors for individual videos in the playlist
        //     .arg(&search) // The playlist URL
        //     .output()
        //     .await
        // {
        //     Ok(out) => out,
        //     Err(e) => {
        //         println!(
        //             "[ERROR] Failed to spawn yt-dlp for playlist {}: {:?}",
        //             search, e
        //         );
        //         let err_reply = create_error_message(format!(
        //             "Failed to start fetching playlist details (yt-dlp command failed to run). Is yt-dlp installed and in your system's PATH? Error: {}",
        //             e
        //         ));
        //         check_msg(ctx.send(err_reply).await);
        //         return Ok(());
        //     }
        // };

        // if !cmd_output.status.success() {
        //     let stderr = String::from_utf8_lossy(&cmd_output.stderr);
        //     println!("[ERROR] yt-dlp failed for playlist {}: {}", search, stderr);
        //     let error_msg = format!(
        //         "Failed to fetch playlist details for \"{}\". yt-dlp error: {}",
        //         search, stderr
        //     );
        //     check_msg(ctx.send(create_error_message(error_msg)).await);
        //     return Ok(());
        // }

        // let video_ids_str = String::from_utf8_lossy(&cmd_output.stdout);
        // let video_urls: Vec<String> = video_ids_str
        //     .lines()
        //     .filter(|s| !s.trim().is_empty())
        //     .map(|id| format!("https://www.youtube.com/watch?v={}", id.trim()))
        //     .collect();

        // if video_urls.is_empty() {
        //     let err_reply = create_error_message(format!(
        //         "No videos found in the playlist \"{}\", or it might be private/empty.",
        //         search
        //     ));
        //     check_msg(ctx.send(err_reply).await);
        //     return Ok(());
        // }

        // let num_videos = video_urls.len();
        // // let queue_was_empty = handler.queue().is_empty(); // We'll use custom queue logic
        // let mut first_song_added_to_empty_queue = false;
        // {

        //     // Scope for custom_queue lock
        //     // let mut custom_queue = queue;
        //     first_song_added_to_empty_queue = queue.is_empty() && !video_urls.is_empty();

        //     for video_url in video_urls.iter() {
        //         // In a real scenario, you'd want to fetch the title here.
        //         // For now, we'll use the URL as a placeholder title.
        //         // If yt-dlp --print-json was used, you could parse titles here.
        //         let metadata = TrackMetadata {
        //             title: video_url.clone(), // Placeholder, ideally fetch real title
        //             url: video_url.clone(),
        //             requested_by: ctx.author().name.clone(),
        //             requested_by_id: ctx.author().id.get(), // Corrected to use .get() for u64
        //         };
        //         queue.push_back(metadata);
        //     }
        // } // custom_queue lock released

        // let success_msg = create_default_message(
        //     format!(
        //         "Added {} songs from playlist \"{}\" to queue.",
        //         num_videos, search
        //     ),
        //     false,
        // );
        // check_msg(ctx.send(success_msg).await);

        // // If the first song was added to an empty queue and the bot isn't already playing, play it.
        // let is_playing = !queue.is_empty();

        // if first_song_added_to_empty_queue && !is_playing {
        //     drop(handler); // Release handler lock before playing
        //     play_next_in_custom_queue(ctx, &handler_lock, Arc::clone(&guild_data)).await;
        // }
    } else {
        println!("[INFO] Single track or search: {}", search);

        // Lock only for queue operations, then drop before calling play_next_in_custom_queue
        let (queue_len, input_for_message) = {
            let mut guild_data_lock = guild_data.lock().await;

            println!(
                "[INFO] Current custom queue length: {}",
                guild_data_lock.queue.len()
            );

            let input_for_message = search.clone();
            let metadata = TrackMetadata {
                title: input_for_message.clone(), // Placeholder, ideally fetch title for searches/urls
                url: search, // search is consumed by YoutubeDl later, so we use it here
                requested_by: ctx.author().name.clone(),
                requested_by_id: ctx.author().id.get(), // Corrected to use .get() for u64
            };

            guild_data_lock.queue.push_back(metadata);

            let queue_len = guild_data_lock.queue.len();

            (queue_len, input_for_message)
        }; // lock dropped here

        println!(
            "[INFO] Added \"{}\" to queue for guild {}",
            input_for_message, guild_uid
        );

        println!("[INFO] queue_was_empty_and_not_playing: {}", queue_len == 1);

        drop(handler);

        if queue_len == 1 {
            let track_handler =
                play_next_in_queue(ctx, &handler_lock, Arc::clone(&guild_data)).await;

            let mut guild_data_lock = guild_data.lock().await;
            guild_data_lock.track_handle = track_handler;
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
    let mut track_handle: Option<songbird::tracks::TrackHandle> = None;

    let data = ctx.data();
    let mut handler = handler_lock.lock().await;
    let guild_data_lock = guild_data.lock().await;

    if let Some(metadata) = guild_data_lock.queue.front() {
        println!("[INFO] Playing next in custom queue: {}", metadata.title);

        let src = YoutubeDl::new(data.http.clone(), metadata.url.clone());
        track_handle = Some(handler.play_only_input(src.into()));

        let reply = create_default_message(format!("Playing: {}", metadata.title), false);
        check_msg(ctx.send(reply).await);
    } else {
        println!("[INFO] play_next_in_custom_queue called but custom queue was empty.");
    }

    println!("[INFO] play_next_in_custom_queue finished.");

    track_handle
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
