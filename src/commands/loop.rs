use crate::{
    check_msg, create_default_message, create_error_message, utils::get_guild_data, CommandResult,
    Context,
};

/// Toggle looping for the current song
#[poise::command(slash_command, guild_only)]
pub async fn r#loop(ctx: Context<'_>) -> CommandResult {
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

    guild_data.looping = !guild_data.looping;

    if let Some(handler) = &guild_data.track_handle {
        if guild_data.looping {
            if let Err(e) = handler.enable_loop() {
                println!("Failed to enable loop: {:?}", e);
                let reply = create_error_message("Failed to enable loop".to_string());
                check_msg(ctx.send(reply).await);
                return Ok(());
            }
        } else {
            if let Err(e) = handler.disable_loop() {
                println!("Failed to disable loop: {:?}", e);
                let reply = create_error_message("Failed to disable loop".to_string());
                check_msg(ctx.send(reply).await);
                return Ok(());
            }
        }
    }
    let status = if guild_data.looping {
        "enabled"
    } else {
        "disabled"
    };
    let reply = create_default_message(format!("Looping {}", status), false);
    check_msg(ctx.send(reply).await);
    Ok(())
}
