/**
 * G-13 数字探し（Embedded Numeral）の純関数ロジック（spec-v11.md §7.13、
 * screens.md S17-05、components.md §15 GE-13）。
 *
 * Pelli-Robson 系コントラスト感度訓練の発展形：ノイズ背景中に低コントラストで
 * 数字（0〜9 のいずれか）を 60 秒間表示。注視を続けることで埋もれた形が浮かび
 * 上がる「ポップアウト効果」を活用する。
 *
 * v1.1 OPT-12 統一：
 *   - 60 秒同時提示（マスク・フェード・点滅なし）
 *   - 確定ボタンなし、自由回答変更可、自動採点
 *   - 10 択ボタン「0」〜「9」（keypad-10、AC-4）
 *   - 60 秒経過で未回答 = 不正解、staircase 易方向（コントラスト増）
 *
 * staircase（gameRegistry G-13 entry）：
 *   - paramRange.min = 0.03（難・低コントラスト）
 *   - paramRange.max = 0.30（易・高コントラスト）
 *   - paramRange.initial = 0.10
 *   - paramRange.step = 0.01
 *
 * 純関数のみ。AsyncStorage / RN は触らない。
 */

import { ViewingDistanceCm } from '../calibration';

/** 0〜9 の数字 */
export type G13Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 全 10 個の数字の列挙 */
export const G13_ALL_DIGITS: ReadonlyArray<G13Digit> = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
];

/** 1 試行の spec：埋め込まれた数字 + コントラスト + ノイズ seed */
export type G13TrialSpec = {
  /** 埋め込まれた数字（= 正解） */
  embeddedDigit: G13Digit;
  /** 数字の表示コントラスト（0〜1、staircase 連動） */
  paramContrast: number;
  /** ノイズパターン生成用 seed（描画決定論性のため） */
  noiseSeed: number;
};

/** G-13 採点結果 */
export type G13GradingResult = {
  embeddedDigit: G13Digit;
  /** ユーザー回答（null = 未回答） */
  userAnswer: G13Digit | null;
  isCorrect: boolean;
  unattempted: boolean;
};

/** 1 試行 60 秒（OPT-11 / OPT-12 統一） */
export const GAME13_V11 = {
  /** OPT-11 強制 60 秒視聴、早期終了不可 */
  totalDurationMs: 60_000,
  /** 採点直後の正解開示ハイライト時間（screens.md S17-06） */
  correctRevealMs: 1500,
} as const;

/**
 * rng で G13Digit を 1 つランダムに選ぶ（10 択均等）。
 * @internal export はテスト用
 */
export function pickRandomDigit(rng: () => number): G13Digit {
  const idx = Math.min(9, Math.floor(rng() * 10));
  return G13_ALL_DIGITS[idx];
}

/**
 * 1 試行の spec を生成する。
 *
 * - 埋め込み数字は rng で 0〜9 ランダム
 * - paramContrast はクランプ
 * - noiseSeed は rng から 32bit 整数を生成
 *
 * @param paramContrast 現在の staircase コントラスト（0.03〜0.30）
 * @param rng 0〜1 の擬似乱数生成器（テスト容易性、デフォルト Math.random）
 */
export function buildG13Trial(
  paramContrast: number,
  rng: () => number = Math.random,
): G13TrialSpec {
  const embeddedDigit = pickRandomDigit(rng);
  const c = clampContrast(paramContrast);
  const noiseSeed = Math.floor(rng() * 0x7fff_ffff);
  return {
    embeddedDigit,
    paramContrast: c,
    noiseSeed,
  };
}

/**
 * 採点：選択が埋め込まれた数字と一致なら正解。
 * userAnswer === null（未回答）→ 不正解扱い、unattempted=true。
 */
export function gradeG13(
  trial: G13TrialSpec,
  userAnswer: G13Digit | null,
): G13GradingResult {
  if (userAnswer === null) {
    return {
      embeddedDigit: trial.embeddedDigit,
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
    };
  }
  return {
    embeddedDigit: trial.embeddedDigit,
    userAnswer,
    isCorrect: userAnswer === trial.embeddedDigit,
    unattempted: false,
  };
}

/** 「数字 N」（screens.md S17-05 keypad ボタン aria-label / S17-06 結果ラベル） */
export function digitToJaLabel(d: G13Digit): string {
  return String(d);
}

/** ユーザー回答（null 含む）→ 表示文字列。null は呼び出し側で「未回答」処理 */
export function userAnswerDigitToLabel(d: G13Digit | null): string | null {
  if (d === null) return null;
  return digitToJaLabel(d);
}

/**
 * コントラスト → 数字 alpha（0〜1）の換算。
 *
 * spec §7.13 の「コントラスト」は数字の glyph がノイズ背景上にどれだけ目立つかの指標。
 * 描画時は数字を半透明（alpha）で重ねるかたちで表現する。
 *
 *   contrast 0.03（最難）→ alpha 0.03（ほぼ消失）
 *   contrast 0.10（初期）→ alpha 0.10
 *   contrast 0.30（最易）→ alpha 0.30
 *
 * 描画下限（ユーザーが完全に何も見えない状態を避ける）として `minVisibleAlpha` を
 * 適用する余地を残すが、デフォルトは線形マッピングそのまま。
 */
export function contrastToDigitAlpha(args: {
  contrast: number;
  minVisibleAlpha?: number;
}): number {
  const c = clampContrast(args.contrast);
  const minVisible = args.minVisibleAlpha ?? 0;
  const alpha = Math.max(minVisible, c);
  return Math.round(alpha * 1_000_000) / 1_000_000;
}

/**
 * レスポンシブな stimulus サイズ（screens.md §4 / components.md §15 GE-13）。
 *
 * | viewport 幅 | grid 辺 | キーパッドボタン |
 * |---|---|---|
 * | <=360px | 240 | 56 |
 * | <=375px | 240 | 64 |
 * | <=767px | 240 | 64 |
 * | 768〜1279px | 280 | 64 |
 * | >=1280px | 320 | 72 |
 */
export function computeG13StimulusLayout(
  viewportWidthOrSize: number | { widthPx: number; heightPx?: number },
): {
  stimulusSizePx: number;
  keypadButtonSizePx: number;
} {
  let widthPx: number;
  if (typeof viewportWidthOrSize === 'number') {
    widthPx = viewportWidthOrSize;
  } else {
    widthPx = viewportWidthOrSize.widthPx;
  }

  if (widthPx <= 360) return { stimulusSizePx: 240, keypadButtonSizePx: 56 };
  if (widthPx < 768) return { stimulusSizePx: 240, keypadButtonSizePx: 64 };
  if (widthPx < 1280) return { stimulusSizePx: 280, keypadButtonSizePx: 64 };
  return { stimulusSizePx: 320, keypadButtonSizePx: 72 };
}

/**
 * Mulberry32 PRNG（決定論的、ノイズ層のテクスチャ再現用）。
 *
 * EmbeddedNumeralStimulus が seed を受け取ってノイズパターンを描画する際、
 * 「同じ seed なら毎回同じノイズ」を担保するために使う。
 *
 * @internal export はテスト用
 */
export function createNoiseRng(seed: number): () => number {
  let s = (seed | 0) >>> 0;
  return () => {
    s = (s + 0x6d2b_79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** コントラストの浮動小数点誤差を 6 桁で丸め、staircase 範囲外もクランプ */
function clampContrast(v: number): number {
  const clamped = Math.max(0, Math.min(1, v));
  return Math.round(clamped * 1_000_000) / 1_000_000;
}

/** 引数の型を満たすために再エクスポート（呼び出し元からの利便性） */
export type { ViewingDistanceCm };
