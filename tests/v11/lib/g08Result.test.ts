/**
 * G-08 結果ヘルパー（screens.md S15-03）の純関数テスト。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG08CorrectAnswerLabel,
  buildG08ResultDetailText,
  buildG08UserAnswerLabel,
  computeG08DiffFromBest,
} from '../../../src/lib/v11/g08Result';
import { G08GradingResult } from '../../../src/lib/v11/g08Trial';

describe('buildG08CorrectAnswerLabel', () => {
  it('cw → 「下のパッチは時計回り」', () => {
    expect(buildG08CorrectAnswerLabel('cw')).toBe('下のパッチは時計回り');
  });
  it('ccw → 「下のパッチは反時計回り」', () => {
    expect(buildG08CorrectAnswerLabel('ccw')).toBe('下のパッチは反時計回り');
  });
});

describe('buildG08UserAnswerLabel', () => {
  it('null（未回答）→ null', () => {
    expect(buildG08UserAnswerLabel(null)).toBeNull();
  });
  it('cw → 「下のパッチは時計回り」', () => {
    expect(buildG08UserAnswerLabel('cw')).toBe('下のパッチは時計回り');
  });
  it('ccw → 「下のパッチは反時計回り」', () => {
    expect(buildG08UserAnswerLabel('ccw')).toBe('下のパッチは反時計回り');
  });
});

describe('buildG08ResultDetailText', () => {
  it('grading=null → 空文字', () => {
    expect(buildG08ResultDetailText(null)).toBe('');
  });
  it('未回答 → 「未回答」', () => {
    const grading: G08GradingResult = {
      correctDirection: 'cw',
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
    };
    expect(buildG08ResultDetailText(grading)).toBe('未回答');
  });
  it('回答済 → 空文字', () => {
    const grading: G08GradingResult = {
      correctDirection: 'cw',
      userAnswer: 'cw',
      isCorrect: true,
      unattempted: false,
    };
    expect(buildG08ResultDetailText(grading)).toBe('');
  });
});

describe('computeG08DiffFromBest', () => {
  it('過去ベスト 5°、今回 4° → improved（- 1）', () => {
    const diff = computeG08DiffFromBest({
      currentThreshold: 4,
      previousBest: 5,
    });
    expect(diff).toBeDefined();
    expect(diff!.direction).toBe('improved');
    expect(diff!.sign).toBe('-');
    expect(diff!.magnitude).toBe('1');
  });

  it('過去ベスト 5°、今回 5° → flat', () => {
    const diff = computeG08DiffFromBest({
      currentThreshold: 5,
      previousBest: 5,
    });
    expect(diff).toBeDefined();
    expect(diff!.direction).toBe('flat');
    expect(diff!.sign).toBe('0');
  });

  it('過去ベスト 5°、今回 6° → worsened（+ 1）', () => {
    const diff = computeG08DiffFromBest({
      currentThreshold: 6,
      previousBest: 5,
    });
    expect(diff).toBeDefined();
    expect(diff!.direction).toBe('worsened');
    expect(diff!.sign).toBe('+');
    expect(diff!.magnitude).toBe('1');
  });

  it('previousBest=null → undefined（初回測定）', () => {
    const diff = computeG08DiffFromBest({
      currentThreshold: 5,
      previousBest: null,
    });
    expect(diff).toBeUndefined();
  });

  it('digits=0 で magnitude は整数表示', () => {
    const diff = computeG08DiffFromBest({
      currentThreshold: 4,
      previousBest: 5,
      digits: 0,
    });
    expect(diff!.magnitude).toBe('1');
    expect(diff!.magnitude).not.toContain('.');
  });
});
