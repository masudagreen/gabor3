/**
 * streak v1.1 — F-12 ストリークと日次ベスト テスト。
 */
import {
  applyCourseCompletionV11,
  formatDateLocalV11,
  isYesterdayV11,
  reconcileStreakOnViewV11,
} from '../../../src/lib/v11/streak';
import { StreakV11 } from '../../../src/state/storage-v11';

function mkStreak(p: Partial<StreakV11> = {}): StreakV11 {
  return {
    currentStreak: p.currentStreak ?? 0,
    longestStreak: p.longestStreak ?? 0,
    lastCompletedDate: p.lastCompletedDate ?? null,
  };
}

describe('streak v1.1: formatDateLocalV11', () => {
  it('YYYY-MM-DD を返す', () => {
    expect(formatDateLocalV11(new Date(2026, 3, 30))).toBe('2026-04-30');
  });

  it('1 月 1 日もパディング', () => {
    expect(formatDateLocalV11(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});

describe('streak v1.1: isYesterdayV11', () => {
  it('前日関係', () => {
    expect(isYesterdayV11('2026-04-29', '2026-04-30')).toBe(true);
  });
  it('月跨ぎ', () => {
    expect(isYesterdayV11('2026-03-31', '2026-04-01')).toBe(true);
  });
  it('年跨ぎ', () => {
    expect(isYesterdayV11('2025-12-31', '2026-01-01')).toBe(true);
  });
  it('2 日以上前は false', () => {
    expect(isYesterdayV11('2026-04-28', '2026-04-30')).toBe(false);
  });
  it('同日は false', () => {
    expect(isYesterdayV11('2026-04-30', '2026-04-30')).toBe(false);
  });
});

describe('streak v1.1: applyCourseCompletionV11', () => {
  it('初回完了：currentStreak=1、longestStreak=1', () => {
    const r = applyCourseCompletionV11(mkStreak(), '2026-04-30');
    expect(r.streak.currentStreak).toBe(1);
    expect(r.streak.longestStreak).toBe(1);
    expect(r.streak.lastCompletedDate).toBe('2026-04-30');
    expect(r.incremented).toBe(true);
  });

  it('連続継続：前日完了 → +1', () => {
    const r = applyCourseCompletionV11(
      mkStreak({
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: '2026-04-29',
      }),
      '2026-04-30',
    );
    expect(r.streak.currentStreak).toBe(6);
    expect(r.streak.longestStreak).toBe(6);
    expect(r.incremented).toBe(true);
  });

  it('同日 2 回目：加算しない', () => {
    const r = applyCourseCompletionV11(
      mkStreak({
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: '2026-04-30',
      }),
      '2026-04-30',
    );
    expect(r.streak.currentStreak).toBe(5);
    expect(r.streak.longestStreak).toBe(5);
    expect(r.incremented).toBe(false);
  });

  it('連続途切れ：2 日以上前 → currentStreak=1', () => {
    const r = applyCourseCompletionV11(
      mkStreak({
        currentStreak: 7,
        longestStreak: 7,
        lastCompletedDate: '2026-04-25',
      }),
      '2026-04-30',
    );
    expect(r.streak.currentStreak).toBe(1);
    expect(r.streak.longestStreak).toBe(7); // 過去最長は維持
    expect(r.incremented).toBe(true);
  });

  it('longestStreak は max を維持（既存の方が長ければ）', () => {
    const r = applyCourseCompletionV11(
      mkStreak({
        currentStreak: 2,
        longestStreak: 30,
        lastCompletedDate: '2026-04-29',
      }),
      '2026-04-30',
    );
    expect(r.streak.currentStreak).toBe(3);
    expect(r.streak.longestStreak).toBe(30);
  });
});

describe('streak v1.1: reconcileStreakOnViewV11', () => {
  it('lastCompletedDate=null：何もしない、警告なし', () => {
    const r = reconcileStreakOnViewV11(mkStreak(), new Date(2026, 3, 30, 12));
    expect(r.streak.currentStreak).toBe(0);
    expect(r.resetWarning).toBe(false);
  });

  it('今日完了済み：警告なし', () => {
    const r = reconcileStreakOnViewV11(
      mkStreak({
        currentStreak: 3,
        longestStreak: 3,
        lastCompletedDate: '2026-04-30',
      }),
      new Date(2026, 3, 30, 23),
    );
    expect(r.streak.currentStreak).toBe(3);
    expect(r.resetWarning).toBe(false);
  });

  it('昨日完了で今日未完了、22 時前：継続中、警告なし', () => {
    const r = reconcileStreakOnViewV11(
      mkStreak({
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: '2026-04-29',
      }),
      new Date(2026, 3, 30, 21, 0),
    );
    expect(r.streak.currentStreak).toBe(5); // 維持
    expect(r.resetWarning).toBe(false);
  });

  it('昨日完了で今日未完了、22 時以降：継続中、警告 true', () => {
    const r = reconcileStreakOnViewV11(
      mkStreak({
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: '2026-04-29',
      }),
      new Date(2026, 3, 30, 22, 0),
    );
    expect(r.streak.currentStreak).toBe(5);
    expect(r.resetWarning).toBe(true);
  });

  it('昨日完了で今日未完了、23 時 30 分：警告 true', () => {
    const r = reconcileStreakOnViewV11(
      mkStreak({
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: '2026-04-29',
      }),
      new Date(2026, 3, 30, 23, 30),
    );
    expect(r.resetWarning).toBe(true);
  });

  it('2 日以上前：currentStreak=0 にリセット、longestStreak は維持', () => {
    const r = reconcileStreakOnViewV11(
      mkStreak({
        currentStreak: 10,
        longestStreak: 30,
        lastCompletedDate: '2026-04-25',
      }),
      new Date(2026, 3, 30, 8, 0),
    );
    expect(r.streak.currentStreak).toBe(0);
    expect(r.streak.longestStreak).toBe(30);
    expect(r.streak.lastCompletedDate).toBeNull();
    expect(r.resetWarning).toBe(false);
  });

  it('0:00 跨ぎ：前日 23:59 完了 → 今日 0:00 直後はまだ「昨日完了」継続中', () => {
    const r = reconcileStreakOnViewV11(
      mkStreak({
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: '2026-04-29',
      }),
      new Date(2026, 3, 30, 0, 0, 1),
    );
    expect(r.streak.currentStreak).toBe(5);
    expect(r.resetWarning).toBe(false);
  });

  it('0:00 跨ぎ：2 日跨ぎ（前々日完了）→ リセット', () => {
    const r = reconcileStreakOnViewV11(
      mkStreak({
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: '2026-04-28',
      }),
      new Date(2026, 3, 30, 0, 0, 1),
    );
    expect(r.streak.currentStreak).toBe(0);
  });
});
