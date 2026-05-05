/**
 * AppRouterV11 — v1.1 のエントリルーター（spec-v11.md §8.1 起動シーケンス）。
 *
 * 起動シーケンス（F-17 / F-01）：
 *   1. AsyncStorage から v1 旧キーを検出
 *      - 検出あり：clearV1LegacyStorage() で消去 → DataResetNotice を表示 →
 *        OK で続行 → markDataResetNoticeShown
 *      - 検出なし or すでに通知表示済み：通知スキップ
 *   2. UserProfileV11 / SettingsV11 をロード
 *   3. デバイスタイプを推定し profile に上書き保存
 *   4. profile.onboardingCompleted == false → OnboardingFlowV11 へ
 *      true → HomeScreenV11 へ
 *
 * 5 つの主要ルート：loading / data-reset-notice / onboarding / home /
 * single-play-list / settings-stub (Sprint 19 で本実装)。
 *
 * Sprint 8 では：
 *   - 「全ゲーム連続プレイ」CTA → 「Sprint 18 で実装予定」プレースホルダ
 *   - 「単体プレイ」リンク → AllGamesListScreen（全カード「準備中」）
 *   - 「設定」 / 「進捗グラフ」 / 「バッジ」 → プレースホルダスタブ
 */

import React from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getColors } from '../../theme';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { SkipLink } from '../../components/SkipLink';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import {
  estimateDeviceTypeAdvanced,
  ViewingDistanceCm,
} from '../../lib/calibration';
import {
  clearV1LegacyStorage,
  detectV1LegacyData,
  isDataResetNoticeShown,
  loadSettingsV11,
  loadUserProfileV11,
  markDataResetNoticeShown,
  saveUserProfileV11,
  SettingsV11,
  UserProfileV11,
  createDefaultSettingsV11,
} from '../../state/storage-v11';
import { getEnabledGameCount } from '../../state/gameRegistry';
import { GameIdV11 } from '../../state/gameIds-v11';
import { DataResetNotice } from '../../components/v11/DataResetNotice';
import { DistanceReminderV11 } from '../../components/v11/DistanceReminderV11';
import { HomeScreenV11 } from '../../screens/v11/HomeScreenV11';
import { AllGamesListScreen } from '../../screens/v11/AllGamesListScreen';
import { OnboardingFlowV11 } from '../../screens/v11/Onboarding/OnboardingFlowV11';
// Sprint 20-B-3：g0X-result route を撤去したため、TrialResult / G0XResultScreen
// は AppRouter から直接参照する必要がない。各 G0XPlayScreen が onComplete の
// payload で内部 result phase に切替、ResultOverlay を直接描画する。
import { G01ChangeDetectScreen } from '../../screens/v11/games/G01ChangeDetectScreen';
import { G01MiniInstructionScreen } from '../../screens/v11/games/G01MiniInstructionScreen';
import { G02SideBySideTiltScreen } from '../../screens/v11/games/G02SideBySideTiltScreen';
import { G02MiniInstructionScreen } from '../../screens/v11/games/G02MiniInstructionScreen';
import { G03PeripheralHuntScreen } from '../../screens/v11/games/G03PeripheralHuntScreen';
import { G03MiniInstructionScreen } from '../../screens/v11/games/G03MiniInstructionScreen';
import { G04ContrastDiscrimScreen } from '../../screens/v11/games/G04ContrastDiscrimScreen';
import { G04MiniInstructionScreen } from '../../screens/v11/games/G04MiniInstructionScreen';
import { G05SfDiscrimScreen } from '../../screens/v11/games/G05SfDiscrimScreen';
import { G05MiniInstructionScreen } from '../../screens/v11/games/G05MiniInstructionScreen';
import { G06WindowSizeScreen } from '../../screens/v11/games/G06WindowSizeScreen';
import { G06MiniInstructionScreen } from '../../screens/v11/games/G06MiniInstructionScreen';
import { G07EdgeHuntScreen } from '../../screens/v11/games/G07EdgeHuntScreen';
import { G07MiniInstructionScreen } from '../../screens/v11/games/G07MiniInstructionScreen';
import { G08TiltAftereffectScreen } from '../../screens/v11/games/G08TiltAftereffectScreen';
import { G08MiniInstructionScreen } from '../../screens/v11/games/G08MiniInstructionScreen';
import { G09LateralMaskingScreen } from '../../screens/v11/games/G09LateralMaskingScreen';
import { G09MiniInstructionScreen } from '../../screens/v11/games/G09MiniInstructionScreen';
import { G10TextureSegmentationScreen } from '../../screens/v11/games/G10TextureSegmentationScreen';
import { G10MiniInstructionScreen } from '../../screens/v11/games/G10MiniInstructionScreen';
import { G11VernierAlignmentScreen } from '../../screens/v11/games/G11VernierAlignmentScreen';
import { G11MiniInstructionScreen } from '../../screens/v11/games/G11MiniInstructionScreen';
import { G12CrowdingScreen } from '../../screens/v11/games/G12CrowdingScreen';
import { G12MiniInstructionScreen } from '../../screens/v11/games/G12MiniInstructionScreen';
import { G13EmbeddedNumeralScreen } from '../../screens/v11/games/G13EmbeddedNumeralScreen';
import { G13MiniInstructionScreen } from '../../screens/v11/games/G13MiniInstructionScreen';
import {
  loadDailyStatsV11,
  loadHistoricalBestThresholdV11,
  loadStreakV11,
  recordSingleGameSessionV11,
} from '../../state/storage-v11';
import {
  fontSize,
  fontWeight,
  spacing,
} from '../../theme/tokens';
import { setSoundEnabled } from '../../lib/audio';
import { setHapticsEnabled } from '../../lib/haptics';
import { CourseStartScreen } from '../../screens/v11/course/CourseStartScreen';
import { CourseRunnerScreen } from '../../screens/v11/course/CourseRunnerScreen';
import { ProgressGraphScreen } from '../../screens/v11/progress/ProgressGraphScreen';
import { reconcileStreakOnViewV11, formatDateLocalV11 } from '../../lib/v11/streak';
import { SettingsScreen } from '../../screens/v11/settings/SettingsScreen';
import { DisclaimerScreen } from '../../screens/v11/settings/DisclaimerScreen';
import { StaircaseResetConfirmDialog } from '../../screens/v11/settings/StaircaseResetConfirmDialog';
import { DataDeleteScreen } from '../../screens/v11/settings/DataDeleteScreen';
import { BadgeListScreen } from '../../screens/v11/badges/BadgeListScreen';
import { BadgeDetailModal } from '../../screens/v11/badges/BadgeDetailModal';
import {
  resetAllStaircasesV11,
  clearAllStorageV11,
  saveSettingsV11,
  loadAllBadgeStatusesV11,
  saveAllBadgeStatusesV11,
} from '../../state/storage-v11';
import {
  BadgeStatusV11,
  countEarnedV11,
  createInitialBadgeStatusesV11,
  evaluateBadgesV11,
  BadgeEvalContextV11,
} from '../../lib/v11/badges';
import { BadgeIdV11 } from '../../lib/v11/badgeDefinitions';
import { buildBadgeContextV11 } from '../../lib/v11/badgeContext';

/**
 * Sprint 20-B-3：13 個の `g0X-result` route は撤去された。各 G0XPlayScreen が
 * 自身の `phase === 'result'` 内で結果オーバーレイを直接描画する形に統合され、
 * 画面遷移は **「ゲーム N → ゲーム N+1」 / 「ゲーム → 一覧」 / 「ゲーム → ホーム」**
 * の単位でのみ発生する（screens.md §11.3 / §17.2）。
 */
type Route =
  | { name: 'loading' }
  | { name: 'data-reset-notice' }
  | { name: 'onboarding' }
  | { name: 'home' }
  | { name: 'single-play-list' }
  | { name: 'reminder'; gameId: GameIdV11 }
  | { name: 'g01-instruction' }
  | { name: 'g01-play' }
  | { name: 'g02-instruction' }
  | { name: 'g02-play' }
  | { name: 'g03-instruction' }
  | { name: 'g03-play' }
  | { name: 'g04-instruction' }
  | { name: 'g04-play' }
  | { name: 'g05-instruction' }
  | { name: 'g05-play' }
  | { name: 'g06-instruction' }
  | { name: 'g06-play' }
  | { name: 'g07-instruction' }
  | { name: 'g07-play' }
  | { name: 'g08-instruction' }
  | { name: 'g08-play' }
  | { name: 'g09-instruction' }
  | { name: 'g09-play' }
  | { name: 'g10-instruction' }
  | { name: 'g10-play' }
  | { name: 'g11-instruction' }
  | { name: 'g11-play' }
  | { name: 'g12-instruction' }
  | { name: 'g12-play' }
  | { name: 'g13-instruction' }
  | { name: 'g13-play' }
  | { name: 'course-start' }
  | { name: 'course-run'; sessionId: string; startedAt: string }
  | { name: 'progress' }
  | { name: 'unimplemented'; reason: 'full-course' | 'single'; gameId?: GameIdV11 }
  | { name: 'settings' }
  | { name: 'badges' };

/** Sprint 9〜17 で実装済み = 13 ゲーム全実装完了 */
const IMPLEMENTED_GAME_IDS_V11: ReadonlyArray<GameIdV11> = [
  'G-01',
  'G-02',
  'G-03',
  'G-04',
  'G-05',
  'G-06',
  'G-07',
  'G-08',
  'G-09',
  'G-10',
  'G-11',
  'G-12',
  'G-13',
];

export type AppRouterV11Props = {
  /** テスト用：起動時にデータリセット検出をスキップする */
  skipV1Detection?: boolean;
};

export const AppRouterV11: React.FC<AppRouterV11Props> = ({
  skipV1Detection,
}) => {
  const [settings, setSettings] = React.useState<SettingsV11>(() =>
    createDefaultSettingsV11(),
  );
  return (
    <ThemeProvider preference={settings.darkMode}>
      <AppRouterV11Inner
        settings={settings}
        setSettings={setSettings}
        skipV1Detection={skipV1Detection}
      />
    </ThemeProvider>
  );
};

type InnerProps = {
  settings: SettingsV11;
  setSettings: React.Dispatch<React.SetStateAction<SettingsV11>>;
  skipV1Detection?: boolean;
};

const AppRouterV11Inner: React.FC<InnerProps> = ({
  settings,
  setSettings,
  skipV1Detection,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const effectiveScheme: 'light' | 'dark' =
    settings.darkMode === 'light'
      ? 'light'
      : settings.darkMode === 'dark'
        ? 'dark'
        : scheme;
  const colors = getColors(effectiveScheme);

  const [route, setRoute] = React.useState<Route>({ name: 'loading' });
  const [profile, setProfile] = React.useState<UserProfileV11 | null>(null);
  // ミニ説明は本セッション中に既に見たかをゲーム単位で揮発保持（再起動で再表示）。
  // OPT-12 / F-06：単体プレイ「同じゲームをもう一度」直後はミニ説明をスキップする。
  const g01InstructionSeenRef = React.useRef<boolean>(false);
  const g02InstructionSeenRef = React.useRef<boolean>(false);
  const g03InstructionSeenRef = React.useRef<boolean>(false);
  const g04InstructionSeenRef = React.useRef<boolean>(false);
  const g05InstructionSeenRef = React.useRef<boolean>(false);
  const g06InstructionSeenRef = React.useRef<boolean>(false);
  const g07InstructionSeenRef = React.useRef<boolean>(false);
  const g08InstructionSeenRef = React.useRef<boolean>(false);
  const g09InstructionSeenRef = React.useRef<boolean>(false);
  const g10InstructionSeenRef = React.useRef<boolean>(false);
  const g11InstructionSeenRef = React.useRef<boolean>(false);
  const g12InstructionSeenRef = React.useRef<boolean>(false);
  const g13InstructionSeenRef = React.useRef<boolean>(false);

  // v1.1.3：単体プレイ一覧のスクロール位置を保持し、ゲーム → 一覧復帰時に復元する。
  const singlePlayListScrollYRef = React.useRef<number>(0);

  const goHome = React.useCallback(() => setRoute({ name: 'home' }), []);

  // 起動シーケンス：F-17 検出 → UserProfile / Settings ロード
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. v1 旧キー検出 + 消去（既に通知表示済みでなければ）
      let needsResetNotice = false;
      if (!skipV1Detection) {
        try {
          const noticeShown = await isDataResetNoticeShown();
          if (!noticeShown) {
            const hasLegacy = await detectV1LegacyData();
            if (hasLegacy) {
              await clearV1LegacyStorage();
              needsResetNotice = true;
            }
          }
        } catch {
          // 検出失敗は致命ではない、続行
        }
      }

      // 2. UserProfile / Settings ロード
      const [loaded, loadedSettings] = await Promise.all([
        loadUserProfileV11(),
        loadSettingsV11(),
      ]);
      const detectedDevice = detectDeviceType();
      const next: UserProfileV11 =
        loaded.deviceTypeEstimated === detectedDevice
          ? loaded
          : { ...loaded, deviceTypeEstimated: detectedDevice };
      if (next !== loaded) {
        await saveUserProfileV11(next);
      }
      if (cancelled) return;

      setProfile(next);
      setSettings(loadedSettings);
      setSoundEnabled(loadedSettings.soundEnabled);
      setHapticsEnabled(loadedSettings.hapticsEnabled);

      if (needsResetNotice) {
        setRoute({ name: 'data-reset-notice' });
      } else if (!next.onboardingCompleted) {
        setRoute({ name: 'onboarding' });
      } else {
        setRoute({ name: 'home' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSettings, skipV1Detection]);

  const handleAcknowledgeResetNotice = React.useCallback(async () => {
    await markDataResetNoticeShown();
    if (profile && !profile.onboardingCompleted) {
      setRoute({ name: 'onboarding' });
    } else {
      setRoute({ name: 'home' });
    }
  }, [profile]);

  const enabledGameCount = React.useMemo(() => getEnabledGameCount(), []);
  const distanceCm: ViewingDistanceCm = profile?.viewingDistanceCm ?? 40;

  // F-12 ストリーク + F-04 本日完了：route が home に入るたびに最新化（Sprint 18）。
  // ホーム表示中は永続化値を都度読み直す（コース完了から戻ったときも反映される）。
  const [homeData, setHomeData] = React.useState<{
    currentStreak: number;
    longestStreak: number;
    streakResetWarning: boolean;
    todayCompleted: boolean;
    badgeEarnedCount: number;
  }>({
    currentStreak: 0,
    longestStreak: 0,
    streakResetWarning: false,
    todayCompleted: false,
    badgeEarnedCount: 0,
  });
  React.useEffect(() => {
    if (route.name !== 'home') return;
    let cancelled = false;
    void (async () => {
      const [streak, todayStats, allBadges] = await Promise.all([
        loadStreakV11(),
        loadDailyStatsV11(formatDateLocalV11(new Date())),
        loadAllBadgeStatusesV11(),
      ]);
      const { streak: reconciled, resetWarning } = reconcileStreakOnViewV11(
        streak,
        new Date(),
      );
      if (cancelled) return;
      // BadgeStatus を 13 件にマージ
      const merged = createInitialBadgeStatusesV11().map((init) => {
        const found = allBadges.find((b) => b.badgeId === init.badgeId);
        return found
          ? {
              badgeId: init.badgeId,
              earned: found.earned,
              earnedAt: found.earnedAt,
            }
          : init;
      });
      setHomeData({
        currentStreak: reconciled.currentStreak,
        longestStreak: reconciled.longestStreak,
        streakResetWarning: resetWarning,
        todayCompleted: todayStats.fullCourseCompleted,
        badgeEarnedCount: countEarnedV11(merged),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [route]);

  /**
   * Sprint 19 / F-13：単体ゲーム or フルコース完了時に呼ぶ。
   * 1. 永続化済み BadgeStatus + 全データから BadgeEvalContext を構築
   * 2. 全 13 バッジを再評価
   * 3. 新規獲得があれば永続化
   * 4. newlyEarned を返却（呼び出し側が ResultSummary に渡して 1.5 秒演出）
   */
  const evaluateAndPersistBadges = React.useCallback(async (): Promise<
    ReadonlyArray<BadgeIdV11>
  > => {
    const [persisted, ctx] = await Promise.all([
      loadAllBadgeStatusesV11(),
      buildBadgeContextV11(),
    ]);
    const merged = createInitialBadgeStatusesV11().map((init) => {
      const found = persisted.find((b) => b.badgeId === init.badgeId);
      return found
        ? {
            badgeId: init.badgeId,
            earned: found.earned,
            earnedAt: found.earnedAt,
          }
        : init;
    });
    const { next, newlyEarned } = evaluateBadgesV11(merged, ctx);
    if (newlyEarned.length > 0) {
      await saveAllBadgeStatusesV11(next);
    }
    return newlyEarned;
  }, []);

  // Skip link 用
  const mainRef = React.useRef<View>(null);
  const handleSkipToMain = React.useCallback(() => {
    if (Platform.OS !== 'web') return;
    const node = mainRef.current as unknown as HTMLElement | null;
    if (node && typeof node.focus === 'function') {
      node.focus();
    }
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.bgCanvas }]}>
      <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
      <SkipLink onActivate={handleSkipToMain} />
      <View
        ref={mainRef}
        accessibilityLabel="メインコンテンツ"
        nativeID="main"
        style={styles.main}
        tabIndex={-1}
      >
        {route.name === 'loading' && (
          <View style={styles.loading} testID="v11-loading" />
        )}

        {route.name === 'data-reset-notice' && (
          <DataResetNotice onAcknowledge={handleAcknowledgeResetNotice} />
        )}

        {route.name === 'onboarding' && (
          <OnboardingFlowV11
            onCompleted={(updated) => {
              setProfile(updated);
              setRoute({ name: 'home' });
            }}
          />
        )}

        {route.name === 'home' && (
          <HomeScreenV11
            enabledGameCount={enabledGameCount}
            todayCompleted={homeData.todayCompleted}
            currentStreak={homeData.currentStreak}
            longestStreak={homeData.longestStreak}
            streakResetWarning={homeData.streakResetWarning}
            badgeEarnedCount={homeData.badgeEarnedCount}
            badgeTotalCount={13}
            onPressFullCourse={() => setRoute({ name: 'course-start' })}
            onPressSinglePlay={() =>
              setRoute({ name: 'single-play-list' })
            }
            onPressProgress={() => setRoute({ name: 'progress' })}
            onPressBadges={() => setRoute({ name: 'badges' })}
            onOpenSettings={() => setRoute({ name: 'settings' })}
          />
        )}

        {route.name === 'course-start' && (
          <CourseStartScreen
            onStart={() =>
              setRoute({
                name: 'course-run',
                sessionId: generateSessionId(),
                startedAt: new Date().toISOString(),
              })
            }
            onCancel={goHome}
          />
        )}

        {route.name === 'course-run' && (
          <CourseRunnerScreen
            distanceCm={distanceCm}
            oneEyeGuidance={settings.oneEyeGuidance}
            sessionId={route.sessionId}
            startedAt={route.startedAt}
            todayLocal={formatDateLocalV11(new Date())}
            onExitToHome={goHome}
            onOpenProgress={() => setRoute({ name: 'progress' })}
          />
        )}

        {route.name === 'progress' && (
          <ProgressGraphScreen
            todayDate={formatDateLocalV11(new Date())}
            onBack={goHome}
          />
        )}

        {route.name === 'single-play-list' && (
          <AllGamesListScreen
            onBack={() => {
              singlePlayListScrollYRef.current = 0;
              goHome();
            }}
            initialScrollOffsetY={singlePlayListScrollYRef.current}
            onScrollOffsetChange={(y) => {
              singlePlayListScrollYRef.current = y;
            }}
            onSelectGame={(gameId) => {
              if (gameId === 'G-01') {
                // 初回のみミニ説明 → reminder。2 回目以降は reminder 直行
                if (!g01InstructionSeenRef.current) {
                  setRoute({ name: 'g01-instruction' });
                } else {
                  setRoute({ name: 'reminder', gameId: 'G-01' });
                }
              } else if (gameId === 'G-02') {
                if (!g02InstructionSeenRef.current) {
                  setRoute({ name: 'g02-instruction' });
                } else {
                  setRoute({ name: 'reminder', gameId: 'G-02' });
                }
              } else if (gameId === 'G-03') {
                if (!g03InstructionSeenRef.current) {
                  setRoute({ name: 'g03-instruction' });
                } else {
                  setRoute({ name: 'reminder', gameId: 'G-03' });
                }
              } else if (gameId === 'G-04') {
                if (!g04InstructionSeenRef.current) {
                  setRoute({ name: 'g04-instruction' });
                } else {
                  setRoute({ name: 'reminder', gameId: 'G-04' });
                }
              } else if (gameId === 'G-05') {
                if (!g05InstructionSeenRef.current) {
                  setRoute({ name: 'g05-instruction' });
                } else {
                  setRoute({ name: 'reminder', gameId: 'G-05' });
                }
              } else if (gameId === 'G-06') {
                if (!g06InstructionSeenRef.current) {
                  setRoute({ name: 'g06-instruction' });
                } else {
                  setRoute({ name: 'reminder', gameId: 'G-06' });
                }
              } else if (gameId === 'G-07') {
                if (!g07InstructionSeenRef.current) {
                  setRoute({ name: 'g07-instruction' });
                } else {
                  setRoute({ name: 'reminder', gameId: 'G-07' });
                }
              } else if (gameId === 'G-08') {
                if (!g08InstructionSeenRef.current) {
                  setRoute({ name: 'g08-instruction' });
                } else {
                  setRoute({ name: 'reminder', gameId: 'G-08' });
                }
              } else if (gameId === 'G-09') {
                if (!g09InstructionSeenRef.current) {
                  setRoute({ name: 'g09-instruction' });
                } else {
                  setRoute({ name: 'reminder', gameId: 'G-09' });
                }
              } else if (gameId === 'G-10') {
                if (!g10InstructionSeenRef.current) {
                  setRoute({ name: 'g10-instruction' });
                } else {
                  setRoute({ name: 'reminder', gameId: 'G-10' });
                }
              } else if (gameId === 'G-11') {
                if (!g11InstructionSeenRef.current) {
                  setRoute({ name: 'g11-instruction' });
                } else {
                  setRoute({ name: 'reminder', gameId: 'G-11' });
                }
              } else if (gameId === 'G-12') {
                if (!g12InstructionSeenRef.current) {
                  setRoute({ name: 'g12-instruction' });
                } else {
                  setRoute({ name: 'reminder', gameId: 'G-12' });
                }
              } else if (gameId === 'G-13') {
                if (!g13InstructionSeenRef.current) {
                  setRoute({ name: 'g13-instruction' });
                } else {
                  setRoute({ name: 'reminder', gameId: 'G-13' });
                }
              } else {
                setRoute({
                  name: 'unimplemented',
                  reason: 'single',
                  gameId,
                });
              }
            }}
            onSelectUnimplemented={(g) =>
              setRoute({
                name: 'unimplemented',
                reason: 'single',
                gameId: g.gameId,
              })
            }
            implementedGameIds={IMPLEMENTED_GAME_IDS_V11}
          />
        )}

        {route.name === 'g01-instruction' && (
          <G01MiniInstructionScreen
            onStart={() => {
              g01InstructionSeenRef.current = true;
              setRoute({ name: 'reminder', gameId: 'G-01' });
            }}
            onBack={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'reminder' && (
          <DistanceReminderV11
            distanceCm={distanceCm}
            oneEyeGuidance={settings.oneEyeGuidance}
            onCountdownComplete={() => {
              if (route.gameId === 'G-01') {
                setRoute({ name: 'g01-play' });
              } else if (route.gameId === 'G-02') {
                setRoute({ name: 'g02-play' });
              } else if (route.gameId === 'G-03') {
                setRoute({ name: 'g03-play' });
              } else if (route.gameId === 'G-04') {
                setRoute({ name: 'g04-play' });
              } else if (route.gameId === 'G-05') {
                setRoute({ name: 'g05-play' });
              } else if (route.gameId === 'G-06') {
                setRoute({ name: 'g06-play' });
              } else if (route.gameId === 'G-07') {
                setRoute({ name: 'g07-play' });
              } else if (route.gameId === 'G-08') {
                setRoute({ name: 'g08-play' });
              } else if (route.gameId === 'G-09') {
                setRoute({ name: 'g09-play' });
              } else if (route.gameId === 'G-10') {
                setRoute({ name: 'g10-play' });
              } else if (route.gameId === 'G-11') {
                setRoute({ name: 'g11-play' });
              } else if (route.gameId === 'G-12') {
                setRoute({ name: 'g12-play' });
              } else if (route.gameId === 'G-13') {
                setRoute({ name: 'g13-play' });
              } else {
                setRoute({
                  name: 'unimplemented',
                  reason: 'single',
                  gameId: route.gameId,
                });
              }
            }}
            onAbort={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'g01-play' && (
          <G01ChangeDetectScreen
            distanceCm={distanceCm}
            onAbort={() => setRoute({ name: 'single-play-list' })}
            onComplete={async (result) => {
              // Sprint 20-B-3：永続化 + previousBest 取得 + バッジ評価を行い、
              // PlayScreen の result phase 表示用 PostCompleteData を返す。
              // 画面遷移はせず、PlayScreen 内 ResultOverlay で結果開示する。
              const today = ymdLocal(new Date());
              const previousBest = await loadHistoricalBestThresholdV11(
                'G-01',
                today,
              );
              if (!result.unattempted) {
                await recordSingleGameSessionV11(today, 'G-01', result.thresholdDeg);
              }
              const newlyAwardedBadges = await evaluateAndPersistBadges();
              return { previousBest, newlyAwardedBadges };
            }}
            onPlayAgain={() => setRoute({ name: 'reminder', gameId: 'G-01' })}
            onBackToList={() => setRoute({ name: 'single-play-list' })}
            onGoHome={goHome}
          />
        )}

        {route.name === 'g02-instruction' && (
          <G02MiniInstructionScreen
            onStart={() => {
              g02InstructionSeenRef.current = true;
              setRoute({ name: 'reminder', gameId: 'G-02' });
            }}
            onBack={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'g02-play' && (
          <G02SideBySideTiltScreen
            distanceCm={distanceCm}
            onAbort={() => setRoute({ name: 'single-play-list' })}
            onComplete={async (result) => {
              const today = ymdLocal(new Date());
              const previousBest = await loadHistoricalBestThresholdV11(
                'G-02',
                today,
              );
              if (!result.grading.unattempted) {
                await recordSingleGameSessionV11(today, 'G-02', result.thresholdDeg);
              }
              const newlyAwardedBadges = await evaluateAndPersistBadges();
              return { previousBest, newlyAwardedBadges };
            }}
            onPlayAgain={() => setRoute({ name: 'reminder', gameId: 'G-02' })}
            onBackToList={() => setRoute({ name: 'single-play-list' })}
            onGoHome={goHome}
          />
        )}

        {route.name === 'g03-instruction' && (
          <G03MiniInstructionScreen
            onStart={() => {
              g03InstructionSeenRef.current = true;
              setRoute({ name: 'reminder', gameId: 'G-03' });
            }}
            onBack={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'g03-play' && (
          <G03PeripheralHuntScreen
            distanceCm={distanceCm}
            onAbort={() => setRoute({ name: 'single-play-list' })}
            onComplete={async (result) => {
              const today = ymdLocal(new Date());
              const previousBest = await loadHistoricalBestThresholdV11(
                'G-03',
                today,
              );
              if (!result.grading.unattempted) {
                await recordSingleGameSessionV11(
                  today,
                  'G-03',
                  result.thresholdDeg,
                );
              }
              const newlyAwardedBadges = await evaluateAndPersistBadges();
              return { previousBest, newlyAwardedBadges };
            }}
            onPlayAgain={() => setRoute({ name: 'reminder', gameId: 'G-03' })}
            onBackToList={() => setRoute({ name: 'single-play-list' })}
            onGoHome={goHome}
          />
        )}

        {route.name === 'g04-instruction' && (
          <G04MiniInstructionScreen
            onStart={() => {
              g04InstructionSeenRef.current = true;
              setRoute({ name: 'reminder', gameId: 'G-04' });
            }}
            onBack={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'g04-play' && (
          <G04ContrastDiscrimScreen
            distanceCm={distanceCm}
            onAbort={() => setRoute({ name: 'single-play-list' })}
            onComplete={async (result) => {
              const today = ymdLocal(new Date());
              const previousBest = await loadHistoricalBestThresholdV11(
                'G-04',
                today,
              );
              if (!result.grading.unattempted) {
                await recordSingleGameSessionV11(
                  today,
                  'G-04',
                  result.thresholdContrast,
                );
              }
              const newlyAwardedBadges = await evaluateAndPersistBadges();
              return { previousBest, newlyAwardedBadges };
            }}
            onPlayAgain={() => setRoute({ name: 'reminder', gameId: 'G-04' })}
            onBackToList={() => setRoute({ name: 'single-play-list' })}
            onGoHome={goHome}
          />
        )}

        {route.name === 'g05-instruction' && (
          <G05MiniInstructionScreen
            onStart={() => {
              g05InstructionSeenRef.current = true;
              setRoute({ name: 'reminder', gameId: 'G-05' });
            }}
            onBack={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'g05-play' && (
          <G05SfDiscrimScreen
            distanceCm={distanceCm}
            onAbort={() => setRoute({ name: 'single-play-list' })}
            onComplete={async (result) => {
              const today = ymdLocal(new Date());
              const previousBest = await loadHistoricalBestThresholdV11(
                'G-05',
                today,
              );
              if (!result.grading.unattempted) {
                await recordSingleGameSessionV11(
                  today,
                  'G-05',
                  result.thresholdRatio,
                );
              }
              const newlyAwardedBadges = await evaluateAndPersistBadges();
              return { previousBest, newlyAwardedBadges };
            }}
            onPlayAgain={() => setRoute({ name: 'reminder', gameId: 'G-05' })}
            onBackToList={() => setRoute({ name: 'single-play-list' })}
            onGoHome={goHome}
          />
        )}

        {route.name === 'g06-instruction' && (
          <G06MiniInstructionScreen
            onStart={() => {
              g06InstructionSeenRef.current = true;
              setRoute({ name: 'reminder', gameId: 'G-06' });
            }}
            onBack={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'g06-play' && (
          <G06WindowSizeScreen
            distanceCm={distanceCm}
            onAbort={() => setRoute({ name: 'single-play-list' })}
            onComplete={async (result) => {
              const today = ymdLocal(new Date());
              const previousBest = await loadHistoricalBestThresholdV11(
                'G-06',
                today,
              );
              if (!result.grading.unattempted) {
                await recordSingleGameSessionV11(
                  today,
                  'G-06',
                  result.thresholdRatio,
                );
              }
              const newlyAwardedBadges = await evaluateAndPersistBadges();
              return { previousBest, newlyAwardedBadges };
            }}
            onPlayAgain={() => setRoute({ name: 'reminder', gameId: 'G-06' })}
            onBackToList={() => setRoute({ name: 'single-play-list' })}
            onGoHome={goHome}
          />
        )}

        {route.name === 'g07-instruction' && (
          <G07MiniInstructionScreen
            onStart={() => {
              g07InstructionSeenRef.current = true;
              setRoute({ name: 'reminder', gameId: 'G-07' });
            }}
            onBack={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'g07-play' && (
          <G07EdgeHuntScreen
            distanceCm={distanceCm}
            onAbort={() => setRoute({ name: 'single-play-list' })}
            onComplete={async (result) => {
              const today = ymdLocal(new Date());
              const previousBest = await loadHistoricalBestThresholdV11(
                'G-07',
                today,
              );
              if (!result.grading.unattempted) {
                await recordSingleGameSessionV11(
                  today,
                  'G-07',
                  result.thresholdDeg,
                );
              }
              const newlyAwardedBadges = await evaluateAndPersistBadges();
              return { previousBest, newlyAwardedBadges };
            }}
            onPlayAgain={() => setRoute({ name: 'reminder', gameId: 'G-07' })}
            onBackToList={() => setRoute({ name: 'single-play-list' })}
            onGoHome={goHome}
          />
        )}

        {route.name === 'g08-instruction' && (
          <G08MiniInstructionScreen
            onStart={() => {
              g08InstructionSeenRef.current = true;
              setRoute({ name: 'reminder', gameId: 'G-08' });
            }}
            onBack={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'g08-play' && (
          <G08TiltAftereffectScreen
            distanceCm={distanceCm}
            onAbort={() => setRoute({ name: 'single-play-list' })}
            onComplete={async (result) => {
              const today = ymdLocal(new Date());
              const previousBest = await loadHistoricalBestThresholdV11(
                'G-08',
                today,
              );
              if (!result.grading.unattempted) {
                await recordSingleGameSessionV11(
                  today,
                  'G-08',
                  result.thresholdDeg,
                );
              }
              const newlyAwardedBadges = await evaluateAndPersistBadges();
              return { previousBest, newlyAwardedBadges };
            }}
            onPlayAgain={() => setRoute({ name: 'reminder', gameId: 'G-08' })}
            onBackToList={() => setRoute({ name: 'single-play-list' })}
            onGoHome={goHome}
          />
        )}

        {route.name === 'g09-instruction' && (
          <G09MiniInstructionScreen
            onStart={() => {
              g09InstructionSeenRef.current = true;
              setRoute({ name: 'reminder', gameId: 'G-09' });
            }}
            onBack={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'g09-play' && (
          <G09LateralMaskingScreen
            distanceCm={distanceCm}
            onAbort={() => setRoute({ name: 'single-play-list' })}
            onComplete={async (result) => {
              const today = ymdLocal(new Date());
              const previousBest = await loadHistoricalBestThresholdV11(
                'G-09',
                today,
              );
              if (!result.grading.unattempted) {
                await recordSingleGameSessionV11(
                  today,
                  'G-09',
                  result.thresholdContrast,
                );
              }
              const newlyAwardedBadges = await evaluateAndPersistBadges();
              return { previousBest, newlyAwardedBadges };
            }}
            onPlayAgain={() => setRoute({ name: 'reminder', gameId: 'G-09' })}
            onBackToList={() => setRoute({ name: 'single-play-list' })}
            onGoHome={goHome}
          />
        )}

        {route.name === 'g10-instruction' && (
          <G10MiniInstructionScreen
            onStart={() => {
              g10InstructionSeenRef.current = true;
              setRoute({ name: 'reminder', gameId: 'G-10' });
            }}
            onBack={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'g10-play' && (
          <G10TextureSegmentationScreen
            distanceCm={distanceCm}
            onAbort={() => setRoute({ name: 'single-play-list' })}
            onComplete={async (result) => {
              const today = ymdLocal(new Date());
              const previousBest = await loadHistoricalBestThresholdV11(
                'G-10',
                today,
              );
              if (!result.grading.unattempted) {
                await recordSingleGameSessionV11(
                  today,
                  'G-10',
                  result.thresholdDeg,
                );
              }
              const newlyAwardedBadges = await evaluateAndPersistBadges();
              return { previousBest, newlyAwardedBadges };
            }}
            onPlayAgain={() => setRoute({ name: 'reminder', gameId: 'G-10' })}
            onBackToList={() => setRoute({ name: 'single-play-list' })}
            onGoHome={goHome}
          />
        )}

        {route.name === 'g11-instruction' && (
          <G11MiniInstructionScreen
            onStart={() => {
              g11InstructionSeenRef.current = true;
              setRoute({ name: 'reminder', gameId: 'G-11' });
            }}
            onBack={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'g11-play' && (
          <G11VernierAlignmentScreen
            distanceCm={distanceCm}
            onAbort={() => setRoute({ name: 'single-play-list' })}
            onComplete={async (result) => {
              const today = ymdLocal(new Date());
              const previousBest = await loadHistoricalBestThresholdV11(
                'G-11',
                today,
              );
              if (!result.grading.unattempted) {
                await recordSingleGameSessionV11(
                  today,
                  'G-11',
                  result.thresholdArcmin,
                );
              }
              const newlyAwardedBadges = await evaluateAndPersistBadges();
              return { previousBest, newlyAwardedBadges };
            }}
            onPlayAgain={() => setRoute({ name: 'reminder', gameId: 'G-11' })}
            onBackToList={() => setRoute({ name: 'single-play-list' })}
            onGoHome={goHome}
          />
        )}

        {route.name === 'g12-instruction' && (
          <G12MiniInstructionScreen
            onStart={() => {
              g12InstructionSeenRef.current = true;
              setRoute({ name: 'reminder', gameId: 'G-12' });
            }}
            onBack={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'g12-play' && (
          <G12CrowdingScreen
            distanceCm={distanceCm}
            onAbort={() => setRoute({ name: 'single-play-list' })}
            onComplete={async (result) => {
              const today = ymdLocal(new Date());
              const previousBest = await loadHistoricalBestThresholdV11(
                'G-12',
                today,
              );
              if (!result.grading.unattempted) {
                await recordSingleGameSessionV11(
                  today,
                  'G-12',
                  result.thresholdSpacing,
                );
              }
              const newlyAwardedBadges = await evaluateAndPersistBadges();
              return { previousBest, newlyAwardedBadges };
            }}
            onPlayAgain={() => setRoute({ name: 'reminder', gameId: 'G-12' })}
            onBackToList={() => setRoute({ name: 'single-play-list' })}
            onGoHome={goHome}
          />
        )}

        {route.name === 'g13-instruction' && (
          <G13MiniInstructionScreen
            onStart={() => {
              g13InstructionSeenRef.current = true;
              setRoute({ name: 'reminder', gameId: 'G-13' });
            }}
            onBack={() => setRoute({ name: 'single-play-list' })}
          />
        )}

        {route.name === 'g13-play' && (
          <G13EmbeddedNumeralScreen
            distanceCm={distanceCm}
            onAbort={() => setRoute({ name: 'single-play-list' })}
            onComplete={async (result) => {
              const today = ymdLocal(new Date());
              const previousBest = await loadHistoricalBestThresholdV11(
                'G-13',
                today,
              );
              if (!result.grading.unattempted) {
                await recordSingleGameSessionV11(
                  today,
                  'G-13',
                  result.thresholdContrast,
                );
              }
              const newlyAwardedBadges = await evaluateAndPersistBadges();
              return { previousBest, newlyAwardedBadges };
            }}
            onPlayAgain={() => setRoute({ name: 'reminder', gameId: 'G-13' })}
            onBackToList={() => setRoute({ name: 'single-play-list' })}
            onGoHome={goHome}
          />
        )}

        {route.name === 'unimplemented' && (
          <PlaceholderScreen
            title={
              route.reason === 'full-course'
                ? '全ゲーム連続プレイ'
                : `${route.gameId ?? 'ゲーム'}`
            }
            sprint="Sprint 18"
            onBack={goHome}
          />
        )}

        {route.name === 'settings' && profile && (
          <SettingsRoute
            settings={settings}
            setSettings={setSettings}
            profile={profile}
            setProfile={setProfile}
            onBack={goHome}
            onPressBadgeList={() => setRoute({ name: 'badges' })}
          />
        )}

        {route.name === 'badges' && (
          <BadgesRoute onBack={() => setRoute({ name: 'settings' })} />
        )}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// SettingsRoute — 設定画面 + 4 modal を統合
// ---------------------------------------------------------------------------

const APP_VERSION_V11 = '1.1.0';

const SettingsRoute: React.FC<{
  settings: SettingsV11;
  setSettings: React.Dispatch<React.SetStateAction<SettingsV11>>;
  profile: UserProfileV11;
  setProfile: React.Dispatch<React.SetStateAction<UserProfileV11 | null>>;
  onBack: () => void;
  onPressBadgeList: () => void;
}> = ({
  settings,
  setSettings,
  profile,
  setProfile,
  onBack,
  onPressBadgeList,
}) => {
  const [showDisclaimer, setShowDisclaimer] = React.useState(false);
  const [showStaircaseConfirm, setShowStaircaseConfirm] = React.useState(false);
  const [showDataDelete, setShowDataDelete] = React.useState(false);

  const handleChangeSettings = React.useCallback(
    (next: SettingsV11) => {
      setSettings(next);
      setSoundEnabled(next.soundEnabled);
      setHapticsEnabled(next.hapticsEnabled);
      void saveSettingsV11(next);
    },
    [setSettings],
  );

  const handleChangeViewingDistance = React.useCallback(
    (next: ViewingDistanceCm) => {
      const updated: UserProfileV11 = {
        ...profile,
        viewingDistanceCm: next,
      };
      setProfile(updated);
      void saveUserProfileV11(updated);
    },
    [profile, setProfile],
  );

  const handleStaircaseReset = React.useCallback(async () => {
    setShowStaircaseConfirm(false);
    await resetAllStaircasesV11();
  }, []);

  const handleDataDelete = React.useCallback(async () => {
    setShowDataDelete(false);
    await clearAllStorageV11();
    // 全消去後はホームに戻る（オンボーディング状態は再描画時に再評価される）
    onBack();
  }, [onBack]);

  return (
    <>
      <SettingsScreen
        settings={settings}
        viewingDistanceCm={profile.viewingDistanceCm}
        disclaimerAgreedAt={profile.disclaimerAgreedAt}
        appVersion={APP_VERSION_V11}
        onBack={onBack}
        onChangeSettings={handleChangeSettings}
        onChangeViewingDistance={handleChangeViewingDistance}
        onPressBadgeList={onPressBadgeList}
        onPressStaircaseReset={() => setShowStaircaseConfirm(true)}
        onPressDataDelete={() => setShowDataDelete(true)}
        onPressDisclaimer={() => setShowDisclaimer(true)}
      />
      <DisclaimerScreen
        visible={showDisclaimer}
        disclaimerAgreedAt={profile.disclaimerAgreedAt}
        onClose={() => setShowDisclaimer(false)}
      />
      <StaircaseResetConfirmDialog
        visible={showStaircaseConfirm}
        onConfirm={handleStaircaseReset}
        onCancel={() => setShowStaircaseConfirm(false)}
      />
      <DataDeleteScreen
        visible={showDataDelete}
        onCancel={() => setShowDataDelete(false)}
        onConfirm={handleDataDelete}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// BadgesRoute — バッジ一覧画面 + 詳細モーダル
// ---------------------------------------------------------------------------

const BadgesRoute: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [statuses, setStatuses] = React.useState<BadgeStatusV11[]>(() =>
    createInitialBadgeStatusesV11(),
  );
  const [ctx, setCtx] = React.useState<BadgeEvalContextV11 | null>(null);
  const [selected, setSelected] = React.useState<BadgeIdV11 | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [allBadges, builtCtx] = await Promise.all([
        loadAllBadgeStatusesV11(),
        buildBadgeContextV11(),
      ]);
      if (cancelled) return;
      const merged = createInitialBadgeStatusesV11().map((init) => {
        const found = allBadges.find((b) => b.badgeId === init.badgeId);
        return found
          ? {
              badgeId: init.badgeId,
              earned: found.earned,
              earnedAt: found.earnedAt,
            }
          : init;
      });
      // 一覧表示前に「最新の永続化値」と「現在のコンテキスト」で再評価し、
      // 新規獲得があれば永続化する（バッジ一覧を開いただけで未獲得が獲得に切り替わるケース）
      const { next, newlyEarned } = evaluateBadgesV11(merged, builtCtx);
      if (newlyEarned.length > 0) {
        await saveAllBadgeStatusesV11(next);
      }
      setStatuses(next);
      setCtx(builtCtx);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ctx) {
    return <View style={{ flex: 1 }} testID="badges-loading" />;
  }
  return (
    <>
      <BadgeListScreen
        statuses={statuses}
        ctx={ctx}
        onBack={onBack}
        onPressBadge={(id) => setSelected(id)}
      />
      <BadgeDetailModal
        visible={selected !== null}
        badgeId={selected}
        status={selected ? statuses.find((s) => s.badgeId === selected) ?? null : null}
        ctx={ctx}
        onClose={() => setSelected(null)}
      />
    </>
  );
};

/**
 * 未実装機能のプレースホルダ画面。Sprint 8 では多くの動線がここに到達する。
 * 各スプリント完成時に該当ルートのレンダリングを実装に差し替える。
 */
const PlaceholderScreen: React.FC<{
  title: string;
  sprint: string;
  onBack: () => void;
}> = ({ title, sprint, onBack }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  return (
    <View
      style={[styles.placeholder, { backgroundColor: colors.bgCanvas }]}
      testID="placeholder-screen"
    >
      <View style={styles.placeholderHeader}>
        <IconButton
          icon="back"
          ariaLabel="ホームに戻る"
          onPress={onBack}
          testId="placeholder-back"
        />
      </View>
      <View style={styles.placeholderBody}>
        <Text
          accessibilityRole="header"
          style={{
            fontSize: fontSize.h1,
            fontWeight: fontWeight.bold as '700',
            color: colors.fgPrimary,
            textAlign: 'center',
            marginBottom: spacing.s4,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: fontSize.bodyLg,
            color: colors.fgSecondary,
            textAlign: 'center',
            marginBottom: spacing.s6,
            lineHeight: fontSize.bodyLg * 1.6,
          }}
        >
          この機能は {sprint} で実装予定です。
        </Text>
        <Button
          variant="primary"
          size="lg"
          label="ホームへ戻る"
          onPress={onBack}
          fullWidth
        />
      </View>
    </View>
  );
};

function detectDeviceType() {
  const { width, height } = Dimensions.get('window');
  const shortSide = Math.min(width, height);
  let ua = '';
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    ua = navigator.userAgent ?? '';
  }
  return estimateDeviceTypeAdvanced(Platform.OS, shortSide, ua);
}

function ymdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** UUID v4 風のセッション ID 生成（衝突しなければ十分）。 */
function generateSessionId(): string {
  const random = (n: number) =>
    Math.floor(Math.random() * Math.pow(16, n))
      .toString(16)
      .padStart(n, '0');
  return `${random(8)}-${random(4)}-${random(4)}-${random(4)}-${random(12)}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  main: { flex: 1 },
  loading: { flex: 1 },
  placeholder: { flex: 1 },
  placeholderHeader: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholderBody: {
    flex: 1,
    padding: spacing.s5,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
});
