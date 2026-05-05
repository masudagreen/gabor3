/**
 * G-09 trial 生成 / 採点 / レイアウト / staircase 派生の純関数テスト（spec-v11.md §7.9）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG09Trial,
  computeG09SpacingPx,
  computeG09StimulusLayout,
  derivePolatSpacingFromContrast,
  G09_FLANKER_CONTRAST,
  G09_FLANKER_ORIENTATION_DEG,
  G09_GABOR_BASE_PARAMS,
  GAME9_V11,
  gradeG09,
  orientationToJaLabel,
  orientationToOrientationDeg,
  orientationToShortJaLabel,
  userAnswerOrientationToLabel,
} from '../../../src/lib/v11/g09Trial';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';

describe('g09Trial: spec', () => {
  it('GAME9_V11.totalDurationMs は 60_000（OPT-11 / OPT-12）', () => {
    expect(GAME9_V11.totalDurationMs).toBe(60_000);
  });

  it('GAME9_V11.fixationDurationMs は 500ms（screens.md S15-05 固視点）', () => {
    expect(GAME9_V11.fixationDurationMs).toBe(500);
  });

  it('GAME9_V11.correctRevealMs は 1500ms（screens.md S15-06）', () => {
    expect(GAME9_V11.correctRevealMs).toBe(1500);
  });

  it('G09_FLANKER_CONTRAST は 0.5（spec §7.9 / screens.md §3）', () => {
    expect(G09_FLANKER_CONTRAST).toBeCloseTo(0.5, 5);
  });

  it('G09_FLANKER_ORIENTATION_DEG は 90（垂直平行）', () => {
    expect(G09_FLANKER_ORIENTATION_DEG).toBe(90);
  });

  it('G09_GABOR_BASE_PARAMS は cpd=4, sigmaDeg=0.6', () => {
    expect(G09_GABOR_BASE_PARAMS.cpd).toBe(4);
    expect(G09_GABOR_BASE_PARAMS.sigmaDeg).toBeCloseTo(0.6, 5);
  });

  it('gameRegistry G-09 の paramRange は { min:0.05, max:0.2, initial:0.1, step:0.01 }', () => {
    const def = GAME_REGISTRY.find((g) => g.gameId === 'G-09');
    expect(def).toBeDefined();
    expect(def?.paramRange.min).toBeCloseTo(0.05, 5);
    expect(def?.paramRange.max).toBeCloseTo(0.2, 5);
    expect(def?.paramRange.initial).toBeCloseTo(0.1, 5);
    expect(def?.paramRange.step).toBeCloseTo(0.01, 5);
  });
});

describe('orientationToOrientationDeg', () => {
  it('vertical → 90°（垂直）', () => {
    expect(orientationToOrientationDeg('vertical')).toBe(90);
  });
  it('horizontal → 0°（水平）', () => {
    expect(orientationToOrientationDeg('horizontal')).toBe(0);
  });
});

describe('derivePolatSpacingFromContrast: staircase 派生（spec §7.9）', () => {
  it('contrast 0.05 → spacing 1.5λ（最難・近接・強抑制）', () => {
    expect(derivePolatSpacingFromContrast(0.05)).toBeCloseTo(1.5, 5);
  });

  it('contrast 0.10 → spacing 3.0λ（初期）', () => {
    expect(derivePolatSpacingFromContrast(0.1)).toBeCloseTo(3.0, 5);
  });

  it('contrast 0.20 → spacing 5.0λ（最易・離れ・抑制弱）', () => {
    expect(derivePolatSpacingFromContrast(0.2)).toBeCloseTo(5.0, 5);
  });

  it('contrast 0.075（中間）→ spacing 2.25λ（線形補間）', () => {
    // 0.05〜0.10 線形：(0.075-0.05)/0.05 = 0.5 → 1.5 + 0.5*1.5 = 2.25
    expect(derivePolatSpacingFromContrast(0.075)).toBeCloseTo(2.25, 5);
  });

  it('contrast 0.15（中間）→ spacing 4.0λ（線形補間）', () => {
    // 0.10〜0.20 線形：(0.15-0.10)/0.10 = 0.5 → 3.0 + 0.5*2.0 = 4.0
    expect(derivePolatSpacingFromContrast(0.15)).toBeCloseTo(4.0, 5);
  });

  it('contrast < 0.05 → 0.05 にクランプ → spacing 1.5λ', () => {
    expect(derivePolatSpacingFromContrast(0.01)).toBeCloseTo(1.5, 5);
  });

  it('contrast > 0.20 → 0.20 にクランプ → spacing 5.0λ', () => {
    expect(derivePolatSpacingFromContrast(0.5)).toBeCloseTo(5.0, 5);
  });

  it('contrast 上昇に伴い spacing も単調増加（連動）', () => {
    const c1 = derivePolatSpacingFromContrast(0.06);
    const c2 = derivePolatSpacingFromContrast(0.10);
    const c3 = derivePolatSpacingFromContrast(0.15);
    const c4 = derivePolatSpacingFromContrast(0.20);
    expect(c1).toBeLessThan(c2);
    expect(c2).toBeLessThan(c3);
    expect(c3).toBeLessThan(c4);
  });
});

describe('buildG09Trial: 試行生成', () => {
  it('paramContrast=0.10（初期）で target.contrast = 0.10', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    expect(trial.target.contrast).toBeCloseTo(0.1, 5);
    expect(trial.paramContrast).toBeCloseTo(0.1, 5);
  });

  it('paramContrast=0.05（最難）で target.contrast = 0.05', () => {
    const trial = buildG09Trial(0.05, () => 0.4);
    expect(trial.target.contrast).toBeCloseTo(0.05, 5);
  });

  it('paramContrast=0.20（最易）で target.contrast = 0.20', () => {
    const trial = buildG09Trial(0.2, () => 0.4);
    expect(trial.target.contrast).toBeCloseTo(0.2, 5);
  });

  it('rng < 0.5 → correctOrientation=vertical, target.orientationDeg=90', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    expect(trial.correctOrientation).toBe('vertical');
    expect(trial.target.orientationDeg).toBe(90);
  });

  it('rng >= 0.5 → correctOrientation=horizontal, target.orientationDeg=0', () => {
    const trial = buildG09Trial(0.1, () => 0.6);
    expect(trial.correctOrientation).toBe('horizontal');
    expect(trial.target.orientationDeg).toBe(0);
  });

  it('flankerLeft / flankerRight ともに contrast=0.5（高コン）', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    expect(trial.flankerLeft.contrast).toBeCloseTo(0.5, 5);
    expect(trial.flankerRight.contrast).toBeCloseTo(0.5, 5);
  });

  it('flankerLeft / flankerRight ともに orientationDeg=90（垂直平行）', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    expect(trial.flankerLeft.orientationDeg).toBe(90);
    expect(trial.flankerRight.orientationDeg).toBe(90);
  });

  it('全 3 パッチの cpd = 4 で共通', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    expect(trial.flankerLeft.cpd).toBe(4);
    expect(trial.target.cpd).toBe(4);
    expect(trial.flankerRight.cpd).toBe(4);
  });

  it('全 3 パッチの sigmaDeg = 0.6 で共通', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    expect(trial.flankerLeft.sigmaDeg).toBeCloseTo(0.6, 5);
    expect(trial.target.sigmaDeg).toBeCloseTo(0.6, 5);
    expect(trial.flankerRight.sigmaDeg).toBeCloseTo(0.6, 5);
  });

  it('derivedSpacingLambdaMultiplier = derivePolatSpacingFromContrast(contrast) と一致', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    expect(trial.derivedSpacingLambdaMultiplier).toBeCloseTo(3.0, 5);
    const trial2 = buildG09Trial(0.05, () => 0.4);
    expect(trial2.derivedSpacingLambdaMultiplier).toBeCloseTo(1.5, 5);
    const trial3 = buildG09Trial(0.2, () => 0.4);
    expect(trial3.derivedSpacingLambdaMultiplier).toBeCloseTo(5.0, 5);
  });

  it('phaseRad は 3 パッチ独立にランダム（rng が複数回呼ばれる）', () => {
    let rngCalls = 0;
    const rng = () => {
      rngCalls += 1;
      return 0.4;
    };
    buildG09Trial(0.1, rng);
    // 1) correctOrientation 2) flankerLeft phase 3) flankerRight phase 4) target phase = 4 回
    expect(rngCalls).toBeGreaterThanOrEqual(4);
  });

  it('paramContrast < 0.05 はクランプされて 0.05 に', () => {
    const trial = buildG09Trial(0.01, () => 0.4);
    expect(trial.paramContrast).toBeCloseTo(0.05, 5);
    expect(trial.target.contrast).toBeCloseTo(0.05, 5);
  });

  it('paramContrast > 0.20 はクランプされて 0.20 に', () => {
    const trial = buildG09Trial(0.5, () => 0.4);
    expect(trial.paramContrast).toBeCloseTo(0.2, 5);
    expect(trial.target.contrast).toBeCloseTo(0.2, 5);
  });
});

describe('gradeG09: 採点', () => {
  it('正解向き（vertical）を選択 → isCorrect=true', () => {
    const trial = buildG09Trial(0.1, () => 0.4); // correctOrientation=vertical
    const result = gradeG09(trial, 'vertical');
    expect(result.isCorrect).toBe(true);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswer).toBe('vertical');
    expect(result.correctOrientation).toBe('vertical');
  });

  it('不正解向き（horizontal）を選択 → isCorrect=false', () => {
    const trial = buildG09Trial(0.1, () => 0.4); // correctOrientation=vertical
    const result = gradeG09(trial, 'horizontal');
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(false);
  });

  it('未回答（null）→ isCorrect=false, unattempted=true', () => {
    const trial = buildG09Trial(0.1, () => 0.4);
    const result = gradeG09(trial, null);
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(true);
    expect(result.userAnswer).toBeNull();
  });

  it('correctOrientation=horizontal で horizontal 選択 → 正解', () => {
    const trial = buildG09Trial(0.1, () => 0.6);
    expect(trial.correctOrientation).toBe('horizontal');
    const result = gradeG09(trial, 'horizontal');
    expect(result.isCorrect).toBe(true);
  });
});

describe('orientationToJaLabel / orientationToShortJaLabel / userAnswerOrientationToLabel', () => {
  it('vertical → 「中央は縦縞」', () => {
    expect(orientationToJaLabel('vertical')).toBe('中央は縦縞');
  });
  it('horizontal → 「中央は横縞」', () => {
    expect(orientationToJaLabel('horizontal')).toBe('中央は横縞');
  });
  it('短縮 vertical → 「縦縞」', () => {
    expect(orientationToShortJaLabel('vertical')).toBe('縦縞');
  });
  it('短縮 horizontal → 「横縞」', () => {
    expect(orientationToShortJaLabel('horizontal')).toBe('横縞');
  });
  it('userAnswerOrientationToLabel(null) → null', () => {
    expect(userAnswerOrientationToLabel(null)).toBeNull();
  });
  it('userAnswerOrientationToLabel("vertical") → 「中央は縦縞」', () => {
    expect(userAnswerOrientationToLabel('vertical')).toBe('中央は縦縞');
  });
  it('userAnswerOrientationToLabel("horizontal") → 「中央は横縞」', () => {
    expect(userAnswerOrientationToLabel('horizontal')).toBe('中央は横縞');
  });
});

describe('computeG09StimulusLayout: レスポンシブ（screens.md §4 / components.md §15 GE-09）', () => {
  it('width=360 で 64×64', () => {
    expect(computeG09StimulusLayout(360)).toEqual({
      patchSizePx: 64,
      patchDiameterPx: 64,
    });
  });

  it('width=375 で 80×80', () => {
    expect(computeG09StimulusLayout(375)).toEqual({
      patchSizePx: 80,
      patchDiameterPx: 80,
    });
  });

  it('width=768 で 100×100', () => {
    expect(computeG09StimulusLayout(768)).toEqual({
      patchSizePx: 100,
      patchDiameterPx: 100,
    });
  });

  it('width=1280 で 120×120', () => {
    expect(computeG09StimulusLayout(1280)).toEqual({
      patchSizePx: 120,
      patchDiameterPx: 120,
    });
  });

  it('オブジェクト引数も受け付ける', () => {
    expect(
      computeG09StimulusLayout({ widthPx: 1280, heightPx: 800 }),
    ).toEqual({
      patchSizePx: 120,
      patchDiameterPx: 120,
    });
  });
});

describe('computeG09SpacingPx: 横方向 spacing 計算', () => {
  it('360px viewport, 64 patch, multiplier 1.5 → spacing は viewportWidth に収まる', () => {
    const r = computeG09SpacingPx({
      spacingLambdaMultiplier: 1.5,
      patchDiameterPx: 64,
      viewportWidthPx: 360,
    });
    // 全幅 = 64*3 + gap*2 が 360-32=328 以下
    expect(r.totalWidthPx).toBeLessThanOrEqual(328);
    expect(r.gapPx).toBeGreaterThanOrEqual(8);
  });

  it('1280px viewport, 120 patch, multiplier 5.0 → 全幅は viewportWidth-32 以下', () => {
    const r = computeG09SpacingPx({
      spacingLambdaMultiplier: 5.0,
      patchDiameterPx: 120,
      viewportWidthPx: 1280,
    });
    expect(r.totalWidthPx).toBeLessThanOrEqual(1248);
  });

  it('768px viewport, 100 patch, multiplier 3.0 → 全幅収まる', () => {
    const r = computeG09SpacingPx({
      spacingLambdaMultiplier: 3.0,
      patchDiameterPx: 100,
      viewportWidthPx: 768,
    });
    expect(r.totalWidthPx).toBeLessThanOrEqual(768 - 32);
  });

  it('360px viewport で 全幅 60% を超えないよう gap が縮む', () => {
    const r = computeG09SpacingPx({
      spacingLambdaMultiplier: 5.0, // 大 multiplier
      patchDiameterPx: 64,
      viewportWidthPx: 360,
    });
    // gap がクランプされて全幅 360-32=328 以下
    expect(r.totalWidthPx).toBeLessThanOrEqual(328);
  });

  it('multiplier 1.0 でも gap は最低 8px', () => {
    const r = computeG09SpacingPx({
      spacingLambdaMultiplier: 1.0,
      patchDiameterPx: 64,
      viewportWidthPx: 360,
    });
    expect(r.gapPx).toBeGreaterThanOrEqual(8);
  });

  it('カスタム horizontalPaddingPx も尊重', () => {
    const r = computeG09SpacingPx({
      spacingLambdaMultiplier: 1.5,
      patchDiameterPx: 64,
      viewportWidthPx: 360,
      horizontalPaddingPx: 64,
    });
    // allowedWidth = 360-64 = 296、64*3=192、gap*2 <= 104、gap <= 52
    expect(r.totalWidthPx).toBeLessThanOrEqual(296);
  });
});
