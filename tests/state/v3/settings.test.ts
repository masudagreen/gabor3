/**
 * settings.test.ts — v3.0 F-13 設定ロジック（範囲設定 / 変化順 / 継承項目 / §4.5 クランプ）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  sanitizeVariableRanges,
  sanitizeVariableOrder,
  sanitizeSettings,
  sanitizeSessionMinutes,
  setVariableRange,
  setVariableOrder,
  resetVariableOrder,
  setSessionMinutes,
  setDarkMode,
  setSoundEnabled,
  setHapticsEnabled,
  setOneEyeGuidance,
  normalizeViewingDistance,
  settingsTotalLevels,
  updateSettings,
  updateLevelSettings,
} from '../../../src/state/v3/settings';
import { defaultSettings } from '../../../src/state/v3/schema';
import { STORAGE_KEYS } from '../../../src/state/v3/keys';
import { loadSettings, saveSettings, loadLevelState, saveLevelState } from '../../../src/state/v3/repository';
import { DEFAULT_VARIABLE_ORDER } from '../../../src/lib/v3/level';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('sessionMinutes（v3.1・§7.2 / AS-23）', () => {
  it('sanitizeSessionMinutes は 1..15 にクランプ、不正値は既定 5', () => {
    expect(sanitizeSessionMinutes(5)).toBe(5);
    expect(sanitizeSessionMinutes(1)).toBe(1);
    expect(sanitizeSessionMinutes(15)).toBe(15);
    expect(sanitizeSessionMinutes(0)).toBe(1);
    expect(sanitizeSessionMinutes(100)).toBe(15);
    expect(sanitizeSessionMinutes(3.7)).toBe(4); // 四捨五入
    expect(sanitizeSessionMinutes('x' as never)).toBe(5);
    expect(sanitizeSessionMinutes(NaN)).toBe(5);
  });

  it('setSessionMinutes は値を設定（クランプ）し梯子（variableRanges）に影響しない', () => {
    const s0 = defaultSettings();
    const s1 = setSessionMinutes(s0, 10);
    expect(s1.sessionMinutes).toBe(10);
    expect(s1.variableRanges).toEqual(s0.variableRanges); // 梯子は不変
    expect(settingsTotalLevels(s1)).toBe(720); // 総レベル数は不変
    expect(setSessionMinutes(s0, 99).sessionMinutes).toBe(15);
  });

  it('既定 sessionMinutes は 5', () => {
    expect(defaultSettings().sessionMinutes).toBe(5);
  });
});

describe('v3.1 追加値の選択（§4.1 拡張全集合・AS-27）', () => {
  it('既定は v3.0 部分集合（追加値 OFF・720）', () => {
    const s = defaultSettings();
    expect(s.variableRanges.count).toEqual([1, 2, 3, 4]);
    expect(s.variableRanges.gridSize).toEqual([3, 4]);
    expect(settingsTotalLevels(s)).toBe(720);
  });

  it('追加値（個数 5/6・サイズ 5/6）を ON にすると総レベル数が増える', () => {
    let s = defaultSettings();
    s = setVariableRange(s, 'count', [1, 2, 3, 4, 5, 6]);
    s = setVariableRange(s, 'gridSize', [3, 4, 5, 6]);
    expect(s.variableRanges.count).toEqual([1, 2, 3, 4, 5, 6]);
    expect(s.variableRanges.gridSize).toEqual([3, 4, 5, 6]);
    // 6（count）×5（seconds）×2（dir）×4（grid）×9（speed）= 2160
    expect(settingsTotalLevels(s)).toBe(2160);
  });

  it('全集合（拡張後）の選択で 6864 レベルになる', () => {
    let s = defaultSettings();
    s = setVariableRange(s, 'count', [1, 2, 3, 4, 5, 6]);
    s = setVariableRange(s, 'seconds', [60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10]);
    s = setVariableRange(s, 'gridSize', [3, 4, 5, 6]);
    s = setVariableRange(s, 'rotationSpeed', [7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1]);
    expect(settingsTotalLevels(s)).toBe(6864);
  });
});

describe('sanitizeVariableRanges', () => {
  it('値集合外の値を除外し易→難順に並べ直す', () => {
    const r = sanitizeVariableRanges({
      count: [4, 1, 99 as number, 2],
      seconds: [20, 40],
    });
    expect(r.count).toEqual([1, 2, 4]); // 99 除外・易→難順
    expect(r.seconds).toEqual([40, 20]); // 易→難順
  });
  it('空集合はフル範囲で補完（最低 1 値必須）', () => {
    const r = sanitizeVariableRanges({ count: [], gridSize: [] });
    expect(r.count).toEqual([1, 2, 3, 4]);
    expect(r.gridSize).toEqual([3, 4]);
  });
  it('null/undefined はフル範囲', () => {
    const r = sanitizeVariableRanges(null);
    expect(r.rotationSpeed).toEqual([6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2]);
  });
});

describe('sanitizeVariableOrder', () => {
  it('5 変数の順列はそのまま', () => {
    const order = ['rotationSpeed', 'count', 'seconds', 'direction', 'gridSize'] as const;
    expect(sanitizeVariableOrder([...order])).toEqual([...order]);
  });
  it('欠落・重複・未知キーはデフォルトに戻す', () => {
    expect(sanitizeVariableOrder(['count', 'count', 'seconds', 'direction', 'gridSize'] as never)).toEqual([
      ...DEFAULT_VARIABLE_ORDER,
    ]);
    expect(sanitizeVariableOrder(['count'] as never)).toEqual([...DEFAULT_VARIABLE_ORDER]);
    expect(sanitizeVariableOrder(null)).toEqual([...DEFAULT_VARIABLE_ORDER]);
  });
});

describe('setVariableRange（F-13：各変数 1 値以上必須）', () => {
  it('部分集合を設定でき梯子に反映される', () => {
    const s0 = defaultSettings();
    expect(settingsTotalLevels(s0)).toBe(720);
    const s1 = setVariableRange(s0, 'count', [1, 2]); // 個数 2 段に絞る
    expect(s1.variableRanges.count).toEqual([1, 2]);
    expect(settingsTotalLevels(s1)).toBe(2 * 5 * 2 * 2 * 9); // 360
  });
  it('値集合外は除外し易→難順に正規化', () => {
    const s = setVariableRange(defaultSettings(), 'seconds', [20, 40, 12345]);
    expect(s.variableRanges.seconds).toEqual([40, 20]);
  });
  it('全無効（空集合）は現状維持（変更を無視）', () => {
    const s0 = defaultSettings();
    const s1 = setVariableRange(s0, 'direction', []);
    expect(s1).toEqual(s0); // 変化なし
  });
});

describe('setVariableOrder / resetVariableOrder', () => {
  it('順列を設定でき梯子の中身が変わる（総数は不変）', () => {
    const s0 = defaultSettings();
    const reordered = setVariableOrder(s0, [
      'rotationSpeed',
      'gridSize',
      'direction',
      'seconds',
      'count',
    ]);
    expect(reordered.variableOrder[0]).toBe('rotationSpeed');
    expect(settingsTotalLevels(reordered)).toBe(720); // 順序だけでは総数不変
  });
  it('デフォルトに戻す', () => {
    const s = resetVariableOrder(
      setVariableOrder(defaultSettings(), [
        'rotationSpeed',
        'gridSize',
        'direction',
        'seconds',
        'count',
      ]),
    );
    expect(s.variableOrder).toEqual([...DEFAULT_VARIABLE_ORDER]);
  });
});

describe('継承項目 setter', () => {
  it('darkMode は列挙のみ受理', () => {
    expect(setDarkMode(defaultSettings(), 'dark').darkMode).toBe('dark');
    expect(setDarkMode(defaultSettings(), 'invalid' as never).darkMode).toBe('system');
  });
  it('音/振動トグル', () => {
    expect(setSoundEnabled(defaultSettings(), false).soundEnabled).toBe(false);
    expect(setHapticsEnabled(defaultSettings(), false).hapticsEnabled).toBe(false);
  });
  it('片眼ガイダンスは列挙のみ受理', () => {
    expect(setOneEyeGuidance(defaultSettings(), 'alternate').oneEyeGuidance).toBe('alternate');
    expect(setOneEyeGuidance(defaultSettings(), 'both' as never).oneEyeGuidance).toBe('off');
  });
  it('視聴距離は 30/40/50 にスナップ', () => {
    expect(normalizeViewingDistance(31)).toBe(30);
    expect(normalizeViewingDistance(47)).toBe(50);
    expect(normalizeViewingDistance(40)).toBe(40);
  });
});

describe('sanitizeSettings（破損修復）', () => {
  it('不正な継承項目を既定へ・範囲/順を正規化', () => {
    const dirty = {
      sessionMinutes: 999 as never,
      variableRanges: { count: [] } as never,
      variableOrder: ['count'] as never,
      darkMode: 'x' as never,
      soundEnabled: 'yes' as never,
      hapticsEnabled: null as never,
      oneEyeGuidance: 'z' as never,
    };
    const clean = sanitizeSettings(dirty);
    expect(clean.sessionMinutes).toBe(15); // 1..15 にクランプ
    expect(clean.variableRanges.count).toEqual([1, 2, 3, 4]);
    expect(clean.variableOrder).toEqual([...DEFAULT_VARIABLE_ORDER]);
    expect(clean.darkMode).toBe('system');
    expect(clean.soundEnabled).toBe(true);
    expect(clean.hapticsEnabled).toBe(true);
    expect(clean.oneEyeGuidance).toBe('off');
  });
});

describe('updateSettings（永続化・F-13 即保存）', () => {
  it('load → 変更 → save', async () => {
    const next = await updateSettings((s) => setSoundEnabled(s, false));
    expect(next.soundEnabled).toBe(false);
    const reloaded = await loadSettings();
    expect(reloaded.soundEnabled).toBe(false);
  });
});

describe('updateLevelSettings（§4.5：範囲/変化順変更でクランプ + 連続失敗 0）', () => {
  it('範囲縮小で現在レベルが新上限超過なら新上限へクランプ・連続失敗 0', async () => {
    // 現在レベル 500・連続失敗 1 を保存（フル範囲 720）
    await saveSettings(defaultSettings());
    await saveLevelState({ currentLevel: 500, consecutiveFailures: 1, highestLevel: 600 });

    // 個数を {1,2} に絞る → 総数 360
    const res = await updateLevelSettings((s) => setVariableRange(s, 'count', [1, 2]));

    expect(settingsTotalLevels(res.settings)).toBe(360);
    expect(res.levelState.currentLevel).toBe(360); // 500 → 上限 360
    expect(res.levelState.consecutiveFailures).toBe(0); // リセット
    expect(res.levelState.highestLevel).toBe(360); // 新上限でクランプ
    expect(res.clamped).toBe(true);

    const reloaded = await loadLevelState();
    expect(reloaded.currentLevel).toBe(360);
    expect(reloaded.consecutiveFailures).toBe(0);
  });

  it('範囲内なら現在レベル維持・連続失敗だけ 0 リセット', async () => {
    await saveSettings(defaultSettings());
    await saveLevelState({ currentLevel: 50, consecutiveFailures: 1, highestLevel: 60 });

    const res = await updateLevelSettings((s) => setVariableRange(s, 'count', [1, 2]));
    // 50 は 360 以内 → 維持
    expect(res.levelState.currentLevel).toBe(50);
    expect(res.levelState.consecutiveFailures).toBe(0);
    expect(res.clamped).toBe(false);
  });

  it('変化順変更でも連続失敗 0 リセット（総数不変でクランプ無し）', async () => {
    await saveSettings(defaultSettings());
    await saveLevelState({ currentLevel: 30, consecutiveFailures: 1, highestLevel: 30 });

    const res = await updateLevelSettings((s) =>
      setVariableOrder(s, ['rotationSpeed', 'gridSize', 'direction', 'seconds', 'count']),
    );
    expect(res.settings.variableOrder[0]).toBe('rotationSpeed');
    expect(res.levelState.currentLevel).toBe(30);
    expect(res.levelState.consecutiveFailures).toBe(0);
  });
});
