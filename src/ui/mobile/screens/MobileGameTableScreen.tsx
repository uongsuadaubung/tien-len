import React, { useState, useMemo, useCallback } from 'react';
import { GameEngine } from '../../../engine/game';
import { isValidMove } from '../../../engine/validator';
import { getBotConfig } from '../../../ai/bot-factory';
import { BotSeat } from '../../components/BotSeat';
import { TableCenter } from '../../components/TableCenter';
import { DealingDeckAnimation } from '../../components/DealingDeckAnimation';
import { PlayerHandView } from '../../components/PlayerHandView';
import { BotReasoningHUD } from '../../web/components/BotReasoningHUD';
import { MobileMatchHUDDrawer } from '../components/MobileMatchHUDDrawer';
import { evaluateSelectionFeedback } from '../../../ai/hint-engine';
import { CardTracker } from '../../../ai/card-tracker';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getSortedQuickSelectCandidates, getNextQuickSelectCards } from '../../../engine/quick-response-finder';
import { soundManager } from '../../audio/sound-manager';

// Stores
import { useModalStore } from '../../../stores/useModalStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useGameStore } from '../../../stores/useGameStore';

// Icons
import { 
  Trophy, 
  Settings, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  LogOut, 
  Bot, 
  RotateCw,
  Sparkles
} from 'lucide-react';
import { Badge } from '../../primitives';

export interface MobileGameTableScreenProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
  onPlaySelectedCards: () => void;
  onPassTurn: () => void;
  onAutoSort: () => void;
  onApplyAiHint: () => void;
  onDealCard: (playerIndex: number, currentCardCount: number) => void;
  onDealComplete: () => void;
  onResetMatch: () => void;
  onReturnToLobby: () => void;
}

export const MobileGameTableScreen: React.FC<MobileGameTableScreenProps> = ({
  engineRef,
  onPlaySelectedCards,
  onPassTurn,
  onAutoSort,
  onApplyAiHint,
  onDealCard,
  onDealComplete,
  onResetMatch,
  onReturnToLobby
}) => {
  const [isMatchHudDrawerOpen, setIsMatchHudDrawerOpen] = useState<boolean>(false);
  const [isReasoningHudOpen, setIsReasoningHudOpen] = useState<boolean>(false);
  const [dismissedHintTitle, setDismissedHintTitle] = useState<string | null>(null);

  const { openModal } = useModalStore();
  const { isPortrait } = useIsMobile();
  const {
    soundEnabled,
    aiHintEnabled,
    quickResponseAssistEnabled,
    botReasoningLogEnabled,
    toggleSound
  } = useSettingsStore();

  const {
    gameSettings,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    gameNumber,
    isDealing,
    dealtCounts,
    dealBanner,
    chopNotification,
    questToast,
    players,
    currentTurnPlayerId,
    leadPlayerId,
    currentMove,
    selectedCardIds,
    currentHint,
    handSortMode,
    smartVariantIndex,
    botThinkingThought,
    setSelectedCardIds,
    toggleCardSelect,
    clearCardSelection
  } = useGameStore();

  // Phân bổ ghế người chơi
  const p0 = players[0];
  const p1 = players[1]; // Bot 1 (Trái hoặc Trên nếu solo 1v1)
  const p2 = players[2]; // Bot 2 (Trên nếu bàn 3-4 người)
  const p3 = players[3]; // Bot 3 (Phải nếu bàn 4 người)

  const isP0Turn = currentTurnPlayerId === 'p0';
  const selectedCards = p0 ? p0.hand.filter(c => selectedCardIds.has(c.id)) : [];
  const isValidPlaySelection =
    isP0Turn &&
    selectedCards.length > 0 &&
    isValidMove({
      cards: selectedCards,
      target: currentMove?.combination || null,
      isFirstMoveOfGame: engineRef.current?.isFirstMoveOfGame ?? false,
      isLeadMove: engineRef.current?.isRoundLeadMove() ?? true,
      hasPassedRound: p0?.isPassedCurrentRound ?? false,
      allowFourPairsCutAnytime: engineRef.current?.rules.chopping.allowFourPairsCutAnytime ?? true,
      isFinishingMove: selectedCards.length === (p0?.hand.length ?? 0),
      prohibitEndingWithTwo: engineRef.current?.rules.gameFlow.prohibitEndingWithTwo ?? true
    }).valid;

  const canP0Pass =
    isP0Turn &&
    !isDealing &&
    !(engineRef.current?.isFirstMoveOfGame ?? false) &&
    !(engineRef.current?.isRoundLeadMove() ?? true);

  // Danh sách các phương án Chọn Nhanh
  const quickSelectCandidates = useMemo(() => {
    if (!engineRef.current || !isP0Turn || !p0 || p0.hand.length === 0) return [];
    const engine = engineRef.current;
    return getSortedQuickSelectCandidates({
      hand: p0.hand,
      leadingMove: engine.getLeadingMove(),
      isLeadMove: engine.isRoundLeadMove(),
      isFirstMoveOfGame: engine.isFirstMoveOfGame,
      allowFourPairsCutAnytime: engine.rules.chopping.allowFourPairsCutAnytime,
      prohibitEndingWithTwo: engine.rules.gameFlow.prohibitEndingWithTwo
    });
  }, [isP0Turn, p0, currentMove]);

  // Phản hồi nhận xét chiến thuật thời gian thực của Quân Sư
  const activeAiHint = useMemo(() => {
    if (!aiHintEnabled || !isP0Turn || !p0 || !engineRef.current) return currentHint;
    if (selectedCards.length === 0) return currentHint;

    const engine = engineRef.current;
    const tracker = new CardTracker(p0.hand, 1.0);

    const feedback = evaluateSelectionFeedback({
      selectedCards,
      hand: p0.hand,
      leadingMove: engine.getLeadingMove(),
      isFirstMoveOfGame: engine.isFirstMoveOfGame,
      isLeadMove: engine.isRoundLeadMove(),
      tracker,
      optimalHint: currentHint,
      prohibitEndingWithTwo: engine.rules.gameFlow.prohibitEndingWithTwo
    });

    return feedback || currentHint;
  }, [aiHintEnabled, isP0Turn, p0, selectedCards, currentHint]);

  const canQuickSelect = isP0Turn && !isDealing && quickSelectCandidates.length > 0;

  const handleQuickSelect = useCallback(() => {
    if (!engineRef.current || !isP0Turn || !p0 || p0.hand.length === 0) return;
    const engine = engineRef.current;

    const nextCards = getNextQuickSelectCards(
      {
        hand: p0.hand,
        leadingMove: engine.getLeadingMove(),
        isLeadMove: engine.isRoundLeadMove(),
        isFirstMoveOfGame: engine.isFirstMoveOfGame,
        allowFourPairsCutAnytime: engine.rules.chopping.allowFourPairsCutAnytime,
        prohibitEndingWithTwo: engine.rules.gameFlow.prohibitEndingWithTwo
      },
      selectedCardIds
    );

    if (nextCards && nextCards.length > 0) {
      setSelectedCardIds(new Set(nextCards.map(c => c.id)));
      soundManager.playCardDeal();
    }
  }, [isP0Turn, p0, selectedCardIds, setSelectedCardIds]);

  // Phân bổ ghế đối thủ
  const isSolo1v1 = playerCount === 2;
  const topBot = isSolo1v1 ? p1 : (playerCount >= 3 ? p2 : null);
  const leftBot = isSolo1v1 ? null : p1;
  const rightBot = playerCount >= 4 ? p3 : null;

  const topBotPersonaId = isSolo1v1 ? botPersonaIds[0] : botPersonaIds[1];
  const topBotCustomConfig = isSolo1v1 ? customBotConfigs[0] : customBotConfigs[1];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[radial-gradient(ellipse_at_center,#141926_0%,#090c12_100%)] flex flex-col justify-between select-none">
      
      {/* OVERLAY NHẮC XOAY NGANG MÀN HÌNH NẾU ĐANG CẦM DỌC TRÊN MOBILE */}
      {isPortrait && (
        <div className="fixed inset-0 z-50 bg-[#0a0d14]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white animate-fade-in select-none">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 mb-5 shadow-2xl animate-pulse">
            <RotateCw className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-black text-[var(--color-gold)] mb-2 uppercase tracking-wide">
            Xoay Ngang Thiết Bị
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-xs leading-relaxed mb-6">
            Bàn đấu Tiến Lên Miền Nam được tối ưu hoàn hảo nhất ở chế độ màn hình ngang (Landscape). Vui lòng xoay ngang điện thoại để có trải nghiệm đánh bài tốt nhất!
          </p>
          <button
            onClick={() => {
              useGameStore.setState({ currentScreen: 'LOBBY' });
            }}
            className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-zinc-300 hover:text-white"
          >
            Quay Về Sảnh
          </button>
        </div>
      )}

      {/* 1. HEADER BAR TINH GỌN CHO MOBILE (SAFE AREA TOP/LEFT/RIGHT) */}
      <header className="relative z-30 w-full pl-[max(env(safe-area-inset-left),0.75rem)] pr-[max(env(safe-area-inset-right),0.75rem)] pt-[max(env(safe-area-inset-top),0.375rem)] pb-1.5 bg-[#0e131d]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between shadow-md shrink-0">
        {/* Nhóm trái: Ván đấu & Tiền cược */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMatchHudDrawerOpen(true)}
            className="flex items-center gap-1 bg-amber-500/20 border border-amber-400/50 text-amber-300 px-2 py-1 rounded-lg text-xs font-black shadow-sm active:scale-95 transition-transform"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>#{gameNumber}</span>
          </button>

          <Badge variant="gold" size="sm">
            💰 {gameSettings.betAmount.toLocaleString()} Xu
          </Badge>
        </div>

        {/* Nhóm giữa: Nút mở nhanh Bảng Điểm & Quân Sư */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMatchHudDrawerOpen(true)}
            className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-card)] px-2.5 py-1 rounded-lg text-[11px] font-bold text-[var(--color-gold)] active:scale-95 transition-transform"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Quân Sư</span>
          </button>

          {botReasoningLogEnabled && (
            <button
              onClick={() => setIsReasoningHudOpen(prev => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                isReasoningHudOpen
                  ? 'bg-purple-600/30 border-purple-400 text-purple-300'
                  : 'bg-[var(--bg-card)] border-[var(--border-card)] text-zinc-300'
              }`}
            >
              <span>AI Bot</span>
            </button>
          )}
        </div>

        {/* Nhóm phải: Nút Âm Thanh, Cài Đặt, Thoát */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSound}
            className="w-7 h-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-secondary)] active:scale-95"
            title="Bật/Tắt Âm Thanh"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[var(--color-gold)]" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => openModal('SETTINGS')}
            className="w-7 h-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-secondary)] active:scale-95"
            title="Cài Đặt"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onResetMatch}
            className="w-7 h-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-secondary)] active:scale-95"
            title="Chia Lại Ván"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onReturnToLobby}
            className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 active:scale-95"
            title="Thoát Về Sảnh"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. SÀN ĐẤU TIẾN LÊN MOBILE (LANDSCAPE CASINO FELT SAFE AREAS) */}
      <main className="flex-1 flex flex-col items-center justify-between pl-[max(env(safe-area-inset-left),0.5rem)] pr-[max(env(safe-area-inset-right),0.5rem)] pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-0.5 max-w-7xl mx-auto w-full min-h-0 overflow-hidden relative">
        
        {/* Banner thông báo nhiệm vụ */}
        {questToast && (
          <div className="absolute top-1 z-50 bg-[var(--bg-container)]/95 text-[var(--text-primary)] px-3 py-1.5 rounded-xl border border-[var(--color-gold)] shadow-xl animate-fade-in flex items-center gap-2 backdrop-blur-md">
            <span className="text-base">{questToast.icon}</span>
            <div className="flex flex-col">
              <span className="text-[9px] font-extrabold uppercase text-[var(--color-gold)]">🎯 Hoàn Thành!</span>
              <span className="text-[11px] font-bold text-[var(--text-primary)]">{questToast.title}</span>
            </div>
          </div>
        )}

        {/* Banner thông báo người đi đầu */}
        {dealBanner && (
          <div className="absolute top-3 z-50 bg-[#121724]/95 text-[#f3e5ab] font-black px-4 py-1 rounded-full border border-[#d4af37] shadow-xl animate-bounce text-xs flex items-center gap-1.5">
            <span>{dealBanner}</span>
          </div>
        )}

        {/* BONG BÓNG THOẠI QUÂN SƯ NỔI KHI ĐẾN LƯỢT NGƯỜI CHƠI */}
        {aiHintEnabled && isP0Turn && activeAiHint && dismissedHintTitle !== activeAiHint.title && (
          <div 
            onClick={() => setIsMatchHudDrawerOpen(true)}
            className="absolute top-1 left-2 z-40 max-w-[240px] bg-[#0d121d]/95 backdrop-blur-md border border-amber-400/50 rounded-xl p-2 shadow-2xl animate-fade-in flex items-start gap-1.5 cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[var(--color-gold)] truncate">
                  {activeAiHint.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDismissedHintTitle(activeAiHint.title);
                  }}
                  className="text-zinc-400 text-[10px] hover:text-white px-1"
                >
                  ✕
                </button>
              </div>
              <p className="text-[10px] text-zinc-200 line-clamp-2 leading-tight mt-0.5">
                {activeAiHint.message}
              </p>
            </div>
          </div>
        )}

        {/* GHẾ TRÊN: BOT 2 (HOẶC ĐỐI THỦ DUY NHẤT TRONG SOLO 1V1) */}
        <div className="flex justify-center w-full z-20">
          {topBot && (
            <BotSeat
              player={topBot}
              botConfig={getBotConfig(topBotPersonaId, topBotCustomConfig)}
              isCurrentTurn={!isDealing && currentTurnPlayerId === topBot.id}
              position="top"
              isLeader={leadPlayerId === topBot.id}
              isDealing={isDealing}
              displayCardCount={dealtCounts[topBot.id]}
              thoughtText={botThinkingThought?.botId === topBot.id ? botThinkingThought.text : null}
            />
          )}
        </div>

        {/* HÀNG GIỮA: BOT TRÁI | BÀN TRÒN NỈ | BOT PHẢI */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 w-full px-1 z-20 my-auto">
          {/* Ghế Trái: Bot 1 */}
          <div className="flex justify-center shrink-0 min-w-[80px]">
            {leftBot ? (
              <BotSeat
                player={leftBot}
                botConfig={getBotConfig(botPersonaIds[0], customBotConfigs[0])}
                isCurrentTurn={!isDealing && currentTurnPlayerId === leftBot.id}
                position="left"
                isLeader={leadPlayerId === leftBot.id}
                isDealing={isDealing}
                displayCardCount={dealtCounts[leftBot.id]}
                thoughtText={botThinkingThought?.botId === leftBot.id ? botThinkingThought.text : null}
              />
            ) : (
              <div className="w-16" />
            )}
          </div>

          {/* BÀN TRÒN NỈ TRUNG TÂM */}
          <div className="round-table relative flex items-center justify-center p-2 shadow-2xl scale-90 sm:scale-100">
            <div className="table-inner-felt">
              <div className="table-center-emblem">
                <span className="text-[#d4af37]/25 font-black text-[10px] uppercase tracking-[0.25em] select-none text-center">
                  TIẾN LÊN MIỀN NAM
                </span>
              </div>
            </div>

            {/* Hiệu ứng chia bài */}
            {isDealing && (
              <DealingDeckAnimation
                isDealing={isDealing}
                playerCount={playerCount}
                onDealComplete={onDealComplete}
                onDealCard={onDealCard}
                onSkip={onDealComplete}
              />
            )}

            {/* Bài đã đánh & Thông báo chặt đẹp */}
            <div className="relative z-10 w-full flex justify-center">
              <TableCenter
                currentMove={currentMove}
                isLeadMove={engineRef.current?.isRoundLeadMove() ?? true}
                chopNotification={chopNotification}
                isDealing={isDealing}
              />
            </div>
          </div>

          {/* Ghế Phải: Bot 3 */}
          <div className="flex justify-center shrink-0 min-w-[80px]">
            {rightBot ? (
              <BotSeat
                player={rightBot}
                botConfig={getBotConfig(botPersonaIds[2], customBotConfigs[2])}
                isCurrentTurn={!isDealing && currentTurnPlayerId === rightBot.id}
                position="right"
                isLeader={leadPlayerId === rightBot.id}
                isDealing={isDealing}
                displayCardCount={dealtCounts[rightBot.id]}
                thoughtText={botThinkingThought?.botId === rightBot.id ? botThinkingThought.text : null}
              />
            ) : (
              <div className="w-16" />
            )}
          </div>
        </div>

        {/* GHẾ DƯỚI: TAY BÀI VÀ CÁC NÚT ĐIỀU KHIỂN CỦA NGƯỜI CHƠI (P0) */}
        <div className="w-full flex justify-center z-30 mb-0.5">
          {p0 && (
            <PlayerHandView
              player={p0}
              selectedCardIds={selectedCardIds}
              onToggleCardSelect={toggleCardSelect}
              onClearCardSelection={clearCardSelection}
              onPlaySelectedCards={onPlaySelectedCards}
              onPassTurn={onPassTurn}
              onAutoSort={onAutoSort}
              onQuickSelect={quickResponseAssistEnabled ? handleQuickSelect : null}
              canQuickSelect={quickResponseAssistEnabled ? canQuickSelect : false}
              quickSelectCandidatesCount={quickSelectCandidates.length}
              isCurrentTurn={isP0Turn}
              canPlay={isValidPlaySelection}
              canPass={canP0Pass}
              isLeader={leadPlayerId === 'p0'}
              isDealing={isDealing}
              dealtCardsCount={dealtCounts['p0']}
              isFirstMoveOfGame={engineRef.current?.isFirstMoveOfGame ?? false}
              sortMode={handSortMode}
              variantIndex={smartVariantIndex}
            />
          )}
        </div>
      </main>

      {/* BOTTOM SHEET DRAWER: BẢNG ĐIỂM & QUÂN SƯ */}
      <MobileMatchHUDDrawer
        isOpen={isMatchHudDrawerOpen}
        onClose={() => setIsMatchHudDrawerOpen(false)}
        players={players}
        currentTurnPlayerId={currentTurnPlayerId || 'p0'}
        leadPlayerId={leadPlayerId || 'p0'}
        gameNumber={gameNumber}
        betAmount={gameSettings.betAmount}
        isDealing={isDealing}
        dealtCounts={dealtCounts}
        aiHint={activeAiHint}
        isHumanTurn={isP0Turn}
        aiHintEnabled={aiHintEnabled}
        onApplyHint={onApplyAiHint}
        customBotConfigs={customBotConfigs}
      />

      {/* BOT REASONING HUD (DRAWER PHẢI) */}
      {botReasoningLogEnabled && (
        <BotReasoningHUD
          isOpen={isReasoningHudOpen}
          onToggle={() => setIsReasoningHudOpen(prev => !prev)}
          gameNumber={gameNumber}
          betAmount={gameSettings.betAmount}
          isDealing={isDealing}
        />
      )}
    </div>
  );
};
