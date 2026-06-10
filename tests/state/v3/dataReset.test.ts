/**
 * dataReset.test.ts — v3.0 F-13「全データ削除」（spec §7.9）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAllData } from '../../../src/state/v3/dataReset';
import { STORAGE_KEYS, sessionKey, dailyStatsKey, badgeKey } from '../../../src/state/v3/keys';
import {
  loadLevelState,
  loadSettings,
  saveLevelState,
  saveSettings,
  saveSessionRecord,
  saveDailyStats,
  saveBadgeStatus,
} from '../../../src/state/v3/repository';
import { defaultSettings } from '../../../src/state/v3/schema';
import { setVariableRange as setRange } from '../../../src/state/v3/settings';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('deleteAllData', () => {
  it('全 v3 キーを空にし LevelState を L1/0/0・Settings をデフォルトに初期化', async () => {
    // データを撒く
    await saveLevelState({ currentLevel: 100, consecutiveFailures: 1, highestLevel: 99 });
    await saveSettings(setRange(defaultSettings(), 'count', [1, 2]));
    await saveSessionRecord({
      sessionId: 's1',
      startedAt: '2026-06-10T00:00:00.000Z',
      completedAt: '2026-06-10T00:05:00.000Z',
      sessionMinutes: 5,
      roundCount: 3,
      clearCount: 2,
      failCount: 1,
      startLevel: 5,
      endLevel: 6,
      highestLevelInSession: 6,
      playSec: 300,
    });
    await saveDailyStats({ date: '2026-06-10', highestLevelReached: 5, sessionCount: 1, roundCount: 3 });
    await saveBadgeStatus({ badgeId: 'B-01', earned: true, earnedAt: '2026-06-10T00:00:00.000Z' });

    await deleteAllData();

    const keys = await AsyncStorage.getAllKeys();
    // セッション/日次/バッジレコードは消える
    expect(keys).not.toContain(sessionKey('s1'));
    expect(keys).not.toContain(dailyStatsKey('2026-06-10'));
    expect(keys).not.toContain(badgeKey('B-01'));

    // LevelState は初期化
    expect(await loadLevelState()).toEqual({
      currentLevel: 1,
      consecutiveFailures: 0,
      highestLevel: 0,
    });
    // Settings はデフォルト（フル範囲）
    expect((await loadSettings()).variableRanges.count).toEqual([1, 2, 3, 4]);
  });

  it('resetNoticeShown フラグは保持する（再通知させない）', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.resetNoticeShown, 'true');
    await deleteAllData();
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).toContain(STORAGE_KEYS.resetNoticeShown);
  });
});
