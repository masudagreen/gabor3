/**
 * G-07 ガボールエッジ検出の純関数ロジック（spec-v11.md §7.7、screens.md S14-05）。
 *
 * v1.1 仕様（spec-v11.md §7.7）：
 *   - 4×4 = 16 個のガボールパッチを 60 秒間表示
 *   - うち 3 個が同じ向き・同一線上に並ぶ「線」を構成、それ以外はランダム向き
 *   - 「線」になり得る配置：行 4 + 列 4 + 対角 2 = 計 10 直線
 *     各直線 4 パッチのうち 3 個を選ぶ組合せ = 10 × C(4,3)=4 = 40 パターン
 *   - グリッド内の各パッチをタップで複数選択可（最大 16 個、3 個正解）
 *   - 採点：正解 3 個をすべて選択 = 正解、1 個でも誤りや欠落で不正解
 *   - staircase: 「線」を構成するパッチ間の向きズレ許容角（°、易 ±10° → 難 ±2°）、
 *     初期 ±5°、step 1°（gameRegistry G-07 entry：min=2, max=10, initial=5, step=1）
 *   - 1 試行 60 秒、確定ボタンなし、自由回答変更可、自動採点（OPT-12）
 *
 * 「向きズレ許容角」は、「線」を構成する 3 パッチが同向きと言えるための許容ジッタ範囲。
 * 値が小さいほど「線」のメンバー間の向きが揃って見える必要がある = 検出が易しい …
 * とは限らない。ここでは spec の通り「易 ±10° → 難 ±2°」と解釈する：
 *   - 易 ±10°：3 パッチの向きが大きく振れていても「線」と認める = ノイズ向きとの混同が
 *     起きにくい
 *   - 難 ±2°：3 パッチの向きがほぼ完全に揃っていないと検出しづらい = ジッタ許容が
 *     狭くなり、線として見えづらい
 * ただし、実装上は：
 *   - **3 つの「線」パッチ**：基準向き ± toleranceDeg の範囲でジッタを乗せる
 *   - **残り 13 個のノイズパッチ**：ランダム向きを 0°〜180° から（線の基準向きから
 *     最低 toleranceDeg + 安全マージン離れた範囲で）生成する
 *
 * 純関数のみ。AsyncStorage / RN は触らない（テスト容易性）。
 */

import { ViewingDistanceCm } from '../calibration';

/** 4×4 グリッドのセル位置 */
export type G07CellPos = {
  /** 行（0〜3、上から） */
  row: number;
  /** 列（0〜3、左から） */
  col: number;
};

/** セル ID（'r0c0', 'r0c1', ..., 'r3c3'） */
export type G07CellId = string;

/** 1 ガボールの spec（GE-07 描画用） */
export type G07GaborSpec = {
  cpd: number;
  contrast: number;
  sigmaDeg: number;
  orientationDeg: number;
  phaseRad: number;
};

/** 1 セル分のスペック（spec + 位置 + 「線」メンバーかどうか） */
export type G07PatchSpec = {
  id: G07CellId;
  row: number;
  col: number;
  /** ガボール描画 spec */
  gabor: G07GaborSpec;
  /** この paッチが「線」を構成する 3 個のうちの 1 つかどうか */
  isLineMember: boolean;
};

/** 1 試行の 16 パッチと正解 ID 集合 */
export type G07TrialSpec = {
  /** 16 パッチの spec（行優先順、cells[r * 4 + c]） */
  patches: ReadonlyArray<G07PatchSpec>;
  /** 「線」を構成する 3 個の cell ID（採点正解） */
  correctIds: ReadonlyArray<G07CellId>;
  /** 線の幾何種別（行/列/対角）と index（行 0〜3、列 0〜3、対角 0=主対角 / 1=反対角） */
  lineKind: 'row' | 'col' | 'diag';
  lineIndex: number;
  /** 「線」を構成する基準向き（°、0〜180） */
  baseOrientationDeg: number;
  /** 今回の staircase 向きズレ許容角（°、=パラメータ値） */
  paramValueDeg: number;
};

/** G-07 採点結果 */
export type G07GradingResult = {
  /** 正解 ID 集合 */
  correctIds: ReadonlyArray<G07CellId>;
  /** ユーザーが選択した ID 集合（順序問わず） */
  userSelectedIds: ReadonlyArray<G07CellId>;
  /** 正しく選んだ ID（=correctIds ∩ userSelectedIds） */
  truePositiveIds: ReadonlyArray<G07CellId>;
  /** 誤って選んだ ID（=userSelectedIds - correctIds） */
  falsePositiveIds: ReadonlyArray<G07CellId>;
  /** 選び忘れた ID（=correctIds - userSelectedIds） */
  falseNegativeIds: ReadonlyArray<G07CellId>;
  /** 採点結果：3 個全部正解で true、1 個でも誤りや欠落で false */
  isCorrect: boolean;
  /** 未回答（1 個も選んでいない） */
  unattempted: boolean;
};

/**
 * 共通ガボール描画パラメータ。
 *
 * spec-v11.md §6.1 / §7.7：cpd と sigma は固定（向きのみ可変）。
 * cpd は中域 4 cpd（spec §6.1 の 1.5〜9 範囲内）、コントラスト 0.4（視認性十分）、
 * sigma 0.5°（パッチが小さいため少し小さめ：4×4 が 320px 内に収まる場合 1 セル
 * 約 60〜80px、視野角 1°相当に対し 0.5° のガウス窓は十分視認可能）。
 */
export const G07_GABOR_PARAMS = {
  cpd: 4,
  contrast: 0.4,
  sigmaDeg: 0.5,
} satisfies {
  cpd: number;
  contrast: number;
  sigmaDeg: number;
};

/** 1 試行 60 秒（spec-v11.md §7.7 / OPT-12 統一） */
export const GAME7_V11 = {
  /** OPT-11 強制 60 秒視聴、早期終了不可 */
  totalDurationMs: 60_000,
  /** 採点直後の正解開示ハイライト時間（screens.md S14-06） */
  correctRevealMs: 1500,
} as const;

/** 4×4 グリッドの行数 / 列数（固定） */
export const G07_GRID_ROWS = 4 as const;
export const G07_GRID_COLS = 4 as const;
/** 「線」を構成するパッチ数（固定 3） */
export const G07_LINE_LENGTH = 3 as const;

/** セル ID 文字列を生成する（'r0c0' ... 'r3c3'） */
export function makeG07CellId(row: number, col: number): G07CellId {
  return `r${row}c${col}`;
}

/**
 * 4×4 グリッドの「線になり得る」全 10 直線を返す。
 *
 * - 行 4 本：[(0,0),(0,1),(0,2),(0,3)] ... [(3,0),...,(3,3)]
 * - 列 4 本：[(0,0),(1,0),(2,0),(3,0)] ... [(0,3),...,(3,3)]
 * - 対角 2 本：[(0,0),(1,1),(2,2),(3,3)] と [(0,3),(1,2),(2,1),(3,0)]
 *
 * 各直線は 4 パッチを持つ。呼び出し側で C(4,3)=4 通りから 3 個を選ぶ。
 */
export function enumerateG07Lines(): ReadonlyArray<{
  kind: 'row' | 'col' | 'diag';
  index: number;
  cells: ReadonlyArray<G07CellPos>;
}> {
  const lines: Array<{
    kind: 'row' | 'col' | 'diag';
    index: number;
    cells: ReadonlyArray<G07CellPos>;
  }> = [];
  // 行 4 本
  for (let r = 0; r < G07_GRID_ROWS; r += 1) {
    lines.push({
      kind: 'row',
      index: r,
      cells: Array.from({ length: G07_GRID_COLS }, (_, c) => ({ row: r, col: c })),
    });
  }
  // 列 4 本
  for (let c = 0; c < G07_GRID_COLS; c += 1) {
    lines.push({
      kind: 'col',
      index: c,
      cells: Array.from({ length: G07_GRID_ROWS }, (_, r) => ({ row: r, col: c })),
    });
  }
  // 対角 2 本
  lines.push({
    kind: 'diag',
    index: 0,
    cells: [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 2 },
      { row: 3, col: 3 },
    ],
  });
  lines.push({
    kind: 'diag',
    index: 1,
    cells: [
      { row: 0, col: 3 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
      { row: 3, col: 0 },
    ],
  });
  return lines;
}

/**
 * 4 セルから 3 セルを選ぶ全 4 通りの組合せ（C(4,3)=4）を列挙する。
 */
export function chooseThreeFromFour<T>(cells: ReadonlyArray<T>): ReadonlyArray<ReadonlyArray<T>> {
  if (cells.length !== 4) {
    // 想定外。安全のため空配列を返す（テスト容易性）
    return [];
  }
  return [
    [cells[0], cells[1], cells[2]],
    [cells[0], cells[1], cells[3]],
    [cells[0], cells[2], cells[3]],
    [cells[1], cells[2], cells[3]],
  ];
}

/**
 * 1 試行の 16 パッチを生成する。
 *
 * 1. 10 直線から 1 本ランダムに選ぶ
 * 2. その 4 セルから 3 セルをランダムに選ぶ → 「線」メンバー
 * 3. 基準向き baseOrientationDeg をランダム生成（0〜180°）
 * 4. 「線」3 パッチには baseOrientationDeg ± paramValueDeg/2 の範囲でジッタを乗せる
 *    （= 各パッチの向きが許容角内に収まる）
 * 5. 残り 13 パッチ（ノイズ）には baseOrientationDeg から **少なくとも
 *    paramValueDeg + safetyMargin** 離れたランダム向きを割り当てる
 *
 * @param paramValueDeg 現在の staircase 向きズレ許容角（°、典型 2〜10）
 * @param rng 0〜1 の擬似乱数生成器（テスト容易性、デフォルト Math.random）
 */
export function buildG07Trial(
  paramValueDeg: number,
  rng: () => number = Math.random,
): G07TrialSpec {
  const lines = enumerateG07Lines();
  // 1. 10 直線から 1 本選ぶ
  const lineIdx = Math.floor(rng() * lines.length) % lines.length;
  const line = lines[lineIdx];
  // 2. その 4 セルから 3 セルを選ぶ（4 通りのうち 1 つ）
  const triples = chooseThreeFromFour(line.cells);
  const tripleIdx = Math.floor(rng() * triples.length) % triples.length;
  const lineMembers = triples[tripleIdx];
  const correctIds = lineMembers.map((p) => makeG07CellId(p.row, p.col));
  const correctIdSet = new Set(correctIds);
  // 3. 基準向き
  const baseOrientationDeg = rng() * 180;
  // 4. ジッタ振幅（±tolerance/2）
  const halfTolerance = Math.max(0, paramValueDeg) / 2;
  // ノイズ向きの安全マージン：基準向きから少なくとも tolerance を超える距離を確保
  const noiseMinDistance = Math.max(paramValueDeg, 1);

  const patches: G07PatchSpec[] = [];
  for (let r = 0; r < G07_GRID_ROWS; r += 1) {
    for (let c = 0; c < G07_GRID_COLS; c += 1) {
      const id = makeG07CellId(r, c);
      const isLineMember = correctIdSet.has(id);
      let orientationDeg: number;
      if (isLineMember) {
        // 基準向き ± halfTolerance 範囲でジッタ
        orientationDeg = wrapTo180(
          baseOrientationDeg + (rng() * 2 - 1) * halfTolerance,
        );
      } else {
        // ノイズ：基準向きから noiseMinDistance 以上離れたランダム向き
        orientationDeg = pickNoiseOrientation(
          baseOrientationDeg,
          noiseMinDistance,
          rng,
        );
      }
      patches.push({
        id,
        row: r,
        col: c,
        gabor: {
          cpd: G07_GABOR_PARAMS.cpd,
          contrast: G07_GABOR_PARAMS.contrast,
          sigmaDeg: G07_GABOR_PARAMS.sigmaDeg,
          orientationDeg,
          phaseRad: rng() * 2 * Math.PI,
        },
        isLineMember,
      });
    }
  }

  return {
    patches,
    correctIds,
    lineKind: line.kind,
    lineIndex: line.index,
    baseOrientationDeg: wrapTo180(baseOrientationDeg),
    paramValueDeg: Math.max(0, paramValueDeg),
  };
}

/**
 * 採点：3 個の正解をすべて選択 = 正解、1 個でも誤りや欠落で不正解。
 * userSelectedIds が空（未回答）の場合は不正解扱い、unattempted=true。
 */
export function gradeG07(
  trial: G07TrialSpec,
  userSelectedIds: ReadonlyArray<G07CellId>,
): G07GradingResult {
  const correctSet = new Set(trial.correctIds);
  const userSet = new Set(userSelectedIds);
  const truePositiveIds: G07CellId[] = [];
  const falsePositiveIds: G07CellId[] = [];
  const falseNegativeIds: G07CellId[] = [];
  for (const id of userSet) {
    if (correctSet.has(id)) {
      truePositiveIds.push(id);
    } else {
      falsePositiveIds.push(id);
    }
  }
  for (const id of correctSet) {
    if (!userSet.has(id)) {
      falseNegativeIds.push(id);
    }
  }
  const unattempted = userSet.size === 0;
  const isCorrect =
    !unattempted &&
    truePositiveIds.length === trial.correctIds.length &&
    falsePositiveIds.length === 0 &&
    falseNegativeIds.length === 0;
  return {
    correctIds: trial.correctIds,
    userSelectedIds: Array.from(userSet),
    truePositiveIds,
    falsePositiveIds,
    falseNegativeIds,
    isCorrect,
    unattempted,
  };
}

/** 「2/3 個正解 (1 過剰)」のような補助テキスト */
export function buildG07ResultDetailText(
  grading: G07GradingResult | null,
): string {
  if (!grading) return '';
  if (grading.unattempted) return '未回答';
  const tp = grading.truePositiveIds.length;
  const total = grading.correctIds.length;
  const fp = grading.falsePositiveIds.length;
  if (tp === total && fp === 0) {
    return `${tp}/${total} 個正解`;
  }
  if (fp > 0) {
    return `${tp}/${total} 個正解（${fp} 過剰）`;
  }
  // 過不足：fp=0 だが tp<total（欠落のみ）
  const missing = total - tp;
  return `${tp}/${total} 個正解（${missing} 不足）`;
}

/**
 * レスポンシブな全体辺長とセルサイズ・ギャップ（screens.md S14 §4）。
 *
 * | viewport 幅 | 全体辺 | セル | ギャップ |
 * |---|---|---|---|
 * | <=360px | 288 | 60 | 12（4 セル + 3 ギャップで 60*4 + 12*3 = 276、padding で 288 に） |
 * | <=375px | 320 | 64 | 12 |
 * | <=767px | 320 | 64 | 12 |
 * | 768〜1279px | 400 | 88 | 16 |
 * | >=1280px | 480 | 104 | 16 |
 */
export function computeG07GridLayout(
  viewportWidthOrSize: number | { widthPx: number; heightPx?: number },
): {
  /** グリッド全体辺長（px） */
  gridSizePx: number;
  /** 1 セル一辺（px） */
  cellSizePx: number;
  /** セル間ギャップ（px） */
  gapPx: number;
} {
  let widthPx: number;
  if (typeof viewportWidthOrSize === 'number') {
    widthPx = viewportWidthOrSize;
  } else {
    widthPx = viewportWidthOrSize.widthPx;
  }

  if (widthPx <= 360) {
    return { gridSizePx: 288, cellSizePx: 60, gapPx: 12 };
  }
  if (widthPx < 768) {
    return { gridSizePx: 320, cellSizePx: 64, gapPx: 12 };
  }
  if (widthPx < 1280) {
    return { gridSizePx: 400, cellSizePx: 88, gapPx: 16 };
  }
  return { gridSizePx: 480, cellSizePx: 104, gapPx: 16 };
}

/** セル ID から行 / 列 / 表示文字列「2 行 3 列」を生成（採点表示用） */
export function describeG07CellPos(id: G07CellId): {
  row: number;
  col: number;
  label: string;
} {
  // 'rNcM' フォーマット。N=row, M=col（0-index）
  const m = /^r(\d+)c(\d+)$/.exec(id);
  if (!m) {
    return { row: -1, col: -1, label: id };
  }
  const row = Number(m[1]);
  const col = Number(m[2]);
  // 「2 行 3 列」（1-index で日本語表示）
  return { row, col, label: `${row + 1} 行 ${col + 1} 列` };
}

/** correctIds → 「2 行 2 列・2 行 4 列・3 行 3 列」の連結文字列 */
export function buildG07CorrectAnswerLabel(
  correctIds: ReadonlyArray<G07CellId>,
): string {
  return correctIds
    .map((id) => describeG07CellPos(id).label)
    .join('・');
}

/**
 * 0〜180° に正規化する（ガボールの向きは 180° 周期）。
 * orientationDeg は数学的には mod 180 で同値。
 */
function wrapTo180(deg: number): number {
  let v = deg;
  while (v < 0) v += 180;
  while (v >= 180) v -= 180;
  return Math.round(v * 1_000_000) / 1_000_000;
}

/**
 * 基準向きから少なくとも minDistanceDeg 離れた向きをランダムに 1 つ選ぶ。
 * 0〜180° の周期空間で「許容ゾーン」=[base-min, base+min]（±min）を避ける。
 */
function pickNoiseOrientation(
  baseDeg: number,
  minDistanceDeg: number,
  rng: () => number,
): number {
  // 0〜180° の周期空間で「許容ゾーン」の長さは min*2（ただし 180 でクランプ）。
  // 許容ゾーン外の長さ = 180 - min*2。その範囲から rng で選び、ベース + (min + r) で配置。
  const safe = Math.min(minDistanceDeg, 89.999); // min が 90 を超えると安全領域がなくなる
  const allowedRange = Math.max(0, 180 - safe * 2);
  if (allowedRange <= 0) {
    // 物理的に「離す」ことが不可能。基準と直交方向（base + 90）を返す
    return wrapTo180(baseDeg + 90);
  }
  const r = rng() * allowedRange; // 0〜allowedRange
  // ベースから safe 度離れた位置を起点にする（時計回りに safe + r 度進む）
  return wrapTo180(baseDeg + safe + r);
}

/** 引数の型を満たすために再エクスポート（呼び出し元からの利便性） */
export type { ViewingDistanceCm };
