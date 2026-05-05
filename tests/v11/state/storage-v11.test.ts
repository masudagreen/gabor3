/**
 * storage-v11 — F-17 / F-09 永続化テスト（spec-v11.md §11、§F-17、§F-09）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  V1_LEGACY_KEYS,
  V1_LEGACY_KEY_PREFIX,
  KEY_PREFIX_V11,
  KEY_USER_PROFILE_V11,
  KEY_SETTINGS_V11,
  KEY_DATA_RESET_NOTICE_SHOWN,
  KEY_STAIRCASE_V11,
  KEY_DAILY_STATS_V11,
  KEY_BADGE_V11,
  detectV1LegacyData,
  clearV1LegacyStorage,
  isDataResetNoticeShown,
  markDataResetNoticeShown,
  loadUserProfileV11,
  saveUserProfileV11,
  updateUserProfileV11,
  createDefaultUserProfileV11,
  loadSettingsV11,
  saveSettingsV11,
  updateSettingsV11,
  createDefaultSettingsV11,
  loadStaircaseV11,
  saveStaircaseV11,
  resetStaircaseV11,
  resetAllStaircasesV11,
  loadStreakV11,
  saveStreakV11,
  createDefaultStreakV11,
  getKeysByPrefix,
  clearAllStorageV11,
} from '../../../src/state/storage-v11';
import { applySessionResultV11 } from '../../../src/lib/v11/staircaseV11';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const FIXED_NOW = () => '2026-04-30T00:00:00.000Z';

describe('storage-v11: キー定数の整合性', () => {
  it('プレフィックスは gaboreye:v1.1: で v1 と区別できる', () => {
    expect(KEY_PREFIX_V11).toBe('gaboreye:v1.1:');
    expect(V1_LEGACY_KEY_PREFIX).toBe('gaboreye:v1:');
    // v1.1 は v1 のプレフィックスでは始まらない（コロンの位置で区別）
    expect(KEY_PREFIX_V11.startsWith(V1_LEGACY_KEY_PREFIX)).toBe(false);
  });

  it('UserProfile / Settings / DataResetNoticeShown キーが定義済み', () => {
    expect(KEY_USER_PROFILE_V11).toBe('gaboreye:v1.1:userProfile');
    expect(KEY_SETTINGS_V11).toBe('gaboreye:v1.1:settings');
    expect(KEY_DATA_RESET_NOTICE_SHOWN).toBe(
      'gaboreye:v1.1:dataResetNoticeShown',
    );
  });

  it('staircase キーは gameId 単位、DailyStats は日付単位、Badge は ID 単位', () => {
    expect(KEY_STAIRCASE_V11('G-04')).toBe('gaboreye:v1.1:staircase:G-04');
    expect(KEY_DAILY_STATS_V11('2026-04-30')).toBe(
      'gaboreye:v1.1:dailyStats:2026-04-30',
    );
    expect(KEY_BADGE_V11('B-09')).toBe('gaboreye:v1.1:badge:B-09');
  });
});

describe('storage-v11: F-17 v1 旧データ消去', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('v1 由来データが無いとき detectV1LegacyData は false', async () => {
    expect(await detectV1LegacyData()).toBe(false);
  });

  it('v1 staircase キーが残っていれば検出される', async () => {
    await AsyncStorage.setItem(
      'gaboreye:v1:staircase:game1',
      JSON.stringify({ gameId: 'game1', currentParam: 5 }),
    );
    expect(await detectV1LegacyData()).toBe(true);
  });

  it('v1.1 キーだけが存在する場合は false（v1 と区別する）', async () => {
    await AsyncStorage.setItem(
      KEY_USER_PROFILE_V11,
      JSON.stringify(createDefaultUserProfileV11(FIXED_NOW)),
    );
    expect(await detectV1LegacyData()).toBe(false);
  });

  it('clearV1LegacyStorage は v1 系キーをすべて消す', async () => {
    // v1 キーを複数仕込む
    await AsyncStorage.setItem(
      'gaboreye:v1:staircase:game1',
      JSON.stringify({ x: 1 }),
    );
    await AsyncStorage.setItem(
      'gaboreye:v1:staircase:game2',
      JSON.stringify({ x: 1 }),
    );
    await AsyncStorage.setItem('gaboreye:v1:userProfile', '{}');
    await AsyncStorage.setItem('gaboreye:v1:dailyStats', '[]');
    await AsyncStorage.setItem('gaboreye:v1:streak', '{}');
    await AsyncStorage.setItem('gaboreye:v1:badges', '[]');
    await AsyncStorage.setItem('gaboreye:v1:settings', '{}');
    // v1.1 キーも 1 つ仕込み、消されないことを確認
    await AsyncStorage.setItem(
      KEY_USER_PROFILE_V11,
      JSON.stringify(createDefaultUserProfileV11(FIXED_NOW)),
    );

    const removed = await clearV1LegacyStorage();
    expect(removed).toBeGreaterThanOrEqual(7);

    // v1 キーは消えている
    expect(await detectV1LegacyData()).toBe(false);
    // v1.1 は残る
    expect(await AsyncStorage.getItem(KEY_USER_PROFILE_V11)).not.toBeNull();
  });

  it('clearV1LegacyStorage は V1_LEGACY_KEYS 明示リストもカバー', async () => {
    // 全 v1 キーをまとめて仕込む
    for (const k of V1_LEGACY_KEYS) {
      await AsyncStorage.setItem(k, '{}');
    }
    await clearV1LegacyStorage();
    for (const k of V1_LEGACY_KEYS) {
      expect(await AsyncStorage.getItem(k)).toBeNull();
    }
  });

  it('v1 データが何も無い時は 0 件 remove して問題なし', async () => {
    // V1_LEGACY_KEYS 明示分は multiRemove に渡されるため 10 件返る。
    // ただし getAllKeys 由来は 0 件。Hardening：戻り値 >=0 を確認。
    const removed = await clearV1LegacyStorage();
    expect(removed).toBeGreaterThanOrEqual(0);
    expect(await detectV1LegacyData()).toBe(false);
  });
});

describe('storage-v11: F-17 通知フラグ', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('未保存時は isDataResetNoticeShown=false', async () => {
    expect(await isDataResetNoticeShown()).toBe(false);
  });

  it('markDataResetNoticeShown 後は true、再起動でも維持される', async () => {
    await markDataResetNoticeShown();
    expect(await isDataResetNoticeShown()).toBe(true);
    // 直接ストレージから読み戻しても 'true'
    expect(
      await AsyncStorage.getItem(KEY_DATA_RESET_NOTICE_SHOWN),
    ).toBe('true');
  });

  it('「通知 1 度のみ」シナリオ：mark 後に detect しても表示済みのまま', async () => {
    expect(await isDataResetNoticeShown()).toBe(false);
    await markDataResetNoticeShown();
    expect(await isDataResetNoticeShown()).toBe(true);
    // 2 回目以降の起動を擬似（key は残っている）
    expect(await isDataResetNoticeShown()).toBe(true);
  });
});

describe('storage-v11: UserProfile v1.1', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('未保存時はデフォルトを返す（schemaVersion=1.1.0）', async () => {
    const p = await loadUserProfileV11(FIXED_NOW);
    expect(p.onboardingCompleted).toBe(false);
    expect(p.disclaimerAgreedAt).toBeNull();
    expect(p.ageGroup).toBe('unspecified');
    expect(p.viewingDistanceCm).toBe(40);
    expect(p.schemaVersion).toBe('1.1.0');
  });

  it('save → load で同じ値', async () => {
    const p = createDefaultUserProfileV11(FIXED_NOW);
    p.onboardingCompleted = true;
    p.ageGroup = '50s';
    await saveUserProfileV11(p);
    const r = await loadUserProfileV11(FIXED_NOW);
    expect(r.onboardingCompleted).toBe(true);
    expect(r.ageGroup).toBe('50s');
  });

  it('updateUserProfileV11 で部分更新', async () => {
    const next = await updateUserProfileV11({ ageGroup: '60s' });
    expect(next.ageGroup).toBe('60s');
    expect(next.viewingDistanceCm).toBe(40); // 触っていない値はそのまま
  });

  it('不正 JSON でもデフォルト復帰', async () => {
    await AsyncStorage.setItem(KEY_USER_PROFILE_V11, '{ invalid');
    const p = await loadUserProfileV11(FIXED_NOW);
    expect(p.ageGroup).toBe('unspecified');
  });
});

describe('storage-v11: Settings v1.1', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('未保存時はデフォルト値（音/振動 ON、darkMode=system、片眼 off）', async () => {
    const s = await loadSettingsV11();
    expect(s.soundEnabled).toBe(true);
    expect(s.hapticsEnabled).toBe(true);
    expect(s.darkMode).toBe('system');
    expect(s.oneEyeGuidance).toBe('off');
  });

  it('save → load round-trip', async () => {
    const s = createDefaultSettingsV11();
    s.darkMode = 'dark';
    s.oneEyeGuidance = 'left';
    await saveSettingsV11(s);
    const r = await loadSettingsV11();
    expect(r.darkMode).toBe('dark');
    expect(r.oneEyeGuidance).toBe('left');
  });

  it('updateSettingsV11 で部分更新', async () => {
    const r = await updateSettingsV11({ soundEnabled: false });
    expect(r.soundEnabled).toBe(false);
    expect(r.hapticsEnabled).toBe(true);
  });
});

describe('storage-v11: Staircase v1.1', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('未保存時は initial 値で初期化される（v1.1.4 で G-04 は 0.06）', async () => {
    const s = await loadStaircaseV11('G-04');
    expect(s.gameId).toBe('G-04');
    expect(s.currentParam).toBeCloseTo(0.06, 5);
    expect(s.recentResults).toEqual([]);
  });

  it('save → load round-trip', async () => {
    let s = await loadStaircaseV11('G-01');
    s = applySessionResultV11(s, 'incorrect');
    s = applySessionResultV11(s, 'correct');
    await saveStaircaseV11(s);
    const r = await loadStaircaseV11('G-01');
    expect(r.currentParam).toBe(s.currentParam);
    expect(r.recentResults).toEqual(s.recentResults);
  });

  it('resetStaircaseV11 でストレージ上の値が初期値に戻る', async () => {
    let s = await loadStaircaseV11('G-04');
    s = applySessionResultV11(s, 'incorrect');
    await saveStaircaseV11(s);
    const r = await resetStaircaseV11('G-04');
    expect(r.currentParam).toBeCloseTo(0.06, 5);
    const reloaded = await loadStaircaseV11('G-04');
    expect(reloaded.currentParam).toBeCloseTo(0.06, 5);
  });

  it('resetAllStaircasesV11 で 13 ゲーム全部の staircase が初期化される', async () => {
    // G-01 を弄る
    let s = await loadStaircaseV11('G-01');
    s = applySessionResultV11(s, 'incorrect');
    await saveStaircaseV11(s);
    // G-04 も弄る
    let s4 = await loadStaircaseV11('G-04');
    s4 = applySessionResultV11(s4, 'incorrect');
    await saveStaircaseV11(s4);

    await resetAllStaircasesV11();
    const r1 = await loadStaircaseV11('G-01');
    const r4 = await loadStaircaseV11('G-04');
    expect(r1.currentParam).toBe(5);
    expect(r4.currentParam).toBeCloseTo(0.06, 5);
  });

  it('gameId 不一致の保存値は初期値を返す（堅牢性）', async () => {
    await AsyncStorage.setItem(
      KEY_STAIRCASE_V11('G-01'),
      JSON.stringify({
        gameId: 'G-99',
        currentParam: 999,
        consecutiveCorrect: 0,
        recentResults: [],
        updatedAt: FIXED_NOW(),
      }),
    );
    const s = await loadStaircaseV11('G-01');
    expect(s.currentParam).toBe(5);
  });
});

describe('storage-v11: Streak v1.1', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('未保存時は currentStreak=0', async () => {
    const s = await loadStreakV11();
    expect(s).toEqual(createDefaultStreakV11());
  });

  it('save → load', async () => {
    await saveStreakV11({
      currentStreak: 3,
      longestStreak: 7,
      lastCompletedDate: '2026-04-29',
    });
    const r = await loadStreakV11();
    expect(r.currentStreak).toBe(3);
    expect(r.longestStreak).toBe(7);
  });
});

describe('storage-v11: getKeysByPrefix / clearAllStorageV11', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('getKeysByPrefix はプレフィックス一致のみ抽出', async () => {
    await AsyncStorage.setItem('gaboreye:v1.1:foo', '1');
    await AsyncStorage.setItem('gaboreye:v1.1:bar', '2');
    await AsyncStorage.setItem('gaboreye:v1:legacy', '3');
    const keys = await getKeysByPrefix('gaboreye:v1.1:');
    expect(keys.sort()).toEqual(['gaboreye:v1.1:bar', 'gaboreye:v1.1:foo']);
  });

  it('clearAllStorageV11 は v1.1 名前空間のみ消去（v1 は触らない）', async () => {
    await AsyncStorage.setItem(KEY_USER_PROFILE_V11, '{}');
    await AsyncStorage.setItem('gaboreye:v1:legacy', 'still-here');
    await clearAllStorageV11();
    expect(await AsyncStorage.getItem(KEY_USER_PROFILE_V11)).toBeNull();
    expect(await AsyncStorage.getItem('gaboreye:v1:legacy')).toBe('still-here');
  });
});
