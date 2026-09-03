import React from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  Play, 
  Sparkles, 
  Wifi, 
  Crown, 
  Coins, 
  Bot, 
  LogOut, 
  Plus, 
  Radio,
  Globe,
  Lock
} from 'lucide-react';
import { MobileScreenWrapper } from './MobileScreenWrapper';
import { Card, Badge, Button } from '../../primitives';
import { useOnlineRoomLogic, SETTLEMENT_MODES } from '../../hooks/useOnlineRoomLogic';
import { TableRulesConfigPanel } from '../../components/TableRulesConfigPanel';
import { OnlineRoomBrowser } from '../../components/OnlineRoomBrowser';

export interface MobileOnlineRoomViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileOnlineRoomView: React.FC<MobileOnlineRoomViewProps> = ({
  isOpen,
  onClose
}) => {
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

  if (!isOpen) return null;

  const currentSettlement = SETTLEMENT_MODES.find(m => m.id === tableConfig.mode) || SETTLEMENT_MODES[0];

  return (
    <MobileScreenWrapper
      isOpen={isOpen}
      onClose={onClose || handleClose}
      title="Chơi Online Cùng Bạn Bè"
      subtitle="Tìm bàn trong sảnh chờ hoặc tạo phòng riêng với bạn bè"
      icon={<Wifi className="w-5 h-5 text-[var(--color-gold)] animate-pulse" />}
      className={null}
      headerRight={
        <Badge variant="gold" size="md">
          🪙 {profile.coins.toLocaleString()} Xu
        </Badge>
      }
      footer={
        roomCode !== null ? (
          <div className="w-full flex items-center justify-between gap-2.5">
            <Button
              variant="surface"
              size="md"
              onClick={handleLeave}
              leftIcon={<LogOut className="w-4 h-4 text-rose-400" />}
              className="flex-1 text-rose-300 font-bold border-rose-500/30 hover:bg-rose-950/40 cursor-pointer"
            >
              {isHost ? 'Giải Tán Phòng' : 'Rời Phòng'}
            </Button>

            {isHost && (
              <Button
                variant="gold"
                size="md"
                onClick={handleStartGame}
                leftIcon={<Play className="w-4 h-4 text-black fill-current" />}
                className="flex-1 font-black shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Bắt Đầu Trận Đấu
              </Button>
            )}
          </div>
        ) : (
          tab === 'CREATE' ? (
            <div className="w-full">
              <Button
                variant="gold"
                size="lg"
                onClick={handleCreate}
                disabled={!canAffordBet}
                leftIcon={<Sparkles className="w-4 h-4 text-slate-950" />}
                className="w-full font-black text-xs sm:text-sm uppercase tracking-wider py-3 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {canAffordBet ? 'Tạo Phòng Ngay' : 'Không Đủ Xu Để Tạo Phòng'}
              </Button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-2">
              <span className="text-[11px] text-[var(--text-muted)]">
                Bạn muốn mở bàn với luật riêng?
              </span>
              <Button
                variant="surface"
                size="sm"
                onClick={() => setTab('CREATE')}
                leftIcon={<Plus className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                className="font-bold text-xs py-1 px-3 text-[var(--color-gold)] border-[var(--border-gold)]/40 hover:bg-amber-500/10"
              >
                Tạo Bàn Mới
              </Button>
            </div>
          )
        )
      }
    >
      <div className="p-3 sm:p-4 overflow-y-auto space-y-3.5">
        {roomCode === null ? (
          /* ========================================================================= */
          /* MÀN HÌNH 1: CHƯA VÀO PHÒNG (SẢNH PHÒNG CHỜ HOẶC TẠO PHÒNG MỚI) */
          /* ========================================================================= */
          <div className="space-y-3">
            {/* Segmented Tab Switcher (2 TABS: SẢNH PHÒNG & TẠO PHÒNG) */}
            <div className="flex rounded-2xl bg-[var(--bg-card)] p-1 border border-[var(--border-card)] shadow-inner">
              <button
                onClick={() => setTab('LOBBY')}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'LOBBY'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Sảnh Chờ</span>
                {publicRooms.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                    tab === 'LOBBY' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {publicRooms.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setTab('CREATE')}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tab === 'CREATE'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tạo Phòng</span>
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
              /* TAB 2: TẠO PHÒNG MỚI (TÙY BIẾN 100% LUẬT & CÔNG KHAI / RIÊNG TƯ) */
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Tùy chọn Quyền Riêng Tư (Public vs Private) */}
                <Card variant="surface" className="p-2.5 rounded-xl border border-[var(--border-container)] bg-[var(--bg-container)]/80">
                  <div className="text-xs font-bold text-[var(--text-primary)] mb-1.5">
                    Quyền Riêng Tư Phòng
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPublicRoom(true)}
                      className={`p-2 rounded-xl border text-left transition-all flex items-start gap-2 cursor-pointer ${
                        isPublicRoom
                          ? 'border-[var(--color-gold)] bg-amber-500/10 shadow-sm'
                          : 'border-[var(--border-card)] bg-[var(--bg-card)] opacity-70'
                      }`}
                    >
                      <Globe className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isPublicRoom ? 'text-[var(--color-gold)]' : 'text-zinc-400'}`} />
                      <div>
                        <span className={`font-bold text-[11px] block ${isPublicRoom ? 'text-[var(--color-gold)]' : 'text-[var(--text-primary)]'}`}>
                          Công Khai
                        </span>
                        <span className="text-[9px] text-[var(--text-muted)] block leading-tight mt-0.5">
                          Hiện ở sảnh chờ cho mọi người cùng vào
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPublicRoom(false)}
                      className={`p-2 rounded-xl border text-left transition-all flex items-start gap-2 cursor-pointer ${
                        !isPublicRoom
                          ? 'border-[var(--color-gold)] bg-amber-500/10 shadow-sm'
                          : 'border-[var(--border-card)] bg-[var(--bg-card)] opacity-70'
                      }`}
                    >
                      <Lock className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${!isPublicRoom ? 'text-[var(--color-gold)]' : 'text-zinc-400'}`} />
                      <div>
                        <span className={`font-bold text-[11px] block ${!isPublicRoom ? 'text-[var(--color-gold)]' : 'text-[var(--text-primary)]'}`}>
                          Riêng Tư
                        </span>
                        <span className="text-[9px] text-[var(--text-muted)] block leading-tight mt-0.5">
                          Chỉ ai có mã PIN 4 số mới vào được
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
          <div className="space-y-3 animate-in zoom-in-95 duration-200">
            {/* Hero Card: Mã Phòng & Nút Sao Chép */}
            <Card variant="active" className="p-3 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/40 border-amber-500/40 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-amber-400/90 font-black uppercase tracking-wider block">
                    Mã Phòng Bàn Đấu
                  </span>
                  <Badge variant={roomState?.isPublic ? 'gold' : 'neutral'} size="sm" className="text-[9px] py-0 px-1.5">
                    {roomState?.isPublic ? '🌐 Công Khai' : '🔒 Riêng Tư'}
                  </Badge>
                </div>
                <span className="text-xl sm:text-2xl font-mono font-black text-amber-300 tracking-wider">
                  {roomCode}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyPin}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPin ? 'Đã Chép' : 'Chép PIN'}</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Đã Chép' : 'Chép Link'}</span>
                </button>
              </div>
            </Card>

            {/* Thông tin tóm tắt bàn đấu */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="gold" size="sm">
                ⚡ {currentSettlement.label}
              </Badge>
              <Badge variant="neutral" size="sm">
                👥 {roomState ? roomState.playerCount : 4} Người
              </Badge>
              <Badge variant="neutral" size="sm">
                💰 {roomState ? roomState.betAmount.toLocaleString() : '---'} Xu/lá
              </Badge>
              {roomState?.choppingMultiplier && roomState.choppingMultiplier > 1 && (
                <Badge variant="neutral" size="sm" className="text-amber-300">
                  ⚡ x{roomState.choppingMultiplier} Chặt
                </Badge>
              )}
            </div>

            {/* Lưới Ghế Ngồi (Player Seats Grid) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Danh Sách Đấu Thủ ({roomState?.players.length || 1}/{roomState?.playerCount || 4})</span>
                </span>
                {isHost && !isRoomFull && (
                  <span className="text-[9.5px] text-[var(--text-muted)]">
                    Có thể thêm Bot
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from({ length: roomState?.playerCount || 4 }).map((_, idx) => {
                  const player = roomState?.players[idx];
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
                        player
                          ? 'border-amber-500/40 bg-[var(--bg-card)] shadow-md'
                          : 'border-dashed border-white/10 bg-black/20'
                      }`}
                    >
                      {player ? (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="relative text-xl w-8 h-8 rounded-xl bg-slate-800 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
                              {player.avatar}
                              {player.isHost && (
                                <Crown className="w-3.5 h-3.5 text-yellow-400 absolute -top-1 -right-1 drop-shadow" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-black text-white truncate max-w-[100px]">
                                  {player.name}
                                </span>
                                {player.isHost && (
                                  <Badge variant="gold" size="sm">Host</Badge>
                                )}
                                {player.isBot && (
                                  <Badge variant="neutral" size="sm">Bot</Badge>
                                )}
                              </div>
                              <span className="text-[9.5px] text-amber-300 font-bold flex items-center gap-0.5 mt-0.5">
                                <Coins className="w-2.5 h-2.5" />
                                {player.coins.toLocaleString()} Xu
                              </span>
                            </div>
                          </div>

                          {isHost && !player.isHost && (
                            <button
                              onClick={() => handleRemoveSlot(idx)}
                              className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                              title="Xóa khỏi phòng"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full py-0.5">
                          <div className="flex items-center gap-1.5 text-zinc-500">
                            <div className="w-6 h-6 rounded-lg border border-dashed border-zinc-700 flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </div>
                            <span className="text-[10px] font-medium italic">
                              Chờ người chơi...
                            </span>
                          </div>

                          {isHost && (
                            <button
                              onClick={() => handleAddBot(idx)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <Bot className="w-2.5 h-2.5" />
                              <span>Thêm Bot</span>
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
    </MobileScreenWrapper>
  );
};
