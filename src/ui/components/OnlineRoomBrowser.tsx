import React, { useState, useMemo } from 'react';
import { 
  Users, 
  RotateCw, 
  ArrowRight, 
  PlusCircle, 
  KeyRound, 
  Clipboard, 
  ShieldAlert, 
  Radio, 
  X 
} from 'lucide-react';
import { Card, Badge, Button } from '../primitives';
import { type PublicRoomSummary } from '../../engine/network/network.schema';
import { getSettlementRuleLabel } from '../../engine/types';
import { getRankTierByElo } from '../../engine/elo';
import { useI18n } from '../../locales';

export interface OnlineRoomBrowserProps {
  rooms: readonly PublicRoomSummary[];
  isLoading: boolean;
  userCoins: number;
  inputPin: string;
  onInputPinChange: (pin: string) => void;
  onJoinByPin: () => void;
  onPastePin: () => Promise<void>;
  onJoinRoom: (room: PublicRoomSummary) => void;
  onRefresh: () => void;
  onCreateRoomClick: () => void;
  onOpenBank: () => void;
}

type FilterCategory = 'ALL' | 'COUNT_CARDS' | 'TRADITIONAL' | '2P' | '4P';

export const OnlineRoomBrowser: React.FC<OnlineRoomBrowserProps> = ({
  rooms,
  isLoading,
  userCoins,
  inputPin,
  onInputPinChange,
  onJoinByPin,
  onPastePin,
  onJoinRoom,
  onRefresh,
  onCreateRoomClick,
  onOpenBank
}) => {
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterCategory>('ALL');

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      if (filter === 'COUNT_CARDS' && room.settlementRule !== 'COUNT_CARDS') return false;
      if (filter === 'TRADITIONAL' && room.settlementRule !== 'TRADITIONAL') return false;
      if (filter === '2P' && room.maxPlayers !== 2) return false;
      if (filter === '4P' && room.maxPlayers !== 4) return false;

      return true;
    });
  }, [rooms, filter]);

  const filterOptions = [
    { id: 'ALL' as const, label: t('online.filterAll') },
    { id: 'COUNT_CARDS' as const, label: t('modes.countCards') },
    { id: 'TRADITIONAL' as const, label: t('modes.traditional') },
    { id: '2P' as const, label: t('online.filterSolo') },
    { id: '4P' as const, label: t('online.filter4P') }
  ];

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 1. KHUNG VÀO BẰNG MÃ PIN NHANH (FAST PIN ENTRY) */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[var(--bg-card)]/90 via-[var(--bg-container)]/80 to-[var(--bg-card)]/90 border border-[var(--border-card)] p-2.5 sm:p-3 shadow-md backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Vùng nhập PIN */}
          <div className="relative flex items-center flex-1 min-w-0 bg-[var(--bg-surface)]/80 border border-[var(--border-card)] focus-within:border-[var(--color-gold)] focus-within:ring-1 focus-within:ring-[var(--color-gold)]/30 rounded-xl px-3 py-2 transition-all">
            <KeyRound className="w-4 h-4 text-[var(--color-gold)] shrink-0 mr-2" />
            <input
              type="text"
              value={inputPin}
              onChange={(e) => onInputPinChange(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputPin.trim().length > 0) {
                  onJoinByPin();
                }
              }}
              placeholder={t('online.pinPlaceholder')}
              maxLength={8}
              className="bg-transparent text-xs sm:text-sm font-mono font-bold tracking-wider text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:font-normal placeholder:tracking-normal focus:outline-none w-full min-w-0"
            />
            {inputPin.length > 0 && (
              <button
                onClick={() => onInputPinChange('')}
                className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-95 transition-all shrink-0 ml-1"
                title={t('online.clearPin')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onPastePin}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all shrink-0 ml-1.5 cursor-pointer whitespace-nowrap"
              title={t('online.pasteFromClipboard')}
            >
              <Clipboard className="w-3.5 h-3.5 text-[var(--color-gold)]" />
              <span className="hidden sm:inline">{t('online.pasteBtn')}</span>
            </button>
          </div>

          {/* Nút Vào Bằng PIN */}
          <Button
            variant="gold"
            size="md"
            onClick={onJoinByPin}
            disabled={inputPin.trim().length === 0}
            rightIcon={<ArrowRight className="w-4 h-4 text-slate-950" />}
            className="font-bold text-xs sm:text-sm py-2 sm:py-2.5 px-4 sm:px-5 shrink-0 shadow-lg shadow-amber-500/15 justify-center whitespace-nowrap"
          >
            {t('online.joinByPinBtn')}
          </Button>
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ SẢNH & BỘ LỌC (TÁCH 2 HÀNG RÕ RÀNG, KHÔNG LỆCH MÉO) */}
      <div className="flex flex-col gap-2 pt-1 border-t border-[var(--border-container)]">
        {/* Hàng 1: Trạng thái Sảnh Chờ & Nút Làm Mới (Cố định 2 đầu) */}
        <div className="flex items-center justify-between gap-2">
          {/* Trạng thái Live & Số bàn */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
                <Radio className="w-3 h-3" /> {t('online.lobbyTitle')}
              </span>
            </div>
            <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
              {t('online.roomsOpen', { count: rooms.length })}
            </span>
          </div>

          {/* Nút Làm Mới */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-[var(--border-gold)] text-[var(--text-secondary)] hover:text-[var(--color-gold)] active:scale-95 transition-all shrink-0 cursor-pointer shadow-sm text-xs font-medium whitespace-nowrap"
            title={t('online.refreshRooms')}
          >
            <RotateCw className={`w-3.5 h-3.5 text-[var(--color-gold)] ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-[11px]">{t('online.refreshRooms')}</span>
          </button>
        </div>

        {/* Hàng 2: Thanh Bộ Lọc Nhanh (Cuộn Ngang Mượt Mà, Không Xuống Hàng) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full pb-0.5">
          {filterOptions.map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
                filter === btn.id
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-sm font-black'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-card)] hover:text-white hover:border-[var(--border-gold)]/40'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. DANH SÁCH CÁC BÀN ĐANG CHỜ (ROOM LIST) */}
      <div className="min-h-[220px] max-h-[380px] overflow-y-auto pr-0.5 space-y-2.5 custom-scrollbar">
        {filteredRooms.length === 0 ? (
          /* TRẠNG THÁI RỖNG (EMPTY STATE) SANG TRỌNG & GỌN GÀNG */
          <div className="flex flex-col items-center justify-center py-9 px-4 text-center rounded-2xl bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/10 relative overflow-hidden my-1">
            {/* Ambient gold glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/5 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2.5 shadow-inner">
              <Users className="w-6 h-6 text-amber-400" />
            </div>

            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              {filter !== 'ALL' ? t('online.noRoomsFiltered') : t('online.noRoomsMessage')}
            </h4>

            <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1 mb-4 leading-relaxed">
              {filter !== 'ALL' ? t('online.noRoomsFilteredSubtext') : t('online.noRoomsSubtext')}
            </p>

            <Button
              variant="gold"
              size="sm"
              onClick={filter !== 'ALL' ? () => setFilter('ALL') : onCreateRoomClick}
              leftIcon={filter !== 'ALL' ? <RotateCw className="w-3.5 h-3.5 text-slate-950" /> : <PlusCircle className="w-3.5 h-3.5 text-slate-950" />}
              className="font-black text-xs py-2 px-4 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              {filter !== 'ALL' ? t('online.viewAllRooms') : t('online.createRoomBtn')}
            </Button>
          </div>
        ) : (
          /* LƯỚI DANH SÁCH BÀN CHƠI */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredRooms.map(room => {
              const hostRank = getRankTierByElo(room.hostElo);
              const isFull = room.playerCount >= room.maxPlayers;
              const isAffordable = userCoins >= room.betAmount;

              return (
                <Card
                  key={room.roomCode}
                  variant="container"
                  className="p-3 rounded-2xl border border-[var(--border-container)] hover:border-[var(--border-gold)]/60 bg-gradient-to-br from-[var(--bg-container)] to-[var(--bg-card)] transition-all flex flex-col justify-between gap-2.5 shadow-sm group hover:shadow-md"
                >
                  {/* Top: Thông tin Chủ Bàn & Mã PIN */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-base shrink-0 shadow-sm">
                        {room.hostAvatar}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[110px]">
                            {room.hostName}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--color-gold)] font-bold">
                            {hostRank.badge}
                          </span>
                        </div>
                        <span className="text-[9.5px] font-mono text-[var(--text-muted)] block leading-tight">
                          {t('online.roomPinLabel', { pin: room.roomCode })}
                        </span>
                      </div>
                    </div>

                    {/* Huy hiệu số người */}
                    <Badge 
                      variant={isFull ? 'danger' : 'neutral'} 
                      size="sm"
                      className="font-mono font-bold shrink-0"
                    >
                      <Users className="w-3 h-3 mr-1" />
                      {t('online.roomSlots', { current: room.playerCount, max: room.maxPlayers })}
                    </Badge>
                  </div>

                  {/* Middle: Tags Luật & Mức Cược */}
                  <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-[var(--border-container)]/60">
                    <Badge variant="gold" size="sm" className="font-semibold text-[9.5px]">
                      💰 {t('online.betPerCard', { amount: room.betAmount.toLocaleString() })}
                    </Badge>
                    <Badge variant="neutral" size="sm" className="text-[9.5px]">
                      📜 {getSettlementRuleLabel(room.settlementRule)}
                    </Badge>
                    {room.choppingMultiplier > 1 && (
                      <Badge variant="neutral" size="sm" className="text-[9.5px] text-amber-300">
                        ⚡ {t('online.chopMultiplierBadge', { count: room.choppingMultiplier, multiplier: room.choppingMultiplier })}
                      </Badge>
                    )}
                    {room.prohibitEndingWithTwo && (
                      <Badge variant="neutral" size="sm" className="text-[9.5px]">
                        🚫 {t('online.noEndTwoBadge')}
                      </Badge>
                    )}
                  </div>

                  {/* Bottom: Nút Hành Động Vào Bàn */}
                  <div className="pt-1.5 border-t border-[var(--border-container)]/60">
                    {isFull ? (
                      <Button
                        variant="surface"
                        size="sm"
                        disabled
                        className="w-full text-xs font-bold py-1.5 justify-center opacity-60 cursor-not-allowed"
                      >
                        {t('online.roomFullSlot', { current: room.playerCount, max: room.maxPlayers })}
                      </Button>
                    ) : !isAffordable ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled
                          leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
                          className="flex-1 text-[11px] font-bold py-1.5 justify-center opacity-80 cursor-not-allowed"
                        >
                          {t('online.needCoins', { amount: room.betAmount.toLocaleString() })}
                        </Button>
                        <Button
                          variant="surface"
                          size="sm"
                          onClick={onOpenBank}
                          className="text-[11px] font-bold py-1.5 px-2.5 text-[var(--color-gold)]"
                          title={t('online.openBankBorrow')}
                        >
                          {t('online.borrowCoins')}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => onJoinRoom(room)}
                        rightIcon={<ArrowRight className="w-3.5 h-3.5 text-slate-950" />}
                        className="w-full text-xs font-bold py-1.5 justify-center shadow-md shadow-amber-500/10 group-hover:scale-[1.01] transition-transform"
                      >
                        {t('online.joinRoomNow')}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

