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
      showNotification('Vui lòng nhập GitHub Token.', 'error');
      return;
    }

    setIsValidatingToken(true);
    try {
      const res = await validateToken(trimmed);
      if (!res.success) {
        showNotification(res.error || 'Token không hợp lệ.', 'error');
        return;
      }

      setGithubToken(trimmed);
      setCachedGithubUser(res.user);
      showNotification(`Kết nối thành công tài khoản @${res.user.login}!`, 'success');

      // Tự động kiểm tra đồng bộ lần đầu
      setTimeout(async () => {
        try {
          const syncRes = await smartSync();
          if (syncRes.type === 'synced') {
            showNotification(syncRes.detail === 'upload' ? 'Đã sao lưu dữ liệu lên Gist!' : 'Đã tải dữ liệu từ Gist về máy!', 'success');
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
            ? 'Đã tải lên Gist thành công!'
            : 'Đã tải về dữ liệu mới nhất từ Gist!',
          'success'
        );
      } else if (res.type === 'no_action') {
        showNotification('Dữ liệu đã được đồng bộ mới nhất.', 'info');
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
      showNotification('Đã ghi đè dữ liệu lên GitHub Gist thành công!', 'success');
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
      showNotification('Đã tải và áp dụng bản lưu từ GitHub Gist thành công!', 'success');
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
      showNotification('Đã khôi phục thành công phiên bản đã chọn!', 'success');
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
