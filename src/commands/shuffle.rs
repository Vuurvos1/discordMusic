use crate::{
    check_msg, create_default_message, create_error_message, utils::get_guild_data,
    utils::require_voice_handler, CommandResult, Context,
};

/// Shuffle the queue
#[poise::command(slash_command, guild_only)]
pub async fn shuffle(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let _handler_lock = match require_voice_handler(ctx).await {
        Some(lock) => lock,
        None => return Ok(()),
    };

    let guild_data = get_guild_data(ctx, guild_id).await;
    let mut guild_data = guild_data.lock().await;

    if guild_data.queue.len() <= 1 {
        let reply = create_error_message("Nothing to shuffle, the queue is empty");
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    if guild_data.queue.len() == 2 {
        let reply = create_error_message("Nothing to shuffle, the queue is too short");
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    guild_data.queue.shuffle();

    let reply = create_default_message("Shuffled the queue", false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
