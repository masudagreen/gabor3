/**
 * G-09 結果ヘルパー（screens.md S15-06）の純関数テスト。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG09CorrectAnswerLabel,
  buildG09ResultDetailText,
  buildG09UserAnswerLabel,
  computeG09DiffFromBest,
  formatG09CombinedThresholdLabel,
  formatG09ContrastLabel,
  formatG09SpacingLabel,
} from '../../../src/lib/v11/g09Result';
import { G09GradingResult } from '../../../src/lib/v11/g09Trial';

describe('buildG09CorrectAnswerLabel', () => {
  it('vertical → 「中央は縦縞」', () => {
    expect(buildG09CorrectAnswerLabel('vertical')).toBe('中央は縦縞');
  });
  it('horizontal → 「中央は横縞」', () => {
    expect(buildG09CorrectAnswerLabel('horizontal')).toBe('中央は横縞');
  });
});

describe('buildG09UserAnswerLabel', () => {
  it('null（未回答）→ null', () => {
    expect(buildG09UserAnswerLabel(null)).toBeNull();
  });
  it('vertical → 「中央は縦縞」', () => {
    expect(buildG09UserAnswerLabel('vertical')).toBe('中央は縦縞');
  });
  it('horizontal → 「中央は横縞」', () => {
    expect(buildG09UserAnswerLabel('horizontal')).toBe('中央は横縞');
  });
});

describe('buildG09ResultDetailText', () => {
  it('grading=null → 空文字', () => {
    expect(buildG09ResultDetailText(null)).toBe('');
  });
  it('未回答 → 「未回答」', () => {
    const grading: G09GradingResult = {
      correctOrientation: 'vertical',
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
    };
    expect(buildG09ResultDetailText(grading)).toBe('未回答');
  });
  it('回答済 → 空文字', () => {
    const grading: G09GradingResult = {
      correctOrientation: 'vertical',
      userAnswer: 'vertical',
      isCorrect: true,
      unattempted: false,
    };
    expect(buildG09ResultDetailText(grading)).toBe('');
  });
});

describe('formatG09ContrastLabel / formatG09SpacingLabel / formatG09CombinedThresholdLabel', () => {
  it('contrast 0.10 → 「c=0.10」', () => {
    expect(formatG09ContrastLabel(0.1)).toBe('c=0.10');
  });
  it('contrast 0.05 → 「c=0.05」', () => {
    expect(formatG09ContrastLabel(0.05)).toBe('c=0.05');
  });
  it('contrast 0.20 → 「c=0.20」', () => {
    expect(formatG09ContrastLabel(0.2)).toBe('c=0.20');
  });

  it('spacing 3.0 → 「d=3.0λ」', () => {
    expect(formatG09SpacingLabel(3.0)).toBe('d=3.0λ');
  });
  it('spacing 1.5 → 「d=1.5λ」', () => {
    expect(formatG09SpacingLabel(1.5)).toBe('d=1.5λ');
  });
  it('spacing 5.0 → 「d=5.0λ」', () => {
    expect(formatG09SpacingLabel(5.0)).toBe('d=5.0λ');
  });

  it('合成：contrast 0.10 → 「c=0.10\\nd=3.0λ」（改行区切り）', () => {
    expect(formatG09CombinedThresholdLabel(0.1)).toBe('c=0.10\nd=3.0λ');
  });

  it('合成：contrast 0.05 → 「c=0.05\\nd=1.5λ」', () => {
    expect(formatG09CombinedThresholdLabel(0.05)).toBe('c=0.05\nd=1.5λ');
  });

  it('合成：contrast 0.20 → 「c=0.20\\nd=5.0λ」', () => {
    expect(formatG09CombinedThresholdLabel(0.2)).toBe('c=0.20\nd=5.0λ');
  });
});

describe('computeG09DiffFromBest', () => {
  it('過去ベスト 0.10、今回 0.08 → improved（- 0.02）', () => {
    const diff = computeG09DiffFromBest({
      currentThreshold: 0.08,
      previousBest: 0.1,
    });
    expect(diff).toBeDefined();
    expect(diff!.direction).toBe('improved');
    expect(diff!.sign).toBe('-');
    expect(diff!.magnitude).toBe('0.02');
  });

  it('過去ベスト 0.10、今回 0.10 → flat', () => {
    const diff = computeG09DiffFromBest({
      currentThreshold: 0.1,
      previousBest: 0.1,
    });
    expect(diff).toBeDefined();
    expect(diff!.direction).toBe('flat');
  });

  it('過去ベスト 0.10、今回 0.12 → worsened（+ 0.02）', () => {
    const diff = computeG09DiffFromBest({
      currentThreshold: 0.12,
      previousBest: 0.1,
    });
    expect(diff).toBeDefined();
    expect(diff!.direction).toBe('worsened');
    expect(diff!.sign).toBe('+');
    expect(diff!.magnitude).toBe('0.02');
  });

  it('previousBest=null → undefined（初回測定）', () => {
    const diff = computeG09DiffFromBest({
      currentThreshold: 0.1,
      previousBest: null,
    });
    expect(diff).toBeUndefined();
  });

  it('digits=2 で magnitude は小数 2 桁表示', () => {
    const diff = computeG09DiffFromBest({
      currentThreshold: 0.08,
      previousBest: 0.1,
      digits: 2,
    });
    expect(diff!.magnitude).toBe('0.02');
  });
});
