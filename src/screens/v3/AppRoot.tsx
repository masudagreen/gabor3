/**
 * AppRoot.tsx — v3.1 アプリ骨格：セッションループ + ボトムタブ + 中断ダイアログ
 * （spec F-01 / F-03 / F-04 / F-05 / F-06 / F-07 / F-08、§4.4 / §4.6）。
 *
 * v3.1：1 セッション = 指定時間（sessionMinutes）までラウンドを反復する（AS-22）。
 * ホームタブのサブフェーズ（screens.md S7）：
 *   - 'distance'：距離リマインド（DR-1、F-06）。完了でセッション開始。
 *   - 'playing' ：v3 ゲーム（GameScreen）。締切 → 3 秒開示 → onResolved（1 ラウンド完了）。
 *                ラウンド完了ごとに：
 *                  resolveCompletedRound（applyResult + LevelState 永続、§4.4 / F-04）
 *                  → 累積時間 < sessionMinutes×60 → 更新後レベルで次ラウンド（roundKey++）
 *                  → 到達/超過 → finalizeSession（SessionRecord・日次・累計・バッジ）→ summary
 *   - 'summary' ：SessionSummaryCard（RC-1、ラウンド数/クリア・失敗/現在レベル/今セッション最高/
 *                 ストリーク、F-08）。「もう一度」→ 距離リマインド経由で新セッション。
 *
 * 起動直後（距離リマインド後）にホームで現在レベルのセッションを自動開始（F-06/F-08）。
 *
 * 中断（F-07 / AS-30）：
 *   - **プレイ中（playing ∧ ラウンド進行中）**に × またはタブ選択 → 同一ダイアログ。
 *   - OK → **進行中の未完ラウンドは破棄**（resolveCompletedRound を呼ばない＝レベル・記録に未反映）。
 *     既に完了したラウンドのレベル変化は LevelState に永続済みで保持される（巻き戻さない、AS-30）。
 *     完了済みラウンドが 1 つ以上あれば abortSession で SessionRecord 記録（§7.4）。
 *     × 起点はセッション終了（距離リマインドへ）、タブ起点は当該タブへ遷移。
 *   - キャンセル → ダイアログ閉、ラウンド継続（残り時間・選択保持）。
 *   - **距離リマインド中・3 秒開示中・セッション要約表示中（非進行中）は × ・タブ移動とも自由遷移**。
 *
 * セーフエリア：ゲーム中はフルスクリーン許容（GameScreen 内、NF-29）、
 * 距離リマインド・セッション要約・タブバー・ダイアログはセーフエリア準拠（NF-30）。
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { SkipLink } from '../../components/v2/SkipLink';
import { BottomTabBar, TabKey } from '../../components/v3/BottomTabBar';
import { ConfirmDialog } from '../../components/v3/ConfirmDialog';
import { SessionSummaryCard } from '../../components/v3/SessionSummaryCard';
import { GameScreen } from './GameScreen';
import { DistanceReminderScreen } from './DistanceReminderScreen';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';
import {
  initialLevelState,
  levelToParams,
  type LevelState,
  type GameResult,
  type VariableRanges,
  type VariableKey,
} from '../../lib/v3/level';
import {
  startSession,
  completeRound,
  type SessionState,
} from '../../lib/v3/sessionMachine';
import type { GameConfig } from '../../lib/v3/gameMachine';
import type { ViewingDistanceCm } from '../../lib/calibration';
import type { OneEyeGuidance, BadgeId, Settings } from '../../state/v3/schema';
import { DEFAULT_SESSION_MINUTES } from '../../state/v3/schema';
import { loadLevelState } from '../../state/v3/repository';
import { Rng } from '../../lib/v2/rng';
import { useFeedback } from '../../hooks/v3/useFeedback';
import type { AudioBackend } from '../../platform/audio';
import type { HapticsBackend } from '../../platform/haptics';
import { t } from '../../i18n';

/** ホームタブのサブフェーズ（v3.1、screens.md S7）。 */
type HomePhase = 'distance' | 'playing' | 'summary';

/** セッション要約カード表示用データ（F-08）。 */
export type SessionSummary = {
  roundCount: number;
  clearCount: number;
  failCount: number;
  /** 現在レベル（= 次セッション開始レベル）。 */
  currentLevel: number;
  /** 今セッションの最高到達レベル。 */
  highestLevelInSession: number;
  /** 今セッションのプレイ時間（秒・パッチを見ている時間）。 */
  sessionPlaySec: number;
  /** 今日のストリーク（連続日数）。 */
  streak: number;
  /** 今セッションで新規獲得したバッジ ID（§6.4：要約で 1 度演出）。 */
  newlyEarnedBadges: BadgeId[];
};

/**
 * 1 ラウンド完了（締切判定済み）の解決を外部（永続化）へ委譲する型。
 * resolveCompletedRound 相当：applyResult + LevelState 永続（§4.4 / F-04）。中断は呼ばれない。
 */
export type ResolveRound = (args: {
  session: SessionState;
  result: GameResult;
  roundPlaySec: number;
}) => Promise<{
  session: SessionState;
  shouldContinue: boolean;
}>;

/**
 * セッション確定記録の委譲型（finalizeSession 相当：SessionRecord・日次・累計・バッジ、§7.4-7.8）。
 * abort の場合 abort=true（完了済みラウンド 0 件なら記録しない）。
 */
export type FinalizeSession = (args: {
  session: SessionState;
  abort: boolean;
}) => Promise<{
  streak: number;
  newlyEarnedBadges: BadgeId[];
}>;

/** 中断ダイアログの起点。× 起点はセッション終了、タブ起点は当該タブへ着地（F-07）。 */
type AbortTrigger = { source: 'x' } | { source: 'tab'; pendingTab: TabKey };

export type AppRootProps = {
  viewingDistanceCm: ViewingDistanceCm;
  oneEyeGuidance?: OneEyeGuidance;
  dpi?: number;
  /** 1 セッションの長さ（分、F-13/AS-23）。未指定は既定 5。 */
  sessionMinutes?: number;
  /** 効果音 ON/OFF（F-14、設定 S3）。未指定は ON。 */
  soundEnabled?: boolean;
  /** 振動 ON/OFF（F-14、設定 S3）。未指定は ON。 */
  hapticsEnabled?: boolean;
  /** テスト用：音バックエンド差し替え。 */
  audioBackend?: AudioBackend;
  /** テスト用：触覚バックエンド差し替え。 */
  hapticsBackend?: HapticsBackend;
  /** レベル定義域（範囲設定）。未指定はフル範囲（デフォルト 720）。 */
  ranges?: VariableRanges;
  /** 変化順。未指定はデフォルト順。 */
  order?: readonly VariableKey[];
  /**
   * 1 ラウンド完了の解決（resolveCompletedRound：applyResult + LevelState 永続）。
   * 未指定（テスト等）はメモリ上で completeRound のみ行うフォールバックを使う。
   */
  onResolveRound?: ResolveRound;
  /**
   * セッション確定記録（finalizeSession / abortSession）。
   * 未指定（テスト等）はストリーク 0・バッジなしのフォールバック。
   */
  onFinalizeSession?: FinalizeSession;
  /**
   * 設定タブで Settings が変わったときの通知（ダークモード即反映・範囲/変化順を App へ反映）。
   * 範囲/変化順の変更は §4.5 クランプ済みの LevelState が永続化されるため、AppRoot は
   * 受信時に LevelState を再読込してホームの梯子に反映する。
   */
  onSettingsChange?: (settings: Settings) => void;
  /** テスト用：初期タブ */
  initialTab?: TabKey;
  /** テスト用：初期レベル状態（未指定は L1 開始） */
  initialLevel?: LevelState;
  /** テスト用：初期ホームフェーズ（未指定は 'playing'＝距離リマインドをスキップ）。 */
  initialHomePhase?: HomePhase;
  /** 距離リマインドのカウントダウン秒数（テスト用上書き）。 */
  distanceCountdownSec?: number;
  /** 乱数注入（テスト決定論） */
  rng?: Rng;
  testId?: string;
};

export const AppRoot: React.FC<AppRootProps> = ({
  viewingDistanceCm,
  oneEyeGuidance = 'off',
  dpi,
  sessionMinutes = DEFAULT_SESSION_MINUTES,
  soundEnabled = true,
  hapticsEnabled = true,
  audioBackend,
  hapticsBackend,
  ranges,
  order,
  onResolveRound,
  onFinalizeSession,
  onSettingsChange,
  initialTab = 'home',
  initialLevel,
  initialHomePhase = 'playing',
  distanceCountdownSec,
  rng,
  testId,
}) => {
  const { colors } = useTheme();

  // 音・ハプティクス発火（F-14）。設定 ON/OFF・サイレント尊重は decideFeedbackV3 が担う。
  const { emit } = useFeedback({
    settings: { soundEnabled, hapticsEnabled },
    audio: audioBackend,
    haptics: hapticsBackend,
  });

  const [tab, setTab] = React.useState<TabKey>(initialTab);
  // 現在のレベル進行状態（セッション外で保持。セッション開始で session に取り込む）。
  const [levelState, setLevelState] = React.useState<LevelState>(
    () => initialLevel ?? initialLevelState(),
  );
  // 進行中のセッション（playing 中のみ非 null）。
  const [session, setSession] = React.useState<SessionState>(() =>
    startSession(initialLevel ?? initialLevelState(), sessionMinutes),
  );
  const [homePhase, setHomePhase] = React.useState<HomePhase>(initialHomePhase);
  const [summary, setSummary] = React.useState<SessionSummary | null>(null);
  // ゲーム進行中フラグ（GameScreen が締め切り前=true / 開示後=false を通知）。
  const [gamePlaying, setGamePlaying] = React.useState(false);
  // ラウンドごとに GameScreen を作り直すためのキー（次ラウンド・中断・もう一度）。
  const [roundKey, setRoundKey] = React.useState(0);
  const [abort, setAbort] = React.useState<AbortTrigger | null>(null);
  // ラウンド解決中の二重実行防止。
  const resolvingRef = React.useRef(false);

  const dialogOpen = abort !== null;

  // 現ラウンドの GameConfig（session.levelState.currentLevel で生成）。
  const config = React.useMemo<GameConfig>(() => {
    const level = session.levelState.currentLevel;
    return { level, params: levelToParams(level, order, ranges) };
    // roundKey を依存に含めて再生成（次ラウンド・中断後・もう一度）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.levelState.currentLevel, roundKey, ranges, order]);

  // セッション残り時間（上部バー、ラウンド開始時点。GameScreen が経過分を引いて毎秒表示）。
  const remainingSessionSec = Math.max(0, session.limitSec - session.elapsedSec);

  // 「ラウンド進行中」= ホームタブ ∧ playing サブフェーズ ∧ GameScreen が playing を報告中。
  const playing = tab === 'home' && homePhase === 'playing' && gamePlaying;

  // タブ押下（F-05/F-07）：プレイ中の他タブはダイアログ、非進行中は即切替。
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

  // ホーム × / 距離リマインド ×（F-07）：プレイ中はダイアログ、それ以外（距離・開示・要約）は自由。
  const requestAbortFromX = React.useCallback(() => {
    if (!playing) return;
    setAbort({ source: 'x' });
  }, [playing]);

  // 距離リマインドの × 中断：要約表示済みなら要約へ戻る、初回起動直後は留まる。
  const handleDistanceAbort = React.useCallback(() => {
    if (summary) setHomePhase('summary');
  }, [summary]);

  // 距離リマインド完了 → 新しいセッションを開始（F-06：自動開始）。
  const handleDistanceComplete = React.useCallback(() => {
    setSession(startSession(levelState, sessionMinutes));
    setRoundKey((k) => k + 1);
    setHomePhase('playing');
  }, [levelState, sessionMinutes]);

  // セッションを確定記録し、要約を表示する（finalize / abort 共通）。
  const finalizeAndShowSummary = React.useCallback(
    async (finishedSession: SessionState, isAbort: boolean) => {
      const persistedLevel = finishedSession.levelState;
      setLevelState(persistedLevel);

      let streak = 0;
      let newlyEarnedBadges: BadgeId[] = [];
      if (onFinalizeSession && finishedSession.totals.roundCount > 0) {
        const r = await onFinalizeSession({
          session: finishedSession,
          abort: isAbort,
        });
        streak = r.streak;
        newlyEarnedBadges = r.newlyEarnedBadges;
      }
      setSummary({
        roundCount: finishedSession.totals.roundCount,
        clearCount: finishedSession.totals.clearCount,
        failCount: finishedSession.totals.failCount,
        currentLevel: persistedLevel.currentLevel,
        highestLevelInSession: finishedSession.totals.highestLevelInSession,
        sessionPlaySec: finishedSession.elapsedSec,
        streak,
        newlyEarnedBadges,
      });
      setHomePhase('summary');
    },
    [onFinalizeSession],
  );

  // 1 ラウンド締切確定（§4.4 / §4.6 / F-04 本結線）：applyResult + LevelState 永続 → 継続判定。
  const handleResolved = React.useCallback(
    (result: GameResult) => {
      if (resolvingRef.current) return;
      resolvingRef.current = true;
      setGamePlaying(false);

      const roundPlaySec = config.params.seconds;
      const fromLevel = session.levelState.currentLevel;

      const continueOrFinish = (next: SessionState, shouldContinue: boolean) => {
        resolvingRef.current = false;
        // レベルアップ（+1）時に専用音 + medium 振動（F-14、system §10.1）。
        if (next.levelState.currentLevel > fromLevel) {
          emit({ type: 'levelup' });
        }
        if (shouldContinue) {
          setSession(next);
          setRoundKey((k) => k + 1);
          setHomePhase('playing');
        } else {
          void finalizeAndShowSummary(next, false);
        }
      };

      if (onResolveRound) {
        void onResolveRound({ session, result, roundPlaySec }).then(
          ({ session: next, shouldContinue }) => {
            continueOrFinish(next, shouldContinue);
          },
        );
      } else {
        // フォールバック（テスト等・永続化なし）：completeRound のみメモリ適用。
        const { session: next } = completeRound(session, result, roundPlaySec, {
          ranges,
          order,
        });
        continueOrFinish(next, !next.finished);
      }
    },
    [
      session,
      config.params.seconds,
      onResolveRound,
      ranges,
      order,
      emit,
      finalizeAndShowSummary,
    ],
  );

  // OK（中断する）：未完ラウンドは破棄。完了済みラウンドがあれば記録（abort）。
  const confirmAbort = React.useCallback(() => {
    const trigger = abort;
    setAbort(null);
    setGamePlaying(false);
    resolvingRef.current = false;

    // 完了済みラウンドがあれば SessionRecord 記録（その時点まで、§7.4）。0 件なら未記録。
    if (session.totals.roundCount > 0) {
      void (async () => {
        if (onFinalizeSession) {
          await onFinalizeSession({ session, abort: true });
        }
      })();
    }
    // 完了済みラウンドのレベル変化は LevelState に永続済み → 次セッションの開始レベルに反映。
    setLevelState(session.levelState);

    if (trigger?.source === 'tab') {
      setHomePhase('distance');
      setTab(trigger.pendingTab);
    } else {
      setHomePhase('distance');
      setTab('home');
    }
  }, [abort, session, onFinalizeSession]);

  // キャンセル（続ける）：ダイアログ閉、ラウンド継続（paused 解除で残り時間・選択保持）。
  const cancelAbort = React.useCallback(() => {
    setAbort(null);
  }, []);

  // バッジ獲得演出の表示開始で badge 音 + badge 振動（F-14、§6.4）。
  const handleBadgeShown = React.useCallback(() => {
    emit({ type: 'badge-earned' });
  }, [emit]);

  // 「もう一度」：距離リマインド経由で新しいセッション（増減後の currentLevel）（F-08）。
  const handleReplay = React.useCallback(() => {
    setHomePhase('distance');
  }, []);

  // 設定タブで Settings 変更（F-13）：親へ通知し、範囲/変化順クランプ後の LevelState を再読込。
  const handleSettingsChange = React.useCallback(
    (next: Settings) => {
      onSettingsChange?.(next);
      void loadLevelState().then(setLevelState);
    },
    [onSettingsChange],
  );

  // 全データ削除後（F-13）：LevelState は L1 に初期化済み。再読込してホームへ戻す。
  const handleDataDeleted = React.useCallback(() => {
    void loadLevelState().then(setLevelState);
    setSummary(null);
    setHomePhase('distance');
    setTab('home');
  }, []);

  let homeContent: React.ReactNode;
  if (homePhase === 'distance') {
    homeContent = (
      <DistanceReminderScreen
        viewingDistanceCm={viewingDistanceCm}
        oneEyeGuidance={oneEyeGuidance}
        onComplete={handleDistanceComplete}
        onAbort={handleDistanceAbort}
        countdownSec={distanceCountdownSec}
        testId={testId ? `${testId}-distance` : 'v3-distance'}
      />
    );
  } else if (homePhase === 'summary' && summary) {
    homeContent = (
      <SessionSummaryCard
        clearCount={summary.clearCount}
        failCount={summary.failCount}
        currentLevel={summary.currentLevel}
        sessionPlaySec={summary.sessionPlaySec}
        streak={summary.streak}
        newlyEarnedBadges={summary.newlyEarnedBadges}
        onBadgeShown={handleBadgeShown}
        onReplay={handleReplay}
        testId={testId ? `${testId}-summary` : 'v3-summary'}
      />
    );
  } else {
    homeContent = (
      <GameScreen
        key={`${config.level}-${roundKey}`}
        config={config}
        viewingDistanceCm={viewingDistanceCm}
        dpi={dpi}
        rng={rng}
        paused={dialogOpen}
        remainingSessionSec={remainingSessionSec}
        onAbort={requestAbortFromX}
        onPlayingChange={setGamePlaying}
        onResolved={handleResolved}
        onFeedback={emit}
        testId={testId ? `${testId}-game` : 'v3-game'}
      />
    );
  }

  let content: React.ReactNode;
  if (tab === 'home') {
    content = homeContent;
  } else if (tab === 'history') {
    content = (
      <HistoryScreen testId={testId ? `${testId}-history` : 'history'} />
    );
  } else {
    content = (
      <SettingsScreen
        onSettingsChange={handleSettingsChange}
        onDataDeleted={handleDataDeleted}
        testId={testId ? `${testId}-settings` : 'settings'}
      />
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: colors.bgCanvas }]}
      testID={testId}
    >
      {/* NF-14：Web で Tab 最初の到達要素。focus でのみ可視、押下で main へフォーカス移動。 */}
      <SkipLink targetId="ge-main-content" testId={testId ? `${testId}-skip` : 'skip-link'} />
      <View
        style={styles.content}
        // NF-14：SkipLink の移動先（Web のみ nativeID を DOM id として出す）。
        nativeID={Platform.OS === 'web' ? 'ge-main-content' : undefined}
      >
        {content}
      </View>
      <BottomTabBar
        current={tab}
        onTabPress={requestTab}
        testId={testId ? `${testId}-tabbar` : 'tabbar'}
      />
      <ConfirmDialog
        visible={dialogOpen}
        title={t('abortV3.title')}
        message={t('abortV3.message')}
        confirmLabel={t('abortV3.confirm')}
        cancelLabel={t('abortV3.cancel')}
        onConfirm={confirmAbort}
        onCancel={cancelAbort}
        testId={testId ? `${testId}-abort` : 'abort-dialog'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
