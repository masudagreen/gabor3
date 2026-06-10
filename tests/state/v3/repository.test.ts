/**
 * repository.test.ts — v3.0 型付き永続化（spec §7）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadSettings,
  saveSettings,
  loadUserProfile,
  saveUserProfile,
  loadLevelState,
  saveLevelState,
  loadStreak,
  saveStreak,
  loadPlayStats,
  savePlayStats,
  saveSessionRecord,
  loadSessionRecord,
  loadAllSessionRecords,
  saveDailyStats,
  loadDailyStats,
  loadAllDailyStats,
  saveBadgeStatus,
  loadBadgeStatus,
  loadAllBadgeStatuses,
} from '../../../src/state/v3/repository';
import { defaultSettings, type SessionRecord } from '../../../src/state/v3/schema';
import { STORAGE_KEYS, sessionKey } from '../../../src/state/v3/keys';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Settings', () => {
  it('未保存時は既定（フル範囲）を返す', async () => {
    const s = await loadSettings();
    expect(s.variableRanges.count).toEqual([1, 2, 3, 4]);
  });
  it('保存値を読み戻し、破損部分集合は正規化される', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ ...defaultSettings(), variableRanges: { ...defaultSettings().variableRanges, count: [3, 1] } }),
    );
    const s = await loadSettings();
    expect(s.variableRanges.count).toEqual([1, 3]); // 易→難順に正規化
  });
  it('v3 キーに書く', async () => {
    await saveSettings(defaultSettings());
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).toContain('gaboreye:v3:settings');
  });
});

describe('LevelState（§7.3）', () => {
  it('未保存時は初期状態（L1/0/0）', async () => {
    expect(await loadLevelState()).toEqual({
      currentLevel: 1,
      consecutiveFailures: 0,
      highestLevel: 0,
    });
  });
  it('round-trip', async () => {
    await saveLevelState({ currentLevel: 23, consecutiveFailures: 1, highestLevel: 22 });
    expect(await loadLevelState()).toEqual({
      currentLevel: 23,
      consecutiveFailures: 1,
      highestLevel: 22,
    });
  });
});

describe('UserProfile / Streak / PlayStats', () => {
  it('UserProfile round-trip', async () => {
    const p = await loadUserProfile();
    await saveUserProfile({ ...p, onboardingCompleted: true, viewingDistanceCm: 50 });
    const r = await loadUserProfile();
    expect(r.onboardingCompleted).toBe(true);
    expect(r.viewingDistanceCm).toBe(50);
  });
  it('PlayStats totalSessions/totalRounds/totalPlaySec round-trip', async () => {
    await savePlayStats({ totalSessions: 7, totalRounds: 30, totalPlaySec: 1800 });
    const p = await loadPlayStats();
    expect(p.totalSessions).toBe(7);
    expect(p.totalRounds).toBe(30);
    expect(p.totalPlaySec).toBe(1800);
  });
  it('v3.0 旧 totalGames を totalSessions/totalRounds に補完し totalPlaySec は 0（§7.9）', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.playStats, JSON.stringify({ totalGames: 4 }));
    const p = await loadPlayStats();
    expect(p.totalSessions).toBe(4);
    expect(p.totalRounds).toBe(4);
    expect(p.totalPlaySec).toBe(0);
  });
  it('Streak round-trip', async () => {
    await saveStreak({ currentStreak: 3, longestStreak: 5, lastPlayedDate: '2026-06-10' });
    expect((await loadStreak()).currentStreak).toBe(3);
  });
});

describe('SessionRecord（§7.4 コレクション、v3.1）', () => {
  const rec: SessionRecord = {
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
  };
  it('save/load 単体', async () => {
    await saveSessionRecord(rec);
    expect(await loadSessionRecord('s1')).toEqual(rec);
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).toContain(sessionKey('s1'));
  });
  it('loadAll で全件取得', async () => {
    await saveSessionRecord(rec);
    await saveSessionRecord({ ...rec, sessionId: 's2', clearCount: 0, failCount: 3 });
    const all = await loadAllSessionRecords();
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.sessionId).sort()).toEqual(['s1', 's2']);
  });
});

describe('DailyStats（§7.5 コレクション、v3.1）', () => {
  it('save/load/loadAll', async () => {
    await saveDailyStats({ date: '2026-06-10', highestLevelReached: 12, sessionCount: 3, roundCount: 9 });
    await saveDailyStats({ date: '2026-06-11', highestLevelReached: 5, sessionCount: 1, roundCount: 2 });
    expect(await loadDailyStats('2026-06-10')).toEqual({
      date: '2026-06-10',
      highestLevelReached: 12,
      sessionCount: 3,
      roundCount: 9,
    });
    expect(await loadAllDailyStats()).toHaveLength(2);
  });
  it('v3.0 旧 gameCount を sessionCount/roundCount に補完して読む（§7.9）', async () => {
    await AsyncStorage.setItem(
      'gaboreye:v3:dailyStats:2026-06-10',
      JSON.stringify({ date: '2026-06-10', highestLevelReached: 8, gameCount: 4 }),
    );
    expect(await loadDailyStats('2026-06-10')).toEqual({
      date: '2026-06-10',
      highestLevelReached: 8,
      sessionCount: 4,
      roundCount: 4,
    });
  });
});

describe('BadgeStatus（§7.8 コレクション）', () => {
  it('未保存は未獲得既定・保存後 round-trip', async () => {
    expect(await loadBadgeStatus('B-01')).toEqual({
      badgeId: 'B-01',
      earned: false,
      earnedAt: null,
    });
    await saveBadgeStatus({ badgeId: 'B-01', earned: true, earnedAt: '2026-06-10T00:00:00.000Z' });
    expect((await loadBadgeStatus('B-01')).earned).toBe(true);
    expect(await loadAllBadgeStatuses()).toHaveLength(1);
  });
});
