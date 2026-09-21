use std::collections::HashSet;
use crate::card::{create_deck, Card};

#[derive(Debug, Clone)]
pub struct CardTracker {
    pub played_cards: Vec<Card>,
    played_card_ids: HashSet<String>,
}

impl CardTracker {
    pub fn new() -> Self {
        Self {
            played_cards: Vec::new(),
            played_card_ids: HashSet::new(),
        }
    }

    pub fn record_move(&mut self, cards: &[Card]) {
        for card in cards {
            if !self.played_card_ids.contains(&card.id) {
                self.played_card_ids.insert(card.id.clone());
                self.played_cards.push(card.clone());
            }
        }
    }

    /// Computes cards that have not been played and are not in the given player hand
    pub fn get_unseen_cards(&self, my_hand: &[Card]) -> Vec<Card> {
        let my_card_ids: HashSet<&str> = my_hand.iter().map(|c| c.id.as_str()).collect();
        create_deck()
            .into_iter()
            .filter(|c| !self.played_card_ids.contains(&c.id) && !my_card_ids.contains(c.id.as_str()))
            .collect()
    }

    /// Count how many 2s (heo) are still unaccounted for
    pub fn count_unseen_twos(&self, my_hand: &[Card]) -> usize {
        self.get_unseen_cards(my_hand)
            .into_iter()
            .filter(|c| c.is_two())
            .count()
    }
}

impl Default for CardTracker {
    fn default() -> Self {
        Self::new()
    }
}
