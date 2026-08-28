import { GameEngine } from '../game';
import { 
  type Card, 
  type Player, 
  type GameRules, 
  GameRulesBuilder 
} from '../types';
import { createBotPlayer, createPlayer } from '../player-factory';
import { makeBotDecision } from '../../ai/decision-maker';
import { CardTracker } from '../../ai/card-tracker';
import { getBotConfig } from '../../ai/bot-factory';
import { 
  type OnlineRoomState, 
  type PlayerActionPacket, 
  type DealHandPacket, 
  type TableStateSyncPacket, 
  type GameEndPacket,
  type OnlinePlayer,
  type NetworkCard
} from './network.schema';
import { P2PClient } from './p2p-client';

export class HostEngineDriver {
  public engine: GameEngine | null = null;
  public cardTracker: CardTracker = new CardTracker();
  private p2pClient: P2PClient;
  private roomState: OnlineRoomState;
  private unsubscribeActions: Array<() => void> = [];
  private botTimer: NodeJS.Timeout | null = null;

  constructor(p2pClient: P2PClient, roomState: OnlineRoomState) {
    this.p2pClient = p2pClient;
    this.roomState = roomState;
  }

  public startMatch(onLocalHandDealt: (cards: Card[]) => void): void {
    this.cleanup();

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
    this.engine = new GameEngine(players, rules);
    this.engine.startNewGame(1);
    this.cardTracker = new CardTracker();

    // 4. Fog of War: Dispatch private hands
    this.roomState.players.forEach((op: OnlinePlayer) => {
      const p = this.engine?.players.find(pl => pl.id === op.playerId);
      if (!p) return;

      if (op.isHost) {
        // Host local player
        onLocalHandDealt(p.hand);
      } else if (!op.isBot) {
        // Remote human peer
        const dealPacket: DealHandPacket = {
          cards: p.hand.map(c => ({ rank: c.rank, suit: c.suit, id: c.id })),
          leadPlayerId: this.engine?.currentRound.leadPlayerId || 'p0',
          firstTurnPlayerId: this.engine?.currentRound.currentTurnPlayerId || 'p0',
          gameNumber: 1
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

    // 7. Check if first move belongs to a bot
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
        this.broadcastCurrentTableState(`${player.name} bỏ lượt`);
        this.checkAndExecuteBotTurn();
      }
    } else if (packet.type === 'PLAY' && packet.cardIds) {
      const selectedCards = player.hand.filter(c => packet.cardIds?.includes(c.id));
      const res = this.engine.playMove(packet.playerId, selectedCards);
      if (res.success) {
        if (res.playedMove) {
          this.cardTracker.recordMove(res.playedMove);
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

      const decision = makeBotDecision({
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
      });

      if (decision.type === 'PLAY' && decision.cards && decision.cards.length > 0) {
        const res = this.engine.playMove(botPlayer.id, decision.cards);
        if (res.success) {
          if (res.playedMove) {
            this.cardTracker.recordMove(res.playedMove);
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

    const packet: TableStateSyncPacket = {
      currentTurnPlayerId: this.engine.currentRound.currentTurnPlayerId,
      leadPlayerId: this.engine.currentRound.leadPlayerId,
      currentMoveCards,
      currentMovePlayerId: lastMove?.playerId,
      remainingCardCounts,
      winners: this.engine.winners.map(w => w.id),
      isGameOver: this.engine.isGameOver,
      lastActionMessage: message
    };

    void this.p2pClient.broadcastTableSync(packet);
  }

  private handleGameOver(): void {
    if (!this.engine) return;

    const payouts: Record<string, number> = {};
    const eloDeltas: Record<string, number> = {};
    const allPlayerHands: Record<string, NetworkCard[]> = {};

    this.engine.players.forEach(p => {
      payouts[p.id] = 0;
      eloDeltas[p.id] = 0;
      allPlayerHands[p.id] = p.hand.map(c => ({ rank: c.rank, suit: c.suit, id: c.id }));
    });

    const packet: GameEndPacket = {
      winners: this.engine.winners.map(w => w.id),
      payouts,
      eloDeltas,
      allPlayerHands
    };

    void this.p2pClient.broadcastGameEnd(packet);
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
