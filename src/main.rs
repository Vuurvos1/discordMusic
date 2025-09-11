mod commands;
mod queue;
mod utils;

use songbird::tracks::TrackHandle;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{oneshot, Mutex};
use tracing::warn;
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

use crate::queue::Queue;

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
    queue: Queue,
    track_handle: Option<TrackHandle>,
    // Auto-leave task cancellation
    auto_leave_cancel: Option<oneshot::Sender<()>>,
    // play_mode: PlayMode,
}

pub type GuildDataMap = HashMap<serenity::GuildId, Arc<Mutex<GuildData>>>;

struct UserData {
    http: HttpClient,
    songbird: Arc<songbird::Songbird>,
    guilds: Arc<Mutex<GuildDataMap>>,
}

struct Handler;

#[serenity::async_trait]
impl EventHandler for Handler {
    async fn ready(&self, _: serenity::Context, ready: serenity::Ready) {
        info!("{} is connected!", ready.user.name);
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Load .env file if it exists (optional for Docker containers)
    if let Err(e) = dotenv() {
        warn!(
            "No .env file found or failed to load: {}. Using environment variables directly.",
            e
        );
    }

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

    let intents = GatewayIntents::non_privileged()
        | GatewayIntents::MESSAGE_CONTENT
        | GatewayIntents::GUILD_VOICE_STATES;
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
            .map_err(|why| error!("Client ended: {:?}", why));
    });

    let _signal_err = tokio::signal::ctrl_c().await;
    info!("Received Ctrl-C, shutting down.");
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

fn create_default_message(message: &str, ephemeral: bool) -> poise::CreateReply {
    let colors = CustomColours::new();
    poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
                .description(message)
                .color(colors.default), // Using the custom error color
        )
        .ephemeral(ephemeral)
}

fn create_error_message(error: &str) -> poise::CreateReply {
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
        error!("Error sending message: {:?}", why);
    }
}

/// Cancels any existing auto-leave task for the guild
pub async fn cancel_auto_leave(guild_data: &Arc<Mutex<GuildData>>) {
    let mut data = guild_data.lock().await;
    if let Some(cancel_sender) = data.auto_leave_cancel.take() {
        let _ = cancel_sender.send(()); // Cancel existing task
    }
}

/// Starts a new auto-leave task for the guild
pub async fn start_auto_leave_task(
    guild_id: serenity::all::GuildId,
    songbird: Arc<songbird::Songbird>,
    guild_data: Arc<Mutex<GuildData>>,
) {
    cancel_auto_leave(&guild_data).await;

    let (cancel_sender, cancel_receiver) = oneshot::channel();

    {
        let mut data = guild_data.lock().await;
        data.auto_leave_cancel = Some(cancel_sender);
    }

    info!("TrackEndNotifier: Queue empty. Starting single auto-leave task.");

    let guild_data_clone = Arc::clone(&guild_data);
    tokio::spawn(async move {
        tokio::select! {
            _ = tokio::time::sleep(std::time::Duration::from_secs(10 * 60)) => {
                let should_leave = {
                    if let Some(handler_lock_check) = songbird.get(guild_id) {
                        let _handler_check = handler_lock_check.lock().await;
                        let data = guild_data_clone.lock().await;
                        data.queue.is_empty()
                    } else {
                        return;
                    }
                };

                if should_leave {
                    debug!("Auto-leaving guild {} due to inactivity", guild_id.get());

                    {
                        let mut data = guild_data_clone.lock().await;
                        data.auto_leave_cancel = None;
                    }

                    if let Err(e) = songbird.remove(guild_id).await {
                        error!("Error auto-leaving guild after delay: {:?}", e);
                    }
                }
            }
            _ = cancel_receiver => {
                debug!("Auto-leave task cancelled for guild {}", guild_id.get());
            }
        }
    });
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
        // Advance and copy next URL under guild_data lock
        let (next_url, cancel_sender_opt) = {
            let mut data = self.guild_data.lock().await;
            let _ = data.queue.next_track();
            let url = data.queue.front().map(|m| m.url.clone());
            let cancel = if url.is_some() {
                data.auto_leave_cancel.take()
            } else {
                None
            };
            (url, cancel)
        };

        if let Some(search) = next_url {
            if let Some(cancel_sender) = cancel_sender_opt {
                let _ = cancel_sender.send(());
            }

            let src = if search.starts_with("http") {
                YoutubeDl::new(self.http_client.clone(), search)
            } else {
                YoutubeDl::new_search(self.http_client.clone(), search)
            };

            // Briefly lock the handler to start playback
            let track_handle = {
                let mut handler = self.handler_lock.lock().await;
                handler.play_only_input(src.into())
            };

            // Briefly re-lock guild_data to store the handle
            {
                let mut data = self.guild_data.lock().await;
                data.track_handle = Some(track_handle);
            }
        } else {
            start_auto_leave_task(
                self.guild_id,
                Arc::clone(&self.songbird),
                Arc::clone(&self.guild_data),
            )
            .await;
        }
        None
    }
}
