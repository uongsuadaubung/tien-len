import { useState, useEffect } from 'react';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { soundManager } from '../audio/sound-manager';

import { useUserStore } from '../../stores/useUserStore';
import { useI18n } from '../../locales';

export const AVATAR_OPTIONS: readonly string[] = [
  // Nhóm 1: Thần Bài & Quý Tộc Sòng Bạc
  '🤠', '🤴', '👸', '🥷', '🧙‍♂️', '😎',
  // Nhóm 2: Nhân Vật Cá Tính & Đẳng Cấp
  '🧐', '🤑', '👨‍💼', '👩‍💼', '🦹‍♂️', '🕵️‍♂️',
  // Nhóm 3: Thần Thú & Linh Vật May Mắn
  '🐉', '🐯', '🦁', '🐺', '🦊', '🦅',
  // Nhóm 4: Động Vật Uy Lực & Dễ Thương
  '🐼', '🦍', '🦈', '🐍', '🐗', '🦄',
  // Nhóm 5: Vương Miện, Bài & Bảo Vật
  '💎', '👑', '🎩', '🃏', '🎲', '🏆',
  // Nhóm 6: Chiến Binh, Lửa & Tiền Tài
  '🔥', '⚡', '🍀', '🪙', '💰', '🎯'
];

export interface UseNameSetupParams {
  isOpen: boolean;
  onClose?: (() => void) | null;
}

export interface UseNameSetupResult {
  name: string;
  setName: (name: string) => void;
  avatar: string;
  setAvatar: (avatar: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  avatarOptions: readonly string[];
  handleSubmit: (e: React.FormEvent | null) => void;
}

export function useNameSetup({
  isOpen,
  onClose = null
}: UseNameSetupParams): UseNameSetupResult {
  const { t } = useI18n();
  const { profile, setProfile: onUpdateProfile } = useUserStore();
  const [name, setName] = useState<string>(profile.name || '');
  const [avatar, setAvatar] = useState<string>(profile.avatar || '🤠');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(profile.name || '');
      setAvatar(profile.avatar || '🤠');
      setError(null);
    }
  }, [isOpen, profile]);

  const handleSubmit = (e: React.FormEvent | null) => {
    if (e) e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('nameSetup.errorEmpty'));
      return;
    }
    if (trimmed.length < 2) {
      setError(t('nameSetup.errorMinLength'));
      return;
    }
    if (trimmed.length > 20) {
      setError(t('nameSetup.errorMaxLength'));
      return;
    }

    const updated: PlayerProfile = {
      ...profile,
      name: trimmed,
      avatar: avatar
    };

    savePlayerProfile(updated);
    onUpdateProfile(updated);
    soundManager.playVictory();

    if (onClose) {
      onClose();
    }
  };

  return {
    name,
    setName,
    avatar,
    setAvatar,
    error,
    setError,
    avatarOptions: AVATAR_OPTIONS,
    handleSubmit
  };
}
