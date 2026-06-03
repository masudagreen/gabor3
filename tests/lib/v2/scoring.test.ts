/**
 * scoring.test.ts — 採点（TP/FP/FN・roundScore）とセッションスコア正規化（F-02 / F-04）。
 */

import { PatchDef } from '../../../src/lib/v2/patch';
import {
  scoreRound,
  isAllCorrect,
  computeSessionScore,
  toRoundRecord,
  RoundScore,
  FP_PENALTY,
  clamp,
} from '../../../src/lib/v2/scoring';

/** index と changeKind だけ指定して PatchDef を量産するヘルパー。 */
function patch(index: number, changing: boolean): PatchDef {
  return {
    index,
    changeKind: changing ? 'rotation' : null,
    initialOrientationDeg: 0,
    initialCpd: 3,
    rotationSpeed: 6,
    rotationDir: 'cw',
    sfChangeSpeed: 0.15,
    sfDir: 'increase',
  };
}

/** changing インデックス集合からグリッド（合計 total 個）を作る。 */
function grid(total: number, changingIdx: number[]): PatchDef[] {
  const set = new Set(changingIdx);
  return Array.from({ length: total }, (_, i) => patch(i, set.has(i)));
}

describe('scoreRound', () => {
  it('変化2個を両方選択 → TP=2, FP=0, FN=0, roundScore=2', () => {
    const patches = grid(9, [0, 1]);
    const s = scoreRound(patches, new Set([0, 1]));
    expect(s).toMatchObject({ tpCount: 2, fpCount: 0, fnCount: 0, roundScore: 2 });
    expect(s.changingPatchCount).toBe(2);
    expect(s.staticPatchCount).toBe(7);
  });

  it('変化を 1 個取りこぼし → FN=1', () => {
    const patches = grid(9, [0, 1]);
    const s = scoreRound(patches, new Set([0]));
    expect(s).toMatchObject({ tpCount: 1, fpCount: 0, fnCount: 1, roundScore: 1 });
  });

  it('静止を誤選択 → FP=1, roundScore=TP−FP', () => {
    const patches = grid(9, [0, 1]);
    const s = scoreRound(patches, new Set([0, 1, 5]));
    expect(s).toMatchObject({ tpCount: 2, fpCount: 1, fnCount: 0, roundScore: 1 });
  });

  it('roundScore は負にもなりうる（誤選択過多）', () => {
    const patches = grid(9, [0]);
    const s = scoreRound(patches, new Set([3, 4, 5]));
    expect(s.tpCount).toBe(0);
    expect(s.fpCount).toBe(3);
    expect(s.fnCount).toBe(1);
    expect(s.roundScore).toBe(-3);
  });

  it('未選択のまま採点 → TP=0, FP=0（F-02 受け入れ基準）', () => {
    const patches = grid(9, [0, 2]);
    const s = scoreRound(patches, new Set());
    expect(s).toMatchObject({ tpCount: 0, fpCount: 0, fnCount: 2, roundScore: 0 });
  });

  it('種類（回転/周波数）を区別せず変化として数える（AS-2）', () => {
    const patches: PatchDef[] = [
      { ...patch(0, true), changeKind: 'rotation' },
      { ...patch(1, true), changeKind: 'frequency' },
      { ...patch(2, true), changeKind: 'both' },
      patch(3, false),
    ];
    const s = scoreRound(patches, new Set([0, 1, 2]));
    expect(s.tpCount).toBe(3);
    expect(s.changingPatchCount).toBe(3);
  });
});

describe('isAllCorrect', () => {
  it('変化を過不足なく選択 → true', () => {
    const patches = grid(9, [0, 1]);
    expect(isAllCorrect(patches, new Set([0, 1]))).toBe(true);
  });

  it('選び逃しがあれば false', () => {
    const patches = grid(9, [0, 1]);
    expect(isAllCorrect(patches, new Set([0]))).toBe(false);
  });

  it('誤選択があれば false', () => {
    const patches = grid(9, [0, 1]);
    expect(isAllCorrect(patches, new Set([0, 1, 5]))).toBe(false);
  });

  it('未選択は false（変化が存在する限り）', () => {
    const patches = grid(9, [0]);
    expect(isAllCorrect(patches, new Set())).toBe(false);
  });
});

describe('toRoundRecord', () => {
  it('RoundScore を RoundRecord（§6.3）へ変換する', () => {
    const score = scoreRound(grid(9, [0, 1]), new Set([0]));
    const rec = toRoundRecord(score, 3);
    expect(rec).toEqual({
      roundIndex: 3,
      changingPatchCount: 2,
      tpCount: 1,
      fpCount: 0,
      fnCount: 1,
      roundScore: 1,
    });
  });
});

describe('clamp', () => {
  it('範囲外を端に丸める', () => {
    expect(clamp(0, 100, -5)).toBe(0);
    expect(clamp(0, 100, 250)).toBe(100);
    expect(clamp(0, 100, 50)).toBe(50);
  });
});

describe('computeSessionScore（F-04 正規化）', () => {
  /** RoundScore を直接組み立てるヘルパー（正規化のみを検証）。 */
  function rs(over: Partial<RoundScore>): RoundScore {
    return {
      changingPatchCount: 0,
      staticPatchCount: 0,
      tpCount: 0,
      fpCount: 0,
      fnCount: 0,
      roundScore: 0,
      ...over,
    };
  }

  it('全変化パッチ正答 & 誤選択ゼロ → 100（満点）', () => {
    const rounds = [
      rs({ changingPatchCount: 2, staticPatchCount: 7, tpCount: 2 }),
      rs({ changingPatchCount: 3, staticPatchCount: 6, tpCount: 3 }),
    ];
    expect(computeSessionScore(rounds)).toBe(100);
  });

  it('何も選ばず誤選択もしない → 0（下限、満点と明確に区別）', () => {
    const rounds = [
      rs({ changingPatchCount: 2, staticPatchCount: 7, fnCount: 2 }),
      rs({ changingPatchCount: 3, staticPatchCount: 6, fnCount: 3 }),
    ];
    expect(computeSessionScore(rounds)).toBe(0);
  });

  it('正答率が中間ならスコアも中間（半分正答 → 50 付近）', () => {
    const rounds = [
      rs({ changingPatchCount: 4, staticPatchCount: 5, tpCount: 2, fnCount: 2 }),
    ];
    expect(computeSessionScore(rounds)).toBe(50);
  });

  it('FP（誤選択）はスコアを下げる方向に作用する', () => {
    const perfect = [rs({ changingPatchCount: 2, staticPatchCount: 8, tpCount: 2 })];
    const withFp = [
      rs({ changingPatchCount: 2, staticPatchCount: 8, tpCount: 2, fpCount: 4 }),
    ];
    const scorePerfect = computeSessionScore(perfect);
    const scoreFp = computeSessionScore(withFp);
    expect(scoreFp).toBeLessThan(scorePerfect);
    // 全正答(100) − FP_PENALTY × (4/8) = 100 − 25 = 75
    expect(scoreFp).toBe(100 - FP_PENALTY * 0.5);
  });

  it('全静止を誤選択しても 0 を下回らない（クランプ）', () => {
    const rounds = [
      rs({ changingPatchCount: 2, staticPatchCount: 7, tpCount: 0, fpCount: 7, fnCount: 2 }),
    ];
    expect(computeSessionScore(rounds)).toBe(0);
  });

  it('変化パッチが 0（理論上）なら 0 を返す', () => {
    expect(computeSessionScore([])).toBe(0);
    expect(computeSessionScore([rs({ staticPatchCount: 9 })])).toBe(0);
  });

  it('整数を返す（四捨五入）', () => {
    const rounds = [
      rs({ changingPatchCount: 3, staticPatchCount: 6, tpCount: 1, fnCount: 2 }),
    ];
    // 100 × 1/3 = 33.33 → 33
    expect(computeSessionScore(rounds)).toBe(33);
  });

  it('満点と下限が明確に区別される（100 vs 0）', () => {
    const full = [rs({ changingPatchCount: 5, staticPatchCount: 4, tpCount: 5 })];
    const none = [rs({ changingPatchCount: 5, staticPatchCount: 4, fnCount: 5 })];
    expect(computeSessionScore(full) - computeSessionScore(none)).toBe(100);
  });
});
