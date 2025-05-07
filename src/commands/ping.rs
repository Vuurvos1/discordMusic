use crate::{check_msg, CommandResult, Context};

#[poise::command(slash_command, guild_only)]
pub async fn ping(ctx: Context<'_>) -> CommandResult {
    let reply = poise::CreateReply::default().content("Pong!");
    check_msg(ctx.send(reply).await);
    Ok(())
}
