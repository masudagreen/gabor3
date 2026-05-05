/**
 * G-06 trial 生成 / 採点 / レイアウトの純関数テスト（spec-v11.md §7.6）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG06Trial,
  computeG06StimulusLayout,
  G06_BASE_SIGMA_DEG,
  G06_GABOR_PARAMS,
  GAME6_V11,
  gradeG06,
  sideToSizeJaLabel,
  userAnswerToSizeLabel,
} from '../../../src/lib/v11/g06Trial';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';

describe('g06Trial: spec', () => {
  it('GAME6_V11.totalDurationMs は 60_000（OPT-11 / OPT-12）', () => {
    expect(GAME6_V11.totalDurationMs).toBe(60_000);
  });

  it('GAME6_V11.fixationDurationMs は 500ms（screens.md S14-02 フェーズ）', () => {
    expect(GAME6_V11.fixationDurationMs).toBe(500);
  });

  it('GAME6_V11.correctRevealMs は 1500ms（screens.md S14-03）', () => {
    expect(GAME6_V11.correctRevealMs).toBe(1500);
  });

  it('G06_GABOR_PARAMS は cpd=4, contrast=0.4', () => {
    expect(G06_GABOR_PARAMS.cpd).toBe(4);
    expect(G06_GABOR_PARAMS.contrast).toBeCloseTo(0.4, 5);
  });

  it('G06_BASE_SIGMA_DEG は 0.6（spec §6.1 範囲 0.3〜1.0 の中央）', () => {
    expect(G06_BASE_SIGMA_DEG).toBe(0.6);
  });

  it('gameRegistry G-06 の paramRange は { min:1.05, max:1.5, initial:1.2, step:0.05 }（v1.1.4 難化）', () => {
    const def = GAME_REGISTRY.find((g) => g.gameId === 'G-06');
    expect(def).toBeDefined();
    expect(def?.paramRange.min).toBeCloseTo(1.05, 5);
    expect(def?.paramRange.max).toBeCloseTo(1.5, 5);
    expect(def?.paramRange.initial).toBeCloseTo(1.2, 5);
    expect(def?.paramRange.step).toBeCloseTo(0.05, 5);
  });
});

describe('buildG06Trial: 試行生成', () => {
  it('paramValueRatio=1.5（初期）で左右 SD 比は 1.5（大/小）', () => {
    const trial = buildG06Trial(1.5, () => 0.4); // correctSide=left
    const ratio =
      Math.max(trial.left.sigmaDeg, trial.right.sigmaDeg) /
      Math.min(trial.left.sigmaDeg, trial.right.sigmaDeg);
    expect(ratio).toBeCloseTo(1.5, 4);
  });

  it('paramValueRatio=1.1（最難）で左右 SD 比は 1.1', () => {
    const trial = buildG06Trial(1.1, () => 0.4);
    const ratio =
      Math.max(trial.left.sigmaDeg, trial.right.sigmaDeg) /
      Math.min(trial.left.sigmaDeg, trial.right.sigmaDeg);
    expect(ratio).toBeCloseTo(1.1, 4);
  });

  it('paramValueRatio=2.0（最易）で左右 SD 比は 2.0', () => {
    const trial = buildG06Trial(2.0, () => 0.4);
    const ratio =
      Math.max(trial.left.sigmaDeg, trial.right.sigmaDeg) /
      Math.min(trial.left.sigmaDeg, trial.right.sigmaDeg);
    expect(ratio).toBeCloseTo(2.0, 4);
  });

  it('rng < 0.5 のとき correctSide=left（大 SD 側が左）', () => {
    const trial = buildG06Trial(1.5, () => 0.4);
    expect(trial.correctSide).toBe('left');
    expect(trial.left.sigmaDeg).toBeGreaterThan(trial.right.sigmaDeg);
  });

  it('rng >= 0.5 のとき correctSide=right（大 SD 側が右）', () => {
    const trial = buildG06Trial(1.5, () => 0.6);
    expect(trial.correctSide).toBe('right');
    expect(trial.right.sigmaDeg).toBeGreaterThan(trial.left.sigmaDeg);
  });

  it('左右の orientation は同一（spec §7.6「向き同一」）', () => {
    const trial = buildG06Trial(1.5, () => 0.3);
    expect(trial.left.orientationDeg).toBeCloseTo(
      trial.right.orientationDeg,
      5,
    );
  });

  it('左右の contrast は同一（spec §7.6「コントラスト同一」）', () => {
    const trial = buildG06Trial(1.5, () => 0.3);
    expect(trial.left.contrast).toBeCloseTo(trial.right.contrast, 5);
    expect(trial.left.contrast).toBeCloseTo(0.4, 5);
  });

  it('左右の cpd は同一（spec §7.6「cpd 同一」）', () => {
    const trial = buildG06Trial(1.5, () => 0.3);
    expect(trial.left.cpd).toBeCloseTo(trial.right.cpd, 5);
    expect(trial.left.cpd).toBe(4);
  });

  it('左右の sigmaDeg は §6.1 範囲（0.3〜1.0）内に収まる：r=1.5（初期）', () => {
    const trial = buildG06Trial(1.5, () => 0.4);
    expect(trial.left.sigmaDeg).toBeGreaterThanOrEqual(0.3);
    expect(trial.left.sigmaDeg).toBeLessThanOrEqual(1.0);
    expect(trial.right.sigmaDeg).toBeGreaterThanOrEqual(0.3);
    expect(trial.right.sigmaDeg).toBeLessThanOrEqual(1.0);
  });

  it('左右の sigmaDeg は §6.1 範囲（0.3〜1.0）内に収まる：r=2.0（最易）', () => {
    const trial = buildG06Trial(2.0, () => 0.4);
    // base 0.6 / √2 ≈ 0.42、base 0.6 * √2 ≈ 0.85 で範囲内
    expect(trial.left.sigmaDeg).toBeGreaterThanOrEqual(0.3);
    expect(trial.left.sigmaDeg).toBeLessThanOrEqual(1.0);
    expect(trial.right.sigmaDeg).toBeGreaterThanOrEqual(0.3);
    expect(trial.right.sigmaDeg).toBeLessThanOrEqual(1.0);
  });

  it('左右の sigmaDeg は §6.1 範囲（0.3〜1.0）内に収まる：r=1.1（最難）', () => {
    const trial = buildG06Trial(1.1, () => 0.4);
    expect(trial.left.sigmaDeg).toBeGreaterThanOrEqual(0.3);
    expect(trial.left.sigmaDeg).toBeLessThanOrEqual(1.0);
    expect(trial.right.sigmaDeg).toBeGreaterThanOrEqual(0.3);
    expect(trial.right.sigmaDeg).toBeLessThanOrEqual(1.0);
  });

  it('paramValueRatio, baseSigmaDeg, correctSide が trial に含まれる', () => {
    const trial = buildG06Trial(1.5, () => 0.3);
    expect(trial.paramValueRatio).toBeCloseTo(1.5, 5);
    expect(trial.baseSigmaDeg).toBe(0.6);
    expect(['left', 'right']).toContain(trial.correctSide);
  });

  it('correctSide=left のとき left.sigmaDeg > right.sigmaDeg', () => {
    const trial = buildG06Trial(1.5, () => 0.4);
    expect(trial.correctSide).toBe('left');
    // base 0.6、√1.5 ≈ 1.2247 → left ≈ 0.7348, right ≈ 0.4899
    expect(trial.left.sigmaDeg).toBeCloseTo(0.6 * Math.sqrt(1.5), 4);
    expect(trial.right.sigmaDeg).toBeCloseTo(0.6 / Math.sqrt(1.5), 4);
  });

  it('correctSide=right のとき right.sigmaDeg > left.sigmaDeg', () => {
    const trial = buildG06Trial(1.5, () => 0.6);
    expect(trial.correctSide).toBe('right');
    expect(trial.right.sigmaDeg).toBeCloseTo(0.6 * Math.sqrt(1.5), 4);
    expect(trial.left.sigmaDeg).toBeCloseTo(0.6 / Math.sqrt(1.5), 4);
  });

  it('phaseRad は左右独立にランダム（rng が呼ばれる回数）', () => {
    let rngCalls = 0;
    const rng = () => {
      rngCalls += 1;
      return 0.4;
    };
    buildG06Trial(1.5, rng);
    // 1) base orientation 2) correctSide 3) left phase 4) right phase = 4 回
    expect(rngCalls).toBeGreaterThanOrEqual(4);
  });

  it('paramValueRatio < 1（壊れた値）でも 1 にクランプされて落ちない', () => {
    const trial = buildG06Trial(0.5, () => 0.4);
    // r=1 にクランプ → 左右同じ sigmaDeg（差なし）になる
    expect(trial.left.sigmaDeg).toBeCloseTo(trial.right.sigmaDeg, 5);
    expect(trial.paramValueRatio).toBeCloseTo(1, 5);
  });
});

describe('gradeG06: 採点', () => {
  it('正解側（大 SD 側）を選択 → isCorrect=true', () => {
    const trial = buildG06Trial(1.5, () => 0.4); // correctSide=left
    const result = gradeG06(trial, 'left');
    expect(result.isCorrect).toBe(true);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswer).toBe('left');
    expect(result.correctSide).toBe('left');
  });

  it('不正解側（小 SD 側）を選択 → isCorrect=false', () => {
    const trial = buildG06Trial(1.5, () => 0.4); // correctSide=left
    const result = gradeG06(trial, 'right');
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswer).toBe('right');
  });

  it('未回答（null）→ isCorrect=false, unattempted=true', () => {
    const trial = buildG06Trial(1.5, () => 0.4);
    const result = gradeG06(trial, null);
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(true);
    expect(result.userAnswer).toBeNull();
  });

  it('correctSide=right で right を選択 → 正解', () => {
    const trial = buildG06Trial(1.5, () => 0.6); // correctSide=right
    const result = gradeG06(trial, 'right');
    expect(result.isCorrect).toBe(true);
  });
});

describe('sideToSizeJaLabel / userAnswerToSizeLabel', () => {
  it('left → 「左が大きい」', () => {
    expect(sideToSizeJaLabel('left')).toBe('左が大きい');
  });
  it('right → 「右が大きい」', () => {
    expect(sideToSizeJaLabel('right')).toBe('右が大きい');
  });
  it('userAnswerToSizeLabel(null) → null', () => {
    expect(userAnswerToSizeLabel(null)).toBeNull();
  });
  it('userAnswerToSizeLabel("left") → 「左が大きい」', () => {
    expect(userAnswerToSizeLabel('left')).toBe('左が大きい');
  });
  it('userAnswerToSizeLabel("right") → 「右が大きい」', () => {
    expect(userAnswerToSizeLabel('right')).toBe('右が大きい');
  });
});

describe('computeG06StimulusLayout: レスポンシブ（screens.md S14 §4）', () => {
  it('width=360 で 100×100, gap 24', () => {
    expect(computeG06StimulusLayout(360)).toEqual({
      patchSizePx: 100,
      gapPx: 24,
    });
  });

  it('width=375 で 120×120, gap 32', () => {
    expect(computeG06StimulusLayout(375)).toEqual({
      patchSizePx: 120,
      gapPx: 32,
    });
  });

  it('width=768 で 140×140, gap 48', () => {
    expect(computeG06StimulusLayout(768)).toEqual({
      patchSizePx: 140,
      gapPx: 48,
    });
  });

  it('width=1280 で 160×160, gap 64', () => {
    expect(computeG06StimulusLayout(1280)).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('width=1280, height=800（PC 横）で 160×160, gap 64', () => {
    expect(
      computeG06StimulusLayout({ widthPx: 1280, heightPx: 800 }),
    ).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('数値 1 個（width のみ）でも呼べる：1280 → 160/64', () => {
    expect(computeG06StimulusLayout(1280)).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('引数 2 個（width, height）でも呼べる：1280, 800 → 160/64', () => {
    expect(computeG06StimulusLayout(1280, 800)).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('safety：高さが極端に小さいとパッチを 1 段落とす', () => {
    const layout = computeG06StimulusLayout({ widthPx: 1280, heightPx: 200 });
    expect(layout.patchSizePx).toBeLessThanOrEqual(140);
  });
});
