/**
 * G-11 trial 生成 / 採点 / arcmin 換算 / レイアウトの純関数テスト（spec-v11.md §7.11）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  arcminToPx,
  arcminToVisiblePx,
  buildG11Trial,
  computeG11LowerOffsetPx,
  computeG11StimulusLayout,
  directionToJaLabel,
  directionToShortJaLabel,
  G11_ALL_DIRECTIONS,
  G11_GABOR_PARAMS,
  G11_VERTICAL_ORIENTATION_DEG,
  GAME11_V11,
  gradeG11,
  gradeG11BySide,
  userAnswerDirectionToLabel,
} from '../../../src/lib/v11/g11Trial';
import { GAME_REGISTRY } from '../../../src/state/gameRegistry';
import { pixelsPerDegree } from '../../../src/lib/calibration';

describe('g11Trial: spec', () => {
  it('GAME11_V11.totalDurationMs は 60_000（OPT-11 / OPT-12）', () => {
    expect(GAME11_V11.totalDurationMs).toBe(60_000);
  });

  it('GAME11_V11.correctRevealMs は 1500ms（screens.md S16-06）', () => {
    expect(GAME11_V11.correctRevealMs).toBe(1500);
  });

  it('G11_VERTICAL_ORIENTATION_DEG は 90（垂直、GaborPatch 規約）', () => {
    expect(G11_VERTICAL_ORIENTATION_DEG).toBe(90);
  });

  it('G11_GABOR_PARAMS は cpd=6（高 cpd）, contrast=0.5, sigmaDeg=0.5', () => {
    expect(G11_GABOR_PARAMS.cpd).toBe(6);
    expect(G11_GABOR_PARAMS.contrast).toBeCloseTo(0.5, 5);
    expect(G11_GABOR_PARAMS.sigmaDeg).toBeCloseTo(0.5, 5);
  });

  it('gameRegistry G-11 の paramRange は { min:0.5, max:5, initial:2, step:0.2 }', () => {
    const def = GAME_REGISTRY.find((g) => g.gameId === 'G-11');
    expect(def).toBeDefined();
    expect(def?.paramRange.min).toBeCloseTo(0.5, 5);
    expect(def?.paramRange.max).toBeCloseTo(5, 5);
    expect(def?.paramRange.initial).toBeCloseTo(2, 5);
    expect(def?.paramRange.step).toBeCloseTo(0.2, 5);
  });

  it('G11_ALL_DIRECTIONS は left / right の 2 方向', () => {
    expect(G11_ALL_DIRECTIONS).toEqual(['left', 'right']);
  });
});

describe('directionToJaLabel / directionToShortJaLabel', () => {
  it('left → 「下のパッチは左にずれている」', () => {
    expect(directionToJaLabel('left')).toBe('下のパッチは左にずれている');
  });
  it('right → 「下のパッチは右にずれている」', () => {
    expect(directionToJaLabel('right')).toBe('下のパッチは右にずれている');
  });
  it('left short → 「左にずれている」', () => {
    expect(directionToShortJaLabel('left')).toBe('左にずれている');
  });
  it('right short → 「右にずれている」', () => {
    expect(directionToShortJaLabel('right')).toBe('右にずれている');
  });
});

describe('userAnswerDirectionToLabel', () => {
  it('null → null', () => {
    expect(userAnswerDirectionToLabel(null)).toBeNull();
  });
  it('left → 「下のパッチは左にずれている」', () => {
    expect(userAnswerDirectionToLabel('left')).toBe('下のパッチは左にずれている');
  });
});

describe('arcminToPx: 角度視野分 → ピクセル換算（spec §6.2）', () => {
  it('1° = 60 arcmin → pixelsPerDegree と整合', () => {
    // distance=40cm, dpi=460（iphone）
    const ppd = pixelsPerDegree(40, 460);
    const px60 = arcminToPx(60, 40, 460);
    expect(px60).toBeCloseTo(ppd, 4);
  });

  it('arcmin = 0 → 0px', () => {
    expect(arcminToPx(0, 40, 460)).toBe(0);
  });

  it('iphone 40cm: 2 arcmin ≈ 4.2px', () => {
    const px = arcminToPx(2, 40, 460);
    // ppd ≈ 126.5、px/arcmin ≈ 2.108
    expect(px).toBeGreaterThan(4);
    expect(px).toBeLessThan(5);
  });

  it('pc 40cm: 2 arcmin ≈ 1.0px（低 dpi）', () => {
    const px = arcminToPx(2, 40, 110);
    // ppd ≈ 30.24、px/arcmin ≈ 0.504
    expect(px).toBeGreaterThan(0.9);
    expect(px).toBeLessThan(1.1);
  });

  it('距離が 2 倍になると px も 2 倍', () => {
    const a = arcminToPx(2, 40, 460);
    const b = arcminToPx(2, 80, 460);
    expect(b / a).toBeCloseTo(2, 3);
  });

  it('dpi が 2 倍になると px も 2 倍', () => {
    const a = arcminToPx(2, 40, 200);
    const b = arcminToPx(2, 40, 400);
    expect(b / a).toBeCloseTo(2, 3);
  });

  it('負値は 0 にクランプ', () => {
    expect(arcminToPx(-1, 40, 460)).toBe(0);
  });
});

describe('arcminToVisiblePx: 視認可能下限を適用', () => {
  it('arcmin=0 → 0px（ズレなし）', () => {
    expect(
      arcminToVisiblePx({ arcminVal: 0, distanceCm: 40, dpi: 460 }),
    ).toBe(0);
  });

  it('arcmin=2 / iphone → そのまま（>=1px）', () => {
    const px = arcminToVisiblePx({ arcminVal: 2, distanceCm: 40, dpi: 460 });
    expect(px).toBeGreaterThanOrEqual(1);
    // 約 4.2px のはず
    expect(px).toBeGreaterThan(4);
  });

  it('arcmin=0.5 / pc → 0.25px だが minVisiblePx=1 でクランプ', () => {
    const px = arcminToVisiblePx({ arcminVal: 0.5, distanceCm: 40, dpi: 110 });
    expect(px).toBe(1);
  });

  it('minVisiblePx=2 を渡すと最低 2px', () => {
    const px = arcminToVisiblePx({
      arcminVal: 0.5,
      distanceCm: 40,
      dpi: 110,
      minVisiblePx: 2,
    });
    expect(px).toBe(2);
  });

  it('arcmin が大きい場合は実 px が下限を上回るのでそのまま', () => {
    const px = arcminToVisiblePx({
      arcminVal: 5,
      distanceCm: 40,
      dpi: 460,
      minVisiblePx: 1,
    });
    expect(px).toBeGreaterThan(5);
  });
});

describe('buildG11Trial: 1 試行生成', () => {
  it('上下 2 ガボール spec を生成（垂直、共通 cpd / contrast / sigma）', () => {
    const trial = buildG11Trial(2, () => 0.5);
    expect(trial.upper.orientationDeg).toBe(90);
    expect(trial.lower.orientationDeg).toBe(90);
    expect(trial.upper.cpd).toBe(G11_GABOR_PARAMS.cpd);
    expect(trial.lower.cpd).toBe(G11_GABOR_PARAMS.cpd);
    expect(trial.upper.contrast).toBeCloseTo(G11_GABOR_PARAMS.contrast, 5);
    expect(trial.lower.contrast).toBeCloseTo(G11_GABOR_PARAMS.contrast, 5);
  });

  it('rng < 0.5 → left ズレ', () => {
    const trial = buildG11Trial(2, () => 0.3);
    expect(trial.correctDirection).toBe('left');
  });

  it('rng >= 0.5 → right ズレ', () => {
    const trial = buildG11Trial(2, () => 0.7);
    expect(trial.correctDirection).toBe('right');
  });

  it('paramOffsetArcmin はクランプ後の値を保持', () => {
    expect(buildG11Trial(2, () => 0.5).paramOffsetArcmin).toBe(2);
    expect(buildG11Trial(0.5, () => 0.5).paramOffsetArcmin).toBe(0.5);
    expect(buildG11Trial(5, () => 0.5).paramOffsetArcmin).toBe(5);
  });

  it('負値は 0 にクランプ', () => {
    expect(buildG11Trial(-1, () => 0.5).paramOffsetArcmin).toBe(0);
  });

  it('過大値（10 超）は 10 にクランプ', () => {
    expect(buildG11Trial(20, () => 0.5).paramOffsetArcmin).toBe(10);
  });

  it('phaseRad は独立（上下で異なる、rng 順序依存）', () => {
    const seq = [0.4, 0.1, 0.9]; // direction, upper phase, lower phase
    let i = 0;
    const trial = buildG11Trial(2, () => {
      const v = seq[i % seq.length];
      i += 1;
      return v;
    });
    // 0.1 * 2π ≈ 0.628、0.9 * 2π ≈ 5.65
    expect(trial.upper.phaseRad).not.toBeCloseTo(trial.lower.phaseRad, 4);
  });
});

describe('gradeG11: 採点', () => {
  it('left vs left → 正解', () => {
    const trial = buildG11Trial(2, () => 0.3); // left
    const grading = gradeG11(trial, 'left');
    expect(grading.isCorrect).toBe(true);
    expect(grading.unattempted).toBe(false);
  });

  it('left vs right → 不正解', () => {
    const trial = buildG11Trial(2, () => 0.3);
    const grading = gradeG11(trial, 'right');
    expect(grading.isCorrect).toBe(false);
    expect(grading.unattempted).toBe(false);
  });

  it('right vs right → 正解', () => {
    const trial = buildG11Trial(2, () => 0.7);
    const grading = gradeG11(trial, 'right');
    expect(grading.isCorrect).toBe(true);
  });

  it('null → 未回答 → 不正解', () => {
    const trial = buildG11Trial(2, () => 0.3);
    const grading = gradeG11(trial, null);
    expect(grading.unattempted).toBe(true);
    expect(grading.isCorrect).toBe(false);
    expect(grading.userAnswer).toBeNull();
  });
});

describe('computeG11LowerOffsetPx: 下パッチ符号付きオフセット', () => {
  it('left → 負 px', () => {
    const px = computeG11LowerOffsetPx({
      direction: 'left',
      paramOffsetArcmin: 2,
      distanceCm: 40,
      dpi: 460,
    });
    expect(px).toBeLessThan(0);
  });

  it('right → 正 px', () => {
    const px = computeG11LowerOffsetPx({
      direction: 'right',
      paramOffsetArcmin: 2,
      distanceCm: 40,
      dpi: 460,
    });
    expect(px).toBeGreaterThan(0);
  });

  it('arcmin=0 → 0px（左右どちらでも）', () => {
    const left = computeG11LowerOffsetPx({
      direction: 'left',
      paramOffsetArcmin: 0,
      distanceCm: 40,
      dpi: 460,
    });
    const right = computeG11LowerOffsetPx({
      direction: 'right',
      paramOffsetArcmin: 0,
      distanceCm: 40,
      dpi: 460,
    });
    expect(left).toBe(0);
    expect(right).toBe(0);
  });

  it('left の |px| と right の |px| が一致', () => {
    const left = computeG11LowerOffsetPx({
      direction: 'left',
      paramOffsetArcmin: 3,
      distanceCm: 40,
      dpi: 460,
    });
    const right = computeG11LowerOffsetPx({
      direction: 'right',
      paramOffsetArcmin: 3,
      distanceCm: 40,
      dpi: 460,
    });
    expect(Math.abs(left)).toBeCloseTo(right, 4);
  });

  it('低 dpi 環境でも minVisiblePx=1 で視認可能', () => {
    const px = computeG11LowerOffsetPx({
      direction: 'right',
      paramOffsetArcmin: 0.5,
      distanceCm: 40,
      dpi: 110,
    });
    expect(px).toBeGreaterThanOrEqual(1);
  });
});

describe('computeG11StimulusLayout: レスポンシブ', () => {
  it('360px → 80×80px、gap 16', () => {
    const l = computeG11StimulusLayout(360);
    expect(l.patchSizePx).toBe(80);
    expect(l.gapPx).toBe(16);
  });

  it('375px → 100×100px、gap 16', () => {
    const l = computeG11StimulusLayout(375);
    expect(l.patchSizePx).toBe(100);
    expect(l.gapPx).toBe(16);
  });

  it('768px → 120×120px、gap 24', () => {
    const l = computeG11StimulusLayout(768);
    expect(l.patchSizePx).toBe(120);
    expect(l.gapPx).toBe(24);
  });

  it('1280px → 140×140px、gap 32', () => {
    const l = computeG11StimulusLayout(1280);
    expect(l.patchSizePx).toBe(140);
    expect(l.gapPx).toBe(32);
  });

  it('オブジェクト形式 { widthPx } も受け付ける', () => {
    expect(computeG11StimulusLayout({ widthPx: 360 }).patchSizePx).toBe(80);
    expect(computeG11StimulusLayout({ widthPx: 1280 }).patchSizePx).toBe(140);
  });

  it('低い高さ（heightPx）では 1 段サイズダウン', () => {
    // 1280px width だが heightPx 200 で詰まる
    const l = computeG11StimulusLayout({ widthPx: 1280, heightPx: 200 });
    // 140×2 + 32 + 200 = 512 > 200 なので 120 に落とす
    expect(l.patchSizePx).toBe(120);
  });
});

describe('Sprint 21: G-11 v1.1.2 直接選択化（reference 上 + 下に左右 2 テストパッチ）', () => {
  it('buildG11Trial は lowerLeft / lowerRight / correctSide フィールドを返す', () => {
    const trial = buildG11Trial(2, () => 0.3);
    expect(trial.lowerLeft).toBeDefined();
    expect(trial.lowerRight).toBeDefined();
    expect(trial.correctSide).toBeDefined();
    expect(['left', 'right']).toContain(trial.correctSide);
  });

  it('lowerLeft / lowerRight も垂直（orientationDeg=90）、共通 cpd / contrast / sigma', () => {
    const trial = buildG11Trial(2, () => 0.5);
    expect(trial.lowerLeft.orientationDeg).toBe(90);
    expect(trial.lowerRight.orientationDeg).toBe(90);
    expect(trial.lowerLeft.cpd).toBe(G11_GABOR_PARAMS.cpd);
    expect(trial.lowerRight.cpd).toBe(G11_GABOR_PARAMS.cpd);
  });

  it('rng < 0.5 → correctSide=left（最初の rng 呼び出しで決定）', () => {
    const trial = buildG11Trial(2, () => 0.3);
    expect(trial.correctSide).toBe('left');
  });

  it('rng >= 0.5 → correctSide=right', () => {
    const trial = buildG11Trial(2, () => 0.7);
    expect(trial.correctSide).toBe('right');
  });

  it('paramOffsetArcmin は新仕様でも保持される', () => {
    expect(buildG11Trial(2, () => 0.5).paramOffsetArcmin).toBe(2);
    expect(buildG11Trial(0.5, () => 0.5).paramOffsetArcmin).toBe(0.5);
    expect(buildG11Trial(5, () => 0.5).paramOffsetArcmin).toBe(5);
  });

  it('gradeG11BySide: 正解側（correctSide）を選んだら正解', () => {
    const trial = buildG11Trial(2, () => 0.3); // correctSide='left'
    const grading = gradeG11BySide(trial, 'left');
    expect(grading.isCorrect).toBe(true);
    expect(grading.unattempted).toBe(false);
    expect(grading.correctSide).toBe('left');
    expect(grading.userAnswerSide).toBe('left');
  });

  it('gradeG11BySide: 不正解側を選んだら不正解', () => {
    const trial = buildG11Trial(2, () => 0.3); // correctSide='left'
    const grading = gradeG11BySide(trial, 'right');
    expect(grading.isCorrect).toBe(false);
    expect(grading.unattempted).toBe(false);
    expect(grading.userAnswerSide).toBe('right');
  });

  it('gradeG11BySide: null（未回答）→ unattempted=true、isCorrect=false', () => {
    const trial = buildG11Trial(2, () => 0.3);
    const grading = gradeG11BySide(trial, null);
    expect(grading.unattempted).toBe(true);
    expect(grading.isCorrect).toBe(false);
    expect(grading.userAnswerSide).toBeNull();
  });

  it('gradeG11 旧 horizontal-2 採点は引き続き動作（後方互換）', () => {
    const trial = buildG11Trial(2, () => 0.3);
    const grading = gradeG11(trial, trial.correctDirection);
    expect(grading.isCorrect).toBe(true);
  });
});
