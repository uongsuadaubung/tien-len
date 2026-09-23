import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SavedSettingsSchema } from '../../src/engine/schemas/settings.schema';
import { useSettingsStore, resetSettingsStore } from '../../src/stores/useSettingsStore';
import { getLocalSaveData } from '../../src/engine/sync/sync-service';
import { vi } from '../../src/locales/vi';
import { en } from '../../src/locales/en';
import { PlayerHandView } from '../../src/ui/components/PlayerHandView';
import { MatchPlayer } from '../../src/engine/types';
import { createPlayer } from '../../src/engine/player-factory';
import { createCard } from '../../src/engine/card';

describe('Kiểm Thử Tính Năng Đảo Ngược Nút Bấm (Reverse Button Layout Tests)', () => {
  beforeEach(() => {
    resetSettingsStore();
  });

  afterEach(() => {
    resetSettingsStore();
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
        firstMoveRequiredCard={null}
        sortMode="NATURAL"
        variantIndex={0}
        cardSize="md"
        reverseButtons={false}
        quickResponseAssistEnabled={true}
        dealBanner={null}
        openingReason={null}
        chopNotification={null}
        reconnectNotice={null}
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
        firstMoveRequiredCard={null}
        sortMode="NATURAL"
        variantIndex={0}
        cardSize="md"
        reverseButtons={true}
        quickResponseAssistEnabled={true}
        dealBanner={null}
        openingReason={null}
        chopNotification={null}
        reconnectNotice={null}
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
        firstMoveRequiredCard={null}
        sortMode="NATURAL"
        variantIndex={0}
        cardSize="md"
        reverseButtons={storeState.reverseButtonsEnabled}
        quickResponseAssistEnabled={true}
        dealBanner={null}
        openingReason={null}
        chopNotification={null}
        reconnectNotice={null}
      />
    );
    expect(htmlFromStoreReversed).toContain('flex-row-reverse');
  });

  it('6. PlayerHandView: Ẩn/Hiện nút Bắt Bài chuẩn theo cài đặt quickResponseAssistEnabled', () => {
    const mockPlayer: MatchPlayer = {
      id: 'p1',
      name: 'Test Player',
      cardCount: 13,
      hand: [],
      playedCards: [],
      score: 10000,
      avatar: '🤠',
      isBot: false,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    };

    // Khi quickResponseAssistEnabled = false: Nút Bắt Bài KHÔNG được hiển thị
    const htmlDisabled = renderToString(
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
        firstMoveRequiredCard={null}
        sortMode="NATURAL"
        variantIndex={0}
        cardSize="md"
        reverseButtons={false}
        quickResponseAssistEnabled={false}
        dealBanner={null}
        openingReason={null}
        chopNotification={null}
        reconnectNotice={null}
      />
    );

    // Khi quickResponseAssistEnabled = true: Nút Bắt Bài CÓ hiển thị
    const htmlEnabled = renderToString(
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
        firstMoveRequiredCard={null}
        sortMode="NATURAL"
        variantIndex={0}
        cardSize="md"
        reverseButtons={false}
        quickResponseAssistEnabled={true}
        dealBanner={null}
        openingReason={null}
        chopNotification={null}
        reconnectNotice={null}
      />
    );

    expect(htmlDisabled).not.toContain('Bắt Bài');
    expect(htmlEnabled).toContain('Bắt Bài');
  });

  it('7. PlayerHandView: Banner mở màn biến mất hoàn toàn khi dealBanner = null ngay cả khi openingReason = THREE_SPADES', () => {
    const mockPlayer = {
      id: 'p0',
      name: 'Người Chơi',
      hand: [createCard(3, 'SPADES'), createCard(4, 'HEARTS')],
      cardCount: 2,
      playedCards: [],
      score: 10000,
      avatar: '🤠',
      isBot: false as const,
      isPassedCurrentRound: false,
      hasPlayedFirstCard: false
    };

    // Khi dealBanner có giá trị: Banner hiển thị
    const htmlWithBanner = renderToString(
      <PlayerHandView
        player={mockPlayer}
        selectedCardIds={new Set()}
        onToggleCardSelect={() => {}}
        onClearCardSelection={() => {}}
        onPlaySelectedCards={() => {}}
        onPassTurn={() => {}}
        onAutoSort={() => {}}
        onQuickSelect={() => {}}
        canQuickSelect={false}
        quickSelectCandidatesCount={0}
        isCurrentTurn={true}
        canPlay={false}
        canPass={false}
        isLeader={false}
        isDealing={false}
        dealtCardsCount={0}
        isFirstMoveOfGame={true}
        firstMoveRequiredCard={null}
        sortMode="NATURAL"
        variantIndex={0}
        cardSize="md"
        reverseButtons={false}
        quickResponseAssistEnabled={true}
        dealBanner="Đối thủ giành quyền mở màn (Có 3♠ Bích)!"
        openingReason="THREE_SPADES"
        chopNotification={null}
        reconnectNotice={null}
      />
    );
    expect(htmlWithBanner).toContain('giành quyền mở màn');
    expect(htmlWithBanner).toContain('👑');

    // Khi dealBanner = null (sau 2.5s hoặc khi đã đánh bài): Banner biến mất hoàn toàn
    const htmlWithoutBanner = renderToString(
      <PlayerHandView
        player={mockPlayer}
        selectedCardIds={new Set()}
        onToggleCardSelect={() => {}}
        onClearCardSelection={() => {}}
        onPlaySelectedCards={() => {}}
        onPassTurn={() => {}}
        onAutoSort={() => {}}
        onQuickSelect={() => {}}
        canQuickSelect={false}
        quickSelectCandidatesCount={0}
        isCurrentTurn={true}
        canPlay={false}
        canPass={false}
        isLeader={false}
        isDealing={false}
        dealtCardsCount={0}
        isFirstMoveOfGame={true}
        firstMoveRequiredCard={null}
        sortMode="NATURAL"
        variantIndex={0}
        cardSize="md"
        reverseButtons={false}
        quickResponseAssistEnabled={true}
        dealBanner={null}
        openingReason="THREE_SPADES"
        chopNotification={null}
        reconnectNotice={null}
      />
    );
    expect(htmlWithoutBanner).not.toContain('giành quyền mở màn');
    expect(htmlWithoutBanner).not.toContain('👑');
  });
});
