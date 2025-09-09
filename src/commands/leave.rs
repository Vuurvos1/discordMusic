use tracing::error;

use crate::{check_msg, create_default_message, create_error_message, CommandResult, Context};

/// Stop and leave the voice channel
#[poise::command(slash_command, guild_only)]
pub async fn leave(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();
    let manager = &ctx.data().songbird;

    let _handler_lock = match manager.get(guild_id) {
        Some(handler) => handler,
        None => {
            let reply = create_error_message("Not in a voice channel".to_string());
            check_msg(ctx.send(reply).await);
            return Ok(());
        }
    };

    // Clear the queue
    let guilds_data_map_lock = ctx.data().guilds.clone();
    let mut guilds_data_map = guilds_data_map_lock.lock().await;
    guilds_data_map.remove(&guild_id.get());

    if let Err(e) = manager.remove(guild_id).await {
        let reply = create_error_message("Failed to leave voice channel".to_string());
        check_msg(ctx.send(reply).await);
        error!("Failed to leave voice channel: {:?}", e);
        return Ok(());
    }

    let reply = create_default_message("I've left the voice channel".to_string(), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
