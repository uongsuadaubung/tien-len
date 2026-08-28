import React, { useState } from 'react';
import { useOnlineStore } from '../../../stores/useOnlineStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useModalStore } from '../../../stores/useModalStore';
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
  Wifi
} from 'lucide-react';
import { type GameSettlementRule } from '../../../engine/types';

const SETTLEMENT_MODES: Array<{ id: GameSettlementRule; label: string }> = [
  { id: 'COUNT_CARDS', label: 'Đếm Lá' },
  { id: 'TRADITIONAL', label: 'Truyền Thống' },
  { id: 'WINNER_TAKES_ALL', label: 'Nhất Ăn Tất' }
];

const PLAYER_COUNTS: Array<2 | 3 | 4> = [2, 3, 4];

export const OnlineRoomModal: React.FC = () => {
  const { isOnlineRoomOpen, closeModal } = useModalStore();
  const profile = useUserStore(s => s.profile);
  
  const {
    roomState,
    roomCode,
    isHost,
    createRoom,
    joinRoom,
    addBotToSlot,
    removeSlot,
    startMatch,
    leaveRoom
  } = useOnlineStore();

  const [tab, setTab] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [inputPin, setInputPin] = useState('');
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [betAmount, setBetAmount] = useState<number>(1000);
  const [settlementRule, setSettlementRule] = useState<GameSettlementRule>('COUNT_CARDS');
  const [copied, setCopied] = useState(false);

  if (!isOnlineRoomOpen) return null;

  const handleCopyLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}#room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    createRoom(profile, {
      playerCount,
      betAmount,
      settlementRule
    });
  };

  const handleJoin = () => {
    if (!inputPin.trim()) return;
    const code = inputPin.toUpperCase().startsWith('TL-') ? inputPin : `TL-${inputPin}`;
    joinRoom(profile, code);
  };

  const handleStartGame = () => {
    startMatch();
    closeModal('ONLINE_ROOM');
  };

  const handleLeave = () => {
    leaveRoom();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden text-white">
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-600/30 via-slate-900 to-amber-900/30 p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-lg">
                <Wifi className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400">
                  CHƠI ONLINE P2P (BẠN BÈ)
                </h2>
                <p className="text-xs text-amber-200/70 font-medium">
                  Kết nối trực tiếp qua WebRTC • Miễn phí vĩnh viễn 0đ Server
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (roomCode) leaveRoom();
                closeModal('ONLINE_ROOM');
              }}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {!roomCode ? (
            /* Tab Switcher & Configuration View */
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex rounded-2xl bg-slate-800/80 p-1 border border-white/5">
                <button
                  onClick={() => setTab('CREATE')}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    tab === 'CREATE'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tạo Bàn Mới
                </button>
                <button
                  onClick={() => setTab('JOIN')}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    tab === 'JOIN'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Nhập Mã Vào Bàn
                </button>
              </div>

              {tab === 'CREATE' ? (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Mode Selector */}
                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-2 uppercase tracking-wider">
                      Chế Độ Chơi
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {SETTLEMENT_MODES.map(m => (
                        <button
                          key={m.id}
                          onClick={() => setSettlementRule(m.id)}
                          className={`py-3 px-2 rounded-2xl border text-xs font-bold transition-all ${
                            settlementRule === m.id
                              ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-md'
                              : 'border-white/5 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Player Count & Bet Amount */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-amber-300 mb-2 uppercase tracking-wider">
                        Số Người Chơi
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {PLAYER_COUNTS.map(c => (
                          <button
                            key={c}
                            onClick={() => setPlayerCount(c)}
                            className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${
                              playerCount === c
                                ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                                : 'border-white/5 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {c} Người
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-amber-300 mb-2 uppercase tracking-wider">
                        Mức Cược
                      </label>
                      <select
                        value={betAmount}
                        onChange={e => setBetAmount(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl py-2.5 px-3 text-sm font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                      >
                        <option value={500}>500 Xu</option>
                        <option value={1000}>1.000 Xu</option>
                        <option value={2000}>2.000 Xu</option>
                        <option value={5000}>5.000 Xu</option>
                        <option value={10000}>10.000 Xu</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleCreate}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    TẠO PHÒNG BẠN BÈ NGAY
                  </button>
                </div>
              ) : (
                /* Join Room View */
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-2 uppercase tracking-wider">
                      Nhập Mã Phòng (Ví dụ: TL-8899)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="TL-...."
                        value={inputPin}
                        onChange={e => setInputPin(e.target.value.toUpperCase())}
                        maxLength={7}
                        className="w-full py-4 px-4 bg-slate-800/80 border border-amber-500/40 rounded-2xl text-center text-2xl font-mono font-black text-yellow-300 tracking-widest focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleJoin}
                    disabled={!inputPin.trim()}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Users className="w-5 h-5" />
                    THAM GIA BÀN CHƠI
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* In-Room Waiting Lobby */
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              {/* Room Code & Copy Link Banner */}
              <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-300/80 font-bold block uppercase">
                    Mã Phòng Bàn Đấu
                  </span>
                  <span className="text-2xl font-mono font-black text-yellow-300 tracking-wider">
                    {roomCode}
                  </span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Đã Sao Chép Link' : 'Sao Chép Link Mời'}
                </button>
              </div>

              {/* Player Seats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: roomState?.playerCount || 4 }).map((_, idx) => {
                  const player = roomState?.players[idx];
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        player
                          ? 'border-amber-500/40 bg-slate-800/80 shadow-lg'
                          : 'border-dashed border-white/10 bg-slate-900/40'
                      }`}
                    >
                      {player ? (
                        <div className="flex items-center gap-3">
                          <div className="relative text-2xl w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center shadow">
                            {player.avatar}
                            {player.isHost && (
                              <Crown className="w-4 h-4 text-yellow-400 absolute -top-2 -right-2 drop-shadow" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-black text-white block max-w-[120px] truncate">
                              {player.name}
                            </span>
                            <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                              <Coins className="w-3 h-3" />
                              {player.coins.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs text-slate-500 font-bold">Ghế trống {idx + 1}</span>
                          {isHost && (
                            <button
                              onClick={() => addBotToSlot(idx)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold hover:bg-indigo-500/30 transition-all flex items-center gap-1"
                            >
                              <Bot className="w-3 h-3" />
                              Thêm Bot
                            </button>
                          )}
                        </div>
                      )}

                      {player && !player.isHost && isHost && (
                        <button
                          onClick={() => removeSlot(idx)}
                          className="text-slate-500 hover:text-rose-400 text-xs p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleLeave}
                  className="px-4 py-3.5 rounded-2xl bg-slate-800 border border-white/10 text-slate-400 hover:text-white font-bold text-sm flex items-center gap-2 hover:bg-slate-700 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Rời Bàn
                </button>

                {isHost ? (
                  <button
                    onClick={handleStartGame}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    BẮT ĐẦU VÁN ĐẤU
                  </button>
                ) : (
                  <div className="flex-1 py-3.5 rounded-2xl bg-slate-800/80 border border-amber-500/20 text-center text-xs font-bold text-amber-200/80 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    Đang đợi Chủ phòng bắt đầu ván...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
