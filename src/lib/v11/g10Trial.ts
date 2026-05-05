/**
 * G-10 テクスチャ分離（Texture Segmentation）の純関数ロジック（spec-v11.md §7.10、
 * screens.md S16-02）。
 *
 * Karni & Sagi 1991 のテクスチャ分離パラダイムを v1.1 OPT-12 統一フォーマットに
 * 適用：
 *   - 8×8 = 64 個のガボールパッチを画面いっぱいに敷き詰めて 60 秒同時提示
 *   - 背景はすべて同じ向きのガボール
 *   - うち 3×3 = 9 個の領域だけ向きが異なる（target 領域）
 *   - target 領域は 4 象限（左上 / 右上 / 左下 / 右下）のいずれかにランダム配置
 *   - 「target 領域がどの象限にあるか」を 4 択で答える
 *
 * staircase（gameRegistry G-10 entry）：
 *   - paramRange.min = 5°（難・小さな向き差）
 *   - paramRange.max = 90°（易・直交差）
 *   - paramRange.initial = 30°
 *   - paramRange.step = 5°
 *
 * 4 象限の定義（8×8 grid）：
 *   - 上半分（row 0..3）+ 下半分（row 4..7）、左半分（col 0..3）+ 右半分（col 4..7）
 *   - 各象限は 4×4 のセル領域。3×3 の target 領域がその象限内に収まる必要がある。
 *   - したがって target 領域の左上座標 (r0, c0) は：
 *     - 左上象限：r0 ∈ {0,1}, c0 ∈ {0,1}（4 通り）
 *     - 右上象限：r0 ∈ {0,1}, c0 ∈ {4,5}（4 通り）
 *     - 左下象限：r0 ∈ {4,5}, c0 ∈ {0,1}（4 通り）
 *     - 右下象限：r0 ∈ {4,5}, c0 ∈ {4,5}（4 通り）
 *   - 合計 16 配置 × 4 象限 = ただし 4 通り×4 象限 = 16 通り
 *
 * v1.1 OPT-12 統一：
 *   - 60 秒同時提示（マスク・フェード・点滅なし）
 *   - 確定ボタンなし、自由回答変更可、自動採点
 *   - 4 象限ボタン（grid-4 layout）
 *   - 60 秒経過で未回答 = 不正解、staircase 易方向（向き差大）
 *
 * 純関数のみ。AsyncStorage / RN は触らない。
 */

import { ViewingDistanceCm } from '../calibration';

/** 4 象限 ID（screens.md S16-02 の選択肢に対応） */
export type G10Quadrant = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** 全象限の列挙（テスト・UI 共用） */
export const G10_ALL_QUADRANTS: ReadonlyArray<G10Quadrant> = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

/** 1 ガボールの spec（GE-10 描画用） */
export type G10GaborSpec = {
  cpd: number;
  contrast: number;
  sigmaDeg: number;
  /** GaborPatch 規約：反時計回り正、垂直 = 90° */
  orientationDeg: number;
  phaseRad: number;
};

/** 1 セル分のスペック（位置 + ガボール spec + target 領域メンバーかどうか） */
export type G10CellSpec = {
  /** 0..7 */
  row: number;
  /** 0..7 */
  col: number;
  /** target 領域の 9 セルのうちの 1 つかどうか（背景なら false） */
  isTargetMember: boolean;
  gabor: G10GaborSpec;
};

/** 1 試行の 64 セル + 正解象限 + target 領域左上座標 */
export type G10TrialSpec = {
  /** 64 セル（行優先順、cells[r * 8 + c]） */
  cells: ReadonlyArray<G10CellSpec>;
  /** 正解象限 */
  correctQuadrant: G10Quadrant;
  /** target 領域 3×3 の左上 (row, col) */
  targetTopLeftRow: number;
  targetTopLeftCol: number;
  /** 背景の向き（°、0〜180） */
  backgroundOrientationDeg: number;
  /** target 領域の向き（°、背景 + paramOrientationDiffDeg または -） */
  targetOrientationDeg: number;
  /** 今回の staircase 向き差（°、>=0） */
  paramOrientationDiffDeg: number;
};

/** G-10 採点結果 */
export type G10GradingResult = {
  correctQuadrant: G10Quadrant;
  /** ユーザー回答（null = 未回答） */
  userAnswer: G10Quadrant | null;
  isCorrect: boolean;
  /** 60 秒経過時に未選択だったか */
  unattempted: boolean;
};

/** 8×8 grid のサイズ（固定） */
export const G10_GRID_SIZE = 8 as const;
/** target 領域は 3×3（固定、Karni & Sagi 1991 オリジナル準拠） */
export const G10_TARGET_SIZE = 3 as const;

/**
 * 共通ガボール描画パラメータ。
 *
 * spec-v11.md §6.1 / §7.10：cpd は中域固定、コントラストは視認性十分。
 * 8×8 grid で各セルが 32〜40px と小さいため、sigma も小さめ（0.4°）に絞り、
 * パッチ内に縞が入る視覚密度を確保する。
 */
export const G10_GABOR_PARAMS = {
  cpd: 4,
  contrast: 0.4,
  sigmaDeg: 0.4,
} satisfies {
  cpd: number;
  contrast: number;
  sigmaDeg: number;
};

/** 1 試行 60 秒（OPT-11 / OPT-12 統一） */
export const GAME10_V11 = {
  /** OPT-11 強制 60 秒視聴、早期終了不可 */
  totalDurationMs: 60_000,
  /** 採点直後の正解開示ハイライト時間（screens.md S16-03） */
  correctRevealMs: 1500,
} as const;

/**
 * 象限から取りうる target 領域左上座標（row, col）の候補リストを返す。
 *
 * 8×8 grid を 4×4 の象限に分け、3×3 の target 領域がその象限内に完全に収まる
 * 配置のみを返す。各象限あたり 2×2 = 4 通り（row, col それぞれ 2 通り）。
 *
 * - top-left: row ∈ {0,1}, col ∈ {0,1}
 * - top-right: row ∈ {0,1}, col ∈ {4,5}
 * - bottom-left: row ∈ {4,5}, col ∈ {0,1}
 * - bottom-right: row ∈ {4,5}, col ∈ {4,5}
 */
export function quadrantTopLeftCandidates(
  quadrant: G10Quadrant,
): ReadonlyArray<{ row: number; col: number }> {
  // 4×4 = 象限の幅 / 高さ。3×3 が収まる候補は 4-3+1 = 2 通り（先頭が 0 / 1）。
  const halfStartRow = quadrant === 'top-left' || quadrant === 'top-right' ? 0 : 4;
  const halfStartCol =
    quadrant === 'top-left' || quadrant === 'bottom-left' ? 0 : 4;
  const result: { row: number; col: number }[] = [];
  for (let dr = 0; dr < 2; dr += 1) {
    for (let dc = 0; dc < 2; dc += 1) {
      result.push({
        row: halfStartRow + dr,
        col: halfStartCol + dc,
      });
    }
  }
  return result;
}

/**
 * (row, col) が属する象限を返す。
 *
 * 行 0..3 = 上、行 4..7 = 下。列 0..3 = 左、列 4..7 = 右。
 * row, col が範囲外（<0 / >=8）なら近い象限にクランプ。
 *
 * @internal export はテスト用
 */
export function cellPosToQuadrant(row: number, col: number): G10Quadrant {
  const isTop = row <= 3;
  const isLeft = col <= 3;
  if (isTop && isLeft) return 'top-left';
  if (isTop && !isLeft) return 'top-right';
  if (!isTop && isLeft) return 'bottom-left';
  return 'bottom-right';
}

/**
 * target 領域の 3×3 セルが (r0, c0) を左上として広がるとき、その所属象限を返す。
 *
 * 配置候補は `quadrantTopLeftCandidates` で 3×3 が単一象限に収まるよう制約済みで
 * あるため、左上セルの象限を返せばよい。
 */
export function targetTopLeftToQuadrant(
  topLeftRow: number,
  topLeftCol: number,
): G10Quadrant {
  return cellPosToQuadrant(topLeftRow, topLeftCol);
}

/**
 * (r, c) が target 領域 3×3 の中に含まれるか判定。
 */
export function isInTargetRegion(args: {
  row: number;
  col: number;
  topLeftRow: number;
  topLeftCol: number;
}): boolean {
  const { row, col, topLeftRow, topLeftCol } = args;
  return (
    row >= topLeftRow &&
    row < topLeftRow + G10_TARGET_SIZE &&
    col >= topLeftCol &&
    col < topLeftCol + G10_TARGET_SIZE
  );
}

/**
 * 1 試行の 64 セル（8×8）を生成する。
 *
 * 1. 4 象限から rng でランダムに 1 つ選ぶ → correctQuadrant
 * 2. その象限内 4 候補からランダムに 1 つ選ぶ → target 領域左上 (r0, c0)
 * 3. 背景向き baseDeg をランダム（0〜180）
 * 4. target 向き = base ± paramOrientationDiffDeg（rng で正負）。
 *    値が 180 を跨いだら wrapTo180。
 * 5. 各セルに位相ランダム
 *
 * @param paramOrientationDiffDeg 現在の staircase 向き差（°、典型 5〜90）
 * @param rng 0〜1 の擬似乱数生成器（テスト容易性、デフォルト Math.random）
 */
export function buildG10Trial(
  paramOrientationDiffDeg: number,
  rng: () => number = Math.random,
): G10TrialSpec {
  // 1. 象限選択
  const qIdx = Math.floor(rng() * G10_ALL_QUADRANTS.length) % G10_ALL_QUADRANTS.length;
  const correctQuadrant = G10_ALL_QUADRANTS[qIdx];

  // 2. target 左上座標
  const candidates = quadrantTopLeftCandidates(correctQuadrant);
  const cIdx = Math.floor(rng() * candidates.length) % candidates.length;
  const { row: targetTopLeftRow, col: targetTopLeftCol } = candidates[cIdx];

  // 3. 背景向き
  const backgroundOrientationDeg = wrapTo180(rng() * 180);

  // 4. target 向き = 背景 ± diff
  const diff = Math.max(0, paramOrientationDiffDeg);
  const sign = rng() < 0.5 ? -1 : 1;
  const targetOrientationDeg = wrapTo180(backgroundOrientationDeg + sign * diff);

  // 5. セル生成
  const cells: G10CellSpec[] = [];
  for (let r = 0; r < G10_GRID_SIZE; r += 1) {
    for (let c = 0; c < G10_GRID_SIZE; c += 1) {
      const isTargetMember = isInTargetRegion({
        row: r,
        col: c,
        topLeftRow: targetTopLeftRow,
        topLeftCol: targetTopLeftCol,
      });
      const orientationDeg = isTargetMember
        ? targetOrientationDeg
        : backgroundOrientationDeg;
      cells.push({
        row: r,
        col: c,
        isTargetMember,
        gabor: {
          cpd: G10_GABOR_PARAMS.cpd,
          contrast: G10_GABOR_PARAMS.contrast,
          sigmaDeg: G10_GABOR_PARAMS.sigmaDeg,
          orientationDeg,
          phaseRad: rng() * 2 * Math.PI,
        },
      });
    }
  }

  return {
    cells,
    correctQuadrant,
    targetTopLeftRow,
    targetTopLeftCol,
    backgroundOrientationDeg,
    targetOrientationDeg,
    paramOrientationDiffDeg: diff,
  };
}

/**
 * 採点：選択が target 領域の象限と一致なら正解。
 * userAnswer === null（未回答）→ 不正解扱い、unattempted=true。
 */
export function gradeG10(
  trial: G10TrialSpec,
  userAnswer: G10Quadrant | null,
): G10GradingResult {
  if (userAnswer === null) {
    return {
      correctQuadrant: trial.correctQuadrant,
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
    };
  }
  return {
    correctQuadrant: trial.correctQuadrant,
    userAnswer,
    isCorrect: userAnswer === trial.correctQuadrant,
    unattempted: false,
  };
}

/** 「左上」「右上」「左下」「右下」（screens.md S16-02 / S16-03 ボタンラベル） */
export function quadrantToJaLabel(q: G10Quadrant): string {
  switch (q) {
    case 'top-left':
      return '左上';
    case 'top-right':
      return '右上';
    case 'bottom-left':
      return '左下';
    case 'bottom-right':
      return '右下';
  }
}

/** ユーザー回答（null 含む）→ 表示文字列。null は呼び出し側で「未回答」処理 */
export function userAnswerQuadrantToLabel(q: G10Quadrant | null): string | null {
  if (q === null) return null;
  return quadrantToJaLabel(q);
}

/**
 * レスポンシブな 8×8 grid の全体辺長 / セルサイズ / ギャップ
 * （screens.md §4 / components.md §15 GE-10）。
 *
 * | viewport 幅 | 全体辺 | セル | ギャップ |
 * |---|---|---|---|
 * | <=360px | 288 | 36 | 0 |
 * | <=375px | 320 | 40 | 0 |
 * | <=767px | 320 | 40 | 0 |
 * | 768〜1279px | 400 | 50 | 0 |
 * | >=1280px | 480 | 60 | 0 |
 *
 * 8×8 を密に敷き詰めるためギャップは 0 を採用。各セルは 36px 以上で、
 * GaborPatch sigma 0.4° で縞が見える程度の解像度を確保。
 */
export function computeG10GridLayout(
  viewportWidthOrSize: number | { widthPx: number; heightPx?: number },
): {
  /** グリッド全体辺長（px） */
  gridSizePx: number;
  /** 1 セル一辺（px） */
  cellSizePx: number;
  /** セル間ギャップ（px、ベタ敷きのため 0 が標準） */
  gapPx: number;
} {
  let widthPx: number;
  if (typeof viewportWidthOrSize === 'number') {
    widthPx = viewportWidthOrSize;
  } else {
    widthPx = viewportWidthOrSize.widthPx;
  }

  if (widthPx <= 360) {
    return { gridSizePx: 288, cellSizePx: 36, gapPx: 0 };
  }
  if (widthPx < 768) {
    return { gridSizePx: 320, cellSizePx: 40, gapPx: 0 };
  }
  if (widthPx < 1280) {
    return { gridSizePx: 400, cellSizePx: 50, gapPx: 0 };
  }
  return { gridSizePx: 480, cellSizePx: 60, gapPx: 0 };
}

/**
 * 0〜180° に正規化する（ガボールの向きは 180° 周期）。
 */
export function wrapTo180(deg: number): number {
  let v = deg;
  while (v < 0) v += 180;
  while (v >= 180) v -= 180;
  return Math.round(v * 1_000_000) / 1_000_000;
}

/** 引数の型を満たすために再エクスポート（呼び出し元からの利便性） */
export type { ViewingDistanceCm };
