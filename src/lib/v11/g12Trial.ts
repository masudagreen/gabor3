/**
 * G-12 クラウディング（Crowding）の純関数ロジック（spec-v11.md §7.12、
 * screens.md S17-02、components.md §15 GE-12）。
 *
 * Levi & Li 2009 / Whitney & Levi 2011 のクラウディングパラダイムを v1.1 OPT-12
 * 統一フォーマットに適用：中央 target ガボール + 周囲 4〜6 個の flanker を 60 秒
 * 同時提示。target の向き（垂直 / 水平 / 斜め右 / 斜め左）を判別する。target-flanker
 * spacing（target 直径の倍率）が staircase 連動。spacing が狭いほど target が
 * 「のまれて」識別困難になる。
 *
 * v1.1 OPT-12 統一：
 *   - 60 秒同時提示（マスク・フェード・点滅なし）
 *   - 確定ボタンなし、自由回答変更可、自動採点
 *   - 4 択ボタン「垂直 / 水平 / 斜め右 / 斜め左」（horizontal-4）
 *   - 60 秒経過で未回答 = 不正解、staircase 易方向（spacing 増）
 *
 * staircase（gameRegistry G-12 entry）：
 *   - paramRange.min = 1.2（難・近接）
 *   - paramRange.max = 4.0（易・離れ）
 *   - paramRange.initial = 2.0
 *   - paramRange.step = 0.2
 *
 * 周囲 flanker 個数：components.md §15 GE-12 の「4〜6 個」指定。本実装では
 * **6 個（ヘキサゴン配置、Levi & Li 2009 / Pelli 2008 の典型構成）** を採用。
 * 中央を頂点とする正六角形の 6 頂点に flanker を配置する。
 *
 * 純関数のみ。AsyncStorage / RN は触らない。
 */

import { ViewingDistanceCm } from '../calibration';

/** target の 4 つの向き（screens.md S17-02） */
export type G12Orientation = 'vertical' | 'horizontal' | 'diagonalRight' | 'diagonalLeft';

/** 全向きの列挙 */
export const G12_ALL_ORIENTATIONS: ReadonlyArray<G12Orientation> = [
  'vertical',
  'horizontal',
  'diagonalRight',
  'diagonalLeft',
];

/** 周囲 flanker の個数（ヘキサゴン配置 = 6 個、components.md §15 GE-12） */
export const G12_FLANKER_COUNT = 6;

/** 1 ガボールの spec（GE-12 描画用） */
export type G12GaborSpec = {
  cpd: number;
  contrast: number;
  sigmaDeg: number;
  /** GaborPatch 規約：反時計回り正、垂直 = 90° */
  orientationDeg: number;
  phaseRad: number;
};

/** flanker 1 個の配置情報（極座標） */
export type G12FlankerPlacement = {
  /** 中央からの角度（rad、0=右、π/2=下、screen 座標系で時計回り正） */
  angleRad: number;
  /** 中央からの距離（target 直径倍率） */
  distanceMultiplier: number;
};

/** 1 試行の spec：中央 target + 周囲 6 flanker + 正解向き + spacing */
export type G12TrialSpec = {
  /** 中央 target ガボール（向きは正解向き） */
  target: G12GaborSpec;
  /** 周囲 flanker 配列（6 個、各 flanker の向きはランダム、位相も独立） */
  flankers: ReadonlyArray<G12GaborSpec>;
  /** flanker の配置情報（同じ index で対応） */
  flankerPlacements: ReadonlyArray<G12FlankerPlacement>;
  /** target の実際の向き（= 正解） */
  correctOrientation: G12Orientation;
  /** 今回の staircase spacing（target 直径の倍率、典型 1.2〜4.0） */
  paramSpacingMultiplier: number;
};

/** G-12 採点結果 */
export type G12GradingResult = {
  correctOrientation: G12Orientation;
  userAnswer: G12Orientation | null;
  isCorrect: boolean;
  unattempted: boolean;
};

/** Crowding 用ガボール共通パラメータ（spec §6.1 中域 cpd 4） */
export const G12_GABOR_BASE_PARAMS = {
  cpd: 4,
  /** target も flanker も同じ高めコントラストで見える（spacing 自体が staircase） */
  contrast: 0.5,
  /** やや小さめの窓（パッチ自体は 60×60 の小サイズ） */
  sigmaDeg: 0.5,
} as const;

/** 1 試行 60 秒（OPT-11 / OPT-12 統一） */
export const GAME12_V11 = {
  /** OPT-11 強制 60 秒視聴、早期終了不可 */
  totalDurationMs: 60_000,
  /** 採点直後の正解開示ハイライト時間（screens.md S17-03） */
  correctRevealMs: 1500,
} as const;

/**
 * 「垂直 / 水平 / 斜め右 / 斜め左」をパッチ角度（°、GaborPatch 規約：反時計回り正、
 * 垂直 = 90°）に変換。
 *
 *   - vertical：90°（縦縞）
 *   - horizontal：0°（横縞）
 *   - diagonalRight（右上がり）：45°
 *   - diagonalLeft（左上がり）：135°
 */
export function orientationToOrientationDeg(o: G12Orientation): number {
  switch (o) {
    case 'vertical':
      return 90;
    case 'horizontal':
      return 0;
    case 'diagonalRight':
      return 45;
    case 'diagonalLeft':
      return 135;
  }
}

/** 「垂直」「水平」「斜め右」「斜め左」（screens.md S17-02 / S17-03） */
export function orientationToJaLabel(o: G12Orientation): string {
  switch (o) {
    case 'vertical':
      return '垂直';
    case 'horizontal':
      return '水平';
    case 'diagonalRight':
      return '斜め右';
    case 'diagonalLeft':
      return '斜め左';
  }
}

/** ユーザー回答（null 含む）→ 表示文字列。null は呼び出し側で「未回答」処理 */
export function userAnswerOrientationToLabel(
  o: G12Orientation | null,
): string | null {
  if (o === null) return null;
  return orientationToJaLabel(o);
}

/**
 * rng で G12Orientation を 1 つランダムに選ぶ（4 択均等）。
 * @internal export はテスト用
 */
export function pickRandomOrientation(rng: () => number): G12Orientation {
  const idx = Math.min(3, Math.floor(rng() * 4));
  return G12_ALL_ORIENTATIONS[idx];
}

/**
 * 1 試行の target / flanker spec を生成する。
 *
 * - target は paramSpacingMultiplier の spacing（staircase）、向きは rng で 4 択ランダム
 * - flanker 6 個はヘキサゴン頂点（30°/90°/150°/210°/270°/330°）に等間隔配置
 *   - 30° から開始 → 60° ずつ反時計回り。screens.md S17-02 のレイアウトに対応
 * - 各 flanker の向きは rng で 4 択ランダム（target を「のませる」役割）
 * - 位相は target / 各 flanker 独立にランダム
 * - cpd / contrast / sigmaDeg は spec §6.1 中域固定
 *
 * @param paramSpacingMultiplier 現在の staircase spacing 倍率（1.2〜4.0）
 * @param rng 0〜1 の擬似乱数生成器（テスト容易性、デフォルト Math.random）
 */
export function buildG12Trial(
  paramSpacingMultiplier: number,
  rng: () => number = Math.random,
): G12TrialSpec {
  const correctOrientation = pickRandomOrientation(rng);
  const spacing = clampSpacing(paramSpacingMultiplier);

  const target: G12GaborSpec = {
    cpd: G12_GABOR_BASE_PARAMS.cpd,
    contrast: G12_GABOR_BASE_PARAMS.contrast,
    sigmaDeg: G12_GABOR_BASE_PARAMS.sigmaDeg,
    orientationDeg: orientationToOrientationDeg(correctOrientation),
    phaseRad: rng() * 2 * Math.PI,
  };

  // 6 flanker をヘキサゴン頂点（30°開始、60° ずつ）に配置
  const flankerPlacements: G12FlankerPlacement[] = [];
  const flankers: G12GaborSpec[] = [];
  for (let i = 0; i < G12_FLANKER_COUNT; i++) {
    // 30° + 60° * i（rad に変換、screen 座標系：x=右、y=下、時計回り正）
    const angleDeg = 30 + i * 60;
    const angleRad = (angleDeg * Math.PI) / 180;
    flankerPlacements.push({
      angleRad,
      distanceMultiplier: spacing,
    });
    // flanker の向きは独立にランダム（target を crowding する役割）
    const fOrientation = pickRandomOrientation(rng);
    flankers.push({
      cpd: G12_GABOR_BASE_PARAMS.cpd,
      contrast: G12_GABOR_BASE_PARAMS.contrast,
      sigmaDeg: G12_GABOR_BASE_PARAMS.sigmaDeg,
      orientationDeg: orientationToOrientationDeg(fOrientation),
      phaseRad: rng() * 2 * Math.PI,
    });
  }

  return {
    target,
    flankers,
    flankerPlacements,
    correctOrientation,
    paramSpacingMultiplier: spacing,
  };
}

/**
 * 採点：選択が target の実際の向きと一致なら正解。
 * userAnswer === null（未回答）→ 不正解扱い、unattempted=true。
 */
export function gradeG12(
  trial: G12TrialSpec,
  userAnswer: G12Orientation | null,
): G12GradingResult {
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

/**
 * レスポンシブなパッチサイズ（screens.md §4 / components.md §15 GE-12）。
 *
 * | viewport 幅 | 中央 target / flanker パッチ |
 * |---|---|
 * | <=360px | 50 |
 * | <=375px | 60 |
 * | <=767px | 60 |
 * | 768〜1279px | 72 |
 * | >=1280px | 80 |
 */
export function computeG12StimulusLayout(
  viewportWidthOrSize: number | { widthPx: number; heightPx?: number },
): {
  patchSizePx: number;
  /** 計算用：target 直径（=patchSizePx と同値、spacing 倍率と組み合わせる） */
  targetDiameterPx: number;
} {
  let widthPx: number;
  if (typeof viewportWidthOrSize === 'number') {
    widthPx = viewportWidthOrSize;
  } else {
    widthPx = viewportWidthOrSize.widthPx;
  }

  let patchSizePx: number;
  if (widthPx <= 360) patchSizePx = 50;
  else if (widthPx < 768) patchSizePx = 60;
  else if (widthPx < 1280) patchSizePx = 72;
  else patchSizePx = 80;

  return { patchSizePx, targetDiameterPx: patchSizePx };
}

/**
 * spacing 倍率と target 直径から、画面に収まる実 spacing px を算出する。
 *
 * spacing は target 中心 ↔ flanker 中心の center-to-center 距離 ÷ target 直径。
 * staircase 値 1.2〜4.0 のうち、4.0 が最大（最易、離れ）。
 *
 * 6 角形配置の bounding box 一辺は `2 * (centerDistance + flankerHalf)` ＝
 * `2 * (spacing * targetDiameter + targetDiameter/2)`。これが viewport の
 * 利用可能幅（padding 引いた値）に収まらない場合は spacing をクランプする。
 *
 * @returns clampedSpacing と centerDistancePx（中心 ↔ 中心、px）と総幅
 */
export function computeG12FlankerSpacingPx(args: {
  spacingMultiplier: number;
  targetDiameterPx: number;
  /** stimulus 領域の利用可能辺長（左右 padding 込みの内側、デフォルト：viewport - 32） */
  availableSizePx: number;
}): {
  clampedMultiplier: number;
  centerDistancePx: number;
  /** 6 角形 bounding 一辺の長さ（px、表示領域に収めるために確保すべき） */
  boundingSizePx: number;
} {
  const { spacingMultiplier, targetDiameterPx, availableSizePx } = args;
  const half = targetDiameterPx / 2;

  // bounding 一辺 = 2 * (centerDistance + flankerHalf)
  // centerDistance = spacing * targetDiameter
  // → 2 * spacing * targetDiameter + targetDiameter <= availableSize
  const maxAllowedSpacing = Math.max(
    1.0,
    (availableSizePx - targetDiameterPx) / (2 * targetDiameterPx),
  );
  const clamped = Math.max(
    1.0,
    Math.min(spacingMultiplier, maxAllowedSpacing),
  );
  const centerDistancePx = clamped * targetDiameterPx;
  const boundingSizePx = 2 * centerDistancePx + targetDiameterPx;
  return {
    clampedMultiplier: Math.round(clamped * 1_000_000) / 1_000_000,
    centerDistancePx: Math.round(centerDistancePx * 1_000_000) / 1_000_000,
    boundingSizePx: Math.round(boundingSizePx * 1_000_000) / 1_000_000,
  };
}

/**
 * flanker 1 個の中心位置（target 中心からの相対 px、x/y）を算出する。
 * angleRad は反時計回り正で渡されるが、screen 座標系（y は下が正）に合わせて
 * `cos(angle), sin(angle)` をそのまま使う（呼び出し側で「下方向＋」になる）。
 *
 * @param placement flanker の極座標（angleRad / distanceMultiplier）
 * @param targetDiameterPx 中央 target の直径（spacing 倍率の基準）
 */
export function computeG12FlankerOffsetPx(
  placement: G12FlankerPlacement,
  targetDiameterPx: number,
): { xPx: number; yPx: number } {
  const r = placement.distanceMultiplier * targetDiameterPx;
  const x = r * Math.cos(placement.angleRad);
  const y = r * Math.sin(placement.angleRad);
  return {
    xPx: Math.round(x * 1_000_000) / 1_000_000,
    yPx: Math.round(y * 1_000_000) / 1_000_000,
  };
}

/** spacing 倍率の浮動小数点誤差を 6 桁で丸め、staircase 範囲外もクランプ */
function clampSpacing(v: number): number {
  // staircase 範囲は 1.2〜4.0、念のため 1.0〜5.0 でクランプ
  const clamped = Math.max(1.0, Math.min(5.0, v));
  return Math.round(clamped * 1_000_000) / 1_000_000;
}

/** 引数の型を満たすために再エクスポート（呼び出し元からの利便性） */
export type { ViewingDistanceCm };
