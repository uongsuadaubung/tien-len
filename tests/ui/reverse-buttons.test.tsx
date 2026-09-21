import { describe, expect, it, beforeEach } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SavedSettingsSchema } from '../../src/engine/schemas/settings.schema';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { getLocalSaveData } from '../../src/engine/sync/sync-service';
import { vi } from '../../src/locales/vi';
import { en } from '../../src/locales/en';
import { PlayerHandView } from '../../src/ui/components/PlayerHandView';
import { MatchPlayer } from '../../src/engine/types';
import { createPlayer } from '../../src/engine/player-factory';
import { createCard } from '../../src/engine/card';

describe('Kiểm Thử Tính Năng Đảo Ngược Nút Bấm (Reverse Button Layout Tests)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ reverseButtonsEnabled: false });
  });

  it('1. SavedSettingsSchema: Giá trị mặc định phải là false và parse hợp lệ', () => {
    const defaultParsed = SavedSettingsSchema.parse({});
    expect(defaultParsed.reverseButtonsEnabled).toBe(false);

    const customTrue = SavedSettingsSchema.parse({ reverseButtonsEnabled: true });
    expect(customTrue.reverseButtonsEnabled).toBe(true);

    const customFalse = SavedSettingsSchema.parse({ reverseButtonsEnabled: false });
    expect(customFalse.reverseButtonsEnabled).toBe(false);
  });

  it('2. useSettingsStore: Quản lý trạng thái toggle, setter và hydrate', () => {
    expect(useSettingsStore.getState().reverseButtonsEnabled).toBe(false);

    useSettingsStore.getState().toggleReverseButtons();
    expect(useSettingsStore.getState().reverseButtonsEnabled).toBe(true);

    useSettingsStore.getState().toggleReverseButtons();
    expect(useSettingsStore.getState().reverseButtonsEnabled).toBe(false);

    useSettingsStore.getState().setReverseButtonsEnabled(true);
    expect(useSettingsStore.getState().reverseButtonsEnabled).toBe(true);

    useSettingsStore.getState().hydrateSettings({ reverseButtonsEnabled: false });
    expect(useSettingsStore.getState().reverseButtonsEnabled).toBe(false);
  });

  it('3. Đa ngôn ngữ (Locales): Chứa đầy đủ bản dịch vi và en cho setting Đảo Ngược Nút Bấm', () => {
    expect(vi.settings.reverseButtonsTitle).toBe('Đảo Ngược Nút Bấm');
    expect(vi.settings.reverseButtonsDesc).toContain('Đảo ngược thứ tự toàn bộ nút bấm');

    expect(en.settings.reverseButtonsTitle).toBe('Reverse Button Layout');
    expect(en.settings.reverseButtonsDesc).toContain('Reverse the order of all');
  });

  it('4. getLocalSaveData: Bao gồm thuộc tính reverseButtonsEnabled trong bản sao lưu', async () => {
    useSettingsStore.getState().setReverseButtonsEnabled(true);
    const data = await getLocalSaveData();
    expect(data.settings.reverseButtonsEnabled).toBe(true);

    useSettingsStore.getState().setReverseButtonsEnabled(false);
    const data2 = await getLocalSaveData();
    expect(data2.settings.reverseButtonsEnabled).toBe(false);
  });

  it('5. PlayerHandView: Render flex-row khi tắt đảo nút và flex-row-reverse khi bật đảo nút', () => {
    const mockPlayer: MatchPlayer = {
      id: 'p0',
      name: 'Người Chơi',
      hand: [createCard(3, 'SPADES'), createCard(4, 'HEARTS')],
      cardCount: 2,
      playedCards: [],
      score: 10000,
      avatar: '🤠',
      isBot: false,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    };

    // Khi reverseButtons = false (Mặc định):
    const htmlNormal = renderToString(
      <PlayerHandView
        player={mockPlayer}
        selectedCardIds={new Set()}
        onToggleCardSelect={() => {}}
        onClearCardSelection={() => {}}
        onPlaySelectedCards={() => {}}
        onPassTurn={() => {}}
        onAutoSort={() => {}}
        onQuickSelect={() => {}}
        canQuickSelect={true}
        quickSelectCandidatesCount={1}
        isCurrentTurn={true}
        canPlay={true}
        canPass={true}
        isLeader={false}
        isDealing={false}
        dealtCardsCount={0}
        isFirstMoveOfGame={false}
        sortMode="NATURAL"
        variantIndex={0}
        cardSize="md"
        reverseButtons={false}
      />
    );

    // Khi reverseButtons = true:
    const htmlReversed = renderToString(
      <PlayerHandView
        player={mockPlayer}
        selectedCardIds={new Set()}
        onToggleCardSelect={() => {}}
        onClearCardSelection={() => {}}
        onPlaySelectedCards={() => {}}
        onPassTurn={() => {}}
        onAutoSort={() => {}}
        onQuickSelect={() => {}}
        canQuickSelect={true}
        quickSelectCandidatesCount={1}
        isCurrentTurn={true}
        canPlay={true}
        canPass={true}
        isLeader={false}
        isDealing={false}
        dealtCardsCount={0}
        isFirstMoveOfGame={false}
        sortMode="NATURAL"
        variantIndex={0}
        cardSize="md"
        reverseButtons={true}
      />
    );

    // Kiểm tra class direction
    expect(htmlNormal).toContain('flex-row');
    expect(htmlNormal).not.toContain('flex-row-reverse');

    expect(htmlReversed).toContain('flex-row-reverse');

    // Kiểm tra khi đọc từ useSettingsStore và truyền vào props
    useSettingsStore.getState().setReverseButtonsEnabled(true);
    const storeState = useSettingsStore.getState();
    const htmlFromStoreReversed = renderToString(
      <PlayerHandView
        player={mockPlayer}
        selectedCardIds={new Set()}
        onToggleCardSelect={() => {}}
        onClearCardSelection={() => {}}
        onPlaySelectedCards={() => {}}
        onPassTurn={() => {}}
        onAutoSort={() => {}}
        onQuickSelect={() => {}}
        canQuickSelect={true}
        quickSelectCandidatesCount={1}
        isCurrentTurn={true}
        canPlay={true}
        canPass={true}
        isLeader={false}
        isDealing={false}
        dealtCardsCount={0}
        isFirstMoveOfGame={false}
        sortMode="NATURAL"
        variantIndex={0}
        cardSize="md"
        reverseButtons={storeState.reverseButtonsEnabled}
      />
    );
    expect(htmlFromStoreReversed).toContain('flex-row-reverse');
  });
});
