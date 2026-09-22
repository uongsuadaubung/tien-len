/* tslint:disable */
/* eslint-disable */

export function wasm_calculate_chop_penalty(target_json: string, candidate_json: string, bet_amount: bigint, multiplier: number): bigint;

export function wasm_calculate_cong_penalty(bet_amount: bigint, cong_multiplier: number): bigint;

export function wasm_calculate_count_cards_settlement(players_json: string, winner_id: string, bet_amount: bigint, penalty_multiplier: number, is_three_spades_win: boolean, cong_multiplier: number): string;

export function wasm_calculate_elo_delta(rank_position: number, player_elo: number, opponents_avg_elo: number, total_players: number, metrics_json?: string | null): string;

export function wasm_calculate_rotten_penalty(hand_json: string, bet_amount: bigint, multiplier: number): bigint;

export function wasm_calculate_traditional_settlement(players_json: string, winners_json: string, bet_amount: bigint, penalty_multiplier: number, is_three_spades_win: boolean, cong_multiplier: number): string;

export function wasm_calculate_winner_takes_all_settlement(players_json: string, winner_id: string, bet_amount: bigint, penalty_multiplier: number, is_three_spades_win: boolean, cong_multiplier: number): string;

export function wasm_can_beat(candidate_json: string, target_json: string): boolean;

export function wasm_can_chop(candidate_json: string, target_json: string, allow_three_pairs: boolean, allow_quads: boolean): boolean;

export function wasm_check_instant_win(hand_json: string, is_first_game: boolean): string;

export function wasm_compute_table_elo_settlement(players_json: string, winners_json: string, player_elos_json: string, chops_by_player_json: string, got_chopped_by_player_json: string, streaks_by_player_json: string, is_three_spades_win: boolean, is_instant_win: boolean): string;

export function wasm_create_deck(): string;

export function wasm_deal_cards(deck_json: string, player_count: number): string;

export function wasm_decide_bot_move(hand_json: string, state_json: string, bot_id: string): string;

export function wasm_evaluate_candidate_moves_mcts(bot_id: string, bot_hand_json: string, candidate_moves_json: string, played_card_ids_json: string, remaining_cards_json: string, simulations_count: number, seed: number): string;

export function wasm_get_available_smart_variants(cards_json: string): string;

export function wasm_get_optimal_move_hint(hand_json: string, leading_combo_json: string | null | undefined, is_lead_move: boolean, is_first_move_of_game: boolean, first_move_required_card_id: string | null | undefined, prohibit_ending_with_two: boolean): string;

export function wasm_get_sorted_quick_select_candidates(hand_json: string, target_json: string | null | undefined, is_lead_move: boolean, is_first_move_of_game: boolean, first_move_required_card_id: string | null | undefined, prohibit_ending_with_two: boolean): string;

export function wasm_identify_combination(cards_json: string): string;

export function wasm_pass_turn(state_json: string, player_id: string): string;

export function wasm_play_move(state_json: string, player_id: string, card_ids_json: string, timestamp: number): string;

export function wasm_simulate_match_series(num_games: number, base_seed: number, rules_json: string | null | undefined, bots_json: string, rotate_seats: boolean): string;

export function wasm_simulate_single_table(table_json: string, bots_json: string, seed: number, timestamp: number): string;

export function wasm_simulate_tables_batch(tables_json: string, bots_json: string, base_seed: number, timestamp: number): string;

export function wasm_sort_smart_groups(cards_json: string, variant_index: number): string;

export function wasm_start_new_game(players_json: string, rules_json: string, game_number: number, last_winner_id?: string | null): string;

export function wasm_validate_move(state_json: string, player_id: string, card_ids_json: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly wasm_calculate_chop_penalty: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: number) => void;
    readonly wasm_calculate_cong_penalty: (a: bigint, b: number) => bigint;
    readonly wasm_calculate_count_cards_settlement: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: number, h: number, i: number) => void;
    readonly wasm_calculate_elo_delta: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly wasm_calculate_rotten_penalty: (a: number, b: number, c: number, d: bigint, e: number) => void;
    readonly wasm_calculate_traditional_settlement: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: number, h: number, i: number) => void;
    readonly wasm_calculate_winner_takes_all_settlement: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: number, h: number, i: number) => void;
    readonly wasm_can_beat: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly wasm_can_chop: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly wasm_check_instant_win: (a: number, b: number, c: number, d: number) => void;
    readonly wasm_compute_table_elo_settlement: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number) => void;
    readonly wasm_create_deck: (a: number) => void;
    readonly wasm_deal_cards: (a: number, b: number, c: number, d: number) => void;
    readonly wasm_decide_bot_move: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly wasm_evaluate_candidate_moves_mcts: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number) => void;
    readonly wasm_get_available_smart_variants: (a: number, b: number, c: number) => void;
    readonly wasm_get_optimal_move_hint: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
    readonly wasm_get_sorted_quick_select_candidates: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
    readonly wasm_identify_combination: (a: number, b: number, c: number) => void;
    readonly wasm_pass_turn: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly wasm_play_move: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly wasm_simulate_match_series: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly wasm_simulate_single_table: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly wasm_simulate_tables_batch: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly wasm_sort_smart_groups: (a: number, b: number, c: number, d: number) => void;
    readonly wasm_start_new_game: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly wasm_validate_move: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly __wbindgen_export: (a: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export2: (a: number, b: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
