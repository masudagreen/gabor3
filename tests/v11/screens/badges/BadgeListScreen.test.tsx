/**
 * BadgeListScreen テスト — S19-01 / F-13。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BadgeListScreen } from '../../../../src/screens/v11/badges/BadgeListScreen';
import {
  BadgeStatusV11,
  createInitialBadgeStatusesV11,
  BadgeEvalContextV11,
} from '../../../../src/lib/v11/badges';

const baseCtx: BadgeEvalContextV11 = {
  streak: { currentStreak: 0, longestStreak: 0, lastCompletedDate: null },
  totalTrialCount: 0,
  allDailyStats: [],
  perGamePlayCount: {},
  perGameBestUpdatedCount: {},
  fullCourseCompletions: [],
  today: '2026-04-30',
  now: '2026-04-30T10:00:00.000Z',
};

describe('BadgeListScreen: 表示', () => {
  it('13 バッジカードが表示される', () => {
    const { getByTestId } = render(
      <BadgeListScreen
        statuses={createInitialBadgeStatusesV11()}
        ctx={baseCtx}
        onBack={jest.fn()}
        onPressBadge={jest.fn()}
      />,
    );
    for (let i = 1; i <= 13; i++) {
      const id = `B-${String(i).padStart(2, '0')}`;
      expect(getByTestId(`badge-card-${id}`)).toBeTruthy();
    }
  });

  it('「獲得済み: 0 / 13」の summary を表示', () => {
    const { getByTestId } = render(
      <BadgeListScreen
        statuses={createInitialBadgeStatusesV11()}
        ctx={baseCtx}
        onBack={jest.fn()}
        onPressBadge={jest.fn()}
      />,
    );
    expect(getByTestId('badge-list-summary').props.children.join('')).toContain(
      '0 / 13',
    );
  });

  it('3 件 earned で「獲得済み: 3 / 13」', () => {
    const statuses: BadgeStatusV11[] = createInitialBadgeStatusesV11().map(
      (s, i) =>
        i < 3
          ? { ...s, earned: true, earnedAt: '2026-04-30T10:00:00.000Z' }
          : s,
    );
    const { getByTestId } = render(
      <BadgeListScreen
        statuses={statuses}
        ctx={baseCtx}
        onBack={jest.fn()}
        onPressBadge={jest.fn()}
      />,
    );
    expect(getByTestId('badge-list-summary').props.children.join('')).toContain(
      '3 / 13',
    );
  });

  it('grid は accessibilityRole="list"', () => {
    const { getByTestId } = render(
      <BadgeListScreen
        statuses={createInitialBadgeStatusesV11()}
        ctx={baseCtx}
        onBack={jest.fn()}
        onPressBadge={jest.fn()}
      />,
    );
    expect(getByTestId('badge-list-grid').props.accessibilityRole).toBe('list');
  });

  it('カードは accessibilityRole="button"', () => {
    const { getByTestId } = render(
      <BadgeListScreen
        statuses={createInitialBadgeStatusesV11()}
        ctx={baseCtx}
        onBack={jest.fn()}
        onPressBadge={jest.fn()}
      />,
    );
    expect(getByTestId('badge-card-B-01').props.accessibilityRole).toBe(
      'button',
    );
  });
});

describe('BadgeListScreen: インタラクション', () => {
  it('カードタップで onPressBadge(badgeId) を呼ぶ', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <BadgeListScreen
        statuses={createInitialBadgeStatusesV11()}
        ctx={baseCtx}
        onBack={jest.fn()}
        onPressBadge={onPress}
      />,
    );
    fireEvent.press(getByTestId('badge-card-B-05'));
    expect(onPress).toHaveBeenCalledWith('B-05');
  });

  it('「戻る」で onBack を呼ぶ', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <BadgeListScreen
        statuses={createInitialBadgeStatusesV11()}
        ctx={baseCtx}
        onBack={onBack}
        onPressBadge={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('badge-list-back'));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('BadgeListScreen: a11y label', () => {
  it('未獲得バッジの aria-label に「未獲得」が含まれる', () => {
    const { getByTestId } = render(
      <BadgeListScreen
        statuses={createInitialBadgeStatusesV11()}
        ctx={baseCtx}
        onBack={jest.fn()}
        onPressBadge={jest.fn()}
      />,
    );
    const card = getByTestId('badge-card-B-01');
    expect(card.props.accessibilityLabel).toContain('未獲得');
  });

  it('獲得済みバッジの aria-label に「獲得済み」が含まれる', () => {
    const statuses = createInitialBadgeStatusesV11().map((s) =>
      s.badgeId === 'B-01'
        ? { ...s, earned: true, earnedAt: '2026-04-30T10:00:00.000Z' }
        : s,
    );
    const { getByTestId } = render(
      <BadgeListScreen
        statuses={statuses}
        ctx={baseCtx}
        onBack={jest.fn()}
        onPressBadge={jest.fn()}
      />,
    );
    const card = getByTestId('badge-card-B-01');
    expect(card.props.accessibilityLabel).toContain('獲得済み');
  });
});
