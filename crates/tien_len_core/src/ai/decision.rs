use crate::card::Card;
use crate::combination::{can_beat, can_chop, identify_combination, Combination, CombinationType};
use crate::hand_sorter::{find_all_candidate_combinations, PartitionStrategy, sort_smart_groups};
use crate::rules::GameSettlementRule;
use crate::state::PlayingTurnState;
use crate::ai::tracker::CardTracker;

/// Generates all valid candidate card combinations from the hand that can be legally played.
pub fn find_valid_moves(
    hand: &[Card],
    state: &PlayingTurnState,
) -> Vec<Combination> {
    let mut valid_moves = Vec::new();
    let candidates = find_all_candidate_combinations(hand);

    // Also include every single card as a valid combination
    let mut all_possibilities = candidates;
    for card in hand {
        if let Some(single) = identify_combination(&[card.clone()]) {
            all_possibilities.push(single);
        }
    }

    match state {
        PlayingTurnState::OpeningFirstMove { required_card, .. } => {
            for combo in all_possibilities {
                if combo.cards.iter().any(|c| c == required_card) {
                    valid_moves.push(combo);
                }
            }
        }
        PlayingTurnState::NormalLead { common } => {
            let prohibit_two_end = common.rules.game_flow.prohibit_ending_with_two;
            for combo in all_possibilities {
                if prohibit_two_end && hand.len() == combo.cards.len() {
                    if combo.highest_card.is_two()
                        || combo.combo_type == CombinationType::FourOfAKind
                        || combo.combo_type == CombinationType::ThreePairsSequential
                        || combo.combo_type == CombinationType::FourPairsSequential
                    {
                        continue; // Cannot finish with Two/Chop combo
                    }
                }
                valid_moves.push(combo);
            }
        }
        PlayingTurnState::Follow { leading_move, common } => {
            let allow_three_pairs = common.rules.chopping.allow_three_pairs_cut_two;
            let allow_quad_pairs = common.rules.chopping.allow_four_of_a_kind_cut_pairs_of_twos;

            for combo in all_possibilities {
                let beats = can_beat(&combo, &leading_move.combination);
                let chops = can_chop(
                    &combo,
                    &leading_move.combination,
                    allow_three_pairs,
                    allow_quad_pairs,
                );

                if beats || chops {
                    valid_moves.push(combo);
                }
            }
        }
    }

    valid_moves
}

/// Autonomous decision maker for bot AI
pub fn decide_bot_move(
    hand: &[Card],
    state: &PlayingTurnState,
    bot_id: &str,
    _tracker: &CardTracker,
) -> Option<Vec<Card>> {
    let valid_moves = find_valid_moves(hand, state);
    if valid_moves.is_empty() {
        return None;
    }

    let common = state.common();
    let rules = &common.rules;

    // Detect if next player has 1 card left
    let next_player_has_one_card = {
        let players = &common.players;
        let bot_idx = players.iter().position(|p| p.id == bot_id).unwrap_or(0);
        let next_idx = (bot_idx + 1) % players.len();
        players[next_idx].card_count == 1
    };

    match state {
        PlayingTurnState::OpeningFirstMove { .. } | PlayingTurnState::NormalLead { .. } => {
            // Leading turn: Must play a card
            if next_player_has_one_card {
                // Anti-leader intercept: Avoid playing singles, prefer combinations
                let non_singles: Vec<&Combination> = valid_moves
                    .iter()
                    .filter(|c| c.combo_type != CombinationType::Single)
                    .collect();

                if let Some(best_combo) = non_singles.first() {
                    return Some(best_combo.cards.clone());
                }

                // If only singles, play highest single card to block
                let mut singles: Vec<&Combination> = valid_moves
                    .iter()
                    .filter(|c| c.combo_type == CombinationType::Single)
                    .collect();
                singles.sort_by(|a, b| b.highest_card.cmp(&a.highest_card));
                if let Some(highest) = singles.first() {
                    return Some(highest.cards.clone());
                }
            }

            // Mode-specific leading policy
            match rules.settlement_rule {
                GameSettlementRule::CountCards => {
                    // Dumps longest combinations first to shed cards quickly
                    let mut sorted_moves = valid_moves;
                    sorted_moves.sort_by(|a, b| {
                        b.length
                            .cmp(&a.length)
                            .then_with(|| a.highest_card.cmp(&b.highest_card))
                    });
                    sorted_moves.first().map(|c| c.cards.clone())
                }
                GameSettlementRule::Traditional => {
                    // Smart partition: dump trash singles first, save high cards
                    let smart_groups = sort_smart_groups(hand, PartitionStrategy::OptimalTurns);
                    let trash_singles: Vec<&Card> = smart_groups
                        .iter()
                        .filter(|g| g.group_type == "SINGLE" && !g.cards[0].is_two())
                        .flat_map(|g| &g.cards)
                        .collect();

                    if let Some(trash) = trash_singles.first() {
                        if let Some(matched) = valid_moves
                            .iter()
                            .find(|c| c.combo_type == CombinationType::Single && c.cards[0].id == trash.id)
                        {
                            return Some(matched.cards.clone());
                        }
                    }

                    // Otherwise play smallest valid move
                    let mut sorted_moves = valid_moves;
                    sorted_moves.sort_by(|a, b| a.highest_card.cmp(&b.highest_card));
                    sorted_moves.first().map(|c| c.cards.clone())
                }
                GameSettlementRule::WinnerTakesAll => {
                    // Play aggressively for 1st place
                    let mut sorted_moves = valid_moves;
                    sorted_moves.sort_by(|a, b| {
                        b.length
                            .cmp(&a.length)
                            .then_with(|| a.highest_card.cmp(&b.highest_card))
                    });
                    sorted_moves.first().map(|c| c.cards.clone())
                }
            }
        }
        PlayingTurnState::Follow { leading_move, .. } => {
            // Following turn: Can beat, chop, or pass
            if next_player_has_one_card && leading_move.combination.combo_type == CombinationType::Single {
                // Must intercept: beat with highest card if possible
                let mut sorted_moves = valid_moves;
                sorted_moves.sort_by(|a, b| b.highest_card.cmp(&a.highest_card));
                return sorted_moves.first().map(|c| c.cards.clone());
            }

            // Normal follow: beat with the lowest possible winning combination
            let mut beats_moves: Vec<Combination> = valid_moves
                .into_iter()
                .filter(|c| can_beat(c, &leading_move.combination))
                .collect();

            if !beats_moves.is_empty() {
                beats_moves.sort_by(|a, b| a.highest_card.cmp(&b.highest_card));
                return beats_moves.first().map(|c| c.cards.clone());
            }

            // If we have a chop move, chop!
            // In Tien Len, chopping a 2 brings huge instant monetary/bet rewards
            let mut chop_moves: Vec<Combination> = find_valid_moves(hand, state)
                .into_iter()
                .filter(|c| {
                    can_chop(
                        c,
                        &leading_move.combination,
                        rules.chopping.allow_three_pairs_cut_two,
                        rules.chopping.allow_four_of_a_kind_cut_pairs_of_twos,
                    )
                })
                .collect();

            if !chop_moves.is_empty() {
                chop_moves.sort_by(|a, b| a.highest_card.cmp(&b.highest_card));
                return chop_moves.first().map(|c| c.cards.clone());
            }

            None
        }
    }
}
