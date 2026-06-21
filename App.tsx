/**
 * App.tsx — GaborEye v3.0 エントリ（S7 で起動フロー本実装）。
 *
 * 起動フロー（F-06 / F-11）：
 *   1. 起動時に v3 F-11 マイグレーション（旧名前空間 v1〜v2 消去 + v3 初期化 L1）を実行。
 *   2. 旧データを消去した初回のみ DataResetNotice（RZ-1）を 1 度だけ表示（F-11）。
 *   3. v3 Settings / UserProfile / LevelState を読み込む。
 *   4. 初回（onboardingCompleted=false）のみオンボーディング（免責同意 → 年齢 → 距離 → 概要、F-06/F-10）。
 *      完了で UserProfile に保存（onboardingCompleted / disclaimerAgreedAt / ageGroup / viewingDistanceCm）。
 *   5. v3 AppRoot を表示。ホームは距離リマインド → 現在レベルのセッション自動開始 → ラウンド反復
 *      → セッション要約 →「もう一度」（F-08）。各ラウンド締切は resolveCompletedRound で
 *      applyResult + LevelState 永続（§4.4 / F-04）、セッション末は finalizeSession で
 *      SessionRecord・日次・累計・バッジを記録（§7.4-7.8）。
 *   6. darkMode 設定を ThemeProvider に反映。
 *
 * 注意：AdManager（広告）は native 実装を維持（AdManager.native/web の分割）。
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { getColors } from './src/theme/tokens';
import { AppRoot } from './src/screens/v3/AppRoot';
import {
  OnboardingScreen,
  type OnboardingResult,
} from './src/screens/v3/OnboardingScreen';
import { DataResetNotice } from './src/components/v3/DataResetNotice';
import { AdManager } from './src/components/v2/AdManager';
import {
  runStartupMigration,
  acknowledgeResetNotice,
} from './src/state/v3/migration';
import {
  loadSettings,
  loadUserProfile,
  loadLevelState,
  saveUserProfile,
} from './src/state/v3/repository';
import { resolveCompletedRound, finalizeSession, abortSession } from './src/state/v3/sessionFlow';
import type { SessionState } from './src/lib/v3/sessionMachine';
import { defaultSettings } from './src/state/v3/schema';
import type { Settings, UserProfile, DarkMode } from './src/state/v3/schema';
import type { LevelState, GameResult } from './src/lib/v3/level';
import type { ViewingDistanceCm } from './src/lib/calibration';

function StatusBarForMode() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  const [ready, setReady] = React.useState(false);
  const [showResetNotice, setShowResetNotice] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState<DarkMode>('system');
  const [settings, setSettings] = React.useState<Settings>(defaultSettings());
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [levelState, setLevelState] = React.useState<LevelState | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const result = await runStartupMigration();
      const [loadedSettings, loadedProfile, loadedLevel] = await Promise.all([
        loadSettings(),
        loadUserProfile(),
        loadLevelState(),
      ]);
      if (!mounted) return;
      setSettings(loadedSettings);
      setDarkMode(loadedSettings.darkMode);
      setProfile(loadedProfile);
      setLevelState(loadedLevel);
      setShowResetNotice(result.shouldShowNotice);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAcknowledge = React.useCallback(async () => {
    await acknowledgeResetNotice();
    setShowResetNotice(false);
  }, []);

  // オンボーディング完了 → UserProfile に保存し、AppRoot へ（F-06/F-10）。
  const handleOnboardingComplete = React.useCallback(
    async (onboarding: OnboardingResult) => {
      setProfile((prev) => {
        const base = prev as UserProfile;
        const next: UserProfile = {
          ...base,
          onboardingCompleted: true,
          disclaimerAgreedAt: onboarding.disclaimerAgreedAt,
          ageGroup: onboarding.ageGroup,
          viewingDistanceCm: onboarding.viewingDistanceCm,
        };
        void saveUserProfile(next);
        return next;
      });
    },
    [],
  );

  // セッション識別子（開始時に確定し、finalize/abort で消費）。ラウンドが 0 件のときに採番。
  const sessionIdentityRef = React.useRef<{ sessionId: string; startedAt: string } | null>(
    null,
  );

  function ensureSessionIdentity(): { sessionId: string; startedAt: string } {
    if (sessionIdentityRef.current == null) {
      sessionIdentityRef.current = {
        sessionId: makeSessionId(),
        startedAt: new Date().toISOString(),
      };
    }
    return sessionIdentityRef.current;
  }

  // 1 ラウンド締切の本結線（§4.4 / F-04）：applyResult + LevelState 永続。記録はまだ書かない。
  const handleResolveRound = React.useCallback(
    async (args: {
      session: SessionState;
      result: GameResult;
      roundPlaySec: number;
    }) => {
      // セッション開始（最初のラウンド完了前）に識別子を採番する。
      ensureSessionIdentity();
      const outcome = await resolveCompletedRound({
        session: args.session,
        result: args.result,
        roundPlaySec: args.roundPlaySec,
        levelConfig: {
          ranges: settings.variableRanges,
          order: settings.variableOrder,
        },
      });
      setLevelState(outcome.session.levelState);
      return {
        session: outcome.session,
        shouldContinue: outcome.shouldContinue,
      };
    },
    [settings],
  );

  // セッション確定記録（§7.4-7.8 / F-08）：SessionRecord・日次・累計・バッジ。
  const handleFinalizeSession = React.useCallback(
    async (args: { session: SessionState; abort: boolean }) => {
      const identity = ensureSessionIdentity();
      const input = {
        session: args.session,
        sessionId: identity.sessionId,
        startedAt: identity.startedAt,
        levelConfig: {
          ranges: settings.variableRanges,
          order: settings.variableOrder,
        },
      };
      const record = args.abort
        ? await abortSession(input)
        : await finalizeSession(input);
      // 次セッション用に識別子をリセット。
      sessionIdentityRef.current = null;
      setLevelState(args.session.levelState);
      return {
        streak: record?.streak.currentStreak ?? 0,
        newlyEarnedBadges: record?.newlyEarnedBadges ?? [],
      };
    },
    [settings],
  );

  // 設定タブで Settings が変わったとき（F-13）：ダークモード即反映 + 範囲/変化順を AppRoot へ。
  const handleSettingsChange = React.useCallback((next: Settings) => {
    setSettings(next);
    setDarkMode(next.darkMode);
  }, []);

  // チュートリアル Lv0 完了（§4.8/F-15）：tutorialCompleted を永続化（2 回目以降は非表示）。
  const handleTutorialComplete = React.useCallback(() => {
    setProfile((prev) => {
      if (!prev || prev.tutorialCompleted) return prev;
      const next: UserProfile = { ...prev, tutorialCompleted: true };
      void saveUserProfile(next);
      return next;
    });
  }, []);

  const showOnboarding = ready && profile !== null && !profile.onboardingCompleted;

  return (
    <SafeAreaProvider>
      <ThemeProvider preference={darkMode}>
        <StatusBarForMode />
        {!ready || profile === null || levelState === null ? (
          <View
            style={[
              styles.loading,
              { backgroundColor: getColors('light').bgCanvas },
            ]}
          >
            <ActivityIndicator size="large" />
          </View>
        ) : showOnboarding ? (
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        ) : (
          <AdManager>
            <AppRoot
              viewingDistanceCm={profile.viewingDistanceCm as ViewingDistanceCm}
              oneEyeGuidance={settings.oneEyeGuidance}
              sessionMinutes={settings.sessionMinutes}
              soundEnabled={settings.soundEnabled}
              hapticsEnabled={settings.hapticsEnabled}
              ranges={settings.variableRanges}
              order={settings.variableOrder}
              countRange={settings.countRange}
              showTutorial={!profile.tutorialCompleted}
              onTutorialComplete={handleTutorialComplete}
              initialLevel={levelState}
              initialHomePhase="distance"
              onResolveRound={handleResolveRound}
              onFinalizeSession={handleFinalizeSession}
              onSettingsChange={handleSettingsChange}
            />
          </AdManager>
        )}
        <DataResetNotice
          visible={ready && showResetNotice}
          onAcknowledge={handleAcknowledge}
        />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** セッション ID（簡易 uuid）。crypto があれば使い、なければ時刻 + 乱数。 */
function makeSessionId(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `session-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
