//! Requires the "client", "standard_framework", and "voice" features be enabled in your
//! Cargo.toml, like so:
//!
//! ```toml
//! [dependencies.serenity]
//! git = "https://github.com/serenity-rs/serenity.git"
//! features = ["client", "standard_framework", "voice"]
//! ```

mod commands;

use std::sync::Arc;

use dotenv::dotenv;

use serenity::all as serenity;

// Event related imports to detect track creation failures.
use songbird::events::{Event, EventContext, EventHandler as VoiceEventHandler, TrackEvent};

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
impl serenity::EventHandler for Handler {
    async fn ready(&self, _: serenity::Context, ready: serenity::Ready) {
        println!("{} is connected!", ready.user.name);
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    dotenv().ok().expect("Failed to load .env file");

    // Configure the client with your Discord bot token in the environment.
    let token = std::env::var("TOKEN").expect("Discord token must be set.");

    // Create our songbird voice manager
    let manager = songbird::Songbird::serenity();

    // Configure our command framework
    let options = poise::FrameworkOptions {
        commands: vec![
            deafen(),
            undeafen(),
            commands::ping::ping(),
            commands::join::join(),
            leave(),
            commands::play::play(),
            commands::skip::skip(),
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
        .setup(|ctx: &::serenity::prelude::Context, _ready, framework| {
            Box::pin(async move {
                poise::builtins::register_globally(ctx, &framework.options().commands).await?;

                // We create a global HTTP client here to make use of in
                // `~play`. If we wanted, we could supply cookies and auth
                // details ahead of time.
                Ok(UserData {
                    http: HttpClient::new(),
                    songbird: manager_clone,
                })
            })
        })
        .build();

    let intents =
        serenity::GatewayIntents::non_privileged() | serenity::GatewayIntents::MESSAGE_CONTENT;
    let mut client = serenity::Client::builder(&token, intents)
        .voice_manager_arc(manager)
        .event_handler(Handler)
        .framework(framework)
        .await
        .expect("Err creating client");

    tokio::spawn(async move {
        let _ = client
            .start()
            .await
            .map_err(|why| println!("Client ended: {:?}", why));
    });

    let _signal_err = tokio::signal::ctrl_c().await;
    println!("Received Ctrl-C, shutting down.");
}

// #[poise::command(slash_command, guild_only)]
// async fn ping(ctx: Context<'_>) -> CommandResult {
//     let _ = ctx.reply("Pong!").await;
//     Ok(())
// }

#[poise::command(slash_command, guild_only)]
async fn deafen(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();
    let manager = &ctx.data().songbird;

    let handler_lock = match manager.get(guild_id) {
        Some(handler) => handler,
        None => {
            check_msg(ctx.reply("Not in a voice channel").await);

            return Ok(());
        }
    };

    let mut handler = handler_lock.lock().await;

    if handler.is_deaf() {
        check_msg(ctx.say("Already deafened").await);
    } else {
        if let Err(e) = handler.deafen(true).await {
            check_msg(ctx.say(format!("Failed: {:?}", e)).await);
        }

        check_msg(ctx.say("Deafened").await);
    }

    Ok(())
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
async fn leave(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let manager = &ctx.data().songbird;
    let has_handler = manager.get(guild_id).is_some();

    if has_handler {
        if let Err(e) = manager.remove(guild_id).await {
            check_msg(ctx.say(format!("Failed: {:?}", e)).await);
        }

        check_msg(ctx.say("Left voice channel").await);
    } else {
        check_msg(ctx.reply("Not in a voice channel").await);
    }

    Ok(())
}

#[poise::command(slash_command, guild_only)]
async fn mute(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();
    let manager = &ctx.data().songbird;

    let handler_lock = match manager.get(guild_id) {
        Some(handler) => handler,
        None => {
            check_msg(ctx.reply("Not in a voice channel").await);

            return Ok(());
        }
    };

    let mut handler = handler_lock.lock().await;

    if handler.is_mute() {
        check_msg(ctx.say("Already muted").await);
    } else {
        if let Err(e) = handler.mute(true).await {
            check_msg(ctx.say(format!("Failed: {:?}", e)).await);
        }

        check_msg(ctx.say("Now muted").await);
    }

    Ok(())
}

#[poise::command(prefix_command, guild_only)]
async fn undeafen(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();
    let manager = &ctx.data().songbird;

    if let Some(handler_lock) = manager.get(guild_id) {
        let mut handler = handler_lock.lock().await;
        if let Err(e) = handler.deafen(false).await {
            check_msg(ctx.say(format!("Failed: {:?}", e)).await);
        }

        check_msg(ctx.say("Undeafened").await);
    } else {
        check_msg(ctx.say("Not in a voice channel to undeafen in").await);
    }

    Ok(())
}

#[poise::command(slash_command, guild_only)]
async fn unmute(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();
    let manager = &ctx.data().songbird;

    if let Some(handler_lock) = manager.get(guild_id) {
        let mut handler = handler_lock.lock().await;
        if let Err(e) = handler.mute(false).await {
            check_msg(ctx.say(format!("Failed: {:?}", e)).await);
        }

        check_msg(ctx.say("Unmuted").await);
    } else {
        check_msg(ctx.say("Not in a voice channel to unmute in").await);
    }

    Ok(())
}

/// Checks that a message successfully sent; if not, then logs why to stdout.
fn check_msg<T>(result: serenity::Result<T>) {
    if let Err(why) = result {
        println!("Error sending message: {:?}", why);
    }
}
