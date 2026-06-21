/**
 * roundGen.test.ts — v3.2 ラウンド生成の単体テスト（spec F-01 / §4.9 / system §7.2）。
 *
 * v3.2 改訂：
 * - **個数は難易度軸でなくなった**。各ラウンドの回転個数は `countRange` プリセット
 *   × 格子サイズの範囲からランダム抽選する（pickRoundCount / countRangeBounds）。
 * - `generateRound` 自体は依然「count 個ちょうど」を配置する純関数（count は外部から渡る）。
 * - `levelParamsToRoundGen(params, count)` は第 2 引数 count を取る。
 * - `generateRoundFromLevel(rng, params, countRange)` は countRange から個数を抽選する。
 *
 * 検証範囲：
 * - countRangeBounds（3 プリセット × 格子サイズ）と pickRoundCount の範囲・決定論。
 * - generateRound：count 個ちょうど・過密回避・速度/方向・静止角度。
 * - levelParamsToRoundGen / generateRoundFromLevel の v3.2 シグネチャ。
 */

import {
  generateRound,
  generateRoundFromLevel,
  levelParamsToRoundGen,
  generateSpacedAngles,
  clampCountToGrid,
  countRangeBounds,
  pickRoundCount,
  COUNT_RANGE_PRESETS,
  DEFAULT_COUNT_RANGE,
  STATIC_MIN_ANGLE_GAP_DEG,
  type RoundGenParams,
  type CountRangePreset,
} from '../../../src/lib/v3/roundGen';
import { isChanging } from '../../../src/lib/v3/patch';
import { mulberry32 } from '../../../src/lib/v2/rng';
import { levelToParams } from '../../../src/lib/v3/level';

function params(over: Partial<RoundGenParams> = {}): RoundGenParams {
  return {
    gridSize: 3,
    count: 2,
    rotationSpeed: 6,
    direction: 'one-way',
    ...over,
  };
}

// ───────────────────────────────────────────────────────────
// §4.9 個数範囲プリセット（countRange）
// ───────────────────────────────────────────────────────────

describe('COUNT_RANGE_PRESETS / DEFAULT_COUNT_RANGE（§4.9・AS-36）', () => {
  it('3 プリセット（cells_minus_1 / half / fixed_1_4）', () => {
    expect(COUNT_RANGE_PRESETS).toEqual(['cells_minus_1', 'half', 'fixed_1_4']);
  });

  it('既定プリセットは中庸の half', () => {
    expect(DEFAULT_COUNT_RANGE).toBe('half');
  });
});

describe('countRangeBounds（プリセット × 格子サイズ → [min,max]・§4.9）', () => {
  it('min は常に 1', () => {
    for (const preset of COUNT_RANGE_PRESETS) {
      for (const gridSize of [3, 4, 5, 6]) {
        expect(countRangeBounds(preset, gridSize).min).toBe(1);
      }
    }
  });

  it('cells_minus_1 → max = セル数−1（静止 1 つ残る）', () => {
    expect(countRangeBounds('cells_minus_1', 3)).toEqual({ min: 1, max: 8 }); // 9-1
    expect(countRangeBounds('cells_minus_1', 4)).toEqual({ min: 1, max: 15 }); // 16-1
    expect(countRangeBounds('cells_minus_1', 6)).toEqual({ min: 1, max: 35 }); // 36-1
  });

  it('half → max = floor(セル数/2)', () => {
    expect(countRangeBounds('half', 3)).toEqual({ min: 1, max: 4 }); // floor(9/2)
    expect(countRangeBounds('half', 4)).toEqual({ min: 1, max: 8 }); // floor(16/2)
    expect(countRangeBounds('half', 5)).toEqual({ min: 1, max: 12 }); // floor(25/2)
    expect(countRangeBounds('half', 6)).toEqual({ min: 1, max: 18 }); // floor(36/2)
  });

  it('fixed_1_4 → max = 4（サイズ非依存・ただし格子容量でクランプ）', () => {
    expect(countRangeBounds('fixed_1_4', 3)).toEqual({ min: 1, max: 4 });
    expect(countRangeBounds('fixed_1_4', 4)).toEqual({ min: 1, max: 4 });
    expect(countRangeBounds('fixed_1_4', 6)).toEqual({ min: 1, max: 4 });
  });

  it('max は常に セル数−1 以下にクランプ（静止 1 つ以上保証）', () => {
    for (const preset of COUNT_RANGE_PRESETS) {
      for (const gridSize of [3, 4, 5, 6]) {
        const { max } = countRangeBounds(preset, gridSize);
        expect(max).toBeLessThanOrEqual(gridSize * gridSize - 1);
        expect(max).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('pickRoundCount（範囲内の一様抽選・§4.9）', () => {
  it('抽選値は常に [min, max] 内（決定論シードでの統計確認）', () => {
    for (const preset of COUNT_RANGE_PRESETS) {
      for (const gridSize of [3, 4, 5, 6]) {
        const { min, max } = countRangeBounds(preset, gridSize);
        const rng = mulberry32(gridSize * 13 + preset.length);
        for (let i = 0; i < 200; i++) {
          const c = pickRoundCount(rng, preset, gridSize);
          expect(c).toBeGreaterThanOrEqual(min);
          expect(c).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it('同シードで決定論（同じ抽選列）', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 20; i++) {
      expect(pickRoundCount(a, 'half', 4)).toBe(pickRoundCount(b, 'half', 4));
    }
  });

  it('範囲が複数値のとき複数の異なる個数が出る（ランダム性）', () => {
    const rng = mulberry32(20240601);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      seen.add(pickRoundCount(rng, 'cells_minus_1', 4)); // max=15
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('抽選個数は格子容量でクランプされ静止 1 つ以上残す', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 100; i++) {
      const c = pickRoundCount(rng, 'cells_minus_1', 3); // 3x3=9 セル
      expect(c).toBeLessThanOrEqual(8);
    }
  });
});

describe('generateRound — 個数固定（外部から渡された count 個ちょうど）', () => {
  it('count 個ちょうどが回転、残りが静止', () => {
    for (const count of [1, 2, 3, 4]) {
      const patches = generateRound(mulberry32(count), params({ count, gridSize: 3 }));
      const changing = patches.filter(isChanging);
      expect(patches).toHaveLength(9);
      expect(changing).toHaveLength(count);
      expect(patches.filter((p) => !isChanging(p))).toHaveLength(9 - count);
    }
  });

  it('4x4（16 セル）でも count 個ちょうど', () => {
    const patches = generateRound(mulberry32(7), params({ gridSize: 4, count: 4 }));
    expect(patches).toHaveLength(16);
    expect(patches.filter(isChanging)).toHaveLength(4);
  });

  it('count を変えると回転個数だけが変わる（決定的）', () => {
    const a = generateRound(mulberry32(42), params({ count: 1 }));
    const b = generateRound(mulberry32(42), params({ count: 3 }));
    expect(a.filter(isChanging)).toHaveLength(1);
    expect(b.filter(isChanging)).toHaveLength(3);
  });

  it('index は行優先 0..n²-1 で一意', () => {
    const patches = generateRound(mulberry32(1), params({ gridSize: 4, count: 2 }));
    expect(patches.map((p) => p.index)).toEqual(
      Array.from({ length: 16 }, (_, i) => i),
    );
  });
});

describe('clampCountToGrid（§4.7 / NF-28d 過密回避）', () => {
  it('個数 < gridSize² なら据え置き', () => {
    expect(clampCountToGrid(4, 3)).toBe(4); // 4 < 9
    expect(clampCountToGrid(6, 3)).toBe(6); // 6 < 9（静止 3 残る）
    expect(clampCountToGrid(6, 6)).toBe(6); // 6 < 36
  });

  it('個数が格子容量以上のとき gridSize²−1 にクランプ（静止 1 つ以上残す）', () => {
    expect(clampCountToGrid(9, 3)).toBe(8); // 9 セル → 最大 8
    expect(clampCountToGrid(99, 3)).toBe(8);
    expect(clampCountToGrid(16, 4)).toBe(15);
  });

  it('下限は 1（回転パッチは最低 1 つ）', () => {
    expect(clampCountToGrid(0, 3)).toBe(1);
    expect(clampCountToGrid(-3, 4)).toBe(1);
  });
});

describe('generateRound — 個数×サイズの過密回避（§4.7）', () => {
  it('count 6 × 3x3（9 セル）：6 個回転・静止 3 つ残る', () => {
    const patches = generateRound(mulberry32(1), params({ count: 6, gridSize: 3 }));
    expect(patches).toHaveLength(9);
    expect(patches.filter(isChanging)).toHaveLength(6);
    expect(patches.filter((p) => !isChanging(p)).length).toBeGreaterThanOrEqual(1);
  });

  it('5x5（25 セル）・6x6（36 セル）でも count6 が破綻せず静止が残る', () => {
    for (const gridSize of [5, 6]) {
      const patches = generateRound(mulberry32(gridSize), params({ count: 6, gridSize }));
      expect(patches).toHaveLength(gridSize * gridSize);
      expect(patches.filter(isChanging)).toHaveLength(6);
      expect(patches.filter((p) => !isChanging(p)).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('個数が格子容量を超える極端ケースでも静止パッチが最低 1 つ残る', () => {
    const patches = generateRound(mulberry32(2), params({ count: 9, gridSize: 3 }));
    expect(patches.filter(isChanging)).toHaveLength(8);
    expect(patches.filter((p) => !isChanging(p))).toHaveLength(1);
  });
});

describe('generateRound — 回転パッチの速度・方向', () => {
  it('回転パッチは全て同じ rotationSpeed と direction（そのレベルの値）', () => {
    const patches = generateRound(
      mulberry32(3),
      params({ count: 3, rotationSpeed: 3.5, direction: 'oscillate' }),
    );
    const changing = patches.filter(isChanging);
    expect(changing).toHaveLength(3);
    for (const p of changing) {
      expect(p.rotationSpeed).toBe(3.5);
      expect(p.direction).toBe('oscillate');
    }
  });

  it('一方向時の CW/CCW はパッチごとに割り当てられる（一方向であること自体は維持）', () => {
    const patches = generateRound(
      mulberry32(99),
      params({ count: 4, gridSize: 3, direction: 'one-way' }),
    );
    const dirs = patches.filter(isChanging).map((p) => p.rotationDir);
    for (const d of dirs) {
      expect(['cw', 'ccw']).toContain(d);
    }
    expect(dirs).toHaveLength(4);
  });
});

describe('generateRound — 静止パッチ', () => {
  it('静止パッチは changeKind=null', () => {
    const patches = generateRound(mulberry32(5), params({ count: 2, gridSize: 3 }));
    const stat = patches.filter((p) => !isChanging(p));
    expect(stat).toHaveLength(7);
    for (const p of stat) expect(p.changeKind).toBeNull();
  });

  it('全パッチの初期角度は [0,180) で互いに離れている（少数なら 12° 以上）', () => {
    const patches = generateRound(mulberry32(11), params({ count: 1, gridSize: 3 }));
    const angles = patches.map((p) => p.initialOrientationDeg).sort((a, b) => a - b);
    for (const a of angles) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(180);
    }
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i] - angles[i - 1]).toBeGreaterThanOrEqual(STATIC_MIN_ANGLE_GAP_DEG - 1e-6);
    }
  });
});

describe('generateSpacedAngles', () => {
  it('count 個・[0,180)・slot 等分', () => {
    const angles = generateSpacedAngles(() => 0, 4); // offset=0
    expect(angles).toEqual([0, 45, 90, 135]);
  });

  it('count=0 で空配列', () => {
    expect(generateSpacedAngles(() => 0.5, 0)).toEqual([]);
  });

  it('多数（16 個）で slot<12° のときは等分（達成可能な最大の最小ギャップ）', () => {
    const angles = generateSpacedAngles(() => 0, 16);
    const slot = 180 / 16; // 11.25°
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i] - angles[i - 1]).toBeCloseTo(slot, 6);
    }
  });
});

describe('rng 注入で決定論', () => {
  it('同シードで同じ格子', () => {
    const a = generateRound(mulberry32(123), params({ count: 3, gridSize: 4 }));
    const b = generateRound(mulberry32(123), params({ count: 3, gridSize: 4 }));
    expect(a).toEqual(b);
  });

  it('異なるシードで配置が変わりうる', () => {
    const a = generateRound(mulberry32(1), params({ count: 2, gridSize: 4 }));
    const b = generateRound(mulberry32(2), params({ count: 2, gridSize: 4 }));
    const aChanging = a.filter(isChanging).map((p) => p.index);
    const bChanging = b.filter(isChanging).map((p) => p.index);
    expect(aChanging).not.toEqual(bChanging);
  });
});

describe('levelParamsToRoundGen（v3.2：第 2 引数 count）', () => {
  it('LevelParams ＋ 抽選済み count から RoundGenParams を作る', () => {
    const lp = levelToParams(1); // L1 = 全変数最易：repeat1/sec40/one-way/3x3/速6
    const rg = levelParamsToRoundGen(lp, 3);
    expect(rg).toEqual({
      gridSize: 3,
      count: 3,
      rotationSpeed: 6,
      direction: 'one-way',
    });
  });

  it('count は呼び出し側が渡した値がそのまま入る（個数はレベル外）', () => {
    const lp = levelToParams(1);
    expect(levelParamsToRoundGen(lp, 1).count).toBe(1);
    expect(levelParamsToRoundGen(lp, 5).count).toBe(5);
  });
});

describe('generateRoundFromLevel（v3.2：countRange から個数抽選）', () => {
  it('既定 countRange で L1（3x3）を生成・回転個数は [1,4] 内（half）', () => {
    const patches = generateRoundFromLevel(mulberry32(1), levelToParams(1));
    expect(patches).toHaveLength(9);
    const changing = patches.filter(isChanging).length;
    expect(changing).toBeGreaterThanOrEqual(1);
    expect(changing).toBeLessThanOrEqual(4); // half × 3x3 = floor(9/2)
  });

  it('countRange を渡すとその範囲から抽選される（fixed_1_4 → 最大 4）', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const patches = generateRoundFromLevel(
        mulberry32(seed),
        levelToParams(1),
        'fixed_1_4',
      );
      const changing = patches.filter(isChanging).length;
      expect(changing).toBeGreaterThanOrEqual(1);
      expect(changing).toBeLessThanOrEqual(4);
    }
  });

  it('cells_minus_1 では 4x4 で 4 を超える個数も出うる（個数がレベル非依存）', () => {
    const counts = new Set<number>();
    for (let seed = 1; seed <= 100; seed++) {
      const lp = levelToParams(41); // 4x4 を含むレベル
      expect(lp.gridSize).toBe(4);
      const patches = generateRoundFromLevel(mulberry32(seed), lp, 'cells_minus_1');
      counts.add(patches.filter(isChanging).length);
    }
    // 4x4・cells_minus_1 → [1,15]。少なくとも 1 つは 5 以上が出る。
    expect([...counts].some((c) => c >= 5)).toBe(true);
  });

  it('振動レベル（L21=振動・3x3）で direction=oscillate を生成', () => {
    const lp = levelToParams(21); // L21 = repeat1, 時40, 振動, 3x3, 速6
    expect(lp.direction).toBe('oscillate');
    const patches = generateRoundFromLevel(mulberry32(3), lp);
    const changing = patches.filter(isChanging);
    expect(changing.length).toBeGreaterThanOrEqual(1);
    for (const c of changing) expect(c.direction).toBe('oscillate');
  });

  it('同シード・同 countRange で決定論', () => {
    const a = generateRoundFromLevel(mulberry32(9), levelToParams(1), 'half');
    const b = generateRoundFromLevel(mulberry32(9), levelToParams(1), 'half');
    expect(a).toEqual(b);
  });
});
