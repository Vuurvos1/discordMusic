use crate::{CommandResult, Context};

/// Display the current song queue.
#[poise::command(slash_command, guild_only)]
pub async fn queue(ctx: Context<'_>) -> CommandResult {
    if let Err(e) = ctx.defer_ephemeral().await {
        println!("Error deferring interaction for queue: {:?}", e);
        return Ok(());
    }

    // let queue_arc: Arc<Mutex<GuildDataMap>> = ctx.data().queue.clone();
    // let guild_id = ctx.guild_id().unwrap();
    // let guild_uid = guild_id.get();

    // let queue = queue_arc.lock().await;
    // let empty_queue = VecDeque::new();
    // let queue_for_guild = queue.get(&guild_uid).unwrap_or(&empty_queue);

    // if queue.is_empty() {
    //     let reply = create_default_message("The queue is currently empty.".to_string(), true);
    //     check_msg(ctx.send(reply).await);
    //     return Ok(());
    // }

    // let mut description = String::new();
    // for (index, metadata) in queue_for_guild.iter().enumerate() {
    //     description.push_str(&format!(
    //         "`{}.` **{}** (Requested by: {})\n", // The \n here is intentional for output formatting
    //         index + 1,
    //         metadata.title,
    //         metadata.requested_by
    //     ));
    // }

    // // Discord embed descriptions have a limit of 4096 characters.
    // if description.len() > 4000 {
    //     // A bit of buffer
    //     description.truncate(4000);
    //     // The \n here is intentional for output formatting
    //     description.push_str("\n... and more (queue too long to display fully).");
    // }

    // let reply = create_default_message(description, false);
    // check_msg(ctx.send(reply).await);

    Ok(())
}
