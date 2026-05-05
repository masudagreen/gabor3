/**
 * G-08 trial 生成 / 採点 / レイアウトの純関数テスト（spec-v11.md §7.8）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  adapterOrientationDeg,
  buildG08Trial,
  computeG08StimulusLayout,
  directionToJaLabel,
  directionToOrientationDeg,
  directionToShortJaLabel,
  G08_ADAPTER_CONTRAST,
  G08_ADAPTER_TILT_DEG,
  G08_GABOR_BASE_PARAMS,
  G08_TEST_CONTRAST,
  GAME8_V11,
  gradeG08,
  gradeG08BySide,
  userAnswerDirectionToLabel,
} from '../../../src/lib/v11/g08Trial';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';

describe('g08Trial: spec', () => {
  it('GAME8_V11.totalDurationMs は 60_000（OPT-11 / OPT-12）', () => {
    expect(GAME8_V11.totalDurationMs).toBe(60_000);
  });

  it('GAME8_V11.fixationDurationMs は 500ms', () => {
    expect(GAME8_V11.fixationDurationMs).toBe(500);
  });

  it('GAME8_V11.correctRevealMs は 1500ms（screens.md S15-03）', () => {
    expect(GAME8_V11.correctRevealMs).toBe(1500);
  });

  it('G08_ADAPTER_TILT_DEG は 20（spec §7.8「傾き 20° 固定」）', () => {
    expect(G08_ADAPTER_TILT_DEG).toBe(20);
  });

  it('G08_ADAPTER_CONTRAST は 0.6（spec §7.8 高コントラスト）', () => {
    expect(G08_ADAPTER_CONTRAST).toBeCloseTo(0.6, 5);
  });

  it('G08_TEST_CONTRAST は 0.4（adapter より一段控えめ）', () => {
    expect(G08_TEST_CONTRAST).toBeCloseTo(0.4, 5);
  });

  it('G08_GABOR_BASE_PARAMS は cpd=4, sigmaDeg=0.6（spec §6.1 中域）', () => {
    expect(G08_GABOR_BASE_PARAMS.cpd).toBe(4);
    expect(G08_GABOR_BASE_PARAMS.sigmaDeg).toBeCloseTo(0.6, 5);
  });

  it('gameRegistry G-08 の paramRange は { min:1, max:10, initial:5, step:1 }', () => {
    const def = GAME_REGISTRY.find((g) => g.gameId === 'G-08');
    expect(def).toBeDefined();
    expect(def?.paramRange.min).toBe(1);
    expect(def?.paramRange.max).toBe(10);
    expect(def?.paramRange.initial).toBe(5);
    expect(def?.paramRange.step).toBe(1);
  });
});

describe('adapterOrientationDeg / directionToOrientationDeg', () => {
  it('adapter は orientationDeg = 90 + 20 = 110', () => {
    expect(adapterOrientationDeg()).toBe(110);
  });

  it('cw 5° → orientationDeg 95', () => {
    expect(directionToOrientationDeg('cw', 5)).toBe(95);
  });

  it('ccw 5° → orientationDeg 85', () => {
    expect(directionToOrientationDeg('ccw', 5)).toBe(85);
  });

  it('cw 10° → orientationDeg 100', () => {
    expect(directionToOrientationDeg('cw', 10)).toBe(100);
  });

  it('ccw 10° → orientationDeg 80', () => {
    expect(directionToOrientationDeg('ccw', 10)).toBe(80);
  });
});

describe('buildG08Trial: 試行生成', () => {
  it('paramAngleDeg=5（初期）でテストパッチの傾き絶対値は 5°', () => {
    const trial = buildG08Trial(5, () => 0.4); // correctDirection=cw
    expect(trial.paramAngleDeg).toBe(5);
    // cw → orientationDeg = 95（adapter は 110）
    expect(trial.test.orientationDeg).toBe(95);
  });

  it('paramAngleDeg=1（最難）でテストパッチの傾きは 1°', () => {
    const trial = buildG08Trial(1, () => 0.4);
    expect(trial.paramAngleDeg).toBe(1);
    expect(trial.test.orientationDeg).toBe(91);
  });

  it('paramAngleDeg=10（最易）でテストパッチの傾きは 10°', () => {
    const trial = buildG08Trial(10, () => 0.4);
    expect(trial.paramAngleDeg).toBe(10);
    expect(trial.test.orientationDeg).toBe(100);
  });

  it('rng < 0.5 → correctDirection=cw（時計回り）', () => {
    const trial = buildG08Trial(5, () => 0.4);
    expect(trial.correctDirection).toBe('cw');
    // cw → orientationDeg > 90
    expect(trial.test.orientationDeg).toBeGreaterThan(90);
  });

  it('rng >= 0.5 → correctDirection=ccw（反時計回り）', () => {
    const trial = buildG08Trial(5, () => 0.6);
    expect(trial.correctDirection).toBe('ccw');
    // ccw → orientationDeg < 90
    expect(trial.test.orientationDeg).toBeLessThan(90);
  });

  it('adapter の orientationDeg は常に 110（傾き 20° 固定 / cw）', () => {
    expect(buildG08Trial(5, () => 0.4).adapter.orientationDeg).toBe(110);
    expect(buildG08Trial(5, () => 0.6).adapter.orientationDeg).toBe(110);
    expect(buildG08Trial(1, () => 0.1).adapter.orientationDeg).toBe(110);
  });

  it('adapter の contrast は 0.6（高コントラスト）', () => {
    const trial = buildG08Trial(5, () => 0.4);
    expect(trial.adapter.contrast).toBeCloseTo(0.6, 5);
  });

  it('test の contrast は 0.4（中コントラスト）', () => {
    const trial = buildG08Trial(5, () => 0.4);
    expect(trial.test.contrast).toBeCloseTo(0.4, 5);
  });

  it('adapter / test の cpd は 4 で共通', () => {
    const trial = buildG08Trial(5, () => 0.4);
    expect(trial.adapter.cpd).toBe(4);
    expect(trial.test.cpd).toBe(4);
  });

  it('adapter / test の sigmaDeg は 0.6 で共通', () => {
    const trial = buildG08Trial(5, () => 0.4);
    expect(trial.adapter.sigmaDeg).toBeCloseTo(0.6, 5);
    expect(trial.test.sigmaDeg).toBeCloseTo(0.6, 5);
  });

  it('phaseRad は adapter / test 独立にランダム（rng 呼び出し回数）', () => {
    let rngCalls = 0;
    const rng = () => {
      rngCalls += 1;
      return 0.4;
    };
    buildG08Trial(5, rng);
    // 1) correctDirection 2) adapter phase 3) test phase = 3 回以上
    expect(rngCalls).toBeGreaterThanOrEqual(3);
  });

  it('paramAngleDeg <= 0 のクラッシュ防止：下限 0.0001 にクランプ', () => {
    const trial = buildG08Trial(0, () => 0.4);
    // 0 はクランプされて非常に小さな値になるが、クラッシュなし
    expect(trial.paramAngleDeg).toBeGreaterThan(0);
    expect(trial.test.orientationDeg).toBeCloseTo(90, 3); // ほぼ垂直
  });

  it('correctDirection=cw のとき test.orientationDeg = 90 + paramAngleDeg', () => {
    const trial = buildG08Trial(7, () => 0.4);
    expect(trial.correctDirection).toBe('cw');
    expect(trial.test.orientationDeg).toBe(97);
  });

  it('correctDirection=ccw のとき test.orientationDeg = 90 - paramAngleDeg', () => {
    const trial = buildG08Trial(7, () => 0.6);
    expect(trial.correctDirection).toBe('ccw');
    expect(trial.test.orientationDeg).toBe(83);
  });
});

describe('gradeG08: 採点', () => {
  it('正解方向（cw）を選択 → isCorrect=true', () => {
    const trial = buildG08Trial(5, () => 0.4); // correctDirection=cw
    const result = gradeG08(trial, 'cw');
    expect(result.isCorrect).toBe(true);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswer).toBe('cw');
    expect(result.correctDirection).toBe('cw');
  });

  it('不正解方向（ccw）を選択 → isCorrect=false', () => {
    const trial = buildG08Trial(5, () => 0.4); // correctDirection=cw
    const result = gradeG08(trial, 'ccw');
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswer).toBe('ccw');
  });

  it('未回答（null）→ isCorrect=false, unattempted=true', () => {
    const trial = buildG08Trial(5, () => 0.4);
    const result = gradeG08(trial, null);
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(true);
    expect(result.userAnswer).toBeNull();
  });

  it('correctDirection=ccw で ccw 選択 → 正解', () => {
    const trial = buildG08Trial(5, () => 0.6); // correctDirection=ccw
    const result = gradeG08(trial, 'ccw');
    expect(result.isCorrect).toBe(true);
  });
});

describe('directionToJaLabel / directionToShortJaLabel / userAnswerDirectionToLabel', () => {
  it('cw → 「下のパッチは時計回り」', () => {
    expect(directionToJaLabel('cw')).toBe('下のパッチは時計回り');
  });

  it('ccw → 「下のパッチは反時計回り」', () => {
    expect(directionToJaLabel('ccw')).toBe('下のパッチは反時計回り');
  });

  it('短縮 cw → 「時計回り」', () => {
    expect(directionToShortJaLabel('cw')).toBe('時計回り');
  });

  it('短縮 ccw → 「反時計回り」', () => {
    expect(directionToShortJaLabel('ccw')).toBe('反時計回り');
  });

  it('userAnswerDirectionToLabel(null) → null', () => {
    expect(userAnswerDirectionToLabel(null)).toBeNull();
  });

  it('userAnswerDirectionToLabel("cw") → 「下のパッチは時計回り」', () => {
    expect(userAnswerDirectionToLabel('cw')).toBe('下のパッチは時計回り');
  });

  it('userAnswerDirectionToLabel("ccw") → 「下のパッチは反時計回り」', () => {
    expect(userAnswerDirectionToLabel('ccw')).toBe('下のパッチは反時計回り');
  });
});

describe('computeG08StimulusLayout: レスポンシブ（screens.md §4 / components.md §15 GE-08）', () => {
  it('width=360 で 120×120, gap 24', () => {
    expect(computeG08StimulusLayout(360)).toEqual({
      patchSizePx: 120,
      gapPx: 24,
    });
  });

  it('width=375 で 140×140, gap 32', () => {
    expect(computeG08StimulusLayout(375)).toEqual({
      patchSizePx: 140,
      gapPx: 32,
    });
  });

  it('width=768 で 160×160, gap 40', () => {
    expect(computeG08StimulusLayout(768)).toEqual({
      patchSizePx: 160,
      gapPx: 40,
    });
  });

  it('width=1280 で 180×180, gap 48', () => {
    expect(computeG08StimulusLayout(1280)).toEqual({
      patchSizePx: 180,
      gapPx: 48,
    });
  });

  it('width=1280, height=800（PC 横）で 180×180, gap 48', () => {
    expect(
      computeG08StimulusLayout({ widthPx: 1280, heightPx: 800 }),
    ).toEqual({
      patchSizePx: 180,
      gapPx: 48,
    });
  });

  it('数値 1 個（width のみ）でも呼べる：1280 → 180/48', () => {
    expect(computeG08StimulusLayout(1280)).toEqual({
      patchSizePx: 180,
      gapPx: 48,
    });
  });

  it('引数 2 個（width, height）でも呼べる：1280, 800 → 180/48', () => {
    expect(computeG08StimulusLayout(1280, 800)).toEqual({
      patchSizePx: 180,
      gapPx: 48,
    });
  });

  it('safety：高さが極端に小さいとパッチを 1 段落とす', () => {
    const layout = computeG08StimulusLayout({ widthPx: 1280, heightPx: 200 });
    expect(layout.patchSizePx).toBeLessThanOrEqual(160);
  });

  it('safety：高さが小さくても下限 120 で止まる（360px width 帯）', () => {
    const layout = computeG08StimulusLayout({ widthPx: 360, heightPx: 100 });
    expect(layout.patchSizePx).toBeGreaterThanOrEqual(120);
  });
});

// ===========================================================================
// Sprint 20-C：v1.1.1 改訂、下部 2 テストパッチ + side ベース採点
// ===========================================================================

describe('buildG08Trial: Sprint 20-C 下部 2 テストパッチ', () => {
  it('testLeft / testRight が必ず存在する（v1.1.1 改訂）', () => {
    const trial = buildG08Trial(5, () => 0.4);
    expect(trial.testLeft).toBeDefined();
    expect(trial.testRight).toBeDefined();
    expect(trial.testLeft.cpd).toBe(4);
    expect(trial.testRight.cpd).toBe(4);
  });

  it('testLeft / testRight は ±絶対角度で対称配置される', () => {
    const trial = buildG08Trial(5, () => 0.4); // correctDirection=cw
    // 一方は cw 5°（orientationDeg=95）、他方は ccw 5°（orientationDeg=85）
    const orientations = [
      trial.testLeft.orientationDeg,
      trial.testRight.orientationDeg,
    ];
    expect(orientations.sort()).toEqual([85, 95]);
  });

  it('correctSide が "left" or "right"', () => {
    const trial = buildG08Trial(5, () => 0.4);
    expect(['left', 'right']).toContain(trial.correctSide);
  });

  it('correctSide のテストパッチは correctDirection と一致する向き', () => {
    const trial = buildG08Trial(5, () => 0.4); // correctDirection=cw
    const correctTest =
      trial.correctSide === 'left' ? trial.testLeft : trial.testRight;
    // cw → orientationDeg = 95
    expect(correctTest.orientationDeg).toBe(95);
  });

  it('correctSide の反対側パッチは反対方向（同じ絶対角度）', () => {
    const trial = buildG08Trial(7, () => 0.4); // correctDirection=cw
    const oppositeTest =
      trial.correctSide === 'left' ? trial.testRight : trial.testLeft;
    expect(oppositeTest.orientationDeg).toBe(83); // 90 - 7
  });

  it('paramAngleDeg=10（最易）でも左右対称配置（80 / 100）', () => {
    const trial = buildG08Trial(10, () => 0.4);
    const orientations = [
      trial.testLeft.orientationDeg,
      trial.testRight.orientationDeg,
    ].sort((a, b) => a - b);
    expect(orientations).toEqual([80, 100]);
  });

  it('paramAngleDeg=1（最難）でも左右対称配置（89 / 91）', () => {
    const trial = buildG08Trial(1, () => 0.4);
    const orientations = [
      trial.testLeft.orientationDeg,
      trial.testRight.orientationDeg,
    ].sort((a, b) => a - b);
    expect(orientations).toEqual([89, 91]);
  });
});

describe('gradeG08BySide: 下部 2 パッチ直接選択用採点', () => {
  it('正解側を選択 → isCorrect=true, userAnswerSide が記録', () => {
    const trial = buildG08Trial(5, () => 0.4);
    const result = gradeG08BySide(trial, trial.correctSide);
    expect(result.isCorrect).toBe(true);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswerSide).toBe(trial.correctSide);
    expect(result.correctSide).toBe(trial.correctSide);
  });

  it('不正解側を選択 → isCorrect=false', () => {
    const trial = buildG08Trial(5, () => 0.4);
    const wrong: 'left' | 'right' = trial.correctSide === 'left' ? 'right' : 'left';
    const result = gradeG08BySide(trial, wrong);
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswerSide).toBe(wrong);
  });

  it('未回答（null）→ isCorrect=false, unattempted=true', () => {
    const trial = buildG08Trial(5, () => 0.4);
    const result = gradeG08BySide(trial, null);
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(true);
    expect(result.userAnswerSide).toBeNull();
  });

  it('userAnswer（cw/ccw）も埋まる：正解時は correctDirection と一致', () => {
    const trial = buildG08Trial(5, () => 0.4); // correctDirection=cw
    const result = gradeG08BySide(trial, trial.correctSide);
    expect(result.userAnswer).toBe('cw');
  });

  it('userAnswer（cw/ccw）も埋まる：不正解時は反対方向', () => {
    const trial = buildG08Trial(5, () => 0.4); // correctDirection=cw
    const wrong: 'left' | 'right' = trial.correctSide === 'left' ? 'right' : 'left';
    const result = gradeG08BySide(trial, wrong);
    expect(result.userAnswer).toBe('ccw');
  });
});
