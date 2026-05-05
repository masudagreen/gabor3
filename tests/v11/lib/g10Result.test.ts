/**
 * G-10 結果ヘルパー（screens.md S16-03）の純関数テスト。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG10CorrectAnswerLabel,
  buildG10ResultDetailText,
  buildG10UserAnswerLabel,
  computeG10DiffFromBest,
  formatG10ThresholdLabel,
} from '../../../src/lib/v11/g10Result';
import { G10GradingResult } from '../../../src/lib/v11/g10Trial';

describe('buildG10CorrectAnswerLabel', () => {
  it('top-left → 「左上」', () => {
    expect(buildG10CorrectAnswerLabel('top-left')).toBe('左上');
  });
  it('top-right → 「右上」', () => {
    expect(buildG10CorrectAnswerLabel('top-right')).toBe('右上');
  });
  it('bottom-left → 「左下」', () => {
    expect(buildG10CorrectAnswerLabel('bottom-left')).toBe('左下');
  });
  it('bottom-right → 「右下」', () => {
    expect(buildG10CorrectAnswerLabel('bottom-right')).toBe('右下');
  });
});

describe('buildG10UserAnswerLabel', () => {
  it('null → null（未回答）', () => {
    expect(buildG10UserAnswerLabel(null)).toBeNull();
  });
  it('top-left → 「左上」', () => {
    expect(buildG10UserAnswerLabel('top-left')).toBe('左上');
  });
  it('bottom-right → 「右下」', () => {
    expect(buildG10UserAnswerLabel('bottom-right')).toBe('右下');
  });
});

describe('buildG10ResultDetailText', () => {
  it('grading=null → 空文字', () => {
    expect(buildG10ResultDetailText(null)).toBe('');
  });
  it('未回答 → 「未回答」', () => {
    const grading: G10GradingResult = {
      correctQuadrant: 'top-left',
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
    };
    expect(buildG10ResultDetailText(grading)).toBe('未回答');
  });
  it('回答済 → 空文字', () => {
    const grading: G10GradingResult = {
      correctQuadrant: 'top-left',
      userAnswer: 'top-left',
      isCorrect: true,
      unattempted: false,
    };
    expect(buildG10ResultDetailText(grading)).toBe('');
  });
});

describe('formatG10ThresholdLabel', () => {
  it('30 → 「30°」', () => {
    expect(formatG10ThresholdLabel(30)).toBe('30°');
  });
  it('5 → 「5°」', () => {
    expect(formatG10ThresholdLabel(5)).toBe('5°');
  });
  it('90 → 「90°」', () => {
    expect(formatG10ThresholdLabel(90)).toBe('90°');
  });
  it('25.4 → 「25°」（四捨五入）', () => {
    expect(formatG10ThresholdLabel(25.4)).toBe('25°');
  });
  it('27.6 → 「28°」（四捨五入）', () => {
    expect(formatG10ThresholdLabel(27.6)).toBe('28°');
  });
});

describe('computeG10DiffFromBest', () => {
  it('過去ベスト 30 / 今回 25 → improved（- 5）', () => {
    const diff = computeG10DiffFromBest({
      currentThreshold: 25,
      previousBest: 30,
    });
    expect(diff).toBeDefined();
    expect(diff!.direction).toBe('improved');
    expect(diff!.sign).toBe('-');
    expect(diff!.magnitude).toBe('5');
  });

  it('過去ベスト 30 / 今回 30 → flat', () => {
    const diff = computeG10DiffFromBest({
      currentThreshold: 30,
      previousBest: 30,
    });
    expect(diff).toBeDefined();
    expect(diff!.direction).toBe('flat');
  });

  it('過去ベスト 30 / 今回 35 → worsened（+ 5）', () => {
    const diff = computeG10DiffFromBest({
      currentThreshold: 35,
      previousBest: 30,
    });
    expect(diff).toBeDefined();
    expect(diff!.direction).toBe('worsened');
    expect(diff!.sign).toBe('+');
    expect(diff!.magnitude).toBe('5');
  });

  it('previousBest=null → undefined（初回測定）', () => {
    const diff = computeG10DiffFromBest({
      currentThreshold: 30,
      previousBest: null,
    });
    expect(diff).toBeUndefined();
  });

  it('digits=0 で magnitude は整数表示', () => {
    const diff = computeG10DiffFromBest({
      currentThreshold: 25,
      previousBest: 30,
      digits: 0,
    });
    expect(diff!.magnitude).toBe('5');
  });
});
