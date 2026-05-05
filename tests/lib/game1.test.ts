/**
 * Game 1（変化察知）採点ロジックのテスト（spec.md §7.1）。
 */

import {
  GAME1,
  buildGame1Trial,
  difficultyFromParam,
  gradeGame1,
  interpolateOrientation,
  isUnattempted,
} from '../../src/lib/game1';

describe('game1: difficultyFromParam', () => {
  it('param=3 は hard（5×5、変化 3 個）', () => {
    const c = difficultyFromParam(3);
    expect(c.difficulty).toBe('hard');
    expect(c.rows).toBe(5);
    expect(c.cols).toBe(5);
    expect(c.changingCount).toBe(3);
  });

  it('param=5 は medium（4×4、変化 2 個）', () => {
    const c = difficultyFromParam(5);
    expect(c.difficulty).toBe('medium');
    expect(c.rows).toBe(4);
    expect(c.changingCount).toBe(2);
  });

  it('param=8 は easy（3×3、変化 1 個）', () => {
    const c = difficultyFromParam(8);
    expect(c.difficulty).toBe('easy');
    expect(c.rows).toBe(3);
    expect(c.changingCount).toBe(1);
  });
});

describe('game1: buildGame1Trial', () => {
  it('param=5 で 4×4=16 パッチ、変化 2 個生成', () => {
    const rng = mulberry32(42);
    const trial = buildGame1Trial(5, rng);
    expect(trial.patches).toHaveLength(16);
    const changing = trial.patches.filter((p) => p.isChanging);
    expect(changing).toHaveLength(2);
    expect(trial.maxAngleDeltaDeg).toBe(5);
    // 変化対象は startとendが異なる
    for (const p of changing) {
      expect(p.startOrientationDeg).not.toBe(p.endOrientationDeg);
    }
    // 非変化対象は start=end
    const nonChanging = trial.patches.filter((p) => !p.isChanging);
    for (const p of nonChanging) {
      expect(p.startOrientationDeg).toBe(p.endOrientationDeg);
    }
  });

  it('全パッチが一意な ID を持つ', () => {
    const trial = buildGame1Trial(8, mulberry32(7));
    const ids = trial.patches.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cpd / contrast / sigma は GAME1 の定数に従う', () => {
    const trial = buildGame1Trial(5, mulberry32(1));
    for (const p of trial.patches) {
      expect(p.cpd).toBe(GAME1.cpd);
      expect(p.contrast).toBe(GAME1.contrast);
      expect(p.sigmaDeg).toBe(GAME1.sigmaDeg);
    }
  });
});

describe('game1: gradeGame1', () => {
  it('全正解：TP=2 / FP=0 → score=2、staircase は correct', () => {
    const trial = buildGame1Trial(5, mulberry32(123));
    const changingIds = trial.patches.filter((p) => p.isChanging).map((p) => p.id);
    const result = gradeGame1(trial, changingIds);
    expect(result.score).toBe(2);
    expect(result.correctIds).toHaveLength(2);
    expect(result.incorrectIds).toHaveLength(0);
    expect(result.missedIds).toHaveLength(0);
    expect(result.isCorrectForStaircase).toBe(true);
  });

  it('partial credit：TP=1 / FP=1 → score=0（クランプ）、staircase は incorrect', () => {
    const trial = buildGame1Trial(5, mulberry32(123));
    const changingIds = trial.patches.filter((p) => p.isChanging).map((p) => p.id);
    const nonChangingId = trial.patches.find((p) => !p.isChanging)!.id;
    // 正タップ 1 + 誤タップ 1
    const result = gradeGame1(trial, [changingIds[0], nonChangingId]);
    expect(result.correctIds).toHaveLength(1);
    expect(result.incorrectIds).toHaveLength(1);
    expect(result.score).toBe(0); // 1 - 1 = 0
    expect(result.isCorrectForStaircase).toBe(false);
  });

  it('全誤タップ：score は 0 にクランプ（負にならない）', () => {
    const trial = buildGame1Trial(5, mulberry32(123));
    const allNonChanging = trial.patches
      .filter((p) => !p.isChanging)
      .map((p) => p.id);
    const result = gradeGame1(trial, allNonChanging.slice(0, 5));
    expect(result.score).toBe(0); // 0 - 5 < 0 → 0
    expect(result.incorrectIds).toHaveLength(5);
    expect(result.missedIds).toHaveLength(2); // 取り逃がし
    expect(result.isCorrectForStaircase).toBe(false);
  });

  it('未選択：missedIds が変化対象全件、score=0', () => {
    const trial = buildGame1Trial(5, mulberry32(99));
    const result = gradeGame1(trial, []);
    expect(result.missedIds).toHaveLength(2);
    expect(result.score).toBe(0);
    expect(result.isCorrectForStaircase).toBe(false);
  });
});

describe('game1: isUnattempted', () => {
  it('タップ 0 件 + 完了ボタン無し → 未挑戦', () => {
    expect(isUnattempted([], false)).toBe(true);
  });

  it('タップ 1 件以上 → 未挑戦ではない（FP もありえる）', () => {
    expect(isUnattempted(['r0c0'], false)).toBe(false);
    expect(isUnattempted(['r0c0'], true)).toBe(false);
  });

  it('完了ボタン押下 → 未挑戦ではない', () => {
    expect(isUnattempted([], true)).toBe(false);
  });
});

describe('game1: interpolateOrientation', () => {
  it('progress=0 で startOrientationDeg、progress=1 で endOrientationDeg', () => {
    const patch = {
      id: 'r0c0',
      row: 0,
      col: 0,
      cpd: 3 as const,
      contrast: 0.4,
      sigmaDeg: 0.6,
      startOrientationDeg: 45,
      endOrientationDeg: 50,
      isChanging: true,
    };
    expect(interpolateOrientation(patch, 0)).toBe(45);
    expect(interpolateOrientation(patch, 1)).toBe(50);
    // 中間で線形
    const mid = interpolateOrientation(patch, 0.5);
    expect(mid).toBeCloseTo(47.5, 1);
  });

  it('progress 範囲外はクランプ', () => {
    const patch = {
      id: 'r0c0',
      row: 0,
      col: 0,
      cpd: 3 as const,
      contrast: 0.4,
      sigmaDeg: 0.6,
      startOrientationDeg: 45,
      endOrientationDeg: 50,
      isChanging: true,
    };
    expect(interpolateOrientation(patch, -0.5)).toBe(45);
    expect(interpolateOrientation(patch, 1.5)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Mulberry32 PRNG（テスト用、決定論的乱数）
// ---------------------------------------------------------------------------
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
