use crate::{Context, GuildData};
use std::sync::Arc;
use tokio::sync::Mutex;

pub async fn get_guild_data(ctx: Context<'_>, guild_id: u64) -> Arc<Mutex<GuildData>> {
    let guilds_data_map_lock = ctx.data().guilds.clone();
    let mut guilds_data_map = guilds_data_map_lock.lock().await;

    guilds_data_map
        .entry(guild_id)
        .or_insert_with(|| Arc::new(Mutex::new(GuildData::default())))
        .clone()
}
