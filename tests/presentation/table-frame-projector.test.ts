import { describe, it, expect } from 'bun:test';
import { projectTableFrame } from '../../src/engine/presentation/table-frame-projector';
import { createDefaultGameRules, createPlayedMove } from '../../src/engine/types';
import { createCard } from '../../src/engine/card';
import { identifyCombination } from '../../src/engine/combinations';
import {
  createPlayingTurnMatchState,
  type WaitingMatchState
} from '../../src/engine/state-machine/types';

describe('TableFrameProjector (Pure Game Engine Projector)', () => {
  const localPlayerId = 'LOCAL_P1';
  const botId = 'BOT_P2';
  const rules = createDefaultGameRules();

  const players = [
    {
      id: localPlayerId,
      name: 'Player 1',
      avatar: 'avatar1.png',
      hand: [createCard(3, 'SPADES'), createCard(4, 'HEARTS'), createCard(15, 'HEARTS')],
      cardCount: 3,
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false,
      isBot: false as const
    },
    {
      id: botId,
      name: 'Bot 2',
      avatar: 'avatar2.png',
      hand: [createCard(5, 'SPADES'), createCard(6, 'DIAMONDS')],
      cardCount: 2,
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false,
      isBot: true as const,
      botPersonaId: 'BOT_ELO_1150' as const
    }
  ];

  it('should project canPlay = true when local player selects a valid card on their turn', () => {
    const card3S = createCard(3, 'SPADES');
    const playingState = createPlayingTurnMatchState({
      status: 'PLAYING',
      gameNumber: 1,
      roundNumber: 1,
      players,
      rules,
      roundMoves: [],
      currentTurnPlayerId: localPlayerId,
      leadPlayerId: localPlayerId,
      leadingMove: null,
      passedPlayerIds: [],
      isLeadMove: true,
      isFirstMoveOfGame: true,
      firstMoveRequiredCard: card3S,
      chopNotification: null,
      botThinkingThought: null
    });

    const defaultContextParams = {
      dealtCounts: {},
      currentHint: null,
      botThinkingThought: null,
      isDealing: false,
      dealBanner: null
    };

    const frame = projectTableFrame({
      matchState: playingState,
      localPlayerId,
      localHand: players[0].hand,
      selectedCardIds: new Set(['3_SPADES']),
      gameRules: rules,
      players,
      ...defaultContextParams
    });

    expect(frame.controls.isMyTurn).toBe(true);
    expect(frame.controls.canPlay).toBe(true);
    expect(frame.controls.canPass).toBe(false); // First move cannot pass
    expect(frame.controls.playButtonLabel).toBe('Đánh (1 lá)');
  });

  it('should project canPlay = false when selecting card without 3 of Spades on required first move', () => {
    const card3S = createCard(3, 'SPADES');
    const playingState = createPlayingTurnMatchState({
      status: 'PLAYING',
      gameNumber: 1,
      roundNumber: 1,
      players,
      rules,
      roundMoves: [],
      currentTurnPlayerId: localPlayerId,
      leadPlayerId: localPlayerId,
      leadingMove: null,
      passedPlayerIds: [],
      isLeadMove: true,
      isFirstMoveOfGame: true,
      firstMoveRequiredCard: card3S,
      chopNotification: null,
      botThinkingThought: null
    });

    const frame = projectTableFrame({
      matchState: playingState,
      localPlayerId,
      localHand: players[0].hand,
      selectedCardIds: new Set(['4_HEARTS']),
      gameRules: rules,
      players,
      dealtCounts: {},
      currentHint: null,
      botThinkingThought: null,
      isDealing: false,
      dealBanner: null
    });

    expect(frame.controls.isMyTurn).toBe(true);
    expect(frame.controls.canPlay).toBe(false);
  });

  it('should project canPlay = false when it is not local player turn', () => {
    const playingState = createPlayingTurnMatchState({
      status: 'PLAYING',
      gameNumber: 1,
      roundNumber: 1,
      players,
      rules,
      roundMoves: [],
      currentTurnPlayerId: botId,
      leadPlayerId: botId,
      leadingMove: null,
      passedPlayerIds: [],
      isLeadMove: true,
      isFirstMoveOfGame: false,
      firstMoveRequiredCard: null,
      chopNotification: null,
      botThinkingThought: null
    });

    const frame = projectTableFrame({
      matchState: playingState,
      localPlayerId,
      localHand: players[0].hand,
      selectedCardIds: new Set(['3_SPADES']),
      gameRules: rules,
      players,
      dealtCounts: {},
      currentHint: null,
      botThinkingThought: null,
      isDealing: false,
      dealBanner: null
    });

    expect(frame.controls.isMyTurn).toBe(false);
    expect(frame.controls.canPlay).toBe(false);
    expect(frame.controls.canPass).toBe(false);
  });

  it('should maintain Fog of War: opponents hand is never leaked in seats render model', () => {
    const waitingState: WaitingMatchState = {
      status: 'WAITING',
      gameNumber: 1,
      players,
      rules,
      lastWinnerId: null
    };
    const frame = projectTableFrame({
      matchState: waitingState,
      localPlayerId,
      localHand: players[0].hand,
      selectedCardIds: new Set(),
      gameRules: rules,
      players,
      dealtCounts: {},
      currentHint: null,
      botThinkingThought: null,
      isDealing: false,
      dealBanner: null
    });

    const botSeat = frame.seats.find(s => s.playerId === botId);
    expect(botSeat).toBeDefined();
    expect(botSeat?.cardCount).toBe(2);
    expect(botSeat?.botPersonaId).toBe('BOT_ELO_1150');
    // Ensure no 'hand' field exists on SeatRenderModel
    expect((botSeat as any).hand).toBeUndefined();
  });

  it('should project label "Chặt!" when playing Four of a Kind against a 2', () => {
    const card2H = createCard(15, 'HEARTS');
    const combo2 = identifyCombination([card2H])!;
    const leadingMove = createPlayedMove(botId, combo2);

    const quadHand = [
      createCard(8, 'SPADES'),
      createCard(8, 'CLUBS'),
      createCard(8, 'DIAMONDS'),
      createCard(8, 'HEARTS')
    ];

    const playingState = createPlayingTurnMatchState({
      status: 'PLAYING',
      gameNumber: 1,
      roundNumber: 1,
      players,
      rules,
      roundMoves: [leadingMove],
      currentTurnPlayerId: localPlayerId,
      leadPlayerId: botId,
      leadingMove,
      passedPlayerIds: [],
      isLeadMove: false,
      isFirstMoveOfGame: false,
      firstMoveRequiredCard: null,
      chopNotification: null,
      botThinkingThought: null
    });

    const frame = projectTableFrame({
      matchState: playingState,
      localPlayerId,
      localHand: quadHand,
      selectedCardIds: new Set(['8_SPADES', '8_CLUBS', '8_DIAMONDS', '8_HEARTS']),
      gameRules: rules,
      players: [
        { ...players[0], hand: quadHand, cardCount: quadHand.length },
        players[1]
      ],
      dealtCounts: {},
      currentHint: null,
      botThinkingThought: null,
      isDealing: false,
      dealBanner: null
    });

    expect(frame.controls.canPlay).toBe(true);
    expect(frame.controls.playButtonLabel).toBe('Chặt!');
  });
});
