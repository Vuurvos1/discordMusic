use crate::{check_msg, CommandResult, Context};

#[poise::command(slash_command, guild_only, aliases("resume"))]
pub async fn unpause(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();
    let manager = &ctx.data().songbird;

    let handler_lock = match manager.get(guild_id) {
        Some(handler) => handler,
        None => {
            let reply = poise::CreateReply::default().content("Not in a voice channel");
            check_msg(ctx.send(reply).await);
            return Ok(());
        }
    };

    let handler = handler_lock.lock().await;
    let queue = handler.queue();
    let resumed = queue.resume();

    if let Err(e) = resumed {
        println!("Failed to resume: {:?}", e);
        check_msg(ctx.say("Failed to resume").await);
        return Ok(());
    }

    check_msg(ctx.say("Resumed").await);

    Ok(())
}
