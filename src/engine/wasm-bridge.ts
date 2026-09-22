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
  wasm_check_instant_win
} from './wasm/pkg/tien_len_core.js';
import type { Card, Combination, MatchPlayer, GameRules, InstantWinType } from './types';
import type { MatchState } from './state-machine/types';
import type { SmartCardGroup } from './hand-sorter';

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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
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
  const json = wasm_identify_combination(JSON.stringify(cards));
  return JSON.parse(json);
}

function serializeCombination(c: Combination): string {
  const cards = c.cards ?? [];
  const highestCard = c.highestCard ?? (cards.length > 0 ? cards[cards.length - 1] : undefined);
  const length = c.length ?? cards.length;
  return JSON.stringify({
    type: c.type,
    length,
    cards,
    highestCard
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
    JSON.stringify(players),
    JSON.stringify(rules),
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
    JSON.stringify(state),
    playerId,
    JSON.stringify(cardIds)
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
    JSON.stringify(state),
    playerId,
    JSON.stringify(cardIds),
    timestamp
  );
  return JSON.parse(json);
}

export function wasmPassTurn(state: MatchState, playerId: string): MatchState {
  ensureWasmReady();
  const json = wasm_pass_turn(JSON.stringify(state), playerId);
  return JSON.parse(json);
}

export function wasmSortSmartGroups(cards: readonly Card[], variantIndex: number = 0): SmartCardGroup[] {
  ensureWasmReady();
  const json = wasm_sort_smart_groups(JSON.stringify(cards), variantIndex);
  return JSON.parse(json);
}

export function wasmDecideBotMove(
  hand: readonly Card[],
  state: MatchState,
  botId: string
): Card[] | null {
  ensureWasmReady();
  const json = wasm_decide_bot_move(
    JSON.stringify(hand),
    JSON.stringify(state),
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
    JSON.stringify(hand),
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
  const json = wasm_check_instant_win(JSON.stringify(hand), isFirstGame);
  return JSON.parse(json);
}

export function wasmDealCards(deck: readonly Card[], playerCount: number = 4): Card[][] {
  ensureWasmReady();
  const json = wasm_deal_cards(JSON.stringify(deck), playerCount);
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
    JSON.stringify(players),
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
    JSON.stringify(players),
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
    JSON.stringify(players),
    JSON.stringify(winners),
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
    JSON.stringify(hand),
    target ? JSON.stringify(target) : null,
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
  metrics?: any
): any {
  ensureWasmReady();
  const json = wasm_calculate_elo_delta(
    rankPosition,
    playerElo,
    opponentsAvgElo,
    totalPlayers,
    metrics ? JSON.stringify(metrics) : null
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
  allEloBreakdowns: Record<string, any>;
} {
  ensureWasmReady();
  const json = wasm_compute_table_elo_settlement(
    JSON.stringify(params.players),
    JSON.stringify(params.winners),
    JSON.stringify(params.playerElos),
    JSON.stringify(params.chopsByPlayer),
    JSON.stringify(params.gotChoppedByPlayer),
    JSON.stringify(params.streaksByPlayer),
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
    JSON.stringify(botHand),
    JSON.stringify(candidateMoves),
    JSON.stringify(playedCardIds),
    JSON.stringify(remainingCards),
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
    JSON.stringify(hand),
    leadingCombo ? JSON.stringify(leadingCombo) : null,
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
    rules ? JSON.stringify(rules) : null,
    JSON.stringify(bots),
    rotateSeats
  );
  return JSON.parse(json);
}


