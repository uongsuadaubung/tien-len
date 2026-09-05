import { GameEngine } from '../game';
import { 
  type Card, 
  type Player, 
  type GameRules, 
  type InstantWinType,
  GameRulesBuilder 
} from '../types';
import { createBotPlayer, createPlayer } from '../player-factory';
import { makeBotDecision, createDecisionContext } from '../../ai/decision-maker';
import { CardTracker } from '../../ai/card-tracker';
import { getBotConfig } from '../../ai/bot-factory';
import { 
  type OnlineRoomState, 
  type PlayerActionPacket, 
  type DealHandPacket, 
  type TableStateSyncPacket, 
  type GameEndPacket,
  type OnlinePlayer,
  type NetworkCard,
  type RematchVotePacket
} from './network.schema';
import { P2PClient } from './p2p-client';
import { useGameStore } from '../../stores/useGameStore';
import { useViewStore } from '../../stores/useViewStore';
import { useUserStore } from '../../stores/useUserStore';
import { resolveStrategyForMatch } from '../strategies/game-mode-strategy';
import { savePlayerProfile, type PlayerProfile } from '../storage';
import { type MatchCompletedEvent, GameEventBus } from '../events/game-event-bus';
import { evaluateDailyQuests, evaluateAchievements } from '../evaluators/progress-evaluators';
import { type PlayingTurnMatchState, type GameOverMatchState, createPlayingTurnMatchState } from '../state-machine/types';
import type { IMatchDriver, DriverActionResult } from '../match-driver.interface';

export interface HostEngineDriverCallbacks {
  onRoomStateChange: ((updatedRoomState: OnlineRoomState) => void) | null;
  onAutoStartMatch: (() => void) | null;
}

export class HostEngineDriver implements IMatchDriver {
  public engine: GameEngine | null = null;
  public cardTracker: CardTracker = new CardTracker();
  public chopsByPlayer: Record<string, number> = {};
  public gotChoppedByPlayer: Record<string, number> = {};
  private p2pClient: P2PClient;
  public roomState: OnlineRoomState;
  private unsubscribeActions: Array<() => void> = [];
  private botTimer: NodeJS.Timeout | null = null;
  private onRoomStateChange: ((updatedRoomState: OnlineRoomState) => void) | null = null;
  private onAutoStartMatch: (() => void) | null = null;
  public gameNumber: number = 0;
  public lastWinnerId: string | null = null;
  public instantWinType: InstantWinType | null = null;

  constructor(
    p2pClient: P2PClient, 
    roomState: OnlineRoomState,
    callbacks: HostEngineDriverCallbacks | null = null
  ) {
    this.p2pClient = p2pClient;
    this.roomState = roomState;
    this.onRoomStateChange = callbacks !== null ? callbacks.onRoomStateChange : null;
    this.onAutoStartMatch = callbacks !== null ? callbacks.onAutoStartMatch : null;
  }


  public startMatch(onLocalHandDealt: (cards: Card[]) => void): void {
    this.cleanup();
    this.chopsByPlayer = {};
    this.gotChoppedByPlayer = {};
    this.gameNumber += 1;
    this.instantWinType = null;

    // 1. Build GameRules
    const rules: GameRules = new GameRulesBuilder()
      .withSettlement(this.roomState.settlementRule)
      .withTable(t => t
        .playerCount(this.roomState.playerCount)
        .betAmount(this.roomState.betAmount)
        .soundEnabled(true)
      )
      .withChopping(c => c
        .multiplier(this.roomState.choppingMultiplier)
        .allowFourPairsCutAnytime(this.roomState.allowFourPairsCutAnytime)
        .cascadeMultiplier(this.roomState.cascadeChopEnabled)
      )
      .withCong(cg => cg
        .enabled(this.roomState.congEnabled)
        .multiplier(this.roomState.congMultiplier ?? 1)
      )
      .withGameFlow(gf => gf
        .prohibitEndingWithTwo(this.roomState.prohibitEndingWithTwo)
        .threeSpadesEndingBonus(this.roomState.threeSpadesEndingBonus)
      )
      .build();

    // 2. Build Players Array
    const players: Player[] = this.roomState.players.map((op: OnlinePlayer) => {
      if (op.isBot) {
        return createBotPlayer(op.playerId, 'BOT_ELO_1150', {
          name: op.name,
          avatar: op.avatar,
          score: op.coins
        });
      }
      return createPlayer({
        id: op.playerId,
        name: op.name,
        avatar: op.avatar,
        score: op.coins
      });
    });

    // 3. Initialize Engine
    const engine = new GameEngine(players, rules);
    this.engine = engine;
    const startResult = engine.startNewGame(this.gameNumber, this.lastWinnerId || undefined);
    this.cardTracker = new CardTracker();

    if (startResult.instantWin) {
      this.instantWinType = startResult.instantWinType;
      useGameStore.getState().setInstantWinType(startResult.instantWinType);
      this.handleGameOver();
      return;
    }

    // 4. Fog of War: Dispatch private hands
    this.roomState.players.forEach((op: OnlinePlayer) => {
      const p = engine.players.find(pl => pl.id === op.playerId);
      if (!p) return;

      if (op.isHost) {
        // Host local player
        onLocalHandDealt(p.hand);
      } else if (!op.isBot) {
        // Remote human peer
        const dealPacket: DealHandPacket = {
          playerId: p.id,
          cards: p.hand.map(c => ({ rank: c.rank, suit: c.suit, id: c.id })),
          leadPlayerId: engine.currentRound.leadPlayerId,
          firstTurnPlayerId: engine.currentRound.currentTurnPlayerId,
          gameNumber: this.gameNumber,
          isFirstMoveOfGame: engine.isFirstMoveOfGame,
          isLeadMove: engine.isRoundLeadMove()
        };
        void this.p2pClient.sendPrivateDealHand(dealPacket, op.peerId);
      }
    });

    // 5. Broadcast Table Sync
    this.broadcastCurrentTableState('Ván bài đã bắt đầu!');

    // 6. Listen for Remote Player Actions
    const unAct = this.p2pClient.onPlayerAction((packet: PlayerActionPacket) => {
      this.handlePlayerAction(packet);
    });
    this.unsubscribeActions.push(unAct);

    // 7. Listen for Rematch Votes
    const unVote = this.p2pClient.onRematchVote((packet: RematchVotePacket) => {
      this.handleRematchVote(packet.playerId, packet.isReady);
    });
    this.unsubscribeActions.push(unVote);

    // 8. Check if first move belongs to a bot
    this.checkAndExecuteBotTurn();
  }

  public handlePlayerAction(packet: PlayerActionPacket): void {
    if (!this.engine || this.engine.isGameOver) return;

    if (this.engine.currentRound.currentTurnPlayerId !== packet.playerId) {
      return; // Không phải lượt người chơi này
    }

    const player = this.engine.players.find(p => p.id === packet.playerId);
    if (!player) return;

    if (packet.type === 'PASS') {
      const res = this.engine.passTurn(packet.playerId);
      if (res.success) {
        GameEventBus.getInstance().emit({
          type: 'TURN_PASSED',
          playerId: packet.playerId
        });
        this.broadcastCurrentTableState(`${player.name} bỏ lượt`);
        this.checkAndExecuteBotTurn();
      }
    } else if (packet.type === 'PLAY' && packet.cardIds) {
      const selectedCards = player.hand.filter(c => packet.cardIds?.includes(c.id));
      const res = this.engine.playMove(packet.playerId, selectedCards);
      if (res.success) {
        GameEventBus.getInstance().emit({
          type: 'CARD_PLAYED',
          playerId: packet.playerId,
          cards: [...res.playedMove.combination.cards],
          combination: res.playedMove.combination,
          remainingCardsCount: player.hand.length
        });
        this.cardTracker.recordMove(res.playedMove);

        if (res.isChop && res.choppedPlayerId) {
          this.chopsByPlayer[player.id] = (this.chopsByPlayer[player.id] || 0) + 1;
          this.gotChoppedByPlayer[res.choppedPlayerId] = (this.gotChoppedByPlayer[res.choppedPlayerId] || 0) + 1;
          GameEventBus.getInstance().emit({
            type: 'CHOP_EXECUTED',
            chopperPlayerId: player.id,
            victimPlayerId: res.choppedPlayerId,
            penaltyAmount: res.penaltyAmount,
            choppingCards: [...selectedCards],
            isCascadeChop: res.isCascadeChop,
            chopChainCount: res.chopChainCount
          });
        }
        this.broadcastCurrentTableState(`${player.name} đã đánh bài`);

        if (this.engine.isGameOver) {
          this.handleGameOver();
        } else {
          this.checkAndExecuteBotTurn();
        }
      }
    }
  }

  public playCards(playerId: string, cards: Card[]): DriverActionResult {
    this.handlePlayerAction({
      type: 'PLAY',
      playerId,
      cardIds: cards.map(c => c.id),
      timestamp: Date.now()
    });
    return { success: true };
  }

  public passTurn(playerId: string): DriverActionResult {
    this.handlePlayerAction({
      type: 'PASS',
      playerId,
      timestamp: Date.now()
    });
    return { success: true };
  }

  private checkAndExecuteBotTurn(): void {
    if (!this.engine || this.engine.isGameOver) return;

    const currentTurnId = this.engine.currentRound.currentTurnPlayerId;
    if (!currentTurnId) return;

    const onlinePlayer = this.roomState.players.find(p => p.playerId === currentTurnId);
    if (!onlinePlayer || !onlinePlayer.isBot) return;

    const botPlayer = this.engine.players.find(p => p.id === currentTurnId);
    if (!botPlayer) return;

    if (this.botTimer) clearTimeout(this.botTimer);
    this.botTimer = setTimeout(() => {
      if (!this.engine || this.engine.isGameOver) return;

      const remainingCounts: Record<string, number> = {};
      this.engine.players.forEach(p => {
        remainingCounts[p.id] = p.hand.length;
      });

      const nextPlayerId = this.engine.getNextActivePlayerId(botPlayer.id) || botPlayer.id;
      const nextPlayer = this.engine.players.find(p => p.id === nextPlayerId);
      const isNextPlayerOneCard = nextPlayer ? nextPlayer.hand.length === 1 : false;
      const lastMove = this.engine.currentRound.moves[this.engine.currentRound.moves.length - 1] || null;

      const decision = makeBotDecision(createDecisionContext({
        hand: botPlayer.hand,
        currentRoundLeadingMove: lastMove,
        isFirstMoveOfGame: this.engine.isFirstMoveOfGame,
        isLeadMove: this.engine.currentRound.leadPlayerId === botPlayer.id,
        tracker: this.cardTracker,
        config: getBotConfig('BOT_ELO_1150'),
        remainingPlayerCards: remainingCounts,
        nextPlayerId,
        rules: this.engine.rules,
        hasPlayedFirstCard: botPlayer.hasPlayedFirstCard,
        isNextPlayerOneCard,
        prohibitEndingWithTwo: this.engine.rules.gameFlow.prohibitEndingWithTwo,
        gameMode: this.roomState.settlementRule,
        mctsMap: null,
        compositeRuleStrategy: null,
        opponentProfiles: null
      }));

      if (decision.type === 'PLAY' && decision.cards.length > 0) {
        const res = this.engine.playMove(botPlayer.id, [...decision.cards]);
        if (res.success) {
          GameEventBus.getInstance().emit({
            type: 'CARD_PLAYED',
            playerId: botPlayer.id,
            cards: [...res.playedMove.combination.cards],
            combination: res.playedMove.combination,
            remainingCardsCount: botPlayer.hand.length
          });
          this.cardTracker.recordMove(res.playedMove);

          if (res.isChop && res.choppedPlayerId) {
            this.chopsByPlayer[botPlayer.id] = (this.chopsByPlayer[botPlayer.id] || 0) + 1;
            this.gotChoppedByPlayer[res.choppedPlayerId] = (this.gotChoppedByPlayer[res.choppedPlayerId] || 0) + 1;
            GameEventBus.getInstance().emit({
              type: 'CHOP_EXECUTED',
              chopperPlayerId: botPlayer.id,
              victimPlayerId: res.choppedPlayerId,
              penaltyAmount: res.penaltyAmount,
              choppingCards: [...decision.cards],
              isCascadeChop: res.isCascadeChop,
              chopChainCount: res.chopChainCount
            });
          }
          this.broadcastCurrentTableState(`${botPlayer.name} đã đánh bài`);
          if (this.engine.isGameOver) {
            this.handleGameOver();
            return;
          }
        }
      } else {
        const res = this.engine.passTurn(botPlayer.id);
        if (res.success) {
          GameEventBus.getInstance().emit({
            type: 'TURN_PASSED',
            playerId: botPlayer.id
          });
          this.broadcastCurrentTableState(`${botPlayer.name} bỏ lượt`);
        }
      }

      this.checkAndExecuteBotTurn();
    }, 1000);
  }

  public broadcastCurrentTableState(message?: string): void {
    if (!this.engine) return;

    const remainingCardCounts: Record<string, number> = {};
    this.engine.players.forEach(p => {
      remainingCardCounts[p.id] = p.hand.length;
    });

    const lastMove = this.engine.currentRound.moves[this.engine.currentRound.moves.length - 1] || null;
    const currentMoveCards = lastMove?.combination.cards.map((c: Card) => ({
      rank: c.rank,
      suit: c.suit,
      id: c.id
    }));

    const currentTurnId = this.engine.currentRound.currentTurnPlayerId;
    const leadId = this.engine.currentRound.leadPlayerId;
    const isFirstMoveOfGame = this.engine.isFirstMoveOfGame;
    const isLeadMove = this.engine.isRoundLeadMove();

    const packet: TableStateSyncPacket = {
      currentTurnPlayerId: currentTurnId,
      leadPlayerId: leadId,
      currentMoveCards,
      currentMovePlayerId: lastMove?.playerId,
      currentMoveCombinationType: lastMove?.combination.type,
      remainingCardCounts,
      passedPlayerIds: [...this.engine.currentRound.passedPlayerIds],
      roundNumber: this.engine.roundNumber,
      chopNotification: null,
      winners: this.engine.winners.map(w => w.id),
      isGameOver: this.engine.isGameOver,
      lastActionMessage: message,
      gameNumber: this.gameNumber,
      isFirstMoveOfGame,
      isLeadMove
    };

    // Đồng bộ trực tiếp vào GameStore của Host nguyên tử qua State Pattern
    const gameStore = useGameStore.getState();
    const leadingMove = this.engine.getLeadingMove();

    if (!this.engine.isGameOver && currentTurnId && leadId) {
      const playingState: PlayingTurnMatchState = createPlayingTurnMatchState({
        status: 'PLAYING',
        gameNumber: this.gameNumber,
        roundNumber: this.engine.roundNumber,
        players: this.engine.players.map(p => ({ ...p })),
        currentTurnPlayerId: currentTurnId,
        leadPlayerId: leadId,
        roundMoves: this.engine.currentRound.moves,
        leadingMove,
        isLeadMove,
        isFirstMoveOfGame,
        passedPlayerIds: this.engine.currentRound.passedPlayerIds,
        chopNotification: null,
        botThinkingThought: null,
        rules: this.engine.rules
      });
      gameStore.applyMatchState(playingState);
      gameStore.setDealtCounts(remainingCardCounts);
    } else {
      gameStore.applyMatchSnapshot({
        gameNumber: this.gameNumber,
        players: this.engine.players.map(p => ({ ...p })),
        currentTurnPlayerId: currentTurnId,
        leadPlayerId: leadId,
        currentMove: leadingMove,
        winners: [...this.engine.winners],
        isGameOver: this.engine.isGameOver,
        instantWinType: null,
        isDealing: false,
        dealtCounts: remainingCardCounts,
        dealBanner: null,
        chopNotification: null,
        botThinkingThought: null,
        isFirstMoveOfGame,
        isLeadMove
      });
    }

    void this.p2pClient.broadcastTableSync(packet);
  }

  private handleGameOver(): void {
    if (!this.engine) return;

    const hostPlayer = this.roomState.players.find(p => p.isHost);
    if (!hostPlayer) {
      throw new Error('[HostEngineDriver] Không tìm thấy Host player trong roomState khi kết toán ván đấu!');
    }
    const hostPlayerId = hostPlayer.playerId;
    const playerElos: Record<string, number> = {};
    this.roomState.players.forEach(p => {
      playerElos[p.playerId] = p.elo || 1000;
    });

    const userStore = useUserStore.getState();
    const currentProfile = userStore.profile;

    const streaksByPlayer: Record<string, number> = {
      [hostPlayerId]: currentProfile.stats.currentStreak
    };

    const strategy = resolveStrategyForMatch('ONLINE', this.roomState.settlementRule);
    const settlement = strategy.settleMatch({
      players: this.engine.players,
      winners: this.engine.winners,
      betAmount: this.roomState.betAmount,
      subjectPlayerId: hostPlayerId,
      playerElos,
      chopsByPlayer: this.chopsByPlayer,
      gotChoppedByPlayer: this.gotChoppedByPlayer,
      streaksByPlayer,
      isBankLoanActive: false,
      penaltyMultiplier: this.roomState.choppingMultiplier,
      congMultiplier: this.roomState.congMultiplier ?? 1,
      isThreeSpadesWin: this.engine.isThreeSpadesWin,
      isInstantWin: !!this.engine.instantWinner
    });

    const winner = this.engine.winners[0];
    if (!winner) {
      throw new Error('[HostEngineDriver] Không thể kết toán ván đấu khi danh sách winners rỗng!');
    }
    const winnerId = winner.id;
    const eloDeltas: Record<string, number> = settlement.allEloDeltas;

    const allPlayerHands: Record<string, NetworkCard[]> = {};
    this.engine.players.forEach(p => {
      allPlayerHands[p.id] = p.hand.map(c => ({ rank: c.rank, suit: c.suit, id: c.id }));
    });

    if (this.engine.winners.length > 0) {
      this.lastWinnerId = this.engine.winners[0].id;
    }

    const hostPayout = settlement.payouts[hostPlayerId];
    if (hostPayout === undefined) {
      throw new Error(`[HostEngineDriver] Không tìm thấy payout cho host ${hostPlayerId} trong settlement!`);
    }
    const hostEloDelta = eloDeltas[hostPlayerId] ?? settlement.eloDelta;
    const isHostWinner = winnerId === hostPlayerId;

    // Cập nhật Profile cho Host
    const nextCoins = Math.max(0, currentProfile.coins + hostPayout);
    const nextElo = Math.max(0, currentProfile.elo + hostEloDelta);
    const nextWins = isHostWinner ? currentProfile.stats.wins + 1 : currentProfile.stats.wins;
    const nextCurrentStreak = isHostWinner ? currentProfile.stats.currentStreak + 1 : 0;
    const nextHighestStreak = Math.max(currentProfile.stats.highestStreak, nextCurrentStreak);
    const nextTotalEarned = hostPayout > 0 ? currentProfile.stats.totalEarned + hostPayout : currentProfile.stats.totalEarned;

    const updatedProfile: PlayerProfile = {
      ...currentProfile,
      coins: nextCoins,
      elo: nextElo,
      stats: {
        ...currentProfile.stats,
        gamesPlayed: currentProfile.stats.gamesPlayed + 1,
        wins: nextWins,
        currentStreak: nextCurrentStreak,
        highestStreak: nextHighestStreak,
        totalEarned: nextTotalEarned
      }
    };

    const congsGivenCount = isHostWinner ? this.engine.players.filter(p => p.id !== hostPlayerId && p.hand.length === 13).length : 0;
    const matchCompletedEvent: MatchCompletedEvent = {
      type: 'MATCH_COMPLETED',
      activeGameType: 'ONLINE',
      winnerPlayerId: winnerId,
      isHumanWinner: isHostWinner,
      winners: this.engine.winners,
      allPlayers: this.engine.players,
      payouts: settlement.payouts,
      humanNetCoins: hostPayout,
      totalHumanCoins: nextCoins,
      betAmount: this.roomState.betAmount,
      isThreeSpadesWin: this.engine.isThreeSpadesWin,
      playerCount: this.engine.players.length,
      congsGivenCount,
      cascadeChopCount: 0,
      loanDeduction: 0,
      instantWinType: null
    };

    const finalQuests = evaluateDailyQuests([matchCompletedEvent], updatedProfile.dailyQuests, updatedProfile);
    const finalAchievements = evaluateAchievements([matchCompletedEvent], updatedProfile.achievements, updatedProfile);
    updatedProfile.dailyQuests = finalQuests;
    updatedProfile.achievements = finalAchievements;

    userStore.setProfile(updatedProfile);
    savePlayerProfile(updatedProfile);

    // Cập nhật số dư Xu và Elo mới cho từng người chơi trong phòng (Host, Bot, Guest)
    const resetPlayers = this.roomState.players.map(p => {
      const net = settlement.payouts[p.playerId] || 0;
      const eloD = eloDeltas[p.playerId] || 0;
      return {
        ...p,
        coins: Math.max(0, p.coins + net),
        elo: Math.max(0, p.elo + eloD),
        isReady: p.isBot ? true : false
      };
    });

    const updatedRoom: OnlineRoomState = {
      ...this.roomState,
      players: resetPlayers,
      status: 'ENDED',
      updatedAt: Date.now()
    };
    this.roomState = updatedRoom;

    if (this.onRoomStateChange) {
      this.onRoomStateChange(updatedRoom);
    }
    void this.p2pClient.broadcastRoomState(updatedRoom);

    const gameStore = useGameStore.getState();
    gameStore.setMatchPayouts(settlement.payouts);
    gameStore.setLastEloDelta(hostEloDelta);
    gameStore.setLastEloBreakdown(settlement.allEloBreakdowns?.[hostPlayerId] ?? settlement.eloBreakdown ?? null);
    gameStore.setAllEloDeltas(eloDeltas);
    gameStore.setIsGameOver(true);
    gameStore.setWinners([...this.engine.winners]);

    const gameOverState: GameOverMatchState = {
      status: 'GAME_OVER',
      gameNumber: this.gameNumber,
      players: this.engine.players.map(p => ({ ...p })),
      winners: [...this.engine.winners],
      isThreeSpadesWin: this.engine.isThreeSpadesWin,
      matchPayouts: settlement.payouts,
      eloDeltas,
      matchLogReport: null,
      rules: this.engine.rules
    };
    gameStore.setMatchState(gameOverState);

    useViewStore.getState().openModal('VICTORY');

    const packet: GameEndPacket = {
      winners: this.engine.winners.map(w => w.id),
      payouts: settlement.payouts,
      eloDeltas,
      allPlayerHands
    };
    void this.p2pClient.broadcastGameEnd(packet);
  }

  public handleRematchVote(playerId: string, isReady: boolean): void {
    const updatedPlayers = this.roomState.players.map(p => {
      if (p.playerId === playerId) {
        return { ...p, isReady };
      }
      return p;
    });

    const updatedRoom: OnlineRoomState = {
      ...this.roomState,
      players: updatedPlayers,
      updatedAt: Date.now()
    };
    this.roomState = updatedRoom;

    if (this.onRoomStateChange) {
      this.onRoomStateChange(updatedRoom);
    }
    void this.p2pClient.broadcastRoomState(updatedRoom);

    // Kiểm tra nếu tất cả người chơi trong phòng đều đã sẵn sàng (100% phiếu)
    const allReady = updatedRoom.players.every(p => p.isReady);
    if (allReady && updatedRoom.players.length === updatedRoom.playerCount) {
      if (this.onAutoStartMatch) {
        this.onAutoStartMatch();
      }
    }
  }

  public handlePeerLeave(peerId: string): void {
    const leaver = this.roomState.players.find(p => p.peerId === peerId);
    if (!leaver) return;

    if (this.roomState.status === 'PLAYING') {
      // Dừng trận đấu ngay lập tức, giải tán phòng
      this.cleanup();
      const updatedRoom: OnlineRoomState = {
        ...this.roomState,
        status: 'DISBANDED',
        disbandReason: `Người chơi [${leaver.name}] đã rời khỏi trận đấu. Bàn chơi đã tự động giải tán.`,
        updatedAt: Date.now()
      };
      this.roomState = updatedRoom;
      if (this.onRoomStateChange) {
        this.onRoomStateChange(updatedRoom);
      }
      void this.p2pClient.broadcastRoomState(updatedRoom);
    } else {
      // Đang ở phòng chờ (WAITING hoặc ENDED): Xóa người chơi khỏi slot
      const updatedPlayers = this.roomState.players.filter(p => p.peerId !== peerId);
      const updatedRoom: OnlineRoomState = {
        ...this.roomState,
        players: updatedPlayers,
        status: 'WAITING',
        disbandReason: null,
        updatedAt: Date.now()
      };
      this.roomState = updatedRoom;
      if (this.onRoomStateChange) {
        this.onRoomStateChange(updatedRoom);
      }
      void this.p2pClient.broadcastRoomState(updatedRoom);
    }
  }

  public disbandRoom(reason: string): void {
    this.cleanup();
    const updatedRoom: OnlineRoomState = {
      ...this.roomState,
      status: 'DISBANDED',
      disbandReason: reason,
      updatedAt: Date.now()
    };
    this.roomState = updatedRoom;
    if (this.onRoomStateChange) {
      this.onRoomStateChange(updatedRoom);
    }
    void this.p2pClient.broadcastRoomState(updatedRoom);
  }

  public cleanup(): void {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    this.unsubscribeActions.forEach(un => un());
    this.unsubscribeActions = [];
    this.engine = null;
  }
}

