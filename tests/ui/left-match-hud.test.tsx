import { describe, expect, it } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LeftMatchHUD } from '../../src/ui/web/components/LeftMatchHUD';
import { createPlayer } from '../../src/engine/player-factory';
import { useGameStore } from '../../src/stores/useGameStore';

describe('LeftMatchHUD Component Tests', () => {
  it('1. Render an toàn không quăng lỗi ReferenceError khi chưa có frame', () => {
    const p1 = createPlayer({ id: 'human_1', name: 'Player 1', avatar: '🤠', isBot: false });
    const p2 = createPlayer({ id: 'bot_1', name: 'Bot 1', avatar: '🤖', isBot: true, botPersonaId: 'bot_1' });

    useGameStore.setState({
      myPlayerId: 'human_1',
      currentFrame: null,
      winners: [],
      playerWins: {}
    });

    const html = renderToString(
      <LeftMatchHUD
        players={[p1, p2]}
        currentTurnPlayerId="human_1"
        leadPlayerId="human_1"
        gameNumber={1}
        betAmount={1000}
        isDealing={false}
        dealtCounts={{ human_1: 13, bot_1: 13 }}
        aiHint={null}
        isHumanTurn={true}
        aiHintEnabled={true}
      />
    );

    expect(html).toContain('Player 1');
    expect(html).toContain('Bot 1');
  });

  it('2. Render chính xác với dữ liệu từ Server Frame (playerWins & netProfit)', () => {
    const p1 = createPlayer({ id: 'human_1', name: 'Player 1', avatar: '🤠', isBot: false, score: 55000 });
    const p2 = createPlayer({ id: 'bot_1', name: 'Bot 1', avatar: '🤖', isBot: true, botPersonaId: 'BOT_ELO_1000', score: 45000 });

    useGameStore.setState({
      myPlayerId: 'human_1',
      winners: [{ id: 'human_1', name: 'Player 1' }],
      playerWins: { human_1: 2, bot_1: 1 },
      currentFrame: {
        gameNumber: 2,
        status: 'PLAYING',
        betAmount: 1000,
        localPlayerId: 'human_1',
        seats: [
          {
            seatIndex: 0,
            playerId: 'human_1',
            name: 'Player 1',
            avatar: '🤠',
            cardCount: 5,
            isCurrentTurn: true,
            isPassed: false,
            isLocal: true,
            isBot: false,
            botPersonaId: null,
            statusText: 'Lượt của bạn',
            score: 55000,
            wins: 2,
            initialScore: 50000,
            netProfit: 5000
          },
          {
            seatIndex: 1,
            playerId: 'bot_1',
            name: 'Bot 1',
            avatar: '🤖',
            cardCount: 8,
            isCurrentTurn: false,
            isPassed: false,
            isLocal: false,
            isBot: true,
            botPersonaId: 'bot_1',
            statusText: null,
            score: 45000,
            wins: 1,
            initialScore: 50000,
            netProfit: -5000
          }
        ],
        myHand: [],
        discardPile: null,
        controls: {
          isMyTurn: true,
          canPlay: false,
          canPass: false,
          canQuickSelect: false,
          quickSelectCandidatesCount: 0,
          playButtonLabel: 'Đánh'
        },
        activeBanner: null,
        dealBanner: null,
        isDealing: false,
        dealtCounts: { human_1: 5, bot_1: 8 },
        isGameOver: false,
        winners: [{ id: 'human_1', name: 'Player 1' }],
        aiHint: null,
        botThinkingThought: null,
        turnDeadline: null,
        openingReason: null,
        lastAction: null,
        playerWins: { human_1: 2, bot_1: 1 },
        initialScores: { human_1: 50000, bot_1: 50000 }
      }
    });

    const html = renderToString(
      <LeftMatchHUD
        players={[p1, p2]}
        currentTurnPlayerId="human_1"
        leadPlayerId="human_1"
        gameNumber={2}
        betAmount={1000}
        isDealing={false}
        dealtCounts={{ human_1: 5, bot_1: 8 }}
        aiHint={null}
        isHumanTurn={true}
        aiHintEnabled={true}
      />
    );

    // Hiển thị số ván thắng và số tiền thắng ròng
    expect(html).toContain('5,000');
    expect(html).toContain('Player 1');
    expect(html).toContain('2 ván thắng');
    expect(html).toContain('1 ván thắng');
  });
});
