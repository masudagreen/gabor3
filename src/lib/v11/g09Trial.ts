/**
 * G-09 側方マスキング（Lateral Masking）の純関数ロジック（spec-v11.md §7.9、
 * screens.md S15-05）。
 *
 * Polat ら 2004/2012 の Lateral Masking パラダイムを v1.1 OPT-12 統一フォーマットに
 * 適用：横一列に「flanker | target | flanker」を 60 秒同時提示。target 向きを
 * 「縦寄り」「横寄り」で判別する。
 *
 * spec §7.9 の staircase 規定：
 *   - target コントラスト + flanker 距離の合成
 *   - 易：contrast 0.20 / 距離 5λ
 *   - 難：contrast 0.05 / 距離 1.5λ
 *   - 初期：contrast 0.10 / 距離 3λ
 *   - step：contrast 0.01 / 距離 0.5λ で連動
 *
 * 実装方針（Sprint 15 self-review §「Polat パラダイム実装方針」）：
 *   gameRegistry G-09 entry は paramRange.{min:0.05, max:0.2, initial:0.1, step:0.01}
 *   を「target コントラスト」として持つ（実体）。flanker 距離は target コントラスト
 *   から **派生関数** で算出する。具体的には、
 *     contrast 0.05 → 距離 1.5λ
 *     contrast 0.10 → 距離 3.0λ
 *     contrast 0.20 → 距離 5.0λ
 *   という 3 点を結ぶ線形補間で導出（連続：難しくなる＝コントラスト下がる＝距離も縮む）。
 *
 *   `derivePolatStimulusFromContrast(contrast)` がその純関数。
 *
 * v1.1 OPT-12 統一：
 *   - 60 秒同時提示（マスク・フェード・点滅なし）
 *   - 確定ボタンなし、自由回答変更可、自動採点
 *   - 「縦寄り」/「横寄り」の 2 択
 *   - 60 秒経過で未回答 = 不正解、staircase 易方向（contrast 増、距離増）
 *
 * 純関数のみ。AsyncStorage / RN は触らない。
 */

import { ViewingDistanceCm } from '../calibration';

/** target の向き分類（screens.md S15-05） */
export type G09Orientation = 'vertical' | 'horizontal';

/**
 * 1 ガボールの spec（GE-09 描画用）。
 */
export type G09GaborSpec = {
  cpd: number;
  contrast: number;
  sigmaDeg: number;
  /** GaborPatch 規約：反時計回り正、垂直 = 90° */
  orientationDeg: number;
  phaseRad: number;
};

/** 1 試行の flanker × 2 + target spec と正解向き */
export type G09TrialSpec = {
  /** 左 flanker（高コントラスト 0.5、垂直 = 90°） */
  flankerLeft: G09GaborSpec;
  /** 右 flanker（高コントラスト 0.5、垂直 = 90°） */
  flankerRight: G09GaborSpec;
  /** 中央 target（低コントラスト = staircase 値、向きはランダム） */
  target: G09GaborSpec;
  /** target の実際の向き（= 正解） */
  correctOrientation: G09Orientation;
  /** 今回の staircase コントラスト（典型 0.05〜0.20） */
  paramContrast: number;
  /** 今回の派生距離（target 直径の N 倍、N が λ 倍数） */
  derivedSpacingLambdaMultiplier: number;
};

/** G-09 採点結果 */
export type G09GradingResult = {
  correctOrientation: G09Orientation;
  /** ユーザー回答（null = 未回答） */
  userAnswer: G09Orientation | null;
  isCorrect: boolean;
  /** 60 秒経過時に未選択だったか */
  unattempted: boolean;
};

/** flanker は高コントラスト 0.5（spec §7.9 / screens.md §3「両側 flanker 高コン 0.5」） */
export const G09_FLANKER_CONTRAST = 0.5;

/**
 * 共通ガボール描画パラメータ。spec §6.1 中域 cpd 4、SD 0.6°（G-08 と整合）。
 */
export const G09_GABOR_BASE_PARAMS = {
  cpd: 4,
  sigmaDeg: 0.6,
} as const;

/** flanker は垂直平行（GaborPatch orientationDeg = 90°） */
export const G09_FLANKER_ORIENTATION_DEG = 90;

/**
 * 「縦寄り」「横寄り」をパッチ角度（°）に変換。
 *
 * v1.1 では「縦寄り」「横寄り」を視覚的にわかりやすい固定角で実装する：
 *   - 縦寄り = 90°（垂直、orientationDeg=90）
 *   - 横寄り = 0°（水平、orientationDeg=0）
 *
 * Polat 系の本来パラダイムは target をわずかな差（数°）で判別させるが、v1.1 で
 * 「視認性」を優先し target が見えるかどうか（コントラスト依存）を主軸にするため、
 * 向き差は最大化（90° vs 0°）して判別自体は容易にし、flanker による抑制で
 * 「target が見えない → 判別できない」状況を作る方針。
 *
 * @internal export はテスト用
 */
export function orientationToOrientationDeg(o: G09Orientation): number {
  return o === 'vertical' ? 90 : 0;
}

/** 1 試行 60 秒、固視点 500ms（OPT-12 統一） */
export const GAME9_V11 = {
  /** OPT-11 強制 60 秒視聴、早期終了不可 */
  totalDurationMs: 60_000,
  /** 注視前の整え（screens.md S15-05 フェーズタイミング、500ms 固視点） */
  fixationDurationMs: 500,
  /** 採点直後の正解開示ハイライト時間（screens.md S15-06） */
  correctRevealMs: 1500,
} as const;

/**
 * spec §7.9：target コントラストから flanker spacing（target 直径の N 倍）を派生する。
 *
 *  contrast 0.05 → spacing 1.5λ（難・近接・強抑制）
 *  contrast 0.10 → spacing 3.0λ（初期）
 *  contrast 0.20 → spacing 5.0λ（易・離れ・抑制弱）
 *
 * 上記 3 点を結ぶ区分線形補間で、その他の中間値も連続的に算出する。
 * paramRange.min=0.05 / max=0.20 を超える入力は端値でクランプ。
 */
export function derivePolatSpacingFromContrast(contrast: number): number {
  // クランプ
  const c = Math.max(0.05, Math.min(0.2, contrast));
  let spacing: number;
  if (c <= 0.1) {
    // 0.05〜0.10 → 1.5〜3.0（線形）
    const t = (c - 0.05) / (0.1 - 0.05); // 0..1
    spacing = 1.5 + t * (3.0 - 1.5);
  } else {
    // 0.10〜0.20 → 3.0〜5.0（線形）
    const t = (c - 0.1) / (0.2 - 0.1); // 0..1
    spacing = 3.0 + t * (5.0 - 3.0);
  }
  // 浮動小数点誤差を 6 桁で丸める
  return Math.round(spacing * 1_000_000) / 1_000_000;
}

/**
 * 1 試行の target / flankers ガボール spec を生成する。
 *
 * - target は paramContrast の低コントラスト、向きは rng で 50% ずつ vertical/horizontal
 * - flanker 2 個は両側に固定の高コントラスト 0.5、垂直 90°
 * - 位相は 3 パッチ独立にランダム
 * - cpd / sigmaDeg は spec §6.1 中域固定
 *
 * @param paramContrast 現在の staircase target コントラスト（0.05〜0.20）
 * @param rng 0〜1 の擬似乱数生成器（テスト容易性、デフォルト Math.random）
 */
export function buildG09Trial(
  paramContrast: number,
  rng: () => number = Math.random,
): G09TrialSpec {
  // target 向きランダム化
  const correctOrientation: G09Orientation =
    rng() < 0.5 ? 'vertical' : 'horizontal';
  const c = clampContrast(paramContrast);
  const spacing = derivePolatSpacingFromContrast(c);

  const flankerCommon = {
    cpd: G09_GABOR_BASE_PARAMS.cpd,
    contrast: G09_FLANKER_CONTRAST,
    sigmaDeg: G09_GABOR_BASE_PARAMS.sigmaDeg,
    orientationDeg: G09_FLANKER_ORIENTATION_DEG,
  };

  const flankerLeft: G09GaborSpec = {
    ...flankerCommon,
    phaseRad: rng() * 2 * Math.PI,
  };
  const flankerRight: G09GaborSpec = {
    ...flankerCommon,
    phaseRad: rng() * 2 * Math.PI,
  };
  const target: G09GaborSpec = {
    cpd: G09_GABOR_BASE_PARAMS.cpd,
    contrast: c,
    sigmaDeg: G09_GABOR_BASE_PARAMS.sigmaDeg,
    orientationDeg: orientationToOrientationDeg(correctOrientation),
    phaseRad: rng() * 2 * Math.PI,
  };

  return {
    flankerLeft,
    flankerRight,
    target,
    correctOrientation,
    paramContrast: c,
    derivedSpacingLambdaMultiplier: spacing,
  };
}

/**
 * 採点：選択が target の実際の向きと一致なら正解。
 * userAnswer === null（未回答）→ 不正解扱い、unattempted=true。
 */
export function gradeG09(
  trial: G09TrialSpec,
  userAnswer: G09Orientation | null,
): G09GradingResult {
  if (userAnswer === null) {
    return {
      correctOrientation: trial.correctOrientation,
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
    };
  }
  return {
    correctOrientation: trial.correctOrientation,
    userAnswer,
    isCorrect: userAnswer === trial.correctOrientation,
    unattempted: false,
  };
}

/** 「中央は縦縞」/「中央は横縞」（screens.md S15-05 / S15-06 結果ラベル） */
export function orientationToJaLabel(o: G09Orientation): string {
  return o === 'vertical' ? '中央は縦縞' : '中央は横縞';
}

/** 「縦縞」/「横縞」短縮版（ボタンラベル等） */
export function orientationToShortJaLabel(o: G09Orientation): string {
  return o === 'vertical' ? '縦縞' : '横縞';
}

/** ユーザー回答（null 含む）→ 表示文字列。null は呼び出し側で「未回答」処理 */
export function userAnswerOrientationToLabel(
  o: G09Orientation | null,
): string | null {
  if (o === null) return null;
  return orientationToJaLabel(o);
}

/**
 * レスポンシブなパッチサイズと spacing（screens.md §4 / components.md §15 GE-09）。
 *
 * | viewport 幅 | パッチ一辺 |
 * |---|---|
 * | <=360px | 64 |
 * | <=375px | 80 |
 * | <=767px | 80 |
 * | 768〜1279px | 100 |
 * | >=1280px | 120 |
 *
 * spacing px は「target 直径 × spacing λ multiplier」で算出（呼び出し側で
 * `derivePolatSpacingFromContrast` の結果と組み合わせる）。
 *
 * 360px viewport で flanker | target | flanker が 64×3 + spacing×2 で 360px に
 * 収まるよう、最も難しい spacing 1.5（target 直径×1.5＝64×1.5=96 ≒ 100px）
 * のときでも合計 64*3 + 100*2 = 392 だがコンテナ padding 16+16 = 32 を引いて
 * 約 360px に近い。screens.md §4 表に合わせる。
 *
 * 高さが極端に小さい場合の safety は不要（横並びのみ）。
 */
export function computeG09StimulusLayout(
  viewportWidthOrSize: number | { widthPx: number; heightPx?: number },
  viewportHeightPx?: number,
): {
  patchSizePx: number;
  /** 計算用：spacing 比率（λ multiplier）と組み合わせる時に使う target 直径 */
  patchDiameterPx: number;
} {
  let widthPx: number;
  if (typeof viewportWidthOrSize === 'number') {
    widthPx = viewportWidthOrSize;
  } else {
    widthPx = viewportWidthOrSize.widthPx;
  }
  // viewportHeightPx は現状未使用（横並びのみ）。将来用に引数受け付け。
  void viewportHeightPx;

  let layout: { patchSizePx: number; patchDiameterPx: number };
  if (widthPx <= 360) {
    layout = { patchSizePx: 64, patchDiameterPx: 64 };
  } else if (widthPx <= 375) {
    layout = { patchSizePx: 80, patchDiameterPx: 80 };
  } else if (widthPx < 768) {
    layout = { patchSizePx: 80, patchDiameterPx: 80 };
  } else if (widthPx < 1280) {
    layout = { patchSizePx: 100, patchDiameterPx: 100 };
  } else {
    layout = { patchSizePx: 120, patchDiameterPx: 120 };
  }
  return layout;
}

/**
 * spacing λ multiplier と patchDiameterPx から実際の center-to-center spacing px を
 * 算出する。さらに、合計幅が viewportWidth を超えるなら spacing px を縮小し、
 * 描画が画面に収まるよう保つ。
 *
 * 実装：合計幅 = patchSizePx * 3 + spacingPx * 2（center-to-center 距離なら
 * spacingPx は edge-to-edge 距離で計算）。簡略化のため edge-to-edge spacing を
 * 採用する。
 *
 * - flanker | gap | target | gap | flanker
 * - gap = max(8, spacingPxRequested)
 * - 合計 = patchSize*3 + gap*2
 * - viewportWidth - 32（左右 padding）以下に収まるよう gap をクランプ
 */
export function computeG09SpacingPx(args: {
  spacingLambdaMultiplier: number;
  patchDiameterPx: number;
  viewportWidthPx: number;
  /** 横方向 padding（左右合計、デフォルト 32） */
  horizontalPaddingPx?: number;
}): { gapPx: number; totalWidthPx: number } {
  const { spacingLambdaMultiplier, patchDiameterPx, viewportWidthPx } = args;
  const horizontalPaddingPx = args.horizontalPaddingPx ?? 32;

  // 1 ガボール直径 = 1λ 相当として扱う（spec §6.1：sigmaDeg 0.6° ≈ 1λ 相当の窓）。
  // gap = (multiplier - 1) * patchDiameter（multiplier=1 で隣接、>1 で離れる）
  const requestedGap = Math.max(
    8,
    (spacingLambdaMultiplier - 1) * patchDiameterPx,
  );

  // 全幅 = patch * 3 + gap * 2
  const allowedWidth = viewportWidthPx - horizontalPaddingPx;
  const maxGapByWidth = Math.max(8, (allowedWidth - patchDiameterPx * 3) / 2);
  const gapPx = Math.min(requestedGap, maxGapByWidth);
  const totalWidthPx = patchDiameterPx * 3 + gapPx * 2;
  return {
    gapPx: Math.round(gapPx),
    totalWidthPx: Math.round(totalWidthPx),
  };
}

/** コントラストの浮動小数点誤差を 6 桁で丸め、staircase 範囲外もクランプ */
function clampContrast(v: number): number {
  const clamped = Math.max(0.05, Math.min(0.2, v));
  return Math.round(clamped * 1_000_000) / 1_000_000;
}

/** 引数の型を満たすために再エクスポート（呼び出し元からの利便性） */
export type { ViewingDistanceCm };
