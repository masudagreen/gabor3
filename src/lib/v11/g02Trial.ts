/**
 * G-02 左右並び傾き判別の純関数ロジック（spec-v11.md §7.2）。
 *
 * v1 の `src/lib/game2.ts` を v1.1 OPT-12 統一フォーマットに沿って移植したもの。
 *
 * v1.1 仕様（v1 からの主な変更点）：
 *   - 1 試行 = 60 秒固定（v1 の「3 秒回答タイムアウト」「30 試行ループ」廃止）
 *   - 提示時間も staircase 連動も廃止。staircase は **角度差**（°）のみ
 *   - 固視点 500ms → 左右 2 ガボール 60 秒同時提示 → 自動採点
 *
 * 試行スペック生成・採点は本モジュールが担当。AsyncStorage / RN は触らない
 * （テスト容易性、純関数）。
 */

import { ViewingDistanceCm } from '../calibration';

/** 左右どちらか */
export type G02Side = 'left' | 'right';

/** 1 ガボールの spec（v1 の Game2GaborSpec を踏襲） */
export type G02GaborSpec = {
  cpd: 1.5 | 3 | 6 | 9;
  contrast: number;
  sigmaDeg: number;
  orientationDeg: number;
  phaseRad: number;
};

/** 1 試行の左右ガボールスペックと正解側 */
export type G02TrialSpec = {
  /** 左ガボールの spec */
  left: G02GaborSpec;
  /** 右ガボールの spec */
  right: G02GaborSpec;
  /** 時計回りに傾いている側（=正解側） */
  correctSide: G02Side;
  /** 今回の staircase 角度差（°、左右の orientation 差の絶対値） */
  paramValueDeg: number;
  /** 基準角度（°）。左右ガボールはこれの ±paramValueDeg/2 に置く */
  baseOrientationDeg: number;
};

/** G-02 採点結果 */
export type G02GradingResult = {
  /** 時計回り側 = 正解側 */
  correctSide: G02Side;
  /** ユーザーが最終的に選んだ側（null = 未回答） */
  userAnswer: G02Side | null;
  /** 採点結果 */
  isCorrect: boolean;
  /** 未回答かどうか（60 秒経過時に未選択） */
  unattempted: boolean;
};

/** ガボール描画パラメータの定数（spec-v11.md §7.2、v1 から踏襲） */
export const G02_GABOR_PARAMS = {
  cpd: 3 as const,
  contrast: 0.3,
  sigmaDeg: 0.6,
} satisfies {
  cpd: G02GaborSpec['cpd'];
  contrast: number;
  sigmaDeg: number;
};

/** 1 試行 60 秒、固視点 500ms（spec-v11.md §7.2 / OPT-12 統一） */
export const GAME2_V11 = {
  /** OPT-11 強制 60 秒視聴、早期終了不可 */
  totalDurationMs: 60_000,
  /** 固視点表示（提示前の整え） */
  fixationDurationMs: 500,
  /** 採点直後の正解開示ハイライト時間（screens.md S10-03） */
  correctRevealMs: 1500,
} as const;

/**
 * 1 試行の左右ガボール spec を生成する。
 *
 * 「時計回り（clockwise）= orientation 値が増える方向」と定義する。
 * 基準角度から ±paramValueDeg/2 だけ左右の orientation を分ける。
 * どちらが時計回り側になるかは rng で 50% ずつにランダム化する。
 *
 * @param paramValueDeg 現在の staircase 角度差（°、>=0）
 * @param rng 0〜1 の擬似乱数生成器（テスト容易性、デフォルト Math.random）
 */
export function buildG02Trial(
  paramValueDeg: number,
  rng: () => number = Math.random,
): G02TrialSpec {
  const baseOrientationDeg = rng() * 180; // 0〜180° 一様
  const half = paramValueDeg / 2;

  // 「時計回り側のガボール」を左／右どちらに置くか
  const correctSide: G02Side = rng() < 0.5 ? 'left' : 'right';
  const leftIsCw = correctSide === 'left';

  const leftOrientation = mod180(
    baseOrientationDeg + (leftIsCw ? half : -half),
  );
  const rightOrientation = mod180(
    baseOrientationDeg + (leftIsCw ? -half : half),
  );

  return {
    left: {
      cpd: G02_GABOR_PARAMS.cpd,
      contrast: G02_GABOR_PARAMS.contrast,
      sigmaDeg: G02_GABOR_PARAMS.sigmaDeg,
      orientationDeg: leftOrientation,
      phaseRad: rng() * 2 * Math.PI,
    },
    right: {
      cpd: G02_GABOR_PARAMS.cpd,
      contrast: G02_GABOR_PARAMS.contrast,
      sigmaDeg: G02_GABOR_PARAMS.sigmaDeg,
      orientationDeg: rightOrientation,
      phaseRad: rng() * 2 * Math.PI,
    },
    correctSide,
    paramValueDeg,
    baseOrientationDeg,
  };
}

/**
 * 採点：選択が時計回り側と一致なら正解。
 * userAnswer が null（未回答）の場合は不正解扱い、unattempted=true。
 */
export function gradeG02(
  trial: G02TrialSpec,
  userAnswer: G02Side | null,
): G02GradingResult {
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

/** 「左」「右」の日本語表示文字列（結果サマリ用） */
export function sideToJaLabel(side: G02Side): string {
  return side === 'left' ? '左' : '右';
}

/** ユーザー回答（null 含む）→ 表示文字列。null は呼び出し側で「未回答」処理 */
export function userAnswerToLabel(side: G02Side | null): string | null {
  if (side === null) return null;
  return sideToJaLabel(side);
}

/**
 * レスポンシブなパッチサイズとギャップ（screens.md §5）。
 *
 * | viewport 幅 | パッチ一辺 | ギャップ |
 * |---|---|---|
 * | <=360px | 100 | 24 |
 * | <=375px | 120 | 32 |
 * | <=767px | 120 | 32 |
 * | <768px〜1023px | 140 | 48 |
 * | >=1280px | 160 | 64 |
 *
 * Sprint 10 修正ラウンド 2 / G-04 修正：判定基準を「短辺」から「viewport 幅」に
 * 変更（PC 横画面 1280×800 のとき shortSide=800 だと 140 が返ってしまい、
 * screens.md §5 表の 1280px 期待値 160 と乖離していた）。
 *
 * 互換のため引数 1 個（数値）でも呼べる：その場合は width とみなす。
 * 引数 2 個なら `{ width, height }` または `(width, height)` を受け取り、
 * width を主、height は補助（極端に短い縦の場合のみ調整）に使う。
 */
export function computeG02StimulusLayout(
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

  // 主判定：width ベース（screens.md §5 表に従う）
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

  // 高さが極端に小さい場合（縦長ではない PC 横で更に縦が削られた場合など）の
  // safety：パッチ + 上下マージン 80px が入りきらないなら 1 段落とす
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

function mod180(deg: number): number {
  let v = deg % 180;
  if (v < 0) v += 180;
  return v;
}

/** 引数の型を満たすために再エクスポート（呼び出し元からの利便性） */
export type { ViewingDistanceCm };
