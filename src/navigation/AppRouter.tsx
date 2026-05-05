/**
 * AppRouter — Sprint 4 でオンボーディング動線と UserProfile 連動を追加。
 *
 * 起動シーケンス：
 *   1. UserProfile を AsyncStorage から読み出し
 *   2. deviceTypeEstimated を Dimensions + Platform + UA から計算し、未設定なら更新
 *   3. onboardingCompleted=false → 'onboarding' ルート
 *      true → 'home' ルート
 *
 * Sprint 4 では設定からの距離変更動線は未実装（Sprint 7）。視聴距離は
 * UserProfile.viewingDistanceCm を全ゲーム / 距離リマインドに伝播する。
 *
 * Sprint 3 までのルート（home / select / reminder / game1〜3 / singleResult / postSingle / course / debug）
 * は維持。
 */

import React from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getColors } from '../theme';
import { HomeScreen, HomeGameId } from '../screens/HomeScreen';
import { Game2Screen, Game2Result } from '../screens/Game2Screen';
import { Game1Screen, Game1Result } from '../screens/Game1Screen';
import { Game3Screen, Game3Result } from '../screens/Game3Screen';
import { CourseScreen } from '../screens/CourseScreen';
import { GameSelectScreen } from '../screens/GameSelectScreen';
import { SinglePlayPostScreen } from '../screens/SinglePlayPostScreen';
import { DistanceReminder } from '../components/DistanceReminder';
import { ResultSummary } from '../components/ResultSummary';
import { StaircaseDebugScreen } from '../screens/StaircaseDebugScreen';
import { OnboardingFlow } from '../screens/Onboarding/OnboardingFlow';
import { ProgressScreen } from '../screens/ProgressScreen';
import { BadgeListScreen } from '../screens/BadgeListScreen';
import { DailyBestScreen } from '../screens/DailyBestScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ThemeProvider } from '../theme/ThemeProvider';
import { SkipLink } from '../components/SkipLink';
import {
  appendSession,
  appendTrials,
  clearAllStorage,
  createDefaultBadgeStatuses,
  createDefaultSettings,
  createDefaultStreak,
  DailyStats,
  getTotalTrialCount,
  loadAllDailyStats,
  loadBadgeStatuses,
  loadSettings,
  loadStreak,
  loadUserProfile,
  saveBadgeStatuses,
  saveStreak,
  saveUserProfile,
  Settings,
  Streak,
  TrialRecord,
  updateSettings,
  updateUserProfile,
  upsertDailyStats,
  UserProfile,
} from '../state/storage';
import {
  estimateDeviceTypeAdvanced,
  ViewingDistanceCm,
} from '../lib/calibration';
import { setSoundEnabled } from '../lib/audio';
import { setHapticsEnabled } from '../lib/haptics';
import { computeV1Score, computeThresholdDiff } from '../lib/v1score';
import { formatDateLocal } from '../lib/weeklyStats';
import { reconcileStreakOnView } from '../lib/streak';
import { evaluateBadges } from '../lib/badges';
import { ResultDiff } from '../components/ResultSummary';

type SingleGameId = HomeGameId; // 'game1' | 'game2' | 'game3'

type Route =
  | { name: 'loading' }
  | { name: 'onboarding' }
  | { name: 'home' }
  | { name: 'select'; excludeIds?: SingleGameId[] }
  | { name: 'reminder'; gameId: SingleGameId }
  | { name: 'game1' }
  | { name: 'game2' }
  | { name: 'game3' }
  | { name: 'singleResult1'; result: Game1Result }
  | { name: 'singleResult2'; result: Game2Result }
  | { name: 'singleResult3'; result: Game3Result }
  | { name: 'postSingle'; gameId: SingleGameId }
  | { name: 'course' }
  | { name: 'progress' }
  | { name: 'badges' }
  | { name: 'dailyBest' }
  | { name: 'settings' }
  | { name: 'debug' };

export const AppRouter: React.FC = () => {
  const [settings, setSettings] = React.useState<Settings>(() => createDefaultSettings());
  return (
    <ThemeProvider preference={settings.darkMode}>
      <AppRouterInner settings={settings} setSettings={setSettings} />
    </ThemeProvider>
  );
};

type InnerProps = {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
};

const AppRouterInner: React.FC<InnerProps> = ({ settings, setSettings }) => {
  const scheme = useColorScheme() ?? 'light';
  // 設定の darkMode を優先しつつ、後方互換のため既存色も system 連動で取れるようにする
  const effectiveScheme: 'light' | 'dark' =
    settings.darkMode === 'light'
      ? 'light'
      : settings.darkMode === 'dark'
        ? 'dark'
        : scheme;
  const colors = getColors(effectiveScheme);
  const [route, setRoute] = React.useState<Route>({ name: 'loading' });
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [dailyStats, setDailyStats] = React.useState<DailyStats[]>([]);
  const [streak, setStreak] = React.useState<Streak>(createDefaultStreak());
  const [streakResetWarning, setStreakResetWarning] = React.useState<boolean>(
    false,
  );

  const goHome = React.useCallback(() => setRoute({ name: 'home' }), []);

  // 単体プレイ／コース完了後に DailyStats を再読み込み（ホームの V1 スコア表示更新）
  const refreshDailyStats = React.useCallback(async () => {
    const all = await loadAllDailyStats();
    setDailyStats(all);
  }, []);

  // ホーム表示時に Streak を 0:00 跨ぎでリコンサイル（spec.md §9.3）
  const refreshStreak = React.useCallback(async () => {
    const current = await loadStreak();
    const { streak: reconciled, resetWarning } = reconcileStreakOnView(
      current,
      new Date(),
    );
    if (reconciled !== current) {
      await saveStreak(reconciled);
    }
    setStreak(reconciled);
    setStreakResetWarning(resetWarning);
  }, []);

  React.useEffect(() => {
    void refreshDailyStats();
    if (route.name === 'home') {
      void refreshStreak();
    }
  }, [refreshDailyStats, refreshStreak, route]);

  const todayDate = formatDateLocal(new Date());
  const todayStats = dailyStats.find((s) => s.date === todayDate);
  const previousStats = dailyStats
    .filter((s) => s.date < todayDate)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  // 初回：UserProfile / Settings load → device 推定で profile を更新 → 初期ルート決定
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loaded, loadedSettings] = await Promise.all([
        loadUserProfile(),
        loadSettings(),
      ]);
      const detectedDevice = detectDeviceType();
      const next: UserProfile =
        loaded.deviceTypeEstimated === detectedDevice
          ? loaded
          : { ...loaded, deviceTypeEstimated: detectedDevice };
      if (next !== loaded) {
        await saveUserProfile(next);
      }
      if (cancelled) return;
      setProfile(next);
      setSettings(loadedSettings);
      // 音声 / ハプティクスのフラグをモジュール状態に反映
      setSoundEnabled(loadedSettings.soundEnabled);
      setHapticsEnabled(loadedSettings.hapticsEnabled);
      setRoute(
        next.onboardingCompleted ? { name: 'home' } : { name: 'onboarding' },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [setSettings]);

  const handleUpdateSettings = React.useCallback(
    async (patch: Partial<Settings>) => {
      const next = await updateSettings(patch);
      setSettings(next);
      // 音声 / ハプティクスのフラグを即時反映（ゲーム中の設定変更にも対応）
      setSoundEnabled(next.soundEnabled);
      setHapticsEnabled(next.hapticsEnabled);
    },
    [setSettings],
  );

  const handleUpdateProfile = React.useCallback(
    async (patch: Partial<UserProfile>) => {
      const next = await updateUserProfile(patch);
      setProfile(next);
    },
    [],
  );

  // 全データ削除 → state 初期化 → onboarding へ
  const handleClearAllData = React.useCallback(async () => {
    await clearAllStorage();
    setProfile(null);
    const defaults = createDefaultSettings();
    setSettings(defaults);
    setSoundEnabled(defaults.soundEnabled);
    setHapticsEnabled(defaults.hapticsEnabled);
    setDailyStats([]);
    setStreak(createDefaultStreak());
    setStreakResetWarning(false);
    // 再ロード（device 推定だけ走らせて新しい profile を作る）
    const fresh = await loadUserProfile();
    const detectedDevice = detectDeviceType();
    const withDevice =
      fresh.deviceTypeEstimated === detectedDevice
        ? fresh
        : { ...fresh, deviceTypeEstimated: detectedDevice };
    if (withDevice !== fresh) {
      await saveUserProfile(withDevice);
    }
    setProfile(withDevice);
    setRoute({ name: 'onboarding' });
  }, [setSettings]);

  const distanceCm: ViewingDistanceCm = profile?.viewingDistanceCm ?? 40;

  // 単体プレイの結果を SessionRecord に保存（type='single'）
  // Sprint 5：DailyStats も upsert（その日のベスト閾値を更新、V1 スコアは
  // 3 ゲーム揃った日のみ算出されるため単体プレイでは null のまま）
  const persistSingleSession = React.useCallback(
    async (
      gameId: SingleGameId,
      result: Game1Result | Game2Result | Game3Result,
    ) => {
      const sessionId = `single-${Date.now()}`;
      const now = new Date().toISOString();
      const dateKey = formatDateLocal(new Date());
      try {
        if (gameId === 'game1') {
          const r = result as Game1Result;
          await appendSession({
            sessionId,
            sessionType: 'single',
            startedAt: now,
            completedAt: now,
            game1Threshold: r.thresholdDeg,
            game2Threshold: null,
            game3Threshold: null,
            v1Score: null,
            trialCount: r.unattempted ? 0 : 1,
          });
          // 単体プレイのスコアもベスト判定に含む（spec.md §9.3）。
          // 未挑戦時は staircase 値が up しているだけなのでベスト更新には使わない。
          if (!r.unattempted) {
            await upsertDailyStats(dateKey, {
              game1BestThreshold: r.thresholdDeg,
              sessionCount: (todayStats?.sessionCount ?? 0) + 1,
            });
          }
        } else if (gameId === 'game2') {
          const r = result as Game2Result;
          await appendSession({
            sessionId,
            sessionType: 'single',
            startedAt: now,
            completedAt: now,
            game1Threshold: null,
            game2Threshold: r.thresholdDeg,
            game3Threshold: null,
            v1Score: null,
            trialCount: r.trialCount,
          });
          await upsertDailyStats(dateKey, {
            game2BestThreshold: r.thresholdDeg,
            sessionCount: (todayStats?.sessionCount ?? 0) + 1,
          });
        } else {
          const r = result as Game3Result;
          await appendSession({
            sessionId,
            sessionType: 'single',
            startedAt: now,
            completedAt: now,
            game1Threshold: null,
            game2Threshold: null,
            game3Threshold: r.thresholdDeg,
            v1Score: null,
            trialCount: r.trialCount,
          });
          await upsertDailyStats(dateKey, {
            game3BestThreshold: r.thresholdDeg,
            sessionCount: (todayStats?.sessionCount ?? 0) + 1,
          });
        }
        // TrialRecord append（B-05 累計試行数）。Sprint 6 ではサマリ件数分のスタブ。
        const trialCount =
          gameId === 'game1'
            ? (result as Game1Result).unattempted
              ? 0
              : 1
            : gameId === 'game2'
              ? (result as Game2Result).trialCount
              : (result as Game3Result).trialCount;
        if (trialCount > 0) {
          const stubs: TrialRecord[] = Array.from(
            { length: trialCount },
            (_, i) => ({
              trialId: `${sessionId}-t${i}`,
              sessionId,
              gameId,
              paramValue: 0,
              isCorrect: null,
              responseTimeMs: null,
              timestamp: now,
            }),
          );
          await appendTrials(stubs);
        }
        // バッジ判定（B-05 / B-06 / B-07 は単体プレイでも発火しうる）
        const [allStats, totalTrials, currentBadges, currentStreak] =
          await Promise.all([
            loadAllDailyStats(),
            getTotalTrialCount(),
            loadBadgeStatuses().catch(() => createDefaultBadgeStatuses()),
            loadStreak().catch(() => createDefaultStreak()),
          ]);
        const { next: nextBadges, newlyEarned } = evaluateBadges(currentBadges, {
          streak: currentStreak,
          totalTrialCount: totalTrials,
          allDailyStats: allStats,
          today: new Date(),
        });
        if (newlyEarned.length > 0) {
          await saveBadgeStatuses(nextBadges);
        }
      } catch {
        // 永続化失敗時もホームに戻す
      }
      await refreshDailyStats();
    },
    [refreshDailyStats, todayStats],
  );

  /** 単体プレイ用の前回比 diff（前日 DailyStats と比較） */
  const buildSingleDiff = React.useCallback(
    (gameId: SingleGameId, current: number): ResultDiff => {
      const prev =
        gameId === 'game1'
          ? (previousStats?.game1BestThreshold ?? null)
          : gameId === 'game2'
            ? (previousStats?.game2BestThreshold ?? null)
            : (previousStats?.game3BestThreshold ?? null);
      const td = computeThresholdDiff(current, prev);
      if (td.direction === 'first') {
        return { text: 'はじめての記録です', direction: 'first' };
      }
      if (td.direction === 'flat') {
        return { text: '前回と同じ', direction: 'flat' };
      }
      const abs = Math.abs(td.delta ?? 0);
      if (td.direction === 'improved') {
        return {
          text: `↓ 前回より ${abs.toFixed(1)} 度改善 ✨`,
          direction: 'improved',
        };
      }
      return {
        text: `↑ 前回より ${abs.toFixed(1)} 度上がりました`,
        direction: 'worse',
      };
    },
    [previousStats],
  );

  // 未使用ガード：computeV1Score は呼び出されない場合に tsc が警告するため
  void computeV1Score;

  // Sprint 7-C：Skip link で main コンテナへフォーカス移動（Web のみ動作）。
  // Native では SkipLink 自体が null を返すため、ref は使われない。
  const mainRef = React.useRef<View>(null);
  const handleSkipToMain = React.useCallback(() => {
    if (Platform.OS !== 'web') return;
    const node = mainRef.current as unknown as HTMLElement | null;
    if (node && typeof node.focus === 'function') {
      // tabIndex=-1 と組み合わせてプログラム的にフォーカス可能（aria 推奨パターン）
      node.focus();
    }
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.bgCanvas }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <SkipLink onActivate={handleSkipToMain} />

      <View
        ref={mainRef}
        // Web のみ：tabIndex を -1 にしてプログラム focus 可能。
        // 一般的な Tab 順には現れない（=見えない要素）が、SkipLink からの遷移先になる。
        accessibilityLabel="メインコンテンツ"
        nativeID="main"
        style={styles.main}
        tabIndex={-1}
      >
      {route.name === 'loading' && <View style={styles.loading} />}

      {route.name === 'onboarding' && (
        <OnboardingFlow
          onCompleted={(updated) => {
            setProfile(updated);
            setRoute({ name: 'home' });
          }}
        />
      )}

      {route.name === 'home' && (
        <HomeScreen
          onStartCourse={() => setRoute({ name: 'course' })}
          onStartGame={(gameId) => setRoute({ name: 'reminder', gameId })}
          onOpenSettings={() => setRoute({ name: 'settings' })}
          onOpenDebug={() => setRoute({ name: 'debug' })}
          onOpenProgress={() => setRoute({ name: 'progress' })}
          onOpenBadges={() => setRoute({ name: 'badges' })}
          onOpenDailyBest={() => setRoute({ name: 'dailyBest' })}
          todayCompleted={todayStats?.courseCompleted ?? false}
          currentStreak={streak.currentStreak}
          longestStreak={streak.longestStreak}
          streakResetWarning={streakResetWarning}
          todayV1Score={todayStats?.v1Score ?? null}
        />
      )}

      {route.name === 'select' && (
        <GameSelectScreen
          onSelect={(gameId) => setRoute({ name: 'reminder', gameId })}
          onBack={goHome}
          excludeIds={route.excludeIds}
        />
      )}

      {route.name === 'reminder' && (
        <DistanceReminder
          distanceCm={distanceCm}
          onProceed={() => {
            const next: Route =
              route.gameId === 'game1'
                ? { name: 'game1' }
                : route.gameId === 'game2'
                  ? { name: 'game2' }
                  : { name: 'game3' };
            setRoute(next);
          }}
          onBack={goHome}
        />
      )}

      {route.name === 'game1' && (
        <Game1Screen
          distanceCm={distanceCm}
          onAbort={goHome}
          onComplete={(result) => {
            void persistSingleSession('game1', result);
            setRoute({ name: 'singleResult1', result });
          }}
        />
      )}

      {route.name === 'game2' && (
        <Game2Screen
          distanceCm={distanceCm}
          onAbort={goHome}
          onComplete={(result) => {
            void persistSingleSession('game2', result);
            setRoute({ name: 'singleResult2', result });
          }}
        />
      )}

      {route.name === 'game3' && (
        <Game3Screen
          distanceCm={distanceCm}
          onAbort={goHome}
          onComplete={(result) => {
            void persistSingleSession('game3', result);
            setRoute({ name: 'singleResult3', result });
          }}
        />
      )}

      {route.name === 'singleResult1' && (
        <ResultSummary
          gameName="Game 1(変化察知)"
          sessionType="single"
          unattempted={route.result.unattempted}
          unattemptedReason={
            route.result.unattempted
              ? 'タップせずに時間切れになりました'
              : undefined
          }
          primary={{
            label: '今回の閾値(最大角度差)',
            value: route.result.thresholdDeg.toFixed(1),
            unit: '度',
          }}
          secondary={
            route.result.unattempted
              ? undefined
              : [
                  {
                    label: '正答',
                    value: `${route.result.grading?.correctIds.length ?? 0}`,
                    unit: '個',
                  },
                  {
                    label: '誤タップ',
                    value: `${route.result.grading?.incorrectIds.length ?? 0}`,
                    unit: '個',
                  },
                ]
          }
          diff={
            route.result.unattempted
              ? undefined
              : buildSingleDiff('game1', route.result.thresholdDeg)
          }
          onNext={() => setRoute({ name: 'postSingle', gameId: 'game1' })}
          onBack={goHome}
        />
      )}

      {route.name === 'singleResult2' && (
        <ResultSummary
          gameName="Game 2(二重表裏判別)"
          sessionType="single"
          primary={{
            label: '今回の閾値(最小判別角度差)',
            value: route.result.thresholdDeg.toFixed(1),
            unit: '度',
          }}
          secondary={[
            {
              label: '正答率',
              value: `${Math.round(route.result.correctRate * 100)}`,
              unit: '%',
            },
            { label: '試行数', value: `${route.result.trialCount}` },
          ]}
          diff={buildSingleDiff('game2', route.result.thresholdDeg)}
          onNext={() => setRoute({ name: 'postSingle', gameId: 'game2' })}
          onBack={goHome}
        />
      )}

      {route.name === 'singleResult3' && (
        <ResultSummary
          gameName="Game 3(周辺視野ハント)"
          sessionType="single"
          primary={{
            label: '今回の閾値(最小角度差)',
            value: route.result.thresholdDeg.toFixed(1),
            unit: '度',
          }}
          secondary={[
            {
              label: '正答率',
              value: `${Math.round(route.result.correctRate * 100)}`,
              unit: '%',
            },
            { label: '試行数', value: `${route.result.trialCount}` },
          ]}
          diff={buildSingleDiff('game3', route.result.thresholdDeg)}
          onNext={() => setRoute({ name: 'postSingle', gameId: 'game3' })}
          onBack={goHome}
        />
      )}

      {route.name === 'postSingle' && (
        <SinglePlayPostScreen
          gameLabel={
            route.gameId === 'game1'
              ? 'Game 1'
              : route.gameId === 'game2'
                ? 'Game 2'
                : 'Game 3'
          }
          onHome={goHome}
          onRepeat={() => setRoute({ name: 'reminder', gameId: route.gameId })}
          onPickAnother={() =>
            setRoute({ name: 'select', excludeIds: [route.gameId] })
          }
        />
      )}

      {route.name === 'course' && (
        <CourseScreen
          distanceCm={distanceCm}
          onAbort={goHome}
          onComplete={goHome}
          onOpenProgress={() => setRoute({ name: 'progress' })}
        />
      )}

      {route.name === 'progress' && (
        <ProgressScreen
          onBack={goHome}
          onStartCourse={() => setRoute({ name: 'course' })}
        />
      )}

      {route.name === 'badges' && (
        <BadgeListScreen
          onBack={goHome}
          onPlayGame={(gameId) => setRoute({ name: 'reminder', gameId })}
        />
      )}

      {route.name === 'dailyBest' && <DailyBestScreen onBack={goHome} />}

      {route.name === 'settings' && profile && (
        <SettingsScreen
          settings={settings}
          profile={profile}
          onUpdateSettings={handleUpdateSettings}
          onUpdateProfile={handleUpdateProfile}
          onClearAllData={handleClearAllData}
          onBack={goHome}
        />
      )}

      {route.name === 'debug' && <StaircaseDebugScreen onBack={goHome} />}
      </View>
    </View>
  );
};

/**
 * 起動時の端末タイプ自動推定（spec.md §6.2）。
 *
 * Web 環境では navigator.userAgent を読み取り、
 * iOS / Android では Platform.OS + Dimensions で判定する。
 */
function detectDeviceType() {
  const { width, height } = Dimensions.get('window');
  const shortSide = Math.min(width, height);
  let ua = '';
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    ua = navigator.userAgent ?? '';
  }
  return estimateDeviceTypeAdvanced(Platform.OS, shortSide, ua);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  main: { flex: 1 },
  loading: { flex: 1 },
});
