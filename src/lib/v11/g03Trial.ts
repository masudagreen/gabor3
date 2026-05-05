/**
 * G-03 周辺視野ハント（Peripheral Pop-out）の純関数ロジック（spec-v11.md §7.3）。
 *
 * v1 の `src/lib/game3.ts` を v1.1 OPT-12 統一フォーマットに沿って移植したもの。
 *
 * v1.1 仕様（v1 からの主な変更点、screens.md S11-02 / spec-v11.md §7.3）：
 *   - 1 試行 = 60 秒固定（v1 の「マスク 200ms」「40 試行ループ」廃止）
 *   - 提示時間 staircase / 離心角 staircase は廃止。staircase は **odd one の向き差**（°）のみ
 *   - 離心角は 8° 固定
 *   - 固視点 500ms → 中央固視点 + 円周 8 ガボール 60 秒同時提示 → 自動採点
 *
 * 試行スペック生成・採点は本モジュールが担当。AsyncStorage / RN は触らない
 * （テスト容易性、純関数）。
 */

import { ORIENTATION_DEG_SET } from '../gaborOrientations';

/** 時計方向ラベル（screens.md S11-02 / components.md §5） */
export const G03_CLOCK_POSITIONS = [
  '12',
  '1.5',
  '3',
  '4.5',
  '6',
  '7.5',
  '9',
  '10.5',
] as const;
export type G03ClockPosition = typeof G03_CLOCK_POSITIONS[number];

/** ポジションインデックス 0..7（0 が 12 時、時計回りに +45° ずつ） */
export type G03PositionIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** G-03 セッション定数（spec-v11.md §7.3、screens.md S11-02） */
export const GAME3_V11 = {
  /** OPT-11 強制 60 秒視聴、早期終了不可 */
  totalDurationMs: 60_000,
  /** 固視点表示（提示前の整え、screens.md S11-02 フェーズタイミング表） */
  fixationDurationMs: 500,
  /** 採点直後の正解開示（矢印表示）時間（screens.md S11-03） */
  correctRevealMs: 1500,
  /** 離心角 8° 固定（spec-v11.md §7.3） */
  eccentricityDeg: 8,
  /** ガボール描画パラメータ（v1 から踏襲） */
  baseContrast: 0.5,
  cpd: 3 as const,
  sigmaDeg: 0.6,
} as const;

/** 1 ガボールパッチの spec（描画用） */
export type G03GaborSpec = {
  cpd: number;
  contrast: number;
  sigmaDeg: number;
  orientationDeg: number;
  phaseRad: number;
};

/** 1 試行の 8 ガボールスペックと odd one 情報 */
export type G03TrialSpec = {
  /** 8 パッチの spec（順序：12時, 1.5, 3, ..., 10.5 時） */
  patches: G03GaborSpec[];
  /** odd one の position index（0..7） */
  oddPositionIndex: G03PositionIndex;
  /** odd one の時計ラベル */
  oddClockPosition: G03ClockPosition;
  /** base orientation（°） */
  baseOrientationDeg: number;
  /** odd orientation（°、base ± delta） */
  oddOrientationDeg: number;
  /** delta（°）= staircase paramValue */
  paramValueDeg: number;
  /** 離心角（°）— 表示位置の半径計算に使用（v1.1 では 8° 固定） */
  eccentricityDeg: number;
};

/** G-03 採点結果 */
export type G03GradingResult = {
  /** 正解の時計ラベル */
  correctClockPosition: G03ClockPosition;
  /** 正解の position index */
  correctPositionIndex: G03PositionIndex;
  /** ユーザーが最終的に選んだ時計ラベル（null = 未回答） */
  userAnswer: G03ClockPosition | null;
  /** 採点結果 */
  isCorrect: boolean;
  /** 未回答かどうか（60 秒経過時に未選択） */
  unattempted: boolean;
};

/**
 * 1 試行の 8 ガボールパッチと odd one を生成する。
 *
 * - base orientation：8 方向（0/45/90/135 のいずれか）からランダム
 * - odd one orientation：base ± paramValueDeg（符号は rng で決定）
 * - odd one の position index：0..7 から rng で 1 つ選ぶ
 *
 * @param paramValueDeg staircase 現在値（角度差 °、>=0）
 * @param rng 0〜1 の擬似乱数（テスト容易性、デフォルト Math.random）
 */
export function buildG03Trial(
  paramValueDeg: number,
  rng: () => number = Math.random,
): G03TrialSpec {
  const baseIdx = Math.floor(rng() * ORIENTATION_DEG_SET.length);
  const baseOrientationDeg = ORIENTATION_DEG_SET[baseIdx];
  const sign = rng() < 0.5 ? +1 : -1;
  const oddOrientationDeg = mod180(baseOrientationDeg + sign * paramValueDeg);
  const oddPositionIndex = Math.floor(rng() * 8) as G03PositionIndex;

  const patches: G03GaborSpec[] = [];
  for (let i = 0; i < 8; i += 1) {
    patches.push({
      cpd: GAME3_V11.cpd,
      contrast: GAME3_V11.baseContrast,
      sigmaDeg: GAME3_V11.sigmaDeg,
      orientationDeg:
        i === oddPositionIndex ? oddOrientationDeg : baseOrientationDeg,
      phaseRad: rng() * 2 * Math.PI,
    });
  }

  return {
    patches,
    oddPositionIndex,
    oddClockPosition: G03_CLOCK_POSITIONS[oddPositionIndex],
    baseOrientationDeg,
    oddOrientationDeg,
    paramValueDeg,
    eccentricityDeg: GAME3_V11.eccentricityDeg,
  };
}

/**
 * 採点：選択が odd one の位置と一致なら正解。
 * userAnswer が null（未回答）の場合は不正解扱い、unattempted=true。
 */
export function gradeG03(
  trial: G03TrialSpec,
  userAnswer: G03ClockPosition | null,
): G03GradingResult {
  if (userAnswer === null) {
    return {
      correctClockPosition: trial.oddClockPosition,
      correctPositionIndex: trial.oddPositionIndex,
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
    };
  }
  return {
    correctClockPosition: trial.oddClockPosition,
    correctPositionIndex: trial.oddPositionIndex,
    userAnswer,
    isCorrect: userAnswer === trial.oddClockPosition,
    unattempted: false,
  };
}

/**
 * 時計ラベル（'1.5' など）→「1 時 30 分の方向」表示文字列（aria 用 / ResultSummary 用）。
 */
export function clockPositionToJaLabel(pos: G03ClockPosition): string {
  switch (pos) {
    case '12':
      return '12 時の方向';
    case '1.5':
      return '1 時 30 分の方向';
    case '3':
      return '3 時の方向';
    case '4.5':
      return '4 時 30 分の方向';
    case '6':
      return '6 時の方向';
    case '7.5':
      return '7 時 30 分の方向';
    case '9':
      return '9 時の方向';
    case '10.5':
      return '10 時 30 分の方向';
  }
}

/** ボタン表示用の短いラベル（screens.md S11-02 の '12 / 1:30 / 3 / 4:30 / 6 / 7:30 / 9 / 10:30'） */
export function clockPositionToShortLabel(pos: G03ClockPosition): string {
  switch (pos) {
    case '12':
      return '12';
    case '1.5':
      return '1:30';
    case '3':
      return '3';
    case '4.5':
      return '4:30';
    case '6':
      return '6';
    case '7.5':
      return '7:30';
    case '9':
      return '9';
    case '10.5':
      return '10:30';
  }
}

/** position index → 時計ラベル変換 */
export function clockPositionForIndex(idx: G03PositionIndex): G03ClockPosition {
  return G03_CLOCK_POSITIONS[idx];
}

/** 時計ラベル → position index 変換 */
export function indexForClockPosition(pos: G03ClockPosition): G03PositionIndex {
  const i = G03_CLOCK_POSITIONS.indexOf(pos);
  if (i < 0) throw new Error(`unknown clock position: ${pos}`);
  return i as G03PositionIndex;
}

/**
 * position index（0..7）から円周上の角度（radian、12 時 = -π/2）を返す。
 *
 * 12 時方向 = -π/2（画面座標系で「上」）、時計回りに 45° ずつ。
 *   idx 0 → -π/2（上）
 *   idx 1 → -π/2 + π/4 （右上）
 *   idx 2 → 0（右）
 *   ...
 */
export function angleRadForIndex(idx: G03PositionIndex): number {
  return -Math.PI / 2 + (idx * Math.PI) / 4;
}

/**
 * レスポンシブな円配置パラメータ（screens.md §5、S11-02）。
 * ユーザー要望（v1.1.3）：パッチを大きくして見やすくする。
 *
 * | viewport 幅 | ガボール領域 | 円直径（ボタン用） | 各パッチ |
 * |---|---|---|---|
 * | <=360px | 340×340 | 220 | 76 |
 * | <=767px | 360×360 | 230 | 84 |
 * | >=768px | 440×440 | 300 | 96 |
 *
 * 注：ガボール領域内のパッチは「離心角 8°」を実距離換算したいが、
 * フレーム内に収めるため `framePx/2 - patchSizePx/2 - margin` でクランプする。
 * 描画側 PeripheralLayout がそのクランプを担当する。
 */
export function computeG03StimulusLayout(
  viewportWidthOrSize: number | { widthPx: number; heightPx?: number },
  viewportHeightPx?: number,
): {
  framePx: number;
  patchSizePx: number;
  /** ボタン円配置の直径（screens.md S11-02：スマホ 220 / PC 280） */
  clockDiameterPx: number;
} {
  let widthPx: number;
  if (typeof viewportWidthOrSize === 'number') {
    widthPx = viewportWidthOrSize;
    void viewportHeightPx;
  } else {
    widthPx = viewportWidthOrSize.widthPx;
  }

  if (widthPx <= 360) {
    return { framePx: 340, patchSizePx: 76, clockDiameterPx: 220 };
  }
  if (widthPx < 768) {
    return { framePx: 360, patchSizePx: 84, clockDiameterPx: 230 };
  }
  return { framePx: 440, patchSizePx: 96, clockDiameterPx: 300 };
}

function mod180(deg: number): number {
  let v = deg % 180;
  if (v < 0) v += 180;
  return v;
}
