/**
 * G-08 残像方位弁別（Tilt Aftereffect）の純関数ロジック（spec-v11.md §7.8、
 * screens.md S15-02）。
 *
 * v1.1 では「画像切替なし」を厳守するため、Polat 系本来の adapter→test 切替型
 * パラダイムは採用せず、**adapter とテストパッチを同一画面の上下に並べ、60 秒間
 * ずっと見続ける**簡略形（spec §7.8 注記）で実装する。
 *
 * - 上：adapter（傾き 20° 固定、高コントラスト 0.6）
 * - 下：テストパッチ（傾きの絶対値 = staircase 値、向き = 時計回り or 反時計回り
 *   ランダム）
 * - 60 秒同時提示、確定ボタンなし、自動採点
 * - 選択肢「下のパッチは時計回り」「下のパッチは反時計回り」（horizontal-2）
 * - 採点：選択が下パッチの実際の傾き方向と一致 → 正解
 *
 * staircase（gameRegistry G-08 entry）：
 *   - paramRange.min = 1°（難・小角度）
 *   - paramRange.max = 10°（易・大角度）
 *   - paramRange.initial = 5°
 *   - paramRange.step = 1°
 *
 * 「時計回り」は画面上での回転方向。spec/spec/screens 共に「+ → 時計回り、−
 * → 反時計回り」相当の規約を採る。GaborPatch の `orientationDeg` は反時計回り
 * 正の規約（標準数学）なので、画面上の時計回り傾き θ° は `orientationDeg = 90 + θ`、
 * 反時計回り θ° は `orientationDeg = 90 - θ` とする（垂直 = 90°基準）。
 *
 * 純関数のみ。AsyncStorage / RN は触らない（テスト容易性）。
 */

import { ViewingDistanceCm } from '../calibration';

/** 下テストパッチの傾き方向 */
export type G08Direction = 'cw' | 'ccw';

/**
 * 1 ガボールの spec（GE-08 描画用、GE-02 / GE-04 / GE-05 / GE-06 と同型）。
 */
export type G08GaborSpec = {
  cpd: number;
  contrast: number;
  sigmaDeg: number;
  /** GaborPatch 規約：反時計回り正、垂直 = 90° */
  orientationDeg: number;
  phaseRad: number;
};

/** 1 試行の adapter / test ガボールスペックと正解方向 */
export type G08TrialSpec = {
  /** 上 adapter spec（傾き 20° 固定、高コントラスト） */
  adapter: G08GaborSpec;
  /**
   * 下テストパッチ spec（傾きは staircase 値 × 方向）。
   *
   * v1.1.1（Sprint 20-C）以前は単一テストパッチ（下中央に 1 個）。`test` のみが
   * 存在した。本フィールドは後方互換のため維持し、引き続き「ユーザーが見るべき
   * “メインの” テストパッチ（= correctDirection の方向に傾いたパッチ）」を表す。
   * v1.1.1 改訂版では下に左右 2 個のテストパッチを並べるが、staircase 値・採点
   * ロジックを不変に保つため、`test` は引き続き「正解側のテストパッチ」を指す。
   */
  test: G08GaborSpec;
  /** テストパッチの実際の傾き方向（= 正解） */
  correctDirection: G08Direction;
  /** 今回の staircase 絶対角度（°、>=1） */
  paramAngleDeg: number;
  /**
   * v1.1.1（Sprint 20-C）：下部に左右 2 個並べたときのテストパッチ spec。
   * `correctSide` のパッチは `test` と同一傾きで、反対側パッチは ±反転した
   * 反対方向に同じ絶対角度で傾いている。
   */
  testLeft: G08GaborSpec;
  testRight: G08GaborSpec;
  /** 下部のうち正解側（v1.1.1） */
  correctSide: 'left' | 'right';
};

/** G-08 採点結果 */
export type G08GradingResult = {
  correctDirection: G08Direction;
  /** ユーザー回答（null = 未回答） */
  userAnswer: G08Direction | null;
  isCorrect: boolean;
  /** 60 秒経過時に未選択だったか */
  unattempted: boolean;
  /**
   * v1.1.1（Sprint 20-C）：下部 2 パッチ直接選択時の正解側 / ユーザー選択側。
   * 旧 horizontal-2 方式（cw/ccw 直接）でも採点可能なため optional。
   */
  correctSide?: 'left' | 'right';
  userAnswerSide?: 'left' | 'right' | null;
};

/**
 * adapter の傾き（°、screens.md S15-02 / spec-v11.md §7.8「傾き 20° 固定」）。
 * 規約：時計回りで固定。GaborPatch の orientationDeg = 90 + 20 = 110°。
 */
export const G08_ADAPTER_TILT_DEG = 20;

/** adapter は高コントラスト 0.6（spec §7.8） */
export const G08_ADAPTER_CONTRAST = 0.6;

/** テストパッチのコントラスト（adapter より一段控えめ。視認性は確保） */
export const G08_TEST_CONTRAST = 0.4;

/**
 * 共通ガボール描画パラメータ。spec §6.1 の cpd 範囲（1.5〜9）の中域 4 cpd、
 * SD 0.6°（Sprint 13/14 の G-05 / G-06 と整合）を採用。
 */
export const G08_GABOR_BASE_PARAMS = {
  cpd: 4,
  sigmaDeg: 0.6,
} as const;

/** 1 試行 60 秒、固視点 500ms（OPT-12 統一） */
export const GAME8_V11 = {
  /** OPT-11 強制 60 秒視聴、早期終了不可 */
  totalDurationMs: 60_000,
  /** 注視前の整え（screens.md S15-02 フェーズタイミング） */
  fixationDurationMs: 500,
  /** 採点直後の正解開示ハイライト時間（screens.md S15-03） */
  correctRevealMs: 1500,
} as const;

/**
 * adapter の orientationDeg を返す（時計回り 20° 固定 → 90 + 20 = 110°）。
 *
 * @internal export はテスト用
 */
export function adapterOrientationDeg(): number {
  return 90 + G08_ADAPTER_TILT_DEG;
}

/**
 * 方向 + 絶対角度 → GaborPatch の orientationDeg を返す。
 * 「時計回り」は画面上での回転方向（GaborPatch 規約は反時計回り正なので符号反転）。
 *
 * @internal export はテスト用
 */
export function directionToOrientationDeg(
  direction: G08Direction,
  angleDeg: number,
): number {
  return direction === 'cw' ? 90 + angleDeg : 90 - angleDeg;
}

/**
 * 1 試行の adapter / test ガボール spec を生成する。
 *
 * - adapter は傾き 20° 固定（時計回り、画面上）= orientationDeg 110°
 * - test の傾き絶対値 = paramAngleDeg（staircase 値、>=1）
 * - test の方向は rng で 50% ずつ cw / ccw に振る
 * - 位相は adapter / test 独立にランダム
 * - cpd / sigmaDeg は spec §6.1 の中域で固定共通
 *
 * @param paramAngleDeg 現在の staircase 絶対角度（°、典型 1〜10）
 * @param rng 0〜1 の擬似乱数生成器（テスト容易性、デフォルト Math.random）
 */
export function buildG08Trial(
  paramAngleDeg: number,
  rng: () => number = Math.random,
): G08TrialSpec {
  // テスト方向のランダム化（rng[0..1] < 0.5 → 時計回り）
  const correctDirection: G08Direction = rng() < 0.5 ? 'cw' : 'ccw';

  const angle = clampAngle(paramAngleDeg);

  const adapter: G08GaborSpec = {
    cpd: G08_GABOR_BASE_PARAMS.cpd,
    contrast: G08_ADAPTER_CONTRAST,
    sigmaDeg: G08_GABOR_BASE_PARAMS.sigmaDeg,
    orientationDeg: adapterOrientationDeg(),
    phaseRad: rng() * 2 * Math.PI,
  };
  const test: G08GaborSpec = {
    cpd: G08_GABOR_BASE_PARAMS.cpd,
    contrast: G08_TEST_CONTRAST,
    sigmaDeg: G08_GABOR_BASE_PARAMS.sigmaDeg,
    orientationDeg: directionToOrientationDeg(correctDirection, angle),
    phaseRad: rng() * 2 * Math.PI,
  };

  // v1.1.1（Sprint 20-C）：下部 2 パッチを ±絶対角度で対称配置。
  // 正解方向（cw or ccw）と同じ向きのパッチが「correctSide」。
  // どちらが左に来るかは rng で 50% ずつ振る（screens.md §5.4）。
  const correctSide: 'left' | 'right' = rng() < 0.5 ? 'left' : 'right';
  const oppositeDirection: G08Direction =
    correctDirection === 'cw' ? 'ccw' : 'cw';

  // 「正解側の test」は spec.test と同一の傾き（正解方向 + angle）
  // 「不正解側の test」は同じ絶対角度で逆方向
  const correctTestPatch: G08GaborSpec = {
    cpd: G08_GABOR_BASE_PARAMS.cpd,
    contrast: G08_TEST_CONTRAST,
    sigmaDeg: G08_GABOR_BASE_PARAMS.sigmaDeg,
    orientationDeg: directionToOrientationDeg(correctDirection, angle),
    phaseRad: rng() * 2 * Math.PI,
  };
  const oppositeTestPatch: G08GaborSpec = {
    cpd: G08_GABOR_BASE_PARAMS.cpd,
    contrast: G08_TEST_CONTRAST,
    sigmaDeg: G08_GABOR_BASE_PARAMS.sigmaDeg,
    orientationDeg: directionToOrientationDeg(oppositeDirection, angle),
    phaseRad: rng() * 2 * Math.PI,
  };
  const testLeft = correctSide === 'left' ? correctTestPatch : oppositeTestPatch;
  const testRight =
    correctSide === 'right' ? correctTestPatch : oppositeTestPatch;

  return {
    adapter,
    test,
    correctDirection,
    paramAngleDeg: angle,
    testLeft,
    testRight,
    correctSide,
  };
}

/**
 * 採点：選択がテストパッチの傾き方向と一致なら正解。
 * userAnswer === null（未回答）→ 不正解扱い、unattempted=true。
 */
export function gradeG08(
  trial: G08TrialSpec,
  userAnswer: G08Direction | null,
): G08GradingResult {
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
 * v1.1.1（Sprint 20-C）：下部 2 パッチ直接選択用の採点。
 * userAnswerSide が null なら未回答（不正解扱い）。
 * userAnswerSide === trial.correctSide なら正解。
 *
 * 結果には `correctDirection` / `userAnswer`（cw/ccw）も埋めて返す（旧
 * G08ResultScreen / 結果開示の SR 文言互換のため）。
 */
export function gradeG08BySide(
  trial: G08TrialSpec,
  userAnswerSide: 'left' | 'right' | null,
): G08GradingResult {
  const correctSide = trial.correctSide;
  const correctDirection = trial.correctDirection;
  const oppositeDirection: G08Direction =
    correctDirection === 'cw' ? 'ccw' : 'cw';

  if (userAnswerSide === null) {
    return {
      correctDirection,
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
      correctSide,
      userAnswerSide: null,
    };
  }
  const isCorrect = userAnswerSide === correctSide;
  // ユーザーがどの「方向」を選んだか：正解側を選んだなら correctDirection、
  // 反対側を選んだなら逆方向。
  const userAnswerDirection: G08Direction = isCorrect
    ? correctDirection
    : oppositeDirection;
  return {
    correctDirection,
    userAnswer: userAnswerDirection,
    isCorrect,
    unattempted: false,
    correctSide,
    userAnswerSide,
  };
}

/** 「下のパッチは時計回り」/「下のパッチは反時計回り」（screens.md S15-02 / S15-03） */
export function directionToJaLabel(direction: G08Direction): string {
  return direction === 'cw' ? '下のパッチは時計回り' : '下のパッチは反時計回り';
}

/** 「下のパッチは時計回り」短縮版（結果ユーザー回答ラベルなどで） */
export function directionToShortJaLabel(direction: G08Direction): string {
  return direction === 'cw' ? '時計回り' : '反時計回り';
}

/** ユーザー回答（null 含む）→ 表示文字列。null は呼び出し側で「未回答」処理 */
export function userAnswerDirectionToLabel(
  direction: G08Direction | null,
): string | null {
  if (direction === null) return null;
  return directionToJaLabel(direction);
}

/**
 * レスポンシブなパッチサイズとギャップ（screens.md §4 / components.md §15 GE-08）。
 *
 * | viewport 幅 | パッチ一辺 | 上下ギャップ |
 * |---|---|---|
 * | <=360px | 120 | 24 |
 * | <=375px | 140 | 32 |
 * | <=767px | 140 | 32 |
 * | 768〜1279px | 160 | 40 |
 * | >=1280px | 180 | 48 |
 *
 * 高さが極端に小さい場合（パッチ 2 段 + ギャップ + 余白が 60% 超）は 1 段落とす。
 */
export function computeG08StimulusLayout(
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
    layout = { patchSizePx: 120, gapPx: 24 };
  } else if (widthPx <= 375) {
    layout = { patchSizePx: 140, gapPx: 32 };
  } else if (widthPx < 768) {
    layout = { patchSizePx: 140, gapPx: 32 };
  } else if (widthPx < 1280) {
    layout = { patchSizePx: 160, gapPx: 40 };
  } else {
    layout = { patchSizePx: 180, gapPx: 48 };
  }

  // 高さ safety：パッチ 2 段 + ギャップ + 余白 200px が画面に収まらないなら 1 段落とす
  if (heightPx !== undefined) {
    const needed = layout.patchSizePx * 2 + layout.gapPx + 200;
    if (heightPx < needed) {
      if (layout.patchSizePx === 180) {
        layout = { patchSizePx: 160, gapPx: 40 };
      } else if (layout.patchSizePx === 160) {
        layout = { patchSizePx: 140, gapPx: 32 };
      } else if (layout.patchSizePx === 140) {
        layout = { patchSizePx: 120, gapPx: 24 };
      }
    }
  }

  return layout;
}

/** 角度の浮動小数点誤差を整数 1° 単位（小数 6 桁）に丸める */
function clampAngle(v: number): number {
  // 物理的には正の値、staircase 範囲は 1〜10。下限 0.0001 でクランプ。
  const clamped = Math.max(0.0001, v);
  return Math.round(clamped * 1_000_000) / 1_000_000;
}

/** 引数の型を満たすために再エクスポート（呼び出し元からの利便性） */
export type { ViewingDistanceCm };
