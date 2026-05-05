/**
 * courseGameAdapter — 各ゲームの TrialResult 抽出ロジック。
 */
import { extractCourseGameOutcome } from '../../../src/lib/v11/courseGameAdapter';

describe('courseGameAdapter: extractCourseGameOutcome', () => {
  it('G-01：thresholdDeg + result.unattempted', () => {
    const result = {
      thresholdDeg: 5.5,
      isCorrectForStaircase: true,
      unattempted: false,
    };
    expect(extractCourseGameOutcome('G-01', result)).toEqual({
      threshold: 5.5,
      isCorrect: true,
      unattempted: false,
    });
  });

  it('G-02：thresholdDeg + grading.unattempted=false', () => {
    const result = {
      thresholdDeg: 4.2,
      isCorrectForStaircase: true,
      grading: { unattempted: false },
    };
    expect(extractCourseGameOutcome('G-02', result)).toEqual({
      threshold: 4.2,
      isCorrect: true,
      unattempted: false,
    });
  });

  it('G-04：thresholdContrast', () => {
    const result = {
      thresholdContrast: 0.12,
      isCorrectForStaircase: false,
      grading: { unattempted: false },
    };
    expect(extractCourseGameOutcome('G-04', result)).toEqual({
      threshold: 0.12,
      isCorrect: false,
      unattempted: false,
    });
  });

  it('G-05：thresholdRatio', () => {
    const result = {
      thresholdRatio: 1.4,
      isCorrectForStaircase: true,
      grading: { unattempted: false },
    };
    expect(extractCourseGameOutcome('G-05', result).threshold).toBe(1.4);
  });

  it('G-11：thresholdArcmin', () => {
    const result = {
      thresholdArcmin: 1.8,
      isCorrectForStaircase: true,
      grading: { unattempted: false },
    };
    expect(extractCourseGameOutcome('G-11', result).threshold).toBe(1.8);
  });

  it('G-12：thresholdSpacing', () => {
    const result = {
      thresholdSpacing: 2.4,
      isCorrectForStaircase: true,
      grading: { unattempted: false },
    };
    expect(extractCourseGameOutcome('G-12', result).threshold).toBe(2.4);
  });

  it('G-13：thresholdContrast', () => {
    const result = {
      thresholdContrast: 0.08,
      isCorrectForStaircase: true,
      grading: { unattempted: false },
    };
    expect(extractCourseGameOutcome('G-13', result).threshold).toBe(0.08);
  });

  it('unattempted の場合：isCorrect は false（強制）', () => {
    const result = {
      thresholdDeg: 5.0,
      isCorrectForStaircase: true, // unattempted でも staircase が true を入れる場合
      unattempted: true,
    };
    expect(extractCourseGameOutcome('G-01', result)).toEqual({
      threshold: 5.0,
      isCorrect: false,
      unattempted: true,
    });
  });

  it('threshold フィールドが無い場合：0 にフォールバック（防御）', () => {
    const result = { isCorrectForStaircase: true, grading: { unattempted: false } };
    expect(extractCourseGameOutcome('G-04', result).threshold).toBe(0);
  });
});
