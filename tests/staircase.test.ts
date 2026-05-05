/**
 * Staircase 3-down/1-up の動作確認（spec.md §6.3 / Sprint 1 受け入れ §9）。
 */

import {
  STAIRCASE_CONFIGS,
  applyTrialResult,
  createStaircase,
  estimateThreshold,
  resetStaircase,
  stepSizeFor,
} from '../src/lib/staircase';

const FIXED_NOW = () => '2026-04-29T00:00:00.000Z';

describe('staircase: 3-down/1-up', () => {
  it('初期化：game2 の初期パラメータは 6°、初期 step は 4', () => {
    const s = createStaircase('game2', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(6);
    expect(s.currentStep).toBe(4);
    expect(s.reversalCount).toBe(0);
    expect(s.consecutiveCorrect).toBe(0);
    expect(s.lastDirection).toBe('none');
  });

  it('3 連続正解で param が 1 step 下がる（down）', () => {
    let s = createStaircase('game2', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(6); // 1 連続正解、まだ下がらない
    expect(s.consecutiveCorrect).toBe(1);

    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(6); // 2 連続正解
    expect(s.consecutiveCorrect).toBe(2);

    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(2); // 6 - 4 = 2
    expect(s.lastDirection).toBe('down');
    expect(s.consecutiveCorrect).toBe(0);
  });

  it('1 誤答で param が 1 step 上がる（up）', () => {
    let s = createStaircase('game2', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'incorrect', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(10); // 6 + 4 = 10
    expect(s.lastDirection).toBe('up');
    expect(s.consecutiveCorrect).toBe(0);
  });

  it('未回答（noResponse）も up 扱い', () => {
    let s = createStaircase('game2', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'noResponse', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(10);
    expect(s.lastDirection).toBe('up');
  });

  it('reversal カウント：down → up または up → down で +1', () => {
    let s = createStaircase('game2', undefined, FIXED_NOW);
    // 3 連続正解 → down に切替（down 方向初確立）
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    expect(s.lastDirection).toBe('down');
    expect(s.reversalCount).toBe(0); // 最初の方向確立は reversal にならない

    // 1 誤答 → up に切替（reversal 1）
    s = applyTrialResult(s, 'incorrect', undefined, FIXED_NOW);
    expect(s.lastDirection).toBe('up');
    expect(s.reversalCount).toBe(1);

    // 3 連続正解 → down に再切替（reversal 2、step は 1 reversal 後 = 2）
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    expect(s.lastDirection).toBe('down');
    expect(s.reversalCount).toBe(2);
    expect(s.currentStep).toBe(2); // 半減
  });

  it('step size：reversal 0=4、1〜2=2、3 以降=1', () => {
    expect(stepSizeFor(0, 4)).toBe(4);
    expect(stepSizeFor(1, 4)).toBe(2);
    expect(stepSizeFor(2, 4)).toBe(2);
    expect(stepSizeFor(3, 4)).toBe(1);
    expect(stepSizeFor(10, 4)).toBe(1);
  });

  it('クランプ：param は min/max を超えない', () => {
    let s = createStaircase('game2', undefined, FIXED_NOW);
    // 上限 10 で頭打ち
    s = applyTrialResult(s, 'incorrect', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(10);
    s = applyTrialResult(s, 'incorrect', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(10); // クランプ
    // up→up は方向変わらないので reversal は増えない
    expect(s.reversalCount).toBe(0);
  });

  it('リセット：初期値に戻る', () => {
    let s = createStaircase('game2', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    expect(s.currentParam).not.toBe(6);

    const reset = resetStaircase(s, undefined, FIXED_NOW);
    expect(reset.currentParam).toBe(6);
    expect(reset.reversalCount).toBe(0);
    expect(reset.consecutiveCorrect).toBe(0);
  });

  it('閾値推定：reversal 6 個未満なら最終値、6 個以上なら平均', () => {
    // 履歴が空なら fallback
    expect(estimateThreshold([], 5)).toBe(5);

    // 1 試行のみ → その値
    expect(
      estimateThreshold([{ paramValue: 6, outcome: 'correct' }], 0),
    ).toBe(6);

    // reversal が 6 以上発生する人工履歴
    // 交互に「3 連正解」「1 誤答」を繰り返す → reversal 多数
    const history: Array<{ paramValue: number; outcome: 'correct' | 'incorrect' }> = [];
    let p = 6;
    for (let i = 0; i < 10; i += 1) {
      history.push({ paramValue: p, outcome: 'correct' });
      history.push({ paramValue: p, outcome: 'correct' });
      history.push({ paramValue: p, outcome: 'correct' }); // 3 連 → down
      history.push({ paramValue: p - 1, outcome: 'incorrect' }); // → up
      p = p; // 値は単純化のため固定（reversal は paramValue の値で平均される）
    }
    const t = estimateThreshold(history, 0);
    expect(t).toBeGreaterThan(0);
    expect(Number.isFinite(t)).toBe(true);
  });

  it('Game 1 / Game 3 の初期値も spec 通り', () => {
    expect(STAIRCASE_CONFIGS.game1.initialParam).toBe(5);
    expect(STAIRCASE_CONFIGS.game3.initialParam).toBe(30);
    expect(STAIRCASE_CONFIGS.game3.minParam).toBe(5);
    expect(STAIRCASE_CONFIGS.game3.maxParam).toBe(45);
  });

  it('game1 / game2 の staircase は独立に進行する（spec.md A-4）', () => {
    let g1 = createStaircase('game1', undefined, FIXED_NOW);
    let g2 = createStaircase('game2', undefined, FIXED_NOW);

    // game1 だけに 1 誤答（up）
    g1 = applyTrialResult(g1, 'incorrect', undefined, FIXED_NOW);
    // game2 は変化していない
    expect(g2.currentParam).toBe(6);
    expect(g1.currentParam).toBe(6); // 5 + 1 = 6（game1 step=1）
    expect(g1.lastDirection).toBe('up');
    expect(g2.lastDirection).toBe('none');

    // game2 だけに 3 連正解（down）
    g2 = applyTrialResult(g2, 'correct', undefined, FIXED_NOW);
    g2 = applyTrialResult(g2, 'correct', undefined, FIXED_NOW);
    g2 = applyTrialResult(g2, 'correct', undefined, FIXED_NOW);
    expect(g2.currentParam).toBe(2); // 6 - 4
    expect(g1.currentParam).toBe(6); // 影響なし
  });

  it('game1：Game 1 用 step=1 / 3 連正解で param が 1 下がる', () => {
    let s = createStaircase('game1', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(5);
    expect(s.currentStep).toBe(1);

    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(4); // 5 - 1
    expect(s.lastDirection).toBe('down');
  });

  it('game1：noResponse（未挑戦）も up（spec.md §7.1）', () => {
    let s = createStaircase('game1', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'noResponse', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(6); // 5 + 1
    expect(s.lastDirection).toBe('up');
  });

  it('game1 / game2 / game3 の staircase は 3 ゲーム独立に動く（spec.md A-4 / Sprint 3 受け入れ）', () => {
    let g1 = createStaircase('game1', undefined, FIXED_NOW);
    let g2 = createStaircase('game2', undefined, FIXED_NOW);
    let g3 = createStaircase('game3', undefined, FIXED_NOW);

    // game3 のみ 1 誤答（up：30 + 4 = 34）
    g3 = applyTrialResult(g3, 'incorrect', undefined, FIXED_NOW);
    expect(g3.currentParam).toBe(34);
    expect(g3.lastDirection).toBe('up');
    // game1 / game2 は影響なし
    expect(g1.currentParam).toBe(5);
    expect(g2.currentParam).toBe(6);
    expect(g1.lastDirection).toBe('none');
    expect(g2.lastDirection).toBe('none');

    // game1 のみ 1 誤答
    g1 = applyTrialResult(g1, 'incorrect', undefined, FIXED_NOW);
    expect(g1.currentParam).toBe(6); // 5 + 1
    // game2 / game3 影響なし
    expect(g2.currentParam).toBe(6);
    expect(g3.currentParam).toBe(34);

    // game2 のみ 3 連正解（down：6 - 4 = 2）
    g2 = applyTrialResult(g2, 'correct', undefined, FIXED_NOW);
    g2 = applyTrialResult(g2, 'correct', undefined, FIXED_NOW);
    g2 = applyTrialResult(g2, 'correct', undefined, FIXED_NOW);
    expect(g2.currentParam).toBe(2);
    expect(g1.currentParam).toBe(6);
    expect(g3.currentParam).toBe(34);
  });

  it('game3：3 連続正解で param が 1 step 下がる（30 - 4 = 26）', () => {
    let s = createStaircase('game3', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(30);
    expect(s.currentStep).toBe(4);

    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(26);
    expect(s.lastDirection).toBe('down');
  });

  it('game3：min/max クランプ（5°〜45°）', () => {
    let s = createStaircase('game3', undefined, FIXED_NOW);
    // 上方向に 5 回連続誤答 → 30 → 34 → 38 → 42 → 45（クランプ） → 45（変化なし、reversal なし）
    s = applyTrialResult(s, 'incorrect', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'incorrect', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'incorrect', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'incorrect', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(45);
    s = applyTrialResult(s, 'incorrect', undefined, FIXED_NOW);
    expect(s.currentParam).toBe(45); // クランプ
  });
});
