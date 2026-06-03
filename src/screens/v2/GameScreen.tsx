/**
 * GameScreen.tsx — S4-1 ゲームプレイ / S4-2 結果開示（spec F-01 描画 / F-03 / F-12）。
 *
 * S3 のロジック層（gameMachine / patch / scoring）に描画とタイマーを配線する。
 * - フルスクリーン許容（NF-29）：ガボール背景 #808080 はステータスバー領域まで。
 *   上部バーの文字・X・残り秒は top inset 内（GameTopBar が担保）。
 * - タイマー駆動（useGameTimer）：playing 中のみ経過秒/残り秒を更新、満了で TIMEOUT。
 * - 3 採点方式（F-02）：① 下部なし／② ConfirmButton／③ 全問正解で即遷移（gameMachine 内）。
 * - 結果開示（F-03）：採点後 revealed フェーズで各パッチに ResultMark、格子直下に
 *   AggregateResultBadge。方式①② は 1.5 秒、方式③ 全問正解即遷移は 0.6 秒で NEXT。
 *
 * 本スクリーンは S5（ボトムタブ・中断ダイアログ）・S6（起動フロー・結果カード）の
 * 配線前提のため、onAbort / onSessionComplete をコールバックで外へ委譲する。
 */

import React from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import type { ViewingDistanceCm } from '../../lib/calibration';
import {
  GameConfig,
  GameEvent,
  GameState,
  gameReducer,
  initGame,
} from '../../lib/v2/gameMachine';
import { Rng } from '../../lib/v2/rng';
import { aggregateKind, classifyMarks } from '../../lib/v2/gameView';
import { useGameTimer } from '../../hooks/v2/useGameTimer';
import { GameTopBar } from '../../components/v2/GameTopBar';
import { GaborGrid } from '../../components/v2/GaborGrid';
import { ConfirmButton } from '../../components/v2/ConfirmButton';
import { ResultOverlayLayer } from '../../components/v2/ResultOverlayLayer';
import type { FeedbackEvent } from '../../lib/v2/feedback';

/** 方式①② の結果開示インターバル（screens.md §2、旧 10 秒固定廃止）。 */
export const REVEAL_INTERVAL_MS = 1500;
/** 方式③ 全問正解即遷移時の短い正解フィードバック（screens.md §2）。 */
export const ALL_CORRECT_FEEDBACK_MS = 600;

export type GameScreenProps = {
  config: GameConfig;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /** 乱数注入（テスト決定論）。未指定は Math.random */
  rng?: Rng;
  /**
   * 一時停止（S5 中断ダイアログ表示中）。true の間タイマーを止め、
   * 解除で残り時間から再開する（F-07：キャンセルで残り時間保持）。
   */
  paused?: boolean;
  /** 上部 X 押下（S5 で中断ダイアログ） */
  onAbort: () => void;
  /** 全ラウンド完了（S6 でセッション結果カードへ） */
  onSessionComplete: (state: GameState) => void;
  /**
   * 音・ハプティクス発火（S9 / F-14）。採点フィードバック（正解/不正解）と
   * カウントダウン残り 3/2/1 秒のティックをここから通知する。試行中（採点前）は
   * これら以外を発火しない（F-14 受け入れ基準）。未指定なら無発火（後方互換）。
   */
  onFeedback?: (event: FeedbackEvent) => void;
  testId?: string;
};

export const GameScreen: React.FC<GameScreenProps> = ({
  config,
  viewingDistanceCm,
  dpi,
  rng = Math.random,
  paused = false,
  onAbort,
  onSessionComplete,
  onFeedback,
  testId,
}) => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const shortEdgePx = Math.min(width, height);

  const rngRef = React.useRef(rng);
  rngRef.current = rng;

  // onFeedback の最新参照（依存に入れず stale closure を避ける）。
  const onFeedbackRef = React.useRef(onFeedback);
  onFeedbackRef.current = onFeedback;

  const [state, dispatch] = React.useReducer(
    (s: GameState, e: GameEvent) => gameReducer(s, e, rngRef.current),
    config,
    (c) => initGame(c, rngRef.current),
  );

  const playing = state.phase === 'playing';
  const revealed = state.phase === 'revealed';

  // m 秒満了で採点。playing 中のみ駆動。
  const { elapsedSec, remainingSec } = useGameTimer({
    durationSec: config.roundSeconds,
    active: playing,
    roundKey: state.roundIndex,
    onTimeout: () => dispatch({ type: 'TIMEOUT' }),
    paused,
  });

  // カウントダウン残り 3/2/1 秒の毎秒ティック（F-14）。playing 中のみ、各秒 1 度だけ。
  // 試行中だが「採点直前の予告」として system §10.2 で許容される唯一の非採点 FB。
  const lastTickedSecRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!playing || paused) {
      // 開示・中断・完了に入ったらティック追跡をリセット（次ラウンドで再発火可能に）。
      lastTickedSecRef.current = null;
      return;
    }
    if (
      (remainingSec === 3 || remainingSec === 2 || remainingSec === 1) &&
      lastTickedSecRef.current !== remainingSec
    ) {
      lastTickedSecRef.current = remainingSec;
      onFeedbackRef.current?.({
        type: 'countdown-tick',
        remainingSec: remainingSec as 1 | 2 | 3,
      });
    }
  }, [playing, paused, remainingSec]);

  // ラウンド開始（playing 化）でティック追跡をリセット。
  React.useEffect(() => {
    if (playing) lastTickedSecRef.current = null;
  }, [playing, state.roundIndex]);

  // 採点フィードバック（F-14）：開示フェーズに入った各ラウンドで 1 度だけ、
  // 総合 ✅/❌（aggregateKind）に応じて正解/不正解の音・ハプティクスを発火する。
  React.useEffect(() => {
    if (!revealed) return;
    const kind = aggregateKind(state.patches, state.selected);
    onFeedbackRef.current?.({
      type: kind === 'success' ? 'round-correct' : 'round-wrong',
    });
    // 開示は roundIndex ごとに 1 回。state.patches/selected は同一ラウンド内で確定済み。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, state.roundIndex]);

  // 結果開示中：方式③即遷移は 0.6 秒、それ以外は 1.5 秒で次ラウンドへ。
  React.useEffect(() => {
    if (!revealed) return;
    const ms = state.advancedByAllCorrect
      ? ALL_CORRECT_FEEDBACK_MS
      : REVEAL_INTERVAL_MS;
    const id = setTimeout(() => dispatch({ type: 'NEXT' }), ms);
    return () => clearTimeout(id);
  }, [revealed, state.advancedByAllCorrect, state.roundIndex]);

  // セッション完了を外へ通知。
  React.useEffect(() => {
    if (state.phase === 'session-complete') {
      onSessionComplete(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  const handleToggle = React.useCallback((index: number) => {
    dispatch({ type: 'TOGGLE', index });
  }, []);

  const handleConfirm = React.useCallback(() => {
    dispatch({ type: 'CONFIRM' });
  }, []);

  // 開示中のマーク（TP/FN/FP/none）。試行中は null。
  const marks = React.useMemo(
    () => (revealed ? classifyMarks(state.patches, state.selected) : null),
    [revealed, state.patches, state.selected],
  );

  const showConfirm =
    playing && config.scoringMode === 'auto-confirm';

  return (
    <View
      style={[styles.root, { backgroundColor: colors.bgGabor }]}
      testID={testId}
    >
      <GameTopBar
        remainingSec={revealed ? 0 : remainingSec}
        onAbort={onAbort}
        testId={testId ? `${testId}-topbar` : undefined}
      />
      <View style={styles.stage}>
        <GaborGrid
          patches={state.patches}
          gridSize={config.gridSize}
          shortEdgePx={shortEdgePx}
          elapsedSec={revealed ? config.roundSeconds : elapsedSec}
          selected={state.selected}
          marks={marks}
          viewingDistanceCm={viewingDistanceCm}
          dpi={dpi}
          onToggle={handleToggle}
          revealed={revealed}
          testId={testId ? `${testId}-grid` : undefined}
        />
        {/* 格子直下：方式② の確定ボタン（試行中）と総合バッジ（開示中）は排他 */}
        {showConfirm ? (
          <ConfirmButton
            onConfirm={handleConfirm}
            testId={testId ? `${testId}-confirm` : undefined}
          />
        ) : null}
        {revealed && state.lastScore ? (
          <ResultOverlayLayer
            aggregate={aggregateKind(state.patches, state.selected)}
            score={state.lastScore}
            testId={testId ? `${testId}-overlay` : undefined}
          />
        ) : null}
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
    justifyContent: 'center',
    gap: spacing.s5,
    padding: spacing.s4,
  },
});
