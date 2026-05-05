/**
 * Game2Screen — Game 2 メインプレイ画面（amendment 後の左右並び 2AFC 型）。
 *
 * spec.md §7.2 / screens.md S1-03（amendment 反映）に従う。
 *
 * 試行ライフサイクル：
 *   [初回のみ] fixation 500ms
 *   → presentation 5000ms（左右並び、点滅なし、回答ボタン disabled）
 *   → answer 最大 3000ms（左右ガボール継続表示、回答ボタン + ガボール画像タップで回答可）
 *      3 秒以内未回答 → outcome='noResponse'（不正解扱い、staircase up）
 *   → feedback 1500ms（同じガボールを表示継続。最終試行のみ正解側ハイライト、
 *      正解時のみ音 + ハプティクス）
 *   → 次試行は presentation から開始（fixation スキップ。ガボールは連続表示で
 *      画面上から消えない。新しい spec にスムーズに切り替わる）
 *   → or セッション終了
 *
 * セッション終了条件：
 *   - 60 秒経過
 *   - または 30 試行達成
 *   - 中断 × ボタン（緊急脱出）
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
import {
  fontSize,
  getColors,
  spacing,
} from '../theme/tokens';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GameStatusBar } from '../components/GameStatusBar';
import { FixationCross } from '../components/FixationCross';
import { SideBySideGabor } from '../components/SideBySideGabor';
import {
  GAME2,
  Game2TrialSpec,
  Side,
  buildTrialSpec,
  gradeAnswer,
} from '../lib/game2';
import {
  DEFAULT_DPI,
  estimateDeviceType,
  recommendedPatchSizePx,
} from '../lib/calibration';
import {
  StaircaseState,
  applyTrialResult,
  estimateThreshold,
} from '../lib/staircase';
import {
  loadStaircase,
  saveStaircase,
} from '../state/storage';
import { playCorrect } from '../lib/audio';
import { lightImpact } from '../lib/haptics';
import { useAppForeground } from '../lib/appState';
import { useGame2Keyboard } from '../lib/keyboardShortcuts';
import { usePrefersReducedMotion, scaleDuration } from '../lib/motion';

export type Game2Result = {
  thresholdDeg: number;
  correctRate: number;
  trialCount: number;
};

export type Game2ScreenProps = {
  distanceCm: 30 | 40 | 50;
  onAbort: () => void;
  onComplete: (result: Game2Result) => void;
};

type TrialRecord = {
  paramValue: number;
  outcome: 'correct' | 'incorrect' | 'noResponse';
};

type Phase = 'fixation' | 'presentation' | 'answer' | 'feedback';

export const Game2Screen: React.FC<Game2ScreenProps> = ({
  distanceCm,
  onAbort,
  onComplete,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const dpi = React.useMemo(() => deviceDpi(), []);

  // 左右 2 ガボールを横に並べるため、各パッチサイズは
  //   min(画面短辺の 0.5 / 2, 推奨パッチサイズ, 240)
  // として両側 + 中央ギャップが画面幅に収まるようクランプする。
  const sizePx = React.useMemo(() => {
    const recommended = recommendedPatchSizePx(distanceCm, dpi, 0.6);
    const { width, height } = Dimensions.get('window');
    const shortSide = Math.min(width, height);
    // 左右並び 2 枚 + 中央 24px ギャップ + 左右パディング 16px*2 が収まる必要がある
    const usable = Math.max(0, width - spacing.s4 * 2 - spacing.s5);
    const halfWidth = Math.floor(usable / 2);
    const cap = Math.min(Math.floor(shortSide * 0.45), 240);
    return Math.max(96, Math.min(recommended, cap, halfWidth));
  }, [distanceCm, dpi]);

  const reducedMotion = usePrefersReducedMotion();

  const [staircase, setStaircase] = React.useState<StaircaseState | null>(null);
  const [trialIndex, setTrialIndex] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>('fixation');
  const [currentSpec, setCurrentSpec] = React.useState<Game2TrialSpec | null>(null);
  const [history, setHistory] = React.useState<TrialRecord[]>([]);
  const [remainingMs, setRemainingMs] = React.useState<number>(GAME2.sessionDurationMs);
  const [feedbackSide, setFeedbackSide] = React.useState<Side | null>(null);
  const [showAbort, setShowAbort] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);

  const startedAtRef = React.useRef<number>(Date.now());
  const phaseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = React.useRef(false);
  /** feedback 後に実行する遷移をキューする。 */
  const pendingAfterFeedbackRef = React.useRef<(() => void) | null>(null);

  const clearPhaseTimer = React.useCallback(() => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }, []);

  // セッション終了判定 + 結果計算
  const finalizeSession = React.useCallback(
    (finalHistory: TrialRecord[], finalStaircase: StaircaseState | null) => {
      if (completedRef.current) return;
      completedRef.current = true;
      setCompleted(true);
      clearPhaseTimer();
      if (tickerRef.current) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
      const correctCount = finalHistory.filter((t) => t.outcome === 'correct').length;
      const correctRate =
        finalHistory.length > 0 ? correctCount / finalHistory.length : 0;
      const threshold = estimateThreshold(
        finalHistory,
        finalStaircase?.currentParam ?? 6,
      );
      onComplete({
        thresholdDeg: round1(threshold),
        correctRate,
        trialCount: finalHistory.length,
      });
    },
    [onComplete, clearPhaseTimer],
  );

  // 初回：staircase 読み込み + 60 秒タイマー起動 + 初試行組み立て
  React.useEffect(() => {
    let cancelled = false;
    completedRef.current = false;
    (async () => {
      const s = await loadStaircase('game2');
      if (cancelled) return;
      setStaircase(s);
      setCurrentSpec(buildTrialSpec(s.currentParam));
      startedAtRef.current = Date.now();
      setPhase('fixation');
      tickerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        const remaining = GAME2.sessionDurationMs - elapsed;
        setRemainingMs(Math.max(0, remaining));
        if (remaining <= 0 && tickerRef.current) {
          clearInterval(tickerRef.current);
          tickerRef.current = null;
        }
      }, 250);
    })();
    return () => {
      cancelled = true;
      clearPhaseTimer();
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // フェーズ遷移管理：fixation/presentation/answer/feedback ごとに
  // タイマーを張る。answer は外部入力（タップ）で打ち切られ得るので setTimeout も併用。
  // feedback は finalizeTrial が pendingAfterFeedbackRef に「次に何をするか」を積み、
  // 本 useEffect が feedback フェーズで起動 → 1 秒後に積まれた処理を呼ぶ。
  React.useEffect(() => {
    if (!currentSpec || completed) return;
    clearPhaseTimer();

    if (phase === 'fixation') {
      phaseTimerRef.current = setTimeout(() => {
        setPhase('presentation');
      }, GAME2.fixationDurationMs);
    } else if (phase === 'presentation') {
      phaseTimerRef.current = setTimeout(() => {
        setPhase('answer');
      }, GAME2.presentationDurationMs);
    } else if (phase === 'answer') {
      // 3 秒以内に回答が無ければタイムアウト → 不正解扱い
      phaseTimerRef.current = setTimeout(() => {
        finalizeTrial('noResponse');
      }, GAME2.responseTimeLimitMs);
    } else if (phase === 'feedback') {
      const fbDuration = scaleDuration(GAME2.feedbackDurationMs, reducedMotion);
      phaseTimerRef.current = setTimeout(() => {
        const next = pendingAfterFeedbackRef.current;
        pendingAfterFeedbackRef.current = null;
        if (next) next();
      }, fbDuration);
    }

    return () => clearPhaseTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentSpec, completed]);

  // 1 試行を確定させ、staircase を更新し、次試行 or セッション終了に進む
  const finalizeTrial = React.useCallback(
    (outcome: 'correct' | 'incorrect' | 'noResponse') => {
      if (!staircase || !currentSpec || completedRef.current) return;
      clearPhaseTimer();

      const newHistory: TrialRecord[] = [
        ...history,
        { paramValue: currentSpec.paramValue, outcome },
      ];
      const updatedStaircase = applyTrialResult(staircase, outcome);
      void saveStaircase(updatedStaircase).catch(() => {
        // Sprint 1 は失敗を握りつぶす（Sprint 7 で本格対応）
      });

      setHistory(newHistory);
      setStaircase(updatedStaircase);

      const elapsed = Date.now() - startedAtRef.current;
      const reachedTimeLimit = elapsed >= GAME2.sessionDurationMs;
      const reachedTrialLimit = newHistory.length >= GAME2.maxTrials;
      const isFinal = reachedTimeLimit || reachedTrialLimit;

      // 正解時のみ音 + ハプティクス（不正解 / 未回答は無音）
      if (outcome === 'correct') {
        playCorrect();
        lightImpact();
      }

      // フィードバック表示（最終試行は正解側ハイライト、それ以外は単に 1 秒待機）
      const showHighlight = isFinal;
      setFeedbackSide(showHighlight ? currentSpec.correctSide : null);

      // feedback 後の遷移を pending にして、useEffect がタイマーで実行する。
      // 試行間で fixation には戻らない（ガボールが消えない設計）。
      pendingAfterFeedbackRef.current = isFinal
        ? () => finalizeSession(newHistory, updatedStaircase)
        : () => {
            setFeedbackSide(null);
            setTrialIndex((i) => i + 1);
            setCurrentSpec(buildTrialSpec(updatedStaircase.currentParam));
            setPhase('presentation');
          };
      setPhase('feedback');
    },
    [
      staircase,
      currentSpec,
      history,
      finalizeSession,
      clearPhaseTimer,
    ],
  );

  // 60 秒タイマー：残り 0 秒到達で finalize（最終フィードバック中は finalizeTrial が処理）
  React.useEffect(() => {
    if (remainingMs > 0) return;
    if (completedRef.current) return;
    // answer 中ならタイムアウト扱いで finalize、それ以外（fixation/presentation/feedback）なら
    // 現状の history で即終了する
    if (phase === 'answer') {
      finalizeTrial('noResponse');
    } else if (phase !== 'feedback') {
      finalizeSession(history, staircase);
    }
    // feedback 中は finalizeTrial の setTimeout が isFinal 判定で finalizeSession を呼ぶ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs, phase]);

  // 回答タップ
  const handleAnswer = React.useCallback(
    (side: Side) => {
      if (phase !== 'answer' || !currentSpec) return;
      const isCorrect = gradeAnswer(currentSpec, side);
      finalizeTrial(isCorrect ? 'correct' : 'incorrect');
    },
    [phase, currentSpec, finalizeTrial],
  );

  // Web キーボード ← / →
  useGame2Keyboard({ onAnswer: handleAnswer, enabled: phase === 'answer' });

  // バックグラウンド遷移 → ホームへ
  useAppForeground({
    onBackground: () => {
      if (!completedRef.current) {
        clearPhaseTimer();
        if (tickerRef.current) clearInterval(tickerRef.current);
        onAbort();
      }
    },
  });

  const requestAbort = React.useCallback(() => {
    setShowAbort(true);
  }, []);
  const confirmAbort = React.useCallback(() => {
    clearPhaseTimer();
    if (tickerRef.current) clearInterval(tickerRef.current);
    setShowAbort(false);
    onAbort();
  }, [onAbort, clearPhaseTimer]);
  const cancelAbort = React.useCallback(() => setShowAbort(false), []);

  if (!currentSpec || !staircase) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
        <Text style={[styles.loading, { color: colors.fgPrimary }]}>準備中…</Text>
      </View>
    );
  }

  // 提示中はガボールを表示。fixation だけ中央十字。
  const showGabors = phase === 'presentation' || phase === 'answer' || phase === 'feedback';
  const isAnswering = phase === 'answer';

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      <GameStatusBar
        remainingSeconds={remainingMs / 1000}
        trialIndex={Math.min(trialIndex + 1, GAME2.maxTrials)}
        totalTrials={GAME2.maxTrials}
        onAbort={requestAbort}
      />

      <View style={styles.center}>
        {phase === 'fixation' ? (
          <View testID="game2-fixation">
            <FixationCross
              sizeDeg={0.5}
              viewingDistanceCm={distanceCm}
              dpi={dpi}
            />
          </View>
        ) : null}
        {showGabors ? (
          <SideBySideGabor
            left={currentSpec.left}
            right={currentSpec.right}
            sizePx={sizePx}
            viewingDistanceCm={distanceCm}
            dpi={dpi}
            onSelectSide={handleAnswer}
            enabled={isAnswering}
            testId="game2-pair"
          />
        ) : null}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.borderDefault }]} />

      <View style={styles.answerBlock}>
        <Text
          style={[styles.guide, { color: colors.fgPrimary }]}
          accessibilityLiveRegion="polite"
        >
          どちらが時計回りに傾いていますか？
        </Text>
        <View style={styles.answerRow}>
          <View
            style={[
              styles.answerCell,
              feedbackSide === 'left'
                ? { borderColor: colors.highlightCorrect, borderWidth: 4, borderRadius: 16 }
                : null,
            ]}
          >
            <Button
              variant="secondary"
              size="lg"
              label="← 左"
              onPress={() => handleAnswer('left')}
              disabled={!isAnswering}
              ariaLabel="左の縞模様が時計回りに傾いている"
              fullWidth
              testId="answer-left"
            />
          </View>
          <View style={{ width: spacing.s4 }} />
          <View
            style={[
              styles.answerCell,
              feedbackSide === 'right'
                ? { borderColor: colors.highlightCorrect, borderWidth: 4, borderRadius: 16 }
                : null,
            ]}
          >
            <Button
              variant="secondary"
              size="lg"
              label="右 →"
              onPress={() => handleAnswer('right')}
              disabled={!isAnswering}
              ariaLabel="右の縞模様が時計回りに傾いている"
              fullWidth
              testId="answer-right"
            />
          </View>
        </View>
      </View>

      <ConfirmDialog
        isOpen={showAbort}
        title="コースを中断しますか？"
        message="ここまでの記録は未完了として保存されます"
        primaryLabel="続ける"
        secondaryLabel="中断する"
        onPrimaryPress={cancelAbort}
        onSecondaryPress={confirmAbort}
      />
    </View>
  );
};

function deviceDpi(): number {
  return DEFAULT_DPI[estimateDeviceType(Platform.OS)];
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s4,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.s4,
  },
  answerBlock: {
    padding: spacing.s4,
    paddingBottom: spacing.s6,
    alignItems: 'center',
    gap: spacing.s3,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  answerRow: {
    flexDirection: 'row',
    width: '100%',
  },
  answerCell: {
    flex: 1,
  },
  guide: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  loading: {
    flex: 1,
    fontSize: fontSize.body,
    textAlign: 'center',
    textAlignVertical: 'center',
    marginTop: spacing.s8,
  },
});
