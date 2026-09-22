use wasm_bindgen::prelude::*;
use crate::ai::{decide_bot_move, CardTracker};
use crate::card::{create_deck, deal_cards, Card};
use crate::combination::{can_beat, can_chop, identify_combination, Combination};
use crate::engine::{
    calculate_chop_penalty, calculate_cong_penalty, calculate_count_cards_settlement,
    calculate_rotten_penalty, calculate_traditional_settlement,
    calculate_winner_takes_all_settlement, check_instant_win, pass_turn, play_move,
    start_new_game, validate_move,
};
use crate::hand_sorter::{cycle_hand_groupings, get_available_smart_variants};
use crate::player::MatchPlayer;
use crate::rules::GameRules;
use crate::state::MatchState;
use std::borrow::Cow;

/// Làm sạch chuỗi JSON nếu có chứa các escape sequence Unicode Surrogate lẻ loi (\uD800..\uDFFF).
/// Chuẩn JSON cho phép surrogate pairs ghép đôi (\uD83D\uDCA9), nhưng nếu xuất hiện lone surrogate
/// (ví dụ do cắt chuỗi UTF-16 ở JS), serde_json sẽ quăng lỗi 'lone leading surrogate in hex escape'.
/// Hàm này biến đổi lone surrogates thành ký tự thay thế an toàn \uFFFD, đảm bảo serde_json luôn parse thành công.
pub fn sanitize_json_surrogates(json: &str) -> Cow<'_, str> {
    if !json.contains("\\u") && !json.contains("\\U") {
        return Cow::Borrowed(json);
    }

    let bytes = json.as_bytes();
    let len = bytes.len();
    let mut i = 0;
    let mut has_lone = false;

    // Quét nhanh xem có lone surrogate không trước khi cấp phát bộ nhớ
    while i + 5 < len {
        if bytes[i] == b'\\' && (bytes[i + 1] == b'u' || bytes[i + 1] == b'U') {
            if let Ok(val) = u16::from_str_radix(&json[i + 2..i + 6], 16) {
                if (0xD800..=0xDBFF).contains(&val) {
                    let mut is_pair = false;
                    if i + 11 < len && bytes[i + 6] == b'\\' && (bytes[i + 7] == b'u' || bytes[i + 7] == b'U') {
                        if let Ok(val2) = u16::from_str_radix(&json[i + 8..i + 12], 16) {
                            if (0xDC00..=0xDFFF).contains(&val2) {
                                is_pair = true;
                            }
                        }
                    }
                    if !is_pair {
                        has_lone = true;
                        break;
                    }
                    i += 12;
                    continue;
                } else if (0xDC00..=0xDFFF).contains(&val) {
                    has_lone = true;
                    break;
                }
            }
            i += 6;
        } else {
            i += 1;
        }
    }

    if !has_lone {
        return Cow::Borrowed(json);
    }

    // Nếu có lone surrogate, build lại chuỗi an toàn
    let mut out = String::with_capacity(len);
    let mut idx = 0;
    while idx < len {
        if idx + 5 < len && bytes[idx] == b'\\' && (bytes[idx + 1] == b'u' || bytes[idx + 1] == b'U') {
            if let Ok(val) = u16::from_str_radix(&json[idx + 2..idx + 6], 16) {
                if (0xD800..=0xDBFF).contains(&val) {
                    let mut is_pair = false;
                    if idx + 11 < len && bytes[idx + 6] == b'\\' && (bytes[idx + 7] == b'u' || bytes[idx + 7] == b'U') {
                        if let Ok(val2) = u16::from_str_radix(&json[idx + 8..idx + 12], 16) {
                            if (0xDC00..=0xDFFF).contains(&val2) {
                                is_pair = true;
                            }
                        }
                    }
                    if is_pair {
                        out.push_str(&json[idx..idx + 12]);
                        idx += 12;
                        continue;
                    } else {
                        out.push_str("\\uFFFD");
                        idx += 6;
                        continue;
                    }
                } else if (0xDC00..=0xDFFF).contains(&val) {
                    out.push_str("\\uFFFD");
                    idx += 6;
                    continue;
                }
            }
        }
        let ch = json[idx..].chars().next().unwrap();
        out.push(ch);
        idx += ch.len_utf8();
    }

    Cow::Owned(out)
}

#[inline]
pub fn parse_json_safe<T: serde::de::DeserializeOwned>(input: &str) -> Result<T, serde_json::Error> {
    match serde_json::from_str::<T>(input) {
        Ok(val) => Ok(val),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("surrogate") || msg.contains("hex escape") || msg.contains("escape") {
                let sanitized = sanitize_json_surrogates(input);
                serde_json::from_str::<T>(&sanitized)
            } else {
                Err(e)
            }
        }
    }
}

#[wasm_bindgen]
pub fn wasm_create_deck() -> Result<String, JsValue> {
    let deck = create_deck();
    serde_json::to_string(&deck).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_identify_combination(cards_json: &str) -> Result<String, JsValue> {
    let cards: Vec<Card> = parse_json_safe(cards_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid cards JSON: {}", e)))?;
    let combo = identify_combination(&cards);
    serde_json::to_string(&combo).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_can_beat(candidate_json: &str, target_json: &str) -> Result<bool, JsValue> {
    let candidate: Combination = parse_json_safe(candidate_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid candidate JSON: {}", e)))?;
    let target: Combination = parse_json_safe(target_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid target JSON: {}", e)))?;
    Ok(can_beat(&candidate, &target))
}

#[wasm_bindgen]
pub fn wasm_can_chop(
    candidate_json: &str,
    target_json: &str,
    allow_three_pairs: bool,
    allow_quads: bool,
) -> Result<bool, JsValue> {
    let candidate: Combination = parse_json_safe(candidate_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid candidate JSON: {}", e)))?;
    let target: Combination = parse_json_safe(target_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid target JSON: {}", e)))?;
    Ok(can_chop(&candidate, &target, allow_three_pairs, allow_quads))
}

#[wasm_bindgen]
pub fn wasm_start_new_game(
    players_json: &str,
    rules_json: &str,
    game_number: u32,
    last_winner_id: Option<String>,
) -> Result<String, JsValue> {
    let players: Vec<MatchPlayer> = parse_json_safe(players_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid players JSON: {}", e)))?;
    let rules: GameRules = parse_json_safe(rules_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid rules JSON: {}", e)))?;

    let state = start_new_game(
        &players,
        &rules,
        game_number,
        last_winner_id.as_deref(),
    );
    serde_json::to_string(&state).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_validate_move(
    state_json: &str,
    player_id: &str,
    card_ids_json: &str,
) -> Result<String, JsValue> {
    let state: MatchState = parse_json_safe(state_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid state JSON: {}", e)))?;
    let card_ids: Vec<String> = parse_json_safe(card_ids_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid card_ids JSON: {}", e)))?;
    let card_id_refs: Vec<&str> = card_ids.iter().map(|s| s.as_str()).collect();

    match validate_move(&state, player_id, &card_id_refs) {
        Ok(combo) => {
            let res = serde_json::json!({
                "valid": true,
                "combination": combo
            });
            serde_json::to_string(&res).map_err(|e| JsValue::from_str(&e.to_string()))
        }
        Err(err) => {
            let res = serde_json::json!({
                "valid": false,
                "error": err
            });
            serde_json::to_string(&res).map_err(|e| JsValue::from_str(&e.to_string()))
        }
    }
}

#[wasm_bindgen]
pub fn wasm_play_move(
    state_json: &str,
    player_id: &str,
    card_ids_json: &str,
    timestamp: f64,
) -> Result<String, JsValue> {
    let state: MatchState = parse_json_safe(state_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid state JSON: {}", e)))?;
    let card_ids: Vec<String> = parse_json_safe(card_ids_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid card_ids JSON: {}", e)))?;
    let card_id_refs: Vec<&str> = card_ids.iter().map(|s| s.as_str()).collect();

    match play_move(&state, player_id, &card_id_refs, timestamp as u64) {
        Ok(next_state) => {
            serde_json::to_string(&next_state).map_err(|e| JsValue::from_str(&e.to_string()))
        }
        Err(err) => Err(JsValue::from_str(&err)),
    }
}

#[wasm_bindgen]
pub fn wasm_pass_turn(state_json: &str, player_id: &str) -> Result<String, JsValue> {
    let state: MatchState = parse_json_safe(state_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid state JSON: {}", e)))?;

    match pass_turn(&state, player_id) {
        Ok(next_state) => {
            serde_json::to_string(&next_state).map_err(|e| JsValue::from_str(&e.to_string()))
        }
        Err(err) => Err(JsValue::from_str(&err)),
    }
}

#[wasm_bindgen]
pub fn wasm_sort_smart_groups(cards_json: &str, variant_index: usize) -> Result<String, JsValue> {
    let cards: Vec<Card> = parse_json_safe(cards_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid cards JSON: {}", e)))?;
    let groups = cycle_hand_groupings(&cards, variant_index);
    serde_json::to_string(&groups).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_get_available_smart_variants(cards_json: &str) -> Result<String, JsValue> {
    let cards: Vec<Card> = parse_json_safe(cards_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid cards JSON: {}", e)))?;
    let variants = get_available_smart_variants(&cards);
    serde_json::to_string(&variants).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_decide_bot_move(
    hand_json: &str,
    state_json: &str,
    bot_id: &str,
) -> Result<String, JsValue> {
    let hand: Vec<Card> = parse_json_safe(hand_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid hand JSON: {}", e)))?;
    let state: MatchState = parse_json_safe(state_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid state JSON: {}", e)))?;

    let play_state = match &state {
        MatchState::Playing(ps) => ps,
        _ => return Err(JsValue::from_str("Match is not in playing state")),
    };

    let tracker = CardTracker::new();
    let decision = decide_bot_move(&hand, play_state, bot_id, &tracker);
    serde_json::to_string(&decision).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_calculate_chop_penalty(
    target_json: &str,
    candidate_json: &str,
    bet_amount: i64,
    multiplier: f64,
) -> Result<i64, JsValue> {
    let target: Combination = parse_json_safe(target_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid target JSON: {}", e)))?;
    let candidate: Combination = parse_json_safe(candidate_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid candidate JSON: {}", e)))?;
    Ok(calculate_chop_penalty(&target, &candidate, bet_amount, multiplier))
}

#[wasm_bindgen]
pub fn wasm_calculate_rotten_penalty(
    hand_json: &str,
    bet_amount: i64,
    multiplier: f64,
) -> Result<i64, JsValue> {
    let hand: Vec<Card> = parse_json_safe(hand_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid hand JSON: {}", e)))?;
    Ok(calculate_rotten_penalty(&hand, bet_amount, multiplier))
}

#[wasm_bindgen]
pub fn wasm_check_instant_win(hand_json: &str, is_first_game: bool) -> Result<String, JsValue> {
    let hand: Vec<Card> = parse_json_safe(hand_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid hand JSON: {}", e)))?;
    let res = check_instant_win(&hand, is_first_game);
    serde_json::to_string(&res).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_deal_cards(deck_json: &str, player_count: usize) -> Result<String, JsValue> {
    let deck: Vec<Card> = parse_json_safe(deck_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid deck JSON: {}", e)))?;
    let hands = deal_cards(&deck, player_count);
    serde_json::to_string(&hands).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_calculate_cong_penalty(bet_amount: i64, cong_multiplier: f64) -> i64 {
    calculate_cong_penalty(bet_amount, cong_multiplier)
}

#[wasm_bindgen]
pub fn wasm_calculate_count_cards_settlement(
    players_json: &str,
    winner_id: &str,
    bet_amount: i64,
    penalty_multiplier: f64,
    is_three_spades_win: bool,
    cong_multiplier: f64,
) -> Result<String, JsValue> {
    let players: Vec<MatchPlayer> = parse_json_safe(players_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid players JSON: {}", e)))?;
    let payouts = calculate_count_cards_settlement(
        &players,
        winner_id,
        bet_amount,
        penalty_multiplier,
        is_three_spades_win,
        cong_multiplier,
    )
    .map_err(|e| JsValue::from_str(&e))?;
    serde_json::to_string(&payouts).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_calculate_winner_takes_all_settlement(
    players_json: &str,
    winner_id: &str,
    bet_amount: i64,
    penalty_multiplier: f64,
    is_three_spades_win: bool,
    cong_multiplier: f64,
) -> Result<String, JsValue> {
    let players: Vec<MatchPlayer> = parse_json_safe(players_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid players JSON: {}", e)))?;
    let payouts = calculate_winner_takes_all_settlement(
        &players,
        winner_id,
        bet_amount,
        penalty_multiplier,
        is_three_spades_win,
        cong_multiplier,
    )
    .map_err(|e| JsValue::from_str(&e))?;
    serde_json::to_string(&payouts).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_calculate_traditional_settlement(
    players_json: &str,
    winners_json: &str,
    bet_amount: i64,
    penalty_multiplier: f64,
    is_three_spades_win: bool,
    cong_multiplier: f64,
) -> Result<String, JsValue> {
    let players: Vec<MatchPlayer> = parse_json_safe(players_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid players JSON: {}", e)))?;
    let winners: Vec<MatchPlayer> = parse_json_safe(winners_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid winners JSON: {}", e)))?;
    let payouts = calculate_traditional_settlement(
        &players,
        &winners,
        bet_amount,
        penalty_multiplier,
        is_three_spades_win,
        cong_multiplier,
    )
    .map_err(|e| JsValue::from_str(&e))?;
    serde_json::to_string(&payouts).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_get_sorted_quick_select_candidates(
    hand_json: &str,
    target_json: Option<String>,
    is_lead_move: bool,
    is_first_move_of_game: bool,
    first_move_required_card_id: Option<String>,
    prohibit_ending_with_two: bool,
) -> Result<String, JsValue> {
    let hand: Vec<Card> = parse_json_safe(hand_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid hand JSON: {}", e)))?;
    let target: Option<Combination> = match target_json {
        Some(s) if !s.is_empty() && s != "null" => {
            Some(parse_json_safe(&s).map_err(|e| JsValue::from_str(&format!("Invalid target JSON: {}", e)))?)
        }
        _ => None,
    };
    let candidates = crate::quick_response::get_sorted_quick_select_candidates(
        &hand,
        target.as_ref(),
        is_lead_move,
        is_first_move_of_game,
        first_move_required_card_id.as_deref(),
        prohibit_ending_with_two,
    );
    serde_json::to_string(&candidates).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_calculate_elo_delta(
    rank_position: usize,
    player_elo: i32,
    opponents_avg_elo: i32,
    total_players: usize,
    metrics_json: Option<String>,
) -> Result<String, JsValue> {
    let metrics: Option<crate::elo::EloPerformanceMetrics> = match metrics_json {
        Some(s) if !s.is_empty() && s != "null" => {
            Some(parse_json_safe(&s).map_err(|e| JsValue::from_str(&format!("Invalid metrics JSON: {}", e)))?)
        }
        _ => None,
    };
    let res = crate::elo::calculate_elo_delta(
        rank_position,
        player_elo,
        opponents_avg_elo,
        total_players,
        metrics.as_ref(),
    );
    serde_json::to_string(&res).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_compute_table_elo_settlement(
    players_json: &str,
    winners_json: &str,
    player_elos_json: &str,
    chops_by_player_json: &str,
    got_chopped_by_player_json: &str,
    streaks_by_player_json: &str,
    is_three_spades_win: bool,
    is_instant_win: bool,
) -> Result<String, JsValue> {
    let players: Vec<MatchPlayer> = parse_json_safe(players_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid players JSON: {}", e)))?;
    let winners: Vec<MatchPlayer> = parse_json_safe(winners_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid winners JSON: {}", e)))?;
    let player_elos: std::collections::HashMap<String, i32> = parse_json_safe(player_elos_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid player_elos JSON: {}", e)))?;
    let chops: std::collections::HashMap<String, u32> = parse_json_safe(chops_by_player_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid chops JSON: {}", e)))?;
    let got_chopped: std::collections::HashMap<String, u32> = parse_json_safe(got_chopped_by_player_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid got_chopped JSON: {}", e)))?;
    let streaks: std::collections::HashMap<String, u32> = parse_json_safe(streaks_by_player_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid streaks JSON: {}", e)))?;

    let settlement = crate::elo::compute_table_elo_settlement(
        &players,
        &winners,
        &player_elos,
        &chops,
        &got_chopped,
        &streaks,
        is_three_spades_win,
        is_instant_win,
    );
    serde_json::to_string(&settlement).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_evaluate_candidate_moves_mcts(
    bot_id: &str,
    bot_hand_json: &str,
    candidate_moves_json: &str,
    played_card_ids_json: &str,
    remaining_cards_json: &str,
    simulations_count: usize,
    seed: f64,
) -> Result<String, JsValue> {
    let bot_hand: Vec<Card> = parse_json_safe(bot_hand_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid bot_hand JSON: {}", e)))?;
    let candidates: Vec<crate::ai::MctsCandidateInput> = parse_json_safe(candidate_moves_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid candidates JSON: {}", e)))?;
    let played_card_ids: std::collections::HashSet<String> = parse_json_safe(played_card_ids_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid played_card_ids JSON: {}", e)))?;
    let remaining_cards: std::collections::HashMap<String, usize> = parse_json_safe(remaining_cards_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid remaining_cards JSON: {}", e)))?;

    let evals = crate::ai::evaluate_candidate_moves_mcts(
        bot_id,
        &bot_hand,
        &candidates,
        &played_card_ids,
        &remaining_cards,
        simulations_count,
        seed as u64,
    );
    serde_json::to_string(&evals).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_get_optimal_move_hint(
    hand_json: &str,
    leading_combo_json: Option<String>,
    is_lead_move: bool,
    is_first_move_of_game: bool,
    first_move_required_card_id: Option<String>,
    prohibit_ending_with_two: bool,
) -> Result<String, JsValue> {
    let hand: Vec<Card> = parse_json_safe(hand_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid hand JSON: {}", e)))?;
    let leading_combo: Option<Combination> = match leading_combo_json {
        Some(s) if !s.is_empty() && s != "null" => {
            Some(parse_json_safe(&s).map_err(|e| JsValue::from_str(&format!("Invalid leading_combo JSON: {}", e)))?)
        }
        _ => None,
    };

    let hint = crate::ai::compute_optimal_move_hint(
        &hand,
        leading_combo.as_ref(),
        is_lead_move,
        is_first_move_of_game,
        first_move_required_card_id.as_deref(),
        prohibit_ending_with_two,
    );
    serde_json::to_string(&hint).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_simulate_match_series(
    num_games: usize,
    base_seed: f64,
    rules_json: Option<String>,
    bots_json: &str,
    rotate_seats: bool,
) -> Result<String, JsValue> {
    let bots: Vec<crate::simulation::SimulatedBotConfig> = parse_json_safe(bots_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid bots JSON: {}", e)))?;

    let rules: crate::rules::GameRules = match rules_json {
        Some(s) if !s.is_empty() && s != "null" => {
            parse_json_safe(&s).unwrap_or_else(|_| crate::rules::GameRules::count_cards())
        }
        _ => crate::rules::GameRules::count_cards(),
    };

    let res = crate::simulation::simulate_match_series(
        num_games,
        base_seed as u64,
        &rules,
        &bots,
        rotate_seats,
    );

    serde_json::to_string(&res).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_simulate_single_table(
    table_json: &str,
    bots_json: &str,
    seed: f64,
    timestamp: f64,
) -> Result<String, JsValue> {
    let table: crate::simulation::TableGroupInput = parse_json_safe(table_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid table JSON: {}", e)))?;
    let bots: std::collections::HashMap<String, crate::simulation::SimulatedBotConfig> = parse_json_safe(bots_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid bots JSON: {}", e)))?;

    let res = crate::simulation::simulate_single_table(
        &table,
        &bots,
        seed as u64,
        timestamp as u64,
    );

    serde_json::to_string(&res).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_simulate_tables_batch(
    tables_json: &str,
    bots_json: &str,
    base_seed: f64,
    timestamp: f64,
) -> Result<String, JsValue> {
    let tables: Vec<crate::simulation::TableGroupInput> = parse_json_safe(tables_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid tables JSON: {}", e)))?;
    let bots: std::collections::HashMap<String, crate::simulation::SimulatedBotConfig> = parse_json_safe(bots_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid bots JSON: {}", e)))?;

    let res = crate::simulation::simulate_tables_batch(
        &tables,
        &bots,
        base_seed as u64,
        timestamp as u64,
    );

    serde_json::to_string(&res).map_err(|e| JsValue::from_str(&e.to_string()))
}


