use crate::{
    check_msg, create_default_message, create_error_message, utils::get_guild_data,
    utils::require_voice_handler, CommandResult, Context,
};
use tracing::error;

#[poise::command(slash_command, guild_only)]
pub async fn skip(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx
        .guild_id()
        .ok_or("guild_only command called outside a guild")?;

    let _handler_lock = match require_voice_handler(ctx).await {
        Some(lock) => lock,
        None => return Ok(()),
    };

    let guild_data = get_guild_data(ctx, guild_id).await;
    let handle_opt = {
        let data = guild_data.lock().await;
        if data.queue.is_empty() {
            let reply = create_error_message("Queue is empty, nothing to skip");
            check_msg(ctx.send(reply).await);
            return Ok(());
        }
        data.track_handle.clone()
    };

    let Some(handle) = handle_opt else {
        let reply = create_error_message("Nothing is currently playing");
        check_msg(ctx.send(reply).await);
        return Ok(());
    };

    // Signal TrackEndNotifier to use skip() instead of next_track(), so looping is bypassed.
    // Set the flag before stopping so it's visible to TrackEndNotifier whenever the event fires.
    guild_data.lock().await.skip_requested = true;

    if let Err(e) = handle.stop() {
        error!("Failed to skip song: {:?}", e);
        guild_data.lock().await.skip_requested = false;
        let reply = create_error_message("Failed to skip song");
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    let reply = create_default_message("Skipped song", false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
