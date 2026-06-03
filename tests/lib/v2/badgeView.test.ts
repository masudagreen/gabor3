/**
 * badgeView.test.ts — バッジ一覧表示モデルの単体テスト（F-09 / screens.md S8-1）。
 */

import {
  buildBadgeRows,
  earnedCount,
  resolveBadgeNames,
} from '../../../src/lib/v2/badgeView';
import { defaultBadgeStatus, BADGE_IDS, type BadgeStatus } from '../../../src/state/schema';

function allUnearned(): BadgeStatus[] {
  return BADGE_IDS.map((id) => defaultBadgeStatus(id));
}

describe('buildBadgeRows', () => {
  it('全 11 バッジを定義順で返す', () => {
    const rows = buildBadgeRows(allUnearned(), 0);
    expect(rows).toHaveLength(11);
    expect(rows.map((r) => r.id)).toEqual(BADGE_IDS);
  });

  it('未獲得行はヒントを持ち、獲得日は null', () => {
    const rows = buildBadgeRows(allUnearned(), 0);
    const b03 = rows.find((r) => r.id === 'B-03')!;
    expect(b03.earned).toBe(false);
    expect(b03.earnedDate).toBeNull();
    expect(b03.hint).toContain('7 日連続');
  });

  it('獲得行は earnedDate をローカル日付に整形する', () => {
    const statuses = allUnearned().map((s) =>
      s.badgeId === 'B-01'
        ? { ...s, earned: true, earnedAt: '2026-05-24T08:30:00.000Z' }
        : s,
    );
    const rows = buildBadgeRows(statuses, 0);
    const b01 = rows.find((r) => r.id === 'B-01')!;
    expect(b01.earned).toBe(true);
    // ローカル日付フォーマット（YYYY-MM-DD）
    expect(b01.earnedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('B-11 のヒントは残り回数を展開する（累計 3 回 → あと 2 回）', () => {
    const rows = buildBadgeRows(allUnearned(), 3);
    const b11 = rows.find((r) => r.id === 'B-11')!;
    expect(b11.hint).toContain('あと 2 回');
    expect(b11.hint).not.toContain('{{remaining}}');
  });

  it('B-11 累計 0 回ならあと 5 回', () => {
    const rows = buildBadgeRows(allUnearned(), 0);
    const b11 = rows.find((r) => r.id === 'B-11')!;
    expect(b11.hint).toContain('あと 5 回');
  });

  it('欠けたステータスは未獲得として扱う', () => {
    const rows = buildBadgeRows([], 0);
    expect(rows).toHaveLength(11);
    expect(rows.every((r) => !r.earned)).toBe(true);
  });
});

describe('earnedCount', () => {
  it('獲得済み数を数える', () => {
    const statuses = allUnearned().map((s) =>
      s.badgeId === 'B-01' || s.badgeId === 'B-09'
        ? { ...s, earned: true, earnedAt: 'x' }
        : s,
    );
    expect(earnedCount(statuses)).toBe(2);
  });

  it('全未獲得は 0', () => {
    expect(earnedCount(allUnearned())).toBe(0);
  });
});

describe('resolveBadgeNames', () => {
  it('ID を名称付きに解決する', () => {
    expect(resolveBadgeNames(['B-01', 'B-10'])).toEqual([
      { id: 'B-01', name: 'はじめの一歩' },
      { id: 'B-10', name: 'パーフェクト' },
    ]);
  });
});
