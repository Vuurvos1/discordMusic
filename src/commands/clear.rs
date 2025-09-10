use crate::{
    check_msg, create_default_message, create_error_message, utils::get_guild_data,
    utils::require_voice_handler, CommandResult, Context,
};

/// Clear the queue
#[poise::command(slash_command, guild_only)]
pub async fn clear(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let _handler_lock = match require_voice_handler(ctx).await {
        Some(lock) => lock,
        None => return Ok(()),
    };

    let guild_data = get_guild_data(ctx, guild_id).await;
    let mut guild_data = guild_data.lock().await;

    if guild_data.queue.is_empty() {
        let reply = create_error_message("Nothing to clear, the queue is empty");
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    guild_data.queue.clear();

    let reply = create_default_message("Cleared the queue", false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
