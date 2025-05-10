use crate::{check_msg, CommandResult, Context};

/// Stop and leave the voice channel
#[poise::command(slash_command, guild_only)]
pub async fn leave(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let manager = &ctx.data().songbird;
    let has_handler = manager.get(guild_id).is_some();

    if has_handler {
        // Get the handler and clear the queue before leaving
        if let Some(handler_lock) = manager.get(guild_id) {
            let handler = handler_lock.lock().await;
            handler.queue().stop();
        }

        if let Err(e) = manager.remove(guild_id).await {
            let reply = poise::CreateReply::default()
                .content("Failed to leave voice channel")
                .ephemeral(true);
            check_msg(ctx.send(reply).await);
            println!("Failed to leave voice channel: {:?}", e);
            return Ok(());
        }

        check_msg(ctx.say("Cleared queue and left voice channel").await);
    } else {
        let reply = poise::CreateReply::default()
            .content("Not in a voice channel")
            .ephemeral(true);
        check_msg(ctx.send(reply).await);
    }

    check_msg(ctx.say("Left voice channel").await);
    Ok(())
}
