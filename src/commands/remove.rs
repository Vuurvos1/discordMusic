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
    let removed_title = {
        let mut data = guild_data.lock().await;
        match data.queue.remove(position as usize) {
            Ok(song) => song.title,
            Err(e) => {
                drop(data);
                let reply = create_error_message(&format!("Failed to remove song: {}", e));
                check_msg(ctx.send(reply).await);
                return Ok(());
            }
        }
    };

    let reply = create_default_message(&format!("Removed {} from the queue", removed_title), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
