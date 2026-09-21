import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useGameTableScreenLogic, type GameTableScreenLogicResult } from '../../src/ui/hooks/useGameTableScreenLogic';
import { useGameStore } from '../../src/stores/useGameStore';
import { createCard } from '../../src/engine/card';
import { createDefaultGameRules } from '../../src/engine/types';
import { createPlayingTurnMatchState } from '../../src/engine/state-machine/types';

describe('useGameTableScreenLogic (Dumb View Presentation Hook)', () => {
  const localPlayerId = useGameStore.getState().myPlayerId;
  const botId = 'BOT_TEST_OPPONENT';
  const rules = createDefaultGameRules();

  const mockPlayers = [
    {
      id: localPlayerId,
      name: 'Local Tester',
      avatar: 'av1.png',
      hand: [createCard(3, 'SPADES'), createCard(4, 'HEARTS')],
      cardCount: 2,
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false,
      isBot: false as const
    },
    {
      id: botId,
      name: 'Bot Tester',
      avatar: 'av2.png',
      hand: [createCard(5, 'SPADES'), createCard(6, 'DIAMONDS')],
      cardCount: 2,
      playedCards: [],
      score: 1000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false,
      isBot: true as const,
      botPersonaId: 'BOT_ELO_1150'
    }
  ];

  it('should cleanly derive controls from Engine Frame without any React-side validator logic', () => {
    const store = useGameStore.getState();
    store.setPlayers(mockPlayers);
    store.setGameRules(rules);
    store.setSelectedCardIds(new Set(['3_SPADES']));

    const card3S = createCard(3, 'SPADES');
    const playingState = createPlayingTurnMatchState({
      status: 'PLAYING',
      gameNumber: 1,
      roundNumber: 1,
      players: mockPlayers,
      currentTurnPlayerId: localPlayerId,
      leadPlayerId: localPlayerId,
      leadingMove: null,
      roundMoves: [],
      passedPlayerIds: [],
      isLeadMove: true,
      isFirstMoveOfGame: true,
      firstMoveRequiredCard: card3S,
      chopNotification: null,
      botThinkingThought: null,
      rules
    });
    store.applyMatchState(playingState);

    let hookResult: GameTableScreenLogicResult | null = null;
    const TestComp = () => {
      hookResult = useGameTableScreenLogic({
        onPlaySelectedCards: () => {},
        onPassTurn: () => {}
      });
      return null;
    };
    renderToString(React.createElement(TestComp));

    expect(hookResult).not.toBeNull();
    expect(hookResult!.isMyTurn).toBe(true);
    expect(hookResult!.isValidPlaySelection).toBe(true);
    expect(hookResult!.canPassTurn).toBe(false); // First move cannot pass
  });

  it('should report isValidPlaySelection = false when not players turn', () => {
    const store = useGameStore.getState();
    store.setPlayers(mockPlayers);
    store.setGameRules(rules);
    store.setSelectedCardIds(new Set(['3_SPADES']));

    const playingState = createPlayingTurnMatchState({
      status: 'PLAYING',
      gameNumber: 1,
      roundNumber: 1,
      players: mockPlayers,
      currentTurnPlayerId: botId,
      leadPlayerId: botId,
      leadingMove: null,
      roundMoves: [],
      passedPlayerIds: [],
      isLeadMove: true,
      isFirstMoveOfGame: false,
      firstMoveRequiredCard: null,
      chopNotification: null,
      botThinkingThought: null,
      rules
    });
    store.applyMatchState(playingState);

    let hookResult: GameTableScreenLogicResult | null = null;
    const TestComp = () => {
      hookResult = useGameTableScreenLogic({
        onPlaySelectedCards: () => {},
        onPassTurn: () => {}
      });
      return null;
    };
    renderToString(React.createElement(TestComp));

    expect(hookResult).not.toBeNull();
    expect(hookResult!.isMyTurn).toBe(false);
    expect(hookResult!.isValidPlaySelection).toBe(false);
    expect(hookResult!.canPassTurn).toBe(false);
  });
});
