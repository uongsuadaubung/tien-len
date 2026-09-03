import { create } from 'zustand';
import { vi } from './vi';
import { en } from './en';
import type { SupportedLocale, I18nKeyPath, I18nParams, LocaleDictionary } from './types';

const DICTIONARIES: Record<SupportedLocale, LocaleDictionary> = {
  vi,
  en
};

export interface I18nStoreState {
  readonly locale: SupportedLocale;
  readonly setLocale: (locale: SupportedLocale) => void;
}

export const useI18nStore = create<I18nStoreState>((set) => ({
  locale: 'vi',
  setLocale: (locale: SupportedLocale) => set({ locale })
}));

/**
 * Trích xuất chuỗi theo dot notation: 'game.playCard' -> dict['game']['playCard']
 */
function resolveKeyPath(dict: LocaleDictionary, path: string): string {
  const parts = path.split('.');
  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }
  return typeof current === 'string' ? current : path;
}

/**
 * Thay thế biến số nội suy: 'Phạt {amount} Xu' + { amount: 5000 } -> 'Phạt 5.000 Xu'
 */
function interpolate(template: string, params: I18nParams | null = null): string {
  if (!params) return template;
  let result = template;
  for (const [k, v] of Object.entries(params)) {
    const formattedVal = typeof v === 'number' ? v.toLocaleString('vi-VN') : String(v);
    result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), formattedVal);
  }
  return result;
}

/**
 * Hàm dịch thuật toàn cục Type-Safe (dùng được trong cả React component lẫn Engine/Driver/Services)
 */
export function t(keyPath: I18nKeyPath, params: I18nParams | null = null): string {
  const locale = useI18nStore.getState().locale;
  const dict = DICTIONARIES[locale] || DICTIONARIES.vi;
  const template = resolveKeyPath(dict, keyPath);
  return interpolate(template, params);
}

/**
 * React Hook cung cấp hàm t() và trạng thái ngôn ngữ
 */
export function useI18n() {
  const { locale, setLocale } = useI18nStore();
  const translate = (keyPath: I18nKeyPath, params: I18nParams | null = null): string => {
    const dict = DICTIONARIES[locale] || DICTIONARIES.vi;
    const template = resolveKeyPath(dict, keyPath);
    return interpolate(template, params);
  };

  return {
    t: translate,
    locale,
    setLocale
  };
}
