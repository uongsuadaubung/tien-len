import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { validateToken, fetchGistHistory } from '../../engine/sync/github-api';
import { 
  smartSync, 
  forceUploadToCloud, 
  forceDownloadFromCloud, 
  restoreHistoryVersion 
} from '../../engine/sync/sync-service';
import type { TienLenSaveData, GistHistoryItem } from '../../engine/sync/types';
import { useI18n } from '../../locales';

export interface UseSettingsSyncResult {
  tokenInputValue: string;
  setTokenInputValue: (val: string) => void;
  isSyncing: boolean;
  isValidatingToken: boolean;
  syncStatusMsg: { text: string; type: 'success' | 'error' | 'info' } | null;
  setSyncStatusMsg: (val: { text: string; type: 'success' | 'error' | 'info' } | null) => void;
  conflictData: { localData: TienLenSaveData; cloudData: TienLenSaveData } | null;
  setConflictData: (val: { localData: TienLenSaveData; cloudData: TienLenSaveData } | null) => void;
  historyItems: GistHistoryItem[] | null;
  isLoadingHistory: boolean;
  showHistoryModal: boolean;
  setShowHistoryModal: (val: boolean) => void;
  handleConnectToken: () => Promise<void>;
  handleSmartSync: () => Promise<void>;
  handleForceUpload: () => Promise<void>;
  handleForceDownload: () => Promise<void>;
  handleOpenHistory: () => Promise<void>;
  handleRestoreCommit: (item: GistHistoryItem) => Promise<void>;
  showNotification: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export function useSettingsSync(isOpen: boolean): UseSettingsSyncResult {
  const { t } = useI18n();
  const {
    githubToken,
    setGithubToken,
    setCachedGithubUser
  } = useSettingsStore();

  const [tokenInputValue, setTokenInputValue] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [conflictData, setConflictData] = useState<{ localData: TienLenSaveData; cloudData: TienLenSaveData } | null>(null);
  const [historyItems, setHistoryItems] = useState<GistHistoryItem[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTokenInputValue(githubToken || '');
      setSyncStatusMsg(null);
      setConflictData(null);
      setShowHistoryModal(false);
    }
  }, [isOpen, githubToken]);

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setSyncStatusMsg({ text, type });
    setTimeout(() => {
      setSyncStatusMsg((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const handleConnectToken = async () => {
    const trimmed = tokenInputValue.trim();
    if (!trimmed) {
      showNotification(t('sync.pleaseEnterToken'), 'error');
      return;
    }

    setIsValidatingToken(true);
    try {
      const res = await validateToken(trimmed);
      if (!res.success) {
        showNotification(res.error || t('sync.invalidToken'), 'error');
        return;
      }

      setGithubToken(trimmed);
      setCachedGithubUser(res.user);
      showNotification(t('sync.connectedSuccess', { user: res.user.login }), 'success');

      // Tự động kiểm tra đồng bộ lần đầu
      setTimeout(async () => {
        try {
          const syncRes = await smartSync();
          if (syncRes.type === 'synced') {
            showNotification(syncRes.detail === 'upload' ? t('sync.backedUpGist') : t('sync.downloadedGist'), 'success');
          } else if (syncRes.type === 'conflict') {
            setConflictData(syncRes);
          }
        } catch {}
      }, 500);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setIsValidatingToken(false);
    }
  };

  const handleSmartSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await smartSync();
      if (res.type === 'synced') {
        showNotification(
          res.detail === 'upload'
            ? t('sync.uploadedGistSuccess')
            : t('sync.downloadedLatestGist'),
          'success'
        );
      } else if (res.type === 'no_action') {
        showNotification(t('sync.alreadyLatest'), 'info');
      } else if (res.type === 'conflict') {
        setConflictData(res);
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceUpload = async () => {
    setIsSyncing(true);
    try {
      await forceUploadToCloud();
      setConflictData(null);
      showNotification(t('sync.overwroteGistSuccess'), 'success');
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceDownload = async () => {
    setIsSyncing(true);
    try {
      await forceDownloadFromCloud();
      setConflictData(null);
      showNotification(t('sync.appliedGistSuccess'), 'success');
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenHistory = async () => {
    if (!githubToken) return;
    setIsLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const items = await fetchGistHistory(githubToken);
      setHistoryItems(items);
    } catch {
      setHistoryItems([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRestoreCommit = async (item: GistHistoryItem) => {
    if (!item.saveData) return;
    setIsSyncing(true);
    try {
      await restoreHistoryVersion(item.saveData);
      setShowHistoryModal(false);
      showNotification(t('sync.restoredVersionSuccess'), 'success');
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    tokenInputValue,
    setTokenInputValue,
    isSyncing,
    isValidatingToken,
    syncStatusMsg,
    setSyncStatusMsg,
    conflictData,
    setConflictData,
    historyItems,
    isLoadingHistory,
    showHistoryModal,
    setShowHistoryModal,
    handleConnectToken,
    handleSmartSync,
    handleForceUpload,
    handleForceDownload,
    handleOpenHistory,
    handleRestoreCommit,
    showNotification
  };
}
