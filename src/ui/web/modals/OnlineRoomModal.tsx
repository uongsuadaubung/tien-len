import React from 'react';
import { useViewStore } from '../../../stores/useViewStore';
import { 
  Users, 
  Copy, 
  Check, 
  Play, 
  LogOut, 
  Bot, 
  Crown, 
  Coins, 
  Sparkles, 
  Wifi, 
  Radio,
  Lock,
  Globe,
  Plus
} from 'lucide-react';
import { useOnlineRoomLogic, SETTLEMENT_MODES } from '../../hooks/useOnlineRoomLogic';
import { TableRulesConfigPanel } from '../../components/TableRulesConfigPanel';
import { OnlineRoomBrowser } from '../../components/OnlineRoomBrowser';
import { Modal, Card, Badge, Button } from '../../primitives';
import { useI18n } from '../../../locales';

export const OnlineRoomModal: React.FC = () => {
  const { t } = useI18n();
  const { isOnlineRoomOpen } = useViewStore();
  
  const {
    profile,
    roomState,
    roomCode,
    isHost,
    tab,
    inputPin,
    tableConfig,
    copiedLink,
    copiedPin,
    canAffordBet,
    isRoomFull,
    isPublicRoom,
    publicRooms,
    isLobbyLoading,
    setTab,
    setInputPin,
    setIsPublicRoom,
    handleTableConfigChange,
    handleCopyLink,
    handleCopyPin,
    handlePastePin,
    handleCreate,
    handleJoin,
    handleJoinPublicRoom,
    handleRefreshLobby,
    handleStartGame,
    handleLeave,
    handleAddBot,
    handleRemoveSlot,
    handleClose,
    handleOpenBank
  } = useOnlineRoomLogic();

  if (!isOnlineRoomOpen) return null;

  const currentSettlement = SETTLEMENT_MODES.find(m => m.id === tableConfig.mode) || SETTLEMENT_MODES[0];

  return (
    <Modal
      isOpen={isOnlineRoomOpen}
      onClose={handleClose}
      title={t('online.modalTitle')}
      subtitle={t('online.modalSubtitle')}
      icon={<Wifi className="w-5 h-5 text-[var(--color-gold)] animate-pulse" />}
      maxWidth="2xl"
      height="h-[90vh] sm:h-[720px]"
      headerRight={
        <Badge variant="gold" size="md">
          🪙 {profile.coins.toLocaleString()} Xu
        </Badge>
      }
      footer={
        roomCode !== null ? (
          <div className="w-full flex items-center justify-between gap-3">
            <Button
              variant="surface"
              size="md"
              onClick={handleLeave}
              leftIcon={<LogOut className="w-4 h-4 text-rose-400" />}
              className="text-rose-300 font-bold border-rose-500/30 hover:bg-rose-950/40 cursor-pointer"
            >
              {isHost ? t('online.disbandBtn') : t('online.leaveBtn')}
            </Button>

            {isHost ? (
              <Button
                variant="gold"
                size="md"
                onClick={handleStartGame}
                leftIcon={<Play className="w-4 h-4 text-slate-950 fill-current" />}
                className="flex-1 font-black shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {t('online.startGameBtn')}
              </Button>
            ) : (
              <div className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--bg-card)] border border-amber-500/20 text-center text-xs font-bold text-amber-200/80 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                {t('online.waitingHost')}
              </div>
            )}
          </div>
        ) : (
          tab === 'CREATE' ? (
            <div className="w-full flex justify-end">
              <Button
                variant="gold"
                size="lg"
                onClick={handleCreate}
                disabled={!canAffordBet}
                leftIcon={<Sparkles className="w-4 h-4 text-slate-950" />}
                className="w-full font-black text-sm uppercase tracking-wider py-3.5 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {canAffordBet ? t('online.createRoomBtn') : t('online.cantAffordRoom')}
              </Button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--text-muted)]">
                {t('online.createCustomPrompt')}
              </span>
              <Button
                variant="surface"
                size="sm"
                onClick={() => setTab('CREATE')}
                leftIcon={<Plus className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                className="font-bold text-xs py-1.5 px-3 text-[var(--color-gold)] border-[var(--border-gold)]/40 hover:bg-amber-500/10"
              >
                {t('online.createRoomBtn')}
              </Button>
            </div>
          )
        )
      }
    >
      <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
        {roomCode === null ? (
          /* ========================================================================= */
          /* MÀN HÌNH 1: CHƯA VÀO PHÒNG (SẢNH PHÒNG CHỜ HOẶC TẠO PHÒNG MỚI) */
          /* ========================================================================= */
          <div className="space-y-4">
            {/* Segmented Tab Switcher (2 TABS: SẢNH PHÒNG & TẠO PHÒNG) */}
            <div className="flex rounded-2xl bg-[var(--bg-card)] p-1 border border-[var(--border-card)] shadow-inner">
              <button
                onClick={() => setTab('LOBBY')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tab === 'LOBBY'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>{t('online.tabAll')}</span>
                {publicRooms.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    tab === 'LOBBY' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {publicRooms.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setTab('CREATE')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tab === 'CREATE'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('online.createRoomBtn')}</span>
              </button>
            </div>

            {tab === 'LOBBY' ? (
              /* TAB 1: SẢNH PHÒNG CHỜ & NHẬP MÃ PIN NHANH */
              <div className="animate-in fade-in duration-200">
                <OnlineRoomBrowser
                  rooms={publicRooms}
                  isLoading={isLobbyLoading}
                  userCoins={profile.coins}
                  inputPin={inputPin}
                  onInputPinChange={setInputPin}
                  onJoinByPin={handleJoin}
                  onPastePin={handlePastePin}
                  onJoinRoom={handleJoinPublicRoom}
                  onRefresh={handleRefreshLobby}
                  onCreateRoomClick={() => setTab('CREATE')}
                  onOpenBank={handleOpenBank}
                />
              </div>
            ) : (
              /* TAB 2: TẠO PHÒNG MỚI (TÙY BIẾN 100% LUẬT & CHẾ ĐỘ CÔNG KHAI / RIÊNG TƯ) */
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Tùy chọn Quyền Riêng Tư (Public vs Private) */}
                <Card variant="surface" className="p-3 rounded-2xl border border-[var(--border-container)] bg-[var(--bg-container)]/80">
                  <div className="text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
                    <span>{t('online.roomPrivacyTitle')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPublicRoom(true)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                        isPublicRoom
                          ? 'border-[var(--color-gold)] bg-amber-500/10 shadow-sm'
                          : 'border-[var(--border-card)] bg-[var(--bg-card)] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Globe className={`w-4 h-4 mt-0.5 shrink-0 ${isPublicRoom ? 'text-[var(--color-gold)]' : 'text-zinc-400'}`} />
                      <div>
                        <span className={`font-bold text-xs block ${isPublicRoom ? 'text-[var(--color-gold)]' : 'text-[var(--text-primary)]'}`}>
                          {t('online.publicRoom')}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block leading-tight mt-0.5">
                          {t('online.publicRoomDesc')}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPublicRoom(false)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                        !isPublicRoom
                          ? 'border-[var(--color-gold)] bg-amber-500/10 shadow-sm'
                          : 'border-[var(--border-card)] bg-[var(--bg-card)] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${!isPublicRoom ? 'text-[var(--color-gold)]' : 'text-zinc-400'}`} />
                      <div>
                        <span className={`font-bold text-xs block ${!isPublicRoom ? 'text-[var(--color-gold)]' : 'text-[var(--text-primary)]'}`}>
                          {t('online.privateRoom')}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block leading-tight mt-0.5">
                          {t('online.privateRoomDesc')}
                        </span>
                      </div>
                    </button>
                  </div>
                </Card>

                {/* Bảng Cấu Hình Bàn Chơi */}
                <TableRulesConfigPanel
                  playerCoins={profile.coins}
                  config={tableConfig}
                  onChange={handleTableConfigChange}
                  showInstantWin={false}
                  showCongOption={true}
                />
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* MÀN HÌNH 2: TRONG PHÒNG CHỜ (WAITING LOBBY) */
          /* ========================================================================= */
          <div className="space-y-4 animate-in zoom-in-95 duration-200">
            {/* Hero Card: Mã Phòng & Nút Sao Chép */}
            <Card variant="active" className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/40 border-amber-500/40 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400/90 font-black uppercase tracking-wider block">
                    {t('online.roomCodeTitle')}
                  </span>
                  <Badge variant={roomState?.isPublic ? 'gold' : 'neutral'} size="sm">
                    {roomState?.isPublic ? `🌐 ${t('online.publicRoom')}` : `🔒 ${t('online.privateRoom')}`}
                  </Badge>
                </div>
                <span className="text-2xl sm:text-3xl font-mono font-black text-amber-300 tracking-wider">
                  {roomCode}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPin}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedPin ? t('online.copied') : t('online.copyPin')}</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? t('online.copied') : t('online.copyLink')}</span>
                </button>
              </div>
            </Card>

            {/* Thông tin tóm tắt bàn đấu */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="gold" size="sm">
                ⚡ {currentSettlement.label}
              </Badge>
              <Badge variant="neutral" size="sm">
                👥 {t('tableConfig.tablePlayerCount', { count: roomState ? roomState.playerCount : 4 })}
              </Badge>
              <Badge variant="neutral" size="sm">
                💰 {t('online.betPerCard', { amount: roomState ? roomState.betAmount.toLocaleString() : '---' })}
              </Badge>
              {roomState?.choppingMultiplier && roomState.choppingMultiplier > 1 && (
                <Badge variant="neutral" size="sm" className="text-amber-300">
                  ⚡ {t('online.chopMultiplierBadge', { count: roomState.choppingMultiplier, multiplier: roomState.choppingMultiplier })}
                </Badge>
              )}
            </div>

            {/* Lưới Ghế Ngồi (Player Seats Grid) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{t('online.playerListTitle', { current: roomState?.players.length || 1, max: roomState?.playerCount || 4 })}</span>
                </span>
                {isHost && !isRoomFull && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {t('online.canAddBot')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: roomState?.playerCount || 4 }).map((_, idx) => {
                  const player = roomState?.players[idx];
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        player
                          ? 'border-amber-500/40 bg-[var(--bg-card)] shadow-md'
                          : 'border-dashed border-white/10 bg-black/20'
                      }`}
                    >
                      {player ? (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative text-2xl w-10 h-10 rounded-xl bg-slate-800 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
                              {player.avatar}
                              {player.isHost && (
                                <Crown className="w-4 h-4 text-yellow-400 absolute -top-1.5 -right-1.5 drop-shadow" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-white truncate max-w-[120px]">
                                  {player.name}
                                </span>
                                {player.isHost && (
                                  <Badge variant="gold" size="sm">Host</Badge>
                                )}
                                {player.isBot && (
                                  <Badge variant="neutral" size="sm">Bot AI</Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1 mt-0.5">
                                <Coins className="w-3 h-3" />
                                {player.coins.toLocaleString()} Xu
                              </span>
                            </div>
                          </div>

                          {isHost && !player.isHost && (
                            <button
                              onClick={() => handleRemoveSlot(idx)}
                              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                              title={t('online.removePlayer')}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full py-1">
                          <div className="flex items-center gap-2 text-zinc-500">
                            <div className="w-8 h-8 rounded-xl border border-dashed border-zinc-700 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            <span className="text-[11px] font-medium italic">
                              {t('online.waitingPlayer')}
                            </span>
                          </div>

                          {isHost && (
                            <button
                              onClick={() => handleAddBot(idx)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <Bot className="w-3 h-3" />
                              <span>{t('online.addBot')}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
