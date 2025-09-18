use crate::{
    check_msg, create_default_message, create_error_message, utils::get_guild_data,
    utils::require_voice_handler, CommandResult, Context,
};
use tracing::error;

#[poise::command(slash_command, guild_only)]
pub async fn skip(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let _handler_lock = match require_voice_handler(ctx).await {
        Some(lock) => lock,
        None => return Ok(()),
    };

    let guild_data = get_guild_data(ctx, guild_id).await;
    let (is_empty, handle_opt) = {
        let data = guild_data.lock().await;
        (data.queue.is_empty(), data.track_handle.clone())
    };

    if is_empty {
        let reply = create_error_message("Queue is empty, nothing to skip");
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    let Some(handle) = handle_opt else {
        let reply = create_error_message("Nothing is currently playing");
        check_msg(ctx.send(reply).await);
        return Ok(());
    };

    if let Err(e) = handle.stop() {
        error!("Failed to skip song: {:?}", e);
        let reply = create_error_message("Failed to skip song");
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    let reply = create_default_message("Skipped song", false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
