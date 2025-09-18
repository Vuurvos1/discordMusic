use tracing::error;

use crate::{
    check_msg, create_default_message, create_error_message, utils::get_guild_data,
    utils::require_voice_handler, CommandResult, Context,
};

/// Pause the current song
#[poise::command(slash_command, guild_only)]
pub async fn pause(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let _handler_lock = match require_voice_handler(ctx).await {
        Some(lock) => lock,
        None => return Ok(()),
    };

    let guild_data = get_guild_data(ctx, guild_id).await;
    let handle_opt = {
        let data = guild_data.lock().await;
        data.track_handle.clone()
    };

    if let Some(handler) = handle_opt {
        if let Err(e) = handler.pause() {
            error!("Failed to pause: {:?}", e);
            let reply = create_error_message("Failed to pause");
            check_msg(ctx.send(reply).await);
            return Ok(());
        }
    }

    let reply = create_default_message("Paused music", false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
