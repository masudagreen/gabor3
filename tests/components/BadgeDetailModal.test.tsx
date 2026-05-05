/**
 * BadgeDetailModal の表示テスト（screens.md S6-02 / S6-03）。
 *
 * - 獲得済みバッジ：「獲得日」+ 説明
 * - 未獲得バッジ：「獲得条件」+ ヒント
 * - B-08：3 ゲーム中 N ゲーム改善中の文言（screens.md §10 #11）
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { render } from '@testing-library/react-native';
import { BadgeDetailModal } from '../../src/components/BadgeDetailModal';
import {
  BadgeStatus,
  createDefaultStreak,
  DailyStats,
} from '../../src/state/storage';

const TODAY = new Date(2026, 3, 29);

const sampleDay = (
  date: string,
  patch: Partial<DailyStats> = {},
): DailyStats => ({
  date,
  courseCompleted: false,
  game1BestThreshold: null,
  game2BestThreshold: null,
  game3BestThreshold: null,
  v1Score: null,
  sessionCount: 0,
  ...patch,
});

describe('BadgeDetailModal', () => {
  it('獲得済み：説明と獲得日が表示される', () => {
    const status: BadgeStatus = {
      badgeId: 'B-01',
      earned: true,
      earnedAt: '2026-04-28T12:00:00.000Z',
    };
    const { getByText, queryByTestId } = render(
      <BadgeDetailModal
        visible
        status={status}
        streak={createDefaultStreak()}
        totalTrialCount={0}
        allDailyStats={[]}
        today={TODAY}
        onClose={jest.fn()}
      />,
    );
    expect(getByText(/初めてのおまかせコースを完了しました/)).toBeTruthy();
    expect(queryByTestId('badge-earned-date')).toBeTruthy();
    expect(getByText(/4 月 28 日/)).toBeTruthy();
  });

  it('未獲得 B-03：「あと N 日」のヒントが表示される', () => {
    const status: BadgeStatus = {
      badgeId: 'B-03',
      earned: false,
      earnedAt: null,
    };
    const { getByTestId } = render(
      <BadgeDetailModal
        visible
        status={status}
        streak={{
          currentStreak: 3,
          longestStreak: 3,
          lastCompletedDate: '2026-04-29',
        }}
        totalTrialCount={0}
        allDailyStats={[]}
        today={TODAY}
        onClose={jest.fn()}
      />,
    );
    const hint = getByTestId('badge-detail-hint');
    expect(hint.props.children).toBe('あと 4 日');
  });

  it('未獲得 B-08：3 ゲーム中 N ゲーム改善中の文言とゲーム別状態を表示', () => {
    const stats: DailyStats[] = [
      sampleDay('2026-04-16', {
        game1BestThreshold: 6,
        game2BestThreshold: 6,
        game3BestThreshold: 25,
      }),
      sampleDay('2026-04-17', {
        game1BestThreshold: 6,
        game2BestThreshold: 6,
        game3BestThreshold: 25,
      }),
      sampleDay('2026-04-28', {
        game1BestThreshold: 4, // 改善
        game2BestThreshold: 7, // 悪化
        game3BestThreshold: 15, // 改善
      }),
      sampleDay('2026-04-29', {
        game1BestThreshold: 4,
        game2BestThreshold: 7,
        game3BestThreshold: 15,
      }),
    ];
    const status: BadgeStatus = {
      badgeId: 'B-08',
      earned: false,
      earnedAt: null,
    };
    const { getByTestId, getByText } = render(
      <BadgeDetailModal
        visible
        status={status}
        streak={createDefaultStreak()}
        totalTrialCount={0}
        allDailyStats={stats}
        today={TODAY}
        onClose={jest.fn()}
      />,
    );
    const hint = getByTestId('badge-detail-hint');
    expect(hint.props.children).toBe('3 ゲーム中 2 ゲームが先週比で改善中');
    // ゲーム別状態ブロックも描画される
    expect(getByTestId('badge-detail-b08-status')).toBeTruthy();
    expect(getByText('Game 1（変化察知）')).toBeTruthy();
    expect(getByText('Game 2（二重表裏）')).toBeTruthy();
    expect(getByText('Game 3（周辺視野）')).toBeTruthy();
  });

  it('B-08 データ不足時：「データがもう少し必要です」', () => {
    const status: BadgeStatus = {
      badgeId: 'B-08',
      earned: false,
      earnedAt: null,
    };
    const { getByTestId } = render(
      <BadgeDetailModal
        visible
        status={status}
        streak={createDefaultStreak()}
        totalTrialCount={0}
        allDailyStats={[]}
        today={TODAY}
        onClose={jest.fn()}
      />,
    );
    const hint = getByTestId('badge-detail-hint');
    expect(hint.props.children).toContain('データがもう少し必要です');
  });
});
