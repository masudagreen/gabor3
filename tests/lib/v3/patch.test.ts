/**
 * patch.test.ts — v3.0 パッチモデルの単体テスト（spec F-01 / system §4.1・§7.2・NF-28c）。
 *
 * 検証範囲：
 * - 静止パッチ：時間によらず初期角度で固定（AS-10）。
 * - 一方向回転：t に比例した単調回転（CW=加算 / CCW=減算）。
 * - 振動（oscillate）：三角波の往復性・振幅・周期・折り返しでの瞬間停止（NF-28c）。
 * - 一方向 vs 振動 vs 静止 の角度系列が区別できること（弁別ロジック）。
 * - 0–180 正規化。
 */

import {
  PatchDef,
  patchOrientationAt,
  oscillationOffsetDeg,
  normalizeDeg180,
  isChanging,
  OSCILLATION_AMPLITUDE_DEG,
} from '../../../src/lib/v3/patch';

function staticPatch(initialDeg: number): PatchDef {
  return {
    index: 0,
    changeKind: null,
    initialOrientationDeg: initialDeg,
    rotationSpeed: 6,
    rotationDir: 'cw',
    direction: 'one-way',
  };
}

function oneWayPatch(
  initialDeg: number,
  speed: number,
  dir: 'cw' | 'ccw',
): PatchDef {
  return {
    index: 1,
    changeKind: 'rotation',
    initialOrientationDeg: initialDeg,
    rotationSpeed: speed,
    rotationDir: dir,
    direction: 'one-way',
  };
}

function oscillatePatch(
  initialDeg: number,
  speed: number,
  dir: 'cw' | 'ccw' = 'cw',
): PatchDef {
  return {
    index: 2,
    changeKind: 'rotation',
    initialOrientationDeg: initialDeg,
    rotationSpeed: speed,
    rotationDir: dir,
    direction: 'oscillate',
  };
}

describe('normalizeDeg180', () => {
  it('[0,180) に正規化する（180 周期）', () => {
    expect(normalizeDeg180(0)).toBe(0);
    expect(normalizeDeg180(180)).toBe(0);
    expect(normalizeDeg180(190)).toBe(10);
    expect(normalizeDeg180(360)).toBe(0);
    expect(normalizeDeg180(-10)).toBe(170);
    expect(normalizeDeg180(-190)).toBe(170);
  });
});

describe('isChanging', () => {
  it('回転パッチは true、静止パッチは false', () => {
    expect(isChanging(oneWayPatch(0, 6, 'cw'))).toBe(true);
    expect(isChanging(oscillatePatch(0, 6))).toBe(true);
    expect(isChanging(staticPatch(45))).toBe(false);
  });
});

describe('静止パッチ（AS-10）', () => {
  it('時間が進んでも初期角度のまま（時間変化なし）', () => {
    const p = staticPatch(73);
    expect(patchOrientationAt(p, 0)).toBe(73);
    expect(patchOrientationAt(p, 5)).toBe(73);
    expect(patchOrientationAt(p, 40)).toBe(73);
  });

  it('初期角度は 0–180 に正規化される', () => {
    expect(patchOrientationAt(staticPatch(200), 10)).toBe(20);
  });
});

describe('一方向回転', () => {
  it('CW は t に比例して角度増加（単調）', () => {
    const p = oneWayPatch(0, 6, 'cw');
    expect(patchOrientationAt(p, 0)).toBe(0);
    expect(patchOrientationAt(p, 1)).toBe(6);
    expect(patchOrientationAt(p, 5)).toBe(30);
    // 180 を跨ぐと正規化
    expect(patchOrientationAt(p, 30)).toBe(0); // 180 → 0
    expect(patchOrientationAt(p, 31)).toBe(6); // 186 → 6
  });

  it('CCW は角度減少（正規化で巻き戻り）', () => {
    const p = oneWayPatch(10, 6, 'ccw');
    expect(patchOrientationAt(p, 0)).toBe(10);
    expect(patchOrientationAt(p, 1)).toBe(4);
    expect(patchOrientationAt(p, 2)).toBeCloseTo(178, 6); // 10-12=-2 → 178
  });

  it('遅い速度（2deg/sec）でも時間に応じて確実に変化する（NF-28b 連動）', () => {
    const p = oneWayPatch(0, 2, 'cw');
    expect(patchOrientationAt(p, 1)).toBeCloseTo(2, 6);
    expect(patchOrientationAt(p, 6)).toBeCloseTo(12, 6);
  });
});

describe('oscillationOffsetDeg（三角波・NF-28c）', () => {
  const A = OSCILLATION_AMPLITUDE_DEG;
  const speed = 6;

  it('t=0 ではオフセット 0', () => {
    expect(oscillationOffsetDeg(0, speed, 1)).toBe(0);
  });

  it('片道（位相 A=30°ぶん進む = A/speed 秒）で +A に達する', () => {
    const tAtPeak = A / speed; // 30/6 = 5 秒
    expect(oscillationOffsetDeg(tAtPeak, speed, 1)).toBeCloseTo(A, 6);
  });

  it('折り返して中心（offset 0）に戻り、反対側 −A まで往復する', () => {
    const quarter = A / speed; // +A に到達
    expect(oscillationOffsetDeg(2 * quarter, speed, 1)).toBeCloseTo(0, 6); // +A→0
    expect(oscillationOffsetDeg(3 * quarter, speed, 1)).toBeCloseTo(-A, 6); // 0→−A
    expect(oscillationOffsetDeg(4 * quarter, speed, 1)).toBeCloseTo(0, 6); // −A→0（1 周期）
  });

  it('周期 = 4A/speed 秒で元に戻る（往復性）', () => {
    const period = (4 * A) / speed; // 20 秒
    for (const t of [1, 3.3, 7.7, 12.5]) {
      expect(oscillationOffsetDeg(t + period, speed, 1)).toBeCloseTo(
        oscillationOffsetDeg(t, speed, 1),
        6,
      );
    }
  });

  it('振幅を超えない（|offset| ≤ A、行って戻る）', () => {
    for (let t = 0; t <= 40; t += 0.37) {
      const off = oscillationOffsetDeg(t, speed, 1);
      expect(Math.abs(off)).toBeLessThanOrEqual(A + 1e-9);
    }
  });

  it('折り返し点近傍で瞬間角速度が減衰し 0 になる（静止弁別が難しい根拠 AS-11）', () => {
    const tPeak = A / speed; // +A 折り返し
    const dt = 0.001;
    const before = oscillationOffsetDeg(tPeak - dt, speed, 1);
    const after = oscillationOffsetDeg(tPeak + dt, speed, 1);
    // 折り返しなので before も after もピークより小さい（同方向に進まない＝速度反転）
    const peak = oscillationOffsetDeg(tPeak, speed, 1);
    expect(before).toBeLessThan(peak + 1e-9);
    expect(after).toBeLessThan(peak + 1e-9);
  });

  it('折り返し点以外では瞬間角速度の大きさが speed と同等（狙い 3：角速度保存）', () => {
    const t = 1.0; // 上り区間の途中
    const dt = 0.0001;
    const v =
      (oscillationOffsetDeg(t + dt, speed, 1) -
        oscillationOffsetDeg(t - dt, speed, 1)) /
      (2 * dt);
    expect(Math.abs(v)).toBeCloseTo(speed, 3);
  });

  it('速度 0 / 振幅 0 ではオフセット 0（ゼロ除算なし）', () => {
    expect(oscillationOffsetDeg(5, 0, 1)).toBe(0);
    expect(oscillationOffsetDeg(5, speed, 1, 0)).toBe(0);
  });
});

describe('振動パッチ全体（patchOrientationAt）', () => {
  it('初期角度を中心に往復する（initial±A の範囲内）', () => {
    const initial = 90;
    const p = oscillatePatch(initial, 6);
    for (let t = 0; t <= 40; t += 0.5) {
      const deg = patchOrientationAt(p, t);
      // initial±A=90±30=[60,120] 内（正規化で巻き戻らない範囲）
      expect(deg).toBeGreaterThanOrEqual(60 - 1e-6);
      expect(deg).toBeLessThanOrEqual(120 + 1e-6);
    }
  });

  it('t=0 では初期角度', () => {
    expect(patchOrientationAt(oscillatePatch(45, 6), 0)).toBe(45);
  });
});

describe('一方向 vs 振動 vs 静止 の弁別（NF-28b/28c）', () => {
  it('一方向は単調に離れ続け、振動は最終的に初期角度へ戻る', () => {
    const initial = 45;
    const speed = 6;
    const oneWay = oneWayPatch(initial, speed, 'cw');
    const osc = oscillatePatch(initial, speed);
    const period = (4 * OSCILLATION_AMPLITUDE_DEG) / speed; // 20 秒

    // 1 周期後：振動は初期角度に戻る
    expect(patchOrientationAt(osc, period)).toBeCloseTo(initial, 6);
    // 一方向は同じ時刻で初期角度から大きく離れている
    const oneWayDeg = patchOrientationAt(oneWay, period);
    expect(Math.abs(oneWayDeg - initial)).toBeGreaterThan(1); // 確実に違う
  });

  it('回転（一方向/振動）は時間で角度が動くが静止は不変', () => {
    const initial = 30;
    const stat = staticPatch(initial);
    const oneWay = oneWayPatch(initial, 4, 'cw');
    const osc = oscillatePatch(initial, 4);

    // 静止は不変
    expect(patchOrientationAt(stat, 2)).toBe(initial);
    // 回転は動く
    expect(patchOrientationAt(oneWay, 2)).not.toBeCloseTo(initial, 3);
    expect(patchOrientationAt(osc, 2)).not.toBeCloseTo(initial, 3);
  });
});
