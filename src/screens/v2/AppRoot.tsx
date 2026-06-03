/**
 * AppRoot.tsx — ボトムタブナビ + 中断ダイアログ + 起動フロー（spec F-05 / F-06 / F-07 / F-08）。
 *
 * 役割：
 *  - 3 タブ（ホーム / 履歴 / 設定）の切替を管理し、最下部に BottomTabBar を常時表示。
 *  - ホームタブは 3 フェーズを持つ（F-06/F-08）：
 *      'distance'  距離リマインド（自動進行、S6-2）
 *      'playing'   ゲーム本体（GameScreen / S4）
 *      'result'    セッション結果カード（RC-1 / S6-3）
 *    起動直後・「もう一度」押下時は 'distance' から始まり、自動で 'playing' へ進む。
 *  - プレイ中（'playing'）の × ボタン／他タブ選択をトリガーに中断ダイアログ（DG-1）。
 *    OK=記録せず中断、キャンセル=継続。距離リマインド・結果表示中は非進行＝自由遷移（F-07）。
 *  - セッション完了（GameScreen onSessionComplete）で SessionRecord を永続化し、
 *    DailyStats（max）/ Streak（連続日数）/ PlayStats（累計）を更新する（F-04 / §6.4〜§6.7）。
 *    中断は記録経路に渡さない（completedAt=null 相当、F-07）。
 *
 * 距離リマインドのカウントダウン秒数・結果開示間隔は各画面側の既定に従う。
 * セーフエリア：ゲーム中はフルスクリーン許容（GameScreen 内）、距離/結果はセーフエリア準拠。
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ConfirmDialog } from '../../components/v2/ConfirmDialog';
import { BottomTabBar, TabKey } from '../../components/v2/BottomTabBar';
import { SkipLink } from '../../components/v2/SkipLink';
import { SessionResultCard } from '../../components/v2/SessionResultCard';
import { GameScreen } from './GameScreen';
import { IdleHomeScreen } from './IdleHomeScreen';
import { DistanceReminderScreen } from './DistanceReminderScreen';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';
import { GameConfig, GameState } from '../../lib/v2/gameMachine';
import { Rng } from '../../lib/v2/rng';
import { useFeedback } from '../../hooks/v2/useFeedback';
import type { AudioBackend } from '../../platform/audio';
import type { HapticsBackend } from '../../platform/haptics';
import { recordCompletedSession } from '../../state/statsRecorder';
import { loadStreak } from '../../state/repository';
import type { ViewingDistanceCm } from '../../lib/calibration';
import type { BadgeId, Settings } from '../../state/schema';
import { t } from '../../i18n';

/** Settings から GameConfig（gameMachine 入力）へ変換する純関数。 */
export function configFromSettings(settings: Settings): GameConfig {
  return {
    gridSize: settings.gridSize,
    roundSeconds: settings.roundSeconds,
    roundCount: settings.roundCount,
    rotationSpeed: settings.rotationSpeed,
    sfChangeSpeed: settings.sfChangeSpeed,
    scoringMode: settings.scoringMode,
  };
}

/**
 * ホームタブのフェーズ（F-06/F-08）。
 * - 'distance' 距離リマインド（自動進行）
 * - 'playing'  ゲーム本体
 * - 'result'   完了セッションの結果カード（実完了時のみ）
 * - 'idle'     待機（中断後の着地。記録すべき結果が無い状態。誤スコアを出さない）
 */
type HomePhase = 'distance' | 'playing' | 'result' | 'idle';

/** 中断ダイアログの起点。X 起点はゲーム終了、タブ起点は当該タブへ着地する（F-07）。 */
type AbortTrigger = { source: 'x' } | { source: 'tab'; pendingTab: TabKey };

/** UUID 生成（テスト注入可）。 */
function defaultGenId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type AppRootProps = {
  settings: Settings;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /** 設定変更（darkMode 即反映等）を上位 App へ委譲 */
  onSettingsChange?: (settings: Settings) => void;
  /** 「免責事項を読む」押下を上位 App へ委譲（再閲覧、F-10） */
  onReadDisclaimer?: () => void;
  /** テスト用：初期タブ */
  initialTab?: TabKey;
  /** テスト用：ホームの初期フェーズ（既定 'distance'＝起動自動開始フロー） */
  initialHomePhase?: HomePhase;
  /** 乱数注入（テスト決定論） */
  rng?: Rng;
  /** sessionId 生成注入（テスト決定論） */
  genId?: () => string;
  /** 完了時刻の時計注入（テスト決定論） */
  now?: () => Date;
  /** 距離リマインドのカウントダウン秒数（テスト用に短縮可） */
  distanceCountdownSec?: number;
  /** テスト用：音バックエンド差し替え（S9 / F-14） */
  audioBackend?: AudioBackend;
  /** テスト用：触覚バックエンド差し替え（S9 / F-14） */
  hapticsBackend?: HapticsBackend;
  testId?: string;
};

export const AppRoot: React.FC<AppRootProps> = ({
  settings,
  viewingDistanceCm,
  dpi,
  onSettingsChange,
  onReadDisclaimer,
  initialTab = 'home',
  initialHomePhase = 'distance',
  rng,
  genId = defaultGenId,
  now = () => new Date(),
  distanceCountdownSec,
  audioBackend,
  hapticsBackend,
  testId,
}) => {
  const { colors } = useTheme();

  // 音・ハプティクス発火（S9 / F-14）。設定の soundEnabled/hapticsEnabled を尊重。
  // 1 インスタンスを App 全体で共有し prime も 1 度だけ。
  const { emit } = useFeedback({
    settings: {
      soundEnabled: settings.soundEnabled,
      hapticsEnabled: settings.hapticsEnabled,
    },
    audio: audioBackend,
    haptics: hapticsBackend,
  });

  const [tab, setTab] = React.useState<TabKey>(initialTab);
  const [homePhase, setHomePhase] = React.useState<HomePhase>(initialHomePhase);
  const [abort, setAbort] = React.useState<AbortTrigger | null>(null);
  // GameScreen を作り直して新セッションを開始するためのキー。
  const [gameKey, setGameKey] = React.useState(0);
  // 直近完了セッションの結果（結果カード表示用）。
  const [lastScore, setLastScore] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  // 直近完了で新規獲得したバッジ（結果カードの獲得演出用、§5.4）。
  const [newlyEarnedBadges, setNewlyEarnedBadges] = React.useState<
    readonly BadgeId[]
  >([]);
  // 現セッションの開始メタ（記録用）。
  const sessionMetaRef = React.useRef<{ id: string; startedAt: string } | null>(
    null,
  );

  const config = React.useMemo(() => configFromSettings(settings), [settings]);

  const playing = tab === 'home' && homePhase === 'playing';

  // 距離リマインド完了 → ゲーム開始（新セッションのメタを採取）。
  const startGame = React.useCallback(() => {
    sessionMetaRef.current = { id: genId(), startedAt: now().toISOString() };
    setGameKey((k) => k + 1);
    setHomePhase('playing');
  }, [genId, now]);

  // 「もう一度」／起動 → 距離リマインドから再開（F-08：距離リマインド経由）。
  const goToDistance = React.useCallback(() => {
    setTab('home');
    setHomePhase('distance');
    // 新セッション開始時に過去の獲得演出を残さない（§5.4：1 度だけ）。
    setNewlyEarnedBadges([]);
  }, []);

  // 中断ダイアログを開く起点判断（プレイ中のみ、F-07）。
  const requestTab = React.useCallback(
    (next: TabKey) => {
      if (next === tab) return;
      if (playing && next !== 'home') {
        setAbort({ source: 'tab', pendingTab: next });
        return;
      }
      setTab(next);
    },
    [tab, playing],
  );

  const requestAbortFromX = React.useCallback(() => {
    setAbort({ source: 'x' });
  }, []);

  // OK：進行中セッションを記録せず破棄し、起点に応じて着地（F-07）。
  const confirmAbort = React.useCallback(() => {
    const trigger = abort;
    setAbort(null);
    sessionMetaRef.current = null; // 中断は記録経路に渡さない
    // 中断は記録されないため、結果カード（スコア表示）ではなく待機（idle）へ着地する
    // （S6 評価 Major 修正：スコア 0 の結果カード誤表示を防ぐ）。
    setHomePhase('idle');
    if (trigger?.source === 'tab') {
      setTab(trigger.pendingTab);
    } else {
      setTab('home');
    }
  }, [abort]);

  const cancelAbort = React.useCallback(() => {
    setAbort(null);
  }, []);

  // セッション完了：永続化 + 集計 → 結果カードへ（F-04 / F-08）。
  const handleSessionComplete = React.useCallback(
    (state: GameState) => {
      const meta = sessionMetaRef.current;
      sessionMetaRef.current = null;
      // セッション完了音（F-14）。ハプティクスなし（system §10.1）。
      emit({ type: 'session-complete' });
      setLastScore(state.sessionScore ?? 0);
      // 前回セッションの獲得演出が残らないようリセット（記録完了後に確定値を入れる）。
      setNewlyEarnedBadges([]);
      setHomePhase('result');
      if (!meta) return;
      void recordCompletedSession({
        sessionId: meta.id,
        startedAt: meta.startedAt,
        config: state.config,
        roundScores: state.roundScores,
        now: now(),
      }).then((result) => {
        setStreak(result.streak.currentStreak);
        setNewlyEarnedBadges(result.newlyEarnedBadges);
      });
    },
    [now, emit],
  );

  // バッジ獲得演出の表示開始時（BadgeAwardToast.onShown 経由）に 1 度だけ
  // 獲得音 + ハプティクスを発火する（F-14 / §5.4）。獲得バッジが無ければ呼ばれない。
  const handleBadgeShown = React.useCallback(() => {
    emit({ type: 'badge-earned' });
  }, [emit]);

  // マウント時・ストリーク表示の整合：保存済みストリークを読み込む（結果カード初期表示用）。
  React.useEffect(() => {
    let mounted = true;
    void loadStreak().then((s) => {
      if (mounted) setStreak(s.currentStreak);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const dialogOpen = abort !== null;

  let content: React.ReactNode;
  if (tab === 'home') {
    if (homePhase === 'distance') {
      content = (
        <DistanceReminderScreen
          viewingDistanceCm={viewingDistanceCm}
          oneEyeGuidance={settings.oneEyeGuidance}
          onComplete={startGame}
          onAbort={() => setHomePhase('idle')}
          countdownSec={distanceCountdownSec}
          testId={testId ? `${testId}-distance` : 'distance'}
        />
      );
    } else if (homePhase === 'playing') {
      content = (
        <GameScreen
          key={gameKey}
          config={config}
          viewingDistanceCm={viewingDistanceCm}
          dpi={dpi}
          rng={rng}
          paused={dialogOpen}
          onAbort={requestAbortFromX}
          onSessionComplete={handleSessionComplete}
          onFeedback={emit}
          testId={testId ? `${testId}-game` : 'game'}
        />
      );
    } else if (homePhase === 'result') {
      content = (
        <SessionResultCard
          score={lastScore}
          streak={streak}
          onReplay={goToDistance}
          newlyEarnedBadges={newlyEarnedBadges}
          onBadgeShown={handleBadgeShown}
          testId={testId ? `${testId}-result` : 'result'}
        />
      );
    } else {
      // 'idle'：中断後の待機。記録すべき結果が無いため再開 CTA のみ（誤スコアを出さない）。
      content = (
        <IdleHomeScreen
          onStart={goToDistance}
          testId={testId ? `${testId}-idle` : 'idle'}
        />
      );
    }
  } else if (tab === 'history') {
    content = (
      <HistoryScreen
        now={now}
        testId={testId ? `${testId}-history` : 'history'}
      />
    );
  } else {
    content = (
      <SettingsScreen
        onSettingsChange={onSettingsChange}
        onReadDisclaimer={onReadDisclaimer}
        testId={testId ? `${testId}-settings` : 'settings'}
      />
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: colors.bgCanvas }]}
      testID={testId}
    >
      <SkipLink targetId="ge-main-content" testId={testId ? `${testId}-skip` : 'skip-link'} />
      <View style={styles.content} nativeID="ge-main-content">
        {content}
      </View>
      <BottomTabBar
        current={tab}
        onTabPress={requestTab}
        testId={testId ? `${testId}-tabbar` : 'tabbar'}
      />
      <ConfirmDialog
        visible={dialogOpen}
        title={t('abort.title')}
        message={t('abort.message')}
        confirmLabel={t('abort.confirm')}
        cancelLabel={t('abort.cancel')}
        onConfirm={confirmAbort}
        onCancel={cancelAbort}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
