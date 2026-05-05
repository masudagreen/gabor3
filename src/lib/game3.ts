/**
 * Game 3（周辺視野ハント / Peripheral Pop-out）の純関数ロジック。
 *
 * spec.md §7.3 / screens.md S3-01 に従う。
 *
 * - 8 個のガボールを固視点中心の円周上に配置（45° 等間隔）
 *   時計の 12 / 1:30 / 3 / 4:30 / 6 / 7:30 / 9 / 10:30 時方向
 * - そのうち 1 個（odd one）だけが他と異なる向きを持つ
 *   - base orientation：8 方向（0/45/90/135 のいずれか）からランダム
 *   - odd one orientation：base + ±delta (delta = staircase paramValue, °)
 * - 提示時間：staircase 連動で 300〜800ms（param が小さくなるほど短く）
 * - マスク：200ms
 * - 回答制限：2 秒以内（タイムアウトは noResponse）
 * - 試行回数：60 秒で最大 40 試行
 */

import { ORIENTATION_DEG_SET } from './gaborOrientations';

/** 時計方向ラベル（screens.md S3-01 / components.md §19） */
export const CLOCK_POSITIONS = [
  '12',
  '1:30',
  '3',
  '4:30',
  '6',
  '7:30',
  '9',
  '10:30',
] as const;
export type ClockPosition = typeof CLOCK_POSITIONS[number];

/** ポジションインデックス 0..7（0 が 12 時、時計回りに +45° ずつ） */
export type PositionIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Game 3 セッション定数（spec.md §7.3） */
export const GAME3 = {
  totalDurationMs: 60_000,
  maxTrials: 40,
  /** 回答タイムアウト（パッチ消失後 2 秒以内、spec.md §7.3） */
  answerTimeoutMs: 2000,
  /** マスク 200ms */
  maskDurationMs: 200,
  /** 固視点だけの待機 500ms */
  fixationDurationMs: 500,
  /** 試行終了後フィードバック 0.8 秒（spec.md §7.3） */
  feedbackDurationMs: 800,
  /** 試行間クールダウン 100ms（screens.md S3-01） */
  cooldownMs: 100,
  /** ガボール表示パラメータ */
  baseContrast: 0.5,
  cpd: 3 as const,
  sigmaDeg: 0.6,
  /** 離心角の既定（spec.md §7.3：易 6°／中 8°／難 10°） */
  defaultEccentricityDeg: 8,
} as const;

/** 1 試行のスペック */
export type Game3TrialSpec = {
  /** 8 パッチの向き（[12 時, 1:30, 3, ..., 10:30] 順） */
  orientations: number[];
  /** odd one の position index（0..7） */
  oddPositionIndex: PositionIndex;
  /** odd one の時計ラベル（screens.md S3-01） */
  oddClockPosition: ClockPosition;
  /** base orientation（°） */
  baseOrientationDeg: number;
  /** odd orientation（°、base ± delta） */
  oddOrientationDeg: number;
  /** delta（°）= staircase paramValue */
  paramValue: number;
  /** 離心角（°）— 表示位置の半径計算に使用 */
  eccentricityDeg: number;
  /** 提示時間（ms）— staircase 連動 */
  presentationDurationMs: number;
  /** 各パッチの位相（ランダム） */
  phasesRad: number[];
};

/**
 * staircase の currentParam（角度差 °）から提示時間を導出。
 * spec.md §7.3：易 800ms (param 大) ／中 500ms ／難 300ms (param 小)
 *
 * Game 3 staircase の範囲は min=5° / max=45°、初期 30°。
 *   - param ≥ 25°：易 → 800ms
 *   - 15° ≤ param < 25°：中 → 500ms
 *   - param < 15°：難 → 300ms
 */
export function presentationDurationFor(paramValue: number): number {
  if (paramValue >= 25) return 800;
  if (paramValue >= 15) return 500;
  return 300;
}

/**
 * staircase の currentParam から離心角を導出。
 * spec.md §7.3：易 6°／中 8°／難 10°（角度差が縮まったら離心角も大きく＝難しく）
 */
export function eccentricityForParam(paramValue: number): number {
  if (paramValue >= 25) return 6;
  if (paramValue >= 15) return 8;
  return 10;
}

/**
 * 1 試行のパッチ群と odd one を生成する。
 *
 * @param paramValue staircase 現在値（角度差 °）
 * @param rng 0〜1 の擬似乱数（テスト容易性）
 */
export function buildGame3Trial(
  paramValue: number,
  rng: () => number = Math.random,
): Game3TrialSpec {
  const baseIdx = Math.floor(rng() * ORIENTATION_DEG_SET.length);
  const baseOrientationDeg = ORIENTATION_DEG_SET[baseIdx];
  const sign = rng() < 0.5 ? +1 : -1;
  const oddOrientationDeg = mod180(baseOrientationDeg + sign * paramValue);

  const oddPositionIndex = Math.floor(rng() * 8) as PositionIndex;

  const orientations: number[] = [];
  const phasesRad: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    orientations.push(
      i === oddPositionIndex ? oddOrientationDeg : baseOrientationDeg,
    );
    phasesRad.push(rng() * 2 * Math.PI);
  }

  return {
    orientations,
    oddPositionIndex,
    oddClockPosition: CLOCK_POSITIONS[oddPositionIndex],
    baseOrientationDeg,
    oddOrientationDeg,
    paramValue,
    eccentricityDeg: eccentricityForParam(paramValue),
    presentationDurationMs: presentationDurationFor(paramValue),
    phasesRad,
  };
}

/**
 * ユーザーの回答（時計方向）→ 正誤判定。
 *
 * @returns true = 正解（odd one の方向と一致）
 */
export function gradeGame3(
  spec: Game3TrialSpec,
  userAnswer: ClockPosition,
): boolean {
  return spec.oddClockPosition === userAnswer;
}

/**
 * 「未回答」判定（spec.md §7.3）。
 *
 * パッチ消失後 2 秒以内に回答が無ければ noResponse、staircase は up（易方向）。
 * パラメータは「タイムアウトしたか否か」のみ。
 */
export function isNoResponse(
  userAnswer: ClockPosition | null,
  timedOut: boolean,
): boolean {
  return userAnswer === null && timedOut;
}

/**
 * position index → 時計ラベル変換。
 */
export function clockPositionForIndex(idx: PositionIndex): ClockPosition {
  return CLOCK_POSITIONS[idx];
}

/**
 * 時計ラベル → position index 変換。
 */
export function indexForClockPosition(pos: ClockPosition): PositionIndex {
  const i = CLOCK_POSITIONS.indexOf(pos);
  if (i < 0) throw new Error(`unknown clock position: ${pos}`);
  return i as PositionIndex;
}

/**
 * position index（0..7）から円周上の角度（radian、12 時 = -π/2）を返す。
 *
 * 12 時方向 = -π/2（画面座標系で「上」）、時計回りに 45° ずつ。
 *   idx 0 → -π/2（上）
 *   idx 1 → -π/2 + π/4 （右上）
 *   ...
 */
export function angleRadForIndex(idx: PositionIndex): number {
  return -Math.PI / 2 + (idx * Math.PI) / 4;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mod180(deg: number): number {
  let v = deg % 180;
  if (v < 0) v += 180;
  return v;
}
