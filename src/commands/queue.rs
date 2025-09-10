use crate::queue::Queue;
use crate::utils::get_guild_data;
use crate::{check_msg, create_default_message, CommandResult, Context};

/// Display the current song queue.
#[poise::command(slash_command, guild_only)]
pub async fn queue(ctx: Context<'_>) -> CommandResult {
    // TODO: add pagination

    let guild_id = ctx.guild_id().unwrap();

    let guild_data = get_guild_data(ctx, guild_id).await;
    let guild_data = guild_data.lock().await;

    if guild_data.queue.is_empty() {
        let reply = create_default_message("```nim\nThe queue is empty ;-;\n```", true);
        check_msg(ctx.send(reply).await);
        return Ok(());
    }

    let msg = build_queue_msg(&guild_data.queue); // TODO: slice 0..10
    let reply = create_default_message(&msg, true);
    check_msg(ctx.send(reply).await);

    Ok(())
}

fn build_queue_msg(queue: &Queue) -> String {
    let mut msg = String::from("```nim\n");
    let max = queue.len().min(10);

    for (i, song) in queue.tracks.iter().take(max).enumerate() {
        if i == 0 {
            msg.push_str("    ⬐ current track\n");
        }

        let mut title = song.title.clone();
        if title.chars().count() > 40 {
            title = title.chars().take(39).collect::<String>() + "…";
        } else {
            title = format!("{:width$}", title, width = 40);
        }

        // TOOD: show time left

        msg.push_str(&format!("{}) {} {}\n", i + 1, title, song.duration));

        if i == 0 {
            msg.push_str("    ⬑ current track\n");
        }
    }

    msg.push_str("```");
    msg
}
