mod commands;
mod utils;

use songbird::tracks::TrackHandle;
use std::collections::HashMap;
use std::collections::VecDeque;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{debug, error, info};

use dotenv::dotenv;

use serenity::all as serenity;
use serenity::async_trait;
use serenity::{client::EventHandler, prelude::GatewayIntents};

// Event related imports to detect track creation failures.
use songbird::events::{Event, EventContext, EventHandler as VoiceEventHandler};

// YtDl requests need an HTTP client to operate -- we'll create and store our own.
use reqwest::Client as HttpClient;
use songbird::input::YoutubeDl;
use songbird::Call;

#[derive(Clone, Debug)]
pub struct TrackMetadata {
    pub title: String,
    pub url: String,
    pub artist: String,
    pub duration: String,
    pub requested_by: u64,
    pub platform: String,
}

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

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, UserData, Error>;
type CommandResult = Result<(), Error>;

#[derive(Default)]
pub struct GuildData {
    queue: VecDeque<TrackMetadata>, // TODO: rename to tracks?
    track_handle: Option<TrackHandle>,
    pub looping: bool,
    // play_mode: PlayMode,
}

pub type GuildDataMap = HashMap<u64, Arc<Mutex<GuildData>>>;

struct UserData {
    http: HttpClient,
    songbird: Arc<songbird::Songbird>,
    guilds: Arc<Mutex<GuildDataMap>>,
}

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

    dotenv().expect("Failed to load .env file");

    // Configure the client with your Discord bot token in the environment.
    let token = std::env::var("DISCORD_TOKEN").expect("Discord token must be set.");

    // Create our songbird voice manager
    let manager = songbird::Songbird::serenity();

    // Configure our command framework
    let options = poise::FrameworkOptions {
        commands: vec![
            commands::clear::clear(),
            commands::leave::leave(),
            commands::r#loop::r#loop(),
            commands::r#move::r#move(),
            commands::pause::pause(),
            commands::ping::ping(),
            commands::play::play(),
            commands::queue::queue(),
            commands::remove::remove(),
            commands::resume::resume(),
            commands::shuffle::shuffle(),
            commands::skip::skip(),
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
                    guilds: Arc::new(Mutex::new(HashMap::new())),
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
                error!(
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
    guild_data: Arc<Mutex<GuildData>>,
    http_client: HttpClient,
    handler_lock: Arc<Mutex<Call>>,
}

#[async_trait]
impl VoiceEventHandler for TrackEndNotifier {
    async fn act(&self, _ctx: &EventContext<'_>) -> Option<Event> {
        // Lock the handler to ensure exclusive access to playback
        let mut handler = self.handler_lock.lock().await;

        // Lock the guild data and pop the next track from the real queue
        let mut guild_data = self.guild_data.lock().await;

        if !guild_data.looping {
            guild_data.queue.pop_front();
        }

        if let Some(metadata) = guild_data.queue.front() {
            let search = metadata.url.clone();
            let do_search = !search.starts_with("http");

            // Play the next track
            let src = if do_search {
                YoutubeDl::new_search(self.http_client.clone(), search)
            } else {
                YoutubeDl::new(self.http_client.clone(), search)
            };
            let _track_handle = handler.play_only_input(src.into());
        } else {
            // Queue is empty, schedule auto-leave
            info!("TrackEndNotifier: Queue empty. Scheduling auto-leave.");

            let manager = Arc::clone(&self.songbird); // clone the Arc
            let guild_id = self.guild_id; // Copy, GuildId is Copy
            let guild_data = Arc::clone(&self.guild_data);

            tokio::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(10 * 60)).await;

                // Only lock for the check, then drop before calling .remove
                let queue_empty = {
                    if let Some(handler_lock_check) = manager.get(guild_id) {
                        let _handler_check = handler_lock_check.lock().await;
                        guild_data.lock().await.queue.is_empty()
                    } else {
                        // Handler is gone, nothing to do
                        return;
                    }
                };

                if queue_empty {
                    debug!("Auto-leaving guild due to inactivity");

                    if let Err(e) = manager.remove(guild_id).await {
                        error!("Error auto-leaving guild after delay: {:?}", e);
                    }
                }
            });
        }
        None
    }
}
