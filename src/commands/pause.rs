use crate::{check_msg, CommandResult, Context};

/// Pause the current song
#[poise::command(slash_command, guild_only)]
pub async fn pause(ctx: Context<'_>) -> CommandResult {
    println!("pause");

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
    let paused = queue.pause();

    if let Err(e) = paused {
        println!("Failed to pause: {:?}", e);
        let reply = poise::CreateReply::default().content("Failed to pause");
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    check_msg(ctx.say("Paused").await);
    Ok(())
}
