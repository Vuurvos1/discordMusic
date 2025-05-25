use crate::{check_msg, create_default_message, create_error_message, CommandResult, Context};

/// Stop and leave the voice channel
#[poise::command(slash_command, guild_only)]
pub async fn leave(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let manager = &ctx.data().songbird;
    let has_handler = manager.get(guild_id).is_some();

    if has_handler {
        // Get the handler and clear the queue before leaving
        // if let Some(handler_lock) = manager.get(guild_id) {
        //     let handler = handler_lock.lock().await;
        //     handler.queue().stop();
        // }

        if let Err(e) = manager.remove(guild_id).await {
            let reply = create_error_message("Failed to leave voice channel".to_string());
            check_msg(ctx.send(reply).await);
            println!("Failed to leave voice channel: {:?}", e);
            return Ok(());
        }
    } else {
        let reply = create_error_message("Not in a voice channel".to_string());
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    let reply = create_default_message("I've left the voice channel".to_string(), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
