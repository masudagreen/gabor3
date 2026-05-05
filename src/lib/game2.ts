/**
 * Game 2（左右並び 2AFC「どちらが時計回りか」判別）の純関数ロジック。
 *
 * spec.md §7.2 / screens.md S1-03（amendment）に従う。
 *
 * 試行構造（同時提示型）：
 *   fixation 500ms → presentation 5000ms（左右並び、同時静止表示）
 *   → answer 最大 3000ms（左右どちらが時計回りに傾いているか 2AFC）
 *   → feedback 1000ms → 次試行
 *
 * パラメータ：
 *   - 角度差（degrees）を staircase が上下させる（min 1°、max 10°、初期 6°）
 *   - 基準角度を 0〜180° のランダム、片側を +diff/2、もう片側を -diff/2 に置く
 *   - 「時計回り（clockwise）= 角度値が増える側」を正解側に持つガボールの位置（左右）をランダム化
 *
 * パッチ A は左、パッチ B は右と固定。どちらが時計回り側かは correctSide で表す。
 */

export type Side = 'left' | 'right';

export type Game2GaborSpec = {
  cpd: 1.5 | 3 | 6 | 9;
  contrast: number;
  sigmaDeg: number;
  orientationDeg: number;
  phaseRad: number;
};

export type Game2TrialSpec = {
  /** 左ガボールの spec */
  left: Game2GaborSpec;
  /** 右ガボールの spec */
  right: Game2GaborSpec;
  /** 正解（時計回りに傾いている側） */
  correctSide: Side;
  /** 現在の staircase 角度差（°、=左右の orientation 差の絶対値） */
  paramValue: number;
  /** 基準角度（°、左右ガボールはこれの ±paramValue/2） */
  baseOrientationDeg: number;
};

const CPD: Game2GaborSpec['cpd'] = 3;
const CONTRAST = 0.3;
const SIGMA_DEG = 0.6;

/**
 * 1 試行の左右ガボール spec を生成する。
 *
 * 「時計回り」= orientation 値が増える方向と定義する。
 *
 * @param paramValue 現在の staircase 角度差（°、>=0）
 * @param rng 0〜1 の擬似乱数生成器（テスト容易性）
 */
export function buildTrialSpec(
  paramValue: number,
  rng: () => number = Math.random,
): Game2TrialSpec {
  const baseOrientationDeg = rng() * 180; // 0〜180° 一様
  const half = paramValue / 2;

  // 「時計回り側のガボール」を左／右どちらに置くか
  const correctSide: Side = rng() < 0.5 ? 'left' : 'right';
  const leftIsCw = correctSide === 'left';

  const leftOrientation = mod180(
    baseOrientationDeg + (leftIsCw ? half : -half),
  );
  const rightOrientation = mod180(
    baseOrientationDeg + (leftIsCw ? -half : half),
  );

  return {
    left: {
      cpd: CPD,
      contrast: CONTRAST,
      sigmaDeg: SIGMA_DEG,
      orientationDeg: leftOrientation,
      phaseRad: rng() * 2 * Math.PI,
    },
    right: {
      cpd: CPD,
      contrast: CONTRAST,
      sigmaDeg: SIGMA_DEG,
      orientationDeg: rightOrientation,
      phaseRad: rng() * 2 * Math.PI,
    },
    correctSide,
    paramValue,
    baseOrientationDeg,
  };
}

function mod180(deg: number): number {
  let v = deg % 180;
  if (v < 0) v += 180;
  return v;
}

/**
 * ユーザー回答 → 正誤判定。
 * 「左／右ボタンのうち時計回りに傾いている方」を答える 2AFC。
 */
export function gradeAnswer(spec: Game2TrialSpec, userAnswer: Side): boolean {
  return spec.correctSide === userAnswer;
}

/** Game 2 セッションの定数（spec.md §7.2） */
export const GAME2 = {
  /** セッション全体の制限時間 */
  sessionDurationMs: 60_000,
  /** 後方互換用エイリアス（既存コードが totalDurationMs を参照） */
  totalDurationMs: 60_000,
  /** セッション内最大試行数 */
  maxTrials: 30,
  /** 固視点フェーズ */
  fixationDurationMs: 500,
  /** 左右並び同時提示フェーズ（点滅・マスクなし） */
  presentationDurationMs: 5000,
  /** 提示後の回答受付制限 */
  responseTimeLimitMs: 3000,
  /** 後方互換用エイリアス */
  answerTimeoutMs: 3000,
  /** フィードバック表示時間（同じガボールを表示し続け次試行への切り替えを緩やかにする） */
  feedbackDurationMs: 1500,
} as const;
