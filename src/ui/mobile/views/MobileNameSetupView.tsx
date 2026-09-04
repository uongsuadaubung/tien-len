import React from 'react';
import { ECONOMY_CONSTANTS } from '../../../engine/constants/economy';
import { Sparkles, User, Check, Shuffle } from 'lucide-react';
import { Card, Button } from '../../primitives';
import { MobileScreenWrapper } from './MobileScreenWrapper';
import { useNameSetup } from '../../hooks/useNameSetup';
import { generateRandomCasinoNickname } from '../components/MobileVirtualKeyboard';
import { MobileVirtualInput } from '../components/MobileVirtualInput';
import { useUserStore } from '../../../stores/useUserStore';
import { useI18n } from '../../../locales';

export interface MobileNameSetupViewProps {
  isOpen: boolean;
  onClose?: (() => void) | null;
}

export const MobileNameSetupView: React.FC<MobileNameSetupViewProps> = ({
  isOpen,
  onClose = null
}) => {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const isFirstTime = !profile.name || profile.name.trim() === '';
  const {
    name,
    setName,
    avatar,
    setAvatar,
    error,
    setError,
    avatarOptions,
    handleSubmit
  } = useNameSetup({ isOpen, onClose });

  if (!isOpen) return null;

  const handleQuickRandom = () => {
    const nick = generateRandomCasinoNickname();
    setName(nick);
    if (error) setError(null);
  };

  return (
    <MobileScreenWrapper
      isOpen={isOpen}
      onClose={onClose ? onClose : () => {}}
      title={isFirstTime || !profile.name ? t('nameSetup.titleFirstTime') : t('nameSetup.titleUpdate')}
      subtitle={
        isFirstTime || !profile.name
          ? t('nameSetup.subFirstTime')
          : t('nameSetup.subUpdate')
      }
      icon={<Sparkles className="w-5 h-5 text-[var(--color-gold)]" />}
      headerRight={null}
      footer={
        <div className="w-full flex items-center justify-end gap-2">
          {!isFirstTime && onClose && profile.name.trim() !== '' && (
            <Button variant="surface" size="md" onClick={onClose}>
              {t('common.cancel')}
            </Button>
          )}
          <Button
            variant="gold"
            size="md"
            onClick={() => handleSubmit(null)}
            leftIcon={<Check className="w-4 h-4" />}
          >
            {isFirstTime || !profile.name ? t('nameSetup.btnStartPlaying') : t('nameSetup.btnSaveChanges')}
          </Button>
        </div>
      }
      className={null}
    >
      <div className="space-y-2.5 pb-6 select-none">
        {/* 1. Chọn Avatar Đại Diện */}
        <Card variant="card" className="p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              {t('nameSetup.avatarLabel')} ({avatarOptions.length}):
            </label>
            <span className="text-[10px] text-[var(--color-gold)] font-bold">
              {t('nameSetup.selectedAvatar')} <span className="text-base align-middle">{avatar}</span>
            </span>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:gap-2.5 max-h-40 sm:max-h-48 overflow-y-auto pr-1 p-0.5">
            {avatarOptions.map((av) => {
              const isSelected = avatar === av;
              return (
                <button
                  type="button"
                  key={av}
                  onClick={() => setAvatar(av)}
                  className={`h-11 sm:h-12 rounded-xl text-2xl sm:text-3xl flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] scale-105 shadow-md'
                      : 'bg-[var(--bg-container)] border border-[var(--border-container)] hover:border-white/25 hover:scale-105'
                  }`}
                >
                  <span className="emoji-avatar">{av}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* 2. Nhập Tên Biệt Danh Dùng MobileVirtualInput */}
        <Card variant="card" className="p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              {t('nameSetup.nameLabel')}:
            </span>
            {isFirstTime && (
              <span className="text-[10px] text-[var(--text-muted)]">
                {t('nameSetup.startingCapitalShort')} <strong className="text-[var(--color-gold)] font-bold">{ECONOMY_CONSTANTS.DEFAULT_STARTING_COINS.toLocaleString()} Xu</strong>
              </span>
            )}
          </div>

          <MobileVirtualInput
            value={name}
            onChange={(val) => {
              setName(val);
              if (error) setError(null);
            }}
            placeholder={t('nameSetup.namePlaceholder')}
            icon={<User className="w-4 h-4 text-[var(--color-gold)]" />}
            label={null}
            error={error}
            maxLength={20}
            showRandomNameButton={true}
            showPasteButton={false}
            onRandomName={handleQuickRandom}
            onPaste={null}
            onSubmit={() => handleSubmit(null)}
            className={null}
            inputClassName="border-[var(--color-gold-border)]"
            clearable={false}
            renderExtraActions={() => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickRandom();
                }}
                className="p-1 sm:p-1.5 rounded-lg bg-[var(--bg-container)] border border-[var(--border-container)] text-[var(--color-gold)] hover:bg-[var(--bg-card)] active:scale-95 transition-all cursor-pointer"
                title={t('nameSetup.randomNameTooltip')}
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
            )}
          />
        </Card>
      </div>
    </MobileScreenWrapper>
  );
};
