import __wbg_init, {
  initSync,
  wasm_create_deck,
  wasm_deal_cards,
  wasm_identify_combination,
  wasm_can_beat,
  wasm_can_chop,
  wasm_start_new_game,
  wasm_validate_move,
  wasm_play_move,
  wasm_pass_turn,
  wasm_sort_smart_groups,
  wasm_get_available_smart_variants,
  wasm_decide_bot_move,
  wasm_calculate_chop_penalty,
  wasm_calculate_rotten_penalty,
  wasm_calculate_cong_penalty,
  wasm_calculate_count_cards_settlement,
  wasm_calculate_winner_takes_all_settlement,
  wasm_calculate_traditional_settlement,
  wasm_get_sorted_quick_select_candidates,
  wasm_calculate_elo_delta,
  wasm_compute_table_elo_settlement,
  wasm_evaluate_candidate_moves_mcts,
  wasm_get_optimal_move_hint,
  wasm_simulate_match_series,
  wasm_check_instant_win,
  wasm_simulate_single_table,
  wasm_simulate_tables_batch,
  wasm_partition_hand
} from './wasm/pkg/tien_len_core.js';
import type { Card, Combination, MatchPlayer, GameRules, InstantWinType } from './types';
import type { MatchState } from './state-machine/types';
import type { SmartCardGroup } from './hand-sorter';
import type { TableGroup, SimulatedTableResult, BotEntity, EcosystemNewsItem } from './ecosystem/ecosystem-types';
import type { EloPerformanceMetrics, EloDeltaResult } from './elo';
import type { HandPartition } from '../ai/types';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initializes the Rust WebAssembly core engine.
 * Works seamlessly across Vite browser builds, Web Workers, and Bun test environments.
 */
export async function initWasmCore(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 1. Check if running inside Bun or Node.js environment
      if (typeof process !== 'undefined' && process.versions && (process.versions.bun || process.versions.node)) {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const wasmPath = path.resolve(__dirname, './wasm/pkg/tien_len_core_bg.wasm');
          const wasmBuffer = fs.readFileSync(wasmPath);
          initSync({ module: wasmBuffer });
          isInitialized = true;
          return;
        } catch {
          // Fallback to fetch if file read fails
        }
      }

      // 2. Standard Web / Vite browser environment
      // @ts-expect-error Vite URL import query for asset
      const wasmModule = await import('./wasm/pkg/tien_len_core_bg.wasm?url');
      const wasmUrl = wasmModule.default || wasmModule;
      await __wbg_init(wasmUrl);
      isInitialized = true;
    } catch {
      // Secondary fallback: call default init without arguments (looks for same path)
      await __wbg_init();
      isInitialized = true;
    }
  })();

  await initPromise;
}

// Tự động kích hoạt nạp WASM ngầm ngay khi file module được import trong Browser hoặc Web Worker
if (typeof window !== 'undefined' || typeof self !== 'undefined') {
  void initWasmCore().catch(err => {
    console.warn('[WasmBridge] Auto-init background warning:', err);
  });
}

/**
 * Synchronous initialization when bytes are already provided or loaded
 */
export function initWasmCoreSync(bufferSource: BufferSource): void {
  if (isInitialized) return;
  initSync(bufferSource);
  isInitialized = true;
}

export function isWasmReady(): boolean {
  return isInitialized;
}

function ensureWasmReady(): void {
  if (isInitialized) return;

  if (typeof process !== 'undefined' && process.versions && (process.versions.bun || process.versions.node)) {
    try {
      const fs = require('fs');
      const path = require('path');
      const dir = typeof __dirname !== 'undefined' ? __dirname : (import.meta.dir || '.');
      const wasmPath = path.resolve(dir, './wasm/pkg/tien_len_core_bg.wasm');
      if (fs.existsSync(wasmPath)) {
        const wasmBuffer = fs.readFileSync(wasmPath);
        initSync({ module: wasmBuffer });
        isInitialized = true;
        return;
      }
    } catch {
      // Fall through to error
    }
  }

  throw new Error('[WasmBridge] Rust WebAssembly engine is not initialized. Call await initWasmCore() before executing engine commands.');
}

/**
 * Chuyển đổi đối tượng sang chuỗi JSON an toàn tuyệt đối trước khi truyền qua FFI vào Rust WebAssembly.
 * Tự động quét và loại bỏ / thay thế bất kỳ Lone Surrogate Escape sequence nào (\uD800..\uDFFF đơn lẻ không ghép cặp)
 * thành ký tự thay thế an toàn Unicode \uFFFD.
 * Ngăn chặn triệt để lỗi "lone leading surrogate in hex escape" từ serde_json của Rust.
 */
export function safeWasmJsonStringify(data: unknown): string {
  const json = JSON.stringify(data);
  if (!json) return 'null';
  return json.replace(
    /\\u[dD][89a-bA-B][0-9a-fA-F]{2}(?!\\u[dD][c-fC-F][0-9a-fA-F]{2})|(?<!\\u[dD][89a-bA-B][0-9a-fA-F]{2})\\u[dD][c-fC-F][0-9a-fA-F]{2}/g,
    '\\uFFFD'
  );
}

// ============================================================================
// TYPED WASM BRIDGE APIS
// ============================================================================

export function wasmCreateDeck(): Card[] {
  ensureWasmReady();
  const json = wasm_create_deck();
  return JSON.parse(json);
}

export function wasmIdentifyCombination(cards: readonly Card[]): Combination | null {
  ensureWasmReady();
  const json = wasm_identify_combination(safeWasmJsonStringify(cards));
  return JSON.parse(json);
}

function serializeCombination(c: Combination): string {
  return safeWasmJsonStringify({
    type: c.type,
    length: c.length,
    cards: c.cards,
    highestCard: c.highestCard
  });
}

export function wasmCanBeat(candidate: Combination, target: Combination): boolean {
  ensureWasmReady();
  return wasm_can_beat(serializeCombination(candidate), serializeCombination(target));
}

export function wasmCanChop(
  candidate: Combination,
  target: Combination,
  allowThreePairs: boolean = true,
  allowQuads: boolean = true
): boolean {
  ensureWasmReady();
  return wasm_can_chop(
    serializeCombination(candidate),
    serializeCombination(target),
    allowThreePairs,
    allowQuads
  );
}

export function wasmStartNewGame(
  players: readonly MatchPlayer[],
  rules: GameRules,
  gameNumber: number,
  lastWinnerId?: string | null
): MatchState {
  ensureWasmReady();
  const json = wasm_start_new_game(
    safeWasmJsonStringify(players),
    safeWasmJsonStringify(rules),
    gameNumber,
    lastWinnerId ?? null
  );
  return JSON.parse(json);
}

export type WasmValidationResult =
  | { valid: true; combination: Combination }
  | { valid: false; error: string };

export function wasmValidateMove(
  state: MatchState,
  playerId: string,
  cardIds: readonly string[]
): WasmValidationResult {
  ensureWasmReady();
  const json = wasm_validate_move(
    safeWasmJsonStringify(state),
    playerId,
    safeWasmJsonStringify(cardIds)
  );
  return JSON.parse(json);
}

export function wasmPlayMove(
  state: MatchState,
  playerId: string,
  cardIds: readonly string[],
  timestamp: number = Date.now()
): MatchState {
  ensureWasmReady();
  const json = wasm_play_move(
    safeWasmJsonStringify(state),
    playerId,
    safeWasmJsonStringify(cardIds),
    timestamp
  );
  return JSON.parse(json);
}

export function wasmPassTurn(state: MatchState, playerId: string): MatchState {
  ensureWasmReady();
  const json = wasm_pass_turn(safeWasmJsonStringify(state), playerId);
  return JSON.parse(json);
}

export function wasmSortSmartGroups(cards: readonly Card[], variantIndex: number = 0): SmartCardGroup[] {
  ensureWasmReady();
  const json = wasm_sort_smart_groups(safeWasmJsonStringify(cards), variantIndex);
  return JSON.parse(json);
}

export function wasmGetAvailableSmartVariants(cards: readonly Card[]): SmartCardGroup[][] {
  ensureWasmReady();
  const json = wasm_get_available_smart_variants(safeWasmJsonStringify(cards));
  return JSON.parse(json);
}

export function wasmDecideBotMove(
  hand: readonly Card[],
  state: MatchState,
  botId: string
): Card[] | null {
  ensureWasmReady();
  const json = wasm_decide_bot_move(
    safeWasmJsonStringify(hand),
    safeWasmJsonStringify(state),
    botId
  );
  return JSON.parse(json);
}

export function wasmCalculateChopPenalty(
  target: Combination,
  candidate: Combination,
  betAmount: number,
  multiplier: number = 1.0
): number {
  ensureWasmReady();
  const res = wasm_calculate_chop_penalty(
    serializeCombination(target),
    serializeCombination(candidate),
    BigInt(betAmount),
    multiplier
  );
  return Number(res);
}

export function wasmCalculateRottenPenalty(
  hand: readonly Card[],
  betAmount: number,
  multiplier: number = 1.0
): number {
  ensureWasmReady();
  const res = wasm_calculate_rotten_penalty(
    safeWasmJsonStringify(hand),
    BigInt(betAmount),
    multiplier
  );
  return Number(res);
}

export function wasmCheckInstantWin(
  hand: readonly Card[],
  isFirstGame: boolean = false
): InstantWinType | null {
  ensureWasmReady();
  const json = wasm_check_instant_win(safeWasmJsonStringify(hand), isFirstGame);
  return JSON.parse(json);
}

export function wasmDealCards(deck: readonly Card[], playerCount: number = 4): Card[][] {
  ensureWasmReady();
  const json = wasm_deal_cards(safeWasmJsonStringify(deck), playerCount);
  return JSON.parse(json);
}

export function wasmCalculateCongPenalty(betAmount: number, congMultiplier: number = 1.0): number {
  ensureWasmReady();
  const res = wasm_calculate_cong_penalty(BigInt(betAmount), congMultiplier);
  return Number(res);
}

export function wasmCalculateCountCardsSettlement(
  players: readonly MatchPlayer[],
  winnerId: string,
  betAmount: number,
  penaltyMultiplier: number = 1.0,
  isThreeSpadesWin: boolean = false,
  congMultiplier: number = 1.0
): Record<string, number> {
  ensureWasmReady();
  const json = wasm_calculate_count_cards_settlement(
    safeWasmJsonStringify(players),
    winnerId,
    BigInt(betAmount),
    penaltyMultiplier,
    isThreeSpadesWin,
    congMultiplier
  );
  return JSON.parse(json);
}

export function wasmCalculateWinnerTakesAllSettlement(
  players: readonly MatchPlayer[],
  winnerId: string,
  betAmount: number,
  penaltyMultiplier: number = 1.0,
  isThreeSpadesWin: boolean = false,
  congMultiplier: number = 1.0
): Record<string, number> {
  ensureWasmReady();
  const json = wasm_calculate_winner_takes_all_settlement(
    safeWasmJsonStringify(players),
    winnerId,
    BigInt(betAmount),
    penaltyMultiplier,
    isThreeSpadesWin,
    congMultiplier
  );
  return JSON.parse(json);
}

export function wasmCalculateTraditionalSettlement(
  players: readonly MatchPlayer[],
  winners: readonly MatchPlayer[],
  betAmount: number,
  penaltyMultiplier: number = 1.0,
  isThreeSpadesWin: boolean = false,
  congMultiplier: number = 1.0
): Record<string, number> {
  ensureWasmReady();
  const json = wasm_calculate_traditional_settlement(
    safeWasmJsonStringify(players),
    safeWasmJsonStringify(winners),
    BigInt(betAmount),
    penaltyMultiplier,
    isThreeSpadesWin,
    congMultiplier
  );
  return JSON.parse(json);
}

export interface WasmQuickSelectCandidate {
  cards: Card[];
  combination: Combination;
  isChop: boolean;
}

export function wasmGetSortedQuickSelectCandidates(
  hand: readonly Card[],
  target: Combination | null,
  isLeadMove: boolean,
  isFirstMoveOfGame: boolean = false,
  firstMoveRequiredCardId: string | null = null,
  prohibitEndingWithTwo: boolean = true
): WasmQuickSelectCandidate[] {
  ensureWasmReady();
  const json = wasm_get_sorted_quick_select_candidates(
    safeWasmJsonStringify(hand),
    target ? safeWasmJsonStringify(target) : null,
    isLeadMove,
    isFirstMoveOfGame,
    firstMoveRequiredCardId,
    prohibitEndingWithTwo
  );
  return JSON.parse(json);
}

export function wasmCalculateEloDelta(
  rankPosition: number,
  playerElo: number,
  opponentsAvgElo: number,
  totalPlayers: number = 4,
  metrics?: EloPerformanceMetrics
): EloDeltaResult {
  ensureWasmReady();
  const json = wasm_calculate_elo_delta(
    rankPosition,
    playerElo,
    opponentsAvgElo,
    totalPlayers,
    metrics ? safeWasmJsonStringify(metrics) : null
  );
  return JSON.parse(json);
}

export function wasmComputeTableEloSettlement(params: {
  players: readonly MatchPlayer[];
  winners: readonly MatchPlayer[];
  playerElos: Readonly<Record<string, number>>;
  chopsByPlayer: Readonly<Record<string, number>>;
  gotChoppedByPlayer: Readonly<Record<string, number>>;
  streaksByPlayer: Readonly<Record<string, number>>;
  isThreeSpadesWin: boolean;
  isInstantWin: boolean;
}): {
  allEloDeltas: Record<string, number>;
  allEloBreakdowns: Record<string, EloDeltaResult['breakdown']>;
} {
  ensureWasmReady();
  const json = wasm_compute_table_elo_settlement(
    safeWasmJsonStringify(params.players),
    safeWasmJsonStringify(params.winners),
    safeWasmJsonStringify(params.playerElos),
    safeWasmJsonStringify(params.chopsByPlayer),
    safeWasmJsonStringify(params.gotChoppedByPlayer),
    safeWasmJsonStringify(params.streaksByPlayer),
    params.isThreeSpadesWin,
    params.isInstantWin
  );
  return JSON.parse(json);
}

export function wasmEvaluateCandidateMovesMcts(
  botId: string,
  botHand: readonly Card[],
  candidateMoves: readonly { cards: Card[]; combination: Combination; isChop: boolean }[],
  playedCardIds: readonly string[],
  remainingCards: Record<string, number>,
  simulationsCount: number = 30,
  seed: number = Date.now()
): Array<{
  moveCards: Card[];
  combination: Combination;
  winRate: number;
  simulationsCount: number;
}> {
  ensureWasmReady();
  const json = wasm_evaluate_candidate_moves_mcts(
    botId,
    safeWasmJsonStringify(botHand),
    safeWasmJsonStringify(candidateMoves),
    safeWasmJsonStringify(playedCardIds),
    safeWasmJsonStringify(remainingCards),
    simulationsCount,
    seed
  );
  return JSON.parse(json);
}

export function wasmGetOptimalMoveHint(
  hand: readonly Card[],
  leadingCombo: Combination | null,
  isLeadMove: boolean,
  isFirstMoveOfGame: boolean = false,
  firstMoveRequiredCardId: string | null = null,
  prohibitEndingWithTwo: boolean = true
): {
  action: 'PLAY' | 'PASS';
  cards: Card[];
  hintType: string;
  title: string;
  message: string;
  explanation: string;
  details: string | null;
} {
  ensureWasmReady();
  const json = wasm_get_optimal_move_hint(
    safeWasmJsonStringify(hand),
    leadingCombo ? safeWasmJsonStringify(leadingCombo) : null,
    isLeadMove,
    isFirstMoveOfGame,
    firstMoveRequiredCardId,
    prohibitEndingWithTwo
  );
  return JSON.parse(json);
}

export interface SimulatedBotConfig {
  id: string;
  name: string;
  avatar?: string;
  elo?: number;
  mctsSimulations?: number;
}

export interface MatchSeriesResult {
  numGames: number;
  winCounts: Record<string, number>;
  winRates: Record<string, number>;
  instantWins: number;
  totalTurns: number;
  durationMs: number;
}

export function wasmSimulateMatchSeries(
  numGames: number,
  baseSeed: number = Date.now(),
  rules: GameRules | null = null,
  bots: SimulatedBotConfig[] = [],
  rotateSeats: boolean = true
): MatchSeriesResult {
  ensureWasmReady();
  const json = wasm_simulate_match_series(
    numGames,
    baseSeed,
    rules ? safeWasmJsonStringify(rules) : null,
    safeWasmJsonStringify(bots),
    rotateSeats
  );
  return JSON.parse(json);
}

function convertBotsToMapObject(
  botsInput: Map<string, BotEntity> | Record<string, BotEntity> | BotEntity[]
): Record<string, unknown> {
  if (botsInput instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of botsInput.entries()) {
      obj[k] = {
        id: v.id,
        name: v.name,
        avatar: v.avatar,
        elo: v.elo,
        memoryDepth: v.memoryDepth
      };
    }
    return obj;
  }
  if (Array.isArray(botsInput)) {
    const obj: Record<string, unknown> = {};
    for (const b of botsInput) {
      if (b && b.id) {
        obj[b.id] = {
          id: b.id,
          name: b.name,
          avatar: b.avatar,
          elo: b.elo,
          memoryDepth: b.memoryDepth
        };
      }
    }
    return obj;
  }
  return botsInput;
}

export function wasmSimulateSingleTable(
  table: TableGroup,
  botsInput: Map<string, BotEntity> | Record<string, BotEntity> | BotEntity[],
  seed: number = Math.floor(Math.random() * 1_000_000_000),
  timestamp: number = Date.now()
): SimulatedTableResult {
  ensureWasmReady();
  const botsObj = convertBotsToMapObject(botsInput);
  const json = wasm_simulate_single_table(
    safeWasmJsonStringify(table),
    safeWasmJsonStringify(botsObj),
    seed,
    timestamp
  );
  return JSON.parse(json);
}

export function wasmSimulateTablesBatch(
  tables: TableGroup[],
  botsInput: Map<string, BotEntity> | Record<string, BotEntity> | BotEntity[],
  baseSeed: number = Math.floor(Math.random() * 1_000_000_000),
  timestamp: number = Date.now()
): {
  tableResults: SimulatedTableResult[];
  allNews: EcosystemNewsItem[];
} {
  ensureWasmReady();
  const botsObj = convertBotsToMapObject(botsInput);
  const json = wasm_simulate_tables_batch(
    safeWasmJsonStringify(tables),
    safeWasmJsonStringify(botsObj),
    baseSeed,
    timestamp
  );
  return JSON.parse(json);
}

export function wasmPartitionHand(
  cards: readonly Card[],
  optimality: number = 1.0
): HandPartition {
  ensureWasmReady();
  const json = wasm_partition_hand(safeWasmJsonStringify(cards), optimality);
  return JSON.parse(json);
}
