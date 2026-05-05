/**
 * G-11 結果ヘルパー（screens.md S16-06）の純関数テスト。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG11CorrectAnswerLabel,
  buildG11ResultDetailText,
  buildG11UserAnswerLabel,
  computeG11DiffFromBest,
  formatG11ThresholdLabel,
} from '../../../src/lib/v11/g11Result';
import { G11GradingResult } from '../../../src/lib/v11/g11Trial';

describe('buildG11CorrectAnswerLabel', () => {
  it('left → 「下のパッチは左にずれている」', () => {
    expect(buildG11CorrectAnswerLabel('left')).toBe('下のパッチは左にずれている');
  });
  it('right → 「下のパッチは右にずれている」', () => {
    expect(buildG11CorrectAnswerLabel('right')).toBe(
      '下のパッチは右にずれている',
    );
  });
});

describe('buildG11UserAnswerLabel', () => {
  it('null → null（未回答）', () => {
    expect(buildG11UserAnswerLabel(null)).toBeNull();
  });
  it('left → 「下のパッチは左にずれている」', () => {
    expect(buildG11UserAnswerLabel('left')).toBe('下のパッチは左にずれている');
  });
  it('right → 「下のパッチは右にずれている」', () => {
    expect(buildG11UserAnswerLabel('right')).toBe('下のパッチは右にずれている');
  });
});

describe('buildG11ResultDetailText', () => {
  it('grading=null → 空文字', () => {
    expect(buildG11ResultDetailText(null)).toBe('');
  });
  it('未回答 → 「未回答」', () => {
    const grading: G11GradingResult = {
      correctDirection: 'left',
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
    };
    expect(buildG11ResultDetailText(grading)).toBe('未回答');
  });
  it('回答済 → 空文字', () => {
    const grading: G11GradingResult = {
      correctDirection: 'left',
      userAnswer: 'left',
      isCorrect: true,
      unattempted: false,
    };
    expect(buildG11ResultDetailText(grading)).toBe('');
  });
});

describe('formatG11ThresholdLabel', () => {
  it('2.0 → 「2.0\'」', () => {
    expect(formatG11ThresholdLabel(2.0)).toBe("2.0'");
  });
  it('0.5 → 「0.5\'」', () => {
    expect(formatG11ThresholdLabel(0.5)).toBe("0.5'");
  });
  it('5.0 → 「5.0\'」', () => {
    expect(formatG11ThresholdLabel(5.0)).toBe("5.0'");
  });
  it('1.234 → 「1.2\'」（小数 1 桁丸め）', () => {
    expect(formatG11ThresholdLabel(1.234)).toBe("1.2'");
  });
  it('1.96 → 「2.0\'」（四捨五入）', () => {
    expect(formatG11ThresholdLabel(1.96)).toBe("2.0'");
  });
});

describe('computeG11DiffFromBest', () => {
  it('過去ベスト 2.0 / 今回 1.8 → improved（- 0.2）', () => {
    const diff = computeG11DiffFromBest({
      currentThreshold: 1.8,
      previousBest: 2.0,
    });
    expect(diff).toBeDefined();
    expect(diff!.direction).toBe('improved');
    expect(diff!.sign).toBe('-');
    expect(diff!.magnitude).toBe('0.2');
  });

  it('過去ベスト 2.0 / 今回 2.0 → flat', () => {
    const diff = computeG11DiffFromBest({
      currentThreshold: 2.0,
      previousBest: 2.0,
    });
    expect(diff).toBeDefined();
    expect(diff!.direction).toBe('flat');
  });

  it('過去ベスト 2.0 / 今回 2.2 → worsened（+ 0.2）', () => {
    const diff = computeG11DiffFromBest({
      currentThreshold: 2.2,
      previousBest: 2.0,
    });
    expect(diff).toBeDefined();
    expect(diff!.direction).toBe('worsened');
    expect(diff!.sign).toBe('+');
    expect(diff!.magnitude).toBe('0.2');
  });

  it('previousBest=null → undefined（初回測定）', () => {
    const diff = computeG11DiffFromBest({
      currentThreshold: 2.0,
      previousBest: null,
    });
    expect(diff).toBeUndefined();
  });

  it('digits=1 で magnitude は小数 1 桁表示', () => {
    const diff = computeG11DiffFromBest({
      currentThreshold: 1.8,
      previousBest: 2.0,
      digits: 1,
    });
    expect(diff!.magnitude).toBe('0.2');
  });
});
