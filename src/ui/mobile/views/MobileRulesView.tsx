import React, { useState } from 'react';
import { 
  BookOpen, 
  Swords, 
  Layers, 
  Trophy, 
  AlertTriangle 
} from 'lucide-react';
import { Tabs } from '../../primitives';
import { MobileScreenWrapper } from './MobileScreenWrapper';
import { useI18n } from '../../../locales';
import { RulesHandbookContent, RulesTabType } from '../../components/RulesHandbookContent';

export interface MobileRulesViewProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TabOption {
  id: RulesTabType;
  label: string;
  icon: React.ReactNode;
}

export const MobileRulesView: React.FC<MobileRulesViewProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<RulesTabType>('COUNTER');

  if (!isOpen) return null;

  const tabOptions: TabOption[] = [
    { id: 'COUNTER', label: t('rules.tabCounter'), icon: <Swords className="w-4 h-4" /> },
    { id: 'COMBOS', label: t('rules.tabCombos'), icon: <Layers className="w-4 h-4" /> },
    { id: 'INSTANT', label: t('rules.tabInstant'), icon: <Trophy className="w-4 h-4" /> },
    { id: 'SPECIAL', label: t('rules.tabSpecial'), icon: <AlertTriangle className="w-4 h-4" /> }
  ];

  return (
    <MobileScreenWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={t('rules.modalTitle')}
      subtitle={t('rules.modalSubtitle')}
      icon={<BookOpen className="w-5 h-5 text-[var(--color-gold)]" />}
    >
      <div className="space-y-4 pb-6 select-none">
        {/* TABS NAVIGATION */}
        <Tabs
          options={tabOptions}
          activeId={activeTab}
          onChange={(id) => {
            if (id === 'COUNTER' || id === 'COMBOS' || id === 'INSTANT' || id === 'SPECIAL') {
              setActiveTab(id);
            }
          }}
          className="mb-4"
        />

        <RulesHandbookContent activeTab={activeTab} />
      </div>
    </MobileScreenWrapper>
  );
};
