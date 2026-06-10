/**
 * GameScreen.tsx — S5-1 ゲームプレイ / S5-2 結果開示（spec F-01 描画 / F-02 / F-03 / F-12、v3.1）。
 *
 * S4 の v3 ロジック層（gameMachine / patch / roundGen / level）に描画とタイマーを配線する。
 * - フルスクリーン許容（NF-29）：ガボール背景 #808080 はステータスバー領域まで。
 *   上部バーの X・レベル番号は top inset 内（GameTopBar が担保）。
 * - レベル/個数表示（F-02）：GB-1 右の LevelBadge と、格子上の CountBanner「◯個探せ！」。
 * - 制限時間カウントダウン（v3.1 改訂）：**メイン画面の上部**（格子の上）に大きめ表示（stage 変種）。
 *   旧 GB-1 中央のインライン表示は廃止。ラウンド中のセッション残り時間「あと」も廃止（ユーザー要望）。
 * - タイマー駆動（useGameTimer）：playing 中のみ経過秒/残り秒を更新、満了で TIMEOUT。
 * - 締め切り（§4.3、v3.1）：**全問正解での即時終了は廃止**。締切は TIMEOUT のみ。
 * - 結果開示（F-03、v3.1 改訂）：revealed フェーズで各パッチに ResultMark（deriveReveal）、
 *   **格子の中心に大きく ✅/❌**（CenterResultMark）、メイン画面上部に **3 秒固定の disclosure
 *   カウントダウン**（CD-1 disclosure・全区間赤・Black 太字・点滅なし）。3→2→1 で毎秒ティック音、
 *   0 で onResolved(result) を呼ぶ。読み上げは ResultOverlayLayer（srOnly）が担う。
 *   開示中は格子・カウントダウンともタップ無効（GaborGrid pointer-events: none）。
 *
 * 本スクリーンは 1 ラウンドを駆動し、締切後 3 秒開示してから onResolved で結果を外へ委譲する。
 * セッションループ（次ラウンド生成・累積時間判定・セッション要約）は AppRoot 責務（key 差し替えで再生成）。
 * レベル増減（applyResult）と記録（recordCompletedSession）も呼ばない（sessionFlow / AppRoot 責務）。
 */

import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import type { ViewingDistanceCm } from '../../lib/calibration';
import type { GameConfig, GameEvent, GameState } from '../../lib/v3/gameMachine';
import { deriveReveal, gameReducer, initGame } from '../../lib/v3/gameMachine';
import type { GameResult } from '../../lib/v3/level';
import { Rng } from '../../lib/v2/rng';
import type { FeedbackEventV3 } from '../../lib/v3/feedback';
import { REVEAL_COUNTDOWN_SEC } from '../../lib/v3/gameView';
import { useGameTimer } from '../../hooks/v2/useGameTimer';
import { announceForA11y } from '../../lib/v3/a11yAnnounce';
import { GameTopBar, GAME_TOP_BAR_HEIGHT } from '../../components/v3/GameTopBar';
import { CountBanner } from '../../components/v3/CountBanner';
import { CountdownTimer } from '../../components/v3/CountdownTimer';
import { GaborGrid, computeGridEdge } from '../../components/v3/GaborGrid';
import { CenterResultMark } from '../../components/v3/CenterResultMark';
import { ResultOverlayLayer } from '../../components/v3/ResultOverlayLayer';
import { t } from '../../i18n';

export type GameScreenProps = {
  config: GameConfig;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /** 乱数注入（テスト決定論）。未指定は Math.random */
  rng?: Rng;
  /**
   * 一時停止（S6 中断ダイアログ表示中）。true の間タイマーを止め、
   * 解除で残り時間から再開する（F-07：キャンセルで残り時間保持）。
   */
  paused?: boolean;
  /** 上部 X 押下（S6 で中断ダイアログ） */
  onAbort: () => void;
  /**
   * ゲーム進行状態の変化通知（S6 中断判定用、F-05/F-07）。
   * playing フェーズ（締め切り前）= true、結果開示中・締め切り後 = false。
   * 親（AppRoot）は false の間、× ・タブ移動でダイアログを出さず自由遷移させる。
   */
  onPlayingChange?: (playing: boolean) => void;
  /**
   * セッション残り時間（秒、v3.1）。上部バーに「{mm}:{ss}」を控えめ表示（段階色なし・「あと」表記なし）。
   * 未指定なら表示しない（単発ゲーム用）。
   */
  remainingSessionSec?: number;
  /**
   * 3 秒開示カウントダウン後に確定結果（clear/fail）を外へ通知（v3.1：AppRoot で
   * resolveCompletedRound → 次ラウンド or セッション要約）。中断時は呼ばれない。
   */
  onResolved: (result: GameResult, state: GameState) => void;
  /**
   * 音・ハプティクス発火（F-14）。締め切り時の clear/fail、カウントダウン残り 3/2/1 秒の
   * tick をここから emit する（試行中は結果フィードバック以外を発火しない＝tick のみ例外）。
   * 未指定（テスト等）は無発火。
   */
  onFeedback?: (event: FeedbackEventV3) => void;
  testId?: string;
};

export const GameScreen: React.FC<GameScreenProps> = ({
  config,
  viewingDistanceCm,
  dpi,
  rng = Math.random,
  paused = false,
  remainingSessionSec,
  onAbort,
  onPlayingChange,
  onResolved,
  onFeedback,
  testId,
}) => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const shortEdgePx = Math.min(width, height);

  // 画面中央レイアウト（ユーザー要望：パッチ格子を**スクリーン全体**の上下中央に）。
  // stage は上部バー直下から始まるため、画面 y = barBottom + stage 内 y。
  // 格子上端（stage 内）= 画面中央 - 格子辺/2 - barBottom。負（狭い画面）はバー直下にクランプ。
  const gridEdge = computeGridEdge(shortEdgePx);
  const barBottom = insets.top + GAME_TOP_BAR_HEIGHT;
  const gridTopInStage = Math.max(
    spacing.s2,
    Math.round(height / 2 - gridEdge / 2 - barBottom),
  );

  const rngRef = React.useRef(rng);
  rngRef.current = rng;

  // フィードバック emit を安定参照で保持（依存配列を増やさない）。
  const onFeedbackRef = React.useRef(onFeedback);
  onFeedbackRef.current = onFeedback;

  const [state, dispatch] = React.useReducer(
    (s: GameState, e: GameEvent) => gameReducer(s, e),
    config,
    (c) => initGame(c, rngRef.current),
  );

  const playing = state.phase === 'playing';
  const revealed = state.phase === 'revealed';

  // 進行状態の変化を親へ通知（F-05/F-07：締め切り後は非進行＝自由遷移）。
  const onPlayingChangeRef = React.useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;
  React.useEffect(() => {
    onPlayingChangeRef.current?.(playing);
  }, [playing]);

  // ゲーム開始時に aria-live(assertive) でレベル・個数を読み上げる（F-02 / NF-10）。
  React.useEffect(() => {
    announceForA11y(
      t('gameV3.start_announce', {
        level: config.level,
        count: config.params.count,
      }),
    );
    // 開始時 1 度だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 制限時間満了で TIMEOUT。playing 中のみ駆動。roundKey は固定（1 ゲーム = 1 ラウンド）。
  const { elapsedSec, remainingSec } = useGameTimer({
    durationSec: config.params.seconds,
    active: playing,
    roundKey: 'v3-game',
    onTimeout: () => dispatch({ type: 'TIMEOUT' }),
    paused,
  });

  // 締切後の 3 秒開示カウントダウン（v3.1：CD-1 disclosure、§4.6 / AS-25・確定値）。
  // revealed に入ったら REVEAL_COUNTDOWN_SEC からスタートし、毎秒減算（ティック音）。0 で onResolved。
  const [revealCountdown, setRevealCountdown] = React.useState<number | null>(null);
  const onResolvedRef = React.useRef(onResolved);
  onResolvedRef.current = onResolved;

  React.useEffect(() => {
    if (!revealed || state.result === null) {
      setRevealCountdown(null);
      return;
    }
    // 締め切り時に総合 clear/fail の音 + ハプティクスを 1 度発火（F-14、system §10.1）。
    // 試行中（playing）は発火しない＝結果フィードバックは締め切り後のみ。
    onFeedbackRef.current?.({ type: state.result === 'clear' ? 'clear' : 'fail' });
    setRevealCountdown(REVEAL_COUNTDOWN_SEC);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  // 3 秒開示カウントダウンの毎秒駆動。各秒でティック音（F-14：3/2/1）、0 で onResolved。
  React.useEffect(() => {
    if (revealCountdown === null) return;
    if (revealCountdown <= 0) {
      const result = state.result;
      if (result) onResolvedRef.current(result, state);
      return;
    }
    // 3/2/1 秒で毎秒ティック音（CD-1 disclosure と同期、F-14）。
    // 開示カウントダウンは 3→1 の範囲なので tick イベントの 1|2|3 に収まる。
    if (revealCountdown <= 3) {
      onFeedbackRef.current?.({
        type: 'countdown-tick',
        remainingSec: revealCountdown as 1 | 2 | 3,
      });
    }
    const id = setTimeout(() => {
      setRevealCountdown((c) => (c === null ? null : c - 1));
    }, 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealCountdown]);

  // 制限時間カウントダウン残り 3/2/1 秒の毎秒ティック音（F-14 で許可された試行中の例外）。
  // playing 中（締め切り前・非ポーズ）のみ。各秒で 1 度だけ（重複防止に lastTick を保持）。
  const lastTickRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!playing || paused) return;
    const sec = remainingSec;
    if (sec === 3 || sec === 2 || sec === 1) {
      if (lastTickRef.current !== sec) {
        lastTickRef.current = sec;
        onFeedbackRef.current?.({ type: 'countdown-tick', remainingSec: sec });
      }
    } else {
      lastTickRef.current = null;
    }
  }, [remainingSec, playing, paused]);

  const handleToggle = React.useCallback((index: number) => {
    dispatch({ type: 'TOGGLE', index });
  }, []);

  // 開示中の各パッチ区分（correct/missed/wrong/none）。試行中は null。
  const reveal = React.useMemo(
    () => (revealed ? deriveReveal(state.patches, state.selected) : null),
    [revealed, state.patches, state.selected],
  );

  return (
    <View
      style={[styles.root, { backgroundColor: colors.bgGabor }]}
      testID={testId}
    >
      <GameTopBar
        level={config.level}
        remainingSessionSec={
          remainingSessionSec != null
            ? Math.max(0, remainingSessionSec - elapsedSec)
            : undefined
        }
        onAbort={onAbort}
        testId={testId ? `${testId}-topbar` : undefined}
      />
      <View style={styles.stage}>
        {/* カウントダウン枠（制限時間 / 締切後 3 秒開示で共用）。リボンと格子の間の垂直中央。 */}
        <View style={[styles.topCountdown, { height: gridTopInStage }]}>
          {revealed ? (
            revealCountdown !== null && revealCountdown > 0 ? (
              <CountdownTimer
                remainingSec={revealCountdown}
                variant="disclosure"
                testId={testId ? `${testId}-disclosure` : 'disclosure-countdown'}
              />
            ) : null
          ) : (
            <CountdownTimer
              remainingSec={remainingSec}
              variant="stage"
              testId={testId ? `${testId}-countdown` : 'countdown-v3'}
            />
          )}
        </View>
        {/* 格子はスクリーン全体の上下中央（gridTopInStage で位置決め）。 */}
        <View style={styles.gridWrap}>
          <GaborGrid
            patches={state.patches}
            gridSize={config.params.gridSize}
            shortEdgePx={shortEdgePx}
            elapsedSec={elapsedSec}
            selected={state.selected}
            reveal={reveal}
            viewingDistanceCm={viewingDistanceCm}
            dpi={dpi}
            onToggle={handleToggle}
            revealed={revealed}
            testId={testId ? `${testId}-grid` : undefined}
          />
          {revealed && state.result ? (
            <>
              {/* ラウンド全体の正解/不正解を格子中心に大きく ✓/✕（パッチごとのマークと同じ見た目）。 */}
              <CenterResultMark
                result={state.result}
                testId={testId ? `${testId}-center-mark` : 'center-result-mark'}
              />
              {/* 読み上げのみ（視覚は CenterResultMark + パッチごとの ResultMark が担う）。 */}
              <ResultOverlayLayer
                result={state.result}
                srOnly
                testId={testId ? `${testId}-overlay` : undefined}
              />
            </>
          ) : null}
        </View>
        {/* 「◯個探せ！」はパッチの下に表示（ユーザー要望）。 */}
        <View style={styles.bottomArea}>
          <CountBanner
            count={config.params.count}
            testId={testId ? `${testId}-count` : undefined}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    // 縦 padding は入れない（gridTopInStage の画面中央計算が狂うため横のみ）。
    paddingHorizontal: spacing.s4,
  },
  // カウントダウン枠。高さは動的（リボン下端〜格子上端）で、その垂直中央に数字を置く
  //（ユーザー要望）。高さ指定はインライン（gridTopInStage）。
  topCountdown: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  // 個数バナーは格子直下（余白 s5）。
  bottomArea: {
    alignItems: 'center',
    paddingTop: spacing.s5,
  },
  // 格子と、その中心に重ねる総合マーク（CenterResultMark）の重畳コンテナ。
  gridWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
