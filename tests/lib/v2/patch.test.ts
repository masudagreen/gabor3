/**
 * patch.test.ts — 時刻 t における orientationDeg / cpd の純関数（F-01）。
 */

import {
  PatchDef,
  patchOrientationAt,
  patchCpdAt,
  normalizeDeg180,
  isChanging,
  MIN_CPD,
} from '../../../src/lib/v2/patch';

function makePatch(over: Partial<PatchDef>): PatchDef {
  return {
    index: 0,
    changeKind: null,
    initialOrientationDeg: 30,
    initialCpd: 3,
    rotationSpeed: 6,
    rotationDir: 'cw',
    sfChangeSpeed: 0.15,
    sfDir: 'increase',
    ...over,
  };
}

describe('normalizeDeg180', () => {
  it('0–180 に正規化する', () => {
    expect(normalizeDeg180(0)).toBe(0);
    expect(normalizeDeg180(190)).toBe(10);
    expect(normalizeDeg180(-10)).toBe(170);
    expect(normalizeDeg180(360)).toBe(0);
  });
});

describe('isChanging', () => {
  it('changeKind が null なら静止', () => {
    expect(isChanging(makePatch({ changeKind: null }))).toBe(false);
    expect(isChanging(makePatch({ changeKind: 'rotation' }))).toBe(true);
    expect(isChanging(makePatch({ changeKind: 'both' }))).toBe(true);
  });
});

describe('patchOrientationAt', () => {
  it('静止パッチは時刻によらず初期角度のまま', () => {
    const p = makePatch({ changeKind: null, initialOrientationDeg: 45 });
    expect(patchOrientationAt(p, 0)).toBe(45);
    expect(patchOrientationAt(p, 10)).toBe(45);
  });

  it('CW 回転は角度が増加する（t に比例）', () => {
    const p = makePatch({
      changeKind: 'rotation',
      initialOrientationDeg: 10,
      rotationSpeed: 6,
      rotationDir: 'cw',
    });
    expect(patchOrientationAt(p, 0)).toBe(10);
    expect(patchOrientationAt(p, 5)).toBe(40); // 10 + 6*5
  });

  it('CCW 回転は角度が減少し 0–180 に巻き戻る', () => {
    const p = makePatch({
      changeKind: 'rotation',
      initialOrientationDeg: 10,
      rotationSpeed: 6,
      rotationDir: 'ccw',
    });
    // 10 - 6*5 = -20 → 160
    expect(patchOrientationAt(p, 5)).toBe(160);
  });

  it('frequency のみの変化パッチは角度が変わらない', () => {
    const p = makePatch({ changeKind: 'frequency', initialOrientationDeg: 33 });
    expect(patchOrientationAt(p, 8)).toBe(33);
  });

  it('both は角度も変化する', () => {
    const p = makePatch({
      changeKind: 'both',
      initialOrientationDeg: 0,
      rotationSpeed: 6,
      rotationDir: 'cw',
    });
    expect(patchOrientationAt(p, 10)).toBe(60);
  });
});

describe('patchCpdAt（v2.0：cpd は時間変化しない・回転のみ）', () => {
  it('静止パッチは時刻によらず初期 cpd のまま', () => {
    const p = makePatch({ changeKind: null, initialCpd: 3.2 });
    expect(patchCpdAt(p, 0)).toBeCloseTo(3.2);
    expect(patchCpdAt(p, 10)).toBeCloseTo(3.2);
  });

  it('回転変化パッチも cpd は固定（時間で変わらない）', () => {
    const p = makePatch({ changeKind: 'rotation', initialCpd: 2.7 });
    expect(patchCpdAt(p, 0)).toBeCloseTo(2.7);
    expect(patchCpdAt(p, 9)).toBeCloseTo(2.7);
    expect(patchCpdAt(p, 60)).toBeCloseTo(2.7);
  });

  it('引数 tSec 省略でも初期 cpd を返す', () => {
    const p = makePatch({ changeKind: 'rotation', initialCpd: 3.5 });
    expect(patchCpdAt(p)).toBeCloseTo(3.5);
  });

  it('物理下限 MIN_CPD でクランプする', () => {
    const p = makePatch({ changeKind: null, initialCpd: 0.1 });
    expect(patchCpdAt(p, 0)).toBe(MIN_CPD);
  });
});
