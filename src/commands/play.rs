use std::sync::Arc;

// Event related imports to detect track creation failures.
use songbird::events::{Event, TrackEvent};

// To turn user URLs into playable audio, we'll use yt-dlp.
use songbird::input::YoutubeDl;

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

    let src = if do_search {
        YoutubeDl::new_search(data.http.clone(), search.clone())
    } else {
        YoutubeDl::new(data.http.clone(), search.clone())
    };

    if handler.queue().is_empty() {
        let reply = create_default_message(format!("Playing: {}", search), false);
        check_msg(ctx.send(reply).await);
    } else {
        let search_str = search.clone(); // Clone before moving into src
        let reply = create_default_message(format!("Added \"{}\" to the queue", search_str), false);
        check_msg(ctx.send(reply).await);
    }

    // Enqueue the source using songbird's built-in queue
    let _track_handle = handler.enqueue_input(src.into()).await;

    Ok(())
}
