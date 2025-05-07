use crate::{check_msg, CommandResult, Context};

#[poise::command(slash_command, guild_only)]
pub async fn skip(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let manager = &ctx.data().songbird;
    let has_handler = manager.get(guild_id).is_some();

    if has_handler {
        let handler_lock = manager.get(guild_id).unwrap();
        let handler = handler_lock.lock().await;

        let queue = handler.queue();
        let skip_result = queue.skip();

        if let Ok(_skipped) = skip_result {
            check_msg(ctx.say("Skipped").await);
        } else {
            check_msg(ctx.say("Failed to skip").await);
        }
    } else {
        let reply = poise::CreateReply::default().content("Not in a voice channel");
        check_msg(ctx.send(reply).await);
    }

    Ok(())
}
