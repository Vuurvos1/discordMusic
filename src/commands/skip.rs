use crate::{check_msg, create_default_message, create_error_message, CommandResult, Context};

#[poise::command(slash_command, guild_only)]
pub async fn skip(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();
    let manager = &ctx.data().songbird;

    if let Some(handler_lock) = manager.get(guild_id) {
        let handler = handler_lock.lock().await;
        let queue = handler.queue();

        if queue.skip().is_err() {
            let reply = create_error_message("Failed to skip".to_string());
            check_msg(ctx.send(reply).await);
            return Ok(());
        }
    } else {
        let reply = create_error_message("Not in a voice channel".to_string());
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    let reply = create_default_message("Skipped song".to_string(), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
