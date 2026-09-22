use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

use crate::card::{create_deck, sort_cards, Card};
use crate::combination::{can_beat, can_chop_standard, identify_combination, Combination};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MctsEvaluation {
    pub move_cards: Vec<Card>,
    pub combination: Combination,
    pub win_rate: f64,
    pub simulations_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MctsCandidateInput {
    pub cards: Vec<Card>,
    pub combination: Combination,
    #[serde(default)]
    pub is_chop: bool,
}

/// Simple fast Xorshift PRNG for non-cryptographic high-speed simulations
struct FastRng {
    state: u64,
}

impl FastRng {
    fn new(seed: u64) -> Self {
        Self {
            state: if seed == 0 { 0x853c49e6748fea9b } else { seed },
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

pub fn evaluate_candidate_moves_mcts(
    bot_id: &str,
    bot_hand: &[Card],
    candidate_moves: &[MctsCandidateInput],
    played_card_ids: &HashSet<String>,
    remaining_player_cards: &HashMap<String, usize>,
    simulations_count: usize,
    seed: u64,
) -> Vec<MctsEvaluation> {
    if candidate_moves.is_empty() || simulations_count == 0 {
        return Vec::new();
    }

    // 1. Nếu chỉ có 1 nước đi hợp lệ duy nhất, không cần giả lập
    if candidate_moves.len() == 1 {
        return vec![MctsEvaluation {
            move_cards: candidate_moves[0].cards.clone(),
            combination: candidate_moves[0].combination.clone(),
            win_rate: 0.5,
            simulations_count: 0,
        }];
    }

    // 2. Nếu có nước đi kết liễu toàn bộ bài trên tay, thắng 100%, trả về ngay
    if let Some(finishing) = candidate_moves.iter().find(|c| c.cards.len() == bot_hand.len()) {
        return vec![MctsEvaluation {
            move_cards: finishing.cards.clone(),
            combination: finishing.combination.clone(),
            win_rate: 1.0,
            simulations_count: 0,
        }];
    }

    let bot_hand_ids: HashSet<String> = bot_hand.iter().map(|c| c.id.clone()).collect();
    let full_deck = create_deck();
    let unseen_pool: Vec<Card> = full_deck
        .into_iter()
        .filter(|c| !played_card_ids.contains(&c.id) && !bot_hand_ids.contains(&c.id))
        .collect();

    let opponent_ids: Vec<String> = remaining_player_cards
        .iter()
        .filter(|(id, count)| id.as_str() != bot_id && **count > 0)
        .map(|(id, _)| id.clone())
        .collect();

    // Sort candidates: prefer multi-card combinations and lower weight
    let mut sorted_candidates = candidate_moves.to_vec();
    sorted_candidates.sort_by(|a, b| {
        if b.cards.len() != a.cards.len() {
            b.cards.len().cmp(&a.cards.len())
        } else {
            a.combination
                .highest_card
                .cmp(&b.combination.highest_card)
        }
    });

    let target_candidates: Vec<MctsCandidateInput> = if sorted_candidates.len() > 6 {
        sorted_candidates[..6].to_vec()
    } else {
        sorted_candidates
    };

    let sims = simulations_count.min(30);
    let mut win_counts = vec![0usize; target_candidates.len()];
    let mut rng = FastRng::new(seed ^ 0x9e3779b97f4a7c15);

    for _ in 0..sims {
        let mut shuffled = unseen_pool.clone();
        rng.shuffle(&mut shuffled);

        let mut simulated_hands: HashMap<String, Vec<Card>> = HashMap::new();
        let mut card_offset = 0;
        for opp_id in &opponent_ids {
            let needed = *remaining_player_cards.get(opp_id).unwrap_or(&0);
            let end = (card_offset + needed).min(shuffled.len());
            let mut opp_hand = shuffled[card_offset..end].to_vec();
            sort_cards(&mut opp_hand);
            simulated_hands.insert(opp_id.clone(), opp_hand);
            card_offset = end;
        }

        for (move_idx, candidate) in target_candidates.iter().enumerate() {
            let cand_ids: HashSet<&str> = candidate.cards.iter().map(|c| c.id.as_str()).collect();
            let bot_sim_hand: Vec<Card> = bot_hand
                .iter()
                .filter(|c| !cand_ids.contains(c.id.as_str()))
                .cloned()
                .collect();

            let mut sim_hands_copy = simulated_hands.clone();
            sim_hands_copy.insert(bot_id.to_string(), bot_sim_hand);

            let is_bot_win = simulate_fast_game(
                bot_id,
                &mut sim_hands_copy,
                &candidate.combination,
                &opponent_ids,
            );

            if is_bot_win {
                win_counts[move_idx] += 1;
            }
        }
    }

    target_candidates
        .into_iter()
        .enumerate()
        .map(|(idx, m)| MctsEvaluation {
            move_cards: m.cards,
            combination: m.combination,
            win_rate: (win_counts[idx] as f64) / (sims as f64),
            simulations_count: sims,
        })
        .collect()
}

/// Fast rollout game simulation until a winner is determined
fn simulate_fast_game(
    bot_id: &str,
    hands: &mut HashMap<String, Vec<Card>>,
    initial_lead_combo: &Combination,
    opponent_ids: &[String],
) -> bool {
    if hands.get(bot_id).map(|h| h.is_empty()).unwrap_or(true) {
        return true;
    }

    let mut all_players = vec![bot_id.to_string()];
    for id in opponent_ids {
        if hands.get(id).map(|h| !h.is_empty()).unwrap_or(false) {
            all_players.push(id.clone());
        }
    }

    if all_players.len() <= 1 {
        return true;
    }

    let mut current_combo: Option<Combination> = Some(initial_lead_combo.clone());
    let mut consecutive_passes: usize = 0;
    let max_steps: usize = 25;

    for step in 0..max_steps {
        let turn_idx = 1 + step;
        let active_player_id = &all_players[turn_idx % all_players.len()];
        let player_hand = match hands.get_mut(active_player_id) {
            Some(h) => h,
            None => return false,
        };

        if player_hand.is_empty() {
            return active_player_id == bot_id;
        }

        if consecutive_passes >= all_players.len() - 1 {
            current_combo = None;
            consecutive_passes = 0;
        }

        let mut chosen_cards: Option<Vec<Card>> = None;
        let mut new_combo: Option<Combination> = None;

        if let Some(target) = &current_combo {
            // Find smallest move that beats current combo
            // 1. Single
            if target.length == 1 {
                for c in player_hand.iter() {
                    let single_candidate = vec![c.clone()];
                    if let Some(combo) = identify_combination(&single_candidate)
                        && can_beat(&combo, target) {
                            chosen_cards = Some(single_candidate);
                            new_combo = Some(combo);
                            break;
                        }
                }
            } else if target.length == 2 {
                // 2. Pair
                for i in 0..player_hand.len().saturating_sub(1) {
                    if player_hand[i].rank == player_hand[i + 1].rank {
                        let pair_cand = vec![player_hand[i].clone(), player_hand[i + 1].clone()];
                        if let Some(combo) = identify_combination(&pair_cand)
                            && can_beat(&combo, target) {
                                chosen_cards = Some(pair_cand);
                                new_combo = Some(combo);
                                break;
                            }
                    }
                }
            } else {
                // 3. Higher combinations / straights
                let raw_subsets = crate::quick_response::generate_candidate_moves(player_hand);
                for sub in raw_subsets {
                    if let Some(combo) = identify_combination(&sub)
                        && (can_beat(&combo, target) || can_chop_standard(&combo, target)) {
                            chosen_cards = Some(sub);
                            new_combo = Some(combo);
                            break;
                        }
                }
            }
        } else {
            // Opening lead: find smallest pair, triple, straight or single
            let non_twos: Vec<Card> = player_hand.iter().filter(|c| !c.is_two()).cloned().collect();
            // Try pair
            for i in 0..non_twos.len().saturating_sub(1) {
                if non_twos[i].rank == non_twos[i + 1].rank {
                    let pair_cand = vec![non_twos[i].clone(), non_twos[i + 1].clone()];
                    if let Some(combo) = identify_combination(&pair_cand) {
                        chosen_cards = Some(pair_cand);
                        new_combo = Some(combo);
                        break;
                    }
                }
            }
            // If no pair, play smallest non-two single, else smallest card
            if chosen_cards.is_none() {
                let card_to_play = non_twos.first().unwrap_or(&player_hand[0]).clone();
                let single_cand = vec![card_to_play];
                new_combo = identify_combination(&single_cand);
                chosen_cards = Some(single_cand);
            }
        }

        if let (Some(cards), Some(combo)) = (chosen_cards, new_combo) {
            let card_ids: HashSet<&str> = cards.iter().map(|c| c.id.as_str()).collect();
            player_hand.retain(|c| !card_ids.contains(c.id.as_str()));

            if player_hand.is_empty() {
                return active_player_id == bot_id;
            }

            current_combo = Some(combo);
            consecutive_passes = 0;
        } else {
            consecutive_passes += 1;
        }
    }

    // Tie-break: player with fewest remaining cards wins
    let mut min_cards = hands.get(bot_id).map(|h| h.len()).unwrap_or(99);
    let mut best_player = bot_id;

    for opp_id in opponent_ids {
        if let Some(h) = hands.get(opp_id)
            && h.len() < min_cards {
                min_cards = h.len();
                best_player = opp_id;
            }
    }

    best_player == bot_id
}
