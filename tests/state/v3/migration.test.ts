/**
 * migration.test.ts — F-11 起動時 v3 データ初期化（spec §7.9 / AS-13）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  runStartupMigration,
  ensureV3Initialized,
  acknowledgeResetNotice,
  isLegacyKey,
  isV3Key,
  selectLegacyKeys,
} from '../../../src/state/v3/migration';
import { STORAGE_KEYS } from '../../../src/state/v3/keys';
import {
  loadLevelState,
  loadSettings,
  loadPlayStats,
  loadUserProfile,
  wasResetNoticeShown,
} from '../../../src/state/v3/repository';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('キー判定（純関数）', () => {
  it('旧名前空間（v1〜v2）を判定する', () => {
    expect(isLegacyKey('gaboreye:v1:foo')).toBe(true);
    expect(isLegacyKey('gaboreye:v1.1:foo')).toBe(true);
    expect(isLegacyKey('gaboreye:v1.2:foo')).toBe(true);
    expect(isLegacyKey('gaboreye:v2:foo')).toBe(true); // v2 も消去対象（F-11）
    expect(isLegacyKey('gaboreye:v3:foo')).toBe(false);
    expect(isLegacyKey('other:key')).toBe(false);
  });
  it('v3 名前空間を判定する', () => {
    expect(isV3Key('gaboreye:v3:settings')).toBe(true);
    expect(isV3Key('gaboreye:v2:settings')).toBe(false);
  });
  it('全キーから旧名前空間（v1〜v2）のみ抽出する', () => {
    const keys = [
      'gaboreye:v1:a',
      'gaboreye:v1.2:b',
      'gaboreye:v2:c',
      'gaboreye:v3:d',
      'unrelated',
    ];
    expect(selectLegacyKeys(keys).sort()).toEqual(
      ['gaboreye:v1:a', 'gaboreye:v1.2:b', 'gaboreye:v2:c'].sort(),
    );
  });
});

describe('runStartupMigration（F-11）', () => {
  it('旧名前空間（v1〜v2）を消去し v3 で初期化（L1・連続失敗 0・highest 0）', async () => {
    await AsyncStorage.multiSet([
      ['gaboreye:v1:profile', '{}'],
      ['gaboreye:v1.2:settings', '{}'],
      ['gaboreye:v2:settings', '{"scoringMode":"auto-confirm"}'],
      ['gaboreye:v2:session:abc', '{}'],
    ]);

    const result = await runStartupMigration();

    expect(result.didReset).toBe(true);
    expect(result.removedCount).toBe(4);
    expect(result.shouldShowNotice).toBe(true);

    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((k) => k.startsWith('gaboreye:v1'))).toBe(false);
    expect(keys.some((k) => k.startsWith('gaboreye:v2:'))).toBe(false);

    const ls = await loadLevelState();
    expect(ls).toEqual({ currentLevel: 1, consecutiveFailures: 0, highestLevel: 0 });

    // v3 中核が初期化されている
    expect(keys).toContain(STORAGE_KEYS.settings);
    expect(keys).toContain(STORAGE_KEYS.levelState);
    expect(keys).toContain(STORAGE_KEYS.userProfile);
    expect(keys).toContain(STORAGE_KEYS.streak);
    expect(keys).toContain(STORAGE_KEYS.playStats);
  });

  it('旧データが無ければ消去せず通知も出さない', async () => {
    const result = await runStartupMigration();
    expect(result.didReset).toBe(false);
    expect(result.removedCount).toBe(0);
    expect(result.shouldShowNotice).toBe(false);
  });

  it('2 回目以降は冪等（旧キーが残っていなければ消去しない）', async () => {
    await AsyncStorage.setItem('gaboreye:v2:settings', '{}');
    const first = await runStartupMigration();
    expect(first.didReset).toBe(true);
    const second = await runStartupMigration();
    expect(second.didReset).toBe(false);
    expect(second.shouldShowNotice).toBe(false);
  });

  it('消去はしたが既に通知済みなら shouldShowNotice=false', async () => {
    await AsyncStorage.setItem('gaboreye:v2:settings', '{}');
    await acknowledgeResetNotice(); // 既に通知済み
    const result = await runStartupMigration();
    expect(result.didReset).toBe(true);
    expect(result.shouldShowNotice).toBe(false);
  });

  it('acknowledgeResetNotice 後は通知済みフラグが立つ', async () => {
    await acknowledgeResetNotice();
    expect(await wasResetNoticeShown()).toBe(true);
  });

  it('既存の v3 値は保持する（ensureV3Initialized は上書きしない）', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.levelState,
      JSON.stringify({ currentLevel: 42, consecutiveFailures: 1, highestLevel: 40 }),
    );
    await ensureV3Initialized();
    const ls = await loadLevelState();
    expect(ls.currentLevel).toBe(42);
  });
});

describe('v3.0 → v3.1 非リセット補完（§7.9・名前空間据え置き）', () => {
  it('旧 v3.0 Settings（sessionMinutes なし）に既定 5 を補完する', async () => {
    // v3.0 形の Settings（sessionMinutes フィールド無し）を保存。
    await AsyncStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        variableRanges: {
          count: [1, 2, 3, 4],
          seconds: [40, 35, 30, 25, 20],
          direction: ['one-way', 'oscillate'],
          gridSize: [3, 4],
          rotationSpeed: [6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2],
        },
        variableOrder: ['count', 'seconds', 'direction', 'gridSize', 'rotationSpeed'],
        darkMode: 'system',
        soundEnabled: true,
        hapticsEnabled: true,
        oneEyeGuidance: 'off',
      }),
    );
    await ensureV3Initialized();
    const s = await loadSettings();
    expect(s.sessionMinutes).toBe(5); // 既定で補完（梯子は v3.0 のまま）
    expect(s.variableRanges.count).toEqual([1, 2, 3, 4]);
  });

  it('旧 v3.0 PlayStats（totalGames）を totalSessions/totalRounds に補完する', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.playStats, JSON.stringify({ totalGames: 12 }));
    await ensureV3Initialized();
    const p = await loadPlayStats();
    expect(p.totalSessions).toBe(12);
    expect(p.totalRounds).toBe(12);
  });

  it('UserProfile.schemaVersion を 3.1.0 へ更新する（既存プロフィールは保持）', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.userProfile,
      JSON.stringify({
        onboardingCompleted: true,
        disclaimerAgreedAt: '2026-06-01T00:00:00.000Z',
        ageGroup: '50s',
        viewingDistanceCm: 40,
        deviceTypeEstimated: 'iphone',
        createdAt: '2026-06-01T00:00:00.000Z',
        schemaVersion: '3.0.0',
      }),
    );
    await ensureV3Initialized();
    const p = await loadUserProfile();
    expect(p.schemaVersion).toBe('3.1.0');
    expect(p.onboardingCompleted).toBe(true); // 既存値は保持
    expect(p.ageGroup).toBe('50s');
  });

  it('旧 game:<uuid> レコードは無視する（リセットせず放置・SessionRecord に移行しない）', async () => {
    await AsyncStorage.setItem(
      'gaboreye:v3:game:old1',
      JSON.stringify({ gameId: 'old1', result: 'clear', level: 5 }),
    );
    await ensureV3Initialized();
    const keys = await AsyncStorage.getAllKeys();
    // 名前空間据え置きのため破棄はしない（残っていてよい）。SessionRecord には現れない。
    expect(keys).toContain('gaboreye:v3:game:old1');
  });
});
