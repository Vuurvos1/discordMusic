use crate::{
    check_msg, create_default_message, create_error_message, utils::get_guild_data,
    utils::require_voice_handler, CommandResult, Context,
};

// TODO: change to an options command where you can select a song from the queue

/// Remove a song from the queue
#[poise::command(slash_command, guild_only)]
pub async fn remove(
    ctx: Context<'_>,
    #[description = "The song to remove"] position: u32,
) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let _handler_lock = match require_voice_handler(ctx).await {
        Some(lock) => lock,
        None => return Ok(()),
    };

    let guild_data = get_guild_data(ctx, guild_id).await;
    let mut guild_data = guild_data.lock().await;

    let queue_len = guild_data.queue.len();

    if queue_len <= 1 {
        let reply = create_error_message("Nothing to remove, the queue is empty".to_string());
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    if position > queue_len as u32 {
        let reply = create_error_message("Invalid position".to_string());
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    let Some(song) = guild_data.queue.remove(position as usize - 1) else {
        let reply = create_error_message("Invalid position".to_string());
        check_msg(ctx.send(reply).await);
        return Ok(());
    };
    let reply = create_default_message(format!("Removed {} from the queue", song.title), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
