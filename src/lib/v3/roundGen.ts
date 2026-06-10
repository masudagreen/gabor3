/**
 * roundGen.ts — v3.0 ラウンド（n×n 格子）生成（spec F-01 / §4.1 / system §7.2）。
 *
 * v3.0 の v2 からの本質的変更：
 * - **変化パッチ個数はレベルで確定**（`count`）。v2 の「個数ランダム抽選・少なめ寄り減衰」は
 *   廃止（spec §0：個数はレベルが決め、画面に明示する F-02）。
 * - 回転速度・方向（一方向/振動）はレベル値（全回転パッチ共通）。
 * - 空間周波数変化は廃止（cpd 固定）。
 *
 * 静止パッチはランダム初期角度で互いに離して固定し、「回転中／静止」の弁別を成立させる
 * （AS-10 / NF-28b、system §7.2）。乱数は Rng を注入（テスト決定論）。
 */

import { PatchDef, RotationDir } from './patch';
import type { LevelParams, Direction } from './level';
import { Rng, randFloat, sampleWithoutReplacement } from '../v2/rng';

/** 生成パラメータ（levelToParams の結果から必要分を抜き出したもの）。 */
export type RoundGenParams = {
  /** 格子サイズ n（n×n）。3〜6（v3.1 拡張）。 */
  gridSize: number;
  /** 回転パッチ個数（レベルで確定、1〜6）。生成時に格子容量でクランプされる（§4.7）。 */
  count: number;
  /** 回転速度（deg/sec）。 */
  rotationSpeed: number;
  /** 回転種別（一方向 / 振動）。 */
  direction: Direction;
};

/** 静止パッチ同士の最小角度差の狙い（system §7.2、12° 以上）。 */
export const STATIC_MIN_ANGLE_GAP_DEG = 12;

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

/** LevelParams（5 変数の実値）から RoundGenParams を作る。 */
export function levelParamsToRoundGen(params: LevelParams): RoundGenParams {
  return {
    gridSize: params.gridSize,
    count: params.count,
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

/** レベルの 5 変数から直接 1 ラウンドを生成するショートカット。 */
export function generateRoundFromLevel(
  rng: Rng,
  params: LevelParams,
): PatchDef[] {
  return generateRound(rng, levelParamsToRoundGen(params));
}
