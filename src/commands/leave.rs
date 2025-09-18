use tracing::error;

use crate::{
    check_msg, create_default_message, create_error_message, utils::require_voice_handler,
    CommandResult, Context,
};

/// Stop and leave the voice channel
#[poise::command(slash_command, guild_only)]
pub async fn leave(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();
    let manager = &ctx.data().songbird;

    let _handler_lock = match require_voice_handler(ctx).await {
        Some(lock) => lock,
        None => return Ok(()),
    };

    // Clear the queue
    let guilds_data_map_lock = ctx.data().guilds.clone();
    let mut guilds_data_map = guilds_data_map_lock.lock().await;
    guilds_data_map.remove(&guild_id);

    if let Err(e) = manager.remove(guild_id).await {
        let reply = create_error_message("Failed to leave voice channel");
        check_msg(ctx.send(reply).await);
        error!("Failed to leave voice channel: {:?}", e);
        return Ok(());
    }

    let reply = create_default_message("I've left the voice channel", false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
