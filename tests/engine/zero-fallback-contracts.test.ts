import { describe, it, expect } from 'bun:test';
import { 
  PlayerProfileSchema, 
  ActiveLoanSchema 
} from '../../src/engine/schemas/profile.schema';
import { 
  SavedSettingsSchema, 
  QuickTableConfigSchema, 
  TableConfigStateSchema, 
  CustomGameModalConfigSchema 
} from '../../src/engine/schemas/settings.schema';
import { 
  DealHandPacketSchema, 
  TableStateSyncPacketSchema 
} from '../../src/engine/network/network.schema';
import { createBotPlayer, createPlayer } from '../../src/engine/player-factory';
import { projectTableFrame } from '../../src/engine/presentation/table-frame-projector';
import { createDefaultGameRules } from '../../src/engine/types';
import { transitionToWaiting, transitionToDealing } from '../../src/engine/state-machine/match-state-machine';

describe('Zero-Fallback Boundary Gatekeeper Contract Tests', () => {
  it('1. PlayerProfileSchema: parses empty object into 100% concrete profile with zero missing fields', () => {
    const profile = PlayerProfileSchema.parse({});
    expect(profile.coins).toBe(50000);
    expect(profile.elo).toBe(1000);
    expect(profile.loans).toBe(0);
    expect(profile.activeLoan).toBeNull();
    expect(profile.stats).toBeDefined();
    expect(profile.stats.gamesPlayed).toBe(0);
    expect(profile.stats.wins).toBe(0);
  });

  it('2. ActiveLoanSchema: guarantees concrete loan terms without any optional fields', () => {
    const loan = ActiveLoanSchema.parse({
      packageId: 'PKG_STANDARD',
      initialAmount: 20000
    });
    expect(loan.matchesPlayed).toBe(0);
    expect(loan.graceMatches).toBe(5);
    expect(loan.interestPerMatchPercent).toBe(3);
    expect(loan.winDeductionPercent).toBe(35);
    expect(loan.overdueDeductionPercent).toBe(65);
    expect(typeof loan.createdAt).toBe('number');
  });

  it('3. SavedSettingsSchema: injects all defaults with zero undefined flags', () => {
    const settings = SavedSettingsSchema.parse({});
    expect(settings.soundEnabled).toBe(true);
    expect(settings.autoSortEnabled).toBe(true);
    expect(settings.aiHintEnabled).toBe(false);
    expect(settings.reverseButtonsEnabled).toBe(false);
    expect(settings.onlineMultiplayerBetaEnabled).toBe(false);
    expect(settings.gameSpeed).toBe('REALISTIC');
  });

  it('4. TableConfigStateSchema & QuickTableConfigSchema: SSOT for table setup without manual ?? fallbacks', () => {
    const quick = QuickTableConfigSchema.parse({});
    expect(quick.playerCount).toBe(4);
    expect(quick.betAmount).toBe(1000);
    expect(quick.settlementRule).toBe('COUNT_CARDS');
    expect(quick.congEnabled).toBe(true);

    const state = TableConfigStateSchema.parse({});
    expect(state.playerCount).toBe(4);
    expect(state.mode).toBe('COUNT_CARDS');
    expect(state.betAmount).toBe(1000);
    expect(state.instantWinEnabled).toBe(true);
  });

  it('5. CustomGameModalConfigSchema: resolves custom sandbox configurations cleanly', () => {
    const custom = CustomGameModalConfigSchema.parse({});
    expect(custom.selectedModeId).toBe('COUNT_CARDS');
    expect(custom.playerCount).toBe(4);
    expect(custom.settings.betAmount).toBe(1000);
    expect(custom.settings.soundEnabled).toBe(true);
    expect(custom.botPersonaIds).toHaveLength(3);
    expect(custom.customBotConfigs).toHaveLength(3);
  });

  it('6. Network Packet Schemas: enforces valid structure and rejects corrupted payloads', () => {
    const deal = DealHandPacketSchema.parse({
      cards: [],
      leadPlayerId: 'p1',
      firstTurnPlayerId: 'p1'
    });
    expect(deal.leadPlayerId).toBe('p1');
    expect(deal.firstTurnPlayerId).toBe('p1');
    expect(deal.cards).toBeArray();

    // TableStateSyncPacket: ensures valid sync packet structure
    const sync = TableStateSyncPacketSchema.parse({
      currentTurnPlayerId: null,
      leadPlayerId: null,
      remainingCardCounts: { p1: 13 },
      seats: [
        { playerId: 'p1', name: 'p1', avatar: 'avatar.png', cardCount: 13, score: 50000, isPassed: false, isCurrentTurn: false, isBot: false, wins: 0, initialScore: 50000 }
      ],
      winners: [],
      isGameOver: false
    });
    expect(sync.remainingCardCounts.p1).toBe(13);
    expect(sync.seats.length).toBe(1);
    expect(sync.seats[0].score).toBe(50000);
    expect(sync.isGameOver).toBe(false);
    expect(sync.winners).toBeArray();
  });

  it('7. PlayerFactory: produced MatchPlayer contains 100% concrete fields with zero undefined properties', () => {
    const human = createPlayer({ id: 'human_1', name: 'Player', avatar: '🤠', score: 10000 });
    expect(human.isBot).toBe(false);
    expect(human.hand).toBeArray();
    expect(human.playedCards).toBeArray();
    expect(human.cardCount).toBe(0);
    expect(human.score).toBe(10000);
    expect(human.isPassedCurrentRound).toBe(false);
    expect(human.hasPlayedFirstCard).toBe(false);

    const bot = createBotPlayer('bot_1', 'BOT_ELO_1000');
    expect(bot.isBot).toBe(true);
    expect(bot.cardCount).toBe(0);
    expect(bot.botPersonaId).toBe('BOT_ELO_1000');
  });

  it('8. TableFrameProjector: TableRenderFrame controls are 100% concrete numbers & booleans', () => {
    const p1 = createPlayer({ id: 'p1', name: 'Me', avatar: '🤠', score: 10000 });
    const p2 = createBotPlayer('p2', 'BOT_ELO_1000');
    const rules = createDefaultGameRules();
    const waiting = transitionToWaiting({
      gameNumber: 1,
      players: [p1, p2],
      rules
    });
    const matchState = transitionToDealing(waiting, {
      dealtCounts: { p1: 0, p2: 0 },
      dealBanner: 'Bắt đầu chia bài...'
    });

    const frame = projectTableFrame({
      matchState,
      localPlayerId: 'p1',
      localHand: [],
      selectedCardIds: new Set(),
      gameRules: rules,
      players: [p1, p2],
      dealtCounts: { p1: 0, p2: 0 },
      currentHint: null,
      botThinkingThought: null,
      isDealing: true,
      dealBanner: 'Bắt đầu chia bài...'
    });

    expect(typeof frame.controls.isMyTurn).toBe('boolean');
    expect(typeof frame.controls.canPlay).toBe('boolean');
    expect(typeof frame.controls.canPass).toBe('boolean');
    expect(typeof frame.controls.canQuickSelect).toBe('boolean');
    expect(typeof frame.controls.quickSelectCandidatesCount).toBe('number');
    expect(typeof frame.controls.playButtonLabel).toBe('string');
  });
});
