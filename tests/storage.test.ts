/**
 * AsyncStorage を介した StaircaseState の round-trip テスト。
 */

import {
  applyTrialResult,
  createStaircase,
} from '../src/lib/staircase';
import {
  appendSession,
  appendTrials,
  clearAllStorage,
  createDefaultBadgeStatuses,
  createDefaultSettings,
  createDefaultUserProfile,
  getTotalTrialCount,
  loadAllDailyStats,
  loadBadgeStatuses,
  loadSessions,
  loadSettings,
  loadStaircase,
  loadStreak,
  loadTrials,
  loadUserProfile,
  resetAllStaircases,
  resetStaircaseStorage,
  saveBadgeStatuses,
  saveSettings,
  saveStaircase,
  saveStreak,
  saveUserProfile,
  updateSettings,
  updateUserProfile,
  upsertDailyStats,
} from '../src/state/storage';

// jest-expo preset には AsyncStorage の jest-mock が同梱されているが、
// 念のため明示的に mock を使う。
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const FIXED_NOW = () => '2026-04-29T00:00:00.000Z';

describe('storage: StaircaseState round-trip', () => {
  beforeEach(async () => {
    await clearAllStorage();
  });

  it('未保存時は初期値を返す', async () => {
    const s = await loadStaircase('game2');
    expect(s.gameId).toBe('game2');
    expect(s.currentParam).toBe(6);
    expect(s.reversalCount).toBe(0);
  });

  it('保存して読み戻すと同じ値が返る', async () => {
    let s = createStaircase('game2', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'correct', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'incorrect', undefined, FIXED_NOW);
    await saveStaircase(s);

    const loaded = await loadStaircase('game2');
    expect(loaded.currentParam).toBe(s.currentParam);
    expect(loaded.lastDirection).toBe(s.lastDirection);
    expect(loaded.consecutiveCorrect).toBe(s.consecutiveCorrect);
  });

  it('リセットすると初期値が保存される', async () => {
    let s = createStaircase('game2', undefined, FIXED_NOW);
    s = applyTrialResult(s, 'incorrect', undefined, FIXED_NOW);
    await saveStaircase(s);

    const reset = await resetStaircaseStorage('game2');
    expect(reset.currentParam).toBe(6);
    expect(reset.reversalCount).toBe(0);

    const loaded = await loadStaircase('game2');
    expect(loaded.currentParam).toBe(6);
  });

  it('複数 staircase（game1 / game2）が独立に保存・読み出しできる', async () => {
    let g1 = createStaircase('game1', undefined, FIXED_NOW);
    g1 = applyTrialResult(g1, 'incorrect', undefined, FIXED_NOW); // 5 + 1 = 6
    let g2 = createStaircase('game2', undefined, FIXED_NOW);
    g2 = applyTrialResult(g2, 'correct', undefined, FIXED_NOW);
    g2 = applyTrialResult(g2, 'correct', undefined, FIXED_NOW);
    g2 = applyTrialResult(g2, 'correct', undefined, FIXED_NOW); // 6 - 4 = 2

    await saveStaircase(g1);
    await saveStaircase(g2);

    const loadedG1 = await loadStaircase('game1');
    const loadedG2 = await loadStaircase('game2');
    expect(loadedG1.currentParam).toBe(6);
    expect(loadedG1.lastDirection).toBe('up');
    expect(loadedG2.currentParam).toBe(2);
    expect(loadedG2.lastDirection).toBe('down');

    // game1 をリセットしても game2 は残る
    await resetStaircaseStorage('game1');
    const reG1 = await loadStaircase('game1');
    const stillG2 = await loadStaircase('game2');
    expect(reG1.currentParam).toBe(5); // initial
    expect(stillG2.currentParam).toBe(2);
  });

  it('SessionRecord の sessionType が course / single の両方を保存できる', async () => {
    await appendSession({
      sessionId: 'course-1',
      sessionType: 'course',
      startedAt: FIXED_NOW(),
      completedAt: FIXED_NOW(),
      game1Threshold: 4.5,
      game2Threshold: 3.5,
      game3Threshold: null,
      v1Score: null,
      trialCount: 25,
    });
    await appendSession({
      sessionId: 'single-1',
      sessionType: 'single',
      startedAt: FIXED_NOW(),
      completedAt: FIXED_NOW(),
      game1Threshold: null,
      game2Threshold: 4.0,
      game3Threshold: null,
      v1Score: null,
      trialCount: 18,
    });

    const sessions = await loadSessions();
    expect(sessions).toHaveLength(2);
    const course = sessions.find((s) => s.sessionId === 'course-1');
    const single = sessions.find((s) => s.sessionId === 'single-1');
    expect(course?.sessionType).toBe('course');
    expect(single?.sessionType).toBe('single');
  });

  it('Sessions / Trials の append と load', async () => {
    await appendSession({
      sessionId: 's1',
      sessionType: 'single',
      startedAt: FIXED_NOW(),
      completedAt: FIXED_NOW(),
      game1Threshold: null,
      game2Threshold: 4.2,
      game3Threshold: null,
      v1Score: null,
      trialCount: 23,
    });
    await appendTrials([
      {
        trialId: 't1',
        sessionId: 's1',
        gameId: 'game2',
        paramValue: 6,
        isCorrect: true,
        responseTimeMs: 800,
        timestamp: FIXED_NOW(),
      },
    ]);

    const sessions = await loadSessions();
    const trials = await loadTrials();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].game2Threshold).toBe(4.2);
    expect(trials).toHaveLength(1);
    expect(trials[0].isCorrect).toBe(true);
  });
});

describe('storage: UserProfile round-trip（spec.md §12.1）', () => {
  beforeEach(async () => {
    await clearAllStorage();
  });

  it('未保存時はデフォルト UserProfile が返る（onboardingCompleted=false）', async () => {
    const p = await loadUserProfile(FIXED_NOW);
    expect(p.onboardingCompleted).toBe(false);
    expect(p.disclaimerAgreedAt).toBeNull();
    expect(p.ageGroup).toBe('unspecified');
    expect(p.viewingDistanceCm).toBe(40);
    expect(p.deviceTypeEstimated).toBe('pc');
    expect(p.createdAt).toBe(FIXED_NOW());
  });

  it('保存して読み戻すと同じ値が返る（onboardingCompleted=true）', async () => {
    const profile = createDefaultUserProfile(FIXED_NOW);
    profile.onboardingCompleted = true;
    profile.disclaimerAgreedAt = '2026-04-29T10:00:00.000Z';
    profile.ageGroup = '60s';
    profile.viewingDistanceCm = 50;
    profile.deviceTypeEstimated = 'iphone';
    await saveUserProfile(profile);

    const loaded = await loadUserProfile(FIXED_NOW);
    expect(loaded.onboardingCompleted).toBe(true);
    expect(loaded.disclaimerAgreedAt).toBe('2026-04-29T10:00:00.000Z');
    expect(loaded.ageGroup).toBe('60s');
    expect(loaded.viewingDistanceCm).toBe(50);
    expect(loaded.deviceTypeEstimated).toBe('iphone');
  });

  it('updateUserProfile で部分更新できる（既存値は保持）', async () => {
    const initial = createDefaultUserProfile(FIXED_NOW);
    initial.viewingDistanceCm = 30;
    await saveUserProfile(initial);

    const updated = await updateUserProfile({
      onboardingCompleted: true,
      disclaimerAgreedAt: '2026-04-29T11:00:00.000Z',
    });
    expect(updated.onboardingCompleted).toBe(true);
    expect(updated.disclaimerAgreedAt).toBe('2026-04-29T11:00:00.000Z');
    // 既存値は保持
    expect(updated.viewingDistanceCm).toBe(30);
  });

  it('clearAllStorage で UserProfile も削除される（オンボーディングからやり直し）', async () => {
    const profile = createDefaultUserProfile(FIXED_NOW);
    profile.onboardingCompleted = true;
    await saveUserProfile(profile);

    await clearAllStorage();

    const loaded = await loadUserProfile(FIXED_NOW);
    expect(loaded.onboardingCompleted).toBe(false);
    expect(loaded.disclaimerAgreedAt).toBeNull();
  });

  it('70s+ ageGroup を保存できる（A-9 / spec.md §12.1）', async () => {
    await updateUserProfile({ ageGroup: '70s+' });
    const loaded = await loadUserProfile(FIXED_NOW);
    expect(loaded.ageGroup).toBe('70s+');
  });
});

describe('storage: DailyStats round-trip（spec.md §12.1）', () => {
  beforeEach(async () => {
    await clearAllStorage();
  });

  it('upsert で新規作成 → 読み戻すと同じ値', async () => {
    await upsertDailyStats('2026-04-29', {
      courseCompleted: true,
      game1BestThreshold: 4,
      game2BestThreshold: 4.2,
      game3BestThreshold: 12,
      v1Score: 76,
      sessionCount: 1,
    });
    const all = await loadAllDailyStats();
    expect(all).toHaveLength(1);
    expect(all[0].date).toBe('2026-04-29');
    expect(all[0].v1Score).toBe(76);
    expect(all[0].game2BestThreshold).toBe(4.2);
  });

  it('同じ日の upsert は閾値が小さい方を採用、スコアは大きい方', async () => {
    await upsertDailyStats('2026-04-29', {
      courseCompleted: true,
      game1BestThreshold: 5,
      game2BestThreshold: 5,
      game3BestThreshold: 15,
      v1Score: 65,
      sessionCount: 1,
    });
    // 2 セッション目：Game 1 改善、Game 2 悪化、スコア改善
    await upsertDailyStats('2026-04-29', {
      game1BestThreshold: 4, // 改善
      game2BestThreshold: 6, // 悪化（無視されるべき）
      v1Score: 70, // 改善（採用）
      sessionCount: 2,
    });
    const all = await loadAllDailyStats();
    expect(all).toHaveLength(1);
    expect(all[0].game1BestThreshold).toBe(4); // min(5, 4)
    expect(all[0].game2BestThreshold).toBe(5); // min(5, 6)
    expect(all[0].game3BestThreshold).toBe(15); // 既存値保持
    expect(all[0].v1Score).toBe(70); // max(65, 70)
    expect(all[0].sessionCount).toBe(2);
  });

  it('複数日に渡る upsert', async () => {
    await upsertDailyStats('2026-04-28', { v1Score: 50, sessionCount: 1 });
    await upsertDailyStats('2026-04-29', { v1Score: 76, sessionCount: 1 });
    const all = await loadAllDailyStats();
    expect(all).toHaveLength(2);
    expect(all.find((d) => d.date === '2026-04-28')?.v1Score).toBe(50);
    expect(all.find((d) => d.date === '2026-04-29')?.v1Score).toBe(76);
  });

  it('clearAllStorage で DailyStats も削除される', async () => {
    await upsertDailyStats('2026-04-29', { v1Score: 76, sessionCount: 1 });
    await clearAllStorage();
    const all = await loadAllDailyStats();
    expect(all).toHaveLength(0);
  });
});

describe('storage: Streak round-trip（spec.md §12.1、Sprint 6）', () => {
  beforeEach(async () => {
    await clearAllStorage();
  });

  it('未保存時はデフォルト Streak（currentStreak=0、lastCompletedDate=null）', async () => {
    const s = await loadStreak();
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(0);
    expect(s.lastCompletedDate).toBeNull();
  });

  it('saveStreak → loadStreak の round-trip', async () => {
    await saveStreak({
      currentStreak: 7,
      longestStreak: 12,
      lastCompletedDate: '2026-04-29',
    });
    const loaded = await loadStreak();
    expect(loaded.currentStreak).toBe(7);
    expect(loaded.longestStreak).toBe(12);
    expect(loaded.lastCompletedDate).toBe('2026-04-29');
  });

  it('clearAllStorage で Streak も削除される', async () => {
    await saveStreak({
      currentStreak: 5,
      longestStreak: 5,
      lastCompletedDate: '2026-04-28',
    });
    await clearAllStorage();
    const after = await loadStreak();
    expect(after.currentStreak).toBe(0);
    expect(after.lastCompletedDate).toBeNull();
  });
});

describe('storage: BadgeStatus round-trip（spec.md §12.1、Sprint 6）', () => {
  beforeEach(async () => {
    await clearAllStorage();
  });

  it('未保存時は 8 種類すべて未獲得', async () => {
    const all = await loadBadgeStatuses();
    expect(all).toHaveLength(8);
    expect(all.every((b) => !b.earned)).toBe(true);
    expect(all.every((b) => b.earnedAt == null)).toBe(true);
    expect(all.map((b) => b.badgeId)).toEqual([
      'B-01',
      'B-02',
      'B-03',
      'B-04',
      'B-05',
      'B-06',
      'B-07',
      'B-08',
    ]);
  });

  it('saveBadgeStatuses → loadBadgeStatuses の round-trip', async () => {
    const initial = createDefaultBadgeStatuses();
    initial[0] = {
      badgeId: 'B-01',
      earned: true,
      earnedAt: '2026-04-29T12:00:00.000Z',
    };
    await saveBadgeStatuses(initial);
    const loaded = await loadBadgeStatuses();
    expect(loaded[0].earned).toBe(true);
    expect(loaded[0].earnedAt).toBe('2026-04-29T12:00:00.000Z');
    expect(loaded[1].earned).toBe(false);
  });
});

describe('storage: Settings round-trip（spec.md §10.1 / §12.1、Sprint 7）', () => {
  beforeEach(async () => {
    await clearAllStorage();
  });

  it('未保存時はデフォルト Settings（OS 連動 / 効果音 ON / 振動 ON / BGM OFF）', async () => {
    const s = await loadSettings();
    expect(s).toEqual(createDefaultSettings());
    expect(s.darkMode).toBe('system');
    expect(s.soundEnabled).toBe(true);
    expect(s.hapticsEnabled).toBe(true);
    expect(s.game3BgmEnabled).toBe(false);
    expect(s.oneEyeGuidance).toBe('off');
  });

  it('saveSettings で保存して読み戻すと同じ値', async () => {
    await saveSettings({
      soundEnabled: false,
      hapticsEnabled: false,
      darkMode: 'dark',
      oneEyeGuidance: 'alternate',
      game3BgmEnabled: true,
    });
    const loaded = await loadSettings();
    expect(loaded.soundEnabled).toBe(false);
    expect(loaded.hapticsEnabled).toBe(false);
    expect(loaded.darkMode).toBe('dark');
    expect(loaded.oneEyeGuidance).toBe('alternate');
    expect(loaded.game3BgmEnabled).toBe(true);
  });

  it('updateSettings で部分更新（既存値は保持）', async () => {
    await saveSettings(createDefaultSettings());
    const after = await updateSettings({ darkMode: 'light', soundEnabled: false });
    expect(after.darkMode).toBe('light');
    expect(after.soundEnabled).toBe(false);
    // 既存値は保持
    expect(after.hapticsEnabled).toBe(true);
    expect(after.game3BgmEnabled).toBe(false);
  });

  it('clearAllStorage で Settings も削除されてデフォルトに戻る', async () => {
    await saveSettings({ ...createDefaultSettings(), darkMode: 'dark' });
    await clearAllStorage();
    const after = await loadSettings();
    expect(after.darkMode).toBe('system');
  });

  it('全データ削除 → loadUserProfile / loadSettings がデフォルトに戻る（再オンボへ）', async () => {
    const profile = createDefaultUserProfile();
    profile.onboardingCompleted = true;
    profile.disclaimerAgreedAt = '2026-04-29T10:00:00.000Z';
    await saveUserProfile(profile);
    await saveSettings({ ...createDefaultSettings(), darkMode: 'dark' });
    await saveStreak({ currentStreak: 5, longestStreak: 5, lastCompletedDate: '2026-04-28' });

    await clearAllStorage();

    const p = await loadUserProfile();
    const s = await loadSettings();
    const sk = await loadStreak();
    expect(p.onboardingCompleted).toBe(false);
    expect(p.disclaimerAgreedAt).toBeNull();
    expect(s.darkMode).toBe('system');
    expect(sk.currentStreak).toBe(0);
  });
});

describe('storage: resetAllStaircases（spec.md §10.1 staircase リセット）', () => {
  beforeEach(async () => {
    await clearAllStorage();
  });

  it('3 ゲームすべての staircase が初期値に戻る', async () => {
    // game1: 1 incorrect で param が 1 上がる（5 → 6）
    let g1 = createStaircase('game1');
    g1 = applyTrialResult(g1, 'incorrect');
    await saveStaircase(g1);
    // game2: 3 correct で param が下がる
    let g2 = createStaircase('game2');
    g2 = applyTrialResult(g2, 'correct');
    g2 = applyTrialResult(g2, 'correct');
    g2 = applyTrialResult(g2, 'correct');
    await saveStaircase(g2);

    await resetAllStaircases();

    const reG1 = await loadStaircase('game1');
    const reG2 = await loadStaircase('game2');
    const reG3 = await loadStaircase('game3');
    expect(reG1.currentParam).toBe(5);
    expect(reG2.currentParam).toBe(6);
    expect(reG3.currentParam).toBe(30);
    expect(reG1.reversalCount).toBe(0);
    expect(reG2.reversalCount).toBe(0);
    expect(reG3.reversalCount).toBe(0);
  });
});

describe('storage: TrialRecord append + 累計試行数', () => {
  beforeEach(async () => {
    await clearAllStorage();
  });

  it('TrialRecord を append すると累計試行数が増える（B-05 用）', async () => {
    const trials = Array.from({ length: 5 }, (_, i) => ({
      trialId: `t-${i}`,
      sessionId: 's1',
      gameId: 'game2' as const,
      paramValue: 6,
      isCorrect: true,
      responseTimeMs: 800,
      timestamp: '2026-04-29T00:00:00.000Z',
    }));
    await appendTrials(trials);
    expect(await getTotalTrialCount()).toBe(5);
  });

  it('TrialRecord が無い場合は SessionRecord.trialCount を集計（後方互換）', async () => {
    await appendSession({
      sessionId: 'course-1',
      sessionType: 'course',
      startedAt: '2026-04-29T00:00:00.000Z',
      completedAt: '2026-04-29T00:03:00.000Z',
      game1Threshold: 4,
      game2Threshold: 4.2,
      game3Threshold: 12,
      v1Score: 76,
      trialCount: 50,
    });
    await appendSession({
      sessionId: 'single-1',
      sessionType: 'single',
      startedAt: '2026-04-29T00:00:00.000Z',
      completedAt: '2026-04-29T00:01:00.000Z',
      game1Threshold: null,
      game2Threshold: 4.0,
      game3Threshold: null,
      v1Score: null,
      trialCount: 25,
    });
    expect(await getTotalTrialCount()).toBe(75);
  });
});
