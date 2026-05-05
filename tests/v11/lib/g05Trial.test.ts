/**
 * G-05 trial 生成 / 採点 / レイアウトの純関数テスト（spec-v11.md §7.5）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG05Trial,
  computeG05StimulusLayout,
  G05_BASE_CPD,
  G05_GABOR_PARAMS,
  GAME5_V11,
  gradeG05,
  sideToSfJaLabel,
  userAnswerToSfLabel,
} from '../../../src/lib/v11/g05Trial';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';

describe('g05Trial: spec', () => {
  it('GAME5_V11.totalDurationMs は 60_000（OPT-11 / OPT-12）', () => {
    expect(GAME5_V11.totalDurationMs).toBe(60_000);
  });

  it('GAME5_V11.fixationDurationMs は 500ms（screens.md S13-02 フェーズ）', () => {
    expect(GAME5_V11.fixationDurationMs).toBe(500);
  });

  it('GAME5_V11.correctRevealMs は 1500ms（screens.md S13-03）', () => {
    expect(GAME5_V11.correctRevealMs).toBe(1500);
  });

  it('G05_GABOR_PARAMS は contrast=0.4, sigmaDeg=0.6（spec §6.1 範囲内）', () => {
    expect(G05_GABOR_PARAMS.contrast).toBeCloseTo(0.4, 5);
    expect(G05_GABOR_PARAMS.sigmaDeg).toBeCloseTo(0.6, 5);
  });

  it('G05_BASE_CPD は 4（左右 cpd が §6.1 範囲 1.5〜9 内に収まる中央値）', () => {
    expect(G05_BASE_CPD).toBe(4);
  });

  it('gameRegistry G-05 の paramRange は { min:1.05, max:1.5, initial:1.2, step:0.05 }（v1.1.4 難化）', () => {
    const def = GAME_REGISTRY.find((g) => g.gameId === 'G-05');
    expect(def).toBeDefined();
    expect(def?.paramRange.min).toBeCloseTo(1.05, 5);
    expect(def?.paramRange.max).toBeCloseTo(1.5, 5);
    expect(def?.paramRange.initial).toBeCloseTo(1.2, 5);
    expect(def?.paramRange.step).toBeCloseTo(0.05, 5);
  });
});

describe('buildG05Trial: 試行生成', () => {
  it('paramValueRatio=1.5（初期）で左右 cpd 比は 1.5（高/低）', () => {
    const trial = buildG05Trial(1.5, () => 0.4); // correctSide=left
    const ratio = Math.max(trial.left.cpd, trial.right.cpd) /
      Math.min(trial.left.cpd, trial.right.cpd);
    expect(ratio).toBeCloseTo(1.5, 4);
  });

  it('paramValueRatio=1.1（最難）で左右 cpd 比は 1.1', () => {
    const trial = buildG05Trial(1.1, () => 0.4);
    const ratio = Math.max(trial.left.cpd, trial.right.cpd) /
      Math.min(trial.left.cpd, trial.right.cpd);
    expect(ratio).toBeCloseTo(1.1, 4);
  });

  it('paramValueRatio=2.0（最易）で左右 cpd 比は 2.0', () => {
    const trial = buildG05Trial(2.0, () => 0.4);
    const ratio = Math.max(trial.left.cpd, trial.right.cpd) /
      Math.min(trial.left.cpd, trial.right.cpd);
    expect(ratio).toBeCloseTo(2.0, 4);
  });

  it('rng < 0.5 のとき correctSide=left（高 cpd 側が左）', () => {
    const trial = buildG05Trial(1.5, () => 0.4);
    expect(trial.correctSide).toBe('left');
    expect(trial.left.cpd).toBeGreaterThan(trial.right.cpd);
  });

  it('rng >= 0.5 のとき correctSide=right（高 cpd 側が右）', () => {
    const trial = buildG05Trial(1.5, () => 0.6);
    expect(trial.correctSide).toBe('right');
    expect(trial.right.cpd).toBeGreaterThan(trial.left.cpd);
  });

  it('左右の orientation は同一（spec §7.5「向き同一」）', () => {
    const trial = buildG05Trial(1.5, () => 0.3);
    expect(trial.left.orientationDeg).toBeCloseTo(
      trial.right.orientationDeg,
      5,
    );
  });

  it('左右の contrast は同一（spec §7.5「コントラスト同一」）', () => {
    const trial = buildG05Trial(1.5, () => 0.3);
    expect(trial.left.contrast).toBeCloseTo(trial.right.contrast, 5);
    expect(trial.left.contrast).toBeCloseTo(0.4, 5);
  });

  it('左右の sigmaDeg は同一', () => {
    const trial = buildG05Trial(1.5, () => 0.3);
    expect(trial.left.sigmaDeg).toBeCloseTo(trial.right.sigmaDeg, 5);
    expect(trial.left.sigmaDeg).toBeCloseTo(0.6, 5);
  });

  it('左右 cpd は §6.1 範囲（1.5〜9）内に収まる：r=1.5（初期）', () => {
    const trial = buildG05Trial(1.5, () => 0.4);
    expect(trial.left.cpd).toBeGreaterThanOrEqual(1.5);
    expect(trial.left.cpd).toBeLessThanOrEqual(9);
    expect(trial.right.cpd).toBeGreaterThanOrEqual(1.5);
    expect(trial.right.cpd).toBeLessThanOrEqual(9);
  });

  it('左右 cpd は §6.1 範囲（1.5〜9）内に収まる：r=2.0（最易）', () => {
    const trial = buildG05Trial(2.0, () => 0.4);
    // base 4 / √2 ≈ 2.83、base 4 * √2 ≈ 5.66 で範囲内
    expect(trial.left.cpd).toBeGreaterThanOrEqual(1.5);
    expect(trial.left.cpd).toBeLessThanOrEqual(9);
    expect(trial.right.cpd).toBeGreaterThanOrEqual(1.5);
    expect(trial.right.cpd).toBeLessThanOrEqual(9);
  });

  it('左右 cpd は §6.1 範囲（1.5〜9）内に収まる：r=1.1（最難）', () => {
    const trial = buildG05Trial(1.1, () => 0.4);
    expect(trial.left.cpd).toBeGreaterThanOrEqual(1.5);
    expect(trial.left.cpd).toBeLessThanOrEqual(9);
    expect(trial.right.cpd).toBeGreaterThanOrEqual(1.5);
    expect(trial.right.cpd).toBeLessThanOrEqual(9);
  });

  it('paramValueRatio, baseCpd, correctSide が trial に含まれる', () => {
    const trial = buildG05Trial(1.5, () => 0.3);
    expect(trial.paramValueRatio).toBeCloseTo(1.5, 5);
    expect(trial.baseCpd).toBe(4);
    expect(['left', 'right']).toContain(trial.correctSide);
  });

  it('correctSide=left のとき left.cpd > right.cpd', () => {
    const trial = buildG05Trial(1.5, () => 0.4);
    expect(trial.correctSide).toBe('left');
    // base 4、√1.5 ≈ 1.2247 → left ≈ 4.899, right ≈ 3.266
    expect(trial.left.cpd).toBeCloseTo(4 * Math.sqrt(1.5), 4);
    expect(trial.right.cpd).toBeCloseTo(4 / Math.sqrt(1.5), 4);
  });

  it('correctSide=right のとき right.cpd > left.cpd', () => {
    const trial = buildG05Trial(1.5, () => 0.6);
    expect(trial.correctSide).toBe('right');
    expect(trial.right.cpd).toBeCloseTo(4 * Math.sqrt(1.5), 4);
    expect(trial.left.cpd).toBeCloseTo(4 / Math.sqrt(1.5), 4);
  });

  it('phaseRad は左右独立にランダム（rng が呼ばれる回数）', () => {
    let rngCalls = 0;
    const rng = () => {
      rngCalls += 1;
      return 0.4;
    };
    buildG05Trial(1.5, rng);
    // 1) base orientation 2) correctSide 3) left phase 4) right phase = 4 回
    expect(rngCalls).toBeGreaterThanOrEqual(4);
  });

  it('paramValueRatio < 1（壊れた値）でも 1 にクランプされて落ちない', () => {
    const trial = buildG05Trial(0.5, () => 0.4);
    // r=1 にクランプ → 左右同じ cpd（差なし）になる
    expect(trial.left.cpd).toBeCloseTo(trial.right.cpd, 5);
    expect(trial.paramValueRatio).toBeCloseTo(1, 5);
  });
});

describe('gradeG05: 採点', () => {
  it('正解側を選択 → isCorrect=true', () => {
    const trial = buildG05Trial(1.5, () => 0.4); // correctSide=left
    const result = gradeG05(trial, 'left');
    expect(result.isCorrect).toBe(true);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswer).toBe('left');
    expect(result.correctSide).toBe('left');
  });

  it('不正解側を選択 → isCorrect=false', () => {
    const trial = buildG05Trial(1.5, () => 0.4); // correctSide=left
    const result = gradeG05(trial, 'right');
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswer).toBe('right');
  });

  it('未回答（null）→ isCorrect=false, unattempted=true', () => {
    const trial = buildG05Trial(1.5, () => 0.4);
    const result = gradeG05(trial, null);
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(true);
    expect(result.userAnswer).toBeNull();
  });

  it('correctSide=right で right を選択 → 正解', () => {
    const trial = buildG05Trial(1.5, () => 0.6); // correctSide=right
    const result = gradeG05(trial, 'right');
    expect(result.isCorrect).toBe(true);
  });
});

describe('sideToSfJaLabel / userAnswerToSfLabel', () => {
  it('left → 「左が細かい」', () => {
    expect(sideToSfJaLabel('left')).toBe('左が細かい');
  });
  it('right → 「右が細かい」', () => {
    expect(sideToSfJaLabel('right')).toBe('右が細かい');
  });
  it('userAnswerToSfLabel(null) → null', () => {
    expect(userAnswerToSfLabel(null)).toBeNull();
  });
  it('userAnswerToSfLabel("left") → 「左が細かい」', () => {
    expect(userAnswerToSfLabel('left')).toBe('左が細かい');
  });
  it('userAnswerToSfLabel("right") → 「右が細かい」', () => {
    expect(userAnswerToSfLabel('right')).toBe('右が細かい');
  });
});

describe('computeG05StimulusLayout: レスポンシブ（screens.md S13-02 §5）', () => {
  it('width=360 で 100×100, gap 24', () => {
    expect(computeG05StimulusLayout(360)).toEqual({
      patchSizePx: 100,
      gapPx: 24,
    });
  });

  it('width=375 で 120×120, gap 32', () => {
    expect(computeG05StimulusLayout(375)).toEqual({
      patchSizePx: 120,
      gapPx: 32,
    });
  });

  it('width=768 で 140×140, gap 48', () => {
    expect(computeG05StimulusLayout(768)).toEqual({
      patchSizePx: 140,
      gapPx: 48,
    });
  });

  it('width=1280 で 160×160, gap 64', () => {
    expect(computeG05StimulusLayout(1280)).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('width=1280, height=800（PC 横）で 160×160, gap 64', () => {
    expect(
      computeG05StimulusLayout({ widthPx: 1280, heightPx: 800 }),
    ).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('width=375, height=667 で 120×120, gap 32（モバイル縦）', () => {
    expect(
      computeG05StimulusLayout({ widthPx: 375, heightPx: 667 }),
    ).toEqual({
      patchSizePx: 120,
      gapPx: 32,
    });
  });

  it('数値 1 個（width のみ）でも呼べる：1280 → 160/64', () => {
    expect(computeG05StimulusLayout(1280)).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('引数 2 個（width, height）でも呼べる：1280, 800 → 160/64', () => {
    expect(computeG05StimulusLayout(1280, 800)).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('safety：高さが極端に小さいとパッチを 1 段落とす', () => {
    const layout = computeG05StimulusLayout({ widthPx: 1280, heightPx: 200 });
    expect(layout.patchSizePx).toBeLessThanOrEqual(140);
  });
});
