use rand::seq::SliceRandom;
use std::collections::VecDeque;

use crate::TrackMetadata;

#[derive(Debug, thiserror::Error)]
pub enum QueueError {
    #[error("invalid index")]
    InvalidIndex,
    #[error("cannot modify the currently playing track")]
    LockedCurrent,
}

#[derive(Default, Debug, Clone)]
pub struct Queue {
    pub tracks: VecDeque<TrackMetadata>,
    publooping: bool,
}

impl Queue {
    pub fn len(&self) -> usize {
        self.tracks.len()
    }
    pub fn is_empty(&self) -> bool {
        self.tracks.is_empty()
    }
    pub fn set_looping(&mut self, looping: bool) {
        self.looping = looping;
    }
    pub fn toggle_looping(&mut self) {
        self.looping = !self.looping;
    }

    pub fn front(&self) -> Option<&TrackMetadata> {
        self.tracks.front()
    }
    pub fn push(&mut self, track: TrackMetadata) {
        self.tracks.push_back(track);
    }
    pub fn clear(&mut self) {
        self.tracks.clear();
    }

    pub fn push_back(&mut self, track: TrackMetadata) {
        self.tracks.push_back(track);
    }

    // Called when a track ends naturally. Returns the next track to play (if any).
    pub fn next_track(&mut self) -> Option<TrackMetadata> {
        if !self.looping {
            self.tracks.pop_front();
        }
        self.tracks.front().cloned()
    }

    // skip the current track
    pub fn skip(&mut self) -> Option<TrackMetadata> {
        let _ = self.tracks.pop_front();
        self.tracks.front().cloned()
    }

    // 1-based indices, consistent with UI; 1 is the currently playing track.
    // By policy we disallow removing 1 here (use `skip` instead).
    pub fn remove(&mut self, index: usize) -> Result<TrackMetadata, QueueError> {
        if index == 0 || index > self.tracks.len() {
            return Err(QueueError::InvalidIndex);
        }
        if index == 1 {
            return Err(QueueError::LockedCurrent);
        }
        Ok(self
            .tracks
            .remove(index - 1)
            .ok_or(QueueError::InvalidIndex)?)
    }

    // Moves a track from -> to (1-based). Index 1 is locked.
    pub fn move_item(&mut self, from1: usize, to1: usize) -> Result<(), QueueError> {
        let n = self.tracks.len();
        if from1 == 0 || to1 == 0 || from1 > n || to1 > n {
            return Err(QueueError::InvalidIndex);
        }
        if from1 == 1 || to1 == 1 {
            return Err(QueueError::LockedCurrent);
        }

        let from = from1 - 1;
        let to = to1 - 1;
        let item = self.tracks.remove(from).ok_or(QueueError::InvalidIndex)?;
        if to >= self.tracks.len() {
            self.tracks.push_back(item);
        } else {
            self.tracks.insert(to, item);
        }
        Ok(())
    }

    pub fn shuffle(&mut self) {
        if self.tracks.len() <= 2 {
            return;
        }

        let rng = &mut rand::rng();
        let mut rest: Vec<_> = self.tracks.drain(1..).collect();
        rest.shuffle(rng);
        for item in rest {
            self.tracks.push_back(item);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tm(i: usize) -> TrackMetadata {
        TrackMetadata {
            title: format!("t{}", i),
            url: "u".into(),
            artist: "".into(),
            duration: "".into(),
            requested_by: 0,
            platform: "youtube".into(),
        }
    }

    #[test]
    fn move_and_remove_respect_current() {
        let mut q = Queue::default();
        for i in 0..5 {
            q.push(tm(i));
        }
        assert!(matches!(q.remove(1), Err(QueueError::LockedCurrent)));
        assert!(matches!(q.move_item(1, 3), Err(QueueError::LockedCurrent)));
        assert!(q.remove(3).is_ok());
        assert!(q.move_item(2, 3).is_ok());
    }

    #[test]
    fn advance_and_skip() {
        let mut q = Queue::default();
        for i in 0..3 {
            q.push(tm(i));
        }
        assert_eq!(q.front().unwrap().title, "t0");
        let _ = q.skip();
        assert_eq!(q.front().unwrap().title, "t1");
        q.set_looping(true);
        let n = q.next_track().unwrap();
        assert_eq!(n.title, "t1"); // looping keeps current
    }

    #[test]
    fn shuffle_preserves_first() {
        let mut q = Queue::default();
        for i in 0..6 {
            q.push(tm(i));
        }
        let first = q.front().unwrap().title.clone();
        q.shuffle();
        assert_eq!(q.front().unwrap().title, first);
    }
}
