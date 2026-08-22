import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, GameSettings, PlayedMove, Player } from '../engine/types';
import { sortCards } from '../engine/card';
import { GameEngine } from '../engine/game';
import { isValidMove } from '../engine/validator';
import { BOT_PERSONAS, getBotConfig } from '../ai/bot-factory';
import { BotConfig } from '../ai/types';
import { CardTracker } from '../ai/card-tracker';
import { makeBotDecision } from '../ai/decision-maker';
import { MoveHint, getOptimalMoveHint } from '../ai/hint-engine';
import { soundManager } from './audio/sound-manager';
import { HeaderBar } from './components/HeaderBar';
import { LeftMatchHUD } from './components/LeftMatchHUD';
import { BotSeat } from './components/BotSeat';
import { TableCenter } from './components/TableCenter';
import { DealingDeckAnimation } from './components/DealingDeckAnimation';
import { PlayerHandView } from './components/PlayerHandView';
import { XRayInspector } from './components/XRayInspector';
import { SettingsModal } from './components/SettingsModal';
import { VictoryModal } from './components/VictoryModal';

export const App: React.FC = () => {
  // 1. Cấu hình ban đầu 4 người chơi (1 người chơi + 3 bot)
  const [botPersonaIds, setBotPersonaIds] = useState<[string, string, string]>([
    'BE_NAM',
    'CHU_BAY',
    'CO_BA'
  ]);

  const [settings, setSettings] = useState<GameSettings>({
    mode: 'TRADITIONAL',
    betAmount: 100,
    allowFourPairsCutAnytime: true,
    instantWinEnabled: true,
    soundEnabled: true,
    botThinkDelayMs: 850
  });

  const [players, setPlayers] = useState<Player[]>([
    {
      id: 'p0',
      name: 'Bạn (Người Chơi)',
      avatar: '🧑',
      isBot: false,
      hand: [],
      playedCards: [],
      score: 5000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    },
    {
      id: 'p1',
      name: 'Bé Năm',
      avatar: '🧒',
      isBot: true,
      botPersonaId: 'BE_NAM',
      hand: [],
      playedCards: [],
      score: 5000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    },
    {
      id: 'p2',
      name: 'Chú Bảy',
      avatar: '🤠',
      isBot: true,
      botPersonaId: 'CHU_BAY',
      hand: [],
      playedCards: [],
      score: 5000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    },
    {
      id: 'p3',
      name: 'Cô Ba',
      avatar: '👑',
      isBot: true,
      botPersonaId: 'CO_BA',
      hand: [],
      playedCards: [],
      score: 5000,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    }
  ]);

  const engineRef = useRef<GameEngine | null>(null);
  const trackersRef = useRef<Record<string, CardTracker>>({});

  const [gameNumber, setGameNumber] = useState<number>(1);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string>('p0');
  const [currentMove, setCurrentMove] = useState<PlayedMove | null>(null);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [winners, setWinners] = useState<Player[]>([]);
  const [instantWinType, setInstantWinType] = useState<string | undefined>();
  const [leadPlayerId, setLeadPlayerId] = useState<string>('p0');

  // Animation Chia bài 4 người ở đầu ván
  const [isDealing, setIsDealing] = useState<boolean>(true);
  const [dealtCounts, setDealtCounts] = useState<{ [playerId: string]: number }>({
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0
  });
  const [dealBanner, setDealBanner] = useState<string | null>(null);

  // Thông báo Chặt Heo
  const [chopNotification, setChopNotification] = useState<{
    visible: boolean;
    chopperName: string;
    targetName: string;
    amount: number;
  } | null>(null);

  // Modals & Tools
  const [isXRayOpen, setIsXRayOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState<boolean>(false);
  const [currentHint, setCurrentHint] = useState<MoveHint | null>(null);

  // Tùy biến chỉ số bot
  const [customBotConfigs, setCustomBotConfigs] = useState<[Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>]>([{}, {}, {}]);

  const handleUpdateCustomBotConfig = (index: number, config: Partial<BotConfig>) => {
    setCustomBotConfigs(prev => {
      const next = [...prev] as [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>];
      next[index] = { ...next[index], ...config };
      return next;
    });
  };

  const handleApplyGodModeAll = () => {
    setBotPersonaIds(['ALPHA_TL', 'CO_SAU', 'TRUM_SONG']);
    setCustomBotConfigs([
      { mctsSimulations: 80, memoryDepth: 1.0, tempoControl: 1.0, damageControl: 1.0, antiLeaderAggression: 1.0, baitingTendency: 0.95 },
      { mctsSimulations: 60, memoryDepth: 1.0, tempoControl: 1.0, damageControl: 1.0, antiLeaderAggression: 1.0, baitingTendency: 0.95 },
      { mctsSimulations: 50, memoryDepth: 1.0, tempoControl: 1.0, damageControl: 1.0, antiLeaderAggression: 1.0, baitingTendency: 0.95 }
    ]);
  };

  const triggerChopAlert = useCallback((chopperName: string, targetName: string, amount: number) => {
    soundManager.playChop();
    setChopNotification({ visible: true, chopperName, targetName, amount });
    setTimeout(() => {
      setChopNotification(null);
    }, 2500);
  }, []);

  // Cập nhật âm thanh
  useEffect(() => {
    soundManager.enabled = settings.soundEnabled;
  }, [settings.soundEnabled]);

  // Cập nhật từng lá bài chia cho người chơi trong animation
  const handleDealCard = useCallback((playerIndex: number, count: number) => {
    const pIds = ['p0', 'p1', 'p2', 'p3'];
    const targetId = pIds[playerIndex];
    setDealtCounts(prev => ({
      ...prev,
      [targetId]: count
    }));
  }, []);

  // Kết thúc animation chia bài
  const handleDealComplete = useCallback(() => {
    setIsDealing(false);
    setDealtCounts({ p0: 13, p1: 13, p2: 13, p3: 13 });
    if (engineRef.current) {
      const starter = engineRef.current.getCurrentPlayer();
      if (starter) {
        const isThreeSpade = engineRef.current.isFirstMoveOfGame;
        const bannerText = isThreeSpade
          ? `🃏 ${starter.name} cầm 3 Bích - Đánh trước!`
          : `👑 ${starter.name} cầm Cái - Đánh trước!`;
        setDealBanner(bannerText);
        setTimeout(() => setDealBanner(null), 2800);
      }
    }
  }, []);

  // Khởi tạo hoặc Bắt đầu Ván Mới
  const startNewGame = useCallback((gNum: number) => {
    const updatedPlayers = players.map((p, idx) => {
      if (p.isBot) {
        const pId = botPersonaIds[idx - 1];
        const cfg = getBotConfig(pId);
        return {
          ...p,
          name: cfg.name,
          avatar: cfg.avatar,
          botPersonaId: pId
        };
      }
      return p;
    });

    const engine = new GameEngine(updatedPlayers, settings);
    engineRef.current = engine;

    const res = engine.startNewGame(gNum);
    setGameNumber(gNum);
    setSelectedCardIds(new Set());
    setIsGameOver(engine.isGameOver);
    setWinners(engine.winners);
    setInstantWinType(res.instantWinType);

    // Kích hoạt hiệu ứng chia bài 4 người xoay vòng
    setIsDealing(true);
    setDealtCounts({ p0: 0, p1: 0, p2: 0, p3: 0 });
    setDealBanner(null);

    // Khởi tạo lại bộ nhớ CardTracker cho từng người chơi
    const newTrackers: Record<string, CardTracker> = {};
    for (const p of engine.players) {
      const cfg = p.isBot ? getBotConfig(p.botPersonaId || 'CHU_BAY') : getBotConfig('CO_BA');
      newTrackers[p.id] = new CardTracker(p.hand, cfg.memoryDepth);
    }
    trackersRef.current = newTrackers;

    setPlayers([...engine.players]);
    setCurrentTurnPlayerId(engine.currentRound.currentTurnPlayerId);
    setLeadPlayerId(engine.currentRound.leadPlayerId);
    setCurrentMove(null);

    if (res.instantWin) {
      soundManager.playVictory();
      setIsVictoryOpen(true);
    }
  }, [botPersonaIds, players, settings]);

  // Khởi chạy ván đầu tiên khi load web
  useEffect(() => {
    startNewGame(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cập nhật State từ Game Engine
  const syncGameState = useCallback(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    setPlayers([...engine.players]);
    setCurrentTurnPlayerId(engine.currentRound.currentTurnPlayerId);
    setLeadPlayerId(engine.currentRound.leadPlayerId);
    setCurrentMove(engine.getLeadingMove());
    setIsGameOver(engine.isGameOver);
    setWinners([...engine.winners]);

    if (engine.isGameOver) {
      soundManager.playVictory();
      setTimeout(() => setIsVictoryOpen(true), 800);
    }
  }, []);

  // Tính toán gợi ý AI cho người chơi
  const updatePlayerAiHint = useCallback(() => {
    if (!engineRef.current || isDealing) return;
    const engine = engineRef.current;
    const p0 = engine.getPlayer('p0');
    if (!p0 || p0.hand.length === 0) return;

    const remainingCardsMap: Record<string, number> = {};
    for (const p of engine.players) {
      remainingCardsMap[p.id] = p.hand.length;
    }

    const tracker = trackersRef.current['p0'] || new CardTracker(p0.hand, 1.0);
    const hint = getOptimalMoveHint(
      p0.hand,
      engine.getLeadingMove(),
      engine.isFirstMoveOfGame,
      engine.isRoundLeadMove(),
      tracker,
      remainingCardsMap
    );
    setCurrentHint(hint);
  }, [isDealing]);

  // Vòng lặp lượt đi của Bot AI (Chỉ chạy sau khi chia bài xong)
  useEffect(() => {
    if (isGameOver || isDealing || !engineRef.current) return;
    const engine = engineRef.current;
    const currentTurnPlayer = engine.getCurrentPlayer();

    if (currentTurnPlayer && !currentTurnPlayer.isBot) {
      // Nếu người chơi đã hết bài (đã về Nhất/Nhì): Chuyển lượt tiếp tục cho Bot
      if (currentTurnPlayer.hand.length === 0) {
        const nextActiveId = engine.getNextActivePlayerId('p0');
        engine.currentRound.currentTurnPlayerId = nextActiveId;
        syncGameState();
        return;
      }
      // Tới lượt người chơi còn bài: Cập nhật gợi ý
      updatePlayerAiHint();
      return;
    }

    if (currentTurnPlayer && currentTurnPlayer.isBot) {
      if (currentTurnPlayer.hand.length === 0) {
        const nextActiveId = engine.getNextActivePlayerId(currentTurnPlayer.id);
        engine.currentRound.currentTurnPlayerId = nextActiveId;
        syncGameState();
        return;
      }

      const botTimer = setTimeout(() => {
        const botId = currentTurnPlayer.id;
        const botIdx = botId === 'p1' ? 0 : botId === 'p2' ? 1 : 2;
        const botPersonaId = currentTurnPlayer.botPersonaId || 'CHU_BAY';
        const botConfig = getBotConfig(botPersonaId, customBotConfigs[botIdx]);
        const tracker = trackersRef.current[botId];
        tracker?.updateOwnHand(currentTurnPlayer.hand);

        const remainingCardsMap: Record<string, number> = {};
        for (const p of engine.players) {
          remainingCardsMap[p.id] = p.hand.length;
        }

        const isLead = engine.isRoundLeadMove();

        const decision = makeBotDecision({
          hand: currentTurnPlayer.hand,
          currentRoundLeadingMove: engine.getLeadingMove(),
          isFirstMoveOfGame: engine.isFirstMoveOfGame,
          isLeadMove: isLead,
          tracker,
          config: botConfig,
          remainingPlayerCards: remainingCardsMap
        });

        if (decision.type === 'PLAY' && decision.cards) {
          const moveRes = engine.playMove(botId, decision.cards);
          if (moveRes.success) {
            soundManager.playCardSlap();
            if (moveRes.isChop && moveRes.choppedPlayerId && moveRes.penaltyAmount) {
              const choppedPlayer = engine.getPlayer(moveRes.choppedPlayerId);
              triggerChopAlert(currentTurnPlayer.name, choppedPlayer?.name || '', moveRes.penaltyAmount);
            }

            // Ghi nhận nước đi vào tất cả trackers
            const lastMove = engine.getLeadingMove();
            if (lastMove) {
              for (const t of Object.values(trackersRef.current)) {
                t.recordMove(lastMove);
              }
            }
          } else {
            // Nước đi dự phòng nếu lỗi
            if (isLead && currentTurnPlayer.hand.length > 0) {
              engine.playMove(botId, [currentTurnPlayer.hand[0]]);
            } else {
              engine.passTurn(botId);
              soundManager.playPass();
            }
          }
        } else {
          // Bỏ lượt
          if (isLead && currentTurnPlayer.hand.length > 0) {
            // Đang cầm cái không thể bỏ lượt -> Đánh lá nhỏ nhất
            engine.playMove(botId, [currentTurnPlayer.hand[0]]);
            soundManager.playCardSlap();
          } else {
            engine.passTurn(botId);
            soundManager.playPass();
            if (engine.getLeadingMove()) {
              for (const t of Object.values(trackersRef.current)) {
                t.recordPassWithDetails(botId, engine.getLeadingMove()!.combination);
              }
            }
          }
        }

        syncGameState();
      }, settings.botThinkDelayMs);

      return () => clearTimeout(botTimer);
    }
  }, [currentTurnPlayerId, isGameOver, settings.botThinkDelayMs, syncGameState, triggerChopAlert, updatePlayerAiHint]);

  // Hành động Người Chơi: Chọn/Bỏ chọn lá bài
  const handleToggleCardSelect = (cardId: string) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  // Người Chơi Đánh Bài
  const handlePlaySelectedCards = () => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const p0 = engine.getPlayer('p0');
    if (!p0) return;

    const cardsToPlay = p0.hand.filter(c => selectedCardIds.has(c.id));
    const moveRes = engine.playMove('p0', cardsToPlay);

    if (moveRes.success) {
      soundManager.playCardSlap();
      setSelectedCardIds(new Set());

      if (moveRes.isChop && moveRes.choppedPlayerId && moveRes.penaltyAmount) {
        const choppedPlayer = engine.getPlayer(moveRes.choppedPlayerId);
        triggerChopAlert(p0.name, choppedPlayer?.name || '', moveRes.penaltyAmount);
      }

      const lastMove = engine.getLeadingMove();
      if (lastMove) {
        for (const t of Object.values(trackersRef.current)) {
          t.recordMove(lastMove);
        }
      }

      syncGameState();
    } else {
      alert(moveRes.error || 'Nước đi không hợp lệ');
    }
  };

  // Người Chơi Bỏ Lượt
  const handlePassTurn = () => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const passRes = engine.passTurn('p0');
    if (passRes.success) {
      soundManager.playPass();
      setSelectedCardIds(new Set());
      if (engine.getLeadingMove()) {
        for (const t of Object.values(trackersRef.current)) {
          t.recordPassWithDetails('p0', engine.getLeadingMove()!.combination);
        }
      }
      syncGameState();
    }
  };

  // Người Chơi Tự Động Xếp Bài
  const handleAutoSort = () => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const p0 = engine.getPlayer('p0');
    if (p0) {
      p0.hand = sortCards(p0.hand);
      setPlayers([...engine.players]);
    }
  };

  // Người Chơi Áp Dụng Gợi Ý AI
  const handleApplyAiHint = () => {
    if (!currentHint || currentHint.action === 'PASS') {
      handlePassTurn();
      return;
    }
    if (currentHint.cards) {
      const ids = new Set(currentHint.cards.map(c => c.id));
      setSelectedCardIds(ids);
    }
  };

  // Cập nhật cài đặt
  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    if (engineRef.current) {
      engineRef.current.settings = newSettings;
    }
  };

  // Cập nhật Persona cho từng ghế Bot
  const handleUpdateBotPersona = (seatIndex: number, personaId: string) => {
    const updated: [string, string, string] = [...botPersonaIds];
    updated[seatIndex] = personaId;
    setBotPersonaIds(updated);
  };

  const p0 = players[0];
  const p1 = players[1]; // Trái
  const p2 = players[2]; // Trên
  const p3 = players[3]; // Phải

  // Kiểm tra nút Đánh Bài của người chơi có hợp lệ không
  const isP0Turn = currentTurnPlayerId === 'p0';
  const selectedCards = p0 ? p0.hand.filter(c => selectedCardIds.has(c.id)) : [];
  const isValidPlaySelection =
    isP0Turn &&
    selectedCards.length > 0 &&
    isValidMove(
      selectedCards,
      currentMove ? currentMove.combination : null,
      engineRef.current?.isFirstMoveOfGame ?? false,
      engineRef.current?.isRoundLeadMove() ?? false
    ).valid;

  const canP0Pass = isP0Turn && !(engineRef.current?.isRoundLeadMove() ?? false);

  return (
    <div className="relative h-screen h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between overflow-hidden bg-[#160204]">
      {/* Cánh hoa đào / hoa mai rơi nhẹ nhàng */}
      <div className="floating-blossom text-2xl left-[10%] top-0">🌸</div>
      <div className="floating-blossom text-xl left-[35%] top-0 [animation-delay:3s]">🌼</div>
      <div className="floating-blossom text-2xl left-[70%] top-0 [animation-delay:6s]">🌸</div>
      <div className="floating-blossom text-xl left-[85%] top-0 [animation-delay:1.5s]">🌼</div>

      {/* Thanh công cụ đỉnh (Header) */}
      <HeaderBar
        gameNumber={gameNumber}
        mode={settings.mode}
        betAmount={settings.betAmount}
        soundEnabled={settings.soundEnabled}
        onToggleSound={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenXRay={() => setIsXRayOpen(true)}
        onResetMatch={() => startNewGame(1)}
      />

      {/* BẢNG HUD THÔNG TIN 4 NGƯỜI CHƠI BÊN TRÁI (KHÔNG BỊ BÀN CHE KHUẤT) */}
      <LeftMatchHUD
        players={players}
        currentTurnPlayerId={currentTurnPlayerId}
        leadPlayerId={leadPlayerId}
        gameNumber={gameNumber}
        betAmount={settings.betAmount}
        isDealing={isDealing}
        dealtCounts={dealtCounts}
      />

      {/* KHÔNG GIAN SÀN ĐẤU TIẾN LÊN: 4 NGƯỜI CHƠI BAO QUANH BÀN TRÒN TRUNG TÂM */}
      <main className="flex-1 flex flex-col items-center justify-between px-2 py-1 max-w-7xl mx-auto w-full min-h-0 overflow-hidden relative">
        {/* Banner thông báo người đi trước mở màn ván */}
        {dealBanner && (
          <div className="absolute top-16 z-50 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-yellow-100 font-extrabold px-6 py-2 rounded-full border-2 border-yellow-300 shadow-2xl animate-bounce text-sm sm:text-base flex items-center gap-2">
            <span>{dealBanner}</span>
          </div>
        )}

        {/* GHẾ TRÊN: BOT 2 (CHÚ BẢY) - NẰM NGOÀI BÀN Ở PHÍA TRÊN */}
        <div className="flex justify-center w-full z-20">
          <BotSeat
            player={p2}
            botConfig={getBotConfig(botPersonaIds[1], customBotConfigs[1])}
            isCurrentTurn={!isDealing && currentTurnPlayerId === p2.id}
            position="top"
            isLeader={leadPlayerId === p2.id}
            isDealing={isDealing}
            displayCardCount={dealtCounts[p2.id]}
          />
        </div>

        {/* HÀNG GIỮA: BOT 1 (TRÁI) | BÀN TRÒN TRUNG TÂM (HÌNH TRÒN CHUẨN) | BOT 3 (PHẢI) */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 md:gap-14 w-full px-2 sm:px-6 z-20 my-auto">
          {/* Ghế Trái: Bot 1 (Bé Năm) - Nằm ngoài bàn bên trái */}
          <div className="flex justify-center flex-shrink-0">
            <BotSeat
              player={p1}
              botConfig={getBotConfig(botPersonaIds[0], customBotConfigs[0])}
              isCurrentTurn={!isDealing && currentTurnPlayerId === p1.id}
              position="left"
              isLeader={leadPlayerId === p1.id}
              isDealing={isDealing}
              displayCardCount={dealtCounts[p1.id]}
            />
          </div>

          {/* BÀN TRÒN TRUNG TÂM (HÌNH TRÒN CHUẨN 1:1 VIP - KÍCH THƯỚC CỐ ĐỊNH) */}
          <div className="round-table relative flex items-center justify-center p-4 sm:p-6 shadow-2xl">
            {/* Lớp nỉ nhung & Vòng chỉ vàng chìm của bàn tròn */}
            <div className="table-inner-felt">
              <div className="table-center-emblem">
                <span className="text-yellow-500/20 font-black text-[11px] sm:text-[13px] uppercase tracking-[0.35em] select-none text-center">
                  TIẾN LÊN MIỀN NAM
                </span>
              </div>
            </div>

            {/* Hiệu ứng bộ bài 3D và chia bài 4 người xoay vòng chuẩn tâm bàn */}
            {isDealing && (
              <DealingDeckAnimation
                isDealing={isDealing}
                onDealComplete={handleDealComplete}
                onDealCard={handleDealCard}
                onSkip={handleDealComplete}
              />
            )}

            {/* Trung Tâm Bàn Tròn: Bài đã đánh & Thông báo chặt đẹp */}
            <div className="relative z-10 w-full flex justify-center">
              <TableCenter
                currentMove={currentMove}
                isLeadMove={engineRef.current?.isRoundLeadMove() ?? true}
                chopNotification={chopNotification}
                isDealing={isDealing}
              />
            </div>
          </div>

          {/* Ghế Phải: Bot 3 (Cô Ba) - Nằm ngoài bàn bên phải */}
          <div className="flex justify-center flex-shrink-0">
            <BotSeat
              player={p3}
              botConfig={getBotConfig(botPersonaIds[2], customBotConfigs[2])}
              isCurrentTurn={!isDealing && currentTurnPlayerId === p3.id}
              position="right"
              isLeader={leadPlayerId === p3.id}
              isDealing={isDealing}
              displayCardCount={dealtCounts[p3.id]}
            />
          </div>
        </div>

        {/* GHẾ DƯỚI: NGƯỜI CHƠI (BẢN THÂN) - NẰM NGOÀI BÀN Ở PHÍA DƯỚI */}
        <div className="w-full max-w-4xl mx-auto mt-1 sm:mt-2 z-30 flex-shrink-0">
          <PlayerHandView
            player={p0}
            selectedCardIds={selectedCardIds}
            onToggleCardSelect={handleToggleCardSelect}
            onPlaySelectedCards={handlePlaySelectedCards}
            onPassTurn={handlePassTurn}
            onAutoSort={handleAutoSort}
            onGetAiHint={handleApplyAiHint}
            isCurrentTurn={!isDealing && isP0Turn}
            canPlay={isValidPlaySelection}
            canPass={canP0Pass}
            isLeader={leadPlayerId === 'p0'}
            isDealing={isDealing}
            dealtCardsCount={dealtCounts['p0']}
          />
        </div>
      </main>

      {/* MODALS */}
      {/* 1. Modal Soi Bài & Huấn Luyện AI */}
      <XRayInspector
        isOpen={isXRayOpen}
        onClose={() => setIsXRayOpen(false)}
        tracker={trackersRef.current['p0'] || new CardTracker(p0?.hand || [], 1.0)}
        ownHand={p0?.hand || []}
        currentHint={currentHint}
      />

      {/* 2. Modal Cài Đặt */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        botPersonaIds={botPersonaIds}
        onUpdateBotPersona={handleUpdateBotPersona}
        customBotConfigs={customBotConfigs}
        onUpdateCustomBotConfig={handleUpdateCustomBotConfig}
        onApplyGodModeAll={handleApplyGodModeAll}
      />

      {/* 3. Modal Chiến Thắng Cuối Ván */}
      <VictoryModal
        isOpen={isVictoryOpen}
        onNextGame={() => {
          setIsVictoryOpen(false);
          startNewGame(gameNumber + 1);
        }}
        winners={winners}
        allPlayers={players}
        betAmount={settings.betAmount}
        instantWinType={instantWinType}
      />
    </div>
  );
};
