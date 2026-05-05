/**
 * G-02 結果サマリヘルパーの純関数テスト（screens.md S10-03）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG02CorrectAnswerLabel,
  buildG02UserAnswerLabel,
  buildG02ResultDetailText,
  computeG02DiffFromBest,
} from '../../../src/lib/v11/g02Result';
import { G02GradingResult } from '../../../src/lib/v11/g02Trial';

describe('buildG02CorrectAnswerLabel', () => {
  it('left → 「左」', () => {
    expect(buildG02CorrectAnswerLabel('left')).toBe('左');
  });
  it('right → 「右」', () => {
    expect(buildG02CorrectAnswerLabel('right')).toBe('右');
  });
});

describe('buildG02UserAnswerLabel', () => {
  it('null → null（呼び出し側で「未回答」処理）', () => {
    expect(buildG02UserAnswerLabel(null)).toBeNull();
  });
  it('left → 「左」', () => {
    expect(buildG02UserAnswerLabel('left')).toBe('左');
  });
});

describe('buildG02ResultDetailText', () => {
  function makeGrading(unattempted: boolean): G02GradingResult {
    return {
      correctSide: 'left',
      userAnswer: unattempted ? null : 'left',
      isCorrect: !unattempted,
      unattempted,
    };
  }
  it('null → 空文字', () => {
    expect(buildG02ResultDetailText(null)).toBe('');
  });
  it('未回答 → 「未回答」', () => {
    expect(buildG02ResultDetailText(makeGrading(true))).toBe('未回答');
  });
  it('挑戦あり → 空文字（G-02 は 1 回答で詳細不要）', () => {
    expect(buildG02ResultDetailText(makeGrading(false))).toBe('');
  });
});

describe('computeG02DiffFromBest', () => {
  it('previousBest=null → 初回測定で undefined', () => {
    expect(
      computeG02DiffFromBest({ currentThreshold: 6, previousBest: null }),
    ).toBeUndefined();
  });

  it('今回 5° / 過去ベスト 6° → improved（sign="-", 1.0）', () => {
    const diff = computeG02DiffFromBest({
      currentThreshold: 5,
      previousBest: 6,
    });
    expect(diff).toEqual({
      sign: '-',
      magnitude: '1.0',
      direction: 'improved',
    });
  });

  it('今回 7° / 過去ベスト 6° → worsened（sign="+", 1.0）', () => {
    const diff = computeG02DiffFromBest({
      currentThreshold: 7,
      previousBest: 6,
    });
    expect(diff).toEqual({
      sign: '+',
      magnitude: '1.0',
      direction: 'worsened',
    });
  });

  it('今回 6.0° / 過去ベスト 6.0° → flat（同等）', () => {
    const diff = computeG02DiffFromBest({
      currentThreshold: 6,
      previousBest: 6,
    });
    expect(diff?.direction).toBe('flat');
  });

  it('step=1 のとき差 0.4 は flat（step/2=0.5 以下）', () => {
    const diff = computeG02DiffFromBest({
      currentThreshold: 6.4,
      previousBest: 6.0,
      step: 1,
    });
    expect(diff?.direction).toBe('flat');
  });

  it('step=1 のとき差 0.6 は worsened（step/2=0.5 を超える）', () => {
    const diff = computeG02DiffFromBest({
      currentThreshold: 6.6,
      previousBest: 6.0,
      step: 1,
    });
    expect(diff?.direction).toBe('worsened');
  });
});
