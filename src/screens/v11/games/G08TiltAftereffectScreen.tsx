/**
 * G08TiltAftereffectScreen — G-08 残像方位弁別（spec-v11.md §7.8、screens.md S20-G08-PLAY）。
 *
 * v1.1.1 改訂（Sprint 20-C）：
 *   - **horizontal-2 テキスト 2 択ボタン（「下のパッチは時計回り／反時計回り」）を撤去**
 *   - 下部に左右 2 個のテストパッチを並べ、ImageChoiceCell で直接タップ回答
 *   - adapter は disabled + dimOnDisabled=false で視覚維持、タップ不可
 *   - 出題方向（時計回り or 反時計回り）を試行ごとにランダム化、guidance に明示
 *   - staircase 値・採点ロジック・閾値計算は不変
 *
 * v1.1 OPT-12 統一フォーマット（不変）：
 *   - 1 試行 = 60 秒固定（早期終了不可）
 *   - 60 秒間ずっと adapter + 下部 2 テストパッチ同時提示（点滅・マスク・フェードなし）
 *   - 確定ボタンなし
 *   - 60 秒経過で自動採点
 *   - 未回答 = 不正解、staircase 易方向（角度を増やす方向 = max 方向）
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
import { GamePlaySurface } from '../../../components/v11/GamePlaySurface';
import { G08TiltStimulus, G08SelectableSide } from '../../../components/v11/games/G08TiltStimulus';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useGameCountdown } from '../../../hooks/v11/useGameCountdown';
import {
  DEFAULT_DPI,
  estimateDeviceType,
  ViewingDistanceCm,
} from '../../../lib/calibration';
import {
  applySessionResultV11,
  estimateThresholdV11,
  StaircaseStateV11,
} from '../../../lib/v11/staircaseV11';
import {
  loadStaircaseV11,
  saveStaircaseV11,
} from '../../../state/storage-v11';
import {
  buildG08Trial,
  computeG08StimulusLayout,
  G08Direction,
  G08GradingResult,
  G08TrialSpec,
  GAME8_V11,
  gradeG08BySide,
} from '../../../lib/v11/g08Trial';
import {
  fontSize,
  getColors,
  spacing,
} from '../../../theme/tokens';
import { G08ResultScreen } from './G08ResultScreen';
import { GamePostCompleteData } from './_shared/types';

/** G-08 1 試行終了時に親に返す結果 */
export type G08TrialResult = {
  /** 今回の閾値（直近 5 セッション平均、整数） */
  thresholdDeg: number;
  /** 採点結果（未回答時も grading は返る、unattempted フラグで判定） */
  grading: G08GradingResult;
  /** 試行のスペック */
  trial: G08TrialSpec;
  /** 親が staircase 平均と一緒に「前回比」を計算するために使う今回の使用パラメータ */
  playedParam: number;
  /** staircase 判定上の正解 */
  isCorrectForStaircase: boolean;
};

export type G08TiltAftereffectScreenProps = {
  distanceCm: ViewingDistanceCm;
  onAbort: () => void;
  /** Sprint 20-B-3：60 秒経過時に親が永続化等を行い、Promise<PostCompleteData> を返す */
  onComplete: (
    result: G08TrialResult,
  ) => Promise<GamePostCompleteData> | void;
  /** コース中断ダイアログ等で 60 秒タイマーを一時停止したいとき true。既定 false */
  paused?: boolean;
  /** Sprint 20-B-3：コースモード時 true */
  isCourseMode?: boolean;
  /** Sprint 20-B-3：コース時、次のゲーム表示用ラベル（最終なら null） */
  nextGameLabel?: string | null;
  /** Sprint 20-B-3：result phase で「次へ」（コース時） */
  onCourseAdvance?: () => void;
  /** Sprint 20-B-3：単体時の 3 ボタン */
  onPlayAgain?: () => void;
  onBackToList?: () => void;
  onGoHome?: () => void;
  /** テスト用：乱数注入 */
  rng?: () => number;
  /** テスト用：60 秒タイマーの代替 */
  totalDurationMsForTest?: number;
  tickMsForTest?: number;
};

type Phase = 'loading' | 'playing' | 'result';

/** 出題方向（screens.md §5.4）。試行ごとにランダム決定。 */
type AskDirection = G08Direction;

export const G08TiltAftereffectScreen: React.FC<
  G08TiltAftereffectScreenProps
> = ({
  distanceCm,
  onAbort,
  onComplete,
  paused = false,
  isCourseMode = false,
  nextGameLabel = null,
  onCourseAdvance,
  onPlayAgain,
  onBackToList,
  onGoHome,
  rng,
  totalDurationMsForTest,
  tickMsForTest = 250,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const dpi = React.useMemo(() => deviceDpi(), []);
  const totalDurationMs = totalDurationMsForTest ?? GAME8_V11.totalDurationMs;

  const [staircase, setStaircase] = React.useState<StaircaseStateV11 | null>(
    null,
  );
  const [trial, setTrial] = React.useState<G08TrialSpec | null>(null);
  const [askDirection, setAskDirection] = React.useState<AskDirection>('cw');
  const [phase, setPhase] = React.useState<Phase>('loading');
  const [selectedSide, setSelectedSide] =
    React.useState<G08SelectableSide | null>(null);
  const [showAbort, setShowAbort] = React.useState(false);
  const [resultPayload, setResultPayload] =
    React.useState<G08TrialResult | null>(null);
  const [postData, setPostData] = React.useState<GamePostCompleteData>({
    previousBest: null,
    newlyAwardedBadges: [],
  });

  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  const isCourseModeRef = React.useRef(isCourseMode);
  React.useEffect(() => {
    isCourseModeRef.current = isCourseMode;
  }, [isCourseMode]);

  // 初回：staircase 読み込み + 試行生成
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadStaircaseV11('G-08');
      if (cancelled) return;
      const r = rng ?? Math.random;
      const t = buildG08Trial(s.currentParam, r);
      // 出題方向を 50% で振る。trial.correctDirection は trial 生成時にランダム
      // 決定済みなので、askDirection を採点側で「正解側を反転するか」のスイッチに使う。
      const ask: AskDirection = r() < 0.5 ? 'cw' : 'ccw';
      setStaircase(s);
      setTrial(t);
      setAskDirection(ask);
      setPhase('playing');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trialRef = React.useRef<G08TrialSpec | null>(trial);
  const staircaseRef = React.useRef<StaircaseStateV11 | null>(staircase);
  const selectedSideRef = React.useRef<G08SelectableSide | null>(selectedSide);
  const askDirectionRef = React.useRef<AskDirection>(askDirection);
  React.useEffect(() => {
    trialRef.current = trial;
  }, [trial]);
  React.useEffect(() => {
    staircaseRef.current = staircase;
  }, [staircase]);
  React.useEffect(() => {
    selectedSideRef.current = selectedSide;
  }, [selectedSide]);
  React.useEffect(() => {
    askDirectionRef.current = askDirection;
  }, [askDirection]);

  const handleTimeUp = React.useCallback(() => {
    const t = trialRef.current;
    const s = staircaseRef.current;
    if (!t || !s) return;

    // ask='cw' のとき正解側 = trial.correctSide（trial.correctDirection と同じ
    // 向きのパッチ）。ask='ccw' のときは正解側を反転する（反対方向に傾いている
    // パッチが正解になる）。trial の構造は不変、採点規約だけ ask に応じて反転。
    const ask = askDirectionRef.current;
    const effectiveCorrectSide: 'left' | 'right' =
      ask === 'cw'
        ? t.correctSide
        : t.correctSide === 'left'
          ? 'right'
          : 'left';
    const effectiveCorrectDirection: G08Direction = ask;
    const effectiveTrial: G08TrialSpec = {
      ...t,
      correctSide: effectiveCorrectSide,
      correctDirection: effectiveCorrectDirection,
    };

    const grading = gradeG08BySide(effectiveTrial, selectedSideRef.current);
    const isCorrect = grading.isCorrect;

    const next = applySessionResultV11(s, isCorrect ? 'correct' : 'incorrect');
    void saveStaircaseV11(next).catch(() => {});

    const threshold = round0(estimateThresholdV11(next));
    const payload: G08TrialResult = {
      thresholdDeg: threshold,
      grading,
      trial: effectiveTrial,
      playedParam: s.currentParam,
      isCorrectForStaircase: isCorrect,
    };
    setResultPayload(payload);
    setPhase('result');
    const maybe = onCompleteRef.current(payload);
    if (maybe && typeof (maybe as Promise<unknown>).then === 'function') {
      void (maybe as Promise<GamePostCompleteData>)
        .then((data) => {
          if (data) setPostData(data);
        })
        .catch(() => {});
    }
  }, []);

  const { remainingMs } = useGameCountdown({
    totalDurationMs,
    enabled: phase === 'playing',
    paused: paused || showAbort,
    onTimeUp: handleTimeUp,
    tickMs: tickMsForTest,
  });

  const handleSelectFromStimulus = React.useCallback(
    (next: G08SelectableSide | null) => {
      if (phase !== 'playing') return;
      setSelectedSide(next);
    },
    [phase],
  );

  const requestAbort = React.useCallback(() => {
    // Sprint 22：play / result 両 phase で × → ConfirmDialog 経由の確認動線。
    setShowAbort(true);
  }, []);

  const confirmAbort = React.useCallback(() => {
    setShowAbort(false);
    onAbort();
  }, [onAbort]);

  if (phase === 'loading' || !trial) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bgCanvas }]}>
        <Text style={[styles.loadingText, { color: colors.fgPrimary }]}>
          準備中…
        </Text>
      </View>
    );
  }

  if (phase === 'result' && resultPayload) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bgCanvas }}
        testID="g08-tilt-aftereffect-screen"
      >
        <G08ResultScreen
          result={resultPayload}
          previousBestThreshold={postData.previousBest}
          isCourseMode={isCourseMode}
          nextGameLabel={nextGameLabel}
          onNext={onCourseAdvance}
          onAbort={requestAbort}
          onPlayAgain={onPlayAgain}
          onBackToList={onBackToList}
          onGoHome={onGoHome}
          newlyAwardedBadges={postData.newlyAwardedBadges}
        />
        <ConfirmDialog
          isOpen={showAbort}
          title="ゲームを中断しますか？"
          message="ここまでの記録は未完了として保存されます"
          primaryLabel="続ける"
          secondaryLabel="中断する"
          onPrimaryPress={() => setShowAbort(false)}
          onSecondaryPress={confirmAbort}
        />
      </View>
    );
  }

  const { width: vpW, height: vpH } = Dimensions.get('window');
  const { patchSizePx, gapPx } = computeG08StimulusLayout({
    widthPx: vpW,
    heightPx: vpH,
  });

  const directionWord = askDirection === 'cw' ? '時計回り' : '反時計回り';
  const guidanceText = `より${directionWord}に傾いて見えるパッチを下から選んでください`;
  const groupAriaLabel = guidanceText;
  const leftAriaLabel = `下の左の縞模様（タップで「下の左がより${directionWord}」と回答）`;
  const rightAriaLabel = `下の右の縞模様（タップで「下の右がより${directionWord}」と回答）`;

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
      testID="g08-tilt-aftereffect-screen"
    >
      <GamePlaySurface
        gameNameJa="G-08 残像方位弁別"
        remainingSeconds={remainingMs / 1000}
        onAbort={requestAbort}
        ariaInstruction={`画面上部の adapter パッチを見続けながら、下に並ぶ 2 つのテストパッチのうち、より${directionWord}に傾いて見える方をタップしてください。adapter はタップに反応しません。気が変われば何度でも変更可。確定ボタンはありません。60 秒経過で自動採点します。`}
        guidanceText={guidanceText}
        guidanceLiveRegion
        stimulusInteractive
        stimulusArea={
          <G08TiltStimulus
            adapter={trial.adapter}
            testLeft={trial.testLeft}
            testRight={trial.testRight}
            patchSizePx={patchSizePx}
            gapPx={gapPx}
            viewingDistanceCm={distanceCm}
            dpi={dpi}
            selectedSide={selectedSide}
            onSelectSide={handleSelectFromStimulus}
            disabled={phase !== 'playing'}
            groupAriaLabel={groupAriaLabel}
            leftAriaLabel={leftAriaLabel}
            rightAriaLabel={rightAriaLabel}
            testId="g08-stimulus"
          />
        }
        // Sprint 20-C：horizontal-2 撤去。answerChoices は空。
        answerChoices={<View accessibilityElementsHidden />}
      />

      <ConfirmDialog
        isOpen={showAbort}
        title="ゲームを中断しますか？"
        message="ここまでの記録は未完了として保存されます"
        primaryLabel="続ける"
        secondaryLabel="中断する"
        onPrimaryPress={() => setShowAbort(false)}
        onSecondaryPress={confirmAbort}
      />
    </View>
  );
};

function deviceDpi(): number {
  return DEFAULT_DPI[estimateDeviceType(Platform.OS)];
}

/** 角度は整数°（gameRegistry.step=1 と整合） */
function round0(v: number): number {
  return Math.round(v);
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s5,
  },
  loadingText: {
    fontSize: fontSize.body,
  },
});
