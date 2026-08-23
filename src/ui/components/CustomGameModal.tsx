import React, { useState } from 'react';
import { GameMode, GameSettings } from '../../engine/types';
import { BOT_LINEUP_PRESETS } from '../../engine/game-modes';
import { BOT_PERSONAS, getAllBotConfigs } from '../../ai/bot-factory';
import { BotConfig } from '../../ai/types';
import { 
  Play, 
  Settings, 
  Sliders, 
  X, 
  Check, 
  Sparkles, 
  Crown, 
  Dice5, 
  Users, 
  Zap, 
  BrainCircuit
} from 'lucide-react';

export interface CustomGameModalConfig {
  selectedModeId: string;
  settings: GameSettings;
  botPersonaIds: [string, string, string];
  customBotConfigs: [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>];
  playerCount: 2 | 3 | 4;
}

interface CustomGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: Partial<CustomGameModalConfig>;
  playerCoins: number;
  onStartCustomGame: (config: CustomGameModalConfig) => void;
}

export const CustomGameModal: React.FC<CustomGameModalProps> = ({
  isOpen,
  onClose,
  initialConfig,
  playerCoins,
  onStartCustomGame
}) => {
  const allPersonas = getAllBotConfigs();

  // State cục bộ của Modal
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(
    initialConfig?.playerCount || 4
  );
  const [settings, setSettings] = useState<GameSettings>({
    mode: initialConfig?.settings?.mode || 'TRADITIONAL',
    betAmount: initialConfig?.settings?.betAmount || 500,
    allowFourPairsCutAnytime: initialConfig?.settings?.allowFourPairsCutAnytime ?? true,
    instantWinEnabled: initialConfig?.settings?.instantWinEnabled ?? true,
    soundEnabled: initialConfig?.settings?.soundEnabled ?? true,
    botThinkDelayMs: initialConfig?.settings?.botThinkDelayMs ?? 850
  });

  const [botPersonaIds, setBotPersonaIds] = useState<[string, string, string]>(
    initialConfig?.botPersonaIds || ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1750']
  );

  const [customBotConfigs, setCustomBotConfigs] = useState<
    [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>]
  >(initialConfig?.customBotConfigs || [{}, {}, {}]);

  // Tab & UI State
  const [activeTab, setActiveTab] = useState<'MODE_RULES' | 'BOT_ROSTER' | 'ADVANCED_AI'>('MODE_RULES');
  const [activeBotSeatIndex, setActiveBotSeatIndex] = useState<number>(0);

  if (!isOpen) return null;

  // Chọn Preset Bot nhanh
  const handleApplyBotPreset = (presetBotIds: [string, string, string]) => {
    setBotPersonaIds([...presetBotIds]);
  };

  // Preset God Mode
  const handleApplyGodModeAll = () => {
    setBotPersonaIds(['BOT_ELO_2500', 'BOT_ELO_2300', 'BOT_ELO_2150']);
    setCustomBotConfigs([
      { mctsSimulations: 80, memoryDepth: 1.0, tempoControl: 1.0, damageControl: 1.0, antiLeaderAggression: 1.0, baitingTendency: 0.95 },
      { mctsSimulations: 60, memoryDepth: 1.0, tempoControl: 1.0, damageControl: 1.0, antiLeaderAggression: 1.0, baitingTendency: 0.95 },
      { mctsSimulations: 50, memoryDepth: 1.0, tempoControl: 1.0, damageControl: 1.0, antiLeaderAggression: 1.0, baitingTendency: 0.95 }
    ]);
  };

  // Random 3 Bot ngẫu nhiên từ kho
  const handleRandomizeBots = () => {
    const personaKeys = Object.keys(BOT_PERSONAS);
    const shuffled = [...personaKeys].sort(() => 0.5 - Math.random());
    setBotPersonaIds([shuffled[0], shuffled[1], shuffled[2]]);
  };

  // Cập nhật Persona cho từng ghế
  const handleUpdateBotPersona = (seatIndex: number, personaId: string) => {
    const updated: [string, string, string] = [...botPersonaIds];
    updated[seatIndex] = personaId;
    setBotPersonaIds(updated);
  };

  // Cập nhật tinh chỉnh chỉ số AI
  const handleSliderChange = (field: keyof BotConfig, value: number) => {
    setCustomBotConfigs(prev => {
      const next = [...prev] as [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>];
      next[activeBotSeatIndex] = {
        ...next[activeBotSeatIndex],
        [field]: value
      };
      return next;
    });
  };

  // Bắt đầu ván đấu
  const handleStartGame = () => {
    onStartCustomGame({
      selectedModeId: settings.mode,
      settings: {
        ...settings,
        playerCount
      },
      botPersonaIds,
      customBotConfigs,
      playerCount
    });
    onClose();
  };

  const seatLabels = [
    'Ghế Trái (Bot 1)',
    'Ghế Trên (Bot 2)',
    'Ghế Phải (Bot 3)'
  ];

  // Số lượng bot tương ứng với số người chơi
  const activeBotCount = playerCount - 1;

  const currentActivePersona = BOT_PERSONAS[botPersonaIds[activeBotSeatIndex]] || BOT_PERSONAS.BOT_ELO_1150;
  const currentActiveCustom = customBotConfigs[activeBotSeatIndex] || {};
  const currentConfig: BotConfig = {
    ...currentActivePersona,
    ...currentActiveCustom
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#140103] border-2 border-yellow-500/80 rounded-3xl shadow-2xl text-white overflow-hidden">
        {/* NÚT ĐÓNG */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-yellow-300 transition-colors border border-yellow-500/30 cursor-pointer"
          title="Đóng modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEADER: TIÊU ĐỀ & TÀI SẢN */}
        <div className="relative z-10 px-6 py-4 bg-gradient-to-r from-red-950/90 via-amber-950/80 to-[#140103] border-b border-yellow-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 text-red-950 shadow-md">
              <Sliders className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-yellow-300 tracking-wide">
                  Xưởng Tùy Biến Trận Đấu (Custom Sandbox)
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-500/40">
                  SANDBOX
                </span>
              </div>
              <p className="text-xs text-yellow-100/70">
                Toàn quyền tùy chỉnh luật bàn đấu, số người chơi, xếp đội hình Bot và tinh chỉnh AI.
              </p>
            </div>
          </div>

          {/* SỐ DƯ HIỆN TẠI */}
          <div className="flex items-center gap-2 bg-black/60 px-3.5 py-1.5 rounded-2xl border border-yellow-500/40 text-xs font-black text-yellow-300">
            <span>🧧</span>
            <span>{playerCoins.toLocaleString()} Xu</span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-black/40 border-b border-neutral-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('MODE_RULES')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer ${
              activeTab === 'MODE_RULES'
                ? 'border-yellow-400 bg-yellow-500/10 text-yellow-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>1. Luật & Bàn Đấu</span>
          </button>

          <button
            onClick={() => setActiveTab('BOT_ROSTER')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer ${
              activeTab === 'BOT_ROSTER'
                ? 'border-yellow-400 bg-yellow-500/10 text-yellow-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Đội Hình Bot ({activeBotCount} Bot)</span>
          </button>

          <button
            onClick={() => setActiveTab('ADVANCED_AI')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer ${
              activeTab === 'ADVANCED_AI'
                ? 'border-yellow-400 bg-yellow-500/10 text-yellow-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>3. Tinh Chỉnh Chỉ Số AI</span>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* ============================================================ */}
          {/* TAB 1: CHẾ ĐỘ CHƠI & LUẬT BÀN ĐẤU */}
          {/* ============================================================ */}
          {activeTab === 'MODE_RULES' && (
            <div className="space-y-6 animate-fade-in">
              {/* SỐ NGƯỜI CHƠI (2, 3, 4 NGƯỜI) */}
              <div className="bg-black/40 p-4 rounded-2xl border border-yellow-500/20">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <label className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Số Lượng Người Chơi Trên Bàn
                  </label>
                  <span className="text-xs text-neutral-400">
                    (1 Bạn + {activeBotCount} Bot)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { count: 2, label: 'Solo 1v1 (2 Người)', desc: '1 Bạn vs 1 Bot' },
                    { count: 3, label: 'Bàn 3 Người', desc: '1 Bạn vs 2 Bot' },
                    { count: 4, label: 'Bàn 4 Người (Chuẩn)', desc: '1 Bạn vs 3 Bot' }
                  ].map(item => (
                    <button
                      key={item.count}
                      onClick={() => setPlayerCount(item.count as 2 | 3 | 4)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        playerCount === item.count
                          ? 'bg-yellow-500/20 border-yellow-400 text-yellow-200 shadow-md font-bold'
                          : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="text-xs font-black">{item.label}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* KIỂU LUẬT KẾT THÚC & TÍNH ĐIỂM (SETTLEMENT RULE) */}
              <div className="bg-black/40 p-4 rounded-2xl border border-yellow-500/20">
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-2">
                  Quy Tắc Kết Thúc Ván & Tính Tiền
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { mode: 'TRADITIONAL', label: '🎖️ Truyền Thống', desc: 'Nhất Nhì Ba Bét (Đánh đến người áp chót)' },
                    { mode: 'COUNT_CARDS', label: '⚡ Đếm Lá Sát Phạt', desc: '1 người về Nhất dừng ngay, đếm lá người thua' },
                    { mode: 'WINNER_TAKES_ALL', label: '👑 Nhất Ăn Tất', desc: '1 người về Nhất gom sạch toàn bộ cược cả bàn' }
                  ].map(item => (
                    <button
                      key={item.mode}
                      onClick={() => setSettings(s => ({ ...s, mode: item.mode as GameMode }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        settings.mode === item.mode
                          ? 'bg-yellow-500/20 border-yellow-400 text-yellow-200 shadow-md ring-1 ring-yellow-400/40'
                          : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                      }`}
                    >
                      <div className="text-xs font-black">{item.label}</div>
                      <div className="text-[10px] text-neutral-400 mt-1 leading-relaxed">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* MỨC CƯỢC VÁN ĐẤU */}
              <div className="bg-black/40 p-4 rounded-2xl border border-yellow-500/20">
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-2">
                  Mức Cược Ván Đấu (🧧 Xu)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {[50, 100, 200, 500, 1000, 2000, 5000].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setSettings(s => ({ ...s, betAmount: amount }))}
                      className={`py-2 px-1 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                        settings.betAmount === amount
                          ? 'bg-yellow-500 text-red-950 border-yellow-300 shadow-md scale-105'
                          : 'bg-neutral-900/80 border-neutral-800 text-yellow-300/80 hover:bg-neutral-800'
                      }`}
                    >
                      {amount.toLocaleString()} 🧧
                    </button>
                  ))}
                </div>
              </div>

              {/* LUẬT PHỤ & TIỆN ÍCH */}
              <div className="bg-black/40 p-4 rounded-2xl border border-yellow-500/20 space-y-3">
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                  Luật Phụ & Tốc Độ Trận Đấu
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 4 Đôi Thông Nhảy Cóc */}
                  <div 
                    onClick={() => setSettings(s => ({ ...s, allowFourPairsCutAnytime: !s.allowFourPairsCutAnytime }))}
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-yellow-500/40 cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">4 Đôi Thông Cắt Tự Do</div>
                      <div className="text-[10px] text-neutral-400">Không cần có vòng</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.allowFourPairsCutAnytime} 
                      readOnly 
                      className="w-4 h-4 accent-yellow-500 cursor-pointer"
                    />
                  </div>

                  {/* Tới Trắng */}
                  <div 
                    onClick={() => setSettings(s => ({ ...s, instantWinEnabled: !s.instantWinEnabled }))}
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-yellow-500/40 cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">Tới Trắng Tức Thì</div>
                      <div className="text-[10px] text-neutral-400">Sảnh rồng, 5 đôi thông...</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.instantWinEnabled} 
                      readOnly 
                      className="w-4 h-4 accent-yellow-500 cursor-pointer"
                    />
                  </div>

                  {/* Tốc Độ Suy Nghĩ Của Bot */}
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
                    <div className="text-xs font-bold text-white mb-1.5">Tốc Độ Đánh Bot</div>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { label: 'Nhanh', delay: 400 },
                        { label: 'Chuẩn', delay: 850 },
                        { label: 'Chậm', delay: 1400 }
                      ].map(spd => (
                        <button
                          key={spd.delay}
                          onClick={() => setSettings(s => ({ ...s, botThinkDelayMs: spd.delay }))}
                          className={`py-1 rounded text-[10px] font-bold border cursor-pointer ${
                            settings.botThinkDelayMs === spd.delay
                              ? 'bg-yellow-500 text-red-950 border-yellow-300'
                              : 'bg-black/60 border-neutral-700 text-neutral-300'
                          }`}
                        >
                          {spd.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: ĐỘI HÌNH BOT (BOT ROSTER) */}
          {/* ============================================================ */}
          {activeTab === 'BOT_ROSTER' && (
            <div className="space-y-6 animate-fade-in">
              {/* CÁC NÚT PRESET NHANH */}
              <div>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <label className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Chọn Nhanh Bộ 3 Bot (Presets)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRandomizeBots}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-yellow-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Dice5 className="w-3.5 h-3.5" />
                      <span>Xáo Ngẫu Nhiên</span>
                    </button>
                    <button
                      onClick={handleApplyGodModeAll}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-red-950 font-black text-xs hover:scale-105 transition-all shadow-md cursor-pointer border border-yellow-200"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>GOD MODE 100%</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {BOT_LINEUP_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyBotPreset(preset.botIds)}
                      className="p-3 rounded-2xl bg-black/40 border border-yellow-500/30 hover:border-yellow-400 hover:bg-yellow-500/10 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{preset.icon}</span>
                        <span className="font-bold text-xs text-yellow-300 group-hover:text-yellow-200">
                          {preset.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 line-clamp-2">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* CHỌN BOT TỪNG GHẾ */}
              <div>
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-3">
                  Chọn Nhân Cách Bot Cho Từng Ghế (Đang chơi: {playerCount} Người)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[0, 1, 2].slice(0, activeBotCount).map(seatIdx => {
                    const personaId = botPersonaIds[seatIdx];
                    const bot = BOT_PERSONAS[personaId] || BOT_PERSONAS.BOT_ELO_1150;
                    return (
                      <div
                        key={seatIdx}
                        className="bg-black/50 p-4 rounded-2xl border border-yellow-500/30 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                          <span className="text-xs font-black text-yellow-300">
                            {seatLabels[seatIdx]}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold">
                            {bot.elo} Elo
                          </span>
                        </div>

                        {/* Thông tin Bot hiện tại */}
                        <div className="flex items-center gap-3">
                          <div className="text-3xl p-2 rounded-2xl bg-neutral-900 border border-yellow-500/20">
                            {bot.avatar}
                          </div>
                          <div>
                            <div className="font-black text-sm text-white">{bot.name}</div>
                            <div className="text-[10px] text-amber-200/80 font-medium">{bot.tier || 'Cao Thủ'}</div>
                            <div className="text-[9px] text-neutral-400 mt-0.5 line-clamp-1">{bot.description}</div>
                          </div>
                        </div>

                        {/* Dropdown chọn Persona khác */}
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1">Đổi Nhân Cách Bot:</label>
                          <select
                            value={personaId}
                            onChange={(e) => handleUpdateBotPersona(seatIdx, e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 text-yellow-200 text-xs rounded-xl p-2 font-bold focus:border-yellow-400 focus:outline-none cursor-pointer"
                          >
                            {allPersonas.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.avatar} {p.name} ({p.elo} Elo) - {p.tier || 'Bot'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: TINH CHỈNH CHỈ SỐ AI (ADVANCED AI TUNER) */}
          {/* ============================================================ */}
          {activeTab === 'ADVANCED_AI' && (
            <div className="space-y-6 animate-fade-in">
              {/* CHỌN GHẾ BOT ĐỂ TINH CHỈNH */}
              <div className="flex items-center gap-2 p-1.5 bg-black/60 rounded-2xl border border-neutral-800 w-fit">
                <span className="text-xs font-bold text-neutral-400 px-3">Ghế Đang Chỉnh:</span>
                {[0, 1, 2].slice(0, activeBotCount).map(seatIdx => (
                  <button
                    key={seatIdx}
                    onClick={() => setActiveBotSeatIndex(seatIdx)}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                      activeBotSeatIndex === seatIdx
                        ? 'bg-yellow-500 text-red-950 shadow-md scale-105'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {seatLabels[seatIdx]}
                  </button>
                ))}
              </div>

              {/* BẢNG SLIDERS TINH CHỈNH THÔNG SỐ AI */}
              <div className="bg-black/50 p-5 rounded-2xl border border-yellow-500/30 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div>
                    <h4 className="font-black text-sm text-yellow-300">
                      Tinh Chỉnh Thuật Toán Cho {currentConfig.name} ({seatLabels[activeBotSeatIndex]})
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      Điều chỉnh các trọng số ra quyết định và độ sâu mô phỏng MCTS theo thời gian thực.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* MCTS Simulations */}
                  <div className="space-y-1.5 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-white">Độ Sâu Mô Phỏng MCTS (Simulations):</span>
                      <span className="font-mono text-yellow-400 font-bold">{currentConfig.mctsSimulations || 0} Nước</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={120}
                      step={10}
                      value={currentConfig.mctsSimulations || 0}
                      onChange={(e) => handleSliderChange('mctsSimulations', parseInt(e.target.value))}
                      className="w-full accent-yellow-500 cursor-pointer"
                    />
                    <div className="text-[10px] text-neutral-500">0: Tắt MCTS • 80-120: Thần Bài đọc trước toàn bộ ván</div>
                  </div>

                  {/* Memory Depth */}
                  <div className="space-y-1.5 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-white">Độ Sâu Bộ Nhớ Đếm Bài (Memory):</span>
                      <span className="font-mono text-yellow-400 font-bold">{Math.round((currentConfig.memoryDepth || 0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={currentConfig.memoryDepth || 0}
                      onChange={(e) => handleSliderChange('memoryDepth', parseFloat(e.target.value))}
                      className="w-full accent-yellow-500 cursor-pointer"
                    />
                    <div className="text-[10px] text-neutral-500">0%: Không nhớ gì • 100%: Đếm từng lá bài & suy luận bàn tay</div>
                  </div>

                  {/* Tempo Control */}
                  <div className="space-y-1.5 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-white">Kiểm Soát Nhịp Độ (Tempo Control):</span>
                      <span className="font-mono text-yellow-400 font-bold">{Math.round((currentConfig.tempoControl || 0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={currentConfig.tempoControl || 0}
                      onChange={(e) => handleSliderChange('tempoControl', parseFloat(e.target.value))}
                      className="w-full accent-yellow-500 cursor-pointer"
                    />
                    <div className="text-[10px] text-neutral-500">Giữ quyền kiểm soát vòng đấu và ép đối thủ bỏ lượt</div>
                  </div>

                  {/* Anti Leader Aggression */}
                  <div className="space-y-1.5 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-white">Chặn Người Sắp Thắng (Anti-Leader):</span>
                      <span className="font-mono text-yellow-400 font-bold">{Math.round((currentConfig.antiLeaderAggression || 0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={currentConfig.antiLeaderAggression || 0}
                      onChange={(e) => handleSliderChange('antiLeaderAggression', parseFloat(e.target.value))}
                      className="w-full accent-yellow-500 cursor-pointer"
                    />
                    <div className="text-[10px] text-neutral-500">Quyết liệt chặn đối thủ còn 1-2 lá bài để bảo vệ vị thế</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER: NÚT BẮT ĐẦU VÁN ĐẤU */}
        <div className="p-4 bg-black/80 border-t border-neutral-800 flex items-center justify-between gap-4">
          <div className="text-xs text-neutral-400 hidden sm:block">
            Đang chọn: <span className="text-yellow-300 font-bold">{playerCount} Người Chơi</span> • Cược: <span className="text-yellow-300 font-bold">{settings.betAmount.toLocaleString()} Xu</span> • Luật: <span className="text-yellow-300 font-bold">{settings.mode}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              onClick={handleStartGame}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg hover:scale-105 cursor-pointer border border-yellow-300/40"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Vào Bàn Chơi Ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
