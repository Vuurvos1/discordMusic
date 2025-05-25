use crate::{
    check_msg, create_default_message, create_error_message, utils::get_guild_data, CommandResult,
    Context,
};

/// Pause the current song
#[poise::command(slash_command, guild_only)]
pub async fn pause(ctx: Context<'_>) -> CommandResult {
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
    let guild_data = guild_data.lock().await;

    if let Some(handler) = &guild_data.track_handle {
        if let Err(e) = handler.pause() {
            println!("Failed to pause: {:?}", e);
            let reply = create_error_message("Failed to pause".to_string());
            check_msg(ctx.send(reply).await);
            return Ok(());
        }
    }

    let reply = create_default_message("Paused music".to_string(), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
