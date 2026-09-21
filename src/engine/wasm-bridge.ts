import __wbg_init, {
  initSync,
  wasm_create_deck,
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
  wasm_calculate_rotten_penalty
} from './wasm/pkg/tien_len_core.js';
import type { Card, Combination, MatchPlayer, GameRules } from './types';
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
  if (!isInitialized) {
    throw new Error('[WasmBridge] Rust WebAssembly engine is not initialized. Call await initWasmCore() before executing engine commands.');
  }
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

export function wasmCanBeat(candidate: Combination, target: Combination): boolean {
  ensureWasmReady();
  return wasm_can_beat(JSON.stringify(candidate), JSON.stringify(target));
}

export function wasmCanChop(
  candidate: Combination,
  target: Combination,
  allowThreePairs: boolean = true,
  allowQuads: boolean = true
): boolean {
  ensureWasmReady();
  return wasm_can_chop(
    JSON.stringify(candidate),
    JSON.stringify(target),
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
    JSON.stringify(target),
    JSON.stringify(candidate),
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
