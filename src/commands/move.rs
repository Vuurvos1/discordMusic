use crate::{
    check_msg, create_default_message, create_error_message, utils::get_guild_data,
    utils::require_voice_handler, CommandResult, Context,
};

// TODO: change to an options command where you can select a song from the queue

/// Move a song in the queue
#[poise::command(slash_command, guild_only)]
pub async fn r#move(
    ctx: Context<'_>,
    #[description = "The song to move"] from: u32,
    #[description = "The new position of the song"] to: u32,
) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let _handler_lock = match require_voice_handler(ctx).await {
        Some(lock) => lock,
        None => return Ok(()),
    };

    let guild_data = get_guild_data(ctx, guild_id).await;
    let move_result = {
        let mut data = guild_data.lock().await;
        data.queue.move_item(from as usize, to as usize)
    };

    if let Err(e) = move_result {
        let reply = create_error_message(&format!("Failed to move song: {}", e));
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    let reply = create_default_message("Moved the song", false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
