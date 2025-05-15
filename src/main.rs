mod commands;

use std::sync::Arc;

use ::serenity::async_trait;
use dotenv::dotenv;

use serenity::all as serenity;
use serenity::{client::EventHandler, prelude::GatewayIntents};

// Event related imports to detect track creation failures.
use songbird::events::{Event, EventContext, EventHandler as VoiceEventHandler};

// YtDl requests need an HTTP client to operate -- we'll create and store our own.
use reqwest::Client as HttpClient;

struct CustomColours {
    error: serenity::Colour,
    default: serenity::Colour,
}

impl CustomColours {
    fn new() -> Self {
        Self {
            error: serenity::Colour::new(0xff1155),
            default: serenity::Colour::new(0x11ffaa),
        }
    }
}

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
            commands::play::play(),
            commands::skip::skip(),
            commands::unpause::unpause(),
            commands::leave::leave(),
            commands::pause::pause(),
            commands::stop::stop(),
        ],
        ..Default::default()
    };

    // We have to clone our voice manager's Arc to share it between serenity and our user data.
    let manager_clone = Arc::clone(&manager);

    let framework = poise::Framework::builder()
        .options(options)
        .setup(|ctx: &serenity::Context, _ready, framework| {
            Box::pin(async move {
                poise::builtins::register_globally(ctx, &framework.options().commands).await?;
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

// TODO: create an in voice channel util

fn create_default_message(message: String, ephemeral: bool) -> poise::CreateReply {
    let colors = CustomColours::new();
    poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
                .description(message)
                .color(colors.default), // Using the custom error color
        )
        .ephemeral(ephemeral)
}

fn create_error_message(error: String) -> poise::CreateReply {
    let colors = CustomColours::new();
    poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
                .description(error)
                .color(colors.error), // Using the custom error color
        )
        .ephemeral(true)
}

/// Checks that a message successfully sent; if not, then logs why to stdout.
fn check_msg<T>(result: serenity::Result<T>) {
    if let Err(why) = result {
        println!("Error sending message: {:?}", why);
    }
}

struct TrackEndNotifier {
    guild_id: serenity::all::GuildId,
    songbird: Arc<songbird::Songbird>,
}

#[async_trait]
impl VoiceEventHandler for TrackEndNotifier {
    async fn act(&self, ctx: &EventContext<'_>) -> Option<Event> {
        if let EventContext::Track(track_list) = ctx {
            // -1 because the track hasn't been removed from the queue yet at this point of the event
            let queue_is_empty = track_list.len() - 1 == 0;

            if queue_is_empty {
                let manager = self.songbird.clone();
                let guild_id = self.guild_id;

                tokio::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_secs(5 * 60)).await;

                    // Check if the bot is still in a voice channel for this guild.
                    // If not, it might have been manually disconnected (e.g., by the /leave command).
                    if manager.get(guild_id).is_some() {
                        // Re-fetch the handler and check if the queue is still empty
                        if let Some(handler_lock) = manager.get(guild_id) {
                            let handler = handler_lock.lock().await;
                            let is_queue_still_empty = handler.queue().is_empty();
                            drop(handler); // Release lock

                            if is_queue_still_empty {
                                if let Err(e) = manager.remove(guild_id).await {
                                    println!(
                                        "Error leaving guild {} after delay: {:?}",
                                        guild_id, e
                                    );
                                }
                            }
                        }
                    }
                });
            }
        }

        None
    }
}
