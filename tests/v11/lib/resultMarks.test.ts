/**
 * resultMarks 単体テスト — Sprint 20（v1.1.1）。
 *
 * components.md §25「13 ゲームの ResultOverlay marks 生成ロジック」の規範を
 * 13 ヘルパーが満たしていることを検証する。
 *
 *   - 単数選択ゲームで正解 = ユーザー回答 → correctChosen のみ（✕ なし）
 *   - 単数選択ゲームで正解 ≠ ユーザー回答 → correctMissed + wrongChosen
 *   - 単数選択ゲームで未回答（userAnswer=null）→ correctMissed のみ
 *   - 複数選択ゲーム（G-01 / G-07）：True Positive=◯、False Positive=✕、
 *     False Negative=薄 ◯
 */

import {
  buildG01Marks,
  buildG02Marks,
  buildG03Marks,
  buildG07Marks,
  buildG08Marks,
  buildG09Marks,
  buildG10Marks,
  buildG11Marks,
  buildG12Marks,
  buildG13Marks,
  buildHorizontalSideMarks,
  selectedIdsFromGame1Grading,
} from '../../../src/lib/v11/resultMarks';
import { Game1TrialSpec } from '../../../src/lib/game1';

describe('resultMarks: 単数選択ゲーム（G-02 / G-04 etc）', () => {
  it('G-02 偶然正解時：correctChosen のみ（✕ なし）', () => {
    const marks = buildG02Marks({ correctSide: 'right', userAnswer: 'right' });
    expect(marks).toEqual([
      { targetId: 'g02-right', kind: 'correctChosen' },
    ]);
  });

  it('G-02 不正解時：correctMissed + wrongChosen 2 件', () => {
    const marks = buildG02Marks({ correctSide: 'right', userAnswer: 'left' });
    expect(marks).toContainEqual({
      targetId: 'g02-right',
      kind: 'correctMissed',
    });
    expect(marks).toContainEqual({
      targetId: 'g02-left',
      kind: 'wrongChosen',
    });
    expect(marks).toHaveLength(2);
  });

  it('G-02 未回答時：correctMissed 1 件のみ', () => {
    const marks = buildG02Marks({ correctSide: 'left', userAnswer: null });
    expect(marks).toEqual([{ targetId: 'g02-left', kind: 'correctMissed' }]);
  });

  it('G-03 偶然正解時：g03-pos-3 に correctChosen', () => {
    const marks = buildG03Marks({
      correctClockPosition: '3',
      userAnswer: '3',
    });
    expect(marks).toEqual([
      { targetId: 'g03-pos-3', kind: 'correctChosen' },
    ]);
  });

  it('G-03 不正解時：正解クロック位置に correctMissed、誤選択側に wrongChosen', () => {
    const marks = buildG03Marks({
      correctClockPosition: '3',
      userAnswer: '6',
    });
    expect(marks).toContainEqual({
      targetId: 'g03-pos-3',
      kind: 'correctMissed',
    });
    expect(marks).toContainEqual({
      targetId: 'g03-pos-6',
      kind: 'wrongChosen',
    });
  });

  it('G-04 horizontal-2 偶然正解時：correctChosen 1 件', () => {
    const marks = buildHorizontalSideMarks({
      gameId: 'g04',
      correctSide: 'left',
      userAnswer: 'left',
    });
    expect(marks).toEqual([
      { targetId: 'g04-left', kind: 'correctChosen' },
    ]);
  });

  it('G-05 horizontal-2 不正解時：correctMissed + wrongChosen', () => {
    const marks = buildHorizontalSideMarks({
      gameId: 'g05',
      correctSide: 'right',
      userAnswer: 'left',
    });
    expect(marks).toHaveLength(2);
    expect(marks).toContainEqual({
      targetId: 'g05-right',
      kind: 'correctMissed',
    });
    expect(marks).toContainEqual({
      targetId: 'g05-left',
      kind: 'wrongChosen',
    });
  });

  it('G-08（旧 horizontal-2 互換）偶然正解時：correctChosen 1 件', () => {
    const marks = buildG08Marks({
      correctDirection: 'cw',
      userAnswer: 'cw',
    });
    expect(marks).toEqual([{ targetId: 'g08-cw', kind: 'correctChosen' }]);
  });

  it('G-08（旧 horizontal-2 互換）不正解時：correctMissed + wrongChosen 2 件', () => {
    const marks = buildG08Marks({
      correctDirection: 'cw',
      userAnswer: 'ccw',
    });
    expect(marks).toContainEqual({
      targetId: 'g08-cw',
      kind: 'correctMissed',
    });
    expect(marks).toContainEqual({
      targetId: 'g08-ccw',
      kind: 'wrongChosen',
    });
  });

  it('G-08 v1.1.1 side ベース：正解側を選んだとき correctChosen 1 件', () => {
    const marks = buildG08Marks({
      correctSide: 'left',
      userAnswerSide: 'left',
    });
    expect(marks).toEqual([
      { targetId: 'g08-test-left', kind: 'correctChosen' },
    ]);
  });

  it('G-08 v1.1.1 side ベース：不正解側を選んだとき correctMissed + wrongChosen', () => {
    const marks = buildG08Marks({
      correctSide: 'left',
      userAnswerSide: 'right',
    });
    expect(marks).toContainEqual({
      targetId: 'g08-test-left',
      kind: 'correctMissed',
    });
    expect(marks).toContainEqual({
      targetId: 'g08-test-right',
      kind: 'wrongChosen',
    });
  });

  it('G-08 v1.1.1 side ベース：未回答時 correctMissed のみ', () => {
    const marks = buildG08Marks({
      correctSide: 'right',
      userAnswerSide: null,
    });
    expect(marks).toEqual([
      { targetId: 'g08-test-right', kind: 'correctMissed' },
    ]);
  });

  it('G-08 v1.1.1 side ベース：targetId に「g08-test-」プレフィックスが付く', () => {
    const marks = buildG08Marks({
      correctSide: 'left',
      userAnswerSide: 'right',
    });
    for (const m of marks) {
      expect(m.targetId).toMatch(/^g08-test-(left|right)$/);
    }
  });

  it('G-09 不正解時', () => {
    const marks = buildG09Marks({
      correctOrientation: 'vertical',
      userAnswer: 'horizontal',
    });
    expect(marks).toHaveLength(2);
    expect(marks).toContainEqual({
      targetId: 'g09-vertical',
      kind: 'correctMissed',
    });
    expect(marks).toContainEqual({
      targetId: 'g09-horizontal',
      kind: 'wrongChosen',
    });
  });

  it('G-10 4 象限の偶然正解時', () => {
    const marks = buildG10Marks({
      correctQuadrant: 'tl',
      userAnswer: 'tl',
    });
    expect(marks).toEqual([{ targetId: 'g10-tl', kind: 'correctChosen' }]);
  });

  it('G-10 4 象限の不正解時', () => {
    const marks = buildG10Marks({
      correctQuadrant: 'tl',
      userAnswer: 'br',
    });
    expect(marks).toHaveLength(2);
    expect(marks).toContainEqual({
      targetId: 'g10-tl',
      kind: 'correctMissed',
    });
    expect(marks).toContainEqual({
      targetId: 'g10-br',
      kind: 'wrongChosen',
    });
  });

  it('G-12 horizontal-4 の不正解時', () => {
    const marks = buildG12Marks({
      correctOrientation: 'vertical',
      userAnswer: 'tilt-right',
    });
    expect(marks).toHaveLength(2);
    expect(marks).toContainEqual({
      targetId: 'g12-vertical',
      kind: 'correctMissed',
    });
    expect(marks).toContainEqual({
      targetId: 'g12-tilt-right',
      kind: 'wrongChosen',
    });
  });

  it('G-13 数字探しの偶然正解時：正解キーに ◯', () => {
    const marks = buildG13Marks({
      embeddedDigit: 3,
      userAnswer: 3,
    });
    expect(marks).toEqual([{ targetId: 'g13-key-3', kind: 'correctChosen' }]);
  });

  it('G-13 数字探しの不正解時：◯ + ✕ 最大 2 個', () => {
    const marks = buildG13Marks({
      embeddedDigit: 3,
      userAnswer: 9,
    });
    expect(marks).toHaveLength(2);
    expect(marks).toContainEqual({
      targetId: 'g13-key-3',
      kind: 'correctMissed',
    });
    expect(marks).toContainEqual({
      targetId: 'g13-key-9',
      kind: 'wrongChosen',
    });
  });
});

describe('resultMarks: 複数選択ゲーム G-01', () => {
  function buildTrialFixture(): Game1TrialSpec {
    // 3×3 グリッド、変化パッチ = (0,0) と (1,1) と (2,2)
    return {
      paramAngleDeg: 5,
      config: {
        rows: 3,
        cols: 3,
        changingCount: 3,
        baseOrientationsDeg: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
      patches: [
        { id: 'r0c0', isChanging: true, baseOrientationDeg: 0 },
        { id: 'r0c1', isChanging: false, baseOrientationDeg: 0 },
        { id: 'r0c2', isChanging: false, baseOrientationDeg: 0 },
        { id: 'r1c0', isChanging: false, baseOrientationDeg: 0 },
        { id: 'r1c1', isChanging: true, baseOrientationDeg: 0 },
        { id: 'r1c2', isChanging: false, baseOrientationDeg: 0 },
        { id: 'r2c0', isChanging: false, baseOrientationDeg: 0 },
        { id: 'r2c1', isChanging: false, baseOrientationDeg: 0 },
        { id: 'r2c2', isChanging: true, baseOrientationDeg: 0 },
      ],
    } as unknown as Game1TrialSpec;
  }

  it('完全正解：3 個の変化パッチ全部が correctChosen、wrongChosen は無い', () => {
    const trial = buildTrialFixture();
    const marks = buildG01Marks({
      trial,
      selectedIds: ['r0c0', 'r1c1', 'r2c2'],
    });
    expect(marks).toHaveLength(3);
    expect(marks).toContainEqual({
      targetId: 'g01-r0c0',
      kind: 'correctChosen',
    });
    expect(marks).toContainEqual({
      targetId: 'g01-r1c1',
      kind: 'correctChosen',
    });
    expect(marks).toContainEqual({
      targetId: 'g01-r2c2',
      kind: 'correctChosen',
    });
  });

  it('部分正解：True Positive=◯、False Positive=✕、False Negative=薄 ◯', () => {
    const trial = buildTrialFixture();
    const marks = buildG01Marks({
      trial,
      selectedIds: ['r0c0', 'r0c1'], // 1 個正解 + 1 個誤選択 + 2 個取りこぼし
    });
    expect(marks).toContainEqual({
      targetId: 'g01-r0c0',
      kind: 'correctChosen',
    });
    expect(marks).toContainEqual({
      targetId: 'g01-r0c1',
      kind: 'wrongChosen',
    });
    expect(marks).toContainEqual({
      targetId: 'g01-r1c1',
      kind: 'correctMissed',
    });
    expect(marks).toContainEqual({
      targetId: 'g01-r2c2',
      kind: 'correctMissed',
    });
  });

  it('未回答時：3 個の変化パッチ全部が correctMissed', () => {
    const trial = buildTrialFixture();
    const marks = buildG01Marks({ trial, selectedIds: [] });
    expect(marks).toHaveLength(3);
    for (const m of marks) {
      expect(m.kind).toBe('correctMissed');
    }
  });

  it('selectedIdsFromGame1Grading: correctIds + incorrectIds の連結', () => {
    const ids = selectedIdsFromGame1Grading({
      correctIds: ['r0c0', 'r1c1'],
      incorrectIds: ['r0c1'],
      // Game1GradingResult のうちテスト目的で使うフィールドのみ
    } as unknown as Parameters<typeof selectedIdsFromGame1Grading>[0]);
    expect(ids).toEqual(['r0c0', 'r1c1', 'r0c1']);
  });
});

describe('resultMarks: 複数選択ゲーム G-07', () => {
  it('部分正解：True Positive=◯、False Positive=✕、False Negative=薄 ◯', () => {
    const grading = {
      correctIds: ['r0c0', 'r1c1', 'r2c2'],
      userSelectedIds: ['r0c0', 'r0c1'],
      truePositiveIds: ['r0c0'],
      falsePositiveIds: ['r0c1'],
      falseNegativeIds: ['r1c1', 'r2c2'],
      isCorrect: false,
      unattempted: false,
    };
    const marks = buildG07Marks({
      grading: grading as unknown as Parameters<
        typeof buildG07Marks
      >[0]['grading'],
    });
    expect(marks).toContainEqual({
      targetId: 'g07-r0c0',
      kind: 'correctChosen',
    });
    expect(marks).toContainEqual({
      targetId: 'g07-r0c1',
      kind: 'wrongChosen',
    });
    expect(marks).toContainEqual({
      targetId: 'g07-r1c1',
      kind: 'correctMissed',
    });
    expect(marks).toContainEqual({
      targetId: 'g07-r2c2',
      kind: 'correctMissed',
    });
  });

  it('完全正解：3 個全部 correctChosen、✕ や 薄 ◯ なし', () => {
    const grading = {
      correctIds: ['r0c0', 'r1c1', 'r2c2'],
      userSelectedIds: ['r0c0', 'r1c1', 'r2c2'],
      truePositiveIds: ['r0c0', 'r1c1', 'r2c2'],
      falsePositiveIds: [],
      falseNegativeIds: [],
      isCorrect: true,
      unattempted: false,
    };
    const marks = buildG07Marks({
      grading: grading as unknown as Parameters<
        typeof buildG07Marks
      >[0]['grading'],
    });
    expect(marks).toHaveLength(3);
    for (const m of marks) {
      expect(m.kind).toBe('correctChosen');
    }
  });
});

describe('Sprint 21: G-11 v1.1.2 直接選択化 marks（buildG11Marks）', () => {
  it('正解時：g11-test-{correctSide} に correctChosen のみ（偶然正解、✕ なし）', () => {
    const marks = buildG11Marks({
      correctSide: 'left',
      userAnswerSide: 'left',
    });
    expect(marks).toEqual([
      { targetId: 'g11-test-left', kind: 'correctChosen' },
    ]);
  });

  it('不正解時：correctSide に correctMissed + 誤選択側に wrongChosen', () => {
    const marks = buildG11Marks({
      correctSide: 'right',
      userAnswerSide: 'left',
    });
    expect(marks).toHaveLength(2);
    expect(marks).toContainEqual({
      targetId: 'g11-test-right',
      kind: 'correctMissed',
    });
    expect(marks).toContainEqual({
      targetId: 'g11-test-left',
      kind: 'wrongChosen',
    });
  });

  it('未回答時：correctSide に correctMissed のみ（✕ なし）', () => {
    const marks = buildG11Marks({
      correctSide: 'left',
      userAnswerSide: null,
    });
    expect(marks).toEqual([
      { targetId: 'g11-test-left', kind: 'correctMissed' },
    ]);
  });
});
