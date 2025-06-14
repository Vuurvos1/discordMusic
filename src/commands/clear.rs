use crate::{
    check_msg, create_default_message, create_error_message, utils::get_guild_data, CommandResult,
    Context,
};

/// Clear the queue
#[poise::command(slash_command, guild_only)]
pub async fn clear(ctx: Context<'_>) -> CommandResult {
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

    let guild_data = get_guild_data(ctx, guild_id.get()).await;
    let mut guild_data = guild_data.lock().await;

    if guild_data.queue.is_empty() {
        let reply = create_error_message("Nothing to clear, the queue is empty".to_string());
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    // Clear the queue
    guild_data.queue.clear();

    let reply = create_default_message("Cleared the queue".to_string(), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
