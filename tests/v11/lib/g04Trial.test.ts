/**
 * G-04 trial 生成 / 採点 / レイアウトの純関数テスト（spec-v11.md §7.4）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG04Trial,
  computeG04StimulusLayout,
  G04_BASE_CONTRAST,
  G04_GABOR_PARAMS,
  GAME4_V11,
  gradeG04,
  sideToContrastJaLabel,
  userAnswerToContrastLabel,
} from '../../../src/lib/v11/g04Trial';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';

describe('g04Trial: spec', () => {
  it('GAME4_V11.totalDurationMs は 60_000（OPT-11 / OPT-12）', () => {
    expect(GAME4_V11.totalDurationMs).toBe(60_000);
  });

  it('GAME4_V11.fixationDurationMs は 500ms（screens.md S12-02 フェーズ）', () => {
    expect(GAME4_V11.fixationDurationMs).toBe(500);
  });

  it('G04_GABOR_PARAMS は cpd=3, sigmaDeg=0.6（spec §6.1 / §7.4）', () => {
    expect(G04_GABOR_PARAMS.cpd).toBe(3);
    expect(G04_GABOR_PARAMS.sigmaDeg).toBeCloseTo(0.6, 5);
  });

  it('G04_BASE_CONTRAST は 0.3（左右コントラストが §6.1 範囲内に収まる中央値）', () => {
    expect(G04_BASE_CONTRAST).toBeCloseTo(0.3, 5);
  });

  it('gameRegistry G-04 の paramRange は { min:0.02, max:0.12, initial:0.06, step:0.01 }（v1.1.4 難化）', () => {
    const def = GAME_REGISTRY.find((g) => g.gameId === 'G-04');
    expect(def).toBeDefined();
    expect(def?.paramRange.min).toBeCloseTo(0.02, 5);
    expect(def?.paramRange.max).toBeCloseTo(0.12, 5);
    expect(def?.paramRange.initial).toBeCloseTo(0.06, 5);
    expect(def?.paramRange.step).toBeCloseTo(0.01, 5);
  });
});

describe('buildG04Trial: 試行生成', () => {
  it('paramValueContrast=0.15 で左右コントラスト差は 0.15（基準 ±0.075）', () => {
    const trial = buildG04Trial(0.15, () => 0.4);
    const diff = Math.abs(trial.left.contrast - trial.right.contrast);
    expect(diff).toBeCloseTo(0.15, 5);
  });

  it('paramValueContrast=0.05（最難）で左右差 0.05', () => {
    const trial = buildG04Trial(0.05, () => 0.4);
    const diff = Math.abs(trial.left.contrast - trial.right.contrast);
    expect(diff).toBeCloseTo(0.05, 5);
  });

  it('paramValueContrast=0.3（最易）で左右差 0.30', () => {
    const trial = buildG04Trial(0.3, () => 0.4);
    const diff = Math.abs(trial.left.contrast - trial.right.contrast);
    expect(diff).toBeCloseTo(0.3, 5);
  });

  it('rng < 0.5 のとき correctSide=left（高コントラスト側が左）', () => {
    // rng()=0.4 → 1 回目で base orientation, 2 回目で correctSide 判定 0.4<0.5 → left
    const trial = buildG04Trial(0.15, () => 0.4);
    expect(trial.correctSide).toBe('left');
    expect(trial.left.contrast).toBeGreaterThan(trial.right.contrast);
  });

  it('rng >= 0.5 のとき correctSide=right（高コントラスト側が右）', () => {
    const trial = buildG04Trial(0.15, () => 0.6);
    expect(trial.correctSide).toBe('right');
    expect(trial.right.contrast).toBeGreaterThan(trial.left.contrast);
  });

  it('左右の orientation は同一（spec §7.4「向き・cpd 同一」）', () => {
    const trial = buildG04Trial(0.15, () => 0.3);
    expect(trial.left.orientationDeg).toBeCloseTo(
      trial.right.orientationDeg,
      5,
    );
  });

  it('左右の cpd は同一', () => {
    const trial = buildG04Trial(0.15, () => 0.3);
    expect(trial.left.cpd).toBe(trial.right.cpd);
    expect(trial.left.cpd).toBe(3);
  });

  it('左右の sigmaDeg は同一', () => {
    const trial = buildG04Trial(0.15, () => 0.3);
    expect(trial.left.sigmaDeg).toBeCloseTo(trial.right.sigmaDeg, 5);
    expect(trial.left.sigmaDeg).toBeCloseTo(0.6, 5);
  });

  it('左右コントラストは 0〜1 の範囲（クランプ済み）', () => {
    for (const seed of [0, 0.25, 0.5, 0.75, 0.99]) {
      const trial = buildG04Trial(0.3, () => seed);
      expect(trial.left.contrast).toBeGreaterThanOrEqual(0);
      expect(trial.left.contrast).toBeLessThanOrEqual(1);
      expect(trial.right.contrast).toBeGreaterThanOrEqual(0);
      expect(trial.right.contrast).toBeLessThanOrEqual(1);
    }
  });

  it('paramValueContrast, baseContrast, correctSide が trial に含まれる', () => {
    const trial = buildG04Trial(0.15, () => 0.3);
    expect(trial.paramValueContrast).toBeCloseTo(0.15, 5);
    expect(trial.baseContrast).toBeCloseTo(0.3, 5);
    expect(['left', 'right']).toContain(trial.correctSide);
  });

  it('initial 値 0.15 で左右コントラストが §6.1 範囲（0.05〜0.6）内に収まる', () => {
    // 中央 0.3 ± 0.075 = [0.225, 0.375] なので余裕あり
    const trial = buildG04Trial(0.15, () => 0.4);
    expect(trial.left.contrast).toBeGreaterThanOrEqual(0.05);
    expect(trial.left.contrast).toBeLessThanOrEqual(0.6);
    expect(trial.right.contrast).toBeGreaterThanOrEqual(0.05);
    expect(trial.right.contrast).toBeLessThanOrEqual(0.6);
  });

  it('max 値 0.3 でも左右コントラストが §6.1 範囲（0.05〜0.6）内に収まる', () => {
    // 中央 0.3 ± 0.15 = [0.15, 0.45] なので OK
    const trial = buildG04Trial(0.3, () => 0.4);
    expect(trial.left.contrast).toBeGreaterThanOrEqual(0.05);
    expect(trial.left.contrast).toBeLessThanOrEqual(0.6);
    expect(trial.right.contrast).toBeGreaterThanOrEqual(0.05);
    expect(trial.right.contrast).toBeLessThanOrEqual(0.6);
  });

  it('correctSide=left のとき left.contrast > right.contrast', () => {
    const trial = buildG04Trial(0.15, () => 0.4);
    expect(trial.correctSide).toBe('left');
    // 中央 0.3、half=0.075 → leftIsHigh → left=0.375、right=0.225
    expect(trial.left.contrast).toBeCloseTo(0.375, 5);
    expect(trial.right.contrast).toBeCloseTo(0.225, 5);
  });

  it('correctSide=right のとき right.contrast > left.contrast', () => {
    const trial = buildG04Trial(0.15, () => 0.6);
    expect(trial.correctSide).toBe('right');
    expect(trial.right.contrast).toBeCloseTo(0.375, 5);
    expect(trial.left.contrast).toBeCloseTo(0.225, 5);
  });

  it('phaseRad は左右独立にランダム（rng が呼ばれる回数）', () => {
    let rngCalls = 0;
    const rng = () => {
      rngCalls += 1;
      return 0.4;
    };
    buildG04Trial(0.15, rng);
    // 1) base orientation 2) correctSide 3) left phase 4) right phase = 4 回
    expect(rngCalls).toBeGreaterThanOrEqual(4);
  });
});

describe('gradeG04: 採点', () => {
  it('正解側を選択 → isCorrect=true', () => {
    const trial = buildG04Trial(0.15, () => 0.4); // correctSide=left
    const result = gradeG04(trial, 'left');
    expect(result.isCorrect).toBe(true);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswer).toBe('left');
    expect(result.correctSide).toBe('left');
  });

  it('不正解側を選択 → isCorrect=false', () => {
    const trial = buildG04Trial(0.15, () => 0.4); // correctSide=left
    const result = gradeG04(trial, 'right');
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswer).toBe('right');
  });

  it('未回答（null）→ isCorrect=false, unattempted=true', () => {
    const trial = buildG04Trial(0.15, () => 0.4);
    const result = gradeG04(trial, null);
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(true);
    expect(result.userAnswer).toBeNull();
  });

  it('correctSide=right で right を選択 → 正解', () => {
    const trial = buildG04Trial(0.15, () => 0.6); // correctSide=right
    const result = gradeG04(trial, 'right');
    expect(result.isCorrect).toBe(true);
  });
});

describe('sideToContrastJaLabel / userAnswerToContrastLabel', () => {
  it('left → 「左が濃い」', () => {
    expect(sideToContrastJaLabel('left')).toBe('左が濃い');
  });
  it('right → 「右が濃い」', () => {
    expect(sideToContrastJaLabel('right')).toBe('右が濃い');
  });
  it('userAnswerToContrastLabel(null) → null', () => {
    expect(userAnswerToContrastLabel(null)).toBeNull();
  });
  it('userAnswerToContrastLabel("left") → 「左が濃い」', () => {
    expect(userAnswerToContrastLabel('left')).toBe('左が濃い');
  });
});

describe('computeG04StimulusLayout: レスポンシブ（screens.md S12-02 §5）', () => {
  it('width=360 で 100×100, gap 24', () => {
    expect(computeG04StimulusLayout(360)).toEqual({
      patchSizePx: 100,
      gapPx: 24,
    });
  });

  it('width=375 で 120×120, gap 32', () => {
    expect(computeG04StimulusLayout(375)).toEqual({
      patchSizePx: 120,
      gapPx: 32,
    });
  });

  it('width=768 で 140×140, gap 48', () => {
    expect(computeG04StimulusLayout(768)).toEqual({
      patchSizePx: 140,
      gapPx: 48,
    });
  });

  it('width=1280 で 160×160, gap 64', () => {
    expect(computeG04StimulusLayout(1280)).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('width=1280, height=800（PC 横） で 160×160, gap 64', () => {
    expect(
      computeG04StimulusLayout({ widthPx: 1280, heightPx: 800 }),
    ).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('width=375, height=667 で 120×120, gap 32（モバイル縦）', () => {
    expect(
      computeG04StimulusLayout({ widthPx: 375, heightPx: 667 }),
    ).toEqual({
      patchSizePx: 120,
      gapPx: 32,
    });
  });

  it('数値 1 個（width のみ）でも呼べる：1280 → 160/64', () => {
    expect(computeG04StimulusLayout(1280)).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('引数 2 個（width, height）でも呼べる：1280, 800 → 160/64', () => {
    expect(computeG04StimulusLayout(1280, 800)).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('safety：高さが極端に小さいとパッチを 1 段落とす', () => {
    const layout = computeG04StimulusLayout({ widthPx: 1280, heightPx: 200 });
    expect(layout.patchSizePx).toBeLessThanOrEqual(140);
  });
});
