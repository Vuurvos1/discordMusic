mod commands;

use std::sync::Arc;

use dotenv::dotenv;

use serenity::all as serenity;
use serenity::{client::EventHandler, prelude::GatewayIntents};

// Event related imports to detect track creation failures.
use songbird::events::{Event, EventContext, EventHandler as VoiceEventHandler, TrackEvent};

// To turn user URLs into playable audio, we'll use yt-dlp.
use songbird::input::YoutubeDl;

// YtDl requests need an HTTP client to operate -- we'll create and store our own.
use reqwest::Client as HttpClient;

struct UserData {
    http: HttpClient,
    songbird: Arc<songbird::Songbird>,
}

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, UserData, Error>;
type CommandResult = Result<(), Error>;

struct Handler;

#[serenity::async_trait]
impl EventHandler for Handler {
    async fn ready(&self, _: serenity::Context, ready: serenity::Ready) {
        println!("{} is connected!", ready.user.name);
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    dotenv().ok().expect("Failed to load .env file");

    // Configure the client with your Discord bot token in the environment.
    let token = std::env::var("DISCORD_TOKEN").expect("Discord token must be set.");

    // Create our songbird voice manager
    let manager = songbird::Songbird::serenity();

    // Configure our command framework
    let options = poise::FrameworkOptions {
        commands: vec![
            commands::ping::ping(),
            join(),
            play(),
            skip(),
            commands::leave::leave(),
            commands::pause::pause(),
            commands::stop::stop(),
        ],
        prefix_options: poise::PrefixFrameworkOptions {
            prefix: Some(String::from("~")),
            ..Default::default()
        },
        ..Default::default()
    };

    // We have to clone our voice manager's Arc to share it between serenity and our user data.
    let manager_clone = Arc::clone(&manager);

    let framework = poise::Framework::builder()
        .options(options)
        .setup(|ctx: &serenity::Context, _ready, framework| {
            Box::pin(async move {
                poise::builtins::register_globally(ctx, &framework.options().commands).await?;

                // We create a global HTTP client here to make use of in
                // `/play`. If we wanted, we could supply cookies and auth
                // details ahead of time.
                Ok(UserData {
                    http: HttpClient::new(),
                    songbird: manager_clone,
                })
            })
        })
        .build();

    let intents = GatewayIntents::non_privileged() | GatewayIntents::MESSAGE_CONTENT;
    let mut client = serenity::Client::builder(&token, intents)
        .voice_manager_arc(manager)
        .event_handler(Handler)
        .framework(framework)
        .await
        .expect("Error creating client");

    tokio::spawn(async move {
        let _ = client
            .start()
            .await
            .map_err(|why| println!("Client ended: {:?}", why));
    });

    let _signal_err = tokio::signal::ctrl_c().await;
    println!("Received Ctrl-C, shutting down.");
}

struct TrackErrorNotifier;
#[serenity::async_trait]
impl VoiceEventHandler for TrackErrorNotifier {
    async fn act(&self, ctx: &EventContext<'_>) -> Option<Event> {
        if let EventContext::Track(track_list) = ctx {
            for (state, handle) in *track_list {
                println!(
                    "Track {:?} encountered an error: {:?}",
                    handle.uuid(),
                    state.playing
                );
            }
        }

        None
    }
}

#[poise::command(slash_command, guild_only)]
async fn join(ctx: Context<'_>) -> CommandResult {
    let (guild_id, channel_id) = {
        let guild = ctx.guild().unwrap();
        let channel_id = guild
            .voice_states
            .get(&ctx.author().id)
            .and_then(|voice_state| voice_state.channel_id);

        (guild.id, channel_id)
    };

    let connect_to = match channel_id {
        Some(channel) => channel,
        None => {
            let reply = poise::CreateReply::default()
                .content("Not in a voice channel")
                .ephemeral(true);
            check_msg(ctx.send(reply).await);
            return Ok(());
        }
    };

    let manager = &ctx.data().songbird;
    if let Ok(handler_lock) = manager.join(guild_id, connect_to).await {
        // Attach an event handler to see notifications of all track errors.
        let mut handler = handler_lock.lock().await;
        handler.add_global_event(TrackEvent::Error.into(), TrackErrorNotifier);
    }

    Ok(())
}

/// Play a song
#[poise::command(slash_command, guild_only)]
async fn play(
    ctx: Context<'_>,
    #[description = "Search term or url of the song"] search: String,
) -> CommandResult {
    let do_search = !search.starts_with("http");

    // TODO: handle playlists

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
                let reply = poise::CreateReply::default()
                    .content("You are not in a voice channel.")
                    .ephemeral(true);
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
                drop(handler); // Release lock before returning
                handler_lock // Return the handler lock for later use
            }
            Err(e) => {
                check_msg(ctx.say(format!("Error joining channel: {:?}", e)).await);
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

    let src = if do_search {
        YoutubeDl::new_search(data.http.clone(), search)
    } else {
        YoutubeDl::new(data.http.clone(), search)
    };

    // Enqueue the source using songbird's built-in queue
    let _track_handle = handler.enqueue_input(src.into()).await;
    // track_handle.

    // Update the confirmation message based on queue state
    let queue_len = handler.queue().len();
    if queue_len == 1 {
        check_msg(ctx.say("Playing").await);
        // check_msg(
        //     ctx.say(format!(
        //         "Playing: {}",
        //         track_handle
        //             .metadata()
        //             .title
        //             .as_deref()
        //             .unwrap_or("Unknown title")
        //     ))
        //     .await,
        // );
    } else {
        check_msg(ctx.say("Added to queue").await);

        // check_msg(
        //     ctx.say(format!(
        //         "Added to queue (position {}): {}",
        //         queue_len,
        //         track_handle
        //             .metadata()
        //             .title
        //             .as_deref()
        //             .unwrap_or("Unknown title")
        //     ))
        //     .await,
        // );
    }

    Ok(())
}

#[poise::command(slash_command, guild_only)]
async fn skip(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let manager = &ctx.data().songbird;
    let has_handler = manager.get(guild_id).is_some();

    if has_handler {
        let handler_lock = manager.get(guild_id).unwrap();
        let handler = handler_lock.lock().await;

        let queue = handler.queue();
        let skip_result = queue.skip();

        if let Ok(_skipped) = skip_result {
            check_msg(ctx.say("Skipped").await);
        } else {
            check_msg(ctx.say("Failed to skip").await);
        }
    } else {
        let reply = poise::CreateReply::default().content("Not in a voice channel");
        check_msg(ctx.send(reply).await);
    }

    Ok(())
}

#[poise::command(slash_command, guild_only, aliases("unpause"))]
async fn resume(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();
    let manager = &ctx.data().songbird;

    let handler_lock = match manager.get(guild_id) {
        Some(handler) => handler,
        None => {
            let reply = poise::CreateReply::default().content("Not in a voice channel");
            check_msg(ctx.send(reply).await);
            return Ok(());
        }
    };

    let handler = handler_lock.lock().await;
    let queue = handler.queue();
    let resumed = queue.resume();

    if let Err(e) = resumed {
        check_msg(ctx.say(format!("Failed: {:?}", e)).await);
    }

    check_msg(ctx.say("Resumed").await);

    Ok(())
}

// #[poise::command(slash_command, guild_only)]
// async fn deafen(ctx: Context<'_>) -> CommandResult {
//     let guild_id = ctx.guild_id().unwrap();
//     let manager = &ctx.data().songbird;

//     let handler_lock = match manager.get(guild_id) {
//         Some(handler) => handler,
//         None => {
//             check_msg(ctx.reply("Not in a voice channel").await);

//             return Ok(());
//         }
//     };

//     let mut handler = handler_lock.lock().await;

//     if handler.is_deaf() {
//         check_msg(ctx.say("Already deafened").await);
//     } else {
//         if let Err(e) = handler.deafen(true).await {
//             check_msg(ctx.say(format!("Failed: {:?}", e)).await);
//         }

//         check_msg(ctx.say("Deafened").await);
//     }

//     Ok(())
// }

// #[poise::command(prefix_command, guild_only)]
// async fn undeafen(ctx: Context<'_>) -> CommandResult {
//     let guild_id = ctx.guild_id().unwrap();
//     let manager = &ctx.data().songbird;

//     if let Some(handler_lock) = manager.get(guild_id) {
//         let mut handler = handler_lock.lock().await;
//         if let Err(e) = handler.deafen(false).await {
//             check_msg(ctx.say(format!("Failed: {:?}", e)).await);
//         }

//         check_msg(ctx.say("Undeafened").await);
//     } else {
//         check_msg(ctx.say("Not in a voice channel to undeafen in").await);
//     }

//     Ok(())
// }

/// Checks that a message successfully sent; if not, then logs why to stdout.
fn check_msg<T>(result: serenity::Result<T>) {
    if let Err(why) = result {
        println!("Error sending message: {:?}", why);
    }
}
