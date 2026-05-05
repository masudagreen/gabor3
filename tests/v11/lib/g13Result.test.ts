/**
 * G-13 result サマリヘルパーの純関数テスト（screens.md S17-06）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG13CorrectAnswerLabel,
  buildG13ResultDetailText,
  buildG13UserAnswerLabel,
  computeG13DiffFromBest,
  formatG13ThresholdLabel,
} from '../../../src/lib/v11/g13Result';
import { G13GradingResult } from '../../../src/lib/v11/g13Trial';

describe('buildG13CorrectAnswerLabel', () => {
  it('3 → 「3」', () => {
    expect(buildG13CorrectAnswerLabel(3)).toBe('3');
  });
  it('0 → 「0」', () => {
    expect(buildG13CorrectAnswerLabel(0)).toBe('0');
  });
  it('9 → 「9」', () => {
    expect(buildG13CorrectAnswerLabel(9)).toBe('9');
  });
});

describe('buildG13UserAnswerLabel', () => {
  it('null → null', () => {
    expect(buildG13UserAnswerLabel(null)).toBeNull();
  });
  it('5 → 「5」', () => {
    expect(buildG13UserAnswerLabel(5)).toBe('5');
  });
});

describe('buildG13ResultDetailText', () => {
  it('null grading → 空文字', () => {
    expect(buildG13ResultDetailText(null)).toBe('');
  });
  it('未回答 → 「未回答」', () => {
    const g: G13GradingResult = {
      embeddedDigit: 3,
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
    };
    expect(buildG13ResultDetailText(g)).toBe('未回答');
  });
  it('正解 → 空文字', () => {
    const g: G13GradingResult = {
      embeddedDigit: 3,
      userAnswer: 3,
      isCorrect: true,
      unattempted: false,
    };
    expect(buildG13ResultDetailText(g)).toBe('');
  });
});

describe('formatG13ThresholdLabel', () => {
  it('0.10 → 「0.10」', () => {
    expect(formatG13ThresholdLabel(0.10)).toBe('0.10');
  });
  it('0.03 → 「0.03」（最難）', () => {
    expect(formatG13ThresholdLabel(0.03)).toBe('0.03');
  });
  it('0.30 → 「0.30」（最易）', () => {
    expect(formatG13ThresholdLabel(0.30)).toBe('0.30');
  });
  it('0.094 → 「0.09」（小数 2 桁四捨五入）', () => {
    expect(formatG13ThresholdLabel(0.094)).toBe('0.09');
  });
  it('0.096 → 「0.10」（小数 2 桁四捨五入）', () => {
    expect(formatG13ThresholdLabel(0.096)).toBe('0.10');
  });
});

describe('computeG13DiffFromBest', () => {
  it('previousBest=null → undefined（初回測定）', () => {
    const d = computeG13DiffFromBest({
      currentThreshold: 0.10,
      previousBest: null,
    });
    expect(d).toBeUndefined();
  });

  it('過去ベスト 0.10、今回 0.08 → improved（"-", "0.02"）', () => {
    const d = computeG13DiffFromBest({
      currentThreshold: 0.08,
      previousBest: 0.10,
    });
    expect(d).toEqual({
      sign: '-',
      magnitude: '0.02',
      direction: 'improved',
    });
  });

  it('過去ベスト 0.10、今回 0.10 → flat', () => {
    const d = computeG13DiffFromBest({
      currentThreshold: 0.10,
      previousBest: 0.10,
    });
    expect(d?.direction).toBe('flat');
  });

  it('過去ベスト 0.10、今回 0.12 → worsened（"+", "0.02"）', () => {
    const d = computeG13DiffFromBest({
      currentThreshold: 0.12,
      previousBest: 0.10,
    });
    expect(d).toEqual({
      sign: '+',
      magnitude: '0.02',
      direction: 'worsened',
    });
  });

  it('digits=2 がデフォルト', () => {
    const d = computeG13DiffFromBest({
      currentThreshold: 0.083,
      previousBest: 0.10,
    });
    expect(d?.magnitude).toMatch(/^\d+\.\d{2}$/);
  });
});
