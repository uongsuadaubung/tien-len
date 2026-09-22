use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

use crate::ai::decision::decide_bot_move;
use crate::ai::tracker::CardTracker;
use crate::card::{create_deck, sort_cards, Card};
use crate::combination::Combination;
use crate::engine::{check_instant_win, validate_move};
use crate::player::MatchPlayer;
use crate::rules::GameRules;
use crate::state::{MatchState, PlayedMove, PlayingCommon, PlayingTurnState};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulatedBotConfig {
    pub id: String,
    pub name: String,
    #[serde(default = "default_avatar")]
    pub avatar: String,
    #[serde(default = "default_elo")]
    pub elo: u32,
    #[serde(default)]
    pub mcts_simulations: usize,
}

fn default_avatar() -> String {
    "🤖".into()
}

fn default_elo() -> u32 {
    1200
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchSeriesResult {
    pub num_games: usize,
    pub win_counts: HashMap<String, usize>,
    pub win_rates: HashMap<String, f64>,
    pub instant_wins: usize,
    pub total_turns: usize,
    pub duration_ms: f64,
}

/// Simple fast Xorshift PRNG for simulation reproducibility
struct SimRng {
    state: u64,
}

impl SimRng {
    fn new(seed: u64) -> Self {
        Self {
            state: if seed == 0 { 0x4d595df4d0f33173 } else { seed },
        }
    }

    fn next_u32(&mut self) -> u32 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        (x & 0xFFFFFFFF) as u32
    }

    fn shuffle<T>(&mut self, slice: &mut [T]) {
        for i in (1..slice.len()).rev() {
            let j = (self.next_u32() as usize) % (i + 1);
            slice.swap(i, j);
        }
    }
}

/// Simulates a series of N full games between 4 bots natively in Rust
pub fn simulate_match_series(
    num_games: usize,
    base_seed: u64,
    rules: &GameRules,
    bots: &[SimulatedBotConfig],
    rotate_seats: bool,
) -> MatchSeriesResult {
    #[cfg(not(target_arch = "wasm32"))]
    let start_instant = std::time::Instant::now();
    let mut win_counts: HashMap<String, usize> = HashMap::new();
    for bot in bots {
        win_counts.insert(bot.id.clone(), 0);
    }

    let mut instant_wins = 0;
    let mut total_turns = 0;
    let num_players = bots.len().min(4);

    let mut previous_winner_id: Option<String> = None;

    for i in 0..num_games {
        let game_num = (i + 1) as u32;
        let seed = base_seed.wrapping_add((i as u64).wrapping_mul(3001)).wrapping_add(99999);
        let mut rng = SimRng::new(seed);

        // Seat rotation
        let seat_offset = if rotate_seats { i % num_players } else { 0 };
        let rotated_bots: Vec<SimulatedBotConfig> = (0..num_players)
            .map(|idx| bots[(seat_offset + idx) % num_players].clone())
            .collect();

        // 1. Create deck & shuffle
        let mut deck = create_deck();
        rng.shuffle(&mut deck);

        // 2. Deal 13 cards to each player
        let mut hands: HashMap<String, Vec<Card>> = HashMap::new();
        let mut instant_winner: Option<String> = None;

        for (idx, bot) in rotated_bots.iter().enumerate() {
            let start = idx * 13;
            let end = (start + 13).min(deck.len());
            let mut hand = deck[start..end].to_vec();
            sort_cards(&mut hand);

            if let Some(_win_type) = check_instant_win(&hand, game_num == 1) {
                if instant_winner.is_none() {
                    instant_winner = Some(bot.id.clone());
                }
            }
            hands.insert(bot.id.clone(), hand);
        }

        if let Some(winner_id) = instant_winner {
            instant_wins += 1;
            *win_counts.entry(winner_id.clone()).or_insert(0) += 1;
            previous_winner_id = Some(winner_id);
            continue;
        }

        // 3. Determine starter
        let starter_id = if game_num == 1 || previous_winner_id.is_none() {
            // Find 3 of Spades
            hands
                .iter()
                .find(|(_, h)| h.iter().any(|c| c.id == "3-SPADES"))
                .map(|(id, _)| id.clone())
                .unwrap_or_else(|| rotated_bots[0].id.clone())
        } else {
            previous_winner_id.clone().unwrap()
        };

        // 4. Play game loop
        let mut players: Vec<MatchPlayer> = rotated_bots
            .iter()
            .map(|b| {
                let mut p = MatchPlayer::new(&b.id, &b.name, &b.avatar, 0, true);
                p.card_count = 13;
                p.hand = hands.get(&b.id).cloned().unwrap_or_default();
                p
            })
            .collect();

        let mut current_turn_id = starter_id.clone();
        let mut lead_player_id = starter_id;
        let mut leading_move: Option<PlayedMove> = None;
        let mut passed_ids: HashSet<String> = HashSet::new();
        let mut loop_count = 0;
        let max_loops = 300;

        let tracker = CardTracker::new();

        while loop_count < max_loops {
            loop_count += 1;
            total_turns += 1;

            let current_player_hand = hands.get(&current_turn_id).cloned().unwrap_or_default();
            let is_lead = leading_move.is_none();

            // Build PlayingTurnState for decision making
            let common = PlayingCommon {
                game_number: game_num,
                round_number: 1,
                players: players.clone(),
                current_turn_player_id: current_turn_id.clone(),
                lead_player_id: lead_player_id.clone(),
                round_moves: Vec::new(),
                passed_player_ids: passed_ids.iter().cloned().collect(),
                rules: rules.clone(),
            };

            let turn_state = if let Some(ref lm) = leading_move {
                PlayingTurnState::Follow {
                    common,
                    leading_move: lm.clone(),
                }
            } else if game_num == 1 && total_turns == 1 {
                let req_card = Card::new(3, crate::card::Suit::Spades);
                PlayingTurnState::OpeningFirstMove {
                    common,
                    required_card: req_card,
                }
            } else {
                PlayingTurnState::NormalLead { common }
            };

            let chosen_cards = decide_bot_move(
                &current_player_hand,
                &turn_state,
                &current_turn_id,
                &tracker,
            );

            if let Some(cards) = chosen_cards {
                let card_ids: Vec<&str> = cards.iter().map(|c| c.id.as_str()).collect();
                let match_state = MatchState::Playing(turn_state);
                let valid_combo = validate_move(&match_state, &current_turn_id, &card_ids);

                if let Ok(combo) = valid_combo {
                    // Update hand
                    let card_id_set: HashSet<&str> = card_ids.iter().copied().collect();
                    let new_hand: Vec<Card> = current_player_hand
                        .into_iter()
                        .filter(|c| !card_id_set.contains(c.id.as_str()))
                        .collect();

                    let hand_len = new_hand.len();
                    hands.insert(current_turn_id.clone(), new_hand.clone());

                    if let Some(p) = players.iter_mut().find(|p| p.id == current_turn_id) {
                        p.card_count = hand_len;
                        p.hand = new_hand;
                        p.has_played_first_card = true;
                    }

                    // Check win condition
                    if hand_len == 0 {
                        *win_counts.entry(current_turn_id.clone()).or_insert(0) += 1;
                        previous_winner_id = Some(current_turn_id.clone());
                        break;
                    }

                    leading_move = Some(PlayedMove::standard(&current_turn_id, combo, 0));
                } else if is_lead {
                    // Fallback lead: play smallest single
                    if let Some(first_card) = current_player_hand.first() {
                        let new_hand = current_player_hand[1..].to_vec();
                        let hand_len = new_hand.len();
                        hands.insert(current_turn_id.clone(), new_hand.clone());

                        if let Some(p) = players.iter_mut().find(|p| p.id == current_turn_id) {
                            p.card_count = hand_len;
                            p.hand = new_hand;
                            p.has_played_first_card = true;
                        }

                        if hand_len == 0 {
                            *win_counts.entry(current_turn_id.clone()).or_insert(0) += 1;
                            previous_winner_id = Some(current_turn_id.clone());
                            break;
                        }

                        leading_move = Some(PlayedMove::standard(
                            &current_turn_id,
                            Combination {
                                combo_type: crate::combination::CombinationType::Single,
                                cards: vec![first_card.clone()],
                                highest_card: first_card.clone(),
                                length: 1,
                            },
                            0,
                        ));
                    }
                } else {
                    // Pass turn
                    passed_ids.insert(current_turn_id.clone());
                }
            } else if is_lead {
                // Must play when lead
                if let Some(first_card) = current_player_hand.first() {
                    let new_hand = current_player_hand[1..].to_vec();
                    let hand_len = new_hand.len();
                    hands.insert(current_turn_id.clone(), new_hand.clone());

                    if let Some(p) = players.iter_mut().find(|p| p.id == current_turn_id) {
                        p.card_count = hand_len;
                        p.hand = new_hand;
                        p.has_played_first_card = true;
                    }

                    if hand_len == 0 {
                        *win_counts.entry(current_turn_id.clone()).or_insert(0) += 1;
                        previous_winner_id = Some(current_turn_id.clone());
                        break;
                    }

                    leading_move = Some(PlayedMove::standard(
                        &current_turn_id,
                        Combination {
                            combo_type: crate::combination::CombinationType::Single,
                            cards: vec![first_card.clone()],
                            highest_card: first_card.clone(),
                            length: 1,
                        },
                        0,
                    ));
                }
            } else {
                passed_ids.insert(current_turn_id.clone());
            }

            // Check if trick is cleared (all other players with cards passed)
            let active_other_players: Vec<&MatchPlayer> = players
                .iter()
                .filter(|p| p.id != current_turn_id && p.card_count > 0)
                .collect();

            let all_others_passed = active_other_players
                .iter()
                .all(|p| passed_ids.contains(&p.id));

            if all_others_passed && leading_move.is_some() {
                // New trick starts
                lead_player_id = current_turn_id.clone();
                leading_move = None;
                passed_ids.clear();
            } else {
                // Advance turn to next active player
                let cur_idx = players.iter().position(|p| p.id == current_turn_id).unwrap_or(0);
                let mut next_idx = (cur_idx + 1) % players.len();
                let mut attempts = 0;
                while attempts < players.len() {
                    let candidate = &players[next_idx];
                    if candidate.card_count > 0 && !passed_ids.contains(&candidate.id) {
                        break;
                    }
                    next_idx = (next_idx + 1) % players.len();
                    attempts += 1;
                }
                current_turn_id = players[next_idx].id.clone();
            }
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    let duration_ms = start_instant.elapsed().as_secs_f64() * 1000.0;
    #[cfg(target_arch = "wasm32")]
    let duration_ms = 0.0;
    let mut win_rates = HashMap::new();
    for (id, &cnt) in &win_counts {
        win_rates.insert(id.clone(), (cnt as f64) / (num_games as f64));
    }

    MatchSeriesResult {
        num_games,
        win_counts,
        win_rates,
        instant_wins,
        total_turns,
        duration_ms,
    }
}
