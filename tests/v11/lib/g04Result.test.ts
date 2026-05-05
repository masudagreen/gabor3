/**
 * G-04 結果サマリヘルパーの純関数テスト（screens.md S12-03）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG04CorrectAnswerLabel,
  buildG04UserAnswerLabel,
  buildG04ResultDetailText,
  computeG04DiffFromBest,
} from '../../../src/lib/v11/g04Result';
import { G04GradingResult } from '../../../src/lib/v11/g04Trial';

describe('buildG04CorrectAnswerLabel', () => {
  it('left → 「左が濃い」', () => {
    expect(buildG04CorrectAnswerLabel('left')).toBe('左が濃い');
  });
  it('right → 「右が濃い」', () => {
    expect(buildG04CorrectAnswerLabel('right')).toBe('右が濃い');
  });
});

describe('buildG04UserAnswerLabel', () => {
  it('null → null（呼び出し側で「未回答」処理）', () => {
    expect(buildG04UserAnswerLabel(null)).toBeNull();
  });
  it('left → 「左が濃い」', () => {
    expect(buildG04UserAnswerLabel('left')).toBe('左が濃い');
  });
  it('right → 「右が濃い」', () => {
    expect(buildG04UserAnswerLabel('right')).toBe('右が濃い');
  });
});

describe('buildG04ResultDetailText', () => {
  function makeGrading(unattempted: boolean): G04GradingResult {
    return {
      correctSide: 'left',
      userAnswer: unattempted ? null : 'left',
      isCorrect: !unattempted,
      unattempted,
    };
  }
  it('null → 空文字', () => {
    expect(buildG04ResultDetailText(null)).toBe('');
  });
  it('未回答 → 「未回答」', () => {
    expect(buildG04ResultDetailText(makeGrading(true))).toBe('未回答');
  });
  it('挑戦あり → 空文字（G-04 は 1 回答で詳細不要）', () => {
    expect(buildG04ResultDetailText(makeGrading(false))).toBe('');
  });
});

describe('computeG04DiffFromBest', () => {
  it('previousBest=null → 初回測定で undefined', () => {
    expect(
      computeG04DiffFromBest({ currentThreshold: 0.15, previousBest: null }),
    ).toBeUndefined();
  });

  it('今回 0.13 / 過去ベスト 0.15 → improved（sign="-", "0.02"）', () => {
    const diff = computeG04DiffFromBest({
      currentThreshold: 0.13,
      previousBest: 0.15,
    });
    expect(diff?.sign).toBe('-');
    expect(diff?.direction).toBe('improved');
    expect(diff?.magnitude).toBe('0.02');
  });

  it('今回 0.18 / 過去ベスト 0.15 → worsened（sign="+", "0.03"）', () => {
    const diff = computeG04DiffFromBest({
      currentThreshold: 0.18,
      previousBest: 0.15,
    });
    expect(diff?.sign).toBe('+');
    expect(diff?.direction).toBe('worsened');
    expect(diff?.magnitude).toBe('0.03');
  });

  it('今回 0.15 / 過去ベスト 0.15 → flat（同等）', () => {
    const diff = computeG04DiffFromBest({
      currentThreshold: 0.15,
      previousBest: 0.15,
    });
    expect(diff?.direction).toBe('flat');
  });

  it('step=0.02 のとき差 0.005 は flat（step/2=0.01 以下）', () => {
    const diff = computeG04DiffFromBest({
      currentThreshold: 0.155,
      previousBest: 0.15,
    });
    expect(diff?.direction).toBe('flat');
  });

  it('step=0.02 のとき差 0.015 は worsened（step/2=0.01 を超える）', () => {
    const diff = computeG04DiffFromBest({
      currentThreshold: 0.165,
      previousBest: 0.15,
    });
    expect(diff?.direction).toBe('worsened');
  });

  it('digits=2（デフォルト）で表示桁が小数 2 桁', () => {
    const diff = computeG04DiffFromBest({
      currentThreshold: 0.13,
      previousBest: 0.15,
    });
    // 「0.02」のような 2 桁表示
    expect(diff?.magnitude).toMatch(/^\d+\.\d{2}$/);
  });
});
