use tracing::error;

use crate::{
    check_msg, create_default_message, create_error_message, utils::get_guild_data,
    utils::require_voice_handler, CommandResult, Context,
};

#[poise::command(slash_command, guild_only)]
pub async fn skip(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let _handler_lock = match require_voice_handler(ctx).await {
        Some(lock) => lock,
        None => return Ok(()),
    };

    let guild_data = get_guild_data(ctx, guild_id).await;
    let guild_data = guild_data.lock().await;

    if guild_data.queue.is_empty() {
        let reply = create_error_message("Queue is empty, nothing to skip".to_string());
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    if let Some(handler) = &guild_data.track_handle {
        if let Err(e) = handler.stop() {
            error!("Failed to skip song: {:?}", e);
            let reply = create_error_message("Failed to skip song".to_string());
            check_msg(ctx.send(reply).await);
            return Ok(());
        }
    }

    let reply = create_default_message("Skipped song".to_string(), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
