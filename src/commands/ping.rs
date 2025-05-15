use crate::{check_msg, create_default_message, CommandResult, Context};

#[poise::command(slash_command, guild_only)]
pub async fn ping(ctx: Context<'_>) -> CommandResult {
    let reply = create_default_message("Pong!".to_string(), true);
    check_msg(ctx.send(reply).await);
    Ok(())
}
