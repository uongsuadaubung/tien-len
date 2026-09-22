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
use crate::hand_sorter::cycle_hand_groupings;
use crate::player::MatchPlayer;
use crate::rules::GameRules;
use crate::state::MatchState;

#[wasm_bindgen]
pub fn wasm_create_deck() -> Result<String, JsValue> {
    let deck = create_deck();
    serde_json::to_string(&deck).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_identify_combination(cards_json: &str) -> Result<String, JsValue> {
    let cards: Vec<Card> = serde_json::from_str(cards_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid cards JSON: {}", e)))?;
    let combo = identify_combination(&cards);
    serde_json::to_string(&combo).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_can_beat(candidate_json: &str, target_json: &str) -> Result<bool, JsValue> {
    let candidate: Combination = serde_json::from_str(candidate_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid candidate JSON: {}", e)))?;
    let target: Combination = serde_json::from_str(target_json)
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
    let candidate: Combination = serde_json::from_str(candidate_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid candidate JSON: {}", e)))?;
    let target: Combination = serde_json::from_str(target_json)
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
    let players: Vec<MatchPlayer> = serde_json::from_str(players_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid players JSON: {}", e)))?;
    let rules: GameRules = serde_json::from_str(rules_json)
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
    let state: MatchState = serde_json::from_str(state_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid state JSON: {}", e)))?;
    let card_ids: Vec<String> = serde_json::from_str(card_ids_json)
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
    let state: MatchState = serde_json::from_str(state_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid state JSON: {}", e)))?;
    let card_ids: Vec<String> = serde_json::from_str(card_ids_json)
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
    let state: MatchState = serde_json::from_str(state_json)
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
    let cards: Vec<Card> = serde_json::from_str(cards_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid cards JSON: {}", e)))?;
    let groups = cycle_hand_groupings(&cards, variant_index);
    serde_json::to_string(&groups).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_decide_bot_move(
    hand_json: &str,
    state_json: &str,
    bot_id: &str,
) -> Result<String, JsValue> {
    let hand: Vec<Card> = serde_json::from_str(hand_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid hand JSON: {}", e)))?;
    let state: MatchState = serde_json::from_str(state_json)
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
    let target: Combination = serde_json::from_str(target_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid target JSON: {}", e)))?;
    let candidate: Combination = serde_json::from_str(candidate_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid candidate JSON: {}", e)))?;
    Ok(calculate_chop_penalty(&target, &candidate, bet_amount, multiplier))
}

#[wasm_bindgen]
pub fn wasm_calculate_rotten_penalty(
    hand_json: &str,
    bet_amount: i64,
    multiplier: f64,
) -> Result<i64, JsValue> {
    let hand: Vec<Card> = serde_json::from_str(hand_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid hand JSON: {}", e)))?;
    Ok(calculate_rotten_penalty(&hand, bet_amount, multiplier))
}

#[wasm_bindgen]
pub fn wasm_check_instant_win(hand_json: &str, is_first_game: bool) -> Result<String, JsValue> {
    let hand: Vec<Card> = serde_json::from_str(hand_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid hand JSON: {}", e)))?;
    let res = check_instant_win(&hand, is_first_game);
    serde_json::to_string(&res).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_deal_cards(deck_json: &str, player_count: usize) -> Result<String, JsValue> {
    let deck: Vec<Card> = serde_json::from_str(deck_json)
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
    let players: Vec<MatchPlayer> = serde_json::from_str(players_json)
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
    let players: Vec<MatchPlayer> = serde_json::from_str(players_json)
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
    let players: Vec<MatchPlayer> = serde_json::from_str(players_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid players JSON: {}", e)))?;
    let winners: Vec<MatchPlayer> = serde_json::from_str(winners_json)
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
