/**
 * roundGen.ts — v3 ラウンド（n×n 格子）生成（spec F-01 / §4.9 / system §7.2）。
 *
 * v3.2 の本質的変更：
 * - **個数は難易度軸ではなくなった**。各ラウンドで回転パッチ数を `countRange`
 *   プリセットの範囲から**ランダム抽選**する（spec §4.9・AS-36、教示は「全て探せ」F-02）。
 *   v3.0〜v3.1 の「個数はレベルで確定」は廃止。
 * - 回転速度・方向（一方向/振動）はレベル値（全回転パッチ共通）。
 * - 空間周波数変化は廃止（cpd 固定）。
 *
 * 静止パッチはランダム初期角度で互いに離して固定し、「回転中／静止」の弁別を成立させる
 * （AS-10 / NF-28b、system §7.2）。乱数は Rng を注入（テスト決定論）。
 */

import { PatchDef, RotationDir } from './patch';
import type { LevelParams, Direction } from './level';
import { Rng, randFloat, sampleWithoutReplacement } from '../v2/rng';

/**
 * 個数範囲プリセット（spec §4.9・AS-36、設定 Settings.countRange）。
 * - 'cells_minus_1'：1 〜 (gridSize²−1)（最大限ランダム）
 * - 'half'：1 〜 floor(gridSize²/2)（過密回避の中庸）
 * - 'fixed_1_4'：1 〜 4（サイズ非依存）
 */
export type CountRangePreset = 'cells_minus_1' | 'half' | 'fixed_1_4';

/** countRange プリセットの一覧（設定 UI 用）。 */
export const COUNT_RANGE_PRESETS: readonly CountRangePreset[] = [
  'cells_minus_1',
  'half',
  'fixed_1_4',
];

/** 既定の個数範囲プリセット（spec §4.9、Designer/Generator 仮置き＝中庸の 'half'）。 */
export const DEFAULT_COUNT_RANGE: CountRangePreset = 'half';

/** 生成パラメータ（levelToParams の結果＋抽選後の個数）。 */
export type RoundGenParams = {
  /** 格子サイズ n（n×n）。3〜6（v3.1 拡張）。 */
  gridSize: number;
  /** 回転パッチ個数（v3.2：countRange から抽選した実値）。生成時に格子容量でクランプ（§4.7）。 */
  count: number;
  /** 回転速度（deg/sec）。 */
  rotationSpeed: number;
  /** 回転種別（一方向 / 振動）。 */
  direction: Direction;
};

/** 静止パッチ同士の最小角度差の狙い（system §7.2、12° 以上）。 */
export const STATIC_MIN_ANGLE_GAP_DEG = 12;

/**
 * countRange プリセット × 格子サイズ → 回転個数の [min, max]（両端含む、spec §4.9）。
 *
 * いずれのプリセットでも、回転個数 < gridSize²（静止パッチが最低 1 つ残る）となるよう
 * max を gridSize²−1 でクランプし、min ≥ 1・min ≤ max を保証する。
 * 純関数。
 */
export function countRangeBounds(
  preset: CountRangePreset,
  gridSize: number,
): { min: number; max: number } {
  const cellCount = gridSize * gridSize;
  const hardMax = Math.max(1, cellCount - 1); // 静止 1 つ以上（§4.7）
  let max: number;
  switch (preset) {
    case 'cells_minus_1':
      max = cellCount - 1;
      break;
    case 'fixed_1_4':
      max = 4;
      break;
    case 'half':
    default:
      max = Math.floor(cellCount / 2);
      break;
  }
  max = Math.min(Math.max(1, max), hardMax);
  return { min: 1, max };
}

/**
 * countRange プリセット × 格子サイズから、1 ラウンドの回転個数をランダム抽選する（spec §4.9）。
 * [min, max]（両端含む）の一様整数。最後に格子容量でクランプ（§4.7）。
 */
export function pickRoundCount(
  rng: Rng,
  preset: CountRangePreset,
  gridSize: number,
): number {
  const { min, max } = countRangeBounds(preset, gridSize);
  const picked = Math.floor(randFloat(rng, min, max + 1));
  const bounded = Math.min(Math.max(picked, min), max);
  return clampCountToGrid(bounded, gridSize);
}

/**
 * 有効な回転パッチ個数を格子容量でクランプする（spec §4.7 / NF-28d）。
 *
 * 個数は格子セル数（gridSize²）を超えてはならず、さらに**静止パッチが最低 1 つ残る**よう
 * `gridSize² − 1` を上限とする。下限は 1（回転パッチは最低 1 つ必要＝クリア判定が成立する）。
 *
 * 例：count 6 × 3x3（9 セル）→ min(6, 8)=6（静止 3 つ残る）。
 *     count 6 × 2x2 相当の極小格子があっても静止 1 つは必ず残る。
 *
 * 純関数。クランプはラウンド生成時にのみ働き、レベル ⇄ 5 変数の梯子定義（総レベル数）は変えない。
 */
export function clampCountToGrid(count: number, gridSize: number): number {
  const cellCount = gridSize * gridSize;
  const maxChanging = Math.max(1, cellCount - 1);
  return Math.min(Math.max(count, 1), maxChanging);
}

/**
 * LevelParams（難易度変数）＋抽選済み個数 → RoundGenParams を作る（v3.2）。
 * 個数はレベルに含まれないため、呼び出し側が `pickRoundCount` 等で解決した値を渡す。
 */
export function levelParamsToRoundGen(
  params: LevelParams,
  count: number,
): RoundGenParams {
  return {
    gridSize: params.gridSize,
    count,
    rotationSpeed: params.rotationSpeed,
    direction: params.direction,
  };
}

function pickRotationDir(rng: Rng): RotationDir {
  return rng() < 0.5 ? 'cw' : 'ccw';
}

/**
 * 互いになるべく離れた初期角度を count 個生成する（system §7.2 弁別マージン）。
 *
 * 0–180 度を count 個に等分（スロット幅 slot = 180/count）し、全体を共通の
 * ランダムオフセットで回転させる。隣接角度の差は常に slot に等しく、最小ギャップ = slot。
 * slot ≥ 12° のとき（静止パッチが少数）は 12° 以上を満たす。多数で slot < 12° の場合は
 * 幾何学的に 12° を全ペアで満たせないため、達成可能な最大の最小ギャップ（= slot）を採る。
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
 *
 * - 回転パッチを `count`（格子容量でクランプ後の有効個数）個ランダム位置に配置。
 * - 回転パッチは全て同じ rotationSpeed / direction（そのレベルの値）。一方向時の向き（CW/CCW）は
 *   パッチごとにランダム（「一方向であること」が弁別できればよい、screens.md §1.1）。
 * - 残りは静止パッチ（changeKind=null）。互いに離れた初期角度で固定（NF-28b）。
 */
export function generateRound(rng: Rng, params: RoundGenParams): PatchDef[] {
  const { gridSize, count, rotationSpeed, direction } = params;
  const cellCount = gridSize * gridSize;
  const indices = Array.from({ length: cellCount }, (_, i) => i);

  // 過密回避（§4.7 / NF-28d）：有効個数を格子容量でクランプし、静止パッチを最低 1 つ残す。
  const effectiveCount = clampCountToGrid(count, gridSize);

  const changingIndices = new Set(
    sampleWithoutReplacement(rng, indices, effectiveCount),
  );

  // 全パッチの初期角度を互いに離して割り当てる（静止の弁別マージンを保証しつつ
  // 回転パッチにも自然な初期分散を与える）。
  const spacedAngles = generateSpacedAngles(rng, cellCount);

  const patches: PatchDef[] = [];
  for (let index = 0; index < cellCount; index++) {
    const initialOrientationDeg = spacedAngles[index];

    if (changingIndices.has(index)) {
      patches.push({
        index,
        changeKind: 'rotation',
        initialOrientationDeg,
        rotationSpeed,
        rotationDir: pickRotationDir(rng),
        direction,
      });
    } else {
      patches.push({
        index,
        changeKind: null,
        initialOrientationDeg,
        rotationSpeed,
        rotationDir: 'cw',
        direction,
      });
    }
  }
  return patches;
}

/**
 * レベルの難易度変数 ＋ countRange プリセットから直接 1 ラウンドを生成するショートカット（v3.2）。
 * 個数は `countRange` × `params.gridSize` から抽選する（spec §4.9）。
 */
export function generateRoundFromLevel(
  rng: Rng,
  params: LevelParams,
  countRange: CountRangePreset = DEFAULT_COUNT_RANGE,
): PatchDef[] {
  const count = pickRoundCount(rng, countRange, params.gridSize);
  return generateRound(rng, levelParamsToRoundGen(params, count));
}
