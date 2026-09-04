import React from 'react';
import { AlertTriangle, Home, Landmark, ShieldAlert } from 'lucide-react';
import { useOnlineStore } from '../../../stores/useOnlineStore';
import { useViewStore } from '../../../stores/useViewStore';
import { Button } from '../../primitives';
import { useI18n } from '../../../locales';

export interface MobileOnlineDisbandViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileOnlineDisbandView: React.FC<MobileOnlineDisbandViewProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useI18n();
  const { disbandNotice } = useOnlineStore();
  const { openModal } = useViewStore();

  if (!isOpen || disbandNotice === null) return null;

  const normalizedTitle = disbandNotice.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const isInsufficientCoins = normalizedTitle.includes('KHONG DU') || normalizedTitle.includes('INSUFFICIENT');

  const handleOpenBank = () => {
    onClose();
    openModal('BANK');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-amber-500/30 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden text-white flex flex-col p-6 space-y-6">
        
        {/* Header Indicator / Glowing Icon */}
        <div className="flex flex-col items-center space-y-3 pt-2">
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-amber-500/20 blur-lg animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600/30 via-yellow-500/20 to-amber-400/30 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-xl">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-[11px] font-bold text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{t('online.disbandBadge')}</span>
          </div>
        </div>

        {/* Title & Detailed Notice */}
        <div className="space-y-2.5 text-center">
          <h3 className="text-base font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400">
            {disbandNotice.title}
          </h3>
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              {disbandNotice.message}
            </p>
          </div>
        </div>

        {/* Native Mobile Bottom Actions */}
        <div className="pt-1 pb-[max(env(safe-area-inset-bottom),4px)] flex flex-col gap-2.5">
          {isInsufficientCoins && (
            <Button
              variant="gold"
              size="lg"
              onClick={handleOpenBank}
              leftIcon={<Landmark className="w-4 h-4 text-slate-950" />}
              className="w-full font-black text-sm uppercase tracking-wider py-3.5 rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-transform cursor-pointer"
            >
              {t('bankruptcy.visitBank')}
            </Button>
          )}

          <Button
            variant={isInsufficientCoins ? 'surface' : 'gold'}
            size="lg"
            onClick={onClose}
            leftIcon={<Home className="w-4 h-4" />}
            className="w-full font-black text-sm uppercase tracking-wider py-3.5 rounded-2xl shadow-xl active:scale-95 transition-transform cursor-pointer"
          >
            {t('victory.btnBackLobby')}
          </Button>
        </div>
      </div>
    </div>
  );
};
