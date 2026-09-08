import { useState, useCallback, useMemo } from 'react';
import { getRankTierByElo, type RankTierInfo } from '../../engine/elo';
import { forceUploadToCloud, forceDownloadFromCloud } from '../../engine/sync/sync-service';
import type { SyncConflictData } from '../../stores/useViewStore';
import { useI18n } from '../../locales';

export interface UseSyncConflictLogicOptions {
  conflictData: SyncConflictData;
  onClose: () => void;
}

export interface UseSyncConflictLogicResult {
  localData: SyncConflictData['localData'];
  cloudData: SyncConflictData['cloudData'];
  localRank: RankTierInfo;
  cloudRank: RankTierInfo;
  isProcessing: boolean;
  errorMsg: string | null;
  handleChooseLocal: () => Promise<void>;
  handleChooseCloud: () => Promise<void>;
  formatTime: (timestamp: number) => string;
}

export function formatSyncConflictTime(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes} • ${day}/${month}/${year}`;
}

export function useSyncConflictLogic({
  conflictData,
  onClose
}: UseSyncConflictLogicOptions): UseSyncConflictLogicResult {
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { localData, cloudData } = conflictData;
  const localRank = useMemo(() => getRankTierByElo(localData.profile.elo), [localData.profile.elo]);
  const cloudRank = useMemo(() => getRankTierByElo(cloudData.profile.elo), [cloudData.profile.elo]);

  const handleChooseLocal = useCallback(async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await forceUploadToCloud();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t('sync.conflictUploadError'));
    } finally {
      setIsProcessing(false);
    }
  }, [onClose, t]);

  const handleChooseCloud = useCallback(async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await forceDownloadFromCloud();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t('sync.conflictDownloadError'));
    } finally {
      setIsProcessing(false);
    }
  }, [onClose, t]);

  return {
    localData,
    cloudData,
    localRank,
    cloudRank,
    isProcessing,
    errorMsg,
    handleChooseLocal,
    handleChooseCloud,
    formatTime: formatSyncConflictTime
  };
}
