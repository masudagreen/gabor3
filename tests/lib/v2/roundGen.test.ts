/**
 * roundGen.test.ts — ラウンド生成（個数分布・混在・種類割当・静止固定、F-01 / §9.3-9.4）。
 */

import { mulberry32 } from '../../../src/lib/v2/rng';
import {
  generateRound,
  pickChangingCount,
  maxChangingCount,
  generateSpacedAngles,
  STATIC_CPD_MIN,
  STATIC_CPD_MAX,
  STATIC_MIN_ANGLE_GAP_DEG,
  RoundGenParams,
} from '../../../src/lib/v2/roundGen';
import { isChanging } from '../../../src/lib/v2/patch';

const PARAMS: RoundGenParams = {
  gridSize: 4,
  rotationSpeed: 6,
  sfChangeSpeed: 0.15,
};

describe('maxChangingCount', () => {
  it('floor(n²/3) を返す（最低 1）', () => {
    expect(maxChangingCount(3)).toBe(3); // floor(9/3)
    expect(maxChangingCount(4)).toBe(5); // floor(16/3)
    expect(maxChangingCount(5)).toBe(8); // floor(25/3)
  });
});

describe('pickChangingCount', () => {
  it('常に 1〜max の範囲、0 は出さない（n=4）', () => {
    const rng = mulberry32(1);
    const max = maxChangingCount(4);
    const counts: number[] = [];
    for (let i = 0; i < 5000; i++) {
      const k = pickChangingCount(rng, 4);
      expect(k).toBeGreaterThanOrEqual(1);
      expect(k).toBeLessThanOrEqual(max);
      counts.push(k);
    }
    // 0 個が一度も出ない
    expect(counts.some((c) => c === 0)).toBe(false);
  });

  it('少なめ寄りの分布：個数 1 が個数 max より高頻度', () => {
    const rng = mulberry32(99);
    const freq = new Map<number, number>();
    for (let i = 0; i < 20000; i++) {
      const k = pickChangingCount(rng, 4);
      freq.set(k, (freq.get(k) ?? 0) + 1);
    }
    const max = maxChangingCount(4);
    expect((freq.get(1) ?? 0)).toBeGreaterThan(freq.get(max) ?? 0);
  });

  it('全候補個数が出現しうる（n=4 で 1..5 すべて）', () => {
    const rng = mulberry32(3);
    const seen = new Set<number>();
    for (let i = 0; i < 20000; i++) seen.add(pickChangingCount(rng, 4));
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5]));
  });
});

describe('generateSpacedAngles', () => {
  it('少数（slot≥12°）では隣接差が 12° 以上', () => {
    // count=5 → slot=36° ≥ 12°
    const rng = mulberry32(8);
    const angles = generateSpacedAngles(rng, 5);
    expect(angles).toHaveLength(5);
    const sorted = [...angles].sort((a, b) => a - b);
    // 円環なので隣接差 + 最後→最初の巻き戻り差をすべて確認
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
    gaps.push(180 - sorted[sorted.length - 1] + sorted[0]);
    gaps.forEach((g) =>
      expect(g).toBeGreaterThanOrEqual(STATIC_MIN_ANGLE_GAP_DEG - 1e-6),
    );
  });

  it('多数（slot<12°）でも達成可能な最大の最小ギャップ（完全等分 slot）を満たす', () => {
    // count=16 → slot=11.25°（12° は幾何学的に不可能）。等分されるはず。
    const rng = mulberry32(8);
    const angles = generateSpacedAngles(rng, 16);
    const sorted = [...angles].sort((a, b) => a - b);
    const slot = 180 / 16;
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(slot - 1e-6);
    }
  });

  it('全角度が 0–180 範囲内', () => {
    const rng = mulberry32(8);
    generateSpacedAngles(rng, 9).forEach((a) => {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(180);
    });
  });
});

describe('generateRound', () => {
  it('n×n 個のパッチを行優先 index で生成する', () => {
    const rng = mulberry32(1);
    const patches = generateRound(rng, PARAMS);
    expect(patches).toHaveLength(16);
    patches.forEach((p, i) => expect(p.index).toBe(i));
  });

  it('変化パッチが必ず 1 個以上、上限以下（複数回試行）', () => {
    for (let s = 0; s < 200; s++) {
      const rng = mulberry32(s);
      const patches = generateRound(rng, PARAMS);
      const changing = patches.filter(isChanging).length;
      expect(changing).toBeGreaterThanOrEqual(1);
      expect(changing).toBeLessThanOrEqual(maxChangingCount(4));
    }
  });

  it('変化パッチは全て回転（v2.0：周波数変化は廃止、changeKind=rotation のみ）', () => {
    for (let s = 0; s < 200; s++) {
      const rng = mulberry32(s);
      const changing = generateRound(rng, PARAMS).filter(isChanging);
      expect(changing.length).toBeGreaterThan(0); // 0 個は出さない
      changing.forEach((p) => expect(p.changeKind).toBe('rotation'));
    }
  });

  it('変化パッチも cpd は 2.0–4.0 の多様な固定値を持つ（様々な周波数のパッチを使用）', () => {
    const rng = mulberry32(7);
    generateRound(rng, PARAMS)
      .filter(isChanging)
      .forEach((p) => {
        expect(p.initialCpd).toBeGreaterThanOrEqual(STATIC_CPD_MIN);
        expect(p.initialCpd).toBeLessThanOrEqual(STATIC_CPD_MAX);
      });
  });

  it('静止パッチの初期 cpd は 2.0–4.0 の範囲', () => {
    const rng = mulberry32(2);
    generateRound(rng, PARAMS)
      .filter((p) => !isChanging(p))
      .forEach((p) => {
        expect(p.initialCpd).toBeGreaterThanOrEqual(STATIC_CPD_MIN);
        expect(p.initialCpd).toBeLessThanOrEqual(STATIC_CPD_MAX);
      });
  });

  it('静止パッチ同士の初期角度差は等分 slot 以上（弁別マージン §9.4）', () => {
    // n=4（16 セル）では slot=11.25°。全セルが等分配置されるため静止同士の差は
    // slot の整数倍 ≥ slot。slot≥12° となる小グリッドでは 12° 以上が保証される。
    const rng = mulberry32(4);
    const slot = 180 / (PARAMS.gridSize * PARAMS.gridSize);
    const staticAngles = generateRound(rng, PARAMS)
      .filter((p) => !isChanging(p))
      .map((p) => p.initialOrientationDeg)
      .sort((a, b) => a - b);
    for (let i = 1; i < staticAngles.length; i++) {
      expect(staticAngles[i] - staticAngles[i - 1]).toBeGreaterThanOrEqual(
        slot - 1e-6,
      );
    }
  });

  it('小グリッド（n=3、slot=20°）では静止同士が 12° 以上離れる', () => {
    const rng = mulberry32(40);
    const params = { ...PARAMS, gridSize: 3 };
    const staticAngles = generateRound(rng, params)
      .filter((p) => !isChanging(p))
      .map((p) => p.initialOrientationDeg)
      .sort((a, b) => a - b);
    for (let i = 1; i < staticAngles.length; i++) {
      expect(staticAngles[i] - staticAngles[i - 1]).toBeGreaterThanOrEqual(
        STATIC_MIN_ANGLE_GAP_DEG - 1e-6,
      );
    }
  });

  it('変化パッチは設定の a/b を保持する', () => {
    const rng = mulberry32(6);
    generateRound(rng, PARAMS)
      .filter(isChanging)
      .forEach((p) => {
        expect(p.rotationSpeed).toBe(6);
        expect(p.sfChangeSpeed).toBe(0.15);
      });
  });

  it('同一シードは同一ラウンドを生成する（決定論）', () => {
    const a = generateRound(mulberry32(77), PARAMS);
    const b = generateRound(mulberry32(77), PARAMS);
    expect(a).toEqual(b);
  });

  it('n=3 / n=5 でも個数上限を満たす', () => {
    for (const n of [3, 5]) {
      const rng = mulberry32(n * 10);
      const patches = generateRound(rng, { ...PARAMS, gridSize: n });
      expect(patches).toHaveLength(n * n);
      const changing = patches.filter(isChanging).length;
      expect(changing).toBeGreaterThanOrEqual(1);
      expect(changing).toBeLessThanOrEqual(maxChangingCount(n));
    }
  });
});
