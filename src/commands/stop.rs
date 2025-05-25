use crate::{check_msg, create_default_message, CommandResult, Context};

/// Stop playing and clear the queue
#[poise::command(slash_command, guild_only)]
pub async fn stop(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let manager = &ctx.data().songbird;
    let has_handler = manager.get(guild_id).is_some();

    // if has_handler {
    //     if let Some(handler_lock) = manager.get(guild_id) {
    //         let handler = handler_lock.lock().await;
    //         handler.queue().stop();
    //     }
    // }

    let reply = create_default_message("Stopped music".to_string(), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
