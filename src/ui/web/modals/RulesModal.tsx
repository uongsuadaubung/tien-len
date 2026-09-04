import React, { useState } from 'react';
import { 
  BookOpen, 
  Swords, 
  Layers, 
  Trophy, 
  AlertTriangle 
} from 'lucide-react';
import { Modal, Tabs, Button } from '../../primitives';
import { useI18n } from '../../../locales';
import { RulesHandbookContent, RulesTabType } from '../../components/RulesHandbookContent';

export interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TabOption {
  id: RulesTabType;
  label: string;
  icon: React.ReactNode;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<RulesTabType>('COUNTER');

  const tabOptions: TabOption[] = [
    { id: 'COUNTER', label: t('rules.tabCounter'), icon: <Swords className="w-4 h-4" /> },
    { id: 'COMBOS', label: t('rules.tabCombos'), icon: <Layers className="w-4 h-4" /> },
    { id: 'INSTANT', label: t('rules.tabInstant'), icon: <Trophy className="w-4 h-4" /> },
    { id: 'SPECIAL', label: t('rules.tabSpecial'), icon: <AlertTriangle className="w-4 h-4" /> }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('rules.modalTitle')}
      subtitle={t('rules.modalSubtitle')}
      icon={<BookOpen className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="4xl"
      height="h-[85vh] sm:h-[620px]"
      footer={
        <Button variant="gold" size="md" onClick={onClose}>
          {t('rules.btnUnderstood')}
        </Button>
      }
    >
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
    </Modal>
  );
};
