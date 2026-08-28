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
  LogOut, 
  RotateCw,
  BarChart3
} from 'lucide-react';
import { Badge } from '../../primitives';

export interface MobileGameTableScreenProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
  onPlaySelectedCards: () => void;
  onPassTurn: () => void;
  onAutoSort: () => void;
  onDealCard: (playerIndex: number, currentCardCount: number) => void;
  onDealComplete: () => void;
  onReturnToLobby: () => void;
}

export const MobileGameTableScreen: React.FC<MobileGameTableScreenProps> = ({
  engineRef,
  onPlaySelectedCards,
  onPassTurn,
  onAutoSort,
  onDealCard,
  onDealComplete,
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

  // Danh sách các phương án Chọn Nhanh (Bắt Bài)
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

      {/* 1. HEADER BAR TINH GỌN CHO MOBILE (SAFE AREA TOP/LEFT/RIGHT, NỀN ĐẶC #0e1422) */}
      <header className="relative z-30 w-full pl-[max(env(safe-area-inset-left),1rem)] pr-[max(env(safe-area-inset-right),1rem)] pt-[max(env(safe-area-inset-top),0.375rem)] pb-1.5 bg-[#0e1422] border-b border-[#222c3d] flex items-center justify-between shadow-md shrink-0">
        {/* Nhóm trái: Ván đấu & Tiền cược */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => setIsMatchHudDrawerOpen(true)}
            className="flex items-center gap-1.5 bg-[#281e08] border border-amber-500/50 text-amber-300 px-2.5 py-1 rounded-xl text-[11px] font-black shadow-sm active:scale-95 transition-transform"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>#{gameNumber}</span>
          </button>

          <Badge variant="gold" size="sm">
            💰 {gameSettings.betAmount.toLocaleString()} Xu
          </Badge>
        </div>

        {/* Nhóm giữa: Nút mở nhanh Chỉ Số (Match HUD) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => setIsMatchHudDrawerOpen(true)}
            className="flex items-center gap-1.5 bg-[#141b2b] border border-[#2a3449] px-3 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold text-zinc-200 hover:text-[var(--color-gold)] active:scale-95 transition-transform shadow-sm"
            title="Mở Bảng Chỉ Số & Điểm Trận Đấu"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Chỉ Số</span>
          </button>

          {botReasoningLogEnabled && (
            <button
              onClick={() => setIsReasoningHudOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold border transition-all ${
                isReasoningHudOpen
                  ? 'bg-purple-950 border-purple-400 text-purple-300'
                  : 'bg-[#141b2b] border-[#2a3449] text-zinc-300'
              }`}
            >
              <span>AI Bot</span>
            </button>
          )}
        </div>

        {/* Nhóm phải: Nút Âm Thanh, Cài Đặt, Thoát */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={toggleSound}
            className="w-7 h-7 rounded-xl bg-[#141b2b] border border-[#2a3449] flex items-center justify-center text-[var(--text-secondary)] active:scale-95 shadow-sm"
            title="Bật/Tắt Âm Thanh"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[var(--color-gold)]" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => openModal('SETTINGS')}
            className="w-7 h-7 rounded-xl bg-[#141b2b] border border-[#2a3449] flex items-center justify-center text-[var(--text-secondary)] active:scale-95 shadow-sm"
            title="Cài Đặt"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onReturnToLobby}
            className="w-7 h-7 rounded-xl bg-[#3b1219] border border-rose-500/40 flex items-center justify-center text-rose-300 active:scale-95 shadow-sm"
            title="Thoát Về Sảnh"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. SÀN ĐẤU TIẾN LÊN MOBILE (LANDSCAPE CASINO FELT SAFE AREAS, NỀN ĐẶC) */}
      <main className="flex-1 flex flex-col items-center justify-between pl-[max(env(safe-area-inset-left),0.5rem)] pr-[max(env(safe-area-inset-right),0.5rem)] pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-0.5 max-w-7xl mx-auto w-full min-h-0 overflow-visible relative">
        
        {/* Banner thông báo nhiệm vụ */}
        {questToast && (
          <div className="absolute top-1 z-50 bg-[#121826] text-[var(--text-primary)] px-3 py-1.5 rounded-xl border border-[var(--color-gold)] shadow-2xl animate-fade-in flex items-center gap-2">
            <span className="text-base">{questToast.icon}</span>
            <div className="flex flex-col">
              <span className="text-[9px] font-extrabold uppercase text-[var(--color-gold)]">🎯 Hoàn Thành!</span>
              <span className="text-[11px] font-bold text-[var(--text-primary)]">{questToast.title}</span>
            </div>
          </div>
        )}

        {/* Banner thông báo người đi đầu */}
        {dealBanner && (
          <div className="absolute top-2 z-50 bg-[#121724] text-[#f3e5ab] font-black px-3.5 py-0.5 rounded-full border border-[#d4af37] shadow-xl animate-bounce text-[11px] flex items-center gap-1.5">
            <span>{dealBanner}</span>
          </div>
        )}

        {/* BONG BÓNG CHAT TRỢ LÝ AI NỔI TRÊN SÀN ĐẤU (CHỈ NHẮC NHỞ CHIẾN THUẬT KHI BẬT TÍNH NĂNG & ĐẾN LƯỢT) */}
        {aiHintEnabled && isP0Turn && !isDealing && currentHint && dismissedHintTitle !== currentHint.title && (
          <div 
            className="absolute top-2 left-2 z-40 max-w-[270px] sm:max-w-[300px] bg-[#0e1424] border-2 border-amber-400/60 rounded-2xl p-2.5 shadow-2xl animate-fade-in flex items-start gap-2.5 select-none"
          >
            <div className="w-7 h-7 rounded-xl bg-[#281e08] border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0 text-sm shadow-inner">
              🧙‍♂️
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] font-black uppercase text-amber-300 truncate">
                  Trợ Lý AI: {currentHint.title}
                </span>
                <button
                  onClick={() => setDismissedHintTitle(currentHint.title)}
                  className="text-zinc-400 text-xs hover:text-white px-1 -mr-1"
                  title="Đóng bóng chat"
                >
                  ✕
                </button>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-100 font-medium leading-tight mt-0.5">
                {currentHint.message}
              </p>
            </div>
          </div>
        )}

        {/* GHẾ TRÊN: BOT 2 (HOẶC ĐỐI THỦ DUY NHẤT TRONG SOLO 1V1) */}
        <div className="flex justify-center w-full z-20 shrink-0 pt-0.5">
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
              size="compact"
            />
          )}
        </div>

        {/* HÀNG GIỮA: BOT TRÁI | BÀN TRÒN NỈ CỔ ĐIỂN | BOT PHẢI */}
        <div className="flex items-center justify-between w-full px-2 z-20 my-0.5 overflow-visible">
          {/* Ghế Trái: Bot 1 */}
          <div className="flex justify-center shrink-0">
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
                size="compact"
              />
            ) : (
              <div className="w-10" />
            )}
          </div>

          {/* BÀN TRÒN NỈ TRUNG TÂM (ROUND TABLE, OVERFLOW VISIBLE CHO BÀI ĐÁNH TRÀN BÀN) */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0c2e24] border-2 border-amber-500/40 shadow-[inset_0_0_16px_rgba(0,0,0,0.9),0_0_20px_rgba(0,0,0,0.7)] flex items-center justify-center overflow-visible z-10">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <span className="text-[#d4af37] font-black text-[6px] sm:text-[7px] uppercase tracking-[0.2em] text-center">
                TIẾN LÊN
              </span>
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
            <div className="relative z-20 w-full flex justify-center overflow-visible">
              <TableCenter
                currentMove={currentMove}
                isLeadMove={engineRef.current?.isRoundLeadMove() ?? true}
                chopNotification={chopNotification}
                isDealing={isDealing}
                cardSize="table"
              />
            </div>
          </div>

          {/* Ghế Phải: Bot 3 */}
          <div className="flex justify-center shrink-0">
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
                size="compact"
              />
            ) : (
              <div className="w-10" />
            )}
          </div>
        </div>

        {/* GHẾ DƯỚI: TAY BÀI VÀ CÁC NÚT ĐIỀU KHIỂN CỦA NGƯỜI CHƠI (P0, FULL THÂN BÀI 100%) */}
        <div className="w-full flex justify-center z-30 mb-0 overflow-visible shrink-0">
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
              cardSize="mobile"
            />
          )}
        </div>
      </main>

      {/* BOTTOM SHEET DRAWER: BẢNG CHỈ SỐ */}
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
