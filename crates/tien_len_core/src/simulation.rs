use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

use crate::ai::decision::decide_bot_move;
use crate::ai::tracker::CardTracker;
use crate::card::{create_deck, sort_cards, Card};
use crate::combination::Combination;
use crate::engine::{calculate_traditional_settlement, check_instant_win, validate_move};
use crate::player::MatchPlayer;
use crate::rules::GameRules;
use crate::state::{MatchState, PlayedMove, PlayingCommon, PlayingTurnState};

fn default_name() -> String {
    "Bot".into()
}

fn default_avatar() -> String {
    "🤖".into()
}

fn default_elo() -> u32 {
    1200
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulatedBotConfig {
    pub id: String,
    #[serde(default = "default_name")]
    pub name: String,
    #[serde(default = "default_avatar")]
    pub avatar: String,
    #[serde(default = "default_elo")]
    pub elo: u32,
    #[serde(default)]
    pub mcts_simulations: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableGroupInput {
    pub table_id: String,
    pub bet_amount: i64,
    pub bot_ids: Vec<String>,
    #[serde(default)]
    pub tier_num: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BotMatchResult {
    pub bot_id: String,
    pub rank: u32,
    pub delta_coins: i64,
    pub delta_elo: i32,
    pub had_cong: bool,
    pub had_thoi: bool,
    pub chops_count: u32,
    pub congs_given_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EcosystemNewsItem {
    pub id: String,
    pub timestamp: u64,
    #[serde(rename = "type")]
    pub news_type: String,
    pub message: String,
    #[serde(default)]
    pub bot_id: Option<String>,
    #[serde(default)]
    pub bot_name: Option<String>,
    #[serde(default)]
    pub avatar: Option<String>,
    #[serde(default)]
    pub amount: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulatedTableResult {
    pub id: String,
    pub table_id: String,
    pub timestamp: u64,
    pub bet_amount: i64,
    pub bot_results: Vec<BotMatchResult>,
    pub highlight_news: Vec<EcosystemNewsItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSimulationResult {
    pub table_results: Vec<SimulatedTableResult>,
    pub all_news: Vec<EcosystemNewsItem>,
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

            if let Some(_win_type) = check_instant_win(&hand, game_num == 1)
                && instant_winner.is_none() {
                    instant_winner = Some(bot.id.clone());
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

fn format_number_commas(n: i64) -> String {
    let s = n.abs().to_string();
    let mut result = String::new();
    let len = s.len();
    for (i, c) in s.chars().enumerate() {
        if i > 0 && (len - i).is_multiple_of(3) {
            result.push(',');
        }
        result.push(c);
    }
    if n < 0 {
        format!("-{}", result)
    } else {
        result
    }
}

fn get_next_active_player_id(
    players: &[MatchPlayer],
    hands: &HashMap<String, Vec<Card>>,
    from_player_id: &str,
) -> String {
    let num_players = players.len();
    let cur_idx = players.iter().position(|p| p.id == from_player_id).unwrap_or(0);
    for offset in 1..=num_players {
        let next_idx = (cur_idx + offset) % num_players;
        let p = &players[next_idx];
        if let Some(h) = hands.get(&p.id)
            && !h.is_empty() {
                return p.id.clone();
            }
    }
    from_player_id.to_string()
}

fn get_next_eligible_player_id(
    players: &[MatchPlayer],
    hands: &HashMap<String, Vec<Card>>,
    passed_ids: &HashSet<String>,
    from_player_id: &str,
) -> Option<String> {
    let num_players = players.len();
    let cur_idx = players.iter().position(|p| p.id == from_player_id).unwrap_or(0);
    for offset in 1..=num_players {
        let next_idx = (cur_idx + offset) % num_players;
        let p = &players[next_idx];
        if !passed_ids.contains(&p.id)
            && let Some(h) = hands.get(&p.id)
                && !h.is_empty() {
                    return Some(p.id.clone());
                }
    }
    None
}

/// Simulates a single 4-bot match on a table with Traditional Tien Len rules,
/// calculating rank (1..4), zero-sum delta_coins (including cóng & thối),
/// esports delta_elo, and highlight news (BANKRUPTCY, BIG_WIN).
pub fn simulate_single_table(
    table: &TableGroupInput,
    bots: &HashMap<String, SimulatedBotConfig>,
    seed: u64,
    timestamp: u64,
) -> SimulatedTableResult {
    let mut table_bots = Vec::new();
    for id in &table.bot_ids {
        if let Some(b) = bots.get(id) {
            table_bots.push(b.clone());
        } else {
            table_bots.push(SimulatedBotConfig {
                id: id.clone(),
                name: "Bot".into(),
                avatar: "🤖".into(),
                elo: 1000,
                mcts_simulations: 0,
            });
        }
    }

    if table_bots.len() < 4 {
        return SimulatedTableResult {
            id: format!("sim_tbl_{}_skipped", table.table_id),
            table_id: table.table_id.clone(),
            timestamp,
            bet_amount: table.bet_amount,
            bot_results: Vec::new(),
            highlight_news: Vec::new(),
        };
    }

    let mut rng = SimRng::new(seed);
    let mut deck = create_deck();
    rng.shuffle(&mut deck);

    let mut hands: HashMap<String, Vec<Card>> = HashMap::new();
    let mut players: Vec<MatchPlayer> = Vec::new();
    let mut instant_winner: Option<String> = None;

    for (idx, bot) in table_bots.iter().take(4).enumerate() {
        let start = idx * 13;
        let end = (start + 13).min(deck.len());
        let mut hand = deck[start..end].to_vec();
        sort_cards(&mut hand);

        if check_instant_win(&hand, true).is_some() && instant_winner.is_none() {
            instant_winner = Some(bot.id.clone());
        }

        let mut p = MatchPlayer::new(&bot.id, &bot.name, &bot.avatar, 0, true);
        p.card_count = hand.len();
        p.hand = hand.clone();
        players.push(p);
        hands.insert(bot.id.clone(), hand);
    }

    let mut rank_order: Vec<String> = Vec::new();
    let mut is_three_spades_win = false;
    let mut payouts: HashMap<String, i64> = HashMap::new();

    if let Some(winner_id) = instant_winner {
        rank_order.push(winner_id.clone());
        for bot in &table_bots {
            if bot.id != winner_id {
                rank_order.push(bot.id.clone());
            }
        }
        let penalty = 26 * table.bet_amount;
        let total_win = penalty * 3;
        payouts.insert(winner_id.clone(), total_win);
        for bot in &table_bots {
            if bot.id != winner_id {
                payouts.insert(bot.id.clone(), -penalty);
            }
        }
    } else {
        // Find starter: player with 3-SPADES
        let starter_id = hands
            .iter()
            .find(|(_, h)| h.iter().any(|c| c.id == "3-SPADES"))
            .map(|(id, _)| id.clone())
            .unwrap_or_else(|| table_bots[0].id.clone());

        let mut current_turn_id = starter_id.clone();
        let mut lead_player_id = starter_id;
        let mut leading_move: Option<PlayedMove> = None;
        let mut last_mover_id: Option<String> = None;
        let mut passed_ids: HashSet<String> = HashSet::new();
        let mut loop_count = 0;
        let max_loops = 200;
        let tracker = CardTracker::new();
        let rules = GameRules::traditional();

        while rank_order.len() < 3 && loop_count < max_loops {
            loop_count += 1;

            let current_player_hand = hands.get(&current_turn_id).cloned().unwrap_or_default();
            if current_player_hand.is_empty() {
                current_turn_id = get_next_active_player_id(&players, &hands, &current_turn_id);
                continue;
            }

            let is_lead = leading_move.is_none();

            // Sync players hand and card_count
            for p in players.iter_mut() {
                if let Some(h) = hands.get(&p.id) {
                    p.card_count = h.len();
                    p.hand = h.clone();
                }
            }

            let common = PlayingCommon {
                game_number: 1,
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
            } else if loop_count == 1 {
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

            let mut played_valid = false;
            let mut played_combo: Option<Combination> = None;

            if let Some(cards) = chosen_cards {
                let card_ids: Vec<&str> = cards.iter().map(|c| c.id.as_str()).collect();
                let match_state = MatchState::Playing(turn_state);
                if let Ok(combo) = validate_move(&match_state, &current_turn_id, &card_ids) {
                    played_valid = true;
                    played_combo = Some(combo);
                }
            }

            if played_valid {
                let combo = played_combo.unwrap();
                let card_id_set: HashSet<&str> = combo.cards.iter().map(|c| c.id.as_str()).collect();
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

                if rank_order.is_empty() && hand_len == 0 && combo.cards.len() == 1 && combo.cards[0].id == "3-SPADES" && loop_count > 1 {
                    is_three_spades_win = true;
                }

                last_mover_id = Some(current_turn_id.clone());
                leading_move = Some(PlayedMove::standard(&current_turn_id, combo, 0));

                if hand_len == 0 {
                    rank_order.push(current_turn_id.clone());
                    if rank_order.len() == 3 {
                        if let Some(last_p) = players.iter().find(|p| !rank_order.contains(&p.id)) {
                            rank_order.push(last_p.id.clone());
                        }
                        break;
                    }
                }
            } else if is_lead {
                // Fallback lead: play lowest single card
                if let Some(first_card) = current_player_hand.first() {
                    let card_id = first_card.id.clone();
                    let new_hand = current_player_hand[1..].to_vec();
                    let hand_len = new_hand.len();
                    hands.insert(current_turn_id.clone(), new_hand.clone());

                    if let Some(p) = players.iter_mut().find(|p| p.id == current_turn_id) {
                        p.card_count = hand_len;
                        p.hand = new_hand;
                        p.has_played_first_card = true;
                    }

                    if rank_order.is_empty() && hand_len == 0 && card_id == "3-SPADES" && loop_count > 1 {
                        is_three_spades_win = true;
                    }

                    last_mover_id = Some(current_turn_id.clone());
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

                    if hand_len == 0 {
                        rank_order.push(current_turn_id.clone());
                        if rank_order.len() == 3 {
                            if let Some(last_p) = players.iter().find(|p| !rank_order.contains(&p.id)) {
                                rank_order.push(last_p.id.clone());
                            }
                            break;
                        }
                    }
                }
            } else {
                passed_ids.insert(current_turn_id.clone());
            }

            // Check if trick is cleared: all other players who still have cards have passed
            let other_active_remaining = players
                .iter()
                .filter(|p| {
                    p.id != last_mover_id.as_deref().unwrap_or("")
                        && hands.get(&p.id).map(|h| !h.is_empty()).unwrap_or(false)
                        && !passed_ids.contains(&p.id)
                })
                .count();

            if other_active_remaining == 0 && leading_move.is_some() {
                // Trick cleared!
                passed_ids.clear();
                leading_move = None;
                let next_lead = if let Some(ref lmid) = last_mover_id {
                    if hands.get(lmid).map(|h| !h.is_empty()).unwrap_or(false) {
                        lmid.clone()
                    } else {
                        get_next_active_player_id(&players, &hands, lmid)
                    }
                } else {
                    get_next_active_player_id(&players, &hands, &current_turn_id)
                };
                lead_player_id = next_lead.clone();
                current_turn_id = next_lead;
            } else if let Some(next_id) = get_next_eligible_player_id(&players, &hands, &passed_ids, &current_turn_id) {
                current_turn_id = next_id;
            } else {
                // Trick fallback: clear trick
                passed_ids.clear();
                leading_move = None;
                let next_lead = if let Some(ref lmid) = last_mover_id {
                    if hands.get(lmid).map(|h| !h.is_empty()).unwrap_or(false) {
                        lmid.clone()
                    } else {
                        get_next_active_player_id(&players, &hands, lmid)
                    }
                } else {
                    get_next_active_player_id(&players, &hands, &current_turn_id)
                };
                lead_player_id = next_lead.clone();
                current_turn_id = next_lead;
            }
        }

        // Add any remaining players to rank_order
        if rank_order.len() < 4 {
            let mut remaining: Vec<MatchPlayer> = players
                .iter()
                .filter(|p| !rank_order.contains(&p.id))
                .cloned()
                .collect();
            remaining.sort_by_key(|p| hands.get(&p.id).map(|h| h.len()).unwrap_or(0));
            for p in remaining {
                rank_order.push(p.id);
            }
        }

        // Sync remaining hands into players for settlement
        for p in players.iter_mut() {
            if let Some(h) = hands.get(&p.id) {
                p.card_count = h.len();
                p.hand = h.clone();
            }
        }

        let winner_match_players: Vec<MatchPlayer> = rank_order
            .iter()
            .filter_map(|wid| players.iter().find(|p| &p.id == wid).cloned())
            .collect();

        payouts = calculate_traditional_settlement(
            &players,
            &winner_match_players,
            table.bet_amount,
            1.0,
            is_three_spades_win,
            1.0,
        )
        .unwrap_or_default();
    }

    let mut highlight_news = Vec::new();
    let mut bot_results = Vec::new();

    for (i, bot_id) in rank_order.iter().enumerate() {
        let rank = (i + 1) as u32;
        let bot = table_bots.iter().find(|b| &b.id == bot_id);
        let bot_name = bot.map(|b| b.name.as_str()).unwrap_or("Bot");
        let bot_avatar = bot.map(|b| b.avatar.as_str()).unwrap_or("🤖");

        let delta_elo: i32 = match rank {
            1 => (rng.next_u32() % 9) as i32 + 24,
            2 => (rng.next_u32() % 5) as i32 + 8,
            3 => -(((rng.next_u32() % 5) as i32) + 8),
            _ => -(((rng.next_u32() % 9) as i32) + 24),
        };

        let delta_coins = payouts.get(bot_id).copied().unwrap_or(0);
        let hand = hands.get(bot_id).cloned().unwrap_or_default();
        let had_cong = rank == 4 && hand.len() == 13;
        let had_thoi = hand.iter().any(|c| c.rank == 15);

        bot_results.push(BotMatchResult {
            bot_id: bot_id.clone(),
            rank,
            delta_coins,
            delta_elo,
            had_cong,
            had_thoi,
            chops_count: 0,
            congs_given_count: 0,
        });

        if had_cong {
            let abs_loss = delta_coins.abs();
            highlight_news.push(EcosystemNewsItem {
                id: format!("news_cong_{}_{}", bot_id, timestamp),
                timestamp,
                news_type: "BANKRUPTCY".to_string(),
                message: format!(
                    "😱 {} bị CÓNG (cháy bài) ở bàn {} xu, mất {} xu!",
                    bot_name,
                    format_number_commas(table.bet_amount),
                    format_number_commas(abs_loss)
                ),
                bot_id: Some(bot_id.clone()),
                bot_name: Some(bot_name.to_string()),
                avatar: Some(bot_avatar.to_string()),
                amount: Some(abs_loss),
            });
        } else if rank == 1 && delta_coins >= 20000 {
            highlight_news.push(EcosystemNewsItem {
                id: format!("news_win_{}_{}", bot_id, timestamp),
                timestamp,
                news_type: "BIG_WIN".to_string(),
                message: format!(
                    "💰 {} thắng giòn giã ở bàn {} xu, ẵm trọn +{} xu!",
                    bot_name,
                    format_number_commas(table.bet_amount),
                    format_number_commas(delta_coins)
                ),
                bot_id: Some(bot_id.clone()),
                bot_name: Some(bot_name.to_string()),
                avatar: Some(bot_avatar.to_string()),
                amount: Some(delta_coins),
            });
        }
    }

    SimulatedTableResult {
        id: format!("sim_tbl_{}_{}", table.table_id, timestamp),
        table_id: table.table_id.clone(),
        timestamp,
        bet_amount: table.bet_amount,
        bot_results,
        highlight_news,
    }
}

/// Simulates a batch of tables concurrently/sequentially in Rust native
pub fn simulate_tables_batch(
    tables: &[TableGroupInput],
    bots: &HashMap<String, SimulatedBotConfig>,
    base_seed: u64,
    timestamp: u64,
) -> BatchSimulationResult {
    let mut table_results = Vec::with_capacity(tables.len());
    let mut all_news = Vec::new();

    for (i, table) in tables.iter().enumerate() {
        let table_seed = base_seed.wrapping_add((i as u64).wrapping_mul(12345)).wrapping_add(6789);
        let result = simulate_single_table(table, bots, table_seed, timestamp);
        if !result.highlight_news.is_empty() {
            all_news.extend(result.highlight_news.clone());
        }
        table_results.push(result);
    }

    BatchSimulationResult {
        table_results,
        all_news,
    }
}
