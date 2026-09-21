use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use crate::card::Card;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchPlayer {
    pub id: String,
    pub name: String,
    pub avatar: String,
    pub hand: Vec<Card>,
    pub card_count: usize,
    pub played_cards: Vec<Card>,
    pub score: i64,
    pub is_passed_current_round: bool,
    pub has_played_first_card: bool,
    pub is_bot: bool,
    #[serde(default)]
    pub bot_persona_id: Option<String>,
}

impl MatchPlayer {
    pub fn new(id: impl Into<String>, name: impl Into<String>, avatar: impl Into<String>, score: i64, is_bot: bool) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            avatar: avatar.into(),
            hand: Vec::new(),
            card_count: 0,
            played_cards: Vec::new(),
            score,
            is_passed_current_round: false,
            has_played_first_card: false,
            is_bot,
            bot_persona_id: None,
        }
    }

    pub fn with_bot_persona(mut self, persona_id: impl Into<String>) -> Self {
        self.bot_persona_id = Some(persona_id.into());
        self.is_bot = true;
        self
    }
}

/// Pure deep clone of MatchPlayer
pub fn clone_player(p: &MatchPlayer) -> MatchPlayer {
    p.clone()
}

/// Pure update of player hand after playing a move or passing.
/// Ensures single-source of truth for cardCount, playedCards, and hand state without mutating input.
pub fn update_players_hand(
    players: &[MatchPlayer],
    player_id: &str,
    played_cards: &[Card],
    is_passed: bool,
) -> Vec<MatchPlayer> {
    let played_card_ids: HashSet<&str> = played_cards.iter().map(|c| c.id.as_str()).collect();

    players
        .iter()
        .map(|p| {
            if p.id != player_id {
                return p.clone();
            }

            let next_hand: Vec<Card> = p
                .hand
                .iter()
                .filter(|c| !played_card_ids.contains(c.id.as_str()))
                .cloned()
                .collect();

            let next_card_count = next_hand.len();

            let mut next_played = p.played_cards.clone();
            let existing_played_ids: HashSet<&str> =
                p.played_cards.iter().map(|c| c.id.as_str()).collect();

            for c in played_cards {
                if !existing_played_ids.contains(c.id.as_str()) {
                    next_played.push(c.clone());
                }
            }

            MatchPlayer {
                id: p.id.clone(),
                name: p.name.clone(),
                avatar: p.avatar.clone(),
                hand: next_hand,
                card_count: next_card_count,
                played_cards: next_played,
                score: p.score,
                is_passed_current_round: is_passed,
                has_played_first_card: p.has_played_first_card || !played_cards.is_empty(),
                is_bot: p.is_bot,
                bot_persona_id: p.bot_persona_id.clone(),
            }
        })
        .collect()
}

/// Resets all players for a brand new match round.
pub fn reset_players_for_new_game(players: &[MatchPlayer]) -> Vec<MatchPlayer> {
    players
        .iter()
        .map(|p| MatchPlayer {
            id: p.id.clone(),
            name: p.name.clone(),
            avatar: p.avatar.clone(),
            hand: Vec::new(),
            card_count: 0,
            played_cards: Vec::new(),
            score: p.score,
            is_passed_current_round: false,
            has_played_first_card: false,
            is_bot: p.is_bot,
            bot_persona_id: p.bot_persona_id.clone(),
        })
        .collect()
}

/// Masks opponent hands for zero-leak client perspective rendering.
pub fn mask_opponent_hands(players: &[MatchPlayer], viewing_player_id: &str) -> Vec<MatchPlayer> {
    players
        .iter()
        .map(|p| {
            if p.id == viewing_player_id {
                p.clone()
            } else {
                MatchPlayer {
                    id: p.id.clone(),
                    name: p.name.clone(),
                    avatar: p.avatar.clone(),
                    hand: Vec::new(), // Opponent cards masked
                    card_count: p.card_count, // Card count accurately retained
                    played_cards: p.played_cards.clone(),
                    score: p.score,
                    is_passed_current_round: p.is_passed_current_round,
                    has_played_first_card: p.has_played_first_card,
                    is_bot: p.is_bot,
                    bot_persona_id: p.bot_persona_id.clone(),
                }
            }
        })
        .collect()
}
