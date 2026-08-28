import { useState, useEffect } from 'react';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { soundManager } from '../audio/sound-manager';

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
  profile: PlayerProfile;
  isOpen: boolean;
  onClose: (() => void) | null;
  onUpdateProfile: (updated: PlayerProfile) => void;
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
  profile,
  isOpen,
  onClose,
  onUpdateProfile
}: UseNameSetupParams): UseNameSetupResult {
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
      setError('Vui lòng nhập tên / biệt danh của bạn!');
      return;
    }
    if (trimmed.length < 2) {
      setError('Biệt danh phải có ít nhất 2 ký tự!');
      return;
    }
    if (trimmed.length > 20) {
      setError('Biệt danh không được vượt quá 20 ký tự!');
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
