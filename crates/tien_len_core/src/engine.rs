use rand::seq::SliceRandom;
use rand::thread_rng;
use std::collections::{HashMap, HashSet};

use crate::card::{create_deck, sort_cards, Card, Suit};
use crate::combination::{can_beat, can_chop, identify_combination, Combination, CombinationType};
use crate::player::{reset_players_for_new_game, update_players_hand, MatchPlayer};
use crate::rules::{GameRules, GameSettlementRule};
use crate::state::{
    InstantWinType, MatchState, PlayedMove, PlayerRanking, PlayingCommon, PlayingTurnState,
};

/// Check if a 12-13 card hand qualifies for Instant Win (Tới Trắng)
pub fn check_instant_win(hand: &[Card], is_first_game: bool) -> Option<InstantWinType> {
    if hand.len() < 12 {
        return None;
    }

    let mut sorted = hand.to_vec();
    sort_cards(&mut sorted);

    // 1. Tứ quý 3 ở ván đầu tiên
    if is_first_game {
        let threes_count = sorted.iter().filter(|c| c.rank == 3).count();
        if threes_count == 4 {
            return Some(InstantWinType::FirstRoundFourThrees);
        }
    }

    // 2. Tứ quý 2 (4 con heo)
    let twos_count = sorted.iter().filter(|c| c.rank == 15).count();
    if twos_count == 4 {
        return Some(InstantWinType::FourTwos);
    }

    // 3. Sảnh Rồng (Dãy liên tiếp từ 3 tới A = 12 lá hoặc 3 tới 2 = 13 lá)
    let unique_ranks: HashSet<u8> = sorted.iter().map(|c| c.rank).collect();
    let has_dragon_3_to_ace = (3..=14).all(|r| unique_ranks.contains(&r));
    if has_dragon_3_to_ace {
        return Some(InstantWinType::DragonStraight);
    }

    // 4. 13 lá đồng màu (toàn đỏ hoặc toàn đen)
    if sorted.len() == 13 {
        let all_red = sorted.iter().all(|c| c.suit.is_red());
        let all_black = sorted.iter().all(|c| c.suit.is_black());
        if all_red || all_black {
            return Some(InstantWinType::SameColor13);
        }
    }

    // Đếm số lượng theo rank
    let mut rank_counts = HashMap::new();
    for card in &sorted {
        *rank_counts.entry(card.rank).or_insert(0) += 1;
    }

    let mut pair_ranks = Vec::new();
    for (&rank, &count) in &rank_counts {
        if count >= 2 {
            pair_ranks.push(rank);
        }
        if count == 4 {
            pair_ranks.push(rank); // Tứ quý tính là 2 đôi
        }
    }

    // 5. 5 Đôi Thông (5 đôi liên tiếp, không tính đôi 2)
    let mut non_two_pair_ranks: Vec<u8> = pair_ranks
        .iter()
        .copied()
        .filter(|&r| r < 15)
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();
    non_two_pair_ranks.sort_unstable();

    let mut max_consecutive = 1;
    let mut current_consecutive = 1;
    for i in 0..non_two_pair_ranks.len().saturating_sub(1) {
        if non_two_pair_ranks[i + 1] == non_two_pair_ranks[i] + 1 {
            current_consecutive += 1;
            max_consecutive = max_consecutive.max(current_consecutive);
        } else {
            current_consecutive = 1;
        }
    }
    if max_consecutive >= 5 {
        return Some(InstantWinType::FivePairsSequential);
    }

    // 6. 6 Đôi bất kỳ
    if pair_ranks.len() >= 6 {
        return Some(InstantWinType::SixPairs);
    }

    None
}

/// Calculate chop penalty when a Two or Sequential Pair is cut
pub fn calculate_chop_penalty(
    target: &Combination,
    _candidate: &Combination,
    bet_amount: i64,
    multiplier: f64,
) -> i64 {
    let mult = multiplier.max(1.0);
    let bet = bet_amount as f64;

    let base_amount = match target.combo_type {
        CombinationType::Single if target.highest_card.is_two() => {
            if target.highest_card.suit.is_red() {
                bet * 2.0
            } else {
                bet * 1.0
            }
        }
        CombinationType::Pair if target.highest_card.is_two() => {
            let red_count = target.cards.iter().filter(|c| c.suit.is_red()).count();
            match red_count {
                2 => bet * 4.0,
                1 => bet * 3.0,
                _ => bet * 2.0,
            }
        }
        CombinationType::ThreePairsSequential => bet * 3.0,
        CombinationType::FourOfAKind => bet * 4.0,
        CombinationType::FourPairsSequential => bet * 6.0,
        _ => bet,
    };

    (base_amount * mult).round() as i64
}

/// Calculate penalty for unplayed Twos or Special combinations at game over (Thối Heo/Hàng)
pub fn calculate_rotten_penalty(hand: &[Card], bet_amount: i64, multiplier: f64) -> i64 {
    let mult = multiplier.max(1.0);
    let bet = bet_amount as f64;
    let mut penalty = 0.0;

    for card in hand {
        if card.is_two() {
            penalty += if card.suit.is_red() {
                bet * 2.0
            } else {
                bet * 1.0
            };
        }
    }

    // 2. Thối Tứ Quý (rank < 15)
    let mut rank_counts = std::collections::HashMap::new();
    for card in hand {
        *rank_counts.entry(card.rank).or_insert(0) += 1;
    }
    for (&rank, &count) in &rank_counts {
        if count == 4 && rank < 15 {
            penalty += bet * 4.0;
        }
    }

    (penalty * mult).round() as i64
}

/// Tính toán tiền phạt Cóng (Cháy bài): 26 x bet x cong_multiplier
pub fn calculate_cong_penalty(bet_amount: i64, cong_multiplier: f64) -> i64 {
    let mult = cong_multiplier.max(1.0);
    ((26.0 * bet_amount as f64) * mult).round() as i64
}

/// Tính toán kết quả cho chế độ Đếm Lá (Card-Count / Sát Phạt)
pub fn calculate_count_cards_settlement(
    players: &[MatchPlayer],
    winner_id: &str,
    bet_amount: i64,
    penalty_multiplier: f64,
    is_three_spades_win: bool,
    cong_multiplier: f64,
) -> Result<std::collections::HashMap<String, i64>, String> {
    if players.is_empty() {
        return Err("players list cannot be empty".to_string());
    }
    if !players.iter().any(|p| p.id == winner_id) {
        return Err(format!("winnerId \"{}\" must exist in players", winner_id));
    }
    if bet_amount < 0 {
        return Err("betAmount cannot be negative".to_string());
    }

    let mut payouts = std::collections::HashMap::new();
    for p in players {
        payouts.insert(p.id.clone(), 0i64);
    }

    let mult = penalty_multiplier.max(1.0);
    let three_spades_multiplier = if is_three_spades_win { 2 } else { 1 };
    let mut total_winner_earn = 0i64;

    for player in players {
        if player.id != winner_id {
            let mut loss_amount = 0i64;
            if player.hand.len() == 13 && !player.has_played_first_card {
                loss_amount += calculate_cong_penalty(bet_amount, cong_multiplier);
            } else {
                loss_amount += player.hand.len() as i64 * bet_amount;
            }

            let rotten = calculate_rotten_penalty(&player.hand, bet_amount, mult);
            loss_amount += rotten;
            loss_amount *= three_spades_multiplier;

            payouts.insert(player.id.clone(), -loss_amount);
            total_winner_earn += loss_amount;
        }
    }

    payouts.insert(winner_id.to_string(), total_winner_earn);
    Ok(payouts)
}

/// Tính toán kết quả cho chế độ Nhất Ăn Tất (Winner-Takes-All)
pub fn calculate_winner_takes_all_settlement(
    players: &[MatchPlayer],
    winner_id: &str,
    bet_amount: i64,
    penalty_multiplier: f64,
    is_three_spades_win: bool,
    cong_multiplier: f64,
) -> Result<std::collections::HashMap<String, i64>, String> {
    if players.is_empty() {
        return Err("players list cannot be empty".to_string());
    }
    if !players.iter().any(|p| p.id == winner_id) {
        return Err(format!("winnerId \"{}\" must exist in players", winner_id));
    }
    if bet_amount < 0 {
        return Err("betAmount cannot be negative".to_string());
    }

    let mut payouts = std::collections::HashMap::new();
    for p in players {
        payouts.insert(p.id.clone(), 0i64);
    }

    let mult = penalty_multiplier.max(1.0);
    let three_spades_multiplier = if is_three_spades_win { 2 } else { 1 };
    let mut total_winner_earn = 0i64;

    for player in players {
        if player.id != winner_id {
            let mut loss_amount = bet_amount;
            if player.hand.len() == 13 && !player.has_played_first_card {
                loss_amount += calculate_cong_penalty(bet_amount, cong_multiplier);
            }

            let rotten = calculate_rotten_penalty(&player.hand, bet_amount, mult);
            loss_amount += rotten;
            loss_amount *= three_spades_multiplier;

            payouts.insert(player.id.clone(), -loss_amount);
            total_winner_earn += loss_amount;
        }
    }

    payouts.insert(winner_id.to_string(), total_winner_earn);
    Ok(payouts)
}

/// Tính toán kết quả cho chế độ Truyền Thống (Rank-Based)
pub fn calculate_traditional_settlement(
    players: &[MatchPlayer],
    winners: &[MatchPlayer],
    bet_amount: i64,
    penalty_multiplier: f64,
    is_three_spades_win: bool,
    cong_multiplier: f64,
) -> Result<std::collections::HashMap<String, i64>, String> {
    if players.is_empty() {
        return Err("players list cannot be empty".to_string());
    }
    if winners.is_empty() {
        return Err("winners list cannot be empty".to_string());
    }
    if !winners.iter().all(|w| players.iter().any(|p| p.id == w.id)) {
        return Err("all winners must exist in players".to_string());
    }
    if bet_amount < 0 {
        return Err("betAmount cannot be negative".to_string());
    }

    let mut payouts = std::collections::HashMap::new();
    for p in players {
        payouts.insert(p.id.clone(), 0i64);
    }

    let mult = penalty_multiplier.max(1.0);
    let three_spades_multiplier = if is_three_spades_win { 2 } else { 1 };

    if winners.len() >= 4 {
        payouts.insert(winners[0].id.clone(), bet_amount * 3 * three_spades_multiplier);
        payouts.insert(winners[1].id.clone(), bet_amount);
        payouts.insert(winners[2].id.clone(), -bet_amount);
        payouts.insert(winners[3].id.clone(), -bet_amount * 3 * three_spades_multiplier);
    } else if winners.len() == 3 {
        payouts.insert(winners[0].id.clone(), bet_amount * 2 * three_spades_multiplier);
        payouts.insert(winners[1].id.clone(), 0);
        payouts.insert(winners[2].id.clone(), -bet_amount * 2 * three_spades_multiplier);
    } else if winners.len() == 2 {
        payouts.insert(winners[0].id.clone(), bet_amount * three_spades_multiplier);
        payouts.insert(winners[1].id.clone(), -bet_amount * three_spades_multiplier);
    } else if winners.len() == 1 {
        let remaining_players: Vec<&MatchPlayer> = players.iter().filter(|p| p.id != winners[0].id).collect();
        payouts.insert(winners[0].id.clone(), bet_amount * remaining_players.len() as i64 * three_spades_multiplier);
        for p in remaining_players {
            payouts.insert(p.id.clone(), -bet_amount * three_spades_multiplier);
        }
    }

    let winner_first_id = winners[0].id.clone();
    for player in players {
        if player.id != winner_first_id && !player.hand.is_empty() {
            let mut rotten = calculate_rotten_penalty(&player.hand, bet_amount, mult);
            if rotten > 0 {
                rotten *= three_spades_multiplier;
                if let Some(val) = payouts.get_mut(&player.id) {
                    *val -= rotten;
                }
                if let Some(val) = payouts.get_mut(&winner_first_id) {
                    *val += rotten;
                }
            }

            if player.hand.len() == 13 && !player.has_played_first_card {
                let mut cong = calculate_cong_penalty(bet_amount, cong_multiplier);
                cong *= three_spades_multiplier;
                if let Some(val) = payouts.get_mut(&player.id) {
                    *val -= cong;
                }
                if let Some(val) = payouts.get_mut(&winner_first_id) {
                    *val += cong;
                }
            }
        }
    }

    Ok(payouts)
}

/// Starts a new game: resets players, shuffles deck, deals cards, checks instant win, and finds starting player.
pub fn start_new_game(
    players: &[MatchPlayer],
    rules: &GameRules,
    game_number: u32,
    last_winner_id: Option<&str>,
) -> MatchState {
    let mut clean_players = reset_players_for_new_game(players);
    let player_count = clean_players.len();
    assert!(
        (2..=4).contains(&player_count),
        "Player count must be between 2 and 4"
    );

    let mut deck = create_deck();
    let mut rng = thread_rng();
    deck.shuffle(&mut rng);

    // Deal 13 cards per player
    for player in clean_players.iter_mut().take(player_count) {
        let hand_cards: Vec<Card> = deck.drain(0..13).collect();
        let mut sorted_hand = hand_cards;
        sort_cards(&mut sorted_hand);
        player.hand = sorted_hand;
        player.card_count = 13;
    }

    // Check instant win
    if rules.instant_win.enabled {
        let instant_winner = clean_players
            .iter()
            .find_map(|p| check_instant_win(&p.hand, game_number == 1).map(|w| (p.id.clone(), w)));
        if let Some((winner_id, win_type)) = instant_winner {
            return MatchState::InstantWin {
                game_number,
                players: clean_players,
                winner_id,
                win_type,
                rules: rules.clone(),
            };
        }
    }

    // Determine lead player
    let mut lead_player_idx = 0;
    let mut is_first_move_opening = false;
    let mut first_move_required_card = None;

    if game_number == 1 && rules.game_flow.first_game_require_three_of_spades {
        let three_spades = Card::new(3, Suit::Spades);
        for (idx, p) in clean_players.iter().enumerate() {
            if p.hand.iter().any(|c| c.is_three_of_spades()) {
                lead_player_idx = idx;
                is_first_move_opening = true;
                first_move_required_card = Some(three_spades.clone());
                break;
            }
        }
    } else if let Some(last_winner) = last_winner_id {
        if let Some(idx) = clean_players.iter().position(|p| p.id == last_winner) {
            lead_player_idx = idx;
        }
    } else {
        // Player holding lowest card leads
        let mut lowest_card_weight = u8::MAX;
        for (idx, p) in clean_players.iter().enumerate() {
            if let Some(first_card) = p.hand.first()
                && first_card.weight() < lowest_card_weight {
                    lowest_card_weight = first_card.weight();
                    lead_player_idx = idx;
                }
        }
    }

    let lead_player_id = clean_players[lead_player_idx].id.clone();
    let current_turn_player_id = lead_player_id.clone();

    let common = PlayingCommon {
        game_number,
        round_number: 1,
        players: clean_players,
        current_turn_player_id,
        lead_player_id,
        round_moves: Vec::new(),
        passed_player_ids: Vec::new(),
        rules: rules.clone(),
    };

    if is_first_move_opening {
        MatchState::Playing(PlayingTurnState::OpeningFirstMove {
            common,
            required_card: first_move_required_card.unwrap(),
        })
    } else {
        MatchState::Playing(PlayingTurnState::NormalLead { common })
    }
}

/// Validates a proposed move without mutating the state
pub fn validate_move(
    state: &MatchState,
    player_id: &str,
    card_ids: &[&str],
) -> Result<Combination, String> {
    let play_state = match state {
        MatchState::Playing(ps) => ps,
        _ => return Err("Game is not in PLAYING state".into()),
    };

    let common = play_state.common();
    if common.current_turn_player_id != player_id {
        return Err(format!("Not player {}'s turn", player_id));
    }

    let player = common
        .players
        .iter()
        .find(|p| p.id == player_id)
        .ok_or_else(|| format!("Player {} not found", player_id))?;

    if card_ids.is_empty() {
        return Err("Cannot play empty cards".into());
    }

    let mut played_cards = Vec::with_capacity(card_ids.len());
    for &cid in card_ids {
        let card = player
            .hand
            .iter()
            .find(|c| c.id == cid || c.id.replace('_', "-") == cid.replace('_', "-"))
            .ok_or_else(|| format!("Card {} not found in hand", cid))?;
        played_cards.push(card.clone());
    }

    let combo = identify_combination(&played_cards)
        .ok_or_else(|| "Selected cards do not form a valid combination".to_string())?;

    match play_state {
        PlayingTurnState::OpeningFirstMove { required_card, .. } => {
            if !played_cards.iter().any(|c| c == required_card) {
                return Err(format!("First move must include {}", required_card));
            }
        }
        PlayingTurnState::NormalLead { .. } => {
            // Cannot end with Two if prohibited
            if common.rules.game_flow.prohibit_ending_with_two
                && player.hand.len() == played_cards.len()
                && (combo.highest_card.is_two()
                    || combo.combo_type == CombinationType::FourOfAKind
                    || combo.combo_type == CombinationType::ThreePairsSequential
                    || combo.combo_type == CombinationType::FourPairsSequential)
            {
                return Err("Cannot finish the game by ending with a Two or Chopping special combo".into());
            }
        }
        PlayingTurnState::Follow { leading_move, .. } => {
            let beats = can_beat(&combo, &leading_move.combination);
            let chops = can_chop(
                &combo,
                &leading_move.combination,
                common.rules.chopping.allow_three_pairs_cut_two,
                common.rules.chopping.allow_four_of_a_kind_cut_pairs_of_twos,
            );

            if !beats && !chops {
                return Err("Combination cannot beat or chop current leading move".into());
            }
        }
    }

    Ok(combo)
}

/// Executes a move and returns the next authoritative MatchState
pub fn play_move(
    state: &MatchState,
    player_id: &str,
    card_ids: &[&str],
    timestamp: u64,
) -> Result<MatchState, String> {
    let combo = validate_move(state, player_id, card_ids)?;
    let play_state = match state {
        MatchState::Playing(ps) => ps,
        _ => return Err("Invalid state for play_move".into()),
    };

    let common = play_state.common();
    let rules = &common.rules;
    let mut updated_players = update_players_hand(&common.players, player_id, &combo.cards, false);

    // Detect chop and compute penalty
    let mut is_chop = false;
    let mut is_cascade_chop = false;
    let mut chop_chain_count = 0;
    let mut chop_chain_total_amount = 0;
    let mut chopped_player_id = None;
    let mut penalty_amount = 0;

    if let PlayingTurnState::Follow { leading_move, .. } = play_state
        && can_chop(
            &combo,
            &leading_move.combination,
            rules.chopping.allow_three_pairs_cut_two,
            rules.chopping.allow_four_of_a_kind_cut_pairs_of_twos,
        ) {
            is_chop = true;
            chopped_player_id = Some(leading_move.player_id.clone());
            let base_penalty = calculate_chop_penalty(
                &leading_move.combination,
                &combo,
                rules.table.bet_amount,
                rules.chopping.multiplier,
            );

            let prev_chop_moves: Vec<&PlayedMove> =
                common.round_moves.iter().filter(|m| m.is_chop).collect();
            if rules.chopping.cascade_multiplier && !prev_chop_moves.is_empty() {
                is_cascade_chop = true;
                chop_chain_count = prev_chop_moves.len() as u32 + 1;
                let last_chop = prev_chop_moves.last().unwrap();
                let prev_amount = last_chop.penalty_amount;
                penalty_amount = prev_amount + base_penalty;
                chop_chain_total_amount = penalty_amount;

                // Refund the previous victim from the previous chopper
                if let Some(prev_victim_id) = &last_chop.chopped_player_id {
                    let prev_chopper_id = &last_chop.player_id;
                    for p in &mut updated_players {
                        if p.id == *prev_victim_id {
                            p.score += prev_amount;
                        }
                        if p.id == *prev_chopper_id {
                            p.score -= prev_amount;
                        }
                    }
                }
            } else {
                penalty_amount = base_penalty;
                chop_chain_count = 1;
                chop_chain_total_amount = base_penalty;
            }

            // Transfer penalty
            let victim_id = &leading_move.player_id;
            for p in &mut updated_players {
                if p.id == *victim_id {
                    p.score -= penalty_amount;
                }
                if p.id == player_id {
                    p.score += penalty_amount;
                }
            }
        }

    let played_move = if is_chop {
        PlayedMove::chop(
            player_id,
            combo,
            chopped_player_id.unwrap(),
            penalty_amount,
            is_cascade_chop,
            chop_chain_count,
            chop_chain_total_amount,
            timestamp,
        )
    } else {
        PlayedMove::standard(player_id, combo, timestamp)
    };

    let player_finished = updated_players
        .iter()
        .find(|p| p.id == player_id)
        .map(|p| p.card_count == 0)
        .unwrap_or(false);

    // If player ran out of cards, check match finish
    if player_finished {
        return settle_game_round(
            common.game_number,
            common.round_number,
            &updated_players,
            player_id,
            rules,
        );
    }

    // Determine next turn
    let mut next_round_moves = common.round_moves.clone();
    next_round_moves.push(played_move.clone());

    let next_turn_player_id = get_next_turn_player(
        &updated_players,
        &common.passed_player_ids,
        player_id,
    );

    let next_common = PlayingCommon {
        game_number: common.game_number,
        round_number: common.round_number,
        players: updated_players,
        current_turn_player_id: next_turn_player_id.clone(),
        lead_player_id: common.lead_player_id.clone(),
        round_moves: next_round_moves,
        passed_player_ids: common.passed_player_ids.clone(),
        rules: rules.clone(),
    };

    Ok(MatchState::Playing(PlayingTurnState::Follow {
        common: next_common,
        leading_move: played_move,
    }))
}

/// Passes the turn for the active player
pub fn pass_turn(state: &MatchState, player_id: &str) -> Result<MatchState, String> {
    let play_state = match state {
        MatchState::Playing(ps) => ps,
        _ => return Err("Invalid state for pass_turn".into()),
    };

    let common = play_state.common();
    if common.current_turn_player_id != player_id {
        return Err(format!("Not player {}'s turn", player_id));
    }

    match play_state {
        PlayingTurnState::OpeningFirstMove { .. } | PlayingTurnState::NormalLead { .. } => {
            Err("Leader cannot pass, must play a card".into())
        }
        PlayingTurnState::Follow { leading_move, .. } => {
            let mut next_passed = common.passed_player_ids.clone();
            if !next_passed.contains(&player_id.to_string()) {
                next_passed.push(player_id.to_string());
            }

            let updated_players =
                update_players_hand(&common.players, player_id, &[], true);

            // Active players who still have cards
            let active_players_with_cards: Vec<&MatchPlayer> = updated_players
                .iter()
                .filter(|p| p.card_count > 0)
                .collect();

            // Check if all OTHER players have passed
            let unpassed_players: Vec<&MatchPlayer> = active_players_with_cards
                .iter()
                .filter(|p| !next_passed.contains(&p.id))
                .copied()
                .collect();

            if unpassed_players.len() <= 1 {
                // Trick is over! Winner of trick leads next trick
                let trick_winner_id = if let Some(remaining) = unpassed_players.first() {
                    remaining.id.clone()
                } else {
                    leading_move.player_id.clone()
                };

                let clean_round_players = updated_players
                    .iter()
                    .map(|p| {
                        let mut p_copy = p.clone();
                        p_copy.is_passed_current_round = false;
                        p_copy
                    })
                    .collect();

                let next_common = PlayingCommon {
                    game_number: common.game_number,
                    round_number: common.round_number + 1,
                    players: clean_round_players,
                    current_turn_player_id: trick_winner_id.clone(),
                    lead_player_id: trick_winner_id,
                    round_moves: Vec::new(),
                    passed_player_ids: Vec::new(),
                    rules: common.rules.clone(),
                };

                Ok(MatchState::Playing(PlayingTurnState::NormalLead {
                    common: next_common,
                }))
            } else {
                // Advance to next active unpassed player
                let next_turn_player_id =
                    get_next_turn_player(&updated_players, &next_passed, player_id);

                let next_common = PlayingCommon {
                    game_number: common.game_number,
                    round_number: common.round_number,
                    players: updated_players,
                    current_turn_player_id: next_turn_player_id,
                    lead_player_id: common.lead_player_id.clone(),
                    round_moves: common.round_moves.clone(),
                    passed_player_ids: next_passed,
                    rules: common.rules.clone(),
                };

                Ok(MatchState::Playing(PlayingTurnState::Follow {
                    common: next_common,
                    leading_move: leading_move.clone(),
                }))
            }
        }
    }
}

/// Determines the next turn player clockwise, skipping passed or empty-hand players
fn get_next_turn_player(
    players: &[MatchPlayer],
    passed_ids: &[String],
    current_player_id: &str,
) -> String {
    let current_idx = players
        .iter()
        .position(|p| p.id == current_player_id)
        .unwrap_or(0);

    let n = players.len();
    for offset in 1..n {
        let idx = (current_idx + offset) % n;
        let candidate = &players[idx];
        if candidate.card_count > 0 && !passed_ids.contains(&candidate.id) {
            return candidate.id.clone();
        }
    }

    current_player_id.to_string()
}

/// Settles game round when a winner is found
fn settle_game_round(
    game_number: u32,
    round_number: u32,
    players: &[MatchPlayer],
    winner_id: &str,
    rules: &GameRules,
) -> Result<MatchState, String> {
    let bet = rules.table.bet_amount;
    let mut settled_players = players.to_vec();

    let payouts = match rules.settlement_rule {
        GameSettlementRule::CountCards => calculate_count_cards_settlement(
            players,
            winner_id,
            bet,
            rules.chopping.multiplier,
            false,
            rules.cong.multiplier,
        )?,
        GameSettlementRule::WinnerTakesAll => calculate_winner_takes_all_settlement(
            players,
            winner_id,
            bet,
            rules.chopping.multiplier,
            false,
            rules.cong.multiplier,
        )?,
        GameSettlementRule::Traditional => {
            let winners: Vec<MatchPlayer> = players
                .iter()
                .filter(|p| p.id == winner_id)
                .cloned()
                .collect();
            calculate_traditional_settlement(
                players,
                &winners,
                bet,
                rules.chopping.multiplier,
                false,
                rules.cong.multiplier,
            )?
        }
    };

    let mut rankings = Vec::new();
    for p in &mut settled_players {
        let change = *payouts.get(&p.id).unwrap_or(&0);
        p.score += change;
        if p.id != winner_id {
            rankings.push(PlayerRanking {
                player_id: p.id.clone(),
                name: p.name.clone(),
                rank_position: 2,
                remaining_cards: p.card_count,
                score_change: change,
            });
        }
    }

    if let Some(winner) = settled_players.iter().find(|p| p.id == winner_id) {
        let win_change = *payouts.get(winner_id).unwrap_or(&0);
        rankings.insert(
            0,
            PlayerRanking {
                player_id: winner.id.clone(),
                name: winner.name.clone(),
                rank_position: 1,
                remaining_cards: 0,
                score_change: win_change,
            },
        );
    }

    Ok(MatchState::RoundEnded {
        game_number,
        round_number,
        players: settled_players,
        winner_id: winner_id.to_string(),
        rankings,
        rules: rules.clone(),
    })
}
