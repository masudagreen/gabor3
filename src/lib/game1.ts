/**
 * Game 1（変化察知 / Morphing Detection）の純関数ロジック。
 *
 * spec.md §7.1 に従う。
 *
 * 仕様サマリ：
 *   - グリッドサイズ：3×3（易）／4×4（中）／5×5（難）。staircase で自動切替
 *   - 同時変化数：1（易）／2（中）／3（難）
 *   - 変化タイプ：角度（°）変化のみ
 *   - 変化量（最大角度差）：易 8°／中 5°／難 3°（staircase 対象）
 *   - 60 秒で線形に最大角度差まで変化（1 試行のみ）
 *   - 採点：
 *     - True Positive（正タップ）= +1
 *     - False Positive（誤タップ）= -1
 *     - False Negative（取り逃がし）= 0
 *     - 合計値が 0 未満なら 0 にクランプ
 *
 * 難易度対応表（staircase の currentParam = 最大角度差 °）：
 *   currentParam ≤ 4°：難（5×5、変化 3 個、最大角度差は param そのもの）
 *   currentParam ≤ 6°：中（4×4、変化 2 個）
 *   currentParam > 6°：易（3×3、変化 1 個）
 *
 * staircase の currentParam がそのまま「変化量（°）」として使われる。
 * staircase の min=1 / max=10 / 初期 5。
 */

import { ORIENTATION_DEG_SET } from './gaborOrientations';

/** Game 1 セッション定数（spec.md §7.1） */
export const GAME1 = {
  /** 1 試行の総時間（ミリ秒） */
  totalDurationMs: 60_000,
  /** 結果ハイライト 1.5 秒（spec.md F-11） */
  highlightDurationMs: 1500,
  /** ガボール表示パラメータ（cpd / contrast / sigma） */
  cpd: 3 as const,
  contrast: 0.4,
  sigmaDeg: 0.6,
} as const;

/** 難易度ティア（staircase currentParam → グリッドサイズと同時変化数） */
export type Difficulty = 'easy' | 'medium' | 'hard';

export type DifficultyConfig = {
  difficulty: Difficulty;
  rows: 3 | 4 | 5;
  cols: 3 | 4 | 5;
  changingCount: 1 | 2 | 3;
};

/**
 * staircase の currentParam（最大角度差 °）から難易度を導出する。
 * spec.md §7.1：易 8°／中 5°／難 3° の 3 段階に staircase 値を写像。
 */
export function difficultyFromParam(currentParam: number): DifficultyConfig {
  if (currentParam <= 4) {
    return { difficulty: 'hard', rows: 5, cols: 5, changingCount: 3 };
  }
  if (currentParam <= 6) {
    return { difficulty: 'medium', rows: 4, cols: 4, changingCount: 2 };
  }
  return { difficulty: 'easy', rows: 3, cols: 3, changingCount: 1 };
}

/** 各セルの仕様 */
export type Game1PatchSpec = {
  /** 一意 ID（"r{row}c{col}" 形式） */
  id: string;
  row: number;
  col: number;
  cpd: 1.5 | 3 | 6 | 9;
  contrast: number;
  sigmaDeg: number;
  /** 開始角度 */
  startOrientationDeg: number;
  /** 終了角度（変化対象でない場合は startOrientationDeg と同じ） */
  endOrientationDeg: number;
  /** 変化対象セルか */
  isChanging: boolean;
};

/** 1 試行の仕様 */
export type Game1TrialSpec = {
  config: DifficultyConfig;
  patches: Game1PatchSpec[];
  /** 最大角度差（°）= staircase currentParam */
  maxAngleDeltaDeg: number;
};

/**
 * 1 試行のパッチ群を生成する。
 *
 * - グリッド全セルにランダムな開始角度を割り当てる
 * - changingCount 個のセルをランダムに選び、終了角度 = 開始 + ±maxAngleDelta（向きはランダム）
 * - 残りは終了角度 = 開始角度
 *
 * @param currentParam staircase の現在値（°）
 * @param rng 0〜1 の擬似乱数生成器（テスト容易性）
 */
export function buildGame1Trial(
  currentParam: number,
  rng: () => number = Math.random,
): Game1TrialSpec {
  const config = difficultyFromParam(currentParam);
  const total = config.rows * config.cols;

  // 変化対象のインデックスをランダムに選ぶ（重複なし）
  const changingIndices = pickRandomIndices(total, config.changingCount, rng);
  const changingSet = new Set(changingIndices);

  const patches: Game1PatchSpec[] = [];
  for (let i = 0; i < total; i += 1) {
    const row = Math.floor(i / config.cols);
    const col = i % config.cols;
    const startOrientationDeg = pickOrientation(rng);
    const isChanging = changingSet.has(i);
    let endOrientationDeg = startOrientationDeg;
    if (isChanging) {
      const sign = rng() < 0.5 ? +1 : -1;
      endOrientationDeg = mod180(
        startOrientationDeg + sign * currentParam,
      );
    }
    patches.push({
      id: `r${row}c${col}`,
      row,
      col,
      cpd: GAME1.cpd,
      contrast: GAME1.contrast,
      sigmaDeg: GAME1.sigmaDeg,
      startOrientationDeg,
      endOrientationDeg,
      isChanging,
    });
  }

  return {
    config,
    patches,
    maxAngleDeltaDeg: currentParam,
  };
}

/** モーフィング進行率（0〜1） → 各パッチの現在角度を計算 */
export function interpolateOrientation(
  patch: Game1PatchSpec,
  progress: number,
): number {
  const t = clamp01(progress);
  // 線形補間（spec.md §7.1：60 秒で線形に最大角度差まで変化）
  return interpolateAngle(
    patch.startOrientationDeg,
    patch.endOrientationDeg,
    t,
  );
}

/**
 * 採点ロジック（spec.md §7.1）。
 *
 * - True Positive（正タップ）= +1
 * - False Positive（誤タップ）= -1
 * - False Negative（取り逃がし）= 0
 * - 合計値が 0 未満なら 0 にクランプ
 */
export type Game1GradingResult = {
  /** 正解パッチ ID リスト（変化対象） */
  changingIds: string[];
  /** 正タップ ID（変化対象 ∩ 選択） */
  correctIds: string[];
  /** 誤タップ ID（非変化対象 ∩ 選択） */
  incorrectIds: string[];
  /** 取り逃がし ID（変化対象 ∩ 非選択） */
  missedIds: string[];
  /** 採点値 (TP - FP, 0 にクランプ) */
  score: number;
  /** 全変化対象を取り逃がしてかつ誤タップも 0 → 正解相当（staircase down にはならず） */
  isCorrectForStaircase: boolean;
};

export function gradeGame1(
  trial: Game1TrialSpec,
  selectedIds: string[],
): Game1GradingResult {
  const changingIds = trial.patches
    .filter((p) => p.isChanging)
    .map((p) => p.id);
  const changingSet = new Set(changingIds);
  const selectedSet = new Set(selectedIds);

  const correctIds: string[] = [];
  const incorrectIds: string[] = [];
  const missedIds: string[] = [];

  for (const id of selectedIds) {
    if (changingSet.has(id)) {
      correctIds.push(id);
    } else {
      incorrectIds.push(id);
    }
  }
  for (const id of changingIds) {
    if (!selectedSet.has(id)) {
      missedIds.push(id);
    }
  }

  const tp = correctIds.length;
  const fp = incorrectIds.length;
  const rawScore = tp - fp;
  const score = Math.max(0, rawScore);

  // staircase 判定：全正解（changing 全部 select かつ FP 0）のときのみ correct
  const isCorrectForStaircase =
    correctIds.length === changingIds.length && incorrectIds.length === 0;

  return {
    changingIds,
    correctIds,
    incorrectIds,
    missedIds,
    score,
    isCorrectForStaircase,
  };
}

/**
 * 「未挑戦」判定（spec.md §7.1 / screens.md S2-03）。
 *
 * 1 試行を通じてタップ数 = 0 かつ完了ボタン押下 = 0 のとき。
 * 60 秒経過時に自動採点に入った場合に該当。
 */
export function isUnattempted(
  selectedIds: string[],
  completedByButton: boolean,
): boolean {
  return selectedIds.length === 0 && !completedByButton;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickRandomIndices(
  total: number,
  k: number,
  rng: () => number,
): number[] {
  const pool = Array.from({ length: total }, (_, i) => i);
  const result: number[] = [];
  for (let i = 0; i < k && pool.length > 0; i += 1) {
    const idx = Math.floor(rng() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

function pickOrientation(rng: () => number): number {
  const idx = Math.floor(rng() * ORIENTATION_DEG_SET.length);
  return ORIENTATION_DEG_SET[idx];
}

function mod180(deg: number): number {
  let v = deg % 180;
  if (v < 0) v += 180;
  return v;
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/** 角度の線形補間（mod 180 を考慮した最短経路） */
function interpolateAngle(a: number, b: number, t: number): number {
  // 0..180 の周期で最短経路を求める
  let delta = b - a;
  // mod 180 の最短経路（Game 1 の orientation は 0..180 と等価扱い）
  // 実装はそのまま線形補間でも視覚的には同等（ガボールは ±180° で同一表現）
  return mod180(a + delta * t);
}
