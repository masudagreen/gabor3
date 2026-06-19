/**
 * badgeView.test.ts — v3.0 バッジ一覧の表示モデル（F-09 バッジ部 / sprint-9 screens.md S9-1）。
 */

import {
  buildBadgeRows,
  groupBadgeRowsByAxis,
  earnedCount,
  resolveBadgeNames,
} from '../../../src/lib/v3/badgeView';
import type { BadgeStatus } from '../../../src/state/v3/schema';

describe('buildBadgeRows', () => {
  it('全 11 バッジを定義順（継続→高難度→高レベル）で返す', () => {
    const rows = buildBadgeRows([]);
    expect(rows).toHaveLength(11);
    expect(rows.map((r) => r.id)).toEqual([
      'B-01', 'B-02', 'B-03', 'B-04', 'B-05',
      'B-06', 'B-07', 'B-08',
      'B-09', 'B-10', 'B-11',
    ]);
    expect(rows.map((r) => r.axis).slice(0, 5)).toEqual(
      ['streak', 'streak', 'streak', 'streak', 'streak'],
    );
    expect(rows.slice(5, 8).every((r) => r.axis === 'difficulty')).toBe(true);
    expect(rows.slice(8, 11).every((r) => r.axis === 'level')).toBe(true);
  });

  it('未獲得行はヒントを持ち earnedDate=null', () => {
    const rows = buildBadgeRows([]);
    const b01 = rows.find((r) => r.id === 'B-01')!;
    expect(b01.earned).toBe(false);
    expect(b01.earnedDate).toBeNull();
    // 単位語・文言はロケール追従（テスト環境の既定ロケール=en）。
    expect(b01.hint).toContain('first');
  });

  it('獲得済み行は earnedAt をローカル日付に整形する', () => {
    const statuses: BadgeStatus[] = [
      { badgeId: 'B-01', earned: true, earnedAt: '2026-06-10T03:00:00.000Z' },
    ];
    const rows = buildBadgeRows(statuses);
    const b01 = rows.find((r) => r.id === 'B-01')!;
    expect(b01.earned).toBe(true);
    expect(b01.earnedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('旧 v2 のスコア依存名（好調のしるし/パーフェクト/安定の高得点）は存在しない', () => {
    const names = buildBadgeRows([]).map((r) => r.name);
    expect(names).not.toContain('好調のしるし');
    expect(names).not.toContain('パーフェクト');
    expect(names).not.toContain('安定の高得点');
    expect(names).not.toContain('微差を見抜く目');
    // v3 の高レベル軸の名称が入る（ロケール追従、テスト環境=en）。
    expect(names).toContain('Double-Digit Wall');
    expect(names).toContain('Adept');
    expect(names).toContain('Toward the Summit');
    expect(names).toContain('Eye for Oscillation');
  });
});

describe('groupBadgeRowsByAxis', () => {
  it('3 軸（継続/高難度/高レベル）でグループ化し、各軸の件数が 5/3/3', () => {
    const groups = groupBadgeRowsByAxis(buildBadgeRows([]));
    expect(groups.map((g) => g.axis)).toEqual(['streak', 'difficulty', 'level']);
    expect(groups.map((g) => g.rows.length)).toEqual([5, 3, 3]);
  });
});

describe('earnedCount / resolveBadgeNames', () => {
  it('earnedCount は獲得済み数を数える', () => {
    const statuses: BadgeStatus[] = [
      { badgeId: 'B-01', earned: true, earnedAt: '2026-06-10T00:00:00.000Z' },
      { badgeId: 'B-06', earned: true, earnedAt: '2026-06-10T00:00:00.000Z' },
    ];
    expect(earnedCount(statuses)).toBe(2);
    expect(earnedCount([])).toBe(0);
  });

  it('resolveBadgeNames は ID を名称付きに解決する', () => {
    expect(resolveBadgeNames(['B-06'])).toEqual([
      { id: 'B-06', name: 'Eye for Oscillation' },
    ]);
  });
});
