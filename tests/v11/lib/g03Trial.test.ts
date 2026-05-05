/**
 * G-03 trial 生成 / 採点 / レイアウトの純関数テスト（spec-v11.md §7.3）。
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  G03_CLOCK_POSITIONS,
  GAME3_V11,
  angleRadForIndex,
  buildG03Trial,
  clockPositionForIndex,
  clockPositionToJaLabel,
  clockPositionToShortLabel,
  computeG03StimulusLayout,
  gradeG03,
  indexForClockPosition,
} from '../../../src/lib/v11/g03Trial';

describe('g03Trial: spec', () => {
  it('GAME3_V11.totalDurationMs は 60_000（OPT-11 / OPT-12）', () => {
    expect(GAME3_V11.totalDurationMs).toBe(60_000);
  });

  it('GAME3_V11.fixationDurationMs は 500ms', () => {
    expect(GAME3_V11.fixationDurationMs).toBe(500);
  });

  it('GAME3_V11.eccentricityDeg は 8°（v1.1 で固定）', () => {
    expect(GAME3_V11.eccentricityDeg).toBe(8);
  });

  it('G03_CLOCK_POSITIONS は 8 個で 12 / 1.5 / 3 / 4.5 / 6 / 7.5 / 9 / 10.5', () => {
    expect(G03_CLOCK_POSITIONS).toEqual([
      '12',
      '1.5',
      '3',
      '4.5',
      '6',
      '7.5',
      '9',
      '10.5',
    ]);
    expect(G03_CLOCK_POSITIONS.length).toBe(8);
  });
});

describe('buildG03Trial: 試行生成', () => {
  it('paramValueDeg=25° で odd one が base ± 25°（mod180 上で）', () => {
    const trial = buildG03Trial(25, () => 0.1);
    const odd = trial.oddOrientationDeg;
    const base = trial.baseOrientationDeg;
    // mod180 を考慮
    const rawDiff = Math.abs(odd - base);
    const wrapped = Math.min(rawDiff, 180 - rawDiff);
    expect(wrapped).toBeCloseTo(25, 5);
  });

  it('8 個のパッチ全てが描画 spec を持つ', () => {
    const trial = buildG03Trial(25, () => 0.3);
    expect(trial.patches.length).toBe(8);
    for (const p of trial.patches) {
      expect(p.cpd).toBe(GAME3_V11.cpd);
      expect(p.contrast).toBeCloseTo(GAME3_V11.baseContrast, 5);
      expect(p.sigmaDeg).toBeCloseTo(GAME3_V11.sigmaDeg, 5);
      expect(typeof p.orientationDeg).toBe('number');
      expect(typeof p.phaseRad).toBe('number');
    }
  });

  it('odd one の position の orientation だけが他と異なる', () => {
    const trial = buildG03Trial(25, () => 0.3);
    const oddIdx = trial.oddPositionIndex;
    for (let i = 0; i < 8; i += 1) {
      if (i === oddIdx) {
        expect(trial.patches[i].orientationDeg).toBeCloseTo(
          trial.oddOrientationDeg,
          5,
        );
      } else {
        expect(trial.patches[i].orientationDeg).toBeCloseTo(
          trial.baseOrientationDeg,
          5,
        );
      }
    }
  });

  it('eccentricityDeg は 8° 固定（staircase に依らない）', () => {
    expect(buildG03Trial(5, () => 0.1).eccentricityDeg).toBe(8);
    expect(buildG03Trial(25, () => 0.1).eccentricityDeg).toBe(8);
    expect(buildG03Trial(45, () => 0.1).eccentricityDeg).toBe(8);
  });

  it('odd one の position は 0..7 の範囲', () => {
    for (const seed of [0.0, 0.12, 0.49, 0.51, 0.99]) {
      const trial = buildG03Trial(25, () => seed);
      expect(trial.oddPositionIndex).toBeGreaterThanOrEqual(0);
      expect(trial.oddPositionIndex).toBeLessThan(8);
    }
  });

  it('rng を変えると odd one の位置が分布する（8 位置すべて到達可能）', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 200; i += 1) {
      const trial = buildG03Trial(25, () => i / 200);
      seen.add(trial.oddPositionIndex);
      if (seen.size === 8) break;
    }
    expect(seen.size).toBe(8);
  });

  it('orientation は 0〜180 の範囲（mod180 適用）', () => {
    for (const seed of [0.0, 0.25, 0.5, 0.75, 0.99]) {
      const trial = buildG03Trial(45, () => seed);
      for (const p of trial.patches) {
        expect(p.orientationDeg).toBeGreaterThanOrEqual(0);
        expect(p.orientationDeg).toBeLessThan(180);
      }
    }
  });

  it('paramValueDeg, oddPositionIndex, oddClockPosition が trial に含まれる', () => {
    const trial = buildG03Trial(25, () => 0.3);
    expect(trial.paramValueDeg).toBe(25);
    expect(trial.oddClockPosition).toBe(
      G03_CLOCK_POSITIONS[trial.oddPositionIndex],
    );
  });
});

describe('gradeG03: 採点', () => {
  it('odd one の時計位置を選択 → isCorrect=true', () => {
    const trial = buildG03Trial(25, () => 0.3);
    const result = gradeG03(trial, trial.oddClockPosition);
    expect(result.isCorrect).toBe(true);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswer).toBe(trial.oddClockPosition);
    expect(result.correctClockPosition).toBe(trial.oddClockPosition);
  });

  it('別の時計位置を選択 → isCorrect=false', () => {
    const trial = buildG03Trial(25, () => 0.3);
    const oddIdx = trial.oddPositionIndex;
    const wrongIdx = ((oddIdx + 1) % 8) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
    const result = gradeG03(trial, G03_CLOCK_POSITIONS[wrongIdx]);
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(false);
    expect(result.userAnswer).toBe(G03_CLOCK_POSITIONS[wrongIdx]);
  });

  it('未回答（null）→ isCorrect=false, unattempted=true', () => {
    const trial = buildG03Trial(25, () => 0.3);
    const result = gradeG03(trial, null);
    expect(result.isCorrect).toBe(false);
    expect(result.unattempted).toBe(true);
    expect(result.userAnswer).toBeNull();
    expect(result.correctClockPosition).toBe(trial.oddClockPosition);
  });
});

describe('clockPosition 変換', () => {
  it('clockPositionToJaLabel: 各方向の日本語ラベル', () => {
    expect(clockPositionToJaLabel('12')).toBe('12 時の方向');
    expect(clockPositionToJaLabel('1.5')).toBe('1 時 30 分の方向');
    expect(clockPositionToJaLabel('3')).toBe('3 時の方向');
    expect(clockPositionToJaLabel('4.5')).toBe('4 時 30 分の方向');
    expect(clockPositionToJaLabel('6')).toBe('6 時の方向');
    expect(clockPositionToJaLabel('7.5')).toBe('7 時 30 分の方向');
    expect(clockPositionToJaLabel('9')).toBe('9 時の方向');
    expect(clockPositionToJaLabel('10.5')).toBe('10 時 30 分の方向');
  });

  it('clockPositionToShortLabel: ボタン用短表記', () => {
    expect(clockPositionToShortLabel('12')).toBe('12');
    expect(clockPositionToShortLabel('1.5')).toBe('1:30');
    expect(clockPositionToShortLabel('4.5')).toBe('4:30');
    expect(clockPositionToShortLabel('10.5')).toBe('10:30');
  });

  it('clockPositionForIndex / indexForClockPosition：往復で同じ', () => {
    for (let i = 0; i < 8; i += 1) {
      const idx = i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
      const pos = clockPositionForIndex(idx);
      expect(indexForClockPosition(pos)).toBe(idx);
    }
  });

  it('indexForClockPosition：未知ラベルは throw', () => {
    expect(() => indexForClockPosition('xxx' as never)).toThrow();
  });
});

describe('angleRadForIndex: 円周角度', () => {
  it('idx=0（12 時）→ -π/2', () => {
    expect(angleRadForIndex(0)).toBeCloseTo(-Math.PI / 2, 5);
  });

  it('idx=2（3 時）→ 0', () => {
    expect(angleRadForIndex(2)).toBeCloseTo(0, 5);
  });

  it('idx=4（6 時）→ π/2', () => {
    expect(angleRadForIndex(4)).toBeCloseTo(Math.PI / 2, 5);
  });

  it('idx=6（9 時）→ π', () => {
    expect(angleRadForIndex(6)).toBeCloseTo(Math.PI, 5);
  });
});

describe('computeG03StimulusLayout: レスポンシブ', () => {
  it('360px → frame 340, patch 76, clock 220', () => {
    expect(computeG03StimulusLayout(360)).toEqual({
      framePx: 340,
      patchSizePx: 76,
      clockDiameterPx: 220,
    });
  });

  it('375px → frame 360, patch 84, clock 230', () => {
    expect(computeG03StimulusLayout(375)).toEqual({
      framePx: 360,
      patchSizePx: 84,
      clockDiameterPx: 230,
    });
  });

  it('768px → frame 440, patch 96, clock 300', () => {
    expect(computeG03StimulusLayout(768)).toEqual({
      framePx: 440,
      patchSizePx: 96,
      clockDiameterPx: 300,
    });
  });

  it('1280px → frame 440, patch 96, clock 300', () => {
    expect(computeG03StimulusLayout(1280)).toEqual({
      framePx: 440,
      patchSizePx: 96,
      clockDiameterPx: 300,
    });
  });

  it('オブジェクト形式：{ widthPx: 1280, heightPx: 800 } で frame 440', () => {
    expect(
      computeG03StimulusLayout({ widthPx: 1280, heightPx: 800 }),
    ).toEqual({
      framePx: 440,
      patchSizePx: 96,
      clockDiameterPx: 300,
    });
  });

  it('オブジェクト形式：{ widthPx: 360 } で frame 340', () => {
    expect(computeG03StimulusLayout({ widthPx: 360 })).toEqual({
      framePx: 340,
      patchSizePx: 76,
      clockDiameterPx: 220,
    });
  });
});
