import { AuthoritativeMatchHost } from '../server/match-host';
import { ClientSession } from '../presentation/client-session';
import { BotAgent } from '../server/bot-agent';
import { createMemoryDuplexTransport } from '../transport/memory-transport';
import { P2PClientTransport } from '../transport/p2p-transport';
import { globalP2PClient } from '../network/p2p-client';
import { CompositeDisposable } from '../common/disposable';
import { soundManager } from '../../ui/audio/sound-manager';
import type { MatchPlayer, BotMatchPlayer, GameRules } from '../types';
import type { ActiveGameType, CampaignResultMeta } from '../../stores/game/types';
import type { CampaignChapter } from '../campaign';
import type { GameSpeedMode } from '../game-speed';

export interface CreateOfflineTableSessionOptions {
  localPlayerId: string;
  initialPlayers: MatchPlayer[];
  rules: GameRules;
  activeGameType?: ActiveGameType;
  campaignChapter?: CampaignChapter | null;
  campaignResultMeta?: CampaignResultMeta | null;
  enableDealingAnimation?: boolean;
  instantDelay?: boolean;
  gameSpeed?: GameSpeedMode | (() => GameSpeedMode);
  onThinkingChange?: (botId: string, thought: string | null) => void;
}

export interface TableSessionBundle {
  host: AuthoritativeMatchHost;
  session: ClientSession;
  bots: BotAgent[];
  disposables: CompositeDisposable;
}

/**
 * TableSessionFactory
 * Nhà máy chuyên trách khởi tạo, lắp ráp và thiết lập toàn bộ hạ tầng phiên chơi (Listen-Server, Bots, Transports).
 * Đảm bảo nguyên lý Single Responsibility: Tách biệt hoàn toàn việc tạo lập phiên khỏi AppFlowCoordinator.
 */
export class TableSessionFactory {
  /**
   * Khởi tạo bàn chơi Offline hoàn chỉnh (Host + ClientSession + BotAgents + In-Memory Transports).
   */
  public static createOfflineTableSession(options: CreateOfflineTableSessionOptions): TableSessionBundle {
    const disposables = new CompositeDisposable();

    // 1. Khởi tạo AuthoritativeMatchHost (Listen Server trong RAM)
    const host = new AuthoritativeMatchHost({
      rules: options.rules,
      players: options.initialPlayers,
      hostPlayerId: options.localPlayerId,
      enableDealingAnimation: options.enableDealingAnimation !== false,
      instantDelay: options.instantDelay === true
    });
    disposables.add({ dispose: () => host.dispose() });

    // 2. Kết nối ClientSession cho người chơi thật qua InMemoryTransport
    const humanTransports = createMemoryDuplexTransport('HOST', options.localPlayerId);
    host.registerClient(options.localPlayerId, humanTransports.hostTransport);

    const clientSession = new ClientSession({
      localPlayerId: options.localPlayerId,
      transport: humanTransports.clientTransport,
      gameRules: options.rules,
      initialPlayers: options.initialPlayers,
      activeGameType: options.activeGameType || 'QUICK',
      campaignChapter: options.campaignChapter || undefined,
      campaignResultMeta: options.campaignResultMeta || null
    });
    disposables.add({ dispose: () => clientSession.dispose() });

    // 3. Đăng ký phát âm thanh từ ClientSession ra SoundManager
    const unsubAudio = clientSession.subscribeAudioCue(cue => {
      switch (cue) {
        case 'DEAL_START': soundManager.playShuffle(); break;
        case 'CARD_PLAY': soundManager.playCardSlap(); break;
        case 'CHOP': soundManager.playChop(); break;
        case 'CARD_SLIDE': soundManager.playCardDeal(); break;
        case 'PASS': soundManager.playPass(); break;
        case 'VICTORY': soundManager.playVictory(); break;
        case 'DEFEAT': soundManager.playDefeat(); break;
      }
    });
    disposables.add(unsubAudio);

    // 4. Kết nối BotAgent độc lập cho từng Bot
    const botAgents: BotAgent[] = [];
    const botPlayers = options.initialPlayers.filter(
      (p): p is BotMatchPlayer => p.id !== options.localPlayerId && p.isBot
    );

    for (let i = 0; i < botPlayers.length; i++) {
      const bot = botPlayers[i];
      const botTransports = createMemoryDuplexTransport('HOST', bot.id);
      host.registerClient(bot.id, botTransports.hostTransport);

      const personaId = bot.botPersonaId;
      const customConfig = bot.customBotConfig;

      const botAgent = new BotAgent({
        botId: bot.id,
        personaId,
        customConfig,
        transport: botTransports.clientTransport,
        instantDelay: options.instantDelay,
        gameSpeed: options.gameSpeed,
        onThinkingChange: options.onThinkingChange
      });

      disposables.add({ dispose: () => botAgent.dispose() });
      botAgents.push(botAgent);
    }

    return {
      host,
      session: clientSession,
      bots: botAgents,
      disposables
    };
  }

  /**
   * Đăng ký transport và tạo ClientSession cho Host trong trận Online Multiplayer.
   */
  public static createOnlineHostSession(options: {
    host: AuthoritativeMatchHost;
    localPlayerId: string;
    rules: GameRules;
    initialPlayers: MatchPlayer[];
  }): ClientSession {
    const hostTransports = createMemoryDuplexTransport('HOST', options.localPlayerId);
    options.host.registerClient(options.localPlayerId, hostTransports.hostTransport);

    return new ClientSession({
      localPlayerId: options.localPlayerId,
      transport: hostTransports.clientTransport,
      gameRules: options.rules,
      initialPlayers: options.initialPlayers,
      activeGameType: 'ONLINE'
    });
  }

  /**
   * Đăng ký P2PClientTransport và tạo ClientSession cho Guest trong trận Online Multiplayer.
   */
  public static createOnlineGuestSession(options: {
    hostPeerId: string;
    localPlayerId: string;
    rules: GameRules;
    initialPlayers: MatchPlayer[];
  }): ClientSession {
    const clientTransport = new P2PClientTransport(globalP2PClient, options.hostPeerId);
    return new ClientSession({
      localPlayerId: options.localPlayerId,
      transport: clientTransport,
      gameRules: options.rules,
      initialPlayers: options.initialPlayers,
      activeGameType: 'ONLINE'
    });
  }
}
