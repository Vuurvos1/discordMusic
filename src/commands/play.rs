use poise::command;
// To turn user URLs into playable audio, we'll use yt-dlp.
use songbird::input::YoutubeDl;

use crate::{check_msg, CommandResult, Context};

#[poise::command(slash_command, guild_only)]
pub async fn play(
    ctx: Context<'_>,
    #[description = "The URL of the song to play. Can be a search query."] search: Option<String>,
) -> CommandResult {
    // let url = match search {
    //     Some(url) => url,
    //     None => {
    //         check_msg(ctx.reply("Please provide a URL to play").await);
    //         return Ok(());
    //     }
    // };

    // let do_search = !url.starts_with("http");

    // let guild_id = ctx.guild_id().unwrap();

    // let data = ctx.data();

    // let http_client = ctx.data().http.clone();

    // let manager = songbird::get(ctx)
    //     .await
    //     .expect("Songbird Voice client placed in at initialisation.")
    //     .clone();

    // if let Some(handler_lock) = manager.get(guild_id) {
    //     let mut handler = handler_lock.lock().await;

    //     let mut src = if do_search {
    //         YoutubeDl::new_search(http_client, url)
    //     } else {
    //         YoutubeDl::new(http_client, url)
    //     };
    //     let _ = handler.play_input(src.clone().into());

    //     // check_msg(msg.channel_id.say(&ctx.http, "Playing song").await);
    // } else {
    //     // check_msg(
    //     //     msg.channel_id
    //     //         .say(&ctx.http, "Not in a voice channel to play in")
    //     //         .await,
    //     // );
    // }

    Ok(())

    // let guild_id = ctx.guild_id().unwrap();
    // let manager = &ctx.data().songbird;

    // let handler_lock = match manager.get(guild_id) {
    //     Some(handler) => handler,
    //     None => {
    //         check_msg(ctx.reply("Not in a voice channel").await);
    //         return Ok(());
    //     }
    // };

    // let mut handler = handler_lock.lock().await;

    // // Use Songbird's ytdl to stream audio
    // let source = match songbird::ytdl(&url).await {
    //     Ok(source) => source,
    //     Err(why) => {
    //         check_msg(ctx.reply(format!("Error sourcing ffmpeg: {:?}", why)).await);
    //         return Ok(());
    //     }
    // };

    // handler.enqueue_source(source);

    // check_msg(ctx.say(format!("Added to queue: {}", url)).await);

    // Ok(())

    // if let Some(search) = search {
    //     let do_search = !search.starts_with("http");

    //     let guild_id = ctx.guild_id().unwrap();
    //     let data = ctx.data();

    //     if let Some(handler_lock) = data.songbird.get(guild_id) {
    //         let mut handler = handler_lock.lock().await;

    //         // let src = if do_search {
    //         //     YoutubeDl::new_search(data.http.clone(), search)
    //         // } else {
    //         //     YoutubeDl::new(data.http.clone(), search)
    //         // };

    //         // let _ = handler.enqueue_input(src.into()).await;

    //         // if !handler.queue().is_empty() {
    //         //     check_msg(ctx.say("Playing song").await);
    //         // } else {
    //         //     check_msg(ctx.say("Added to queue").await);
    //         // }
    //     } else {
    //         check_msg(ctx.say("Not in a voice channel to play in").await);
    //     }
    // } else {
    //     check_msg(ctx.reply("Please provide a URL to play").await);
    // }

    // Ok(())
}
