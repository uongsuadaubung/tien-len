import React from 'react';
import { GameEngine } from '../../engine/game';
import { isValidMove } from '../../engine/validator';
import { getBotConfig } from '../../ai/bot-factory';
import { HeaderBar } from '../components/HeaderBar';
import { LeftMatchHUD } from '../components/LeftMatchHUD';
import { BotSeat } from '../components/BotSeat';
import { TableCenter } from '../components/TableCenter';
import { DealingDeckAnimation } from '../components/DealingDeckAnimation';
import { PlayerHandView } from '../components/PlayerHandView';
import { FallingBlossoms } from '../components/FallingBlossoms';

// Stores
import { useModalStore } from '../../stores/useModalStore';
import { useUserStore } from '../../stores/useUserStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGameStore } from '../../stores/useGameStore';

interface GameTableScreenProps {
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

export const GameTableScreen: React.FC<GameTableScreenProps> = ({
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
  const { openModal } = useModalStore();
  const { profile } = useUserStore();
  const {
    soundEnabled,
    aiHintEnabled,
    xrayEnabled,
    toggleSound
  } = useSettingsStore();

  const {
    activeGameType,
    gameSettings,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    gameNumber,
    isDealing,
    dealtCounts,
    dealBanner,
    chopNotification,
    players,
    currentTurnPlayerId,
    leadPlayerId,
    currentMove,
    selectedCardIds,
    currentHint,
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
    isValidMove(
      selectedCards,
      currentMove?.combination || null,
      engineRef.current?.isFirstMoveOfGame ?? false,
      engineRef.current?.isRoundLeadMove() ?? true
    ).valid;

  const canP0Pass =
    isP0Turn &&
    !isDealing &&
    !(engineRef.current?.isFirstMoveOfGame ?? false) &&
    !(engineRef.current?.isRoundLeadMove() ?? true);

  // Solo 1v1: Người duy nhất đối diện p0 là p1 ở Ghế Trên
  const isSolo1v1 = playerCount === 2;
  const topBot = isSolo1v1 ? p1 : (playerCount >= 3 ? p2 : null);
  const leftBot = isSolo1v1 ? null : p1;
  const rightBot = playerCount >= 4 ? p3 : null;

  const topBotPersonaId = isSolo1v1 ? botPersonaIds[0] : botPersonaIds[1];
  const topBotCustomConfig = isSolo1v1 ? customBotConfigs[0] : customBotConfigs[1];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-radial from-[#3d0b11] via-[#200407] to-[#0d0103] flex flex-col justify-between select-none">
      {/* Hiệu ứng hoa mai Tết rơi */}
      <FallingBlossoms />

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
        xrayEnabled={xrayEnabled}
        onOpenSettings={() => openModal('SETTINGS')}
        onOpenXRay={() => openModal('XRAY')}
        onResetMatch={onResetMatch}
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
      />

      {/* SÀN ĐẤU TIẾN LÊN: NGƯỜI CHƠI BAO QUANH BÀN TRÒN TRUNG TÂM */}
      <main className="flex-1 flex flex-col items-center justify-between px-2 py-1 max-w-7xl mx-auto w-full min-h-0 overflow-hidden relative">
        {/* Banner thông báo người đi trước mở màn ván */}
        {dealBanner && (
          <div className="absolute top-16 z-50 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-yellow-100 font-extrabold px-6 py-2 rounded-full border-2 border-yellow-300 shadow-2xl animate-bounce text-sm sm:text-base flex items-center gap-2">
            <span>{dealBanner}</span>
          </div>
        )}

        {/* GHẾ TRÊN: BOT TRÊN (HOẶC ĐỐI THỦ DUY NHẤT TRONG SOLO 1V1) */}
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
                botConfig={getBotConfig(botPersonaIds[0], customBotConfigs[0])}
                isCurrentTurn={!isDealing && currentTurnPlayerId === leftBot.id}
                position="left"
                isLeader={leadPlayerId === leftBot.id}
                isDealing={isDealing}
                displayCardCount={dealtCounts[leftBot.id]}
              />
            ) : (
              <div className="w-24 hidden md:block" />
            )}
          </div>

          {/* BÀN TRÒN TRUNG TÂM */}
          <div className="round-table relative flex items-center justify-center p-4 sm:p-6 shadow-2xl">
            <div className="table-inner-felt">
              <div className="table-center-emblem">
                <span className="text-yellow-500/20 font-black text-[11px] sm:text-[13px] uppercase tracking-[0.35em] select-none text-center">
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
                isLeadMove={engineRef.current?.isRoundLeadMove() ?? true}
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
                botConfig={getBotConfig(botPersonaIds[2], customBotConfigs[2])}
                isCurrentTurn={!isDealing && currentTurnPlayerId === rightBot.id}
                position="right"
                isLeader={leadPlayerId === rightBot.id}
                isDealing={isDealing}
                displayCardCount={dealtCounts[rightBot.id]}
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
              onPlaySelectedCards={onPlaySelectedCards}
              onPassTurn={onPassTurn}
              onAutoSort={onAutoSort}
              onGetAiHint={onApplyAiHint}
              isCurrentTurn={isP0Turn}
              canPlay={isValidPlaySelection}
              canPass={canP0Pass}
              isLeader={leadPlayerId === 'p0'}
              isDealing={isDealing}
              dealtCardsCount={dealtCounts['p0']}
              aiHintEnabled={aiHintEnabled}
            />
          )}
        </div>
      </main>
    </div>
  );
};
