import React, { useState } from 'react';
import { 
  GameSettings, 
  PlayerCount, 
  normalizePlayerCount,
  BotPersonaIdTuple,
  CustomBotConfigTuple,
  updateTupleAt
} from '../../engine/types';
import { BOT_LINEUP_PRESETS } from '../../engine/game-modes';
import { BOT_PERSONAS, getAllBotConfigs } from '../../ai/bot-factory';
import { BotConfig } from '../../ai/types';
import { ECONOMY_CONSTANTS, calculateRequiredDeposit } from '../../engine/constants/economy';
import { 
  Play, 
  Sliders, 
  Sparkles, 
  Crown, 
  Dice5, 
  Users, 
  Zap, 
  BrainCircuit
} from 'lucide-react';
import { TableRulesConfigPanel, TableConfigState } from './TableRulesConfigPanel';
import { Modal, Tabs, Card, Badge, Button } from '../primitives';

export interface CustomGameModalConfig {
  selectedModeId: string;
  settings: GameSettings;
  botPersonaIds: BotPersonaIdTuple;
  customBotConfigs: CustomBotConfigTuple<BotConfig>;
  playerCount: PlayerCount;
}

interface CustomGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: Partial<CustomGameModalConfig>;
  playerCoins: number;
  onStartCustomGame: (config: CustomGameModalConfig) => void;
}

type TabType = 'MODE_RULES' | 'BOT_ROSTER' | 'ADVANCED_AI';

interface CustomTab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const customTabs: CustomTab[] = [
  { id: 'MODE_RULES', label: '1. Luật & Bàn Đấu', icon: <Zap className="w-4 h-4" /> },
  { id: 'BOT_ROSTER', label: '2. Đội Hình Đối Thủ', icon: <Users className="w-4 h-4" /> },
  { id: 'ADVANCED_AI', label: '3. Tinh Chỉnh Chiến Thuật', icon: <BrainCircuit className="w-4 h-4" /> }
];

export const CustomGameModal: React.FC<CustomGameModalProps> = ({
  isOpen,
  onClose,
  initialConfig,
  playerCoins,
  onStartCustomGame
}) => {
  const allPersonas = getAllBotConfigs();

  const initialBet = Math.min(
    initialConfig?.settings?.betAmount || ECONOMY_CONSTANTS.DEFAULT_QUICK_BET,
    Math.max(1, playerCoins)
  );

  const [playerCount, setPlayerCount] = useState<PlayerCount>(
    normalizePlayerCount(initialConfig?.playerCount)
  );
  const [settings, setSettings] = useState<GameSettings>({
    mode: initialConfig?.settings?.mode || 'COUNT_CARDS',
    betAmount: initialBet,
    playerCount: normalizePlayerCount(initialConfig?.playerCount),
    allowFourPairsCutAnytime: initialConfig?.settings?.allowFourPairsCutAnytime ?? true,
    instantWinEnabled: initialConfig?.settings?.instantWinEnabled ?? true,
    soundEnabled: initialConfig?.settings?.soundEnabled ?? true,
    prohibitEndingWithTwo: initialConfig?.settings?.prohibitEndingWithTwo ?? true,
    threeSpadesEndingBonus: initialConfig?.settings?.threeSpadesEndingBonus ?? true,
    cascadeChopEnabled: initialConfig?.settings?.cascadeChopEnabled ?? true
  });

  const [botPersonaIds, setBotPersonaIds] = useState<BotPersonaIdTuple>(
    initialConfig?.botPersonaIds || ['BOT_ELO_850', 'BOT_ELO_1150', 'BOT_ELO_1750']
  );

  const [customBotConfigs, setCustomBotConfigs] = useState<CustomBotConfigTuple<BotConfig>>(
    initialConfig?.customBotConfigs || [{}, {}, {}]
  );

  const [choppingMultiplier, setChoppingMultiplier] = useState<number>(1);
  const [congEnabled, setCongEnabled] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<TabType>('MODE_RULES');
  const [activeBotSeatIndex, setActiveBotSeatIndex] = useState<number>(0);

  const depositRequired = calculateRequiredDeposit(settings.betAmount, choppingMultiplier);
  const isInsufficientCoins = playerCoins < settings.betAmount;
  const actualDeposit = Math.min(playerCoins, depositRequired);

  const handleApplyBotPreset = (presetBotIds: BotPersonaIdTuple) => {
    setBotPersonaIds([presetBotIds[0], presetBotIds[1], presetBotIds[2]]);
  };

  const handleApplyGodModeAll = () => {
    setBotPersonaIds(['BOT_ELO_2500', 'BOT_ELO_2300', 'BOT_ELO_2150']);
    setCustomBotConfigs([
      { mctsSimulations: 80, memoryDepth: 1.0, tempoControl: 1.0, damageControl: 1.0, antiLeaderAggression: 1.0, baitingTendency: 0.95 },
      { mctsSimulations: 60, memoryDepth: 1.0, tempoControl: 1.0, damageControl: 1.0, antiLeaderAggression: 1.0, baitingTendency: 0.90 },
      { mctsSimulations: 40, memoryDepth: 1.0, tempoControl: 0.98, damageControl: 0.98, antiLeaderAggression: 1.0, baitingTendency: 0.85 }
    ]);
  };

  const handleApplyBalancedAll = () => {
    const shuffled = ['BOT_ELO_950', 'BOT_ELO_1150', 'BOT_ELO_1450', 'BOT_ELO_1750'].sort(() => Math.random() - 0.5);
    setBotPersonaIds([shuffled[0] || 'BOT_ELO_850', shuffled[1] || 'BOT_ELO_1150', shuffled[2] || 'BOT_ELO_1450']);
    setCustomBotConfigs([{}, {}, {}]);
  };

  const handleRandomizeBots = () => {
    const personaKeys = Object.keys(BOT_PERSONAS);
    const shuffled = [...personaKeys].sort(() => 0.5 - Math.random());
    setBotPersonaIds([shuffled[0] || 'BOT_ELO_850', shuffled[1] || 'BOT_ELO_1150', shuffled[2] || 'BOT_ELO_1450']);
  };

  const handleUpdateBotPersona = (seatIndex: number, personaId: string) => {
    setBotPersonaIds(updateTupleAt(botPersonaIds, seatIndex, personaId));
  };

  const handleSliderChange = (field: keyof BotConfig, value: number) => {
    setCustomBotConfigs(prev => {
      const current = prev[activeBotSeatIndex] || {};
      const updated = { ...current, [field]: value };
      return updateTupleAt(prev, activeBotSeatIndex, updated);
    });
  };

  const handleTableConfigChange = (updated: Partial<TableConfigState>) => {
    if (updated.playerCount !== undefined) {
      setPlayerCount(updated.playerCount);
    }
    if (updated.choppingMultiplier !== undefined) {
      setChoppingMultiplier(updated.choppingMultiplier);
    }
    if (updated.congEnabled !== undefined) {
      setCongEnabled(updated.congEnabled);
    }
    setSettings(prev => ({
      ...prev,
      ...updated
    }));
  };

  const handleStartGame = () => {
    if (settings.betAmount <= 0) {
      alert('Mức cược phải lớn hơn 0 Xu!');
      return;
    }
    if (isInsufficientCoins) {
      alert(`Số dư hiện tại (${playerCoins.toLocaleString()} Xu) không đủ mức cược tối thiểu của bàn (${settings.betAmount.toLocaleString()} Xu)!`);
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

  const activeBotCount = playerCount - 1;
  const currentActivePersona = BOT_PERSONAS[botPersonaIds[activeBotSeatIndex]] || BOT_PERSONAS.BOT_ELO_1150;
  const currentActiveCustom = customBotConfigs[activeBotSeatIndex] || {};
  const currentConfig: BotConfig = {
    ...currentActivePersona,
    ...currentActiveCustom
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xưởng Tùy Biến Trận Đấu (Custom Sandbox)"
      subtitle="Toàn quyền tùy chỉnh luật bàn đấu, số người chơi, xếp đội hình Bot và tinh chỉnh AI."
      icon={<Sliders className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="4xl"
      height="h-[92vh] sm:h-[720px]"
      headerRight={
        <Badge variant="neutral" size="md">
          🪙 {playerCoins.toLocaleString()} Xu
        </Badge>
      }
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-muted)] hidden sm:block">
            Đang chọn: <span className="text-[var(--text-primary)] font-bold">{playerCount} Người</span> • Cược: <span className="text-[var(--color-gold)] font-bold">{settings.betAmount.toLocaleString()} Xu</span> • Phạt: <span className="text-[var(--color-gold)] font-bold">x{choppingMultiplier}</span> • Tiền cọc an toàn: <span className="text-[var(--color-gold)] font-bold">{actualDeposit.toLocaleString()} Xu</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="surface"
              size="md"
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              Hủy Bỏ
            </Button>
            <Button
              variant="gold"
              size="md"
              onClick={handleStartGame}
              disabled={isInsufficientCoins}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              className="flex-1 sm:flex-none"
            >
              <span>{isInsufficientCoins ? 'Không Đủ Tiền Cược' : 'Bắt Đầu Trận Đấu'}</span>
            </Button>
          </div>
        </div>
      }
    >
      {/* TABS */}
      <Tabs
        options={customTabs}
        activeId={activeTab}
        onChange={(id) => {
          if (id === 'MODE_RULES' || id === 'BOT_ROSTER' || id === 'ADVANCED_AI') {
            setActiveTab(id);
          }
        }}
        className="mb-4"
      />

      {/* TAB 1: LUẬT BÀN ĐẤU */}
      {activeTab === 'MODE_RULES' && (
        <TableRulesConfigPanel
          playerCoins={playerCoins}
          config={{
            ...settings,
            playerCount,
            choppingMultiplier,
            congEnabled
          }}
          onChange={handleTableConfigChange}
          showInstantWin={true}
          showCongOption={false}
        />
      )}

      {/* TAB 2: ĐỘI HÌNH BOT */}
      {activeTab === 'BOT_ROSTER' && (
        <div className="space-y-4 animate-fade-in">
          {/* PRESETS NHANH */}
          <Card variant="surface" className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-gold)]" />
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Đội Hình Đối Thủ Khuyên Dùng
                </span>
              </div>
              <Button
                variant="surface"
                size="sm"
                onClick={handleRandomizeBots}
                leftIcon={<Dice5 className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
              >
                Chọn Nhanh Đối Thủ
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BOT_LINEUP_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyBotPreset(preset.botIds)}
                  className="p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-card)] hover:border-[var(--border-gold)] text-left transition-all group cursor-pointer shadow-sm"
                >
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--color-gold)]">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                    {preset.description}
                  </div>
                </button>
              ))}
              
              {/* Preset Thần Bài */}
              <button
                onClick={handleApplyGodModeAll}
                className="p-2.5 rounded-xl bg-[var(--color-ruby-bg)] hover:brightness-110 border border-[var(--color-ruby-border)] text-left transition-all cursor-pointer col-span-2 sm:col-span-4 flex items-center gap-2 shadow-sm"
              >
                <Crown className="w-4 h-4 text-[var(--color-gold)] flex-shrink-0" />
                <span className="text-xs font-bold text-red-200">
                  Thách Thức 3 Thần Bài Tối Thượng (God Mode 2300-2500 Elo + Full MCTS)
                </span>
              </button>
            </div>
          </Card>

          {/* CHỌN BOT TỪNG GHẾ */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Chỉ Định Bot Cho Từng Ghế ({activeBotCount} Ghế Khả Dụng)
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
                        ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] shadow-md'
                        : 'bg-[var(--bg-card)] border-[var(--border-card)] hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                      <span className="font-bold">{label}</span>
                      {isSelectedSeat && (
                        <Badge variant="gold" size="sm">Đang Chọn</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)] flex items-center justify-center text-2xl shadow-inner">
                        {persona.avatar}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">{persona.name}</div>
                        <div className="text-[11px] text-[var(--color-gold)] font-bold">{persona.elo} Elo</div>
                        <div className="text-[10px] text-[var(--text-muted)] line-clamp-1">{persona.description}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* KHO BOT SẴN CÓ */}
          <Card variant="surface" className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Kho Bot Sẵn Có (Gán vào {seatLabels[activeBotSeatIndex]})
              </span>
              <span className="text-xs text-[var(--text-muted)]">18 Nhân Vật Bot</span>
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
                        ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] text-[var(--text-primary)] shadow-sm'
                        : 'bg-[var(--bg-card)] border-[var(--border-card)] text-[var(--text-muted)] hover:border-white/30 hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="text-2xl mb-1">{bot.avatar}</div>
                    <div className="text-xs font-bold truncate">{bot.name}</div>
                    <div className="text-[10px] text-[var(--color-gold)] font-bold">{bot.elo} Elo</div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: TINH CHỈNH CHỈ SỐ AI */}
      {activeTab === 'ADVANCED_AI' && (
        <div className="space-y-4 animate-fade-in">
          <Card variant="surface" className="p-3.5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Đang Tinh Chỉnh: {seatLabels[activeBotSeatIndex]}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                Nhân vật: <strong className="text-[var(--color-gold)]">{currentConfig.name}</strong> ({currentConfig.elo} Elo)
              </div>
            </div>

            {/* Chọn ghế */}
            <div className="flex items-center gap-1.5">
              {seatLabels.slice(0, activeBotCount).map((_l, i) => (
                <Button
                  key={i}
                  variant={activeBotSeatIndex === i ? 'gold' : 'surface'}
                  size="sm"
                  onClick={() => setActiveBotSeatIndex(i)}
                >
                  Bot {i + 1}
                </Button>
              ))}
            </div>
          </Card>

          {/* SLIDER THÔNG SỐ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. MCTS Simulations */}
            <Card variant="nested" className="p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Mô Phỏng MCTS:</span>
                <span className="font-mono text-[var(--color-gold)] font-bold">{currentConfig.mctsSimulations || 0} ván</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={currentConfig.mctsSimulations || 0}
                onChange={(e) => handleSliderChange('mctsSimulations', parseInt(e.target.value, 10))}
                className="w-full accent-[var(--color-gold)] cursor-pointer"
              />
              <div className="text-[10px] text-[var(--text-muted)]">Mô phỏng trước các nhánh rẽ tương lai để tìm nước tối ưu</div>
            </Card>

            {/* 2. Memory Depth */}
            <Card variant="nested" className="p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Nhớ Bài (Memory Depth):</span>
                <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.memoryDepth || 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={currentConfig.memoryDepth || 0}
                onChange={(e) => handleSliderChange('memoryDepth', parseFloat(e.target.value))}
                className="w-full accent-[var(--color-gold)] cursor-pointer"
              />
              <div className="text-[10px] text-[var(--text-muted)]">Tỷ lệ nhớ các lá bài đã đánh, Heo và Hàng trên bàn</div>
            </Card>

            {/* 3. Tempo Control */}
            <Card variant="nested" className="p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Nhịp Độ (Tempo Control):</span>
                <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.tempoControl || 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={currentConfig.tempoControl || 0}
                onChange={(e) => handleSliderChange('tempoControl', parseFloat(e.target.value))}
                className="w-full accent-[var(--color-gold)] cursor-pointer"
              />
              <div className="text-[10px] text-[var(--text-muted)]">Quyết định xả rác nhanh hay ém bài chém Heo</div>
            </Card>

            {/* 4. Baiting Tendency */}
            <Card variant="nested" className="p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Nhử Mồi (Baiting Tendency):</span>
                <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.baitingTendency || 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={currentConfig.baitingTendency || 0}
                onChange={(e) => handleSliderChange('baitingTendency', parseFloat(e.target.value))}
                className="w-full accent-[var(--color-gold)] cursor-pointer"
              />
              <div className="text-[10px] text-[var(--text-muted)]">Đánh bài lẻ cao để lừa đối phương chém Heo vào bẫy Hàng</div>
            </Card>

            {/* 5. Damage Control */}
            <Card variant="nested" className="p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Hạn Chế Thiệt Hại (Damage Control):</span>
                <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.damageControl || 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={currentConfig.damageControl || 0}
                onChange={(e) => handleSliderChange('damageControl', parseFloat(e.target.value))}
                className="w-full accent-[var(--color-gold)] cursor-pointer"
              />
              <div className="text-[10px] text-[var(--text-muted)]">Tẩu thoát bài sớm để giảm số lá phạt khi khó tranh Nhất</div>
            </Card>

            {/* 6. Anti-Leader */}
            <Card variant="nested" className="p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Chặn Người Sắp Thắng (Anti-Leader):</span>
                <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.antiLeaderAggression || 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={currentConfig.antiLeaderAggression || 0}
                onChange={(e) => handleSliderChange('antiLeaderAggression', parseFloat(e.target.value))}
                className="w-full accent-[var(--color-gold)] cursor-pointer"
              />
              <div className="text-[10px] text-[var(--text-muted)]">Quyết liệt chặn đối thủ còn ít bài để giữ thế trận</div>
            </Card>
          </div>
        </div>
      )}
    </Modal>
  );
};
