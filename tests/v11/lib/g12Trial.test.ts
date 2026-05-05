/**
 * G-12 trial 生成 / 採点 / spacing 倍率 → px 換算 / レイアウトの純関数テスト
 * （spec-v11.md §7.12）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG12Trial,
  computeG12FlankerOffsetPx,
  computeG12FlankerSpacingPx,
  computeG12StimulusLayout,
  G12_ALL_ORIENTATIONS,
  G12_FLANKER_COUNT,
  G12_GABOR_BASE_PARAMS,
  GAME12_V11,
  gradeG12,
  orientationToJaLabel,
  orientationToOrientationDeg,
  pickRandomOrientation,
  userAnswerOrientationToLabel,
} from '../../../src/lib/v11/g12Trial';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';

describe('g12Trial: spec', () => {
  it('GAME12_V11.totalDurationMs は 60_000（OPT-11 / OPT-12）', () => {
    expect(GAME12_V11.totalDurationMs).toBe(60_000);
  });

  it('GAME12_V11.correctRevealMs は 1500ms（screens.md S17-03）', () => {
    expect(GAME12_V11.correctRevealMs).toBe(1500);
  });

  it('G12_FLANKER_COUNT は 6（ヘキサゴン配置、components.md §15 GE-12）', () => {
    expect(G12_FLANKER_COUNT).toBe(6);
  });

  it('G12_ALL_ORIENTATIONS は vertical / horizontal / diagonalRight / diagonalLeft の 4 つ', () => {
    expect(G12_ALL_ORIENTATIONS).toEqual([
      'vertical',
      'horizontal',
      'diagonalRight',
      'diagonalLeft',
    ]);
  });

  it('G12_GABOR_BASE_PARAMS は cpd=4, contrast=0.5, sigmaDeg=0.5', () => {
    expect(G12_GABOR_BASE_PARAMS.cpd).toBe(4);
    expect(G12_GABOR_BASE_PARAMS.contrast).toBeCloseTo(0.5, 5);
    expect(G12_GABOR_BASE_PARAMS.sigmaDeg).toBeCloseTo(0.5, 5);
  });

  it('gameRegistry G-12 の paramRange は { min:1.2, max:4, initial:2, step:0.2 }', () => {
    const def = GAME_REGISTRY.find((g) => g.gameId === 'G-12');
    expect(def).toBeDefined();
    expect(def?.paramRange.min).toBeCloseTo(1.2, 5);
    expect(def?.paramRange.max).toBeCloseTo(4, 5);
    expect(def?.paramRange.initial).toBeCloseTo(2, 5);
    expect(def?.paramRange.step).toBeCloseTo(0.2, 5);
  });
});

describe('orientationToOrientationDeg', () => {
  it('vertical → 90°（垂直）', () => {
    expect(orientationToOrientationDeg('vertical')).toBe(90);
  });
  it('horizontal → 0°（水平）', () => {
    expect(orientationToOrientationDeg('horizontal')).toBe(0);
  });
  it('diagonalRight → 45°（右上がり）', () => {
    expect(orientationToOrientationDeg('diagonalRight')).toBe(45);
  });
  it('diagonalLeft → 135°（左上がり）', () => {
    expect(orientationToOrientationDeg('diagonalLeft')).toBe(135);
  });
});

describe('orientationToJaLabel', () => {
  it.each([
    ['vertical', '垂直'],
    ['horizontal', '水平'],
    ['diagonalRight', '斜め右'],
    ['diagonalLeft', '斜め左'],
  ] as const)('%s → 「%s」', (orient, label) => {
    expect(orientationToJaLabel(orient)).toBe(label);
  });
});

describe('userAnswerOrientationToLabel', () => {
  it('null → null', () => {
    expect(userAnswerOrientationToLabel(null)).toBeNull();
  });
  it('vertical → 「垂直」', () => {
    expect(userAnswerOrientationToLabel('vertical')).toBe('垂直');
  });
  it('diagonalLeft → 「斜め左」', () => {
    expect(userAnswerOrientationToLabel('diagonalLeft')).toBe('斜め左');
  });
});

describe('pickRandomOrientation', () => {
  it('rng=0.0 → vertical（idx=0）', () => {
    expect(pickRandomOrientation(() => 0)).toBe('vertical');
  });
  it('rng=0.3 → horizontal（idx=1）', () => {
    expect(pickRandomOrientation(() => 0.3)).toBe('horizontal');
  });
  it('rng=0.6 → diagonalRight（idx=2）', () => {
    expect(pickRandomOrientation(() => 0.6)).toBe('diagonalRight');
  });
  it('rng=0.9 → diagonalLeft（idx=3）', () => {
    expect(pickRandomOrientation(() => 0.9)).toBe('diagonalLeft');
  });
  it('rng=1.0（端値）でも 0〜3 範囲に収まる', () => {
    expect(['vertical', 'horizontal', 'diagonalRight', 'diagonalLeft']).toContain(
      pickRandomOrientation(() => 0.999999),
    );
  });
});

describe('buildG12Trial', () => {
  it('paramSpacingMultiplier=2.0 で 6 個 flanker と target 1 個を生成', () => {
    const t = buildG12Trial(2.0, () => 0.1);
    expect(t.flankers).toHaveLength(6);
    expect(t.flankerPlacements).toHaveLength(6);
    expect(t.target).toBeDefined();
    expect(t.paramSpacingMultiplier).toBeCloseTo(2.0, 5);
  });

  it('flanker 6 個はヘキサゴン頂点（30°/90°/150°/210°/270°/330°）に配置', () => {
    const t = buildG12Trial(2.0, () => 0.1);
    const expectedDegs = [30, 90, 150, 210, 270, 330];
    t.flankerPlacements.forEach((p, i) => {
      const deg = (p.angleRad * 180) / Math.PI;
      expect(deg).toBeCloseTo(expectedDegs[i], 5);
    });
  });

  it('target 向きと flanker 向きはどちらも 4 値のいずれか', () => {
    const t = buildG12Trial(2.0, () => 0.1);
    const validDegs = [0, 45, 90, 135];
    expect(validDegs).toContain(t.target.orientationDeg);
    for (const f of t.flankers) {
      expect(validDegs).toContain(f.orientationDeg);
    }
  });

  it('共通 GaborParams（cpd / contrast / sigma）が target / flanker 全部に反映', () => {
    const t = buildG12Trial(2.0, () => 0.5);
    expect(t.target.cpd).toBe(4);
    expect(t.target.contrast).toBeCloseTo(0.5, 5);
    expect(t.target.sigmaDeg).toBeCloseTo(0.5, 5);
    for (const f of t.flankers) {
      expect(f.cpd).toBe(4);
      expect(f.contrast).toBeCloseTo(0.5, 5);
      expect(f.sigmaDeg).toBeCloseTo(0.5, 5);
    }
  });

  it('paramSpacingMultiplier はクランプされる（min=1.0 / max=5.0）', () => {
    const t1 = buildG12Trial(0.5, () => 0.1);
    expect(t1.paramSpacingMultiplier).toBeCloseTo(1.0, 5);
    const t2 = buildG12Trial(10, () => 0.1);
    expect(t2.paramSpacingMultiplier).toBeCloseTo(5.0, 5);
  });

  it('phaseRad は 0〜2π の範囲', () => {
    const t = buildG12Trial(2.0, () => 0.5);
    expect(t.target.phaseRad).toBeGreaterThanOrEqual(0);
    expect(t.target.phaseRad).toBeLessThanOrEqual(2 * Math.PI + 1e-9);
    for (const f of t.flankers) {
      expect(f.phaseRad).toBeGreaterThanOrEqual(0);
      expect(f.phaseRad).toBeLessThanOrEqual(2 * Math.PI + 1e-9);
    }
  });

  it('rng が 0 で常に同じ結果（決定論）', () => {
    const t1 = buildG12Trial(2.0, () => 0);
    const t2 = buildG12Trial(2.0, () => 0);
    expect(t1.correctOrientation).toBe(t2.correctOrientation);
    expect(t1.target.orientationDeg).toBe(t2.target.orientationDeg);
  });

  it('correctOrientation は target.orientationDeg と整合', () => {
    const t = buildG12Trial(2.0, () => 0.5);
    expect(orientationToOrientationDeg(t.correctOrientation)).toBe(
      t.target.orientationDeg,
    );
  });
});

describe('gradeG12', () => {
  const baseTrial = buildG12Trial(2.0, () => 0.1);
  // 0.1 → vertical だと expect、ただし pickRandomOrientation は idx=floor(0.1*4)=0 → vertical
  it('正解と一致 → isCorrect=true', () => {
    const grading = gradeG12(baseTrial, baseTrial.correctOrientation);
    expect(grading.isCorrect).toBe(true);
    expect(grading.unattempted).toBe(false);
  });

  it('別の向きを選択 → isCorrect=false', () => {
    const wrong: 'horizontal' | 'diagonalRight' =
      baseTrial.correctOrientation === 'horizontal'
        ? 'diagonalRight'
        : 'horizontal';
    const grading = gradeG12(baseTrial, wrong);
    expect(grading.isCorrect).toBe(false);
    expect(grading.unattempted).toBe(false);
  });

  it('null（未回答）→ isCorrect=false, unattempted=true', () => {
    const grading = gradeG12(baseTrial, null);
    expect(grading.isCorrect).toBe(false);
    expect(grading.unattempted).toBe(true);
    expect(grading.userAnswer).toBeNull();
  });

  it('correctOrientation は trial の値をそのまま返す', () => {
    const grading = gradeG12(baseTrial, null);
    expect(grading.correctOrientation).toBe(baseTrial.correctOrientation);
  });
});

describe('computeG12StimulusLayout', () => {
  it('viewport 360px → patchSize 50', () => {
    expect(computeG12StimulusLayout(360).patchSizePx).toBe(50);
  });
  it('viewport 375px → patchSize 60', () => {
    expect(computeG12StimulusLayout(375).patchSizePx).toBe(60);
  });
  it('viewport 768px → patchSize 72', () => {
    expect(computeG12StimulusLayout(768).patchSizePx).toBe(72);
  });
  it('viewport 1280px → patchSize 80', () => {
    expect(computeG12StimulusLayout(1280).patchSizePx).toBe(80);
  });
  it('targetDiameterPx は patchSizePx と同値', () => {
    const l = computeG12StimulusLayout(375);
    expect(l.targetDiameterPx).toBe(l.patchSizePx);
  });
  it('オブジェクト引数 { widthPx, heightPx } も受け付ける', () => {
    expect(computeG12StimulusLayout({ widthPx: 360 }).patchSizePx).toBe(50);
  });
});

describe('computeG12FlankerSpacingPx', () => {
  it('targetDiameter=60、availableSize=400、spacing=2.0 → centerDistance=120, bounding=300', () => {
    const r = computeG12FlankerSpacingPx({
      spacingMultiplier: 2.0,
      targetDiameterPx: 60,
      availableSizePx: 400,
    });
    expect(r.clampedMultiplier).toBeCloseTo(2.0, 5);
    expect(r.centerDistancePx).toBeCloseTo(120, 5);
    expect(r.boundingSizePx).toBeCloseTo(300, 5);
  });

  it('availableSize が小さいと spacing がクランプされる', () => {
    // targetDiameter=60、availableSize=200 だと max spacing = (200-60)/(2*60) = 1.166...
    // ただし clamp の最小は 1.0 なので結局 1.166... を選ぶ
    const r = computeG12FlankerSpacingPx({
      spacingMultiplier: 4.0,
      targetDiameterPx: 60,
      availableSizePx: 200,
    });
    expect(r.clampedMultiplier).toBeLessThan(4.0);
    expect(r.boundingSizePx).toBeLessThanOrEqual(200);
  });

  it('spacing 1.0 が最小（最終クランプ）', () => {
    const r = computeG12FlankerSpacingPx({
      spacingMultiplier: 0.5,
      targetDiameterPx: 60,
      availableSizePx: 400,
    });
    expect(r.clampedMultiplier).toBeCloseTo(1.0, 5);
  });

  it('availableSize がたっぷりあれば spacing 4.0 もそのまま使える', () => {
    const r = computeG12FlankerSpacingPx({
      spacingMultiplier: 4.0,
      targetDiameterPx: 60,
      availableSizePx: 600,
    });
    expect(r.clampedMultiplier).toBeCloseTo(4.0, 5);
  });
});

describe('computeG12FlankerOffsetPx', () => {
  it('angle=0 (右), distance=2 → x=120, y=0（targetDiameter=60）', () => {
    const r = computeG12FlankerOffsetPx(
      { angleRad: 0, distanceMultiplier: 2 },
      60,
    );
    expect(r.xPx).toBeCloseTo(120, 5);
    expect(r.yPx).toBeCloseTo(0, 5);
  });

  it('angle=π/2 (下), distance=2 → x=0, y=120', () => {
    const r = computeG12FlankerOffsetPx(
      { angleRad: Math.PI / 2, distanceMultiplier: 2 },
      60,
    );
    expect(r.xPx).toBeCloseTo(0, 5);
    expect(r.yPx).toBeCloseTo(120, 5);
  });

  it('angle=π (左), distance=2 → x=-120, y=0', () => {
    const r = computeG12FlankerOffsetPx(
      { angleRad: Math.PI, distanceMultiplier: 2 },
      60,
    );
    expect(r.xPx).toBeCloseTo(-120, 5);
    expect(r.yPx).toBeCloseTo(0, 5);
  });

  it('angle=30°, distance=2 → 期待 (cos30°, sin30°)*120', () => {
    const angle = (30 * Math.PI) / 180;
    const r = computeG12FlankerOffsetPx(
      { angleRad: angle, distanceMultiplier: 2 },
      60,
    );
    expect(r.xPx).toBeCloseTo(120 * Math.cos(angle), 4);
    expect(r.yPx).toBeCloseTo(120 * Math.sin(angle), 4);
  });

  it('distance=0 → 中心（x=0, y=0）', () => {
    const r = computeG12FlankerOffsetPx(
      { angleRad: Math.PI / 4, distanceMultiplier: 0 },
      60,
    );
    expect(r.xPx).toBeCloseTo(0, 5);
    expect(r.yPx).toBeCloseTo(0, 5);
  });
});
