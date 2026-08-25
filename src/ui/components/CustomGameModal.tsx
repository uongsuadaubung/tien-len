import React, { useState } from 'react';
import { GameMode, GameSettings } from '../../engine/types';
import { BOT_LINEUP_PRESETS } from '../../engine/game-modes';
import { BOT_PERSONAS, getAllBotConfigs } from '../../ai/bot-factory';
import { BotConfig } from '../../ai/types';
import { 
  Play, 
  Sliders, 
  X, 
  Sparkles, 
  Crown, 
  Dice5, 
  Users, 
  Zap, 
  BrainCircuit
} from 'lucide-react';
import { TableRulesConfigPanel, TableConfigState } from './TableRulesConfigPanel';

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

  // Khởi tạo mức cược ban đầu hợp lệ với số dư hiện tại
  const initialBet = Math.min(
    initialConfig?.settings?.betAmount || 500,
    Math.max(1, playerCoins)
  );

  // State cục bộ của Modal
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(
    initialConfig?.playerCount || 4
  );
  const [settings, setSettings] = useState<GameSettings>({
    mode: initialConfig?.settings?.mode || 'COUNT_CARDS',
    betAmount: initialBet,
    choppingMultiplier: initialConfig?.settings?.choppingMultiplier || 1,
    allowFourPairsCutAnytime: initialConfig?.settings?.allowFourPairsCutAnytime ?? true,
    instantWinEnabled: initialConfig?.settings?.instantWinEnabled ?? true,
    soundEnabled: initialConfig?.settings?.soundEnabled ?? true,
    botThinkDelayMs: initialConfig?.settings?.botThinkDelayMs ?? 850,
    prohibitEndingWithTwo: initialConfig?.settings?.prohibitEndingWithTwo ?? true,
    threeSpadesEndingBonus: initialConfig?.settings?.threeSpadesEndingBonus ?? true,
    cascadeChopEnabled: initialConfig?.settings?.cascadeChopEnabled ?? true
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

  // Tính tiền cọc an toàn
  const currentMultiplier = settings.choppingMultiplier || 1;
  const depositRequired = 26 * settings.betAmount * currentMultiplier;
  const isInsufficientCoins = playerCoins < depositRequired;

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

  // Xử lý thay đổi cấu hình từ TableRulesConfigPanel
  const handleTableConfigChange = (updated: Partial<TableConfigState>) => {
    if (updated.playerCount !== undefined) {
      setPlayerCount(updated.playerCount);
    }
    setSettings(prev => ({
      ...prev,
      ...updated
    }));
  };

  // Bắt đầu ván đấu
  const handleStartGame = () => {
    if (settings.betAmount <= 0) {
      alert('Mức cược phải lớn hơn 0 🧧!');
      return;
    }
    if (isInsufficientCoins && playerCoins > 0) {
      alert(`Số dư hiện tại (${playerCoins.toLocaleString()} Xu) không đủ để đặt cọc an toàn cho bàn đấu (Cần tối thiểu ${depositRequired.toLocaleString()} Xu)!`);
      return;
    }

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
        {/* HEADER: TIÊU ĐỀ & TÀI SẢN + NÚT ĐÓNG */}
        <div className="relative z-10 px-6 py-4 bg-gradient-to-r from-red-950/90 via-amber-950/80 to-[#140103] border-b border-yellow-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 text-red-950 shadow-md flex-shrink-0">
              <Sliders className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-yellow-300 tracking-wide truncate">
                  Xưởng Tùy Biến Trận Đấu (Custom Sandbox)
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-500/40">
                  SANDBOX
                </span>
              </div>
              <p className="text-xs text-yellow-100/70 truncate">
                Toàn quyền tùy chỉnh luật bàn đấu, số người chơi, xếp đội hình Bot và tinh chỉnh AI.
              </p>
            </div>
          </div>

          {/* SỐ DƯ HIỆN TẠI & NÚT ĐÓNG NẰM CẠNH NHAU TRỰC QUAN */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-black/60 px-3.5 py-2 rounded-2xl border border-yellow-500/40 text-xs font-black text-yellow-300 shadow-inner">
              <span>🧧</span>
              <span>{playerCoins.toLocaleString()} Xu</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-yellow-500/30 cursor-pointer shadow"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>
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
            <span>1. Luật & Bàn Đấu (Quick Play)</span>
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
          {/* TAB 1: CHẾ ĐỘ CHƠI & LUẬT BÀN ĐẤU (REUSED FROM COMPONENT) */}
          {/* ============================================================ */}
          {activeTab === 'MODE_RULES' && (
            <TableRulesConfigPanel
              playerCoins={playerCoins}
              config={{
                ...settings,
                playerCount
              }}
              onChange={handleTableConfigChange}
              showBotThinkDelay={true}
              showInstantWin={true}
              showCongOption={false}
            />
          )}

          {/* ============================================================ */}
          {/* TAB 2: ĐỘI HÌNH BOT (ROSTER & PRESETS) */}
          {/* ============================================================ */}
          {activeTab === 'BOT_ROSTER' && (
            <div className="space-y-6 animate-fade-in">
              {/* KHU VỰC PRESET NHANH */}
              <div className="p-4 rounded-2xl bg-black/40 border border-yellow-500/20 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Đội Hình Bot Khuyên Dùng (Presets)
                    </span>
                  </div>
                  <button
                    onClick={handleRandomizeBots}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-yellow-300 border border-yellow-500/30 transition-colors cursor-pointer"
                  >
                    <Dice5 className="w-3.5 h-3.5" />
                    <span>Random 3 Bot Bất Kỳ</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BOT_LINEUP_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyBotPreset(preset.botIds)}
                      className="p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-yellow-500/40 text-left transition-all group cursor-pointer"
                    >
                      <div className="text-xs font-black text-yellow-200 group-hover:text-yellow-300">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1 line-clamp-1">
                        {preset.description}
                      </div>
                    </button>
                  ))}
                  
                  {/* Nút Preset God Mode */}
                  <button
                    onClick={handleApplyGodModeAll}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-red-950/80 to-purple-950/80 hover:from-red-900 hover:to-purple-900 border border-red-500/50 text-left transition-all cursor-pointer col-span-2 sm:col-span-4"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black text-red-300">
                      <Crown className="w-4 h-4 text-yellow-400 animate-bounce" />
                      <span>Thách Thức 3 Thần Bài Tối Thượng (God Mode 2300-2500 Elo + Full MCTS)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* KHU VỰC CHỌN BOT TỪNG GHẾ */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Chỉ Định Bot Cho Từng Ghế Ngồi ({activeBotCount} Ghế Khả Dụng)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {seatLabels.slice(0, activeBotCount).map((label, idx) => {
                    const botId = botPersonaIds[idx];
                    const persona = BOT_PERSONAS[botId] || BOT_PERSONAS.BOT_ELO_1150;
                    const isSelectedSeat = activeBotSeatIndex === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveBotSeatIndex(idx)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelectedSeat
                            ? 'bg-yellow-500/10 border-yellow-400 shadow-md ring-1 ring-yellow-400/40'
                            : 'bg-black/40 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                          <span className="font-bold">{label}</span>
                          {isSelectedSeat && (
                            <span className="text-[10px] bg-yellow-400 text-red-950 px-1.5 py-0.2 rounded font-black">
                              Đang Chọn
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-yellow-500/30 flex items-center justify-center text-2xl shadow-inner">
                            {persona.avatar}
                          </div>
                          <div>
                            <div className="text-xs font-black text-yellow-300">{persona.name}</div>
                            <div className="text-[11px] text-neutral-300 font-bold">{persona.elo} Elo</div>
                            <div className="text-[10px] text-neutral-400 line-clamp-1">{persona.styleDescription}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BẢNG TẤT CẢ 18 BOT ĐỂ THAY THẾ CHO GHẾ ĐANG CHỌN */}
              <div className="p-4 rounded-2xl bg-black/40 border border-yellow-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Kho Bot Sẵn Có (Thay thế cho {seatLabels[activeBotSeatIndex]})
                  </span>
                  <span className="text-xs text-neutral-400">18 Nhân Vật Bot</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
                  {allPersonas.map((bot) => {
                    const isCurrent = botPersonaIds[activeBotSeatIndex] === bot.id;
                    return (
                      <button
                        key={bot.id}
                        onClick={() => handleUpdateBotPersona(activeBotSeatIndex, bot.id)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-yellow-500/20 border-yellow-400 text-yellow-200 shadow-md ring-1 ring-yellow-400/40'
                            : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                        }`}
                      >
                        <div className="text-2xl mb-1">{bot.avatar}</div>
                        <div className="text-xs font-black truncate">{bot.name}</div>
                        <div className="text-[10px] text-yellow-400/90 font-bold">{bot.elo} Elo</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: TINH CHỈNH THÔNG SỐ AI CHUYÊN SÂU */}
          {/* ============================================================ */}
          {activeTab === 'ADVANCED_AI' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 rounded-2xl bg-black/40 border border-yellow-500/20 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Đang Tinh Chỉnh Chỉ Số Cho: {seatLabels[activeBotSeatIndex]}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    Bot: <strong className="text-yellow-300">{currentConfig.name}</strong> ({currentConfig.elo} Elo)
                  </div>
                </div>

                {/* Chọn ghế để chỉnh AI */}
                <div className="flex items-center gap-1.5">
                  {seatLabels.slice(0, activeBotCount).map((l, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveBotSeatIndex(i)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeBotSeatIndex === i
                          ? 'bg-yellow-500 text-red-950 font-black'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Bot {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* CÁC SLIDER THÔNG SỐ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. MCTS Simulations */}
                <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-white">Mô Phỏng MCTS (Monte Carlo Tree Search):</span>
                    <span className="font-mono text-yellow-400 font-bold">{currentConfig.mctsSimulations || 0} ván</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={currentConfig.mctsSimulations || 0}
                    onChange={(e) => handleSliderChange('mctsSimulations', parseInt(e.target.value, 10))}
                    className="w-full accent-yellow-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-neutral-500">Mô phỏng trước các nhánh rẽ tương lai để tìm nước đi tối ưu nhất</div>
                </div>

                {/* 2. Memory Depth */}
                <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-white">Khả Năng Nhớ Bài (Memory Depth):</span>
                    <span className="font-mono text-yellow-400 font-bold">{Math.round((currentConfig.memoryDepth || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={currentConfig.memoryDepth || 0}
                    onChange={(e) => handleSliderChange('memoryDepth', parseFloat(e.target.value))}
                    className="w-full accent-yellow-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-neutral-500">Tỷ lệ ghi nhớ các lá bài đã ra, Heo và Hàng còn tồn tại trên bàn</div>
                </div>

                {/* 3. Tempo Control */}
                <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-white">Kiểm Soát Nhịp Độ (Tempo Control):</span>
                    <span className="font-mono text-yellow-400 font-bold">{Math.round((currentConfig.tempoControl || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={currentConfig.tempoControl || 0}
                    onChange={(e) => handleSliderChange('tempoControl', parseFloat(e.target.value))}
                    className="w-full accent-yellow-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-neutral-500">Quyết định xả bài rác nhanh hay gom bài chờ thời cơ chém Heo</div>
                </div>

                {/* 4. Baiting Tendency */}
                <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-white">Chiến Thuật Nhử Mồi (Baiting Tendency):</span>
                    <span className="font-mono text-yellow-400 font-bold">{Math.round((currentConfig.baitingTendency || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={currentConfig.baitingTendency || 0}
                    onChange={(e) => handleSliderChange('baitingTendency', parseFloat(e.target.value))}
                    className="w-full accent-yellow-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-neutral-500">Cố tình ra bài mồi lẻ/đôi cao để dụ đối phương chặt Heo vào bẫy Hàng</div>
                </div>

                {/* 5. Damage Control */}
                <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-white">Hạn Chế Thiệt Hại (Damage Control):</span>
                    <span className="font-mono text-yellow-400 font-bold">{Math.round((currentConfig.damageControl || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={currentConfig.damageControl || 0}
                    onChange={(e) => handleSliderChange('damageControl', parseFloat(e.target.value))}
                    className="w-full accent-yellow-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-neutral-500">Tẩu thoát bài sớm để giảm số lá tồn khi biết khó tranh Nhất</div>
                </div>

                {/* 6. Anti-Leader Aggression */}
                <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-white">Chặn Người Sắp Thắng (Anti-Leader):</span>
                    <span className="font-mono text-yellow-400 font-bold">{Math.round((currentConfig.antiLeaderAggression || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={currentConfig.antiLeaderAggression || 0}
                    onChange={(e) => handleSliderChange('antiLeaderAggression', parseFloat(e.target.value))}
                    className="w-full accent-yellow-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-neutral-500">Quyết liệt chặn đối thủ còn 1-2 lá bài để bảo vệ vị thế</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER: NÚT BẮT ĐẦU VÁN ĐẤU */}
        <div className="p-4 bg-black/80 border-t border-neutral-800 flex items-center justify-between gap-4">
          <div className="text-xs text-neutral-400 hidden sm:block">
            Đang chọn: <span className="text-yellow-300 font-bold">{playerCount} Người</span> • Cược: <span className="text-yellow-300 font-bold">{settings.betAmount.toLocaleString()} Xu</span> • Phạt: <span className="text-yellow-300 font-bold">x{settings.choppingMultiplier || 1}</span> • Tiền cọc: <span className="text-yellow-300 font-bold">{depositRequired.toLocaleString()} Xu</span>
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
              disabled={isInsufficientCoins}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg border ${
                isInsufficientCoins
                  ? 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-red-600 via-amber-500 to-yellow-500 hover:from-red-500 hover:to-yellow-400 hover:scale-105 cursor-pointer border-yellow-300/40'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isInsufficientCoins ? 'Không Đủ Tiền Cọc' : 'Vào Bàn Chơi Ngay'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
