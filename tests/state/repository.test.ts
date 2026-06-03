/**
 * repository.test.ts — レコードの load/save 往復（spec §6）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadSettings,
  saveSettings,
  loadUserProfile,
  saveUserProfile,
  loadStreak,
  saveStreak,
  loadPlayStats,
  savePlayStats,
  saveSession,
  loadSession,
  loadAllSessions,
  saveDailyStats,
  loadDailyStats,
  loadAllDailyStats,
  saveBadgeStatus,
  loadBadgeStatus,
  loadAllBadgeStatuses,
} from '../../src/state/repository';
import {
  defaultSettings,
  defaultStreak,
  defaultPlayStats,
  defaultBadgeStatus,
  SessionRecord,
} from '../../src/state/schema';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Settings load/save', () => {
  it('未保存時は既定値を返す', async () => {
    expect(await loadSettings()).toEqual(defaultSettings());
  });

  it('保存した値を読み戻せる', async () => {
    const s = { ...defaultSettings(), gridSize: 5, roundSeconds: 45 };
    await saveSettings(s);
    expect(await loadSettings()).toEqual(s);
  });

  it('既存値に欠損フィールドがあれば既定でマージされる', async () => {
    await AsyncStorage.setItem(
      'gaboreye:v2:settings',
      JSON.stringify({ gridSize: 3 }),
    );
    const loaded = await loadSettings();
    expect(loaded.gridSize).toBe(3);
    expect(loaded.scoringMode).toBe('auto-confirm'); // 既定で補完
  });
});

describe('UserProfile load/save', () => {
  it('未保存時は既定（onboarding 未完了・距離 40）を返す', async () => {
    const p = await loadUserProfile();
    expect(p.onboardingCompleted).toBe(false);
    expect(p.viewingDistanceCm).toBe(40);
    expect(p.schemaVersion).toBe('2.0.0');
  });

  it('保存した値を読み戻せる', async () => {
    const p = await loadUserProfile();
    p.onboardingCompleted = true;
    p.ageGroup = '50s';
    await saveUserProfile(p);
    const loaded = await loadUserProfile();
    expect(loaded.onboardingCompleted).toBe(true);
    expect(loaded.ageGroup).toBe('50s');
  });
});

describe('Streak / PlayStats', () => {
  it('既定値を返す', async () => {
    expect(await loadStreak()).toEqual(defaultStreak());
    expect(await loadPlayStats()).toEqual(defaultPlayStats());
  });

  it('保存・読み戻し', async () => {
    await saveStreak({ currentStreak: 3, longestStreak: 7, lastPlayedDate: '2026-05-30' });
    await savePlayStats({ totalSessions: 12 });
    expect((await loadStreak()).currentStreak).toBe(3);
    expect((await loadPlayStats()).totalSessions).toBe(12);
  });
});

describe('SessionRecord コレクション', () => {
  const makeSession = (id: string): SessionRecord => ({
    sessionId: id,
    startedAt: '2026-05-30T10:00:00.000Z',
    completedAt: '2026-05-30T10:05:00.000Z',
    paramsSnapshot: { n: 4, m: 20, r: 5, a: 6, b: 0.15, scoringMode: 'auto-confirm' },
    rounds: [],
    sessionScore: 88,
  });

  it('保存・個別読み・全件読みができる', async () => {
    await saveSession(makeSession('s1'));
    await saveSession(makeSession('s2'));
    expect((await loadSession('s1'))?.sessionScore).toBe(88);
    const all = await loadAllSessions();
    expect(all.map((s) => s.sessionId).sort()).toEqual(['s1', 's2']);
  });

  it('未保存 ID は null', async () => {
    expect(await loadSession('nope')).toBeNull();
  });
});

describe('DailyStats コレクション', () => {
  it('日付ごとに保存・全件読み', async () => {
    await saveDailyStats({ date: '2026-05-29', bestSessionScore: 70, sessionCount: 1 });
    await saveDailyStats({ date: '2026-05-30', bestSessionScore: 90, sessionCount: 2 });
    expect((await loadDailyStats('2026-05-30'))?.bestSessionScore).toBe(90);
    expect((await loadAllDailyStats()).length).toBe(2);
  });
});

describe('BadgeStatus コレクション', () => {
  it('未保存バッジは既定（未獲得）を返す', async () => {
    expect(await loadBadgeStatus('B-01')).toEqual(defaultBadgeStatus('B-01'));
  });

  it('獲得済みを保存・全件読み', async () => {
    await saveBadgeStatus({ badgeId: 'B-01', earned: true, earnedAt: '2026-05-30T10:00:00.000Z' });
    expect((await loadBadgeStatus('B-01')).earned).toBe(true);
    expect((await loadAllBadgeStatuses()).length).toBe(1);
  });
});

describe('破損データのフォールバック', () => {
  it('壊れた JSON は既定値にフォールバックする', async () => {
    await AsyncStorage.setItem('gaboreye:v2:settings', '{not json');
    expect(await loadSettings()).toEqual(defaultSettings());
  });
});
