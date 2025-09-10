use crate::{check_msg, create_error_message, Context, GuildData};
use serenity::all as serenity;
use std::sync::Arc;
use tokio::sync::Mutex;

pub async fn get_guild_data(
    ctx: Context<'_>,
    guild_id: serenity::GuildId,
) -> Arc<Mutex<GuildData>> {
    let guilds_data_map_lock = ctx.data().guilds.clone();
    let mut guilds_data_map = guilds_data_map_lock.lock().await;

    guilds_data_map
        .entry(guild_id)
        .or_insert_with(|| Arc::new(Mutex::new(GuildData::default())))
        .clone()
}

/// Ensures the user is in a voice channel and the bot is connected.
/// If not connected, sends an error reply and returns None.
pub async fn require_voice_handler(ctx: Context<'_>) -> Option<Arc<Mutex<songbird::Call>>> {
    let Some(guild_id) = ctx.guild_id() else {
        let reply = create_error_message("This command can only be used in a server.".to_string());
        check_msg(ctx.send(reply).await);
        return None;
    };

    let manager = &ctx.data().songbird;
    match manager.get(guild_id) {
        Some(handler) => Some(handler),
        None => {
            let reply = create_error_message("Not in a voice channel".to_string());
            check_msg(ctx.send(reply).await);
            None
        }
    }
}
