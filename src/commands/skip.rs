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
    let mut guild_data = guild_data.lock().await;

    let _track = match guild_data.queue.skip() {
        Some(track) => track,
        None => {
            let reply = create_error_message("Queue is empty, nothing to skip");
            error!("Queue is empty, nothing to skip"); // TODO: remove log
            check_msg(ctx.send(reply).await);
            return Ok(());
        }
    };

    let reply = create_default_message("Skipped song", false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
