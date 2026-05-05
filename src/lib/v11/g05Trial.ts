/**
 * G-05 空間周波数弁別の純関数ロジック（spec-v11.md §7.5、screens.md S13-02）。
 *
 * G-02（左右並び傾き判別）/ G-04（コントラスト弁別）と同じ「左右 2 ガボール 60 秒
 * 同時提示」の構造を流用しつつ、staircase 連動先を「角度差」「コントラスト差」では
 * なく **cpd 比**（高 cpd / 低 cpd）に置き換えたもの。
 *
 * v1.1 仕様（spec-v11.md §7.5）：
 *   - 左右 2 ガボール（コントラスト・向き同一）でどちらが細かい縞か 60 秒同時提示
 *     で判別（cpd のみ異なる）
 *   - 「左が細かい」/「右が細かい」の 2 択
 *   - staircase: cpd 比、min=1.1（難・小差） / max=2.0（易・大差） / initial=1.5、
 *     step=0.1（gameRegistry に登録済み）
 *   - 採点：選択が高 cpd 側（=「細かい」側）と一致なら正解
 *   - 1 試行 60 秒、確定ボタンなし、自由回答変更可、自動採点（OPT-12）
 *
 * 「cpd 比」は左右 2 パッチの空間周波数の比 r（>=1）。低 cpd 側を `base / sqrt(r)`、
 * 高 cpd 側を `base * sqrt(r)` に置く幾何平均分割を採用する：
 *   - 比 1.0 → 左右同じ（境界、staircase 範囲外）
 *   - 比 1.5（初期）→ 低=base/√1.5≈base*0.816, 高=base*√1.5≈base*1.225
 *   - 比 2.0（最易）→ 低=base/√2≈base*0.707, 高=base*√2≈base*1.414
 *   - 比 1.1（最難）→ 低=base/√1.1≈base*0.953, 高=base*√1.1≈base*1.049
 * 比が小さいほど判別困難。
 *
 * 純関数のみ。AsyncStorage / RN は触らない（テスト容易性）。
 */

import { ViewingDistanceCm } from '../calibration';

/** 左右どちらか */
export type G05Side = 'left' | 'right';

/**
 * 1 ガボールの spec（GE-05 描画用、GE-02 / GE-04 と同型）。
 *
 * G-05 では cpd を staircase 比で分けるため、固定の literal union ではなく
 * 一般化した number 型として扱う（GaborPatch は number cpd を受理する設計）。
 */
export type G05GaborSpec = {
  cpd: number;
  contrast: number;
  sigmaDeg: number;
  orientationDeg: number;
  phaseRad: number;
};

/** 1 試行の左右ガボールスペックと正解側 */
export type G05TrialSpec = {
  /** 左ガボール spec */
  left: G05GaborSpec;
  /** 右ガボール spec */
  right: G05GaborSpec;
  /** 高 cpd（=「細かい」=正解）側 */
  correctSide: G05Side;
  /** 今回の staircase cpd 比（>=1） */
  paramValueRatio: number;
  /** 基準（中央）cpd。左右はこの ÷√r / ×√r に置く */
  baseCpd: number;
};

/** G-05 採点結果 */
export type G05GradingResult = {
  /** 高 cpd 側 = 正解側 */
  correctSide: G05Side;
  /** ユーザーが最終的に選んだ側（null = 未回答） */
  userAnswer: G05Side | null;
  /** 採点結果 */
  isCorrect: boolean;
  /** 未回答かどうか（60 秒経過時に未選択） */
  unattempted: boolean;
};

/**
 * 共通ガボール描画パラメータ（cpd は動的に上書きされる）。
 *
 * spec-v11.md §6.1 / §7.5：cpd のみ可変。コントラストと向きは左右同一。
 * 向きは試行ごとにランダム、コントラストは中域 0.4、ガウス窓 0.6° 固定（GE-02 / GE-04
 * と整合）。コントラストはコントラスト弁別と異なり閾値依存ではないため、ある程度
 * 視認性が高い 0.4 を採用（spec §6.1 の範囲 0.05〜0.6 内）。
 */
export const G05_GABOR_PARAMS = {
  contrast: 0.4,
  sigmaDeg: 0.6,
} satisfies {
  contrast: number;
  sigmaDeg: number;
};

/**
 * 基準（中央）cpd。
 *
 * 左右 cpd は `baseCpd / √r`（低）と `baseCpd * √r`（高）の関係になる。
 * spec §6.1 の cpd レンジ（1.5〜9）の幾何中心付近に置きつつ、最易 r=2.0 でも
 * 左右が `baseCpd / √2 ≈ 2.83`、`baseCpd * √2 ≈ 5.66` に収まるよう中央 4 を採用：
 *   - r=1.5（初期）→ 低≈3.27、高≈4.90
 *   - r=2.0（最易）→ 低≈2.83、高≈5.66
 *   - r=1.1（最難）→ 低≈3.81、高≈4.20
 * これにより spec §6.1 の cpd 範囲 1.5〜9 に収まる。
 */
export const G05_BASE_CPD = 4;

/** 1 試行 60 秒、固視点 500ms（spec-v11.md §7.5 / OPT-12 統一） */
export const GAME5_V11 = {
  /** OPT-11 強制 60 秒視聴、早期終了不可 */
  totalDurationMs: 60_000,
  /** 固視点表示（提示前の整え、screens.md S13-02 フェーズタイミング表） */
  fixationDurationMs: 500,
  /** 採点直後の正解開示ハイライト時間（screens.md S13-03） */
  correctRevealMs: 1500,
} as const;

/**
 * 1 試行の左右ガボール spec を生成する。
 *
 * 「高 cpd 側（=細かい縞側）= 正解側」と定義する。基準 cpd（G05_BASE_CPD）から
 * `× √r` / `÷ √r` で左右の cpd を分ける幾何平均分割。どちらが高 cpd 側になるかは
 * rng で 50% ずつにランダム化する。
 *
 * 向きは左右同一（spec §7.5「向き同一」）でランダム角度。コントラストは G05_GABOR_PARAMS
 * 固定。位相は左右独立にランダム。
 *
 * @param paramValueRatio 現在の staircase cpd 比（>=1、典型 1.1〜2.0）
 * @param rng 0〜1 の擬似乱数生成器（テスト容易性、デフォルト Math.random）
 */
export function buildG05Trial(
  paramValueRatio: number,
  rng: () => number = Math.random,
): G05TrialSpec {
  const orientationDeg = rng() * 180; // 0〜180° 一様（左右同じ向き）

  // r < 1 を防ぐ（staircase が万一壊れた場合の保険）
  const r = Math.max(1, paramValueRatio);
  const sqrtR = Math.sqrt(r);

  // 「高 cpd 側」を左／右どちらに置くか
  const correctSide: G05Side = rng() < 0.5 ? 'left' : 'right';
  const leftIsHigh = correctSide === 'left';

  const leftCpd = clampCpd(
    leftIsHigh ? G05_BASE_CPD * sqrtR : G05_BASE_CPD / sqrtR,
  );
  const rightCpd = clampCpd(
    leftIsHigh ? G05_BASE_CPD / sqrtR : G05_BASE_CPD * sqrtR,
  );

  return {
    left: {
      cpd: leftCpd,
      contrast: G05_GABOR_PARAMS.contrast,
      sigmaDeg: G05_GABOR_PARAMS.sigmaDeg,
      orientationDeg,
      phaseRad: rng() * 2 * Math.PI,
    },
    right: {
      cpd: rightCpd,
      contrast: G05_GABOR_PARAMS.contrast,
      sigmaDeg: G05_GABOR_PARAMS.sigmaDeg,
      orientationDeg,
      phaseRad: rng() * 2 * Math.PI,
    },
    correctSide,
    paramValueRatio: roundRatio(r),
    baseCpd: G05_BASE_CPD,
  };
}

/**
 * 採点：選択が高 cpd 側（=「細かい」側）と一致なら正解。
 * userAnswer が null（未回答）の場合は不正解扱い、unattempted=true。
 */
export function gradeG05(
  trial: G05TrialSpec,
  userAnswer: G05Side | null,
): G05GradingResult {
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

/** 「左が細かい」「右が細かい」の日本語表示文字列（screens.md S13-03） */
export function sideToSfJaLabel(side: G05Side): string {
  return side === 'left' ? '左が細かい' : '右が細かい';
}

/** ユーザー回答（null 含む）→ 表示文字列。null は呼び出し側で「未回答」処理 */
export function userAnswerToSfLabel(side: G05Side | null): string | null {
  if (side === null) return null;
  return sideToSfJaLabel(side);
}

/**
 * レスポンシブなパッチサイズとギャップ（screens.md S13-02 §5）。
 *
 * GE-05 は GE-02 / GE-04 と同じレイアウト（components.md §15 GE-05、design-v11
 * sprint-13 screens.md §5「GE-02 / GE-04 と同じ寸法系統」）のため、テーブルを
 * 共有する。テスト独立性のため本モジュールでも再定義（YAGNI を守りつつ独立性も
 * 確保、Sprint 12 の computeG04StimulusLayout と同方針）。
 *
 * | viewport 幅 | パッチ一辺 | ギャップ |
 * |---|---|---|
 * | <=360px | 100 | 24 |
 * | <=375px | 120 | 32 |
 * | <=767px | 120 | 32 |
 * | 768〜1279px | 140 | 48 |
 * | >=1280px | 160 | 64 |
 */
export function computeG05StimulusLayout(
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

  // 高さが極端に小さい場合の safety（GE-02 / GE-04 と同じロジック）
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
 * cpd の浮動小数点誤差を丸める。
 * `4 * Math.sqrt(1.5)` のような演算は無理数の近似値しか得られないが、`GaborPatch`
 * の描画では十分な精度のため、表示用の小数 6 桁で揃える。
 */
function clampCpd(v: number): number {
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
