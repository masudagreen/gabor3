/**
 * roundGen.ts — ラウンド（n×n 格子）生成（spec F-01 / system §9.3・§9.4）。
 *
 * - 変化パッチ個数 k：1〜floor(n²/3)、少なめ寄りの減衰分布、0 個は出さない。
 * - 変化の内訳：**回転のみ**（v2.0 仕様変更で周波数変化アニメは廃止）。
 * - 回転方向 CW/CCW は独立ランダム（AS-13）。
 * - 全パッチ：様々な固定 cpd（2.0–4.0）と互いに離れた初期角度。cpd は時間変化しない。
 *
 * 乱数は Rng を注入（テスト決定論）。個数・種類・内訳は UI 非表示（state には持つ）。
 */

import {
  ChangeKind,
  PatchDef,
  RotationDir,
  SfDir,
} from './patch';
import { Rng, randFloat, randInt, sampleWithoutReplacement } from './rng';

/** 生成パラメータ（Settings の n/a/b から渡される）。 */
export type RoundGenParams = {
  /** 格子サイズ n（n×n） */
  gridSize: number;
  /** 回転速度 a（deg/sec） */
  rotationSpeed: number;
  /** 周波数変化速度 b（hz/sec） */
  sfChangeSpeed: number;
};

/** 静止パッチ初期 cpd の範囲（§9.4）。 */
export const STATIC_CPD_MIN = 2.0;
export const STATIC_CPD_MAX = 4.0;

/** 静止パッチ同士の最小角度差（§9.4、a 最大 12°/s × 1 秒より大きく取る）。 */
export const STATIC_MIN_ANGLE_GAP_DEG = 12;

/**
 * 変化パッチ個数 k の上限（floor(n²/3)、最低 1）。
 * n=3→3、n=4→5、n=5→8。
 */
export function maxChangingCount(gridSize: number): number {
  return Math.max(1, Math.floor((gridSize * gridSize) / 3));
}

/**
 * 変化パッチ個数 k を抽選する。1〜maxChangingCount、少なめ寄りの減衰分布、0 は出さない。
 * 重み w(k) = 1/k（調和減衰）で k が小さいほど高確率。
 */
export function pickChangingCount(rng: Rng, gridSize: number): number {
  const max = maxChangingCount(gridSize);
  const weights: number[] = [];
  let total = 0;
  for (let k = 1; k <= max; k++) {
    const w = 1 / k;
    weights.push(w);
    total += w;
  }
  let target = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    target -= weights[i];
    if (target < 0) return i + 1;
  }
  return max;
}

function pickRotationDir(rng: Rng): RotationDir {
  return rng() < 0.5 ? 'cw' : 'ccw';
}

function pickSfDir(rng: Rng): SfDir {
  return rng() < 0.5 ? 'increase' : 'decrease';
}

/**
 * 互いになるべく離れた初期角度を count 個生成する（§9.4 弁別マージン）。
 *
 * 0–180 度を count 個に等分（スロット幅 slot = 180/count）し、全体を共通の
 * ランダムオフセットで回転させる。隣接角度の差は常に slot に等しくなるため、
 * 最小ギャップ = slot が保証される（リジェクションサンプリングの無限ループ回避）。
 *
 * slot ≥ STATIC_MIN_ANGLE_GAP_DEG（12°）のとき（静止パッチが少数のとき）は
 * 12° 以上を満たす。多数（n=4 で 16 個・n=5 で 25 個など、slot < 12°）の場合は
 * 幾何学的に 12° を全ペアで満たせないため、達成可能な最大の最小ギャップ（= slot、
 * 完全等分）を採る。これが「互いになるべく離す」の最善解。
 */
export function generateSpacedAngles(rng: Rng, count: number): number[] {
  if (count <= 0) return [];
  const slot = 180 / count;
  const offset = randFloat(rng, 0, 180);
  const angles: number[] = [];
  for (let i = 0; i < count; i++) {
    angles.push((offset + i * slot) % 180);
  }
  return angles;
}

/**
 * 1 ラウンド分の PatchDef[] を生成する（行優先 index 0..n²-1）。
 * 変化パッチを k 個ランダム選定し、残りを静止パッチにする。
 */
export function generateRound(rng: Rng, params: RoundGenParams): PatchDef[] {
  const { gridSize, rotationSpeed, sfChangeSpeed } = params;
  const cellCount = gridSize * gridSize;
  const indices = Array.from({ length: cellCount }, (_, i) => i);

  const k = pickChangingCount(rng, gridSize);
  const changingIndices = new Set(
    sampleWithoutReplacement(rng, indices, k),
  );

  // 全パッチの初期角度を互いに離して割り当てる（静止の弁別マージンを保証しつつ
  // 変化パッチにも自然な初期分散を与える）。
  const spacedAngles = generateSpacedAngles(rng, cellCount);

  const patches: PatchDef[] = [];
  for (let index = 0; index < cellCount; index++) {
    const initialOrientationDeg = spacedAngles[index];
    const initialCpd = randFloat(rng, STATIC_CPD_MIN, STATIC_CPD_MAX);

    if (changingIndices.has(index)) {
      // v2.0 仕様変更：変化は**回転のみ**（周波数変化アニメは廃止）。
      // cpd は initialCpd（様々な固定値）のまま不変。
      patches.push({
        index,
        changeKind: 'rotation',
        initialOrientationDeg,
        initialCpd,
        rotationSpeed,
        rotationDir: pickRotationDir(rng),
        sfChangeSpeed,
        sfDir: pickSfDir(rng),
      });
    } else {
      patches.push({
        index,
        changeKind: null,
        initialOrientationDeg,
        initialCpd,
        rotationSpeed,
        rotationDir: 'cw',
        sfChangeSpeed,
        sfDir: 'increase',
      });
    }
  }
  return patches;
}
