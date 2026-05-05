/**
 * G-03 結果ヘルパーの純関数テスト（screens.md S11-03）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG03CorrectAnswerLabel,
  buildG03ResultDetailText,
  buildG03UserAnswerLabel,
  computeG03DiffFromBest,
} from '../../../src/lib/v11/g03Result';
import { G03GradingResult } from '../../../src/lib/v11/g03Trial';

describe('buildG03CorrectAnswerLabel', () => {
  it('「3 時の方向」など日本語表記を返す', () => {
    expect(buildG03CorrectAnswerLabel('3')).toBe('3 時の方向');
    expect(buildG03CorrectAnswerLabel('1.5')).toBe('1 時 30 分の方向');
    expect(buildG03CorrectAnswerLabel('10.5')).toBe('10 時 30 分の方向');
  });
});

describe('buildG03UserAnswerLabel', () => {
  it('null は null を返す（呼び出し側で「未回答」処理）', () => {
    expect(buildG03UserAnswerLabel(null)).toBeNull();
  });

  it('回答ありなら日本語表記', () => {
    expect(buildG03UserAnswerLabel('6')).toBe('6 時の方向');
    expect(buildG03UserAnswerLabel('4.5')).toBe('4 時 30 分の方向');
  });
});

describe('buildG03ResultDetailText', () => {
  it('grading=null → 空文字', () => {
    expect(buildG03ResultDetailText(null)).toBe('');
  });

  it('未回答 → 「未回答」', () => {
    const grading: G03GradingResult = {
      correctClockPosition: '3',
      correctPositionIndex: 2,
      userAnswer: null,
      isCorrect: false,
      unattempted: true,
    };
    expect(buildG03ResultDetailText(grading)).toBe('未回答');
  });

  it('回答あり → 空文字（追加情報なし）', () => {
    const grading: G03GradingResult = {
      correctClockPosition: '3',
      correctPositionIndex: 2,
      userAnswer: '6',
      isCorrect: false,
      unattempted: false,
    };
    expect(buildG03ResultDetailText(grading)).toBe('');
  });
});

describe('computeG03DiffFromBest', () => {
  it('previousBest=null → undefined（初回測定）', () => {
    const diff = computeG03DiffFromBest({
      currentThreshold: 25,
      previousBest: null,
    });
    expect(diff).toBeUndefined();
  });

  it('改善（小さくなった）→ direction=improved, sign="-"', () => {
    const diff = computeG03DiffFromBest({
      currentThreshold: 22,
      previousBest: 25,
    });
    expect(diff?.direction).toBe('improved');
    expect(diff?.sign).toBe('-');
    expect(diff?.magnitude).toBe('3.0');
  });

  it('悪化 → direction=worsened, sign="+"', () => {
    const diff = computeG03DiffFromBest({
      currentThreshold: 28,
      previousBest: 25,
    });
    expect(diff?.direction).toBe('worsened');
    expect(diff?.sign).toBe('+');
    expect(diff?.magnitude).toBe('3.0');
  });

  it('step=2 のため、差 0.5 程度（< step/2=1）は flat', () => {
    const diff = computeG03DiffFromBest({
      currentThreshold: 25.5,
      previousBest: 25,
    });
    expect(diff?.direction).toBe('flat');
    expect(diff?.sign).toBe('0');
  });
});
