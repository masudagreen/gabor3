/**
 * g01Result — G-01 結果サマリヘルパーの純関数テスト（spec-v11.md §7.1）。
 */

import {
  buildAnswerCountSummary,
  buildCorrectAnswerLabel,
  buildUserAnswerLabel,
  computeDiffFromBest,
  patchIdToJaLabel,
} from '../../../src/lib/v11/g01Result';
import { Game1GradingResult, Game1TrialSpec } from '../../../src/lib/game1';

describe('g01Result: パッチ ID 表示', () => {
  it('"r0c0" → 「1 列 1 行目」', () => {
    expect(patchIdToJaLabel('r0c0')).toBe('1 列 1 行目');
  });

  it('"r2c1" → 「2 列 3 行目」（行 row, 列 col）', () => {
    expect(patchIdToJaLabel('r2c1')).toBe('2 列 3 行目');
  });

  it('不正な ID はそのまま返す', () => {
    expect(patchIdToJaLabel('invalid')).toBe('invalid');
  });
});

describe('g01Result: 正解ラベル', () => {
  function makeTrial(
    changingIds: string[],
    rows: 3 | 4 | 5 = 3,
    cols: 3 | 4 | 5 = 3,
  ): Game1TrialSpec {
    const patches: Game1TrialSpec['patches'] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const id = `r${r}c${c}`;
        patches.push({
          id,
          row: r,
          col: c,
          cpd: 3,
          contrast: 0.4,
          sigmaDeg: 0.6,
          startOrientationDeg: 0,
          endOrientationDeg: 0,
          isChanging: changingIds.includes(id),
        });
      }
    }
    return {
      config: { difficulty: 'hard', rows, cols, changingCount: 1 },
      patches,
      maxAngleDeltaDeg: 5,
    };
  }

  it('変化対象が 1 個なら「1 列 1 行目」', () => {
    const trial = makeTrial(['r0c0']);
    expect(buildCorrectAnswerLabel(trial)).toBe('1 列 1 行目');
  });

  it('変化対象が 3 個なら「、」区切り', () => {
    const trial = makeTrial(['r0c0', 'r1c1', 'r2c2'], 3, 3);
    expect(buildCorrectAnswerLabel(trial)).toBe(
      '1 列 1 行目、2 列 2 行目、3 列 3 行目',
    );
  });

  it('変化対象 0 個なら「変化なし」', () => {
    const trial = makeTrial([]);
    expect(buildCorrectAnswerLabel(trial)).toBe('変化なし');
  });
});

describe('g01Result: ユーザー回答ラベル', () => {
  it('未選択なら null', () => {
    expect(buildUserAnswerLabel([])).toBeNull();
  });

  it('1 個選択なら「1 列 1 行目」', () => {
    expect(buildUserAnswerLabel(['r0c0'])).toBe('1 列 1 行目');
  });

  it('複数選択は「、」区切り', () => {
    expect(buildUserAnswerLabel(['r0c0', 'r1c1'])).toBe(
      '1 列 1 行目、2 列 2 行目',
    );
  });
});

describe('g01Result: 採点詳細サマリ', () => {
  it('未挑戦なら「未回答」', () => {
    expect(buildAnswerCountSummary(null, true)).toBe('未回答');
  });

  it('1 正解 1 誤答なら「（正解 1, 誤答 1）」', () => {
    const grading: Game1GradingResult = {
      changingIds: ['r0c0'],
      correctIds: ['r0c0'],
      incorrectIds: ['r1c1'],
      missedIds: [],
      score: 0,
      isCorrectForStaircase: false,
    };
    expect(buildAnswerCountSummary(grading, false)).toBe(
      '（正解 1, 誤答 1）',
    );
  });

  it('全正解（FP=0）なら「（正解 N, 誤答 0）」', () => {
    const grading: Game1GradingResult = {
      changingIds: ['r0c0', 'r1c1'],
      correctIds: ['r0c0', 'r1c1'],
      incorrectIds: [],
      missedIds: [],
      score: 2,
      isCorrectForStaircase: true,
    };
    expect(buildAnswerCountSummary(grading, false)).toBe(
      '（正解 2, 誤答 0）',
    );
  });
});

describe('g01Result: 前回比 diff', () => {
  it('previousBest=null なら undefined（初回測定）', () => {
    expect(
      computeDiffFromBest({ currentThreshold: 5.0, previousBest: null }),
    ).toBeUndefined();
  });

  it('今回 4.0 / 過去ベスト 5.3 → improved（- 1.3）', () => {
    const d = computeDiffFromBest({
      currentThreshold: 4.0,
      previousBest: 5.3,
      step: 1,
    });
    expect(d).toEqual({
      sign: '-',
      magnitude: '1.3',
      direction: 'improved',
    });
  });

  it('今回 6.5 / 過去ベスト 5.0 → worsened（+ 1.5）', () => {
    const d = computeDiffFromBest({
      currentThreshold: 6.5,
      previousBest: 5.0,
      step: 1,
    });
    expect(d).toEqual({
      sign: '+',
      magnitude: '1.5',
      direction: 'worsened',
    });
  });

  it('今回 5.0 / 過去ベスト 5.0 → flat', () => {
    const d = computeDiffFromBest({
      currentThreshold: 5.0,
      previousBest: 5.0,
      step: 1,
    });
    expect(d?.direction).toBe('flat');
    expect(d?.sign).toBe('0');
  });

  it('step の半分以下の差は flat 判定', () => {
    // step 1 → flatThreshold 0.5
    const d = computeDiffFromBest({
      currentThreshold: 5.4,
      previousBest: 5.0,
      step: 1,
    });
    expect(d?.direction).toBe('flat');
  });
});
