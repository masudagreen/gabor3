/**
 * dataReset.test.ts — F-13 全データ削除（spec §6.9）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAllData } from '../../src/state/dataReset';
import { saveSettings, saveSession, loadSettings } from '../../src/state/repository';
import { acknowledgeResetNotice, runStartupMigration } from '../../src/state/migration';
import { defaultSettings } from '../../src/state/schema';
import { STORAGE_KEYS } from '../../src/state/keys';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('deleteAllData', () => {
  it('v2 データを全消去し既定で再初期化する', async () => {
    await saveSettings({ ...defaultSettings(), gridSize: 5 });
    await saveSession({
      sessionId: 's1',
      startedAt: '2026-05-30T10:00:00.000Z',
      completedAt: '2026-05-30T10:05:00.000Z',
      paramsSnapshot: { n: 4, m: 20, r: 5, a: 6, b: 0.15, scoringMode: 'auto-confirm' },
      rounds: [],
      sessionScore: 50,
    });

    await deleteAllData();

    // session は消えている
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((k) => k.startsWith('gaboreye:v2:session:'))).toEqual([]);
    // settings は既定に戻る
    expect(await loadSettings()).toEqual(defaultSettings());
  });

  it('全削除は F-11 リセット通知を再発させない（フラグ保持）', async () => {
    await acknowledgeResetNotice();
    await deleteAllData();

    // 旧データを入れても通知済みフラグが残っているので再通知しない
    await AsyncStorage.setItem('gaboreye:v1:x', '1');
    const result = await runStartupMigration();
    expect(result.shouldShowNotice).toBe(false);
  });
});
