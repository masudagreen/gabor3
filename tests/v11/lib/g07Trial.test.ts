/**
 * G-07 trial 生成 / 採点 / レイアウトの純関数テスト（spec-v11.md §7.7）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG07CorrectAnswerLabel,
  buildG07Trial,
  buildG07ResultDetailText,
  chooseThreeFromFour,
  computeG07GridLayout,
  describeG07CellPos,
  enumerateG07Lines,
  G07_GABOR_PARAMS,
  G07_GRID_COLS,
  G07_GRID_ROWS,
  G07_LINE_LENGTH,
  GAME7_V11,
  gradeG07,
  makeG07CellId,
} from '../../../src/lib/v11/g07Trial';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';

describe('g07Trial: spec', () => {
  it('GAME7_V11.totalDurationMs は 60_000（OPT-11 / OPT-12）', () => {
    expect(GAME7_V11.totalDurationMs).toBe(60_000);
  });

  it('GAME7_V11.correctRevealMs は 1500ms（screens.md S14-06）', () => {
    expect(GAME7_V11.correctRevealMs).toBe(1500);
  });

  it('G07_GABOR_PARAMS は cpd=4, contrast=0.4, sigmaDeg=0.5（spec §6.1 範囲内）', () => {
    expect(G07_GABOR_PARAMS.cpd).toBe(4);
    expect(G07_GABOR_PARAMS.contrast).toBeCloseTo(0.4, 5);
    expect(G07_GABOR_PARAMS.sigmaDeg).toBeCloseTo(0.5, 5);
  });

  it('G07_GRID_ROWS / COLS は 4 / 4', () => {
    expect(G07_GRID_ROWS).toBe(4);
    expect(G07_GRID_COLS).toBe(4);
  });

  it('G07_LINE_LENGTH は 3', () => {
    expect(G07_LINE_LENGTH).toBe(3);
  });

  it('gameRegistry G-07 の paramRange は { min:2, max:10, initial:5, step:1 }', () => {
    const def = GAME_REGISTRY.find((g) => g.gameId === 'G-07');
    expect(def).toBeDefined();
    expect(def?.paramRange.min).toBe(2);
    expect(def?.paramRange.max).toBe(10);
    expect(def?.paramRange.initial).toBe(5);
    expect(def?.paramRange.step).toBe(1);
  });
});

describe('makeG07CellId', () => {
  it('行 / 列から ID を生成する', () => {
    expect(makeG07CellId(0, 0)).toBe('r0c0');
    expect(makeG07CellId(2, 3)).toBe('r2c3');
    expect(makeG07CellId(3, 3)).toBe('r3c3');
  });
});

describe('enumerateG07Lines: 10 直線列挙', () => {
  it('合計 10 直線返す（行 4 + 列 4 + 対角 2）', () => {
    const lines = enumerateG07Lines();
    expect(lines.length).toBe(10);
  });

  it('行 4 本と列 4 本と対角 2 本の内訳', () => {
    const lines = enumerateG07Lines();
    const rows = lines.filter((l) => l.kind === 'row');
    const cols = lines.filter((l) => l.kind === 'col');
    const diags = lines.filter((l) => l.kind === 'diag');
    expect(rows.length).toBe(4);
    expect(cols.length).toBe(4);
    expect(diags.length).toBe(2);
  });

  it('各直線が 4 セルを持つ', () => {
    const lines = enumerateG07Lines();
    for (const line of lines) {
      expect(line.cells.length).toBe(4);
    }
  });

  it('行 0 は (0,0)〜(0,3)', () => {
    const lines = enumerateG07Lines();
    const row0 = lines.find((l) => l.kind === 'row' && l.index === 0);
    expect(row0?.cells).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ]);
  });

  it('列 2 は (0,2)〜(3,2)', () => {
    const lines = enumerateG07Lines();
    const col2 = lines.find((l) => l.kind === 'col' && l.index === 2);
    expect(col2?.cells).toEqual([
      { row: 0, col: 2 },
      { row: 1, col: 2 },
      { row: 2, col: 2 },
      { row: 3, col: 2 },
    ]);
  });

  it('対角 0（主対角）は (0,0),(1,1),(2,2),(3,3)', () => {
    const lines = enumerateG07Lines();
    const diag0 = lines.find((l) => l.kind === 'diag' && l.index === 0);
    expect(diag0?.cells).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 2 },
      { row: 3, col: 3 },
    ]);
  });

  it('対角 1（反対角）は (0,3),(1,2),(2,1),(3,0)', () => {
    const lines = enumerateG07Lines();
    const diag1 = lines.find((l) => l.kind === 'diag' && l.index === 1);
    expect(diag1?.cells).toEqual([
      { row: 0, col: 3 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
      { row: 3, col: 0 },
    ]);
  });
});

describe('chooseThreeFromFour: C(4,3)=4 通り', () => {
  it('4 セルから 3 セルの組合せ 4 通りを返す', () => {
    const cells = ['a', 'b', 'c', 'd'];
    const triples = chooseThreeFromFour(cells);
    expect(triples.length).toBe(4);
    expect(triples).toEqual([
      ['a', 'b', 'c'],
      ['a', 'b', 'd'],
      ['a', 'c', 'd'],
      ['b', 'c', 'd'],
    ]);
  });

  it('長さ 4 以外は空配列', () => {
    expect(chooseThreeFromFour([1, 2, 3])).toEqual([]);
    expect(chooseThreeFromFour([1, 2, 3, 4, 5])).toEqual([]);
  });
});

describe('buildG07Trial: 試行生成', () => {
  it('16 パッチを生成する', () => {
    const trial = buildG07Trial(5, () => 0.3);
    expect(trial.patches.length).toBe(16);
  });

  it('各パッチに行 / 列 / id / gabor が含まれる', () => {
    const trial = buildG07Trial(5, () => 0.3);
    for (const p of trial.patches) {
      expect(p.row).toBeGreaterThanOrEqual(0);
      expect(p.row).toBeLessThan(4);
      expect(p.col).toBeGreaterThanOrEqual(0);
      expect(p.col).toBeLessThan(4);
      expect(p.id).toBe(`r${p.row}c${p.col}`);
      expect(p.gabor).toBeDefined();
      expect(typeof p.isLineMember).toBe('boolean');
    }
  });

  it('「線」を構成する 3 パッチ（isLineMember=true）が必ず 3 個ある', () => {
    const trial = buildG07Trial(5, () => 0.3);
    const lineMembers = trial.patches.filter((p) => p.isLineMember);
    expect(lineMembers.length).toBe(3);
  });

  it('correctIds の長さは 3', () => {
    const trial = buildG07Trial(5, () => 0.3);
    expect(trial.correctIds.length).toBe(3);
  });

  it('correctIds は isLineMember=true のパッチ ID と一致', () => {
    const trial = buildG07Trial(5, () => 0.3);
    const lineIds = trial.patches
      .filter((p) => p.isLineMember)
      .map((p) => p.id)
      .sort();
    const correctIdsSorted = [...trial.correctIds].sort();
    expect(correctIdsSorted).toEqual(lineIds);
  });

  it('正解 3 セルが「線」上に並ぶ（10 直線のいずれかの 4 セルから 3 セル選択）', () => {
    const trial = buildG07Trial(5, () => 0.3);
    const lines = enumerateG07Lines();
    // どこかの直線の 4 セルから correctIds の 3 セルが取れているはず
    const found = lines.some((line) => {
      const lineIds = line.cells.map((p) => makeG07CellId(p.row, p.col));
      return trial.correctIds.every((id) => lineIds.includes(id));
    });
    expect(found).toBe(true);
  });

  it('lineKind は row / col / diag のいずれか', () => {
    const trial = buildG07Trial(5, () => 0.3);
    expect(['row', 'col', 'diag']).toContain(trial.lineKind);
  });

  it('「線」3 パッチの向きは基準向き ± paramValueDeg/2 範囲内', () => {
    const tolerance = 6;
    const trial = buildG07Trial(tolerance, () => 0.3);
    for (const p of trial.patches.filter((q) => q.isLineMember)) {
      const diff = circularOrientationDistance(
        p.gabor.orientationDeg,
        trial.baseOrientationDeg,
      );
      expect(diff).toBeLessThanOrEqual(tolerance / 2 + 0.001);
    }
  });

  it('ノイズ 13 パッチの向きは基準向きから少なくとも paramValueDeg 離れる', () => {
    const tolerance = 6;
    const trial = buildG07Trial(tolerance, () => 0.3);
    for (const p of trial.patches.filter((q) => !q.isLineMember)) {
      const diff = circularOrientationDistance(
        p.gabor.orientationDeg,
        trial.baseOrientationDeg,
      );
      expect(diff).toBeGreaterThanOrEqual(tolerance - 0.001);
    }
  });

  it('paramValueDeg=2（最難）でも 16 パッチ生成、3 個ライン', () => {
    const trial = buildG07Trial(2, () => 0.5);
    expect(trial.patches.length).toBe(16);
    expect(trial.correctIds.length).toBe(3);
    expect(trial.paramValueDeg).toBe(2);
  });

  it('paramValueDeg=10（最易）でも 16 パッチ生成、3 個ライン', () => {
    const trial = buildG07Trial(10, () => 0.5);
    expect(trial.patches.length).toBe(16);
    expect(trial.correctIds.length).toBe(3);
    expect(trial.paramValueDeg).toBe(10);
  });

  it('paramValueDeg < 0（壊れた値）でも 0 にクランプされて落ちない', () => {
    const trial = buildG07Trial(-5, () => 0.3);
    expect(trial.patches.length).toBe(16);
    expect(trial.paramValueDeg).toBe(0);
  });

  it('全パッチ共通の cpd / contrast / sigmaDeg は G07_GABOR_PARAMS 由来', () => {
    const trial = buildG07Trial(5, () => 0.3);
    for (const p of trial.patches) {
      expect(p.gabor.cpd).toBe(4);
      expect(p.gabor.contrast).toBeCloseTo(0.4, 5);
      expect(p.gabor.sigmaDeg).toBeCloseTo(0.5, 5);
    }
  });

  it('phaseRad はパッチごとに 0〜2π 範囲', () => {
    const trial = buildG07Trial(5, () => 0.3);
    for (const p of trial.patches) {
      expect(p.gabor.phaseRad).toBeGreaterThanOrEqual(0);
      expect(p.gabor.phaseRad).toBeLessThanOrEqual(2 * Math.PI);
    }
  });

  it('rng が 16 回以上呼ばれる（向き + 位相）', () => {
    let calls = 0;
    const rng = () => {
      calls += 1;
      return 0.3;
    };
    buildG07Trial(5, rng);
    // ライン選択 1 + triple 選択 1 + base orientation 1 + 16 パッチ × (orientation 1 + phase 1) = 35 回程度
    expect(calls).toBeGreaterThanOrEqual(16);
  });
});

describe('gradeG07: 採点', () => {
  it('正解 3 個をすべて選択 → isCorrect=true', () => {
    const trial = buildG07Trial(5, () => 0.3);
    const result = gradeG07(trial, trial.correctIds);
    expect(result.isCorrect).toBe(true);
    expect(result.unattempted).toBe(false);
    expect(result.truePositiveIds.length).toBe(3);
    expect(result.falsePositiveIds.length).toBe(0);
    expect(result.falseNegativeIds.length).toBe(0);
  });

  it('正解 3 個 + 余計な 1 個（過剰選択）→ isCorrect=false', () => {
    const trial = buildG07Trial(5, () => 0.3);
    const noiseId = trial.patches.find((p) => !p.isLineMember)?.id ?? 'r0c0';
    const result = gradeG07(trial, [...trial.correctIds, noiseId]);
    expect(result.isCorrect).toBe(false);
    expect(result.truePositiveIds.length).toBe(3);
    expect(result.falsePositiveIds.length).toBe(1);
  });

  it('正解 2 個（1 個欠落）→ isCorrect=false', () => {
    const trial = buildG07Trial(5, () => 0.3);
    const partial = trial.correctIds.slice(0, 2);
    const result = gradeG07(trial, partial);
    expect(result.isCorrect).toBe(false);
    expect(result.truePositiveIds.length).toBe(2);
    expect(result.falseNegativeIds.length).toBe(1);
  });

  it('正解 1 個 + 誤答 1 個 → isCorrect=false（過剰 + 不足）', () => {
    const trial = buildG07Trial(5, () => 0.3);
    const noiseId = trial.patches.find((p) => !p.isLineMember)?.id ?? 'r0c0';
    const result = gradeG07(trial, [trial.correctIds[0], noiseId]);
    expect(result.isCorrect).toBe(false);
    expect(result.truePositiveIds.length).toBe(1);
    expect(result.falsePositiveIds.length).toBe(1);
    expect(result.falseNegativeIds.length).toBe(2);
  });

  it('未回答（空配列）→ isCorrect=false, unattempted=true', () => {
    const trial = buildG07Trial(5, () => 0.3);
    const result = gradeG07(trial, []);
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(true);
    expect(result.userSelectedIds.length).toBe(0);
  });

  it('1 個でも選んでいれば unattempted=false', () => {
    const trial = buildG07Trial(5, () => 0.3);
    const result = gradeG07(trial, [trial.correctIds[0]]);
    expect(result.unattempted).toBe(false);
  });

  it('重複選択は集合化される（同じ ID 2 回 → 1 回扱い）', () => {
    const trial = buildG07Trial(5, () => 0.3);
    const id = trial.correctIds[0];
    const result = gradeG07(trial, [id, id, id]);
    expect(result.userSelectedIds.length).toBe(1);
    expect(result.truePositiveIds.length).toBe(1);
  });
});

describe('buildG07ResultDetailText: 補助テキスト', () => {
  function makeGrading(overrides: {
    correctIds?: ReadonlyArray<string>;
    truePositiveIds?: ReadonlyArray<string>;
    falsePositiveIds?: ReadonlyArray<string>;
    falseNegativeIds?: ReadonlyArray<string>;
    isCorrect?: boolean;
    unattempted?: boolean;
    userSelectedIds?: ReadonlyArray<string>;
  }) {
    return {
      correctIds: overrides.correctIds ?? ['r0c0', 'r0c1', 'r0c2'],
      truePositiveIds: overrides.truePositiveIds ?? [],
      falsePositiveIds: overrides.falsePositiveIds ?? [],
      falseNegativeIds: overrides.falseNegativeIds ?? [],
      userSelectedIds: overrides.userSelectedIds ?? [],
      isCorrect: overrides.isCorrect ?? false,
      unattempted: overrides.unattempted ?? false,
    };
  }

  it('null → 空文字', () => {
    expect(buildG07ResultDetailText(null)).toBe('');
  });

  it('未回答 → 「未回答」', () => {
    expect(
      buildG07ResultDetailText(
        makeGrading({ unattempted: true }),
      ),
    ).toBe('未回答');
  });

  it('全 3 個正解 → 「3/3 個正解」', () => {
    expect(
      buildG07ResultDetailText(
        makeGrading({
          truePositiveIds: ['r0c0', 'r0c1', 'r0c2'],
          isCorrect: true,
          userSelectedIds: ['r0c0', 'r0c1', 'r0c2'],
        }),
      ),
    ).toBe('3/3 個正解');
  });

  it('2/3 + 1 過剰 → 「2/3 個正解（1 過剰）」', () => {
    expect(
      buildG07ResultDetailText(
        makeGrading({
          truePositiveIds: ['r0c0', 'r0c1'],
          falsePositiveIds: ['r2c2'],
          falseNegativeIds: ['r0c2'],
          userSelectedIds: ['r0c0', 'r0c1', 'r2c2'],
        }),
      ),
    ).toBe('2/3 個正解（1 過剰）');
  });

  it('2/3 + 0 過剰（純粋に 1 不足）→ 「2/3 個正解（1 不足）」', () => {
    expect(
      buildG07ResultDetailText(
        makeGrading({
          truePositiveIds: ['r0c0', 'r0c1'],
          falsePositiveIds: [],
          falseNegativeIds: ['r0c2'],
          userSelectedIds: ['r0c0', 'r0c1'],
        }),
      ),
    ).toBe('2/3 個正解（1 不足）');
  });
});

describe('describeG07CellPos / buildG07CorrectAnswerLabel', () => {
  it('「2 行 3 列」の表示文字列を返す（1-index 日本語）', () => {
    expect(describeG07CellPos('r1c2').label).toBe('2 行 3 列');
    expect(describeG07CellPos('r0c0').label).toBe('1 行 1 列');
    expect(describeG07CellPos('r3c3').label).toBe('4 行 4 列');
  });

  it('不正な ID は元の文字列を返す（防御的）', () => {
    expect(describeG07CellPos('invalid').label).toBe('invalid');
  });

  it('正解 3 個を「・」で連結して表示', () => {
    expect(buildG07CorrectAnswerLabel(['r0c0', 'r0c1', 'r0c2'])).toBe(
      '1 行 1 列・1 行 2 列・1 行 3 列',
    );
  });
});

describe('computeG07GridLayout: レスポンシブ（screens.md S14 §4）', () => {
  it('width=360 で 288 / 60 / 12', () => {
    expect(computeG07GridLayout(360)).toEqual({
      gridSizePx: 288,
      cellSizePx: 60,
      gapPx: 12,
    });
  });

  it('width=375 で 320 / 64 / 12', () => {
    expect(computeG07GridLayout(375)).toEqual({
      gridSizePx: 320,
      cellSizePx: 64,
      gapPx: 12,
    });
  });

  it('width=768 で 400 / 88 / 16', () => {
    expect(computeG07GridLayout(768)).toEqual({
      gridSizePx: 400,
      cellSizePx: 88,
      gapPx: 16,
    });
  });

  it('width=1280 で 480 / 104 / 16', () => {
    expect(computeG07GridLayout(1280)).toEqual({
      gridSizePx: 480,
      cellSizePx: 104,
      gapPx: 16,
    });
  });

  it('引数オブジェクト形式でも呼べる', () => {
    expect(computeG07GridLayout({ widthPx: 1280 })).toEqual({
      gridSizePx: 480,
      cellSizePx: 104,
      gapPx: 16,
    });
  });

  it('セル × 4 + ギャップ × 3 の合計が gridSize 以下', () => {
    const layouts = [
      computeG07GridLayout(360),
      computeG07GridLayout(375),
      computeG07GridLayout(768),
      computeG07GridLayout(1280),
    ];
    for (const l of layouts) {
      expect(l.cellSizePx * 4 + l.gapPx * 3).toBeLessThanOrEqual(l.gridSizePx);
    }
  });

  it('全 viewport で cellSize >= 56（OPT-2 タップ領域）', () => {
    const layouts = [
      computeG07GridLayout(360),
      computeG07GridLayout(375),
      computeG07GridLayout(768),
      computeG07GridLayout(1280),
    ];
    for (const l of layouts) {
      expect(l.cellSizePx).toBeGreaterThanOrEqual(56);
    }
  });
});

/** 0〜180° 周期空間での最小角度差（向きの周期性 = 180° に注意） */
function circularOrientationDistance(a: number, b: number): number {
  let diff = Math.abs(a - b) % 180;
  if (diff > 90) diff = 180 - diff;
  return diff;
}
