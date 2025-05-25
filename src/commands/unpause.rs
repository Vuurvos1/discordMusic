use crate::{check_msg, create_default_message, create_error_message, CommandResult, Context};

#[poise::command(slash_command, guild_only, aliases("resume"))]
pub async fn unpause(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();
    let manager = &ctx.data().songbird;

    let handler_lock = match manager.get(guild_id) {
        Some(handler) => handler,
        None => {
            let reply = create_error_message("Not in a voice channel".to_string());
            check_msg(ctx.send(reply).await);
            return Ok(());
        }
    };

    let handler = handler_lock.lock().await;
    // let queue = handler.queue();
    // let resumed = queue.resume();

    // if let Err(e) = resumed {
    //     println!("Failed to resume: {:?}", e);
    //     let reply = create_error_message("Failed to resume".to_string());
    //     check_msg(ctx.send(reply).await);
    //     return Ok(());
    // }

    let reply = create_default_message("Resumed playing".to_string(), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
