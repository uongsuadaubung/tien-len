import React, { useState } from 'react';
import { GameEngine } from '../../../engine/game';
import { getBotConfig } from '../../../ai/bot-factory';
import { HeaderBar } from '../../components/HeaderBar';
import { LeftMatchHUD } from '../components/LeftMatchHUD';
import { BotReasoningHUD } from '../components/BotReasoningHUD';
import { BotSeat } from '../../components/BotSeat';
import { TableCenter } from '../../components/TableCenter';
import { DealingDeckAnimation } from '../../components/DealingDeckAnimation';
import { PlayerHandView } from '../../components/PlayerHandView';
import { useGameTableScreenLogic } from '../../hooks/useGameTableScreenLogic';

// Stores
import { useModalStore } from '../../../stores/useModalStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useGameStore } from '../../../stores/useGameStore';

export interface WebGameTableScreenProps {
  engineRef: React.RefObject<GameEngine | null>;
  onPlaySelectedCards: () => void;
  onPassTurn: () => void;
  onAutoSort: () => void;
  onDealCard: (playerIndex: number, currentCardCount: number) => void;
  onDealComplete: () => void;
  onReturnToLobby: () => void;
}

export const WebGameTableScreen: React.FC<WebGameTableScreenProps> = ({
  engineRef,
  onPlaySelectedCards,
  onPassTurn,
  onAutoSort,
  onDealCard,
  onDealComplete,
  onReturnToLobby
}) => {
  const [isReasoningHudOpen, setIsReasoningHudOpen] = useState<boolean>(true);
  const { openModal } = useModalStore();
  const { profile } = useUserStore();
  const {
    soundEnabled,
    aiHintEnabled,
    quickResponseAssistEnabled,
    xrayEnabled,
    botReasoningLogEnabled,
    toggleSound
  } = useSettingsStore();

  const {
    activeGameType,
    myPlayerId,
    gameSettings,
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
    handSortMode,
    smartVariantIndex,
    botThinkingThought,
    toggleCardSelect,
    clearCardSelection
  } = useGameStore();

  const {
    isOnlineMatch,
    p0,
    isMyTurn,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    isValidPlaySelection,
    canP0Pass,
    topBot,
    leftBot,
    rightBot,
    topBotPersonaId,
    topBotCustomConfig,
    quickSelectCandidates,
    canQuickSelect,
    activeAiHint,
    handleQuickSelect,
    handlePlayCards,
    handlePassTurnAction
  } = useGameTableScreenLogic({
    engineRef,
    onPlaySelectedCards,
    onPassTurn
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[radial-gradient(ellipse_at_center,#141926_0%,#090c12_100%)] flex flex-col justify-between select-none">
      {/* HEADER BAR CHÍNH */}
      <HeaderBar
        gameNumber={gameNumber}
        mode={gameSettings.mode}
        betAmount={gameSettings.betAmount}
        activeGameType={activeGameType}
        playerCoins={profile.coins}
        playerElo={profile.elo}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onOpenCustomGameModal={null}
        xrayEnabled={xrayEnabled}
        onOpenRules={() => openModal('RULES')}
        onOpenSettings={() => openModal('SETTINGS')}
        onOpenXRay={() => openModal('XRAY')}
        onReturnToLobby={onReturnToLobby}
      />

      {/* BẢNG THÔNG TIN BÀN ĐẤU BÊN TRÁI (LEFT MATCH HUD) */}
      <LeftMatchHUD
        players={players}
        currentTurnPlayerId={currentTurnPlayerId || 'p0'}
        leadPlayerId={leadPlayerId || 'p0'}
        gameNumber={gameNumber}
        betAmount={gameSettings.betAmount}
        isDealing={isDealing}
        dealtCounts={dealtCounts}
        aiHint={activeAiHint}
        isHumanTurn={isMyTurn}
        aiHintEnabled={aiHintEnabled}
        customBotConfigs={customBotConfigs}
      />

      {/* BẢNG SUY LUẬN BOT AI TRỰC TIẾP BÊN PHẢI (RIGHT BOT REASONING HUD) */}
      {botReasoningLogEnabled && !isOnlineMatch && (
        <BotReasoningHUD
          isOpen={isReasoningHudOpen}
          onToggle={() => setIsReasoningHudOpen(prev => !prev)}
          gameNumber={gameNumber}
          betAmount={gameSettings.betAmount}
          isDealing={isDealing}
        />
      )}

      {/* THÔNG BÁO BANNER MỞ MÀN / NHẤT VÁN TRƯỚC */}
      {dealBanner && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-black/85 border border-[var(--border-gold)] px-6 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-90 duration-300">
          <p className="text-sm font-black text-[var(--color-gold)] tracking-wide flex items-center gap-2">
            <span>👑</span>
            <span>{dealBanner}</span>
          </p>
        </div>
      )}

      {/* THÔNG BÁO HOÀN THÀNH NHIỆM VỤ / THÀNH TỰU (TOAST) */}
      {questToast && (
        <div className="absolute top-20 right-6 z-50 bg-[#121927]/95 border border-emerald-500/50 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top duration-300 flex items-center gap-3">
          <div className="text-2xl">{questToast.icon}</div>
          <div>
            <div className="text-xs font-bold text-emerald-400">Nhiệm Vụ Hoàn Thành!</div>
            <div className="text-xs font-semibold text-white">{questToast.title}</div>
            <div className="text-[10px] text-amber-300 font-bold">+{questToast.rewardCoins.toLocaleString()} Xu</div>
          </div>
        </div>
      )}

      {/* KHÔNG GIAN BÀN CHƠI CHÍNH (MAIN GAME BOARD) */}
      <main className="relative flex-1 w-full max-w-7xl mx-auto flex flex-col justify-between items-center px-4 py-2 z-10 overflow-hidden">
        {/* GHẾ TRÊN: BOT 2 HOẶC SOLO 1V1 (BOT 1) */}
        <div className="flex justify-center w-full z-20 mt-1">
          {topBot && (
            <BotSeat
              player={topBot}
              botConfig={getBotConfig(topBotPersonaId, topBotCustomConfig || undefined)}
              isCurrentTurn={!isDealing && currentTurnPlayerId === topBot.id}
              position="top"
              isLeader={leadPlayerId === topBot.id}
              isDealing={isDealing}
              displayCardCount={dealtCounts[topBot.id]}
              thoughtText={botThinkingThought?.botId === topBot.id ? botThinkingThought.text : null}
            />
          )}
        </div>

        {/* HÀNG GIỮA: BOT TRÁI | BÀN TRÒN TRUNG TÂM | BOT PHẢI */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 md:gap-14 w-full px-2 sm:px-6 z-20 my-auto">
          {/* Ghế Trái: Bot 1 (Nếu có) */}
          <div className="flex justify-center flex-shrink-0 min-w-[120px]">
            {leftBot ? (
              <BotSeat
                player={leftBot}
                botConfig={getBotConfig(botPersonaIds[0], customBotConfigs[0] || undefined)}
                isCurrentTurn={!isDealing && currentTurnPlayerId === leftBot.id}
                position="left"
                isLeader={leadPlayerId === leftBot.id}
                isDealing={isDealing}
                displayCardCount={dealtCounts[leftBot.id]}
                thoughtText={botThinkingThought?.botId === leftBot.id ? botThinkingThought.text : null}
              />
            ) : (
              <div className="w-24 hidden md:block" />
            )}
          </div>

          {/* BÀN TRÒN TRUNG TÂM */}
          <div className="round-table relative flex items-center justify-center p-4 sm:p-6 shadow-2xl">
            <div className="table-inner-felt">
              <div className="table-center-emblem">
                <span className="text-[#d4af37]/25 font-black text-[11px] sm:text-[13px] uppercase tracking-[0.35em] select-none text-center">
                  TIẾN LÊN MIỀN NAM
                </span>
              </div>
            </div>

            {/* Hiệu ứng bộ bài 3D chia bài */}
            {isDealing && (
              <DealingDeckAnimation
                isDealing={isDealing}
                playerCount={playerCount}
                onDealComplete={onDealComplete}
                onDealCard={onDealCard}
                onSkip={onDealComplete}
              />
            )}

            {/* Trung Tâm Bàn Tròn: Bài đã đánh & Thông báo chặt đẹp */}
            <div className="relative z-10 w-full flex justify-center">
              <TableCenter
                currentMove={currentMove}
                isLeadMove={isOnlineMatch ? (currentMove === null || leadPlayerId === myPlayerId) : (engineRef.current?.isRoundLeadMove() ?? true)}
                chopNotification={chopNotification}
                isDealing={isDealing}
              />
            </div>
          </div>

          {/* Ghế Phải: Bot 3 (Nếu có) */}
          <div className="flex justify-center flex-shrink-0 min-w-[120px]">
            {rightBot ? (
              <BotSeat
                player={rightBot}
                botConfig={getBotConfig(botPersonaIds[2], customBotConfigs[2] || undefined)}
                isCurrentTurn={!isDealing && currentTurnPlayerId === rightBot.id}
                position="right"
                isLeader={leadPlayerId === rightBot.id}
                isDealing={isDealing}
                displayCardCount={dealtCounts[rightBot.id]}
                thoughtText={botThinkingThought?.botId === rightBot.id ? botThinkingThought.text : null}
              />
            ) : (
              <div className="w-24 hidden md:block" />
            )}
          </div>
        </div>

        {/* GHẾ DƯỚI: TAY BÀI VÀ CÁC NÚT ĐIỀU KHIỂN CỦA NGƯỜI CHƠI (P0) */}
        <div className="w-full flex justify-center z-30 mb-1">
          {p0 && (
            <PlayerHandView
              player={p0}
              selectedCardIds={selectedCardIds}
              onToggleCardSelect={toggleCardSelect}
              onClearCardSelection={clearCardSelection}
              onPlaySelectedCards={handlePlayCards}
              onPassTurn={handlePassTurnAction}
              onAutoSort={onAutoSort}
              onQuickSelect={quickResponseAssistEnabled ? handleQuickSelect : null}
              canQuickSelect={quickResponseAssistEnabled ? canQuickSelect : false}
              quickSelectCandidatesCount={quickSelectCandidates.length}
              isCurrentTurn={isMyTurn}
              canPlay={isValidPlaySelection}
              canPass={canP0Pass}
              isLeader={leadPlayerId === myPlayerId}
              isDealing={isDealing}
              dealtCardsCount={dealtCounts[myPlayerId]}
              isFirstMoveOfGame={isOnlineMatch ? false : (engineRef.current?.isFirstMoveOfGame ?? false)}
              sortMode={handSortMode}
              variantIndex={smartVariantIndex}
            />
          )}
        </div>
      </main>
    </div>
  );
};
