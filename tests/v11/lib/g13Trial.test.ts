/**
 * G-13 trial 生成 / 採点 / コントラスト → alpha 換算 / レイアウトの純関数テスト
 * （spec-v11.md §7.13）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG13Trial,
  computeG13StimulusLayout,
  contrastToDigitAlpha,
  createNoiseRng,
  digitToJaLabel,
  G13_ALL_DIGITS,
  GAME13_V11,
  gradeG13,
  pickRandomDigit,
  userAnswerDigitToLabel,
} from '../../../src/lib/v11/g13Trial';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';

describe('g13Trial: spec', () => {
  it('GAME13_V11.totalDurationMs は 60_000（OPT-11 / OPT-12）', () => {
    expect(GAME13_V11.totalDurationMs).toBe(60_000);
  });

  it('GAME13_V11.correctRevealMs は 1500ms（screens.md S17-06）', () => {
    expect(GAME13_V11.correctRevealMs).toBe(1500);
  });

  it('G13_ALL_DIGITS は 0〜9 の 10 個', () => {
    expect(G13_ALL_DIGITS).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('gameRegistry G-13 の paramRange は { min:0.02, max:0.15, initial:0.05, step:0.01 }（v1.1.4 難化）', () => {
    const def = GAME_REGISTRY.find((g) => g.gameId === 'G-13');
    expect(def).toBeDefined();
    expect(def?.paramRange.min).toBeCloseTo(0.02, 5);
    expect(def?.paramRange.max).toBeCloseTo(0.15, 5);
    expect(def?.paramRange.initial).toBeCloseTo(0.05, 5);
    expect(def?.paramRange.step).toBeCloseTo(0.01, 5);
  });
});

describe('digitToJaLabel', () => {
  it.each([
    [0, '0'],
    [3, '3'],
    [9, '9'],
  ] as const)('%i → 「%s」', (digit, label) => {
    expect(digitToJaLabel(digit)).toBe(label);
  });
});

describe('userAnswerDigitToLabel', () => {
  it('null → null', () => {
    expect(userAnswerDigitToLabel(null)).toBeNull();
  });
  it('5 → 「5」', () => {
    expect(userAnswerDigitToLabel(5)).toBe('5');
  });
  it('0 → 「0」', () => {
    expect(userAnswerDigitToLabel(0)).toBe('0');
  });
});

describe('pickRandomDigit', () => {
  it('rng=0.0 → 0', () => {
    expect(pickRandomDigit(() => 0)).toBe(0);
  });
  it('rng=0.05 → 0（idx=0）', () => {
    expect(pickRandomDigit(() => 0.05)).toBe(0);
  });
  it('rng=0.15 → 1（idx=1）', () => {
    expect(pickRandomDigit(() => 0.15)).toBe(1);
  });
  it('rng=0.5 → 5', () => {
    expect(pickRandomDigit(() => 0.5)).toBe(5);
  });
  it('rng=0.999999 → 9（端値クランプ）', () => {
    expect(pickRandomDigit(() => 0.999999)).toBe(9);
  });
});

describe('contrastToDigitAlpha', () => {
  it('0.10 → 0.10', () => {
    expect(contrastToDigitAlpha({ contrast: 0.10 })).toBeCloseTo(0.10, 5);
  });
  it('0.03 → 0.03（最難）', () => {
    expect(contrastToDigitAlpha({ contrast: 0.03 })).toBeCloseTo(0.03, 5);
  });
  it('0.30 → 0.30（最易）', () => {
    expect(contrastToDigitAlpha({ contrast: 0.30 })).toBeCloseTo(0.30, 5);
  });
  it('0 → 0（クランプ下限）', () => {
    expect(contrastToDigitAlpha({ contrast: 0 })).toBe(0);
  });
  it('1 → 1（クランプ上限）', () => {
    expect(contrastToDigitAlpha({ contrast: 1 })).toBe(1);
  });
  it('1.5（範囲外）→ 1（クランプ）', () => {
    expect(contrastToDigitAlpha({ contrast: 1.5 })).toBe(1);
  });
  it('minVisibleAlpha=0.05 で contrast=0.03 → 0.05 にクランプ', () => {
    expect(contrastToDigitAlpha({ contrast: 0.03, minVisibleAlpha: 0.05 })).toBeCloseTo(
      0.05,
      5,
    );
  });
});

describe('createNoiseRng', () => {
  it('同じ seed なら同じ系列を生成（決定論）', () => {
    const a = createNoiseRng(42);
    const b = createNoiseRng(42);
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b());
    }
  });

  it('異なる seed なら異なる系列', () => {
    const a = createNoiseRng(42);
    const b = createNoiseRng(99);
    const aVals = [a(), a(), a(), a(), a()];
    const bVals = [b(), b(), b(), b(), b()];
    expect(aVals).not.toEqual(bVals);
  });

  it('生成値は 0〜1 範囲', () => {
    const rng = createNoiseRng(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('buildG13Trial', () => {
  it('paramContrast=0.10 で trial を生成', () => {
    const t = buildG13Trial(0.10, () => 0.5);
    expect(t.paramContrast).toBeCloseTo(0.10, 5);
  });

  it('embeddedDigit は 0〜9 のいずれか', () => {
    const t = buildG13Trial(0.10, () => 0.3);
    expect(G13_ALL_DIGITS).toContain(t.embeddedDigit);
  });

  it('rng=0.0 で digit=0', () => {
    const t = buildG13Trial(0.10, () => 0);
    expect(t.embeddedDigit).toBe(0);
  });

  it('rng=0.95 で digit=9', () => {
    const t = buildG13Trial(0.10, () => 0.95);
    expect(t.embeddedDigit).toBe(9);
  });

  it('paramContrast はクランプ（0〜1）', () => {
    const t1 = buildG13Trial(-0.5, () => 0.1);
    expect(t1.paramContrast).toBe(0);
    const t2 = buildG13Trial(2.0, () => 0.1);
    expect(t2.paramContrast).toBe(1);
  });

  it('noiseSeed は 32bit 整数（>=0）', () => {
    const t = buildG13Trial(0.10, () => 0.5);
    expect(t.noiseSeed).toBeGreaterThanOrEqual(0);
    expect(t.noiseSeed).toBeLessThanOrEqual(0x7fff_ffff);
    expect(Number.isInteger(t.noiseSeed)).toBe(true);
  });

  it('rng が決定論的なら trial も決定論的', () => {
    const t1 = buildG13Trial(0.10, () => 0.3);
    const t2 = buildG13Trial(0.10, () => 0.3);
    expect(t1.embeddedDigit).toBe(t2.embeddedDigit);
    expect(t1.paramContrast).toBeCloseTo(t2.paramContrast, 5);
    expect(t1.noiseSeed).toBe(t2.noiseSeed);
  });
});

describe('gradeG13', () => {
  const trial = buildG13Trial(0.10, () => 0.05); // embeddedDigit=0

  it('正解と一致 → isCorrect=true', () => {
    const grading = gradeG13(trial, 0);
    expect(grading.isCorrect).toBe(true);
    expect(grading.unattempted).toBe(false);
    expect(grading.userAnswer).toBe(0);
  });

  it('別の数字を選択 → isCorrect=false', () => {
    const grading = gradeG13(trial, 5);
    expect(grading.isCorrect).toBe(false);
    expect(grading.userAnswer).toBe(5);
  });

  it('null（未回答）→ isCorrect=false, unattempted=true', () => {
    const grading = gradeG13(trial, null);
    expect(grading.isCorrect).toBe(false);
    expect(grading.unattempted).toBe(true);
    expect(grading.userAnswer).toBeNull();
  });

  it('embeddedDigit は trial の値をそのまま返す', () => {
    const grading = gradeG13(trial, null);
    expect(grading.embeddedDigit).toBe(trial.embeddedDigit);
  });
});

describe('computeG13StimulusLayout', () => {
  it('viewport 360px → stimulus 240, keypad 56', () => {
    const l = computeG13StimulusLayout(360);
    expect(l.stimulusSizePx).toBe(240);
    expect(l.keypadButtonSizePx).toBe(56);
  });
  it('viewport 375px → stimulus 240, keypad 64', () => {
    const l = computeG13StimulusLayout(375);
    expect(l.stimulusSizePx).toBe(240);
    expect(l.keypadButtonSizePx).toBe(64);
  });
  it('viewport 768px → stimulus 280, keypad 64', () => {
    const l = computeG13StimulusLayout(768);
    expect(l.stimulusSizePx).toBe(280);
    expect(l.keypadButtonSizePx).toBe(64);
  });
  it('viewport 1280px → stimulus 320, keypad 72', () => {
    const l = computeG13StimulusLayout(1280);
    expect(l.stimulusSizePx).toBe(320);
    expect(l.keypadButtonSizePx).toBe(72);
  });
  it('オブジェクト引数 { widthPx } も受け付ける', () => {
    expect(computeG13StimulusLayout({ widthPx: 360 }).stimulusSizePx).toBe(240);
  });
});
