import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useGameTableScreenLogic, type GameTableScreenLogicResult } from '../../src/ui/hooks/useGameTableScreenLogic';
import { useGameStore } from '../../src/stores/useGameStore';
import { createCard } from '../../src/engine/card';
import { createDefaultGameRules } from '../../src/engine/types';
import { createPlayingTurnMatchState } from '../../src/engine/state-machine/types';
import { projectTableFrame } from '../../src/engine/presentation/table-frame-projector';

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

  it('should toggle and clear card selections via handleToggleCardSelect and handleClearCardSelection', () => {
    useGameStore.getState().clearCardSelection();
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
    hookResult!.handleToggleCardSelect('3_SPADES');
    expect(useGameStore.getState().selectedCardIds.has('3_SPADES')).toBe(true);

    hookResult!.handleToggleCardSelect('3_SPADES');
    expect(useGameStore.getState().selectedCardIds.has('3_SPADES')).toBe(false);

    hookResult!.handleToggleCardSelect('4_HEARTS');
    expect(useGameStore.getState().selectedCardIds.has('4_HEARTS')).toBe(true);

    hookResult!.handleClearCardSelection();
    expect(useGameStore.getState().selectedCardIds.size).toBe(0);
  });

  it('should directly consume currentFrame when available in store (Passive Dumb View optimization)', () => {
    const store = useGameStore.getState();
    store.setPlayers(mockPlayers);
    store.clearCardSelection();

    const baseFrame = projectTableFrame({
      matchState: store.matchState,
      localPlayerId: mockPlayers[0].id,
      localHand: mockPlayers[0].hand,
      selectedCardIds: store.selectedCardIds,
      gameRules: rules,
      players: store.players,
      dealtCounts: {},
      currentHint: null,
      botThinkingThought: null,
      isDealing: false,
      dealBanner: null
    });
    const mockFrame = {
      ...baseFrame,
      dealBanner: 'UNIQUE_PASSIVE_DUMB_VIEW_BANNER',
      controls: {
        ...baseFrame.controls,
        isMyTurn: true,
        canPlay: true,
        canQuickSelect: true
      }
    };

    store.setCurrentFrame(mockFrame);

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
    expect(hookResult!.dealBanner).toBe('UNIQUE_PASSIVE_DUMB_VIEW_BANNER');
    expect(hookResult!.isMyTurn).toBe(true);
    expect(hookResult!.isValidPlaySelection).toBe(true);
    expect(hookResult!.canQuickSelect).toBe(true);

    store.setCurrentFrame(null);
  });

  it('should cleanly deliver botThinkingThought to BotSeat and render thought bubble even when previous winners exist', async () => {
    const { BotSeat } = await import('../../src/ui/components/BotSeat');
    const store = useGameStore.getState();
    store.setPlayers(mockPlayers);
    // Giả lập ván trước bot thắng (winners chứa botId) nhưng ván mới đang chơi (isGameOver = false)
    store.setWinners([mockPlayers[1]]);
    useGameStore.setState({ isGameOver: false });

    // Bot đang suy nghĩ
    store.setBotThinkingThought({
      botId: botId,
      text: '🤔 Đang suy nghĩ...'
    });

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
    expect(hookResult!.botThinkingThought).toEqual({
      botId: botId,
      text: '🤔 Đang suy nghĩ...'
    });

    // Render BotSeat của Bot và đảm bảo bong bóng suy nghĩ hiển thị trọn vẹn
    const botHtml = renderToString(
      React.createElement(BotSeat, {
        player: mockPlayers[1],
        isCurrentTurn: true,
        position: 'top',
        isLeader: false,
        isDealing: false,
        displayCardCount: 2,
        thoughtText: hookResult!.botThinkingThought?.botId === botId ? hookResult!.botThinkingThought.text : null,
        cardFanPlacement: 'side',
        cardScale: 'normal'
      })
    );

    expect(botHtml).toContain('🤔 Đang suy nghĩ...');

    // Dọn sạch state
    store.setBotThinkingThought(null);
    store.setWinners([]);
  });
});
