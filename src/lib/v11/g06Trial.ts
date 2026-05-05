/**
 * G-06 ガウス窓サイズ弁別の純関数ロジック（spec-v11.md §7.6、screens.md S14-02）。
 *
 * G-05（空間周波数弁別）の構造をほぼそのまま流用：staircase 連動先を「cpd 比」
 * から「ガウス窓 SD 比」に置き換えただけ。
 *
 * v1.1 仕様（spec-v11.md §7.6）：
 *   - 左右 2 ガボール（cpd・コントラスト・向き同一）でガウス窓 SD のみ異なる
 *   - 60 秒同時提示（マスクなし、点滅なし、フェードなし）
 *   - 「左が大きい」/「右が大きい」の 2 択
 *   - staircase: SD 比、min=1.1（難・小差）/ max=2.0（易・大差）/ initial=1.5、
 *     step=0.1（gameRegistry に登録済み）
 *   - 採点：選択が大きい SD 側と一致なら正解
 *   - 1 試行 60 秒、確定ボタンなし、自由回答変更可、自動採点（OPT-12）
 *
 * 「SD 比」は左右 2 パッチのガウス窓 SD の比 r（>=1）。小さい SD 側を
 * `base / sqrt(r)`、大きい SD 側を `base * sqrt(r)` に置く幾何平均分割：
 *   - 比 1.0 → 左右同じ（境界、staircase 範囲外）
 *   - 比 1.5（初期）→ 小=base/√1.5≈base*0.816、大=base*√1.5≈base*1.225
 *   - 比 2.0（最易）→ 小=base/√2≈base*0.707、大=base*√2≈base*1.414
 *   - 比 1.1（最難）→ 小=base/√1.1≈base*0.953、大=base*√1.1≈base*1.049
 * 比が小さいほど判別困難。
 *
 * 純関数のみ。AsyncStorage / RN は触らない（テスト容易性）。
 */

import { ViewingDistanceCm } from '../calibration';

/** 左右どちらか */
export type G06Side = 'left' | 'right';

/**
 * 1 ガボールの spec（GE-06 描画用、GE-02 / GE-04 / GE-05 と同型）。
 *
 * G-06 では sigmaDeg を staircase 比で連続的に変えるため、cpd と同じく
 * `number` 型で扱う（GaborPatch は元から sigmaDeg を number で受理）。
 */
export type G06GaborSpec = {
  cpd: number;
  contrast: number;
  sigmaDeg: number;
  orientationDeg: number;
  phaseRad: number;
};

/** 1 試行の左右ガボールスペックと正解側 */
export type G06TrialSpec = {
  /** 左ガボール spec */
  left: G06GaborSpec;
  /** 右ガボール spec */
  right: G06GaborSpec;
  /** 大 SD（=「大きい」=正解）側 */
  correctSide: G06Side;
  /** 今回の staircase SD 比（>=1） */
  paramValueRatio: number;
  /** 基準（中央）SD（°）。左右はこの ÷√r / ×√r に置く */
  baseSigmaDeg: number;
};

/** G-06 採点結果 */
export type G06GradingResult = {
  /** 大 SD 側 = 正解側 */
  correctSide: G06Side;
  /** ユーザーが最終的に選んだ側（null = 未回答） */
  userAnswer: G06Side | null;
  /** 採点結果 */
  isCorrect: boolean;
  /** 未回答かどうか（60 秒経過時に未選択） */
  unattempted: boolean;
};

/**
 * 共通ガボール描画パラメータ（sigmaDeg は動的に上書きされる）。
 *
 * spec-v11.md §6.1 / §7.6：sigmaDeg のみ可変。cpd・コントラスト・向きは左右同一。
 * cpd は中域 4 cpd（spec §6.1 の 1.5〜9 範囲内）、コントラスト 0.4（視認性十分）、
 * 向きはランダム。これらは G-05 の方針と整合。
 */
export const G06_GABOR_PARAMS = {
  cpd: 4,
  contrast: 0.4,
} satisfies {
  cpd: number;
  contrast: number;
};

/**
 * 基準（中央）SD（°）。
 *
 * 左右の sigmaDeg は `baseSigma / √r`（小）と `baseSigma * √r`（大）の関係。
 * spec §6.1 の SD 範囲（0.3°〜1.0°）の幾何中心付近に置きつつ、最易 r=2.0 でも
 * 左右が `baseSigma / √2 ≈ 0.42` / `baseSigma * √2 ≈ 0.85` に収まるよう中央 0.6 を
 * 採用（G-05 G05_GABOR_PARAMS.sigmaDeg と同値）：
 *   - r=1.5（初期）→ 小≈0.49、大≈0.73
 *   - r=2.0（最易）→ 小≈0.42、大≈0.85
 *   - r=1.1（最難）→ 小≈0.57、大≈0.63
 * これにより spec §6.1 の SD 範囲 0.3〜1.0 に収まる。
 */
export const G06_BASE_SIGMA_DEG = 0.6;

/** 1 試行 60 秒、固視点 500ms（spec-v11.md §7.6 / OPT-12 統一） */
export const GAME6_V11 = {
  /** OPT-11 強制 60 秒視聴、早期終了不可 */
  totalDurationMs: 60_000,
  /** 固視点表示（提示前の整え、screens.md S14-02 フェーズタイミング表） */
  fixationDurationMs: 500,
  /** 採点直後の正解開示ハイライト時間（screens.md S14-03） */
  correctRevealMs: 1500,
} as const;

/**
 * 1 試行の左右ガボール spec を生成する。
 *
 * 「大 SD 側（=広いガウス窓側）= 正解側」と定義する。基準 SD（G06_BASE_SIGMA_DEG）
 * から `× √r` / `÷ √r` で左右の sigmaDeg を分ける幾何平均分割。どちらが大 SD 側に
 * なるかは rng で 50% ずつにランダム化する。
 *
 * 向きとコントラストと cpd は左右同一（spec §7.6）でランダム角度。位相は左右独立に
 * ランダム。
 *
 * @param paramValueRatio 現在の staircase SD 比（>=1、典型 1.1〜2.0）
 * @param rng 0〜1 の擬似乱数生成器（テスト容易性、デフォルト Math.random）
 */
export function buildG06Trial(
  paramValueRatio: number,
  rng: () => number = Math.random,
): G06TrialSpec {
  const orientationDeg = rng() * 180; // 0〜180° 一様（左右同じ向き）

  // r < 1 を防ぐ（staircase が万一壊れた場合の保険）
  const r = Math.max(1, paramValueRatio);
  const sqrtR = Math.sqrt(r);

  // 「大 SD 側」を左／右どちらに置くか
  const correctSide: G06Side = rng() < 0.5 ? 'left' : 'right';
  const leftIsLarge = correctSide === 'left';

  const leftSigma = clampSigma(
    leftIsLarge ? G06_BASE_SIGMA_DEG * sqrtR : G06_BASE_SIGMA_DEG / sqrtR,
  );
  const rightSigma = clampSigma(
    leftIsLarge ? G06_BASE_SIGMA_DEG / sqrtR : G06_BASE_SIGMA_DEG * sqrtR,
  );

  return {
    left: {
      cpd: G06_GABOR_PARAMS.cpd,
      contrast: G06_GABOR_PARAMS.contrast,
      sigmaDeg: leftSigma,
      orientationDeg,
      phaseRad: rng() * 2 * Math.PI,
    },
    right: {
      cpd: G06_GABOR_PARAMS.cpd,
      contrast: G06_GABOR_PARAMS.contrast,
      sigmaDeg: rightSigma,
      orientationDeg,
      phaseRad: rng() * 2 * Math.PI,
    },
    correctSide,
    paramValueRatio: roundRatio(r),
    baseSigmaDeg: G06_BASE_SIGMA_DEG,
  };
}

/**
 * 採点：選択が大 SD 側（=「大きい」側）と一致なら正解。
 * userAnswer が null（未回答）の場合は不正解扱い、unattempted=true。
 */
export function gradeG06(
  trial: G06TrialSpec,
  userAnswer: G06Side | null,
): G06GradingResult {
  if (userAnswer === null) {
    return {
      correctSide: trial.correctSide,
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
    };
  }
  return {
    correctSide: trial.correctSide,
    userAnswer,
    isCorrect: userAnswer === trial.correctSide,
    unattempted: false,
  };
}

/** 「左が大きい」「右が大きい」の日本語表示文字列（screens.md S14-03） */
export function sideToSizeJaLabel(side: G06Side): string {
  return side === 'left' ? '左が大きい' : '右が大きい';
}

/** ユーザー回答（null 含む）→ 表示文字列。null は呼び出し側で「未回答」処理 */
export function userAnswerToSizeLabel(side: G06Side | null): string | null {
  if (side === null) return null;
  return sideToSizeJaLabel(side);
}

/**
 * レスポンシブなパッチサイズとギャップ（screens.md S14 §4）。
 *
 * GE-06 は GE-02 / GE-04 / GE-05 と同じレイアウト系統（screens.md §4 表の
 * G-06 列「100 / 120 / 140 / 160」）のため、computeG05StimulusLayout と
 * 同一テーブルを共有する。テスト独立性のため本モジュールでも再定義。
 *
 * | viewport 幅 | パッチ一辺 | ギャップ |
 * |---|---|---|
 * | <=360px | 100 | 24 |
 * | <=375px | 120 | 32 |
 * | <=767px | 120 | 32 |
 * | 768〜1279px | 140 | 48 |
 * | >=1280px | 160 | 64 |
 */
export function computeG06StimulusLayout(
  viewportWidthOrSize: number | { widthPx: number; heightPx?: number },
  viewportHeightPx?: number,
): {
  patchSizePx: number;
  gapPx: number;
} {
  let widthPx: number;
  let heightPx: number | undefined;
  if (typeof viewportWidthOrSize === 'number') {
    widthPx = viewportWidthOrSize;
    heightPx = viewportHeightPx;
  } else {
    widthPx = viewportWidthOrSize.widthPx;
    heightPx = viewportWidthOrSize.heightPx;
  }

  let layout: { patchSizePx: number; gapPx: number };
  if (widthPx <= 360) {
    layout = { patchSizePx: 100, gapPx: 24 };
  } else if (widthPx <= 375) {
    layout = { patchSizePx: 120, gapPx: 32 };
  } else if (widthPx < 768) {
    layout = { patchSizePx: 120, gapPx: 32 };
  } else if (widthPx < 1280) {
    layout = { patchSizePx: 140, gapPx: 48 };
  } else {
    layout = { patchSizePx: 160, gapPx: 64 };
  }

  // 高さが極端に小さい場合の safety
  if (heightPx !== undefined && heightPx < layout.patchSizePx + 200) {
    if (layout.patchSizePx === 160) {
      layout = { patchSizePx: 140, gapPx: 48 };
    } else if (layout.patchSizePx === 140 && heightPx < 140 + 200) {
      layout = { patchSizePx: 120, gapPx: 32 };
    } else if (layout.patchSizePx === 120 && heightPx < 120 + 200) {
      layout = { patchSizePx: 100, gapPx: 24 };
    }
  }

  return layout;
}

/**
 * sigmaDeg の浮動小数点誤差を丸める。
 * `0.6 * Math.sqrt(1.5)` のような演算は無理数の近似値しか得られないが、
 * `GaborPatch` の描画では十分な精度のため、表示用の小数 6 桁で揃える。
 */
function clampSigma(v: number): number {
  // 物理的には正の値、念のため下限 0
  const clamped = Math.max(0, v);
  return Math.round(clamped * 1_000_000) / 1_000_000;
}

/**
 * 比そのものの浮動小数点誤差を丸める。staircase の step=0.1 で
 * `1.5 + 0.1 = 1.5999999999999996` のような誤差が出るため、6 桁有効に丸める。
 */
function roundRatio(v: number): number {
  return Math.round(v * 1_000_000) / 1_000_000;
}

/** 引数の型を満たすために再エクスポート（呼び出し元からの利便性） */
export type { ViewingDistanceCm };
