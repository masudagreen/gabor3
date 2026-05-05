/**
 * G-05 結果サマリヘルパーの純関数テスト（screens.md S13-03）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG05CorrectAnswerLabel,
  buildG05UserAnswerLabel,
  buildG05ResultDetailText,
  computeG05DiffFromBest,
} from '../../../src/lib/v11/g05Result';
import { G05GradingResult } from '../../../src/lib/v11/g05Trial';

describe('buildG05CorrectAnswerLabel', () => {
  it('left → 「左が細かい」', () => {
    expect(buildG05CorrectAnswerLabel('left')).toBe('左が細かい');
  });
  it('right → 「右が細かい」', () => {
    expect(buildG05CorrectAnswerLabel('right')).toBe('右が細かい');
  });
});

describe('buildG05UserAnswerLabel', () => {
  it('null → null（呼び出し側で「未回答」処理）', () => {
    expect(buildG05UserAnswerLabel(null)).toBeNull();
  });
  it('left → 「左が細かい」', () => {
    expect(buildG05UserAnswerLabel('left')).toBe('左が細かい');
  });
  it('right → 「右が細かい」', () => {
    expect(buildG05UserAnswerLabel('right')).toBe('右が細かい');
  });
});

describe('buildG05ResultDetailText', () => {
  function makeGrading(unattempted: boolean): G05GradingResult {
    return {
      correctSide: 'left',
      userAnswer: unattempted ? null : 'left',
      isCorrect: !unattempted,
      unattempted,
    };
  }
  it('null → 空文字', () => {
    expect(buildG05ResultDetailText(null)).toBe('');
  });
  it('未回答 → 「未回答」', () => {
    expect(buildG05ResultDetailText(makeGrading(true))).toBe('未回答');
  });
  it('挑戦あり → 空文字（G-05 は 1 回答で詳細不要）', () => {
    expect(buildG05ResultDetailText(makeGrading(false))).toBe('');
  });
});

describe('computeG05DiffFromBest', () => {
  it('previousBest=null → 初回測定で undefined', () => {
    expect(
      computeG05DiffFromBest({ currentThreshold: 1.5, previousBest: null }),
    ).toBeUndefined();
  });

  it('今回 1.4 / 過去ベスト 1.5 → improved（sign="-", "0.1"）', () => {
    const diff = computeG05DiffFromBest({
      currentThreshold: 1.4,
      previousBest: 1.5,
    });
    expect(diff?.sign).toBe('-');
    expect(diff?.direction).toBe('improved');
    expect(diff?.magnitude).toBe('0.1');
  });

  it('今回 1.6 / 過去ベスト 1.5 → worsened（sign="+", "0.1"）', () => {
    const diff = computeG05DiffFromBest({
      currentThreshold: 1.6,
      previousBest: 1.5,
    });
    expect(diff?.sign).toBe('+');
    expect(diff?.direction).toBe('worsened');
    expect(diff?.magnitude).toBe('0.1');
  });

  it('今回 1.5 / 過去ベスト 1.5 → flat（同等）', () => {
    const diff = computeG05DiffFromBest({
      currentThreshold: 1.5,
      previousBest: 1.5,
    });
    expect(diff?.direction).toBe('flat');
  });

  it('step=0.1 のとき差 0.04 は flat（step/2=0.05 以下）', () => {
    const diff = computeG05DiffFromBest({
      currentThreshold: 1.54,
      previousBest: 1.5,
    });
    expect(diff?.direction).toBe('flat');
  });

  it('step=0.1 のとき差 0.06 は worsened（step/2=0.05 を超える）', () => {
    const diff = computeG05DiffFromBest({
      currentThreshold: 1.56,
      previousBest: 1.5,
    });
    expect(diff?.direction).toBe('worsened');
  });

  it('digits=1（デフォルト）で表示桁が小数 1 桁', () => {
    const diff = computeG05DiffFromBest({
      currentThreshold: 1.4,
      previousBest: 1.5,
    });
    // 「0.1」のような 1 桁表示
    expect(diff?.magnitude).toMatch(/^\d+\.\d{1}$/);
  });
});
