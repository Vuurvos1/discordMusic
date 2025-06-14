use crate::{
    check_msg, create_default_message, create_error_message, utils::get_guild_data, CommandResult,
    Context,
};
use rand::seq::SliceRandom;

/// Shuffle the queue
#[poise::command(slash_command, guild_only)]
pub async fn shuffle(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();
    let manager = &ctx.data().songbird;

    let _handler_lock = match manager.get(guild_id) {
        Some(handler) => handler,
        None => {
            let reply = create_error_message("Not in a voice channel".to_string());
            check_msg(ctx.send(reply).await);
            return Ok(());
        }
    };

    let guild_data = get_guild_data(ctx, guild_id.get()).await;
    let mut guild_data = guild_data.lock().await;

    if guild_data.queue.len() <= 1 {
        let reply = create_error_message("Nothing to shuffle, the queue is empty".to_string());
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    // Shuffle all items but the first in the queue
    let first = guild_data.queue.pop_front().unwrap();
    let mut rest: Vec<_> = guild_data.queue.drain(..).collect();
    rest.shuffle(&mut rand::rng());

    // Rebuild the queue
    guild_data.queue.push_back(first);
    for item in rest {
        guild_data.queue.push_back(item);
    }

    let reply = create_default_message("Shuffled the queue".to_string(), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
