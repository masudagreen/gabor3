/**
 * G-02 trial 生成 / 採点 / レイアウトの純関数テスト（spec-v11.md §7.2）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  buildG02Trial,
  computeG02StimulusLayout,
  G02_GABOR_PARAMS,
  GAME2_V11,
  gradeG02,
  sideToJaLabel,
  userAnswerToLabel,
} from '../../../src/lib/v11/g02Trial';

describe('g02Trial: spec', () => {
  it('GAME2_V11.totalDurationMs は 60_000（OPT-11 / OPT-12）', () => {
    expect(GAME2_V11.totalDurationMs).toBe(60_000);
  });

  it('GAME2_V11.fixationDurationMs は 500ms', () => {
    expect(GAME2_V11.fixationDurationMs).toBe(500);
  });

  it('G02_GABOR_PARAMS は v1 から踏襲（cpd=3, contrast=0.3, sigmaDeg=0.6）', () => {
    expect(G02_GABOR_PARAMS.cpd).toBe(3);
    expect(G02_GABOR_PARAMS.contrast).toBeCloseTo(0.3, 5);
    expect(G02_GABOR_PARAMS.sigmaDeg).toBeCloseTo(0.6, 5);
  });
});

describe('buildG02Trial: 試行生成', () => {
  it('paramValueDeg=6 で左右の orientation が 6° 離れる（基準角度 ±3°）', () => {
    // rng=0.1: base=18°, correctSide=left（rng<0.5）, phaseRad=...
    const trial = buildG02Trial(6, () => 0.1);
    const diff = Math.abs(
      ((trial.left.orientationDeg - trial.right.orientationDeg + 270) % 180) - 90,
    );
    // mod180 を考慮して |diff| が 6° に近い（実は単純差で 6°）
    const rawDiff = Math.abs(
      trial.left.orientationDeg - trial.right.orientationDeg,
    );
    const wrappedDiff = Math.min(rawDiff, 180 - rawDiff);
    expect(wrappedDiff).toBeCloseTo(6, 5);
    expect(diff).toBeGreaterThan(0); // satisfied
  });

  it('rng < 0.5 のとき correctSide=left', () => {
    // 1 回目 rng は base、2 回目 rng が correctSide 判定
    // rng=() => 0.4 とすると base=72°、2 回目=0.4<0.5 → left
    const trial = buildG02Trial(6, () => 0.4);
    expect(trial.correctSide).toBe('left');
  });

  it('rng >= 0.5 のとき correctSide=right', () => {
    const trial = buildG02Trial(6, () => 0.6);
    expect(trial.correctSide).toBe('right');
  });

  it('correctSide=left のとき left.orientation > right.orientation（mod180 取得前の差）', () => {
    const trial = buildG02Trial(6, () => 0.4);
    expect(trial.correctSide).toBe('left');
    // 「時計回り側 = orientation 値が増える側」
    // base=72°, half=3° → leftIsCw=true → left=75°, right=69°
    expect(trial.left.orientationDeg).toBeCloseTo(75, 5);
    expect(trial.right.orientationDeg).toBeCloseTo(69, 5);
  });

  it('paramValueDeg=1 でも左右で 1° の差を作る（最難レベル）', () => {
    const trial = buildG02Trial(1, () => 0.4);
    const rawDiff = Math.abs(
      trial.left.orientationDeg - trial.right.orientationDeg,
    );
    expect(Math.min(rawDiff, 180 - rawDiff)).toBeCloseTo(1, 5);
  });

  it('paramValueDeg=10 で左右 10° 差（最易レベル）', () => {
    const trial = buildG02Trial(10, () => 0.4);
    const rawDiff = Math.abs(
      trial.left.orientationDeg - trial.right.orientationDeg,
    );
    expect(Math.min(rawDiff, 180 - rawDiff)).toBeCloseTo(10, 5);
  });

  it('orientation は 0〜180 の範囲（mod180）', () => {
    for (const seed of [0, 0.25, 0.5, 0.75, 0.99]) {
      const trial = buildG02Trial(6, () => seed);
      expect(trial.left.orientationDeg).toBeGreaterThanOrEqual(0);
      expect(trial.left.orientationDeg).toBeLessThan(180);
      expect(trial.right.orientationDeg).toBeGreaterThanOrEqual(0);
      expect(trial.right.orientationDeg).toBeLessThan(180);
    }
  });

  it('paramValueDeg, baseOrientationDeg, correctSide が trial に含まれる', () => {
    const trial = buildG02Trial(6, () => 0.3);
    expect(trial.paramValueDeg).toBe(6);
    expect(typeof trial.baseOrientationDeg).toBe('number');
    expect(['left', 'right']).toContain(trial.correctSide);
  });
});

describe('gradeG02: 採点', () => {
  it('正解側を選択 → isCorrect=true', () => {
    const trial = buildG02Trial(6, () => 0.4); // correctSide=left
    const result = gradeG02(trial, 'left');
    expect(result.isCorrect).toBe(true);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswer).toBe('left');
    expect(result.correctSide).toBe('left');
  });

  it('不正解側を選択 → isCorrect=false', () => {
    const trial = buildG02Trial(6, () => 0.4); // correctSide=left
    const result = gradeG02(trial, 'right');
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswer).toBe('right');
  });

  it('未回答（null）→ isCorrect=false, unattempted=true', () => {
    const trial = buildG02Trial(6, () => 0.4);
    const result = gradeG02(trial, null);
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(true);
    expect(result.userAnswer).toBeNull();
  });

  it('correctSide=right で right を選択 → 正解', () => {
    const trial = buildG02Trial(6, () => 0.6); // correctSide=right
    const result = gradeG02(trial, 'right');
    expect(result.isCorrect).toBe(true);
  });
});

describe('sideToJaLabel / userAnswerToLabel', () => {
  it('left → 「左」', () => {
    expect(sideToJaLabel('left')).toBe('左');
  });
  it('right → 「右」', () => {
    expect(sideToJaLabel('right')).toBe('右');
  });
  it('userAnswerToLabel(null) → null', () => {
    expect(userAnswerToLabel(null)).toBeNull();
  });
  it('userAnswerToLabel("left") → 「左」', () => {
    expect(userAnswerToLabel('left')).toBe('左');
  });
});

describe('computeG02StimulusLayout: レスポンシブ', () => {
  it('shortSide=360 で 100×100, gap 24', () => {
    expect(computeG02StimulusLayout(360)).toEqual({
      patchSizePx: 100,
      gapPx: 24,
    });
  });

  it('shortSide=375 で 120×120, gap 32', () => {
    expect(computeG02StimulusLayout(375)).toEqual({
      patchSizePx: 120,
      gapPx: 32,
    });
  });

  it('shortSide=768 で 140×140, gap 48', () => {
    expect(computeG02StimulusLayout(768)).toEqual({
      patchSizePx: 140,
      gapPx: 48,
    });
  });

  it('shortSide=1280 で 160×160, gap 64', () => {
    expect(computeG02StimulusLayout(1280)).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  // Sprint 10 修正ラウンド 2 / G-04 修正：判定基準を「短辺」から「viewport 幅」に変更
  // screens.md §5 表に従って、各 viewport 幅で正しいサイズが返ることを担保。
  it('width=1280, height=800（PC 横） で 160×160, gap 64（screens.md §5 1280px 行）', () => {
    expect(
      computeG02StimulusLayout({ widthPx: 1280, heightPx: 800 }),
    ).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('width=1440, height=900 で 160×160, gap 64（>1280 でも 160）', () => {
    expect(
      computeG02StimulusLayout({ widthPx: 1440, heightPx: 900 }),
    ).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('width=768, height=1024（タブレット縦）で 140×140, gap 48（768〜1279 = 中位）', () => {
    expect(
      computeG02StimulusLayout({ widthPx: 768, heightPx: 1024 }),
    ).toEqual({
      patchSizePx: 140,
      gapPx: 48,
    });
  });

  it('width=375, height=667 で 120×120, gap 32（モバイル縦）', () => {
    expect(
      computeG02StimulusLayout({ widthPx: 375, heightPx: 667 }),
    ).toEqual({
      patchSizePx: 120,
      gapPx: 32,
    });
  });

  it('width=360, height=640 で 100×100, gap 24（最小モバイル）', () => {
    expect(
      computeG02StimulusLayout({ widthPx: 360, heightPx: 640 }),
    ).toEqual({
      patchSizePx: 100,
      gapPx: 24,
    });
  });

  it('数値 1 個（width のみ）でも呼べる：1280 → 160/64', () => {
    expect(computeG02StimulusLayout(1280)).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('引数 2 個（width, height）でも呼べる：1280, 800 → 160/64', () => {
    expect(computeG02StimulusLayout(1280, 800)).toEqual({
      patchSizePx: 160,
      gapPx: 64,
    });
  });

  it('リグレッション：以前は shortSide=800 で 140 になっていた問題（PC 1280×800）が 160 を返す', () => {
    // 修正前は computeG02StimulusLayout(800) として呼んでいて 140 が返っていた。
    // 修正後は viewport 幅 1280 を入れるので 160 が返る（screens.md §5 と一致）。
    const layout = computeG02StimulusLayout({ widthPx: 1280, heightPx: 800 });
    expect(layout.patchSizePx).toBe(160);
    expect(layout.gapPx).toBe(64);
  });

  it('safety：高さが極端に小さいとパッチを 1 段落とす', () => {
    // width=1280, height=200（極端に縦が削られた PC）→ 160 では入らないので 140 に
    const layout = computeG02StimulusLayout({ widthPx: 1280, heightPx: 200 });
    expect(layout.patchSizePx).toBeLessThanOrEqual(140);
  });
});
