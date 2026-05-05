/**
 * ストリークロジックの単体テスト（src/lib/streak.ts）。
 *
 * カバー範囲：
 *   - applyCourseCompletion：初回 / 連続日 / 同日 2 回目 / 途切れ後の再開
 *   - reconcileStreakOnView：未記録 / 今日完了 / 昨日完了 / 2 日以上前
 *   - 警告：22 時以降「昨日完了で今日未完了」のときのみ true
 *   - longestStreak：max を維持
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  applyCourseCompletion,
  isYesterday,
  reconcileStreakOnView,
} from '../../src/lib/streak';
import { createDefaultStreak, Streak } from '../../src/state/storage';

describe('isYesterday', () => {
  it('連続日付を判定する', () => {
    expect(isYesterday('2026-04-28', '2026-04-29')).toBe(true);
    expect(isYesterday('2026-04-29', '2026-04-29')).toBe(false);
    expect(isYesterday('2026-04-27', '2026-04-29')).toBe(false);
  });

  it('月跨ぎ・年跨ぎで連続日判定が正しい', () => {
    expect(isYesterday('2026-04-30', '2026-05-01')).toBe(true);
    expect(isYesterday('2025-12-31', '2026-01-01')).toBe(true);
  });
});

describe('applyCourseCompletion', () => {
  it('初回完了で currentStreak=1、longestStreak=1', () => {
    const initial = createDefaultStreak();
    const r = applyCourseCompletion(initial, '2026-04-29');
    expect(r.incremented).toBe(true);
    expect(r.streak.currentStreak).toBe(1);
    expect(r.streak.longestStreak).toBe(1);
    expect(r.streak.lastCompletedDate).toBe('2026-04-29');
  });

  it('連続日（昨日完了→今日完了）で currentStreak が +1 される', () => {
    const yesterday: Streak = {
      currentStreak: 6,
      longestStreak: 6,
      lastCompletedDate: '2026-04-28',
    };
    const r = applyCourseCompletion(yesterday, '2026-04-29');
    expect(r.incremented).toBe(true);
    expect(r.streak.currentStreak).toBe(7);
    expect(r.streak.longestStreak).toBe(7);
  });

  it('同日 2 回目以降は加算しない（spec §9.3）', () => {
    const today: Streak = {
      currentStreak: 5,
      longestStreak: 5,
      lastCompletedDate: '2026-04-29',
    };
    const r = applyCourseCompletion(today, '2026-04-29');
    expect(r.incremented).toBe(false);
    expect(r.streak.currentStreak).toBe(5);
    expect(r.streak.lastCompletedDate).toBe('2026-04-29');
  });

  it('連続途切れ（2 日以上前）後の完了は currentStreak=1 でリスタート、longestStreak は維持', () => {
    const stale: Streak = {
      currentStreak: 0,
      longestStreak: 12,
      lastCompletedDate: '2026-04-20',
    };
    const r = applyCourseCompletion(stale, '2026-04-29');
    expect(r.streak.currentStreak).toBe(1);
    expect(r.streak.longestStreak).toBe(12);
    expect(r.streak.lastCompletedDate).toBe('2026-04-29');
  });
});

describe('reconcileStreakOnView', () => {
  it('未記録（lastCompletedDate=null）：何もしない', () => {
    const initial = createDefaultStreak();
    const r = reconcileStreakOnView(initial, new Date(2026, 3, 29, 23, 0));
    expect(r.streak).toBe(initial); // 同一参照
    expect(r.resetWarning).toBe(false);
  });

  it('今日完了済みなら維持、警告なし（22 時超でも）', () => {
    const today: Streak = {
      currentStreak: 5,
      longestStreak: 5,
      lastCompletedDate: '2026-04-29',
    };
    const r = reconcileStreakOnView(today, new Date(2026, 3, 29, 23, 30));
    expect(r.streak.currentStreak).toBe(5);
    expect(r.resetWarning).toBe(false);
  });

  it('昨日完了で今日未完了：21 時台は警告なし', () => {
    const yesterday: Streak = {
      currentStreak: 7,
      longestStreak: 7,
      lastCompletedDate: '2026-04-28',
    };
    const r = reconcileStreakOnView(yesterday, new Date(2026, 3, 29, 21, 59));
    expect(r.streak.currentStreak).toBe(7);
    expect(r.resetWarning).toBe(false);
  });

  it('昨日完了で今日未完了：22 時以降は警告 true', () => {
    const yesterday: Streak = {
      currentStreak: 7,
      longestStreak: 7,
      lastCompletedDate: '2026-04-28',
    };
    const r = reconcileStreakOnView(yesterday, new Date(2026, 3, 29, 22, 0));
    expect(r.streak.currentStreak).toBe(7);
    expect(r.resetWarning).toBe(true);
  });

  it('2 日以上前完了：currentStreak=0 にリセット、longestStreak は維持', () => {
    const stale: Streak = {
      currentStreak: 7,
      longestStreak: 12,
      lastCompletedDate: '2026-04-20',
    };
    const r = reconcileStreakOnView(stale, new Date(2026, 3, 29, 9, 0));
    expect(r.streak.currentStreak).toBe(0);
    expect(r.streak.longestStreak).toBe(12);
    expect(r.streak.lastCompletedDate).toBeNull();
    expect(r.resetWarning).toBe(false);
  });
});
