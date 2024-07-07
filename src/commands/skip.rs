use crate::{check_msg, CommandResult, Context};

#[poise::command(slash_command, guild_only)]
pub async fn skip(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let manager = &ctx.data().songbird;

    if let Some(handler_lock) = manager.get(guild_id) {
        let handler = handler_lock.lock().await;
        let queue = handler.queue();
        let _ = queue.skip();

        check_msg(
            ctx.say(format!("Song skipped: {} in queue.", queue.len()))
                .await,
        )
    } else {
        check_msg(ctx.say("Not in a voice channel to play in").await);
    }

    Ok(())
}
