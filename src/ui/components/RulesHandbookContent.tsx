import React from 'react';
import { Shield, Zap, Info } from 'lucide-react';
import { Card, Badge } from '../primitives';
import { useI18n } from '../../locales';

export type RulesTabType = 'COUNTER' | 'COMBOS' | 'INSTANT' | 'SPECIAL';

export interface RulesHandbookContentProps {
  activeTab: RulesTabType;
}

export const RulesHandbookContent: React.FC<RulesHandbookContentProps> = ({ activeTab }) => {
  const { t } = useI18n();

  return (
    <>
      {/* TAB 1: COUNTER */}
      {activeTab === 'COUNTER' && (
        <div className="space-y-4">
          <Card variant="surface" className="p-3.5 flex items-start gap-3">
            <Shield className="w-4 h-4 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
            <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
              {t('rules.counterIntro')}
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. LÁ HEO ĐƠN */}
            <Card variant="nested" className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] text-sm">{t('rules.singleTwoTitle')}</span>
                    <span className="text-xs font-mono font-bold flex items-center gap-1">
                      <span className="text-[#cbd5e1]">2♠</span>
                      <span className="text-[#cbd5e1]">2♣</span>
                      <span className="text-[#f87171]">2♦</span>
                      <span className="text-[#f87171]">2♥</span>
                    </span>
                  </div>
                  <Badge variant="neutral" size="sm">{t('rules.singleTwoBadge')}</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] font-medium">{t('rules.canChopLabel')}</span>
                    <ul className="mt-1 space-y-1 text-[var(--text-secondary)]">
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span>
                          <strong>{t('rules.heoBigger')}</strong>: <span className="font-mono font-bold text-[#f87171]">2♥</span> &gt; <span className="font-mono font-bold text-[#f87171]">2♦</span> &gt; <span className="font-mono font-bold text-[#cbd5e1]">2♣</span> &gt; <span className="font-mono font-bold text-[#cbd5e1]">2♠</span>
                        </span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span><strong>{t('rules.threePairsTurn')}</strong> <span className="text-[var(--text-muted)] text-[11px]">{t('rules.threePairsTurnNote')}</span></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span><strong>{t('rules.fourOfAKindTurn')}</strong> <span className="text-[var(--text-muted)] text-[11px]">{t('rules.fourOfAKindTurnNote')}</span></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span><strong>{t('rules.fourPairsFree')}</strong> <span className="text-[var(--color-gold)] text-[11px]">{t('rules.fourPairsFreeNote')}</span></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[var(--border-container)] text-[11px] text-[var(--text-muted)]">
                {t('rules.singleTwoPenalty')}
              </div>
            </Card>

            {/* 2. ĐÔI HEO */}
            <Card variant="nested" className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] text-sm">{t('rules.pairTwoTitle')}</span>
                    <span className="text-xs font-mono font-bold flex items-center gap-1">
                      <span className="text-[#f87171]">2♥</span>
                      <span className="text-[#f87171]">2♦</span>
                    </span>
                  </div>
                  <Badge variant="neutral" size="sm">{t('rules.pairTwoBadge')}</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] font-medium">{t('rules.canChopLabel')}</span>
                    <ul className="mt-1 space-y-1 text-[var(--text-secondary)]">
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span><strong>{t('rules.pairTwoBigger')}</strong> <span className="text-[var(--text-muted)] text-[11px]">{t('rules.pairTwoBiggerNote')}</span></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span><strong>{t('rules.fourOfAKindTurn')}</strong> <span className="text-[var(--text-muted)] text-[11px]">{t('rules.fourOfAKindTurnNote')}</span></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-[var(--color-gold)]">•</span>
                        <span><strong>{t('rules.fourPairsFree')}</strong> <span className="text-[var(--color-gold)] text-[11px]">{t('rules.fourPairsFreeNote')}</span></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[var(--border-container)] text-[11px] text-[var(--color-gold)]">
                {t('rules.pairTwoNote')}
              </div>
            </Card>

            {/* 3. 3 ĐÔI THÔNG */}
            <Card variant="nested" className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] text-sm">{t('rules.threePairsTitle')}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">{t('rules.threePairsSubtitle')}</span>
                  </div>
                  <Badge variant="neutral" size="sm">{t('rules.inTurnBadge')}</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] font-medium">{t('rules.chopLabel')}</span>
                    <p className="mt-0.5 text-[var(--text-secondary)]">{t('rules.threePairsChopDesc')}</p>
                  </div>

                  <div>
                    <span className="text-[var(--text-muted)] font-medium">{t('rules.beatenByLabel')}</span>
                    <p className="mt-0.5 text-[var(--text-secondary)]">{t('rules.threePairsBeatenDesc')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[var(--border-container)] text-[11px] text-[var(--text-muted)]">
                {t('rules.threePairsNote')}
              </div>
            </Card>

            {/* 4. TỨ QUÝ */}
            <Card variant="nested" className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] text-sm">{t('rules.fourOfAKindTitle')}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">{t('rules.fourOfAKindSubtitle')}</span>
                  </div>
                  <Badge variant="neutral" size="sm">{t('rules.strongHandBadge')}</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] font-medium">{t('rules.chopLabel')}</span>
                    <p className="mt-0.5 text-[var(--text-secondary)]">{t('rules.fourOfAKindChopDesc')}</p>
                  </div>

                  <div>
                    <span className="text-[var(--text-muted)] font-medium">{t('rules.beatenByLabel')}</span>
                    <p className="mt-0.5 text-[var(--text-secondary)]">{t('rules.fourOfAKindBeatenDesc')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[var(--border-container)] text-[11px] text-[var(--text-muted)]">
                {t('rules.fourOfAKindNote')}
              </div>
            </Card>

            {/* 5. 4 ĐÔI THÔNG */}
            <Card variant="nested" className="p-4 md:col-span-2 border-[var(--color-gold-border)]">
              <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[var(--color-gold)]" />
                  <span className="font-bold text-[var(--text-primary)] text-sm sm:text-base">
                    {t('rules.fourPairsTitle')}
                  </span>
                </div>
                <Badge variant="gold" size="sm">{t('rules.freeJumpBadge')}</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[var(--text-muted)] font-medium">{t('rules.fourPairsChopAll')}</span>
                  <ul className="mt-1 space-y-0.5 text-[var(--text-secondary)] text-[11px]">
                    <li>• {t('rules.fourPairsItemSingle')}</li>
                    <li>• {t('rules.fourPairsItemPair')}</li>
                    <li>• {t('rules.fourPairsItemThreePairs')}</li>
                    <li>• {t('rules.fourPairsItemFourOfAKind')}</li>
                    <li>• {t('rules.fourPairsItemSmaller')}</li>
                  </ul>
                </div>

                <div className="bg-[var(--bg-input)] p-3 rounded-lg border border-[var(--border-container)] text-[11px] text-[var(--text-secondary)]">
                  <div className="text-[var(--text-primary)] font-semibold mb-1 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[var(--color-gold)]" />
                    <span>{t('rules.skipTurnPrivilege')}</span>
                  </div>
                  <p className="leading-relaxed text-[var(--text-muted)]">
                    {t('rules.skipTurnPrivilegeDesc')}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* QUY TẮC CHẶT CHỒNG */}
          <Card variant="nested" className="p-3.5 text-xs text-[var(--text-secondary)]">
            <div className="font-semibold text-[var(--text-primary)] mb-1">
              {t('rules.stackedChopTitle')}
            </div>
            <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">
              {t('rules.stackedChopDesc')}
            </p>
          </Card>
        </div>
      )}

      {/* TAB 2: COMBOS */}
      {activeTab === 'COMBOS' && (
        <div className="space-y-4">
          <Card variant="nested" className="p-4 space-y-3">
            <h3 className="font-bold text-[var(--text-primary)] text-xs sm:text-sm">{t('rules.rankingOrderTitle')}</h3>
            <div className="space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--text-muted)] font-medium">{t('rules.rankValueLabel')}</span>
                <span className="font-mono text-[var(--text-primary)] bg-[var(--bg-input)] px-2.5 py-1 rounded border border-[var(--border-container)] font-semibold">
                  3 &lt; 4 &lt; 5 &lt; 6 &lt; 7 &lt; 8 &lt; 9 &lt; 10 &lt; J &lt; Q &lt; K &lt; A &lt; <span className="text-[var(--color-gold)] font-bold">{t('rules.rankTwo')}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--text-muted)] font-medium">{t('rules.suitValueLabel')}</span>
                <span className="bg-[var(--bg-input)] px-2.5 py-1 rounded border border-[var(--border-container)] font-semibold flex items-center gap-1.5 font-mono">
                  <span className="text-[#cbd5e1] font-bold">{t('rules.suitSpade')}</span>
                  <span className="text-[var(--text-dim)]">&lt;</span>
                  <span className="text-[#cbd5e1] font-bold">{t('rules.suitClub')}</span>
                  <span className="text-[var(--text-dim)]">&lt;</span>
                  <span className="text-[#f87171] font-bold">{t('rules.suitDiamond')}</span>
                  <span className="text-[var(--text-dim)]">&lt;</span>
                  <span className="text-[#f87171] font-bold">{t('rules.suitHeart')}</span>
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                {t('rules.rankingRuleDesc')}
              </p>
            </div>
          </Card>

          <div className="space-y-2">
            <h3 className="font-bold text-[var(--text-primary)] text-xs sm:text-sm">{t('rules.standardCombosTitle')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Card variant="nested" className="p-3.5">
                <div className="font-semibold text-[var(--text-primary)] mb-1">{t('rules.comboSingle')}</div>
                <div className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                  {t('rules.comboSingleDesc')}
                </div>
              </Card>

              <Card variant="nested" className="p-3.5">
                <div className="font-semibold text-[var(--text-primary)] mb-1">{t('rules.comboPair')}</div>
                <div className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                  {t('rules.comboPairDesc')}
                </div>
              </Card>

              <Card variant="nested" className="p-3.5">
                <div className="font-semibold text-[var(--text-primary)] mb-1">{t('rules.comboTriple')}</div>
                <div className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                  {t('rules.comboTripleDesc')}
                </div>
              </Card>

              <Card variant="nested" className="p-3.5">
                <div className="font-semibold text-[var(--text-primary)] mb-1">{t('rules.comboStraight')}</div>
                <div className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                  {t('rules.comboStraightDesc')}
                  <div className="text-[var(--color-gold)] font-medium mt-1">{t('rules.comboStraightWarning')}</div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INSTANT */}
      {activeTab === 'INSTANT' && (
        <div className="space-y-3">
          <Card variant="surface" className="p-3 text-xs text-[var(--text-secondary)] leading-relaxed">
            {t('rules.instantWinIntro')}
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <Card variant="nested" className="p-3">
              <div className="font-semibold text-[var(--text-primary)] mb-0.5">{t('rules.instantDragonTitle')}</div>
              <div className="text-[var(--text-muted)] text-[11px]">{t('rules.instantDragonDesc')}</div>
            </Card>

            <Card variant="nested" className="p-3">
              <div className="font-semibold text-[var(--text-primary)] mb-0.5">{t('rules.instantFourTwosTitle')}</div>
              <div className="text-[var(--text-muted)] text-[11px] flex items-center gap-1">
                <span>{t('rules.instantFourTwosDesc')}</span>
                <span className="font-mono font-bold text-[#cbd5e1]">2♠</span>
                <span className="font-mono font-bold text-[#cbd5e1]">2♣</span>
                <span className="font-mono font-bold text-[#f87171]">2♦</span>
                <span className="font-mono font-bold text-[#f87171]">2♥</span>
              </div>
            </Card>

            <Card variant="nested" className="p-3">
              <div className="font-semibold text-[var(--text-primary)] mb-0.5">{t('rules.instantFivePairsTitle')}</div>
              <div className="text-[var(--text-muted)] text-[11px]">{t('rules.instantFivePairsDesc')}</div>
            </Card>

            <Card variant="nested" className="p-3">
              <div className="font-semibold text-[var(--text-primary)] mb-0.5">{t('rules.instantSixPairsTitle')}</div>
              <div className="text-[var(--text-muted)] text-[11px]">{t('rules.instantSixPairsDesc')}</div>
            </Card>

            <Card variant="nested" className="p-3">
              <div className="font-semibold text-[var(--text-primary)] mb-0.5">{t('rules.instantSameColorTitle')}</div>
              <div className="text-[var(--text-muted)] text-[11px]">
                {t('rules.instantSameColorDesc')}
              </div>
            </Card>

            <Card variant="nested" className="p-3">
              <div className="font-semibold text-[var(--text-primary)] mb-0.5">{t('rules.instantFourThreesTitle')}</div>
              <div className="text-[var(--text-muted)] text-[11px] flex items-center gap-1">
                <span>{t('rules.instantFourThreesPrefix')}</span>
                <span className="font-mono font-bold text-[#cbd5e1]">3♠</span>
                <span className="font-mono font-bold text-[#cbd5e1]">3♣</span>
                <span className="font-mono font-bold text-[#f87171]">3♦</span>
                <span className="font-mono font-bold text-[#f87171]">3♥</span>
                <span>{t('rules.instantFourThreesSuffix')}</span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: SPECIAL */}
      {activeTab === 'SPECIAL' && (
        <div className="space-y-3">
          <Card variant="nested" className="p-3.5 border-l-2 border-l-[var(--color-gold)]">
            <div className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              {t('rules.specialNoTwoLastTitle')}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              {t('rules.specialNoTwoLastDesc')}
            </p>
          </Card>

          <Card variant="nested" className="p-3.5 border-l-2 border-l-[var(--color-gold)]">
            <div className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              {t('rules.specialAntiFeedTitle')}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              {t('rules.specialAntiFeedDesc')}
            </p>
          </Card>

          <Card variant="nested" className="p-3.5 border-l-2 border-l-[var(--color-gold)]">
            <div className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              {t('rules.specialBurntTitle')}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              {t('rules.specialBurntDesc')}
            </p>
          </Card>

          <Card variant="nested" className="p-3.5 border-l-2 border-l-[#4ade80]">
            <div className="font-semibold text-[var(--text-primary)] text-xs sm:text-sm mb-1">
              {t('rules.specialFinalThreeSpadeTitle')}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              {t('rules.specialFinalThreeSpadeDesc')}
            </p>
          </Card>
        </div>
      )}
    </>
  );
};
