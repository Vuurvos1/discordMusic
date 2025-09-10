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
    let mut guild_data = guild_data.lock().await;

    if guild_data.queue.len() <= 1 {
        let reply = create_error_message("Nothing to move, the queue is empty".to_string());
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    let queue_len = guild_data.queue.len();

    // can't move the first song because it is playing
    if from <= 1 || to > queue_len as u32 {
        let reply = create_error_message("Invalid from position".to_string());
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    let from = from as usize - 1;
    let to = to as usize - 1;

    // positions <= 2 will be moved to the front of the queue
    if to <= 1 {
        let song = guild_data.queue.remove(from).unwrap();
        guild_data.queue.insert(1, song);
    // if past the end of the queue, move it to the end
    } else if to >= queue_len {
        let song = guild_data.queue.remove(from).unwrap();
        guild_data.queue.push_back(song);
    } else {
        let song = guild_data.queue.remove(from).unwrap();
        guild_data.queue.insert(to, song);
    }

    let reply = create_default_message("Moved the song".to_string(), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
