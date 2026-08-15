use crate::{CommandResult, Context, check_msg, create_default_message};

#[poise::command(slash_command, guild_only)]
pub async fn ping(ctx: Context<'_>) -> CommandResult {
    let reply = create_default_message("Pong!", true);
    check_msg(ctx.send(reply).await);
    Ok(())
}
