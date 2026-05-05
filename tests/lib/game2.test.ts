/**
 * Game 2（左右並び 2AFC、amendment 後）のロジック純関数テスト。
 *
 * spec.md §7.2 / screens.md S1-03 に従う。
 */

import {
  GAME2,
  buildTrialSpec,
  gradeAnswer,
  type Game2TrialSpec,
} from '../../src/lib/game2';

/** 決定論的 RNG：渡した数列を順に返す。末尾を超えると 0 を返す */
function fixedRng(seq: number[]): () => number {
  let i = 0;
  return () => (i < seq.length ? seq[i++] : 0);
}

describe('GAME2 constants', () => {
  it('セッション 60 秒、提示 5 秒、回答 3 秒、固視 500ms、フィードバック 1.5 秒、最大 30 試行', () => {
    expect(GAME2.sessionDurationMs).toBe(60_000);
    expect(GAME2.presentationDurationMs).toBe(5000);
    expect(GAME2.responseTimeLimitMs).toBe(3000);
    expect(GAME2.fixationDurationMs).toBe(500);
    expect(GAME2.feedbackDurationMs).toBe(1500);
    expect(GAME2.maxTrials).toBe(30);
  });
});

describe('buildTrialSpec — 左右並びペア生成', () => {
  it('左右の orientation が baseOrientation の ±paramValue/2 になる', () => {
    // rng 列：[base/180=0.25 → 45°, correctSide=0.4 → left, phaseLeft=0, phaseRight=0]
    const spec = buildTrialSpec(6, fixedRng([0.25, 0.4, 0, 0]));
    expect(spec.baseOrientationDeg).toBeCloseTo(45);
    expect(spec.paramValue).toBe(6);
    // 左が時計回り（cw、+half=+3）、右が反時計回り（-half=-3）
    expect(spec.left.orientationDeg).toBeCloseTo(48);
    expect(spec.right.orientationDeg).toBeCloseTo(42);
    expect(spec.correctSide).toBe('left');
  });

  it('correctSide=right のとき、右側が +half、左側が -half になる', () => {
    // rng[0]=0.5 → base=90°, rng[1]=0.9 → right (since 0.9 >= 0.5)
    const spec = buildTrialSpec(8, fixedRng([0.5, 0.9, 0, 0]));
    expect(spec.baseOrientationDeg).toBeCloseTo(90);
    expect(spec.correctSide).toBe('right');
    expect(spec.right.orientationDeg).toBeCloseTo(94); // 90 + 4
    expect(spec.left.orientationDeg).toBeCloseTo(86); // 90 - 4
  });

  it('左右の orientation 差が paramValue になる（180 で正規化）', () => {
    for (let i = 0; i < 20; i += 1) {
      const spec = buildTrialSpec(5);
      const diff = signedMod180(spec.left.orientationDeg - spec.right.orientationDeg);
      expect(Math.abs(diff)).toBeCloseTo(5, 5);
    }
  });

  it('correctSide はランダム性があり、両方の値が出る', () => {
    const sides: Record<string, number> = { left: 0, right: 0 };
    for (let i = 0; i < 200; i += 1) {
      const spec = buildTrialSpec(4);
      sides[spec.correctSide] += 1;
    }
    // 200 試行で両側 50 以上は十分な信頼度（確率的にほぼ常に成立）
    expect(sides.left).toBeGreaterThan(50);
    expect(sides.right).toBeGreaterThan(50);
  });

  it('cpd / contrast / sigmaDeg は左右で同一の固定値', () => {
    const spec = buildTrialSpec(3);
    expect(spec.left.cpd).toBe(3);
    expect(spec.right.cpd).toBe(3);
    expect(spec.left.contrast).toBeCloseTo(0.3);
    expect(spec.right.contrast).toBeCloseTo(0.3);
    expect(spec.left.sigmaDeg).toBeCloseTo(0.6);
    expect(spec.right.sigmaDeg).toBeCloseTo(0.6);
  });
});

describe('gradeAnswer — 左右の正誤判定', () => {
  function specWithCorrect(side: 'left' | 'right'): Game2TrialSpec {
    return {
      left: { cpd: 3, contrast: 0.3, sigmaDeg: 0.6, orientationDeg: 50, phaseRad: 0 },
      right: { cpd: 3, contrast: 0.3, sigmaDeg: 0.6, orientationDeg: 40, phaseRad: 0 },
      correctSide: side,
      paramValue: 10,
      baseOrientationDeg: 45,
    };
  }
  it('correctSide と一致するとき true、しないとき false', () => {
    const sLeft = specWithCorrect('left');
    expect(gradeAnswer(sLeft, 'left')).toBe(true);
    expect(gradeAnswer(sLeft, 'right')).toBe(false);
    const sRight = specWithCorrect('right');
    expect(gradeAnswer(sRight, 'right')).toBe(true);
    expect(gradeAnswer(sRight, 'left')).toBe(false);
  });
});

/** -90〜+90 に正規化した orientation 差（左右で 180 を跨ぐケースを吸収） */
function signedMod180(deg: number): number {
  let v = deg % 180;
  if (v > 90) v -= 180;
  if (v < -90) v += 180;
  return v;
}
