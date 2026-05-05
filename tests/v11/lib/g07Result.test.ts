/**
 * G-07 結果サマリヘルパーの純関数テスト（screens.md S14-06）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG07CorrectLabel,
  buildG07UserAnswerLabel,
  computeG07DiffFromBest,
} from '../../../src/lib/v11/g07Result';
import { G07GradingResult } from '../../../src/lib/v11/g07Trial';

function makeGrading(overrides: Partial<G07GradingResult> = {}): G07GradingResult {
  return {
    correctIds: ['r0c0', 'r0c1', 'r0c2'],
    userSelectedIds: [],
    truePositiveIds: [],
    falsePositiveIds: [],
    falseNegativeIds: ['r0c0', 'r0c1', 'r0c2'],
    isCorrect: false,
    unattempted: true,
    ...overrides,
  };
}

describe('buildG07CorrectLabel', () => {
  it('null → 空文字', () => {
    expect(buildG07CorrectLabel(null)).toBe('');
  });

  it('正解 3 個を「・」で連結', () => {
    expect(
      buildG07CorrectLabel(
        makeGrading({ correctIds: ['r1c1', 'r2c2', 'r3c3'] }),
      ),
    ).toBe('2 行 2 列・3 行 3 列・4 行 4 列');
  });
});

describe('buildG07UserAnswerLabel', () => {
  it('null → null（呼び出し側で「未回答」処理）', () => {
    expect(buildG07UserAnswerLabel(null)).toBeNull();
  });

  it('未回答 → null（ResultSummaryV11 既定の「未回答」表示にフォールバック）', () => {
    expect(
      buildG07UserAnswerLabel(makeGrading({ unattempted: true })),
    ).toBeNull();
  });

  it('3/3 全正解 → 「3/3 個正解」', () => {
    expect(
      buildG07UserAnswerLabel(
        makeGrading({
          truePositiveIds: ['r0c0', 'r0c1', 'r0c2'],
          falseNegativeIds: [],
          isCorrect: true,
          unattempted: false,
          userSelectedIds: ['r0c0', 'r0c1', 'r0c2'],
        }),
      ),
    ).toBe('3/3 個正解');
  });

  it('2/3 + 1 過剰 → 「2/3 個正解（1 過剰）」', () => {
    expect(
      buildG07UserAnswerLabel(
        makeGrading({
          truePositiveIds: ['r0c0', 'r0c1'],
          falsePositiveIds: ['r2c2'],
          falseNegativeIds: ['r0c2'],
          unattempted: false,
          userSelectedIds: ['r0c0', 'r0c1', 'r2c2'],
        }),
      ),
    ).toBe('2/3 個正解（1 過剰）');
  });
});

describe('computeG07DiffFromBest', () => {
  it('previousBest=null → 初回測定で undefined', () => {
    expect(
      computeG07DiffFromBest({ currentThreshold: 5, previousBest: null }),
    ).toBeUndefined();
  });

  it('今回 4 / 過去ベスト 5 → improved（sign="-", "1"）', () => {
    const diff = computeG07DiffFromBest({
      currentThreshold: 4,
      previousBest: 5,
    });
    expect(diff?.sign).toBe('-');
    expect(diff?.direction).toBe('improved');
    expect(diff?.magnitude).toBe('1');
  });

  it('今回 6 / 過去ベスト 5 → worsened（sign="+", "1"）', () => {
    const diff = computeG07DiffFromBest({
      currentThreshold: 6,
      previousBest: 5,
    });
    expect(diff?.sign).toBe('+');
    expect(diff?.direction).toBe('worsened');
    expect(diff?.magnitude).toBe('1');
  });

  it('今回 5 / 過去ベスト 5 → flat（同等）', () => {
    const diff = computeG07DiffFromBest({
      currentThreshold: 5,
      previousBest: 5,
    });
    expect(diff?.direction).toBe('flat');
  });

  it('step=1 のとき差 0.4 は flat（step/2=0.5 以下）', () => {
    const diff = computeG07DiffFromBest({
      currentThreshold: 5.4,
      previousBest: 5,
    });
    expect(diff?.direction).toBe('flat');
  });

  it('step=1 のとき差 0.6 は worsened（step/2=0.5 を超える）', () => {
    const diff = computeG07DiffFromBest({
      currentThreshold: 5.6,
      previousBest: 5,
    });
    expect(diff?.direction).toBe('worsened');
  });

  it('digits=0（デフォルト）で表示桁が整数', () => {
    const diff = computeG07DiffFromBest({
      currentThreshold: 4,
      previousBest: 5,
    });
    expect(diff?.magnitude).toMatch(/^\d+$/);
  });
});
