/**
 * G-04 コントラスト弁別の純関数ロジック（spec-v11.md §7.4、screens.md S12-02）。
 *
 * G-02（左右並び傾き判別）と同じ「左右 2 ガボール 60 秒同時提示」の構造を流用しつつ、
 * staircase 連動先を「角度差」ではなく「コントラスト差」に置き換えたもの。
 *
 * v1.1 仕様（spec-v11.md §7.4）：
 *   - 左右 2 ガボール（向き・cpd 同一）でどちらが濃いかを 60 秒同時提示で判別
 *   - 「左が濃い」/「右が濃い」の 2 択
 *   - staircase: コントラスト差、min=0.05（難・低差） / max=0.30（易・大差） /
 *     initial=0.15、step=0.02（gameRegistry に登録済み）
 *   - 採点：選択が高コントラスト側と一致なら正解
 *   - 1 試行 60 秒、確定ボタンなし、自由回答変更可、自動採点（OPT-12）
 *
 * 「コントラスト差」とは左右 2 パッチのコントラスト値の絶対差。両側ともグレー背景
 * 50% を中心とした正弦波で、どちらか一方が高コントラスト（濃く見える）、もう一方が
 * 低コントラスト（薄く見える）。差が小さいほど判別困難。
 *
 * 純関数のみ。AsyncStorage / RN は触らない（テスト容易性）。
 */

import { ViewingDistanceCm } from '../calibration';

/** 左右どちらか */
export type G04Side = 'left' | 'right';

/** 1 ガボールの spec（GE-04 描画用、GE-02 と同型） */
export type G04GaborSpec = {
  cpd: 1.5 | 3 | 6 | 9;
  contrast: number;
  sigmaDeg: number;
  orientationDeg: number;
  phaseRad: number;
};

/** 1 試行の左右ガボールスペックと正解側 */
export type G04TrialSpec = {
  /** 左ガボール spec */
  left: G04GaborSpec;
  /** 右ガボール spec */
  right: G04GaborSpec;
  /** 高コントラスト側（=正解側） */
  correctSide: G04Side;
  /** 今回の staircase コントラスト差 */
  paramValueContrast: number;
  /** 基準（中央）コントラスト。左右はこの ±paramValueContrast/2 に置く */
  baseContrast: number;
};

/** G-04 採点結果 */
export type G04GradingResult = {
  /** 高コントラスト側 = 正解側 */
  correctSide: G04Side;
  /** ユーザーが最終的に選んだ側（null = 未回答） */
  userAnswer: G04Side | null;
  /** 採点結果 */
  isCorrect: boolean;
  /** 未回答かどうか（60 秒経過時に未選択） */
  unattempted: boolean;
};

/**
 * 共通ガボール描画パラメータ（コントラストは動的に上書きされる）。
 *
 * spec-v11.md §6.1 / §7.4：向きと cpd は左右同一。コントラストのみ可変。
 * 向きは試行ごとにランダム、cpd は中域 3、ガウス窓 0.6° 固定（GE-02 と整合）。
 */
export const G04_GABOR_PARAMS = {
  cpd: 3 as const,
  sigmaDeg: 0.6,
} satisfies {
  cpd: G04GaborSpec['cpd'];
  sigmaDeg: number;
};

/**
 * 基準（中央）コントラスト。
 *
 * 左右コントラストは `baseContrast ± paramValueContrast/2` の関係になる。
 * gameRegistry の min=0.05〜max=0.30 を踏まえて、左右パッチのコントラストが
 * `[gabor.contrast.min=0.05, gabor.contrast.max=0.6]` の範囲を逸脱しないよう
 * 中央値 0.30 を採用：
 *   - paramValueContrast=0.30（最易、staircase max）→ 左右 0.15 / 0.45（差 0.30）
 *   - paramValueContrast=0.05（最難、staircase min）→ 左右 0.275 / 0.325（差 0.05）
 * これにより spec §6.1 のコントラスト範囲に収まる。
 */
export const G04_BASE_CONTRAST = 0.3;

/** 1 試行 60 秒、固視点 500ms（spec-v11.md §7.4 / OPT-12 統一） */
export const GAME4_V11 = {
  /** OPT-11 強制 60 秒視聴、早期終了不可 */
  totalDurationMs: 60_000,
  /** 固視点表示（提示前の整え、screens.md S12-02 フェーズタイミング表） */
  fixationDurationMs: 500,
  /** 採点直後の正解開示ハイライト時間（screens.md S12-03） */
  correctRevealMs: 1500,
} as const;

/**
 * 1 試行の左右ガボール spec を生成する。
 *
 * 「高コントラスト側 = 正解側」と定義する。基準コントラスト（G04_BASE_CONTRAST）
 * から ±paramValueContrast/2 だけ左右のコントラストを分ける。どちらが高コント
 * ラスト側になるかは rng で 50% ずつにランダム化する。
 *
 * 向きは左右同一（spec §7.4「向き・cpd 同一」）でランダム角度。
 * 位相は左右独立にランダム。
 *
 * @param paramValueContrast 現在の staircase コントラスト差（>=0）
 * @param rng 0〜1 の擬似乱数生成器（テスト容易性、デフォルト Math.random）
 */
export function buildG04Trial(
  paramValueContrast: number,
  rng: () => number = Math.random,
): G04TrialSpec {
  const orientationDeg = rng() * 180; // 0〜180° 一様（左右同じ向き）
  const half = paramValueContrast / 2;

  // 「高コントラスト側」を左／右どちらに置くか
  const correctSide: G04Side = rng() < 0.5 ? 'left' : 'right';
  const leftIsHigh = correctSide === 'left';

  const leftContrast = clampContrast(
    G04_BASE_CONTRAST + (leftIsHigh ? half : -half),
  );
  const rightContrast = clampContrast(
    G04_BASE_CONTRAST + (leftIsHigh ? -half : half),
  );

  return {
    left: {
      cpd: G04_GABOR_PARAMS.cpd,
      contrast: leftContrast,
      sigmaDeg: G04_GABOR_PARAMS.sigmaDeg,
      orientationDeg,
      phaseRad: rng() * 2 * Math.PI,
    },
    right: {
      cpd: G04_GABOR_PARAMS.cpd,
      contrast: rightContrast,
      sigmaDeg: G04_GABOR_PARAMS.sigmaDeg,
      orientationDeg,
      phaseRad: rng() * 2 * Math.PI,
    },
    correctSide,
    paramValueContrast,
    baseContrast: G04_BASE_CONTRAST,
  };
}

/**
 * 採点：選択が高コントラスト側と一致なら正解。
 * userAnswer が null（未回答）の場合は不正解扱い、unattempted=true。
 */
export function gradeG04(
  trial: G04TrialSpec,
  userAnswer: G04Side | null,
): G04GradingResult {
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

/** 「左が濃い」「右が濃い」の日本語表示文字列（screens.md S12-03） */
export function sideToContrastJaLabel(side: G04Side): string {
  return side === 'left' ? '左が濃い' : '右が濃い';
}

/** ユーザー回答（null 含む）→ 表示文字列。null は呼び出し側で「未回答」処理 */
export function userAnswerToContrastLabel(side: G04Side | null): string | null {
  if (side === null) return null;
  return sideToContrastJaLabel(side);
}

/**
 * レスポンシブなパッチサイズとギャップ（screens.md S12-02 §5）。
 *
 * GE-04 は GE-02 と同じレイアウト（components.md §15 GE-04）のため、テーブルを
 * 共有する。computeG02StimulusLayout の薄いラッパとして再利用しても良いが、
 * テスト独立性を保つため本モジュールで再定義する（G-04 のみ将来的に
 * パラメータが分岐する可能性に備える、YAGNI を守りつつ独立性も確保）。
 *
 * | viewport 幅 | パッチ一辺 | ギャップ |
 * |---|---|---|
 * | <=360px | 100 | 24 |
 * | <=375px | 120 | 32 |
 * | <=767px | 120 | 32 |
 * | 768〜1279px | 140 | 48 |
 * | >=1280px | 160 | 64 |
 */
export function computeG04StimulusLayout(
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

  // 高さが極端に小さい場合の safety（GE-02 と同じロジック）
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
 * 浮動小数点誤差を丸める（staircase の step=0.02 で 0.15 + 0.02 ≠ 0.17 になる
 * JS の二進浮動小数問題を吸収）。コントラストは小数 2 桁有効を最大とするため
 * 1e6 で四捨五入して桁落ちを防ぐ。
 */
function clampContrast(v: number): number {
  // 物理的には 0〜1 の範囲、念のためクランプ
  const clamped = Math.max(0, Math.min(1, v));
  return Math.round(clamped * 1_000_000) / 1_000_000;
}

/** 引数の型を満たすために再エクスポート（呼び出し元からの利便性） */
export type { ViewingDistanceCm };
