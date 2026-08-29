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
  ClipboardPaste,
  Delete as DeleteIcon,
  X
} from 'lucide-react';
import { MobileScreenWrapper } from './MobileScreenWrapper';
import { Card, Badge, Button } from '../../primitives';
import { useOnlineRoomLogic, SETTLEMENT_MODES } from '../../hooks/useOnlineRoomLogic';
import { TableRulesConfigPanel } from '../../components/TableRulesConfigPanel';
import { soundManager } from '../../audio/sound-manager';

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
    rawPinDigits,
    tableConfig,
    copiedLink,
    copiedPin,
    canAffordBet,
    isRoomFull,
    setTab,
    handleTableConfigChange,
    handleCopyLink,
    handleCopyPin,
    handlePastePin,
    handleKeypadPress,
    handleKeypadDelete,
    handleKeypadClear,
    handleCreate,
    handleJoin,
    handleStartGame,
    handleLeave,
    handleAddBot,
    handleRemoveSlot,
    handleClose
  } = useOnlineRoomLogic();

  if (!isOpen) return null;

  const currentSettlement = SETTLEMENT_MODES.find(m => m.id === tableConfig.mode) || SETTLEMENT_MODES[0];

  const onKeypadClick = (digit: string) => {
    soundManager.playCardDeal();
    handleKeypadPress(digit);
  };

  const onDeleteClick = () => {
    soundManager.playPass();
    handleKeypadDelete();
  };

  const onPasteClick = () => {
    soundManager.playCardDeal();
    void handlePastePin();
  };

  return (
    <MobileScreenWrapper
      isOpen={isOpen}
      onClose={handleClose}
      title="Chơi Online Cùng Bạn Bè"
      subtitle="Tạo phòng hoặc nhập mã PIN 4 số để kết nối cùng bạn bè"
      icon={<Wifi className="w-5 h-5 text-[var(--color-gold)] animate-pulse" />}
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
                size="md"
                onClick={handleCreate}
                disabled={!canAffordBet}
                leftIcon={<Sparkles className="w-4 h-4 text-black" />}
                className="w-full font-black text-sm uppercase tracking-wider py-3 shadow-lg shadow-amber-500/25 cursor-pointer"
              >
                {canAffordBet ? 'Tạo Phòng Ngay' : 'Không Đủ Xu Để Tạo Phòng'}
              </Button>
            </div>
          ) : (
            <div className="w-full">
              <Button
                variant="gold"
                size="md"
                onClick={handleJoin}
                disabled={rawPinDigits.length < 4}
                leftIcon={<Users className="w-4 h-4 text-black" />}
                className="w-full font-black text-sm uppercase tracking-wider py-3 shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                {rawPinDigits.length === 4 ? 'Vào Phòng Ngay' : 'Nhập Đủ 4 Số Để Vào Phòng'}
              </Button>
            </div>
          )
        )
      }
      className={null}
    >
      {roomCode === null ? (
        /* ========================================================================= */
        /* MÀN HÌNH 1: CHƯA VÀO PHÒNG (TẠO PHÒNG HOẶC NHẬP MÃ PIN BẰNG BÀN PHÍM ẢO) */
        /* ========================================================================= */
        <div className="space-y-3.5">
          {/* Segmented Tab Switcher */}
          <div className="flex rounded-2xl bg-[var(--bg-container)] p-1 border border-[var(--border-container)] shadow-inner">
            <button
              onClick={() => setTab('CREATE')}
              className={`flex-1 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'CREATE'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tạo Phòng</span>
            </button>
            <button
              onClick={() => setTab('JOIN')}
              className={`flex-1 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'JOIN'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Vào Phòng</span>
            </button>
          </div>

          {tab === 'CREATE' ? (
            /* TAB TẠO PHÒNG: TÁI SỬ DỤNG BẢNG CẤU HÌNH BÀN CHƠI CHUẨN CỦA GAME */
            <div className="animate-in fade-in duration-200">
              <TableRulesConfigPanel
                playerCoins={profile.coins}
                config={tableConfig}
                onChange={handleTableConfigChange}
                showInstantWin={false}
                showCongOption={true}
              />
            </div>
          ) : (
            /* TAB NHẬP MÃ VÀO PHÒNG BẰNG BÀN PHÍM ẢO NATIVE */
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* 1. Màn hiển thị 4 Ô Mã PIN */}
              <Card variant="container" className="p-3.5 space-y-2.5 text-center">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
                    Nhập Mã Phòng 4 Số
                  </span>
                  {rawPinDigits.length > 0 && (
                    <button
                      onClick={handleKeypadClear}
                      className="text-xs font-bold text-zinc-400 hover:text-rose-400 flex items-center gap-1 active:scale-95 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Xóa Hết</span>
                    </button>
                  )}
                </div>

                {/* Ô hiển thị 4 số PIN kèm tiền tố TL- */}
                <div className="flex items-center justify-center gap-2 max-w-xs mx-auto py-0.5">
                  <div className="h-12 px-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300 font-mono font-black text-lg shadow-inner">
                    TL-
                  </div>

                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3].map((slotIdx) => {
                      const char = rawPinDigits[slotIdx] || '';
                      const isFilled = char !== '';
                      const isNext = rawPinDigits.length === slotIdx;

                      return (
                        <div
                          key={slotIdx}
                          className={`w-11 h-12 rounded-2xl border-2 flex items-center justify-center font-mono text-xl font-black transition-all shadow-sm ${
                            isFilled
                              ? 'border-amber-400 bg-amber-500/20 text-yellow-300 shadow-amber-500/20 scale-105'
                              : isNext
                              ? 'border-amber-400/80 bg-[var(--bg-card)] text-amber-400 animate-pulse'
                              : 'border-white/10 bg-[var(--bg-card)] text-zinc-600'
                          }`}
                        >
                          {isFilled ? char : isNext ? '•' : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* 2. Bàn Phím Số Ảo (Keypad 0-9, Paste, Backspace) */}
              <div className="grid grid-cols-3 gap-1.5 max-w-xs mx-auto select-none">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => onKeypadClick(digit)}
                    disabled={rawPinDigits.length >= 4}
                    className="h-11 rounded-2xl bg-[var(--bg-card)] hover:bg-amber-500/20 active:bg-amber-500/30 border border-[var(--border-card)] active:border-amber-400 text-white active:text-amber-300 font-black text-lg transition-all active:scale-95 shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:active:scale-100"
                  >
                    {digit}
                  </button>
                ))}

                {/* Phím Dán Clipboard */}
                <button
                  onClick={onPasteClick}
                  className="h-11 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold text-xs transition-all active:scale-95 shadow-sm flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                  title="Dán mã từ bộ nhớ tạm"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span className="text-[9px]">Dán</span>
                </button>

                {/* Phím 0 */}
                <button
                  onClick={() => onKeypadClick('0')}
                  disabled={rawPinDigits.length >= 4}
                  className="h-11 rounded-2xl bg-[var(--bg-card)] hover:bg-amber-500/20 active:bg-amber-500/30 border border-[var(--border-card)] active:border-amber-400 text-white active:text-amber-300 font-black text-lg transition-all active:scale-95 shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:active:scale-100"
                >
                  0
                </button>

                {/* Phím Xóa Lùi ⌫ */}
                <button
                  onClick={onDeleteClick}
                  disabled={rawPinDigits.length === 0}
                  className="h-11 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold transition-all active:scale-95 shadow-sm flex flex-col items-center justify-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:active:scale-100"
                  title="Xóa ký tự cuối"
                >
                  <DeleteIcon className="w-4 h-4" />
                  <span className="text-[9px]">Xóa</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* MÀN HÌNH 2: TRONG PHÒNG CHỜ (WAITING LOBBY) */
        /* ========================================================================= */
        <div className="space-y-3.5 animate-in zoom-in-95 duration-200">
          {/* Hero Card: Mã Phòng & Nút Sao Chép */}
          <Card variant="active" className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/40 border-amber-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-400/90 font-black uppercase tracking-wider block">
                  Mã Phòng Bàn Đấu
                </span>
                <span className="text-2xl font-mono font-black text-amber-300 tracking-wider">
                  {roomCode}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyPin}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPin ? 'Đã Chép' : 'Chép Mã'}</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Đã Chép' : 'Link Mời'}</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Thông tin tóm tắt bàn đấu */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="gold" size="sm">
              ⚡ {currentSettlement.label}
            </Badge>
            <Badge variant="neutral" size="sm">
              👥 {roomState?.playerCount || 4} Người
            </Badge>
            <Badge variant="neutral" size="sm">
              💰 {roomState?.betAmount.toLocaleString() || 1000} Xu/lá
            </Badge>
          </div>

          {/* Lưới Ghế Ngồi (Player Seats Grid) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Danh Sách Đấu Thủ ({roomState?.players.length || 1}/{roomState?.playerCount || 4})</span>
              </span>
              {isHost && !isRoomFull && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  Có thể thêm Bot
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
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
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative text-xl w-9 h-9 rounded-xl bg-slate-800 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
                            {player.avatar}
                            {player.isHost && (
                              <Crown className="w-3.5 h-3.5 text-yellow-400 absolute -top-1 -right-1 drop-shadow" />
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
                            title="Xóa khỏi phòng"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full py-0.5">
                        <div className="flex items-center gap-2 text-zinc-500">
                          <div className="w-7 h-7 rounded-xl border border-dashed border-zinc-700 flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </div>
                          <span className="text-[11px] font-medium italic">
                            Đang chờ bạn bè...
                          </span>
                        </div>

                        {isHost && (
                          <button
                            onClick={() => handleAddBot(idx)}
                            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <Bot className="w-3 h-3" />
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
    </MobileScreenWrapper>
  );
};
