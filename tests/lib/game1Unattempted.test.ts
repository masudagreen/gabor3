/**
 * Game 1：未挑戦時の staircase 挙動（spec.md §7.1 / screens.md S2-03 §4）。
 *
 * 「タップ無しで 60 秒経過 → 自動採点 → 未挑戦記録 → staircase up（易方向）」
 * を純関数レイヤで合成して検証する。
 *
 * 仕様改訂（強制 60 秒視聴）：
 *   - 完了ボタンが廃止されたため、Game1Screen からは isUnattempted の
 *     completedByButton 引数は常に false で呼ばれる。
 *   - 純関数 API は維持しているので「completedByButton=true」のケースは
 *     回帰テストとして残す（API 変更時の安全網）。
 */

import { gradeGame1, isUnattempted, buildGame1Trial } from '../../src/lib/game1';
import {
  applyTrialResult,
  createStaircase,
} from '../../src/lib/staircase';

const FIXED_NOW = () => '2026-04-29T00:00:00.000Z';

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('game1: 未挑戦時の staircase 挙動', () => {
  it('タップ 0 件 + 完了ボタン無し → noResponse 扱い → staircase は up（param 増加）', () => {
    const initial = createStaircase('game1', undefined, FIXED_NOW);
    expect(initial.currentParam).toBe(5);

    // 試行を生成（実際のゲーム画面と同じ手順）
    const trial = buildGame1Trial(initial.currentParam, mulberry32(123));

    // タップ無し、完了ボタン無し
    const selectedIds: string[] = [];
    const completedByButton = false;

    expect(isUnattempted(selectedIds, completedByButton)).toBe(true);

    // 未挑戦時は採点せず、outcome='noResponse' で staircase 適用
    const updated = applyTrialResult(initial, 'noResponse', undefined, FIXED_NOW);
    expect(updated.currentParam).toBe(6); // 5 + 1（game1 の step=1）
    expect(updated.lastDirection).toBe('up');

    // trial 自体は採点しない（grading は null とする実装）
    void trial;
  });

  // 仕様改訂後はこの経路は Game1Screen からはトリガーされない
  // （完了ボタン廃止）。純関数 API の回帰テストとして残す。
  it('（純関数のみ）タップせず completedByButton=true → 採点に入り全 missed/score=0 → incorrect 扱いで up', () => {
    const initial = createStaircase('game1', undefined, FIXED_NOW);
    const trial = buildGame1Trial(initial.currentParam, mulberry32(7));

    // 完了ボタン押下、タップ無し
    const selectedIds: string[] = [];
    const completedByButton = true;

    expect(isUnattempted(selectedIds, completedByButton)).toBe(false);

    const grading = gradeGame1(trial, selectedIds);
    expect(grading.score).toBe(0);
    expect(grading.correctIds).toHaveLength(0);
    expect(grading.missedIds.length).toBeGreaterThan(0);
    expect(grading.isCorrectForStaircase).toBe(false);

    // staircase は incorrect → up
    const updated = applyTrialResult(initial, 'incorrect', undefined, FIXED_NOW);
    expect(updated.currentParam).toBe(6);
    expect(updated.lastDirection).toBe('up');
  });

  it('タップして全正解 → correct 扱い（3 連で down）', () => {
    let s = createStaircase('game1', undefined, FIXED_NOW);
    const trial = buildGame1Trial(s.currentParam, mulberry32(42));
    const changingIds = trial.patches.filter((p) => p.isChanging).map((p) => p.id);

    const grading = gradeGame1(trial, changingIds);
    expect(grading.isCorrectForStaircase).toBe(true);

    // 1 試行で down にはならない（3 連必要）
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(5);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(5);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(4); // 5 - 1
    expect(s.lastDirection).toBe('down');
  });
});
