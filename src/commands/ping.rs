use crate::{check_msg, CommandResult, Context};

#[poise::command(slash_command, guild_only)]
pub async fn ping(ctx: Context<'_>) -> CommandResult {
    check_msg(ctx.say("Pong!").await);

    Ok(())
}
