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
    pub looping: bool,
}

impl Queue {
    pub fn len(&self) -> usize {
        self.tracks.len()
    }
    pub fn is_empty(&self) -> bool {
        self.tracks.is_empty()
    }
    #[allow(dead_code)]
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

    // Called when a track ends naturally. Returns the next track to play (if any).
    pub fn next_track(&mut self) -> Option<TrackMetadata> {
        if !self.looping {
            self.tracks.pop_front();
        }
        // TODO: notify user that the track is looping
        self.tracks.front().cloned()
    }

    // Little redundant when you can call next_track instead
    // skip the current track
    #[allow(dead_code)]
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
        self.tracks
            .remove(index - 1)
            .ok_or(QueueError::InvalidIndex)
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

    // remove
    #[test]
    fn remove_rejects_index_0_and_out_of_bounds() {
        let mut q = Queue::default();
        for i in 0..3 {
            q.push(tm(i));
        }
        assert!(matches!(q.remove(0), Err(QueueError::InvalidIndex)));
        assert!(matches!(q.remove(4), Err(QueueError::InvalidIndex)));
    }

    #[test]
    fn remove_rejects_current_track() {
        let mut q = Queue::default();
        for i in 0..3 {
            q.push(tm(i));
        }
        assert!(matches!(q.remove(1), Err(QueueError::LockedCurrent)));
    }

    #[test]
    fn remove_valid_removes_correct_track() {
        let mut q = Queue::default();
        for i in 0..3 {
            q.push(tm(i));
        }
        let removed = q.remove(3).expect("valid index should remove");
        assert_eq!(removed.title, "t2");
        assert_eq!(q.len(), 2);
        assert_eq!(q.tracks.get(1).unwrap().title, "t1");
    }

    // move
    #[test]
    fn move_rejects_current_track_in_from_or_to() {
        let mut q = Queue::default();
        for i in 0..4 {
            q.push(tm(i));
        }
        assert!(matches!(q.move_item(1, 3), Err(QueueError::LockedCurrent)));
        assert!(matches!(q.move_item(2, 1), Err(QueueError::LockedCurrent)));
    }

    #[test]
    fn move_rejects_invalid_indices() {
        let mut q = Queue::default();
        for i in 0..3 {
            q.push(tm(i));
        }
        assert!(matches!(q.move_item(0, 2), Err(QueueError::InvalidIndex)));
        assert!(matches!(q.move_item(2, 0), Err(QueueError::InvalidIndex)));
        assert!(matches!(q.move_item(5, 2), Err(QueueError::InvalidIndex)));
    }

    #[test]
    fn move_valid_reorders_track() {
        let mut q = Queue::default();
        for i in 0..4 {
            q.push(tm(i));
        }
        // [t0, t1, t2, t3] -> move t2 (3) to position 2 => [t0, t2, t1, t3]
        q.move_item(3, 2).expect("move should succeed");
        let titles: Vec<_> = q.tracks.iter().map(|t| t.title.as_str()).collect();
        assert_eq!(titles, vec!["t0", "t2", "t1", "t3"]);
    }

    // skip
    #[test]
    fn skip_advances_to_next() {
        let mut q = Queue::default();
        for i in 0..2 {
            q.push(tm(i));
        }
        let next = q.skip().expect("should have next track");
        assert_eq!(next.title, "t1");
        assert_eq!(q.front().unwrap().title, "t1");
    }

    #[test]
    fn skip_on_single_track_empties_queue() {
        let mut q = Queue::default();
        q.push(tm(0));
        assert!(q.skip().is_none());
        assert!(q.front().is_none());
        assert!(q.is_empty());
    }

    // next_track
    #[test]
    fn next_track_advances_when_not_looping() {
        let mut q = Queue::default();
        for i in 0..2 {
            q.push(tm(i));
        }
        assert_eq!(q.front().unwrap().title, "t0");
        let n = q.next_track().expect("should have next track");
        assert_eq!(n.title, "t1");
        assert_eq!(q.front().unwrap().title, "t1");
    }

    #[test]
    fn next_track_keeps_current_when_looping() {
        let mut q = Queue::default();
        for i in 0..2 {
            q.push(tm(i));
        }
        // Make current be t1, then enable looping
        let _ = q.skip();
        q.set_looping(true);
        let n = q.next_track().expect("should keep current when looping");
        assert_eq!(n.title, "t1");
        assert_eq!(q.front().unwrap().title, "t1");
    }

    // shuffle
    #[test]
    fn shuffle_preserves_first() {
        let mut q = Queue::default();
        for i in 0..6 {
            q.push(tm(i));
        }
        let first = q.front().unwrap().title.clone();
        q.shuffle();
        assert_eq!(q.front().unwrap().title, first);
        assert_eq!(q.len(), 6);
    }

    #[test]
    fn shuffle_noop_for_len_leq_2() {
        // len == 1
        let mut q1 = Queue::default();
        q1.push(tm(0));
        q1.shuffle();
        assert_eq!(q1.front().unwrap().title, "t0");

        // len == 2
        let mut q2 = Queue::default();
        q2.push(tm(0));
        q2.push(tm(1));
        q2.shuffle();
        let titles: Vec<_> = q2.tracks.iter().map(|t| t.title.as_str()).collect();
        assert_eq!(titles, vec!["t0", "t1"]);
    }
}
