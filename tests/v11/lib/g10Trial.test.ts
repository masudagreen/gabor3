/**
 * G-10 trial 生成 / 採点 / レイアウト / 象限判定の純関数テスト（spec-v11.md §7.10）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG10Trial,
  cellPosToQuadrant,
  computeG10GridLayout,
  G10_ALL_QUADRANTS,
  G10_GABOR_PARAMS,
  G10_GRID_SIZE,
  G10_TARGET_SIZE,
  G10Quadrant,
  GAME10_V11,
  gradeG10,
  isInTargetRegion,
  quadrantToJaLabel,
  quadrantTopLeftCandidates,
  targetTopLeftToQuadrant,
  userAnswerQuadrantToLabel,
  wrapTo180,
} from '../../../src/lib/v11/g10Trial';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';

describe('g10Trial: spec', () => {
  it('GAME10_V11.totalDurationMs は 60_000（OPT-11 / OPT-12）', () => {
    expect(GAME10_V11.totalDurationMs).toBe(60_000);
  });

  it('GAME10_V11.correctRevealMs は 1500ms（screens.md S16-03）', () => {
    expect(GAME10_V11.correctRevealMs).toBe(1500);
  });

  it('G10_GRID_SIZE は 8、G10_TARGET_SIZE は 3（spec §7.10）', () => {
    expect(G10_GRID_SIZE).toBe(8);
    expect(G10_TARGET_SIZE).toBe(3);
  });

  it('G10_GABOR_PARAMS は cpd=4, contrast=0.4, sigmaDeg=0.4', () => {
    expect(G10_GABOR_PARAMS.cpd).toBe(4);
    expect(G10_GABOR_PARAMS.contrast).toBeCloseTo(0.4, 5);
    expect(G10_GABOR_PARAMS.sigmaDeg).toBeCloseTo(0.4, 5);
  });

  it('gameRegistry G-10 の paramRange は { min:5, max:90, initial:30, step:5 }', () => {
    const def = GAME_REGISTRY.find((g) => g.gameId === 'G-10');
    expect(def).toBeDefined();
    expect(def?.paramRange.min).toBe(5);
    expect(def?.paramRange.max).toBe(90);
    expect(def?.paramRange.initial).toBe(30);
    expect(def?.paramRange.step).toBe(5);
  });

  it('G10_ALL_QUADRANTS は 4 象限（左上 / 右上 / 左下 / 右下）', () => {
    expect(G10_ALL_QUADRANTS).toEqual([
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ]);
  });
});

describe('quadrantToJaLabel', () => {
  it('top-left → 「左上」', () => {
    expect(quadrantToJaLabel('top-left')).toBe('左上');
  });
  it('top-right → 「右上」', () => {
    expect(quadrantToJaLabel('top-right')).toBe('右上');
  });
  it('bottom-left → 「左下」', () => {
    expect(quadrantToJaLabel('bottom-left')).toBe('左下');
  });
  it('bottom-right → 「右下」', () => {
    expect(quadrantToJaLabel('bottom-right')).toBe('右下');
  });
});

describe('userAnswerQuadrantToLabel', () => {
  it('null → null（未回答）', () => {
    expect(userAnswerQuadrantToLabel(null)).toBeNull();
  });
  it('top-left → 「左上」', () => {
    expect(userAnswerQuadrantToLabel('top-left')).toBe('左上');
  });
});

describe('cellPosToQuadrant: 8×8 grid を 4 象限に分割', () => {
  it('(0,0) → top-left', () => {
    expect(cellPosToQuadrant(0, 0)).toBe('top-left');
  });
  it('(3,3) → top-left（左上 4×4 の右下端）', () => {
    expect(cellPosToQuadrant(3, 3)).toBe('top-left');
  });
  it('(0,4) → top-right', () => {
    expect(cellPosToQuadrant(0, 4)).toBe('top-right');
  });
  it('(0,7) → top-right', () => {
    expect(cellPosToQuadrant(0, 7)).toBe('top-right');
  });
  it('(4,0) → bottom-left', () => {
    expect(cellPosToQuadrant(4, 0)).toBe('bottom-left');
  });
  it('(7,3) → bottom-left', () => {
    expect(cellPosToQuadrant(7, 3)).toBe('bottom-left');
  });
  it('(4,4) → bottom-right', () => {
    expect(cellPosToQuadrant(4, 4)).toBe('bottom-right');
  });
  it('(7,7) → bottom-right', () => {
    expect(cellPosToQuadrant(7, 7)).toBe('bottom-right');
  });
});

describe('quadrantTopLeftCandidates: 3×3 が象限内に収まる左上座標候補', () => {
  it('top-left は 4 候補（row ∈ {0,1}, col ∈ {0,1}）', () => {
    const cands = quadrantTopLeftCandidates('top-left');
    expect(cands).toHaveLength(4);
    expect(cands).toEqual(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ]),
    );
  });

  it('top-right は 4 候補（row ∈ {0,1}, col ∈ {4,5}）', () => {
    const cands = quadrantTopLeftCandidates('top-right');
    expect(cands).toHaveLength(4);
    expect(cands).toEqual(
      expect.arrayContaining([
        { row: 0, col: 4 },
        { row: 0, col: 5 },
        { row: 1, col: 4 },
        { row: 1, col: 5 },
      ]),
    );
  });

  it('bottom-left は 4 候補（row ∈ {4,5}, col ∈ {0,1}）', () => {
    const cands = quadrantTopLeftCandidates('bottom-left');
    expect(cands).toHaveLength(4);
    expect(cands).toEqual(
      expect.arrayContaining([
        { row: 4, col: 0 },
        { row: 4, col: 1 },
        { row: 5, col: 0 },
        { row: 5, col: 1 },
      ]),
    );
  });

  it('bottom-right は 4 候補（row ∈ {4,5}, col ∈ {4,5}）', () => {
    const cands = quadrantTopLeftCandidates('bottom-right');
    expect(cands).toHaveLength(4);
    expect(cands).toEqual(
      expect.arrayContaining([
        { row: 4, col: 4 },
        { row: 4, col: 5 },
        { row: 5, col: 4 },
        { row: 5, col: 5 },
      ]),
    );
  });

  it('全候補から作った 3×3 が 8×8 grid の境界内に収まる', () => {
    for (const q of G10_ALL_QUADRANTS) {
      for (const { row, col } of quadrantTopLeftCandidates(q)) {
        expect(row).toBeGreaterThanOrEqual(0);
        expect(col).toBeGreaterThanOrEqual(0);
        expect(row + G10_TARGET_SIZE).toBeLessThanOrEqual(G10_GRID_SIZE);
        expect(col + G10_TARGET_SIZE).toBeLessThanOrEqual(G10_GRID_SIZE);
      }
    }
  });
});

describe('targetTopLeftToQuadrant: target 左上座標 → 所属象限', () => {
  it('(0,0) → top-left', () => {
    expect(targetTopLeftToQuadrant(0, 0)).toBe('top-left');
  });
  it('(1,1) → top-left（3×3 が左上象限の 4×4 内に収まる）', () => {
    expect(targetTopLeftToQuadrant(1, 1)).toBe('top-left');
  });
  it('(0,4) → top-right', () => {
    expect(targetTopLeftToQuadrant(0, 4)).toBe('top-right');
  });
  it('(5,5) → bottom-right', () => {
    expect(targetTopLeftToQuadrant(5, 5)).toBe('bottom-right');
  });
});

describe('isInTargetRegion: 3×3 領域包含判定', () => {
  it('(0,0) は target (0,0) 領域に含まれる', () => {
    expect(
      isInTargetRegion({ row: 0, col: 0, topLeftRow: 0, topLeftCol: 0 }),
    ).toBe(true);
  });
  it('(2,2) は target (0,0) 領域に含まれる（最右下）', () => {
    expect(
      isInTargetRegion({ row: 2, col: 2, topLeftRow: 0, topLeftCol: 0 }),
    ).toBe(true);
  });
  it('(3,3) は target (0,0) 領域に含まれない', () => {
    expect(
      isInTargetRegion({ row: 3, col: 3, topLeftRow: 0, topLeftCol: 0 }),
    ).toBe(false);
  });
  it('(4,5) は target (4,4) 領域に含まれる', () => {
    expect(
      isInTargetRegion({ row: 4, col: 5, topLeftRow: 4, topLeftCol: 4 }),
    ).toBe(true);
  });
  it('(7,7) は target (4,4) 領域に含まれない（境界外）', () => {
    expect(
      isInTargetRegion({ row: 7, col: 7, topLeftRow: 4, topLeftCol: 4 }),
    ).toBe(false);
  });
});

describe('wrapTo180: 0〜180° 正規化', () => {
  it('-30 → 150', () => {
    expect(wrapTo180(-30)).toBeCloseTo(150, 5);
  });
  it('190 → 10', () => {
    expect(wrapTo180(190)).toBeCloseTo(10, 5);
  });
  it('0 → 0', () => {
    expect(wrapTo180(0)).toBe(0);
  });
  it('180 → 0', () => {
    expect(wrapTo180(180)).toBe(0);
  });
});

describe('buildG10Trial: 64 セル + 正解象限を生成', () => {
  it('64 セルを生成（行優先順）', () => {
    const trial = buildG10Trial(30, () => 0.5);
    expect(trial.cells).toHaveLength(64);
    // 8×8 すべての (r, c) が含まれる
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const cell = trial.cells.find((x) => x.row === r && x.col === c);
        expect(cell).toBeDefined();
      }
    }
  });

  it('target 領域の 9 セルが isTargetMember=true', () => {
    const trial = buildG10Trial(30, () => 0.5);
    const targets = trial.cells.filter((c) => c.isTargetMember);
    expect(targets).toHaveLength(9);
    // target 領域の境界
    for (const t of targets) {
      expect(t.row).toBeGreaterThanOrEqual(trial.targetTopLeftRow);
      expect(t.row).toBeLessThan(trial.targetTopLeftRow + 3);
      expect(t.col).toBeGreaterThanOrEqual(trial.targetTopLeftCol);
      expect(t.col).toBeLessThan(trial.targetTopLeftCol + 3);
    }
  });

  it('背景の 55 セルが isTargetMember=false', () => {
    const trial = buildG10Trial(30, () => 0.5);
    const bg = trial.cells.filter((c) => !c.isTargetMember);
    expect(bg).toHaveLength(64 - 9);
  });

  it('target 領域の向きは背景 + diff（または -diff）', () => {
    const trial = buildG10Trial(30, () => 0.3);
    // wrap 後の向き差は 30 または 150 になる（180-30）
    const diff = Math.abs(
      trial.targetOrientationDeg - trial.backgroundOrientationDeg,
    );
    const wrappedDiff = Math.min(diff, 180 - diff);
    expect(wrappedDiff).toBeCloseTo(30, 4);
  });

  it('paramOrientationDiffDeg=0 のとき target = 背景（差なし）', () => {
    const trial = buildG10Trial(0, () => 0.7);
    expect(trial.targetOrientationDeg).toBeCloseTo(
      trial.backgroundOrientationDeg,
      4,
    );
  });

  it('正解象限は target 左上座標から導出される', () => {
    for (const seed of [0.1, 0.3, 0.6, 0.9]) {
      const trial = buildG10Trial(30, () => seed);
      const expected = targetTopLeftToQuadrant(
        trial.targetTopLeftRow,
        trial.targetTopLeftCol,
      );
      expect(trial.correctQuadrant).toBe(expected);
    }
  });

  it('rng=0.0 時 → top-left 象限（candidates[0] = (0,0)）', () => {
    const trial = buildG10Trial(30, () => 0);
    expect(trial.correctQuadrant).toBe('top-left');
    expect(trial.targetTopLeftRow).toBe(0);
    expect(trial.targetTopLeftCol).toBe(0);
  });

  it('paramOrientationDiffDeg は staircase 値そのままを記録', () => {
    expect(buildG10Trial(45, () => 0.4).paramOrientationDiffDeg).toBe(45);
    expect(buildG10Trial(60, () => 0.4).paramOrientationDiffDeg).toBe(60);
    expect(buildG10Trial(5, () => 0.4).paramOrientationDiffDeg).toBe(5);
  });

  it('負の diff も 0 にクランプ', () => {
    const trial = buildG10Trial(-10, () => 0.4);
    expect(trial.paramOrientationDiffDeg).toBe(0);
  });

  it('全 64 セルが共通 GaborParams（cpd / contrast / sigmaDeg）', () => {
    const trial = buildG10Trial(45, () => 0.5);
    for (const cell of trial.cells) {
      expect(cell.gabor.cpd).toBe(G10_GABOR_PARAMS.cpd);
      expect(cell.gabor.contrast).toBeCloseTo(G10_GABOR_PARAMS.contrast, 5);
      expect(cell.gabor.sigmaDeg).toBeCloseTo(G10_GABOR_PARAMS.sigmaDeg, 5);
    }
  });

  it('phaseRad は 0〜2π の範囲', () => {
    const trial = buildG10Trial(30, () => 0.5);
    for (const cell of trial.cells) {
      expect(cell.gabor.phaseRad).toBeGreaterThanOrEqual(0);
      expect(cell.gabor.phaseRad).toBeLessThanOrEqual(2 * Math.PI + 1e-6);
    }
  });
});

describe('gradeG10: 採点', () => {
  const buildTrialWithQuadrant = (q: G10Quadrant) => {
    // rng で q を引かせる：象限インデックス = G10_ALL_QUADRANTS.indexOf(q)
    const idx = G10_ALL_QUADRANTS.indexOf(q);
    const seq = [
      idx / 4 + 0.01, // 象限選択
      0.1, // 候補選択（candidates[0]）
      0.5, // baseDeg
      0.5, // sign
    ];
    let i = 0;
    return buildG10Trial(30, () => {
      const v = seq[i % seq.length];
      i += 1;
      return v;
    });
  };

  it('一致 → 正解', () => {
    const trial = buildTrialWithQuadrant('top-left');
    const grading = gradeG10(trial, 'top-left');
    expect(grading.isCorrect).toBe(true);
    expect(grading.unattempted).toBe(false);
    expect(grading.userAnswer).toBe('top-left');
    expect(grading.correctQuadrant).toBe('top-left');
  });

  it('不一致 → 不正解', () => {
    const trial = buildTrialWithQuadrant('top-left');
    const grading = gradeG10(trial, 'bottom-right');
    expect(grading.isCorrect).toBe(false);
    expect(grading.unattempted).toBe(false);
  });

  it('null → 未回答 → 不正解', () => {
    const trial = buildTrialWithQuadrant('top-left');
    const grading = gradeG10(trial, null);
    expect(grading.isCorrect).toBe(false);
    expect(grading.unattempted).toBe(true);
    expect(grading.userAnswer).toBeNull();
  });
});

describe('computeG10GridLayout: レスポンシブ', () => {
  it('360px → grid 288px、cell 36px、gap 0', () => {
    const l = computeG10GridLayout(360);
    expect(l.gridSizePx).toBe(288);
    expect(l.cellSizePx).toBe(36);
    expect(l.gapPx).toBe(0);
  });

  it('375px → grid 320px、cell 40px', () => {
    const l = computeG10GridLayout(375);
    expect(l.gridSizePx).toBe(320);
    expect(l.cellSizePx).toBe(40);
  });

  it('768px → grid 400px、cell 50px', () => {
    const l = computeG10GridLayout(768);
    expect(l.gridSizePx).toBe(400);
    expect(l.cellSizePx).toBe(50);
  });

  it('1280px → grid 480px、cell 60px', () => {
    const l = computeG10GridLayout(1280);
    expect(l.gridSizePx).toBe(480);
    expect(l.cellSizePx).toBe(60);
  });

  it('オブジェクト形式 { widthPx } も受け付ける', () => {
    expect(computeG10GridLayout({ widthPx: 360 }).cellSizePx).toBe(36);
    expect(computeG10GridLayout({ widthPx: 1280 }).cellSizePx).toBe(60);
  });

  it('全レイアウトで cellSize × 8 == gridSize（gap=0）', () => {
    for (const w of [360, 375, 768, 1280]) {
      const l = computeG10GridLayout(w);
      expect(l.cellSizePx * 8).toBe(l.gridSizePx);
    }
  });
});
