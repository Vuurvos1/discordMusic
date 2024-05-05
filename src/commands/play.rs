// To turn user URLs into playable audio, we'll use yt-dlp.
use songbird::input::YoutubeDl;

use crate::{check_msg, CommandResult, Context};

#[poise::command(slash_command, guild_only)]
pub async fn play(
    ctx: Context<'_>,
    #[description = "The URL of the song to play. Can be a search query."] search: Option<String>,
) -> CommandResult {
    if let Some(search) = search {
        let do_search = !search.starts_with("http");

        let guild_id = ctx.guild_id().unwrap();
        let data = ctx.data();

        if let Some(handler_lock) = data.songbird.get(guild_id) {
            let mut handler = handler_lock.lock().await;

            let src = if do_search {
                YoutubeDl::new_search(data.http.clone(), search)
            } else {
                YoutubeDl::new(data.http.clone(), search)
            };
            let _ = handler.play_input(src.into());

            check_msg(ctx.say("Playing song").await);
        } else {
            check_msg(ctx.say("Not in a voice channel to play in").await);
        }
    } else {
        check_msg(ctx.reply("Please provide a URL to play").await);
    }

    Ok(())
}
