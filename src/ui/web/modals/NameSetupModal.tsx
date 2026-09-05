import React from 'react';
import { ECONOMY_CONSTANTS } from '../../../engine/constants/economy';
import { Sparkles, User, Check } from 'lucide-react';
import { Modal, Card, Button } from '../../primitives';
import { useNameSetup } from '../../hooks/useNameSetup';
import { useUserStore } from '../../../stores/useUserStore';
import { useI18n } from '../../../locales';

export interface NameSetupModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const NameSetupModal: React.FC<NameSetupModalProps> = ({
  isOpen,
  onClose
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose ? onClose : () => {}}
      title={isFirstTime || !profile.name ? t('nameSetup.titleFirstTime') : t('nameSetup.titleUpdate')}
      subtitle={
        isFirstTime || !profile.name
          ? t('nameSetup.subFirstTime')
          : t('nameSetup.subUpdate')
      }
      icon={<Sparkles className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="md"
      height="auto"
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
            onClick={() => handleSubmit()}
            leftIcon={<Check className="w-4 h-4" />}
          >
            {isFirstTime || !profile.name ? t('nameSetup.btnStartPlaying') : t('nameSetup.btnSaveChanges')}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Chọn Avatar Đại Diện */}
        <Card variant="card" className="p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              {t('nameSetup.avatarLabel')} ({avatarOptions.length}):
            </label>
            <span className="text-xs text-[var(--color-gold)] font-bold">
              {t('nameSetup.selectedAvatar')} <span className="text-lg align-middle">{avatar}</span>
            </span>
          </div>
          <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1 p-0.5">
            {avatarOptions.map((av) => {
              const isSelected = avatar === av;
              return (
                <button
                  type="button"
                  key={av}
                  onClick={() => setAvatar(av)}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-2xl flex items-center justify-center transition-all cursor-pointer ${
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

        {/* 2. Nhập Tên Biệt Danh */}
        <Card variant="card" className="p-3.5 space-y-2">
          <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
            {t('nameSetup.nameLabel')}:
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
              <User className="w-4 h-4 text-[var(--color-gold)]" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t('nameSetup.namePlaceholder')}
              maxLength={20}
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-xl text-sm font-bold text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--color-gold)] transition-all"
            />
          </div>
          {error && (
            <p className="text-xs text-red-400 font-bold flex items-center gap-1">
              <span>⚠️</span>
              <span>{error}</span>
            </p>
          )}
          {isFirstTime && (
            <p className="text-[11px] text-[var(--text-muted)]">
              {t('nameSetup.startingCapital')} <strong className="text-[var(--color-gold)] font-bold">{ECONOMY_CONSTANTS.DEFAULT_STARTING_COINS.toLocaleString()} Xu</strong>
            </p>
          )}
        </Card>
      </form>
    </Modal>
  );
};
