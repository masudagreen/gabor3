/**
 * settings.test.ts — F-13 設定ロジック（範囲制約・採点方式列挙・setter）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clampToSpec,
  setGridSize,
  setRoundSeconds,
  setRoundCount,
  setRotationSpeed,
  setSfChangeSpeed,
  setScoringMode,
  setDarkMode,
  setSoundEnabled,
  setHapticsEnabled,
  setOneEyeGuidance,
  normalizeViewingDistance,
  updateSettings,
} from '../../src/state/settings';
import {
  defaultSettings,
  PARAM_SPECS,
  SCORING_MODES,
} from '../../src/state/schema';
import { loadSettings } from '../../src/state/repository';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('clampToSpec', () => {
  it('範囲外を min/max にクランプする', () => {
    expect(clampToSpec(0, PARAM_SPECS.roundSeconds)).toBe(10);
    expect(clampToSpec(999, PARAM_SPECS.roundSeconds)).toBe(60);
  });

  it('step 格子にスナップする（m: 5 刻み）', () => {
    expect(clampToSpec(22, PARAM_SPECS.roundSeconds)).toBe(20);
    expect(clampToSpec(23, PARAM_SPECS.roundSeconds)).toBe(25);
  });

  it('小数 step（b: 0.005）でも誤差なくスナップする', () => {
    // ユーザー要望で step を 1/10（0.005）に細分化
    expect(clampToSpec(0.152, PARAM_SPECS.sfChangeSpeed)).toBe(0.15);
    expect(clampToSpec(0.153, PARAM_SPECS.sfChangeSpeed)).toBe(0.155);
    expect(clampToSpec(0.4, PARAM_SPECS.sfChangeSpeed)).toBe(0.4);
    expect(clampToSpec(0.5, PARAM_SPECS.sfChangeSpeed)).toBe(0.4);
    expect(clampToSpec(0.01, PARAM_SPECS.sfChangeSpeed)).toBe(0.05);
  });

  it('a（回転速度）も step 0.1 でスナップする', () => {
    expect(clampToSpec(6.04, PARAM_SPECS.rotationSpeed)).toBe(6);
    expect(clampToSpec(6.06, PARAM_SPECS.rotationSpeed)).toBe(6.1);
    expect(clampToSpec(1, PARAM_SPECS.rotationSpeed)).toBe(2); // min クランプ
    expect(clampToSpec(99, PARAM_SPECS.rotationSpeed)).toBe(12); // max クランプ
  });
});

describe('n/m/r/a/b の setter（範囲外不可）', () => {
  const base = defaultSettings();

  it('n は 3/4/5 にスナップ', () => {
    expect(setGridSize(base, 2).gridSize).toBe(3);
    expect(setGridSize(base, 6).gridSize).toBe(5);
    expect(setGridSize(base, 4).gridSize).toBe(4);
  });

  it('m は 10–60 / 5 刻み', () => {
    expect(setRoundSeconds(base, 5).roundSeconds).toBe(10);
    expect(setRoundSeconds(base, 100).roundSeconds).toBe(60);
    expect(setRoundSeconds(base, 33).roundSeconds).toBe(35);
  });

  it('r は 3–10', () => {
    expect(setRoundCount(base, 1).roundCount).toBe(3);
    expect(setRoundCount(base, 20).roundCount).toBe(10);
  });

  it('a は 2–12 °/sec', () => {
    expect(setRotationSpeed(base, 1).rotationSpeed).toBe(2);
    expect(setRotationSpeed(base, 99).rotationSpeed).toBe(12);
    expect(setRotationSpeed(base, 6).rotationSpeed).toBe(6);
  });

  it('b は 0.05–0.40 hz/sec', () => {
    expect(setSfChangeSpeed(base, 0).sfChangeSpeed).toBe(0.05);
    expect(setSfChangeSpeed(base, 1).sfChangeSpeed).toBe(0.4);
  });
});

describe('採点方式・列挙 setter', () => {
  const base = defaultSettings();

  it('既定は ②（auto-confirm）', () => {
    expect(base.scoringMode).toBe('auto-confirm');
  });

  it('採点方式①②③をすべて設定できる', () => {
    for (const mode of SCORING_MODES) {
      expect(setScoringMode(base, mode).scoringMode).toBe(mode);
    }
    expect(SCORING_MODES).toEqual([
      'auto-no-confirm',
      'auto-confirm',
      'all-correct-advance',
    ]);
  });

  it('不正な採点方式は無視（現状維持）', () => {
    // @ts-expect-error 不正値を意図的に渡す
    expect(setScoringMode(base, 'bogus').scoringMode).toBe('auto-confirm');
  });

  it('ダークモード OS連動/明/暗', () => {
    expect(setDarkMode(base, 'dark').darkMode).toBe('dark');
    expect(setDarkMode(base, 'light').darkMode).toBe('light');
    expect(setDarkMode(base, 'system').darkMode).toBe('system');
  });

  it('音・振動トグル', () => {
    expect(setSoundEnabled(base, false).soundEnabled).toBe(false);
    expect(setHapticsEnabled(base, false).hapticsEnabled).toBe(false);
  });

  it('片眼ガイダンス off/左/右/交互', () => {
    expect(setOneEyeGuidance(base, 'left').oneEyeGuidance).toBe('left');
    expect(setOneEyeGuidance(base, 'right').oneEyeGuidance).toBe('right');
    expect(setOneEyeGuidance(base, 'alternate').oneEyeGuidance).toBe('alternate');
    expect(setOneEyeGuidance(base, 'off').oneEyeGuidance).toBe('off');
  });
});

describe('視聴距離', () => {
  it('30/40/50 にスナップ', () => {
    expect(normalizeViewingDistance(31)).toBe(30);
    expect(normalizeViewingDistance(44)).toBe(40);
    expect(normalizeViewingDistance(48)).toBe(50);
  });
});

describe('updateSettings（即時永続化）', () => {
  it('load → 変更 → save の往復で保存される', async () => {
    const next = await updateSettings((s) => setRotationSpeed(s, 3));
    expect(next.rotationSpeed).toBe(3);
    expect((await loadSettings()).rotationSpeed).toBe(3);
  });

  it('連続更新が積み上がる', async () => {
    await updateSettings((s) => setGridSize(s, 5));
    await updateSettings((s) => setDarkMode(s, 'dark'));
    const loaded = await loadSettings();
    expect(loaded.gridSize).toBe(5);
    expect(loaded.darkMode).toBe('dark');
  });
});
