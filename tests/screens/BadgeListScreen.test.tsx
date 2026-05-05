/**
 * BadgeListScreen の表示テスト（screens.md S6-01）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { BadgeListScreen } from '../../src/screens/BadgeListScreen';
import {
  clearAllStorage,
  saveBadgeStatuses,
  saveStreak,
} from '../../src/state/storage';

describe('BadgeListScreen', () => {
  beforeEach(async () => {
    await clearAllStorage();
  });

  it('未獲得時は「獲得 0 / 8」を表示し、8 個のバッジカードを描画', async () => {
    const api = render(<BadgeListScreen onBack={jest.fn()} />);
    await waitFor(() => {
      const summary = api.getByTestId('badges-summary');
      expect(summary.props.children).toEqual(['獲得 ', 0, ' / ', 8]);
    });
    for (const id of [
      'B-01',
      'B-02',
      'B-03',
      'B-04',
      'B-05',
      'B-06',
      'B-07',
      'B-08',
    ]) {
      expect(api.queryByTestId(`badge-card-${id}`)).toBeTruthy();
    }
  });

  it('獲得済みバッジは earned 状態で描画される', async () => {
    await saveBadgeStatuses([
      {
        badgeId: 'B-01',
        earned: true,
        earnedAt: '2026-04-29T12:00:00.000Z',
      },
      { badgeId: 'B-02', earned: false, earnedAt: null },
      { badgeId: 'B-03', earned: false, earnedAt: null },
      { badgeId: 'B-04', earned: false, earnedAt: null },
      { badgeId: 'B-05', earned: false, earnedAt: null },
      { badgeId: 'B-06', earned: false, earnedAt: null },
      { badgeId: 'B-07', earned: false, earnedAt: null },
      { badgeId: 'B-08', earned: false, earnedAt: null },
    ]);
    await saveStreak({
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedDate: '2026-04-29',
    });

    const api = render(<BadgeListScreen onBack={jest.fn()} />);
    await waitFor(() => {
      const summary = api.getByTestId('badges-summary');
      expect(summary.props.children).toEqual(['獲得 ', 1, ' / ', 8]);
    });
    const b01 = api.getByTestId('badge-card-B-01');
    expect(b01.props.accessibilityLabel).toContain('獲得済');
  });
});
