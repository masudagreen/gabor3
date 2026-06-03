/**
 * migration.test.ts — F-11 起動時データリセット（spec §6.1）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  runStartupMigration,
  acknowledgeResetNotice,
  isLegacyKey,
  isV2Key,
  selectLegacyKeys,
} from '../../src/state/migration';
import { STORAGE_KEYS } from '../../src/state/keys';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('キー判定（純関数）', () => {
  it('旧名前空間を判定する', () => {
    expect(isLegacyKey('gaboreye:v1:foo')).toBe(true);
    expect(isLegacyKey('gaboreye:v1.1:foo')).toBe(true);
    expect(isLegacyKey('gaboreye:v1.2:foo')).toBe(true);
    expect(isLegacyKey('gaboreye:v2:foo')).toBe(false);
    expect(isLegacyKey('other:key')).toBe(false);
  });

  it('v2 名前空間を判定する', () => {
    expect(isV2Key('gaboreye:v2:settings')).toBe(true);
    expect(isV2Key('gaboreye:v1:settings')).toBe(false);
  });

  it('全キーから旧名前空間のみ抽出する', () => {
    const keys = [
      'gaboreye:v1:a',
      'gaboreye:v1.2:b',
      'gaboreye:v2:c',
      'unrelated',
    ];
    expect(selectLegacyKeys(keys).sort()).toEqual([
      'gaboreye:v1.2:b',
      'gaboreye:v1:a',
    ]);
  });
});

describe('runStartupMigration', () => {
  it('旧データがあれば消去し v2 で初期化、通知を出すべきと返す', async () => {
    await AsyncStorage.setItem('gaboreye:v1:staircase', '{"x":1}');
    await AsyncStorage.setItem('gaboreye:v1.1:history', '[]');
    await AsyncStorage.setItem('gaboreye:v1.2:badge', '{}');

    const result = await runStartupMigration();

    expect(result.didReset).toBe(true);
    expect(result.removedCount).toBe(3);
    expect(result.shouldShowNotice).toBe(true);

    // 旧キーは消えている
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((k) => k.startsWith('gaboreye:v1'))).toEqual([]);

    // v2 中核レコードが初期化されている
    expect(keys).toContain(STORAGE_KEYS.settings);
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

  it('2 回目以降は通知を出さない（通知確認後）', async () => {
    await AsyncStorage.setItem('gaboreye:v1:x', '1');
    const first = await runStartupMigration();
    expect(first.shouldShowNotice).toBe(true);

    await acknowledgeResetNotice();

    // もう一度旧データを入れても、通知済みフラグが立っていれば再通知しない
    await AsyncStorage.setItem('gaboreye:v1:y', '2');
    const second = await runStartupMigration();
    expect(second.didReset).toBe(true);
    expect(second.shouldShowNotice).toBe(false);
  });

  it('既存 v2 データは消去・上書きしない', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ gridSize: 5 }),
    );
    await AsyncStorage.setItem('gaboreye:v1:x', '1');

    await runStartupMigration();

    const raw = await AsyncStorage.getItem(STORAGE_KEYS.settings);
    expect(JSON.parse(raw as string).gridSize).toBe(5);
  });
});
