/**
 * G-12 result サマリヘルパーの純関数テスト（screens.md S17-03）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG12CorrectAnswerLabel,
  buildG12ResultDetailText,
  buildG12UserAnswerLabel,
  computeG12DiffFromBest,
  formatG12ThresholdLabel,
} from '../../../src/lib/v11/g12Result';
import { G12GradingResult } from '../../../src/lib/v11/g12Trial';

describe('buildG12CorrectAnswerLabel', () => {
  it('vertical → 「垂直」', () => {
    expect(buildG12CorrectAnswerLabel('vertical')).toBe('垂直');
  });
  it('diagonalRight → 「斜め右」', () => {
    expect(buildG12CorrectAnswerLabel('diagonalRight')).toBe('斜め右');
  });
});

describe('buildG12UserAnswerLabel', () => {
  it('null → null', () => {
    expect(buildG12UserAnswerLabel(null)).toBeNull();
  });
  it('horizontal → 「水平」', () => {
    expect(buildG12UserAnswerLabel('horizontal')).toBe('水平');
  });
  it('diagonalLeft → 「斜め左」', () => {
    expect(buildG12UserAnswerLabel('diagonalLeft')).toBe('斜め左');
  });
});

describe('buildG12ResultDetailText', () => {
  it('null grading → 空文字', () => {
    expect(buildG12ResultDetailText(null)).toBe('');
  });
  it('未回答 → 「未回答」', () => {
    const g: G12GradingResult = {
      correctOrientation: 'vertical',
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
    };
    expect(buildG12ResultDetailText(g)).toBe('未回答');
  });
  it('正解 → 空文字', () => {
    const g: G12GradingResult = {
      correctOrientation: 'vertical',
      userAnswer: 'vertical',
      isCorrect: true,
      unattempted: false,
    };
    expect(buildG12ResultDetailText(g)).toBe('');
  });
  it('不正解 → 空文字', () => {
    const g: G12GradingResult = {
      correctOrientation: 'vertical',
      userAnswer: 'horizontal',
      isCorrect: false,
      unattempted: false,
    };
    expect(buildG12ResultDetailText(g)).toBe('');
  });
});

describe('formatG12ThresholdLabel', () => {
  it('2.0 → 「2.0×」', () => {
    expect(formatG12ThresholdLabel(2.0)).toBe('2.0×');
  });
  it('1.2 → 「1.2×」（最難）', () => {
    expect(formatG12ThresholdLabel(1.2)).toBe('1.2×');
  });
  it('4.0 → 「4.0×」（最易）', () => {
    expect(formatG12ThresholdLabel(4.0)).toBe('4.0×');
  });
  it('1.94 → 「1.9×」（小数 1 桁四捨五入）', () => {
    expect(formatG12ThresholdLabel(1.94)).toBe('1.9×');
  });
  it('1.96 → 「2.0×」（小数 1 桁四捨五入）', () => {
    expect(formatG12ThresholdLabel(1.96)).toBe('2.0×');
  });
});

describe('computeG12DiffFromBest', () => {
  it('previousBest=null → undefined（初回測定）', () => {
    const d = computeG12DiffFromBest({
      currentThreshold: 2.0,
      previousBest: null,
    });
    expect(d).toBeUndefined();
  });

  it('過去ベスト 2.0、今回 1.8 → improved（"-", "0.2"）', () => {
    const d = computeG12DiffFromBest({
      currentThreshold: 1.8,
      previousBest: 2.0,
    });
    expect(d).toEqual({
      sign: '-',
      magnitude: '0.2',
      direction: 'improved',
    });
  });

  it('過去ベスト 2.0、今回 2.0 → flat', () => {
    const d = computeG12DiffFromBest({
      currentThreshold: 2.0,
      previousBest: 2.0,
    });
    expect(d?.direction).toBe('flat');
  });

  it('過去ベスト 2.0、今回 2.2 → worsened（"+", "0.2"）', () => {
    const d = computeG12DiffFromBest({
      currentThreshold: 2.2,
      previousBest: 2.0,
    });
    expect(d).toEqual({
      sign: '+',
      magnitude: '0.2',
      direction: 'worsened',
    });
  });

  it('digits=1 がデフォルト', () => {
    const d = computeG12DiffFromBest({
      currentThreshold: 1.83,
      previousBest: 2.0,
    });
    expect(d?.magnitude).toMatch(/^\d+\.\d$/);
  });
});
