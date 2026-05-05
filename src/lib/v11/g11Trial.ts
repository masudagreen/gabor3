/**
 * G-11 Vernier 整列判定（Vernier Alignment）の純関数ロジック（spec-v11.md §7.11、
 * screens.md S16-05）。
 *
 * Vernier acuity（並列整列視力）の訓練：通常網膜解像度を超える「ハイパーアキュイティ」。
 * 上下に 2 つの垂直ガボールを 60 秒同時提示、下のガボールが上に対して左右に
 * 微小（arcmin 単位）にズレる。ユーザーは「左にずれている」「右にずれている」を判定。
 *
 * v1.1 OPT-12 統一：
 *   - 60 秒同時提示（マスク・フェード・点滅なし）
 *   - 確定ボタンなし、自由回答変更可、自動採点
 *   - horizontal-2 layout の 2 択ボタン
 *   - 60 秒経過で未回答 = 不正解、staircase 易方向（ズレ量大）
 *
 * staircase（gameRegistry G-11 entry）：
 *   - paramRange.min = 0.5'（難・微小ズレ）
 *   - paramRange.max = 5.0'（易・大きなズレ）
 *   - paramRange.initial = 2.0'
 *   - paramRange.step = 0.2'
 *
 * arcmin → ピクセル換算：
 *   1° = 60'（角度分）。
 *   pixelsPerDegree（calibration.ts）= 1° の視野角がスクリーン上で何 px か。
 *   pxPerArcmin = pixelsPerDegree / 60
 *   arcminToPx(arcminVal) = arcminVal * pxPerArcmin
 *
 *   例：distance=40cm, dpi=460（iphone）
 *     pixelsPerDegree ≈ 126.5px
 *     pxPerArcmin ≈ 2.108px / arcmin
 *     2.0 arcmin ≈ 4.2px ズレ
 *
 *   distance=40cm, dpi=110（pc）
 *     pixelsPerDegree ≈ 30.24px
 *     pxPerArcmin ≈ 0.504px / arcmin
 *     2.0 arcmin ≈ 1.0px ズレ（PC では minVisiblePx でクランプして視認確保）
 *
 *   PC など低 dpi 環境では 1 arcmin が 1px 未満になり視認不可になるため、`minVisiblePx`
 *   下限（デフォルト 1px）でクランプする。これは spec §6.2 と矛盾しない（あくまで
 *   physical 視野角の換算は正確に行い、描画下限のみ確保）。
 *
 * 純関数のみ。AsyncStorage / RN は触らない。
 */

import { ViewingDistanceCm, pixelsPerDegree } from '../calibration';

/** 下のガボールがどちら側にズレているか */
export type G11OffsetDirection = 'left' | 'right';

/** 全方向の列挙 */
export const G11_ALL_DIRECTIONS: ReadonlyArray<G11OffsetDirection> = ['left', 'right'];

/** 1 ガボールの spec（GE-11 描画用） */
export type G11GaborSpec = {
  cpd: number;
  contrast: number;
  sigmaDeg: number;
  /** GaborPatch 規約：反時計回り正、垂直 = 90° */
  orientationDeg: number;
  phaseRad: number;
};

/** v1.1.2 Sprint 21 直接選択化：下部の左右どちらが選択肢か */
export type G11SelectableSide = 'left' | 'right';

/** 1 試行の spec：上 reference + 下に左右 2 テストパッチ + 正解 + ズレ量 */
export type G11TrialSpec = {
  /** 上 reference ガボール（垂直、中央位置、ズレなし、disabled） */
  upper: G11GaborSpec;
  /**
   * 下 ガボール（後方互換）。v1.1.1 以前は単一テストパッチを表していた。
   * v1.1.2（Sprint 21 直接選択化）では下部に左右 2 テストパッチを並べるが、
   * 既存の `lower` は「正解側のテストパッチ（= 上 reference と整列している側）」
   * を指すように維持する（後方互換、staircase 不変）。
   */
  lower: G11GaborSpec;
  /**
   * v1.1.2 Sprint 21：下 左テストパッチ spec。
   * `correctSide === 'left'` のとき integration（offset 0）、それ以外は paramOffsetArcmin
   * 分横ズレ。
   */
  lowerLeft: G11GaborSpec;
  /** v1.1.2 Sprint 21：下 右テストパッチ spec */
  lowerRight: G11GaborSpec;
  /**
   * 旧仕様の正解方向（v1.1 までの horizontal-2 採点に使われていた）。
   * 後方互換のため維持。`correctSide === 'left'` のとき `correctDirection = 'right'`
   * （= 右側のパッチがズレている方向）と等価ではないので、新規コードは
   * `correctSide` を参照する。
   */
  correctDirection: G11OffsetDirection;
  /** v1.1.2 Sprint 21：下部の正解側（= 上 reference と整列している側） */
  correctSide: G11SelectableSide;
  /** 今回の staircase ズレ量（arcmin、>=0）。下部 2 パッチの片方がこの量横ズレする */
  paramOffsetArcmin: number;
};

/** G-11 採点結果 */
export type G11GradingResult = {
  correctDirection: G11OffsetDirection;
  /** ユーザー回答（null = 未回答）。v1.1 までの horizontal-2 ベース */
  userAnswer: G11OffsetDirection | null;
  isCorrect: boolean;
  /** 60 秒経過時に未選択だったか */
  unattempted: boolean;
  /**
   * v1.1.2 Sprint 21 直接選択化：下部 2 パッチ直接選択時の正解側 / ユーザー選択側。
   * 旧 horizontal-2 方式（left/right 直接）でも採点可能なため optional。
   */
  correctSide?: G11SelectableSide;
  userAnswerSide?: G11SelectableSide | null;
};

/** ガボール垂直の orientationDeg（90°、GaborPatch 規約） */
export const G11_VERTICAL_ORIENTATION_DEG = 90;

/** Vernier 用ガボール共通パラメータ（spec §6.1 中域 cpd 6 / 細かい縞でハイパーアキュイティ訓練） */
export const G11_GABOR_PARAMS = {
  /** spec §6.1 高 cpd（細かい縞）。Vernier acuity は高空間周波数で精度が上がる */
  cpd: 6,
  /** 視認性十分なコントラスト */
  contrast: 0.5,
  /** やや小さめの窓（パッチ自体は 100×100 など） */
  sigmaDeg: 0.5,
} satisfies {
  cpd: number;
  contrast: number;
  sigmaDeg: number;
};

/** 1 試行 60 秒（OPT-11 / OPT-12 統一） */
export const GAME11_V11 = {
  /** OPT-11 強制 60 秒視聴、早期終了不可 */
  totalDurationMs: 60_000,
  /** 採点直後の正解開示ハイライト時間（screens.md S16-06） */
  correctRevealMs: 1500,
} as const;

/**
 * arcmin → pixel 換算（spec §6.2 視聴距離キャリブレーション）。
 *
 * 1° = 60'。pixelsPerDegree（calibration.ts）から導出。
 *
 * @param arcminVal 換算する arcmin 値（>=0）
 * @param distanceCm 視聴距離（30 / 40 / 50）
 * @param dpi 端末 dpi
 * @returns ピクセル数（小数 6 桁丸め）
 */
export function arcminToPx(
  arcminVal: number,
  distanceCm: number,
  dpi: number,
): number {
  const ppd = pixelsPerDegree(distanceCm, dpi); // px / 1°
  const pxPerArcmin = ppd / 60; // px / 1'
  const v = Math.max(0, arcminVal) * pxPerArcmin;
  return Math.round(v * 1_000_000) / 1_000_000;
}

/**
 * 視認可能な最小 px 下限を適用する arcmin → px 換算。
 *
 * 低 dpi 環境（PC = 110dpi、distance 40cm で 1 arcmin ≈ 0.5px）では 1 arcmin 未満が
 * 1px 未満になり描画上消失するため、minVisiblePx（デフォルト 1px）を下限に。
 *
 * - paramOffsetArcmin が 0 のときは下限を適用しない（=0px、ズレなし配置）
 * - それ以外は最低 minVisiblePx
 */
export function arcminToVisiblePx(args: {
  arcminVal: number;
  distanceCm: number;
  dpi: number;
  /** 下限 px（デフォルト 1） */
  minVisiblePx?: number;
}): number {
  const minVisiblePx = args.minVisiblePx ?? 1;
  const raw = arcminToPx(args.arcminVal, args.distanceCm, args.dpi);
  if (args.arcminVal <= 0) return 0;
  return Math.max(minVisiblePx, raw);
}

/**
 * 1 試行の上下 2 ガボール spec を生成する。
 *
 * - 両パッチとも垂直（orientationDeg = 90°）、共通 cpd / contrast / sigma
 * - 位相は独立にランダム
 * - correctDirection は rng で 50% 左 / 50% 右
 * - 上は中央位置（オフセット 0）、下が staircase 値分 水平ズレ
 *
 * 物理的なズレ（px）は呼び出し側で `arcminToVisiblePx` を使って描画時に算出する。
 *
 * @param paramOffsetArcmin 現在の staircase ズレ量（arcmin、典型 0.5〜5）
 * @param rng 0〜1 の擬似乱数生成器（テスト容易性、デフォルト Math.random）
 */
export function buildG11Trial(
  paramOffsetArcmin: number,
  rng: () => number = Math.random,
): G11TrialSpec {
  // v1.1.2 Sprint 21：下部 2 パッチのうちどちらが「上と整列している側（= 正解）」か
  // をランダムに決定。もう一方は paramOffsetArcmin 分横ズレ。
  const correctSide: G11SelectableSide = rng() < 0.5 ? 'left' : 'right';
  // 旧 horizontal-2 採点との後方互換：correctDirection はズレている側のズレ方向。
  // 規約：左右 2 パッチで「ズレている側」のパッチがどちらの方向にズレるか。
  // - correctSide='left' のとき右パッチがズレる（向きは rng で決定）
  // - correctSide='right' のとき左パッチがズレる
  // ズレ方向（= correctDirection、旧仕様の「下のパッチが左/右にズレている」）を別途乱数で決定
  const correctDirection: G11OffsetDirection = rng() < 0.5 ? 'left' : 'right';
  const arcmin = clampArcmin(paramOffsetArcmin);

  const upper: G11GaborSpec = {
    cpd: G11_GABOR_PARAMS.cpd,
    contrast: G11_GABOR_PARAMS.contrast,
    sigmaDeg: G11_GABOR_PARAMS.sigmaDeg,
    orientationDeg: G11_VERTICAL_ORIENTATION_DEG,
    phaseRad: rng() * 2 * Math.PI,
  };
  const lower: G11GaborSpec = {
    cpd: G11_GABOR_PARAMS.cpd,
    contrast: G11_GABOR_PARAMS.contrast,
    sigmaDeg: G11_GABOR_PARAMS.sigmaDeg,
    orientationDeg: G11_VERTICAL_ORIENTATION_DEG,
    phaseRad: rng() * 2 * Math.PI,
  };
  // v1.1.2 Sprint 21：下部 左右 2 パッチ（位相は独立にランダム化、視覚的に区別がつくように）
  const lowerLeft: G11GaborSpec = {
    cpd: G11_GABOR_PARAMS.cpd,
    contrast: G11_GABOR_PARAMS.contrast,
    sigmaDeg: G11_GABOR_PARAMS.sigmaDeg,
    orientationDeg: G11_VERTICAL_ORIENTATION_DEG,
    phaseRad: rng() * 2 * Math.PI,
  };
  const lowerRight: G11GaborSpec = {
    cpd: G11_GABOR_PARAMS.cpd,
    contrast: G11_GABOR_PARAMS.contrast,
    sigmaDeg: G11_GABOR_PARAMS.sigmaDeg,
    orientationDeg: G11_VERTICAL_ORIENTATION_DEG,
    phaseRad: rng() * 2 * Math.PI,
  };

  return {
    upper,
    lower,
    lowerLeft,
    lowerRight,
    correctDirection,
    correctSide,
    paramOffsetArcmin: arcmin,
  };
}

/**
 * 採点（v1.1 までの horizontal-2 方式、後方互換）：選択がズレ方向と一致なら正解。
 * userAnswer === null（未回答）→ 不正解扱い、unattempted=true。
 */
export function gradeG11(
  trial: G11TrialSpec,
  userAnswer: G11OffsetDirection | null,
): G11GradingResult {
  if (userAnswer === null) {
    return {
      correctDirection: trial.correctDirection,
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
    };
  }
  return {
    correctDirection: trial.correctDirection,
    userAnswer,
    isCorrect: userAnswer === trial.correctDirection,
    unattempted: false,
  };
}

/**
 * v1.1.2 Sprint 21 直接選択化採点：
 * 下部 2 パッチのうち上 reference と整列している側（trial.correctSide）を
 * ユーザーが選んだら正解。userAnswerSide === null（未回答）→ 不正解、unattempted=true。
 *
 * staircase 値・閾値計算ロジックは不変（paramOffsetArcmin の magnitude が difficulty）。
 * 後方互換のため `correctDirection` / `userAnswer` フィールドも埋める（前者は trial、
 * 後者は side → direction の対応で side='left' → 'left'、side='right' → 'right' とする）。
 */
export function gradeG11BySide(
  trial: G11TrialSpec,
  userAnswerSide: G11SelectableSide | null,
): G11GradingResult {
  if (userAnswerSide === null) {
    return {
      correctDirection: trial.correctDirection,
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
      correctSide: trial.correctSide,
      userAnswerSide: null,
    };
  }
  const isCorrect = userAnswerSide === trial.correctSide;
  return {
    correctDirection: trial.correctDirection,
    // 旧フィールドにも対応値を埋める：side === 'left' → userAnswer = 'left'
    userAnswer: userAnswerSide,
    isCorrect,
    unattempted: false,
    correctSide: trial.correctSide,
    userAnswerSide,
  };
}

/** 「下のパッチは左にずれている」/「下のパッチは右にずれている」（screens.md S16-05 / S16-06） */
export function directionToJaLabel(d: G11OffsetDirection): string {
  return d === 'left'
    ? '下のパッチは左にずれている'
    : '下のパッチは右にずれている';
}

/** 「左にずれている」/「右にずれている」短縮版（ボタンラベル等） */
export function directionToShortJaLabel(d: G11OffsetDirection): string {
  return d === 'left' ? '左にずれている' : '右にずれている';
}

/** ユーザー回答（null 含む）→ 表示文字列。null は呼び出し側で「未回答」処理 */
export function userAnswerDirectionToLabel(
  d: G11OffsetDirection | null,
): string | null {
  if (d === null) return null;
  return directionToJaLabel(d);
}

/**
 * 下パッチの水平オフセット（px、符号付き）。
 *
 * - direction = 'left'：負（中心から左へ）
 * - direction = 'right'：正（中心から右へ）
 *
 * 描画レイヤ（VernierStackStimulus）はこの符号付きオフセットを `transform: translateX`
 * 等で適用する。
 */
export function computeG11LowerOffsetPx(args: {
  direction: G11OffsetDirection;
  paramOffsetArcmin: number;
  distanceCm: number;
  dpi: number;
  minVisiblePx?: number;
}): number {
  const px = arcminToVisiblePx({
    arcminVal: args.paramOffsetArcmin,
    distanceCm: args.distanceCm,
    dpi: args.dpi,
    minVisiblePx: args.minVisiblePx,
  });
  if (px === 0) return 0; // -0 を避ける（テスト容易性 + 描画上等価）
  return args.direction === 'left' ? -px : px;
}

/**
 * レスポンシブなパッチサイズとギャップ（screens.md §4 / components.md §15 GE-11）。
 *
 * | viewport 幅 | パッチ一辺 | 上下ギャップ |
 * |---|---|---|
 * | <=360px | 80 | 16 |
 * | <=375px | 100 | 16 |
 * | <=767px | 100 | 16 |
 * | 768〜1279px | 120 | 24 |
 * | >=1280px | 140 | 32 |
 *
 * ギャップは spec.space.4 = 16px（screens.md §3）が基準、PC では拡張。
 * 高さが極端に小さい場合（パッチ 2 段 + ギャップ + 余白が 60% 超）は 1 段落とす。
 */
export function computeG11StimulusLayout(
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
    layout = { patchSizePx: 80, gapPx: 16 };
  } else if (widthPx < 768) {
    layout = { patchSizePx: 100, gapPx: 16 };
  } else if (widthPx < 1280) {
    layout = { patchSizePx: 120, gapPx: 24 };
  } else {
    layout = { patchSizePx: 140, gapPx: 32 };
  }

  // 高さ safety
  if (heightPx !== undefined) {
    const needed = layout.patchSizePx * 2 + layout.gapPx + 200;
    if (heightPx < needed) {
      if (layout.patchSizePx === 140) {
        layout = { patchSizePx: 120, gapPx: 24 };
      } else if (layout.patchSizePx === 120) {
        layout = { patchSizePx: 100, gapPx: 16 };
      } else if (layout.patchSizePx === 100) {
        layout = { patchSizePx: 80, gapPx: 16 };
      }
    }
  }

  return layout;
}

/** arcmin の浮動小数点誤差を 0.1 単位（小数 6 桁）に丸め、staircase 範囲外もクランプ */
function clampArcmin(v: number): number {
  // staircase 範囲は 0.5〜5.0、念のため 0..10 でクランプ
  const clamped = Math.max(0, Math.min(10, v));
  return Math.round(clamped * 1_000_000) / 1_000_000;
}

/** 引数の型を満たすために再エクスポート（呼び出し元からの利便性） */
export type { ViewingDistanceCm };
