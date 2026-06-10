/**
 * roundGen.test.ts — v3.0 ラウンド生成の単体テスト（spec F-01 / §4.1 / system §7.2）。
 *
 * 検証範囲：
 * - 個数はレベルで確定（count 個ちょうどが回転、ランダム抽選なし）。
 * - 格子サイズ n×n のセル数。
 * - 回転パッチは全て同じ rotationSpeed / direction（一方向/振動）。
 * - 静止パッチは時間変化なし・互いに離れた初期角度。
 * - rng 注入で決定論（同シードで同結果）。
 */

import {
  generateRound,
  generateRoundFromLevel,
  levelParamsToRoundGen,
  generateSpacedAngles,
  clampCountToGrid,
  STATIC_MIN_ANGLE_GAP_DEG,
  type RoundGenParams,
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

describe('generateRound — 個数固定（v2 のランダム抽選を廃止）', () => {
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

  it('count を変えると回転個数だけが変わる（抽選由来のばらつきがない）', () => {
    // 同シードでも count を変えれば回転個数は count に一致する（決定的）。
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
    // gridSize 3（9 セル）に count 9 を渡しても 8 にクランプされ静止 1 つ残る。
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
    // 各々 'cw' か 'ccw' のいずれか（妥当な値）。
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
    // 3x3・count=1 → 全 9 パッチに spacedAngles を割当（slot=20°）。
    const patches = generateRound(mulberry32(11), params({ count: 1, gridSize: 3 }));
    const angles = patches.map((p) => p.initialOrientationDeg).sort((a, b) => a - b);
    for (const a of angles) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(180);
    }
    // 9 個等分の slot=20° ≥ 12°：隣接差が 12° 以上
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

describe('levelParamsToRoundGen / generateRoundFromLevel', () => {
  it('LevelParams から RoundGenParams を抽出する', () => {
    const lp = levelToParams(1); // L1 = 全変数最易：count1/sec40/one-way/3x3/速6
    const rg = levelParamsToRoundGen(lp);
    expect(rg).toEqual({
      gridSize: 3,
      count: 1,
      rotationSpeed: 6,
      direction: 'one-way',
    });
  });

  it('generateRoundFromLevel が L1 で 3x3・回転 1 個を生成', () => {
    const patches = generateRoundFromLevel(mulberry32(1), levelToParams(1));
    expect(patches).toHaveLength(9);
    expect(patches.filter(isChanging)).toHaveLength(1);
  });

  it('振動レベル（L21=振動・3x3・count1）で direction=oscillate を生成', () => {
    const lp = levelToParams(21); // L21 = 個数1, 時40, 振動, 3x3, 速6（spec §4.2 例）
    expect(lp.direction).toBe('oscillate');
    const patches = generateRoundFromLevel(mulberry32(3), lp);
    const changing = patches.filter(isChanging);
    expect(changing).toHaveLength(1);
    expect(changing[0].direction).toBe('oscillate');
  });
});
