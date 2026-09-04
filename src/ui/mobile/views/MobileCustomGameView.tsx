import React from 'react';
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
import { TableRulesConfigPanel } from '../../components/TableRulesConfigPanel';
import { Tabs, Card, Badge, Button } from '../../primitives';
import { MobileScreenWrapper } from './MobileScreenWrapper';
import { 
  useCustomGame, 
  CustomGameModalConfig, 
  CustomGameTabType 
} from '../../hooks/useCustomGame';
import { useUserStore } from '../../../stores/useUserStore';
import { useI18n, type I18nKeyPath } from '../../../locales';
import type { BotPersonaIdTuple } from '../../../engine/types';

interface BotPreset {
  readonly id: string;
  readonly nameKey: I18nKeyPath;
  readonly descKey: I18nKeyPath;
  readonly botIds: BotPersonaIdTuple;
}

const BOT_PRESETS: readonly BotPreset[] = [
  { id: 'NEWBIE_TABLE', nameKey: 'customGame.presetNewbieName', descKey: 'customGame.presetNewbieDesc', botIds: ['BOT_ELO_700', 'BOT_ELO_750', 'BOT_ELO_850'] },
  { id: 'CASUAL_STREET', nameKey: 'customGame.presetCasualName', descKey: 'customGame.presetCasualDesc', botIds: ['BOT_ELO_950', 'BOT_ELO_1000', 'BOT_ELO_1150'] },
  { id: 'MID_TIER_PRO', nameKey: 'customGame.presetProName', descKey: 'customGame.presetProDesc', botIds: ['BOT_ELO_1500', 'BOT_ELO_1750', 'BOT_ELO_1800'] },
  { id: 'ELITE_CLUB', nameKey: 'customGame.presetEliteName', descKey: 'customGame.presetEliteDesc', botIds: ['BOT_ELO_2000', 'BOT_ELO_2300', 'BOT_ELO_2500'] }
];

export interface MobileCustomGameViewProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: Partial<CustomGameModalConfig>;
  onStartCustomGame: (config: CustomGameModalConfig) => void;
}

interface CustomTab {
  id: CustomGameTabType;
  label: string;
  icon: React.ReactNode;
}

export const MobileCustomGameView: React.FC<MobileCustomGameViewProps> = ({
  isOpen,
  onClose,
  initialConfig,
  onStartCustomGame
}) => {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const playerCoins = profile.coins;
  const {
    playerCount,
    settings,
    botPersonaIds,
    choppingMultiplier,
    congEnabled,
    activeTab,
    setActiveTab,
    activeBotSeatIndex,
    setActiveBotSeatIndex,
    actualDeposit,
    isInsufficientCoins,
    seatLabels,
    activeBotCount,
    currentConfig,
    allPersonas,
    handleApplyBotPreset,
    handleApplyGodModeAll,
    handleRandomizeBots,
    handleUpdateBotPersona,
    handleConfigChange,
    handleTableConfigChange,
    handleStartGame
  } = useCustomGame({
    initialConfig,
    onStartCustomGame,
    onClose
  });

  if (!isOpen) return null;

  const customTabs: CustomTab[] = [
    { id: 'MODE_RULES', label: t('customGame.tabRules'), icon: <Zap className="w-4 h-4" /> },
    { id: 'BOT_ROSTER', label: t('customGame.tabRoster'), icon: <Users className="w-4 h-4" /> },
    { id: 'ADVANCED_AI', label: t('customGame.tabAi'), icon: <BrainCircuit className="w-4 h-4" /> }
  ];

  return (
    <MobileScreenWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={t('customGame.modalTitle')}
      subtitle={t('customGame.modalSubtitle')}
      icon={<Sliders className="w-5 h-5 text-[var(--color-gold)]" />}
      headerRight={
        <Badge variant="neutral" size="md">
          🪙 {playerCoins.toLocaleString()} {t('common.coins')}
        </Badge>
      }
      footer={
        <div className="w-full flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0 flex flex-col">
            <span className="text-[10px] text-[var(--text-muted)] truncate">
              {t('tableConfig.tablePlayerCount', { count: playerCount })} • <span className="text-[var(--color-gold)] font-bold">{settings.betAmount.toLocaleString()} {t('common.coins')}</span>
            </span>
            <span className="text-[10px] text-[var(--text-muted)] truncate">
              x{choppingMultiplier} • <span className="text-[var(--color-gold)] font-bold">{actualDeposit.toLocaleString()} {t('common.coins')}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="surface"
              size="md"
              onClick={onClose}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="gold"
              size="md"
              onClick={handleStartGame}
              disabled={isInsufficientCoins}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
            >
              <span>{isInsufficientCoins ? t('errors.insufficientCoins') : t('customGame.btnStartGame')}</span>
            </Button>
          </div>
        </div>
      }
      className={null}
    >
      <div className="space-y-4 pb-4 select-none">
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

        {/* TAB 2: ĐỘI HÌNH ĐỐI THỦ */}
        {activeTab === 'BOT_ROSTER' && (
          <div className="space-y-4 animate-fade-in">
            {/* PRESETS NHANH */}
            <Card variant="surface" className="p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-gold)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    {t('customGame.recommendedRoster')}
                  </span>
                </div>
                <Button
                  variant="surface"
                  size="sm"
                  onClick={handleRandomizeBots}
                  leftIcon={<Dice5 className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                >
                  {t('customGame.quickSelectOpponents')}
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BOT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyBotPreset(preset.botIds)}
                    className="p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-card)] hover:border-[var(--border-gold)] text-left transition-all group cursor-pointer shadow-sm"
                  >
                    <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--color-gold)]">
                      {t(preset.nameKey)}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                      {t(preset.descKey)}
                    </div>
                  </button>
                ))}
                
                {/* Preset Thần Bài & Trùm Sòng */}
                <button
                  onClick={handleApplyGodModeAll}
                  className="p-2.5 rounded-xl bg-[var(--color-ruby-bg)] hover:brightness-110 border border-[var(--color-ruby-border)] text-left transition-all cursor-pointer col-span-2 sm:col-span-4 flex items-center gap-2 shadow-sm"
                >
                  <Crown className="w-4 h-4 text-[var(--color-gold)] flex-shrink-0" />
                  <span className="text-xs font-bold text-red-200">
                    {t('customGame.godModeTitle')}
                  </span>
                </button>
              </div>
            </Card>

            {/* CHỌN ĐỐI THỦ TỪNG GHẾ */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                {t('customGame.assignSeatTitle', { count: activeBotCount })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {seatLabels.slice(0, activeBotCount).map((label, idx) => {
                  const botId = botPersonaIds[idx];
                  const persona = allPersonas.find(p => p.id === botId) || allPersonas[0];
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
                          <Badge variant="gold" size="sm">{t('customGame.selecting')}</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)] flex items-center justify-center text-2xl shadow-inner">
                          {persona?.avatar}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">{persona?.name}</div>
                          <div className="text-[11px] text-[var(--color-gold)] font-bold">{persona?.elo || 1150} Elo</div>
                          <div className="text-[10px] text-[var(--text-muted)] line-clamp-1">{persona?.description}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DANH SÁCH ĐỐI THỦ KHẢ DỤNG */}
            <Card variant="surface" className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  {t('customGame.availableOpponentsTitle', { seat: seatLabels[activeBotSeatIndex] })}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{t('customGame.charactersCount', { count: allPersonas.length })}</span>
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

        {/* TAB 3: TINH CHỈNH CHIẾN THUẬT */}
        {activeTab === 'ADVANCED_AI' && (
          <div className="space-y-4 animate-fade-in">
            <Card variant="surface" className="p-3.5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  {t('customGame.tuningSeat', { seat: seatLabels[activeBotSeatIndex] })}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  {t('customGame.characterLabel')}: <strong className="text-[var(--color-gold)]">{currentConfig.name}</strong> ({currentConfig.elo} Elo)
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
                    {t('customGame.opponentIndex', { index: i + 1 })}
                  </Button>
                ))}
              </div>
            </Card>

            {/* SLIDER THÔNG SỐ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Simulations Lookahead */}
              <Card variant="nested" className="p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">{t('customGame.simulationsDepth')}</span>
                  <span className="font-mono text-[var(--color-gold)] font-bold">{currentConfig.mctsSimulations || 0} {t('customGame.simulationsUnit')}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={currentConfig.mctsSimulations || 0}
                  onChange={(e) => handleConfigChange('mctsSimulations', parseInt(e.target.value, 10))}
                  className="w-full accent-[var(--color-gold)] cursor-pointer"
                />
                <div className="text-[10px] text-[var(--text-muted)]">{t('customGame.simulationsDesc')}</div>
              </Card>

              {/* 2. Memory Depth */}
              <Card variant="nested" className="p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">{t('customGame.memoryDepth')}</span>
                  <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.memoryDepth || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={currentConfig.memoryDepth || 0}
                  onChange={(e) => handleConfigChange('memoryDepth', parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-gold)] cursor-pointer"
                />
                <div className="text-[10px] text-[var(--text-muted)]">{t('customGame.memoryDepthDesc')}</div>
              </Card>

              {/* 3. Tempo Control */}
              <Card variant="nested" className="p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">{t('customGame.tempoControl')}</span>
                  <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.tempoControl || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={currentConfig.tempoControl || 0}
                  onChange={(e) => handleConfigChange('tempoControl', parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-gold)] cursor-pointer"
                />
                <div className="text-[10px] text-[var(--text-muted)]">{t('customGame.tempoControlDesc')}</div>
              </Card>

              {/* 4. Baiting Tendency */}
              <Card variant="nested" className="p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">{t('customGame.baitingTendency')}</span>
                  <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.baitingTendency || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={currentConfig.baitingTendency || 0}
                  onChange={(e) => handleConfigChange('baitingTendency', parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-gold)] cursor-pointer"
                />
                <div className="text-[10px] text-[var(--text-muted)]">{t('customGame.baitingTendencyDesc')}</div>
              </Card>

              {/* 5. Damage Control */}
              <Card variant="nested" className="p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">{t('customGame.damageControl')}</span>
                  <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.damageControl || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={currentConfig.damageControl || 0}
                  onChange={(e) => handleConfigChange('damageControl', parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-gold)] cursor-pointer"
                />
                <div className="text-[10px] text-[var(--text-muted)]">{t('customGame.damageControlDesc')}</div>
              </Card>

              {/* 6. Anti-Leader */}
              <Card variant="nested" className="p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">{t('customGame.antiLeaderAggression')}</span>
                  <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.antiLeaderAggression || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={currentConfig.antiLeaderAggression || 0}
                  onChange={(e) => handleConfigChange('antiLeaderAggression', parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-gold)] cursor-pointer"
                />
                <div className="text-[10px] text-[var(--text-muted)]">{t('customGame.antiLeaderAggressionDesc')}</div>
              </Card>

              {/* 7. Tuyệt Kỹ & Chiến Thuật Đặc Biệt */}
              <Card variant="nested" className="p-3.5 sm:col-span-2 space-y-3">
                <div className="text-xs font-bold text-[var(--color-gold)] uppercase tracking-wider flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4" /> {t('customGame.specialTactics')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Endgame solver */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] cursor-pointer hover:border-[var(--border-gold)] transition-colors">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">{t('customGame.minimaxEndgame')}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{t('customGame.minimaxEndgameDesc')}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(currentConfig.useMinimaxEndgame)}
                      onChange={(e) => handleConfigChange('useMinimaxEndgame', e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-gold)] cursor-pointer"
                    />
                  </label>

                  {/* Card tracker / Inference */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] cursor-pointer hover:border-[var(--border-gold)] transition-colors">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">{t('customGame.bayesianInference')}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{t('customGame.bayesianInferenceDesc')}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(currentConfig.useBayesianInference)}
                      onChange={(e) => handleConfigChange('useBayesianInference', e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-gold)] cursor-pointer"
                    />
                  </label>

                  {/* Unpredictable play */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] cursor-pointer hover:border-[var(--border-gold)] transition-colors">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">{t('customGame.nashEquilibrium')}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{t('customGame.nashEquilibriumDesc')}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(currentConfig.useNashEquilibrium)}
                      onChange={(e) => handleConfigChange('useNashEquilibrium', e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-gold)] cursor-pointer"
                    />
                  </label>

                  {/* Dynamic Repartitioning */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] cursor-pointer hover:border-[var(--border-gold)] transition-colors">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">{t('customGame.dynamicRepartitioning')}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{t('customGame.dynamicRepartitioningDesc')}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(currentConfig.useDynamicRepartitioning)}
                      onChange={(e) => handleConfigChange('useDynamicRepartitioning', e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-gold)] cursor-pointer"
                    />
                  </label>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </MobileScreenWrapper>
  );
};
