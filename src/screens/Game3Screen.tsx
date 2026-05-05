/**
 * Game3Screen — Sprint 3 のメインプレイ画面（screens.md S3-01 / spec.md §7.3）。
 *
 * 流れ：
 *   1. 起動時：staircase 読み込み → 1 試行のスペック生成
 *   2. trialStart（500ms 固視点） → presentation（300〜800ms 8 個ガボール）
 *      → mask（200ms） → answer（最大 2000ms）
 *      → feedback（800ms 正解位置に矢印） → 次試行 or 完了
 *   3. 60 秒 / 40 試行で自動終了 → onComplete
 *
 * 未回答（noResponse）：
 *   - answer フェーズで 2000ms 経過まで未回答 → staircase up
 *   - feedback フェーズへ進み、矢印で正解を表示
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
  fontWeight,
  getColors,
  spacing,
} from '../theme/tokens';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GameStatusBar } from '../components/GameStatusBar';
import {
  PeripheralLayout,
  PeripheralPatch,
  PeripheralPhase,
} from '../components/PeripheralLayout';
import { ClockAnswerButtons } from '../components/ClockAnswerButtons';
import {
  ClockPosition,
  GAME3,
  Game3TrialSpec,
  buildGame3Trial,
  gradeGame3,
} from '../lib/game3';
import {
  DEFAULT_DPI,
  estimateDeviceType,
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
import { useGame3Keyboard } from '../lib/keyboardShortcuts';
import { usePrefersReducedMotion, scaleDuration } from '../lib/motion';

export type Game3Result = {
  /** 今回の閾値（最小角度差 °） */
  thresholdDeg: number;
  /** 試行数（noResponse も含む） */
  trialCount: number;
  /** 正答率（noResponse は不正解扱いで除算） */
  correctRate: number;
};

export type Game3ScreenProps = {
  distanceCm: 30 | 40 | 50;
  onAbort: () => void;
  onComplete: (result: Game3Result) => void;
  /** テスト用：乱数注入 */
  rng?: () => number;
};

type TrialRecord = {
  paramValue: number;
  outcome: 'correct' | 'incorrect' | 'noResponse';
};

type ScreenPhase =
  | 'loading'
  | 'trialStart' // 固視点だけ 500ms
  | 'presentation' // 8 個のガボール提示
  | 'mask' // 200ms マスク
  | 'answer' // 回答待ち（最大 2 秒）
  | 'feedback' // 0.8 秒矢印フィードバック
  | 'cooldown' // 100ms 試行間
  | 'done';

export const Game3Screen: React.FC<Game3ScreenProps> = ({
  distanceCm,
  onAbort,
  onComplete,
  rng,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const dpi = React.useMemo(() => deviceDpi(), []);
  const reducedMotion = usePrefersReducedMotion();

  const [staircase, setStaircase] = React.useState<StaircaseState | null>(null);
  const [currentSpec, setCurrentSpec] = React.useState<Game3TrialSpec | null>(null);
  const [phase, setPhase] = React.useState<ScreenPhase>('loading');
  const [trialIndex, setTrialIndex] = React.useState(0);
  const [history, setHistory] = React.useState<TrialRecord[]>([]);
  const [remainingMs, setRemainingMs] = React.useState<number>(GAME3.totalDurationMs);
  const [showAbort, setShowAbort] = React.useState(false);
  const [highlightCorrect, setHighlightCorrect] = React.useState<ClockPosition | undefined>(undefined);

  const startedAtRef = React.useRef<number>(Date.now());
  const tickerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = React.useRef(false);

  const clearPhaseTimer = React.useCallback(() => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }, []);

  // 初回：staircase 読み込み + 試行生成 + 60 秒タイマー開始
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadStaircase('game3');
      if (cancelled) return;
      setStaircase(s);
      setCurrentSpec(buildGame3Trial(s.currentParam, rng));
      startedAtRef.current = Date.now();
      tickerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        const remaining = GAME3.totalDurationMs - elapsed;
        setRemainingMs(Math.max(0, remaining));
        if (remaining <= 0 && tickerRef.current) {
          clearInterval(tickerRef.current);
          tickerRef.current = null;
        }
      }, 250);
      // 最初の試行スタート
      setPhase('trialStart');
    })();
    return () => {
      cancelled = true;
      if (tickerRef.current) clearInterval(tickerRef.current);
      clearPhaseTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // フェーズ進行（trialStart → presentation → mask → answer → feedback → cooldown）
  React.useEffect(() => {
    if (!currentSpec || phase === 'loading' || phase === 'done') return;

    clearPhaseTimer();

    if (phase === 'trialStart') {
      phaseTimerRef.current = setTimeout(() => {
        setPhase('presentation');
      }, GAME3.fixationDurationMs);
      return;
    }

    if (phase === 'presentation') {
      phaseTimerRef.current = setTimeout(() => {
        setPhase('mask');
      }, currentSpec.presentationDurationMs);
      return;
    }

    if (phase === 'mask') {
      phaseTimerRef.current = setTimeout(() => {
        setPhase('answer');
      }, GAME3.maskDurationMs);
      return;
    }

    if (phase === 'answer') {
      // 最大 2000ms 待機。タイムアウトで noResponse
      phaseTimerRef.current = setTimeout(() => {
        finalizeTrial('noResponse');
      }, GAME3.answerTimeoutMs);
      return;
    }

    if (phase === 'feedback') {
      // Sprint 7-C：reduce-motion 時は feedback 表示を瞬時化
      phaseTimerRef.current = setTimeout(() => {
        setPhase('cooldown');
      }, scaleDuration(GAME3.feedbackDurationMs, reducedMotion));
      return;
    }

    if (phase === 'cooldown') {
      phaseTimerRef.current = setTimeout(() => {
        advanceToNextTrial();
      }, GAME3.cooldownMs);
      return;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentSpec]);

  // 試行確定 → staircase 更新 → feedback フェーズへ
  const finalizeTrial = React.useCallback(
    (outcome: 'correct' | 'incorrect' | 'noResponse') => {
      if (!currentSpec || !staircase || completedRef.current) return;
      clearPhaseTimer();

      const newHistory: TrialRecord[] = [
        ...history,
        { paramValue: currentSpec.paramValue, outcome },
      ];
      const updatedStaircase = applyTrialResult(staircase, outcome);
      void saveStaircase(updatedStaircase).catch(() => {});

      setHistory(newHistory);
      setStaircase(updatedStaircase);
      setHighlightCorrect(currentSpec.oddClockPosition);
      setPhase('feedback');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSpec, staircase, history],
  );

  // 次試行 or セッション完了
  const advanceToNextTrial = React.useCallback(() => {
    if (!staircase || completedRef.current) return;
    setHighlightCorrect(undefined);

    const nextIndex = trialIndex + 1;
    const elapsed = Date.now() - startedAtRef.current;
    const reachedTimeLimit = elapsed >= GAME3.totalDurationMs;
    const reachedTrialLimit = nextIndex >= GAME3.maxTrials;

    if (reachedTimeLimit || reachedTrialLimit) {
      finalizeSession();
      return;
    }

    setTrialIndex(nextIndex);
    setCurrentSpec(buildGame3Trial(staircase.currentParam, rng));
    setPhase('trialStart');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialIndex, staircase]);

  // セッション完了：閾値推定 → onComplete
  const finalizeSession = React.useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (tickerRef.current) clearInterval(tickerRef.current);
    clearPhaseTimer();

    const correctCount = history.filter((t) => t.outcome === 'correct').length;
    const correctRate = history.length > 0 ? correctCount / history.length : 0;
    const fallback = staircase?.currentParam ?? 30;
    const threshold = estimateThreshold(history, fallback);
    setPhase('done');
    onComplete({
      thresholdDeg: round1(threshold),
      trialCount: history.length,
      correctRate,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, staircase, onComplete]);

  // 60 秒経過 → 強制終了
  React.useEffect(() => {
    if (remainingMs <= 0 && phase !== 'loading' && phase !== 'done' && !completedRef.current) {
      finalizeSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs]);

  // ユーザー回答
  const handleAnswer = React.useCallback(
    (answer: ClockPosition) => {
      if (phase !== 'answer' || !currentSpec) return;
      const isCorrect = gradeGame3(currentSpec, answer);
      if (isCorrect) {
        playCorrect();
        lightImpact();
      }
      finalizeTrial(isCorrect ? 'correct' : 'incorrect');
    },
    [phase, currentSpec, finalizeTrial],
  );

  // Web キーボードショートカット（1-8）
  useGame3Keyboard({ onAnswer: handleAnswer, enabled: phase === 'answer' });

  // バックグラウンド遷移 → ホームへ（A-8 中断）
  useAppForeground({
    onBackground: () => {
      if (!completedRef.current && phase !== 'loading' && phase !== 'done') {
        if (tickerRef.current) clearInterval(tickerRef.current);
        clearPhaseTimer();
        onAbort();
      }
    },
  });

  // 中断
  const requestAbort = React.useCallback(() => {
    setShowAbort(true);
  }, []);
  const confirmAbort = React.useCallback(() => {
    if (tickerRef.current) clearInterval(tickerRef.current);
    clearPhaseTimer();
    setShowAbort(false);
    onAbort();
  }, [onAbort, clearPhaseTimer]);
  const cancelAbort = React.useCallback(() => setShowAbort(false), []);

  if (phase === 'loading' || !currentSpec || !staircase) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
        <Text style={[styles.loading, { color: colors.fgPrimary }]}>準備中…</Text>
      </View>
    );
  }

  // PeripheralLayout に渡すフェーズ変換
  const peripheralPhase: PeripheralPhase =
    phase === 'presentation' ? 'presentation'
      : phase === 'mask' ? 'mask'
      : phase === 'feedback' ? 'feedback'
      : phase === 'answer' ? 'answer'
      : 'fixation';

  // 8 パッチに変換
  const patches: PeripheralPatch[] = currentSpec.orientations.map((deg, i) => ({
    cpd: GAME3.cpd,
    contrast: GAME3.baseContrast,
    orientationDeg: deg,
    phaseRad: currentSpec.phasesRad[i],
    sigmaDeg: GAME3.sigmaDeg,
  }));

  // フレームサイズ：viewport に合わせる
  const { width, height } = Dimensions.get('window');
  const isWide = width >= 900;
  const shortSide = Math.min(width, height);
  const framePx = isWide ? 400 : Math.min(320, shortSide - 32);
  const patchSizePx = isWide ? 56 : 48;
  const clockDiameter = isWide ? 360 : Math.min(320, shortSide - 16);

  const buttonsDisabled = phase !== 'answer';

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      <GameStatusBar
        remainingSeconds={remainingMs / 1000}
        trialIndex={trialIndex + 1}
        totalTrials={GAME3.maxTrials}
        onAbort={requestAbort}
      />

      <View
        style={[
          styles.playArea,
          isWide ? styles.playAreaWide : styles.playAreaTall,
        ]}
      >
        <View style={styles.gaborSection}>
          <PeripheralLayout
            patches={patches}
            phase={peripheralPhase}
            eccentricityDeg={currentSpec.eccentricityDeg}
            viewingDistanceCm={distanceCm}
            dpi={dpi}
            framePx={framePx}
            patchSizePx={patchSizePx}
            correctIndex={
              phase === 'feedback' ? currentSpec.oddPositionIndex : undefined
            }
            testId="peripheral"
          />
        </View>

        <View style={styles.answerSection}>
          <Text style={[styles.guide, { color: colors.fgSecondary }]}>
            「ちがう向き」のパッチはどの方向？
          </Text>
          <ClockAnswerButtons
            diameter={clockDiameter}
            onSelect={handleAnswer}
            disabled={buttonsDisabled}
            highlightCorrect={
              phase === 'feedback' ? highlightCorrect : undefined
            }
            testId="clock"
          />
        </View>
      </View>

      <ConfirmDialog
        isOpen={showAbort}
        title="ゲームを中断しますか？"
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
  playArea: {
    flex: 1,
    padding: spacing.s4,
    gap: spacing.s4,
  },
  playAreaTall: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playAreaWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s6,
    maxWidth: 1024,
    alignSelf: 'center',
    width: '100%',
  },
  gaborSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s3,
  },
  guide: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular as '400',
    textAlign: 'center',
    paddingHorizontal: spacing.s4,
  },
  loading: {
    flex: 1,
    fontSize: fontSize.body,
    textAlign: 'center',
    textAlignVertical: 'center',
    marginTop: spacing.s8,
  },
});
