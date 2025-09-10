use crate::{
    check_msg, create_default_message,
    utils::{get_guild_data, require_voice_handler},
    CommandResult, Context,
};

/// Toggle looping for the current song
#[poise::command(slash_command, guild_only)]
pub async fn r#loop(ctx: Context<'_>) -> CommandResult {
    let guild_id = ctx.guild_id().unwrap();

    let _handler_lock = match require_voice_handler(ctx).await {
        Some(lock) => lock,
        None => return Ok(()),
    };

    let guild_data = get_guild_data(ctx, guild_id).await;
    let mut guild_data = guild_data.lock().await;

    guild_data.queue.toggle_looping();

    let status = if guild_data.queue.looping {
        "enabled"
    } else {
        "disabled"
    };
    let reply = create_default_message(&format!("Looping {}", status), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
