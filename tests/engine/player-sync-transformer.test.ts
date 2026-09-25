import { describe, it, expect } from 'bun:test';
import { 
  syncStorePlayersFromFrame, 
  createPlayer,
  cloneMatchPlayer,
  cloneMatchPlayers,
  updatePlayerInList,
  updatePlayersHand,
  revealPlayersHands,
  maskOpponentHands,
  resetPlayersForNewGame
} from '../../src/engine/player-factory';
import { createCard } from '../../src/engine/card';
import { projectTableFrame } from '../../src/engine/presentation/table-frame-projector';
import { createPlayingTurnMatchState } from '../../src/engine/state-machine/types';
import { createDefaultGameRules } from '../../src/engine/types';

describe('Player Sync Transformers (Single Source of Truth)', () => {
  const localId = 'usr_local';
  const opponentId = 'usr_opponent';

  const card3S = createCard(3, 'SPADES');
  const card4H = createCard(4, 'HEARTS');
  const card5D = createCard(5, 'DIAMONDS');

  const initialPlayers = [
    createPlayer({ id: localId, name: 'Me', hand: [card3S, card4H], cardCount: 2 }),
    createPlayer({ id: opponentId, name: 'Opponent', hand: [], cardCount: 13, isBot: true, botPersonaId: 'BOT_ELO_1150' })
  ];


  describe('syncStorePlayersFromFrame', () => {
    it('Đồng bộ mượt mà từ TableRenderFrame vào Store (isPassed, cardCount, myHand)', () => {
      const mockMatchState = createPlayingTurnMatchState({
        status: 'PLAYING',
        gameNumber: 1,
        roundNumber: 1,
        players: initialPlayers,
        rules: createDefaultGameRules(),
        roundMoves: [],
        currentTurnPlayerId: localId,
        leadPlayerId: localId,
        leadingMove: null,
        passedPlayerIds: [opponentId],
        isLeadMove: true,
        isFirstMoveOfGame: false,
        firstMoveRequiredCard: null,
        chopNotification: null,
        botThinkingThought: null
      });

      const mockFrame = projectTableFrame({
        matchState: mockMatchState,
        localPlayerId: localId,
        localHand: [card3S, card4H],
        selectedCardIds: new Set([card4H.id]),
        gameRules: createDefaultGameRules(),
        players: [
          initialPlayers[0],
          { ...initialPlayers[1], isPassedCurrentRound: true, cardCount: 8 }
        ],
        dealtCounts: { [localId]: 2, [opponentId]: 8 },
        currentHint: null,
        botThinkingThought: null,
        isDealing: false,
        dealBanner: null
      });

      const synced = syncStorePlayersFromFrame(initialPlayers, mockFrame, mockMatchState);

      const me = synced.find(p => p.id === localId)!;
      const opp = synced.find(p => p.id === opponentId)!;

      expect(me.hand.map(c => c.id)).toEqual([card3S.id, card4H.id]);
      expect(me.cardCount).toBe(2);
      expect(me.isPassedCurrentRound).toBe(false);

      expect(opp.hand).toEqual([]);
      expect(opp.cardCount).toBe(8);
      expect(opp.isPassedCurrentRound).toBe(true);
    });
  });

  describe('Single Source of Truth Mutation & Helper Transformers', () => {
    it('cloneMatchPlayer & cloneMatchPlayers: Đảm bảo tính bất biến (Immutability) và tự động đồng bộ cardCount khi đổi hand', () => {
      const original = initialPlayers[0];
      const cloned = cloneMatchPlayer(original, { hand: [card5D] });

      expect(cloned).not.toBe(original);
      expect(cloned.hand).not.toBe(original.hand);
      expect(cloned.hand.map(c => c.id)).toEqual([card5D.id]);
      expect(cloned.cardCount).toBe(1); // Auto synced to hand.length
      expect(original.cardCount).toBe(2);

      const listCloned = cloneMatchPlayers(initialPlayers);
      expect(listCloned).toHaveLength(2);
      expect(listCloned[0]).not.toBe(initialPlayers[0]);
      expect(listCloned[1]).not.toBe(initialPlayers[1]);
    });

    it('updatePlayerInList & updatePlayersHand: Cập nhật an toàn một người chơi và tự động đồng bộ cardCount', () => {
      const updated = updatePlayersHand(initialPlayers, localId, [card3S, card4H, card5D]);
      const me = updated.find(p => p.id === localId)!;
      const opp = updated.find(p => p.id === opponentId)!;

      expect(me.hand).toHaveLength(3);
      expect(me.cardCount).toBe(3);
      expect(opp).toBe(initialPlayers[1]); // Unchanged opponent

      // Thử update bằng hàm callback
      const withStatus = updatePlayerInList(updated, localId, () => ({
        isPassedCurrentRound: true
      }));
      expect(withStatus.find(p => p.id === localId)?.isPassedCurrentRound).toBe(true);
    });

    it('revealPlayersHands: Tiết lộ bài đối thủ khi ván kết thúc (Game Over), đồng bộ hand và cardCount', () => {
      const revealedMap = {
        [opponentId]: [card5D]
      };
      const revealed = revealPlayersHands(initialPlayers, revealedMap);
      const opp = revealed.find(p => p.id === opponentId)!;

      expect(opp.hand.map(c => c.id)).toEqual([card5D.id]);
      expect(opp.cardCount).toBe(1);
    });

    it('maskOpponentHands: Áp dụng chuẩn Fog-of-War, giữ nguyên bài mình và che bài đối thủ', () => {
      const playersWithCards = [
        createPlayer({ id: localId, hand: [card3S], cardCount: 1 }),
        createPlayer({ id: opponentId, hand: [card4H, card5D], cardCount: 2, isBot: true, botPersonaId: 'BOT_ELO_1150' })
      ];

      const masked = maskOpponentHands(playersWithCards, localId);
      const me = masked.find(p => p.id === localId)!;
      const opp = masked.find(p => p.id === opponentId)!;

      expect(me.hand.map(c => c.id)).toEqual([card3S.id]);
      expect(me.cardCount).toBe(1);

      expect(opp.hand).toEqual([]);
      expect(opp.cardCount).toBe(2); // Card count preserved!
    });

    it('resetPlayersForNewGame: Reset sạch sẽ toàn bộ playedCards, isPassed, che bài đối thủ và cấp 13 lá cho ván mới', () => {
      // Giả lập trạng thái người chơi sau khi kết thúc Ván 1:
      // - localId: đã đánh hết bài (hand = [], cardCount = 0, playedCards = 13 lá, isPassed = false)
      // - opponentId: thua cuộc, bị lật bài (hand = [card4H, card5D], cardCount = 2, isPassed = true, playedCards = 11 lá)
      const endOfGamePlayers = [
        createPlayer({ 
          id: localId, 
          hand: [], 
          cardCount: 0, 
          playedCards: [card3S], 
          isPassedCurrentRound: false 
        }),
        createPlayer({ 
          id: opponentId, 
          hand: [card4H, card5D], 
          cardCount: 2, 
          playedCards: [card3S], 
          isPassedCurrentRound: true, 
          isBot: true,
          botPersonaId: 'BOT_ELO_1150'
        })
      ];

      const newGameHand = [card3S, card4H];
      const reset = resetPlayersForNewGame(endOfGamePlayers, localId, newGameHand, 13);

      const me = reset.find(p => p.id === localId)!;
      const opp = reset.find(p => p.id === opponentId)!;

      // Bản thân:
      expect(me.hand.map(c => c.id)).toEqual([card3S.id, card4H.id]);
      expect(me.cardCount).toBe(2);
      expect(me.playedCards).toEqual([]);
      expect(me.isPassedCurrentRound).toBe(false);
      expect(me.hasPlayedFirstCard).toBe(false);

      // Đối thủ:
      expect(opp.hand).toEqual([]); // Che bài hoàn toàn
      expect(opp.cardCount).toBe(13); // Reset 13 lá
      expect(opp.playedCards).toEqual([]);
      expect(opp.isPassedCurrentRound).toBe(false);
      expect(opp.hasPlayedFirstCard).toBe(false);
    });
  });
});
