/**
 * G02SideBySideTiltScreen — G-02 左右並び傾き判別（spec-v11.md §7.2、screens.md S20-G02-PLAY）。
 *
 * v1.1.1 改訂（Sprint 20-C）：
 *   - **horizontal-2 テキスト 2 択ボタン（「左」「右」）を撤去**
 *   - 左右ガボールパッチを ImageChoiceCell でラップして直接タップ回答
 *   - 出題方向（時計回り or 反時計回り）を試行ごとにランダム化、guidance に明示
 *   - staircase 値・採点ロジック・閾値計算は不変
 *
 * v1.1 OPT-12 統一フォーマット（不変）：
 *   - 1 試行 = 60 秒固定（早期終了不可）
 *   - 60 秒間ずっと左右 2 ガボール同時提示（点滅・マスク・フェードなし）
 *   - 確定ボタンなし
 *   - 60 秒経過で自動採点
 *   - 未回答 = 不正解、staircase 易方向
 *
 * Sprint 20-B-3 で導入された result phase 内蔵動作（同 screen 内に G02ResultScreen
 * を重畳）はそのまま維持。
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
import { SideBySideStimulus } from '../../../components/v11/games/SideBySideStimulus';
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
  buildG02Trial,
  computeG02StimulusLayout,
  G02GradingResult,
  G02Side,
  G02TrialSpec,
  GAME2_V11,
  gradeG02,
} from '../../../lib/v11/g02Trial';
import {
  fontSize,
  getColors,
  spacing,
} from '../../../theme/tokens';
import { G02ResultScreen } from './G02ResultScreen';
import { GamePostCompleteData } from './_shared/types';

/** G-02 1 試行終了時に親に返す結果 */
export type G02TrialResult = {
  /** 今回の閾値（直近 5 セッション平均、四捨五入 1 桁） */
  thresholdDeg: number;
  /** 採点結果（未回答時も grading は返る、unattempted フラグで判定） */
  grading: G02GradingResult;
  /** 試行のスペック */
  trial: G02TrialSpec;
  /** 親が staircase 平均と一緒に「前回比」を計算するために使う今回の使用パラメータ */
  playedParam: number;
  /** staircase 判定上の正解 */
  isCorrectForStaircase: boolean;
};

export type G02SideBySideTiltScreenProps = {
  distanceCm: ViewingDistanceCm;
  onAbort: () => void;
  /** Sprint 20-B-3：60 秒経過時に親が永続化等を行い、Promise<PostCompleteData> を返す */
  onComplete: (
    result: G02TrialResult,
  ) => Promise<GamePostCompleteData> | void;
  /** コース中断ダイアログ等で 60 秒タイマーを一時停止したいとき true。既定 false */
  paused?: boolean;
  /** Sprint 20-B-3：コースモード時 true */
  isCourseMode?: boolean;
  /** Sprint 20-B-3：コース時、次のゲーム表示用ラベル（最終なら null） */
  nextGameLabel?: string | null;
  /** Sprint 20-B-3：result phase で「次へ」が押されたとき呼ばれる（コース時） */
  onCourseAdvance?: () => void;
  /** Sprint 20-B-3：単体時、「同じゲームをもう一度」 */
  onPlayAgain?: () => void;
  /** Sprint 20-B-3：単体時、「ゲーム一覧へ戻る」 */
  onBackToList?: () => void;
  /** Sprint 20-B-3：単体時、「ホームへ」 */
  onGoHome?: () => void;
  /** テスト用：乱数注入 */
  rng?: () => number;
  /** テスト用：60 秒タイマーの代替 */
  totalDurationMsForTest?: number;
  tickMsForTest?: number;
};

type Phase = 'loading' | 'playing' | 'result';

/** 出題方向（screens.md §3.4）。試行ごとにランダム決定。 */
type AskDirection = 'cw' | 'ccw';

export const G02SideBySideTiltScreen: React.FC<G02SideBySideTiltScreenProps> = ({
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
  const totalDurationMs = totalDurationMsForTest ?? GAME2_V11.totalDurationMs;

  const [staircase, setStaircase] = React.useState<StaircaseStateV11 | null>(
    null,
  );
  const [trial, setTrial] = React.useState<G02TrialSpec | null>(null);
  const [askDirection, setAskDirection] = React.useState<AskDirection>('cw');
  const [phase, setPhase] = React.useState<Phase>('loading');
  const [selectedSide, setSelectedSide] = React.useState<G02Side | null>(null);
  const [showAbort, setShowAbort] = React.useState(false);
  // Sprint 20-B-3：result phase 表示用
  const [resultPayload, setResultPayload] =
    React.useState<G02TrialResult | null>(null);
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

  // 初回：staircase 読み込み + 試行生成（タイマーは useGameCountdown が担当）
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadStaircaseV11('G-02');
      if (cancelled) return;
      const r = rng ?? Math.random;
      const t = buildG02Trial(s.currentParam, r);
      // 出題方向：50% で ccw（採点規約は「正解側 = 時計回り側」のままで、
      // ccw 出題時は正解側を反時計回り側に読み替える。screens.md §3.4 / 5.4）。
      // ロジックを単純化するため、出題方向 'ccw' のときは
      // gradeG02 に渡す userAnswer も「時計回り側を選んだ → 正解」ではなく
      // 「反時計回り側を選んだ → 正解」になるよう、ここで採点側の正解 side を反転する。
      // ただし trial.correctSide は不変（spec／staircase ロジック不変のため）。
      // 採点時に「askDirection==='ccw' なら正解側を反転」のヘルパで吸収する。
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

  // 最新の trial / staircase / selectedSide / askDirection を onTimeUp の closure に届けるための ref
  const trialRef = React.useRef<G02TrialSpec | null>(trial);
  const staircaseRef = React.useRef<StaircaseStateV11 | null>(staircase);
  const selectedSideRef = React.useRef<G02Side | null>(selectedSide);
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

  // 60 秒到達 → 自動採点（OPT-11）。useGameCountdown が 1 度だけ呼ぶ。
  const handleTimeUp = React.useCallback(() => {
    const t = trialRef.current;
    const s = staircaseRef.current;
    if (!t || !s) return;

    // ask='cw' → 正解側 = trial.correctSide（時計回り側）
    // ask='ccw' → 正解側 = trial.correctSide の反対（反時計回り側）
    // gradeG02 は trial.correctSide に対する一致判定のため、ask='ccw' のときは
    // ユーザー回答を反転して渡すか、grading 結果を後置調整する。
    // ここでは「effectiveTrial」を作って渡す方が一貫性が高い：
    // trial.correctSide を askDirection に応じて差し替えた spec を採点する。
    const ask = askDirectionRef.current;
    const effectiveCorrectSide: G02Side =
      ask === 'cw'
        ? t.correctSide
        : t.correctSide === 'left'
          ? 'right'
          : 'left';
    const effectiveTrial: G02TrialSpec = {
      ...t,
      correctSide: effectiveCorrectSide,
    };
    const grading = gradeG02(effectiveTrial, selectedSideRef.current);
    const isCorrect = grading.isCorrect;

    // staircase 更新：正解 → 'correct'、未回答含むそれ以外 → 'incorrect'
    const next = applySessionResultV11(s, isCorrect ? 'correct' : 'incorrect');
    void saveStaircaseV11(next).catch(() => {});

    const threshold = round1(estimateThresholdV11(next));
    const payload: G02TrialResult = {
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
    // 中断ダイアログ表示中もタイマーを停止（コース時の二重ダイアログ撤去対応）
    paused: paused || showAbort,
    onTimeUp: handleTimeUp,
    tickMs: tickMsForTest,
  });

  const handleSelectFromStimulus = React.useCallback(
    (next: G02Side | null) => {
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

  // Sprint 20-B-3：result phase は同じ Screen 内に G02ResultScreen を重畳。
  if (phase === 'result' && resultPayload) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bgCanvas }}
        testID="g02-side-by-side-tilt-screen"
      >
        <G02ResultScreen
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
  const { patchSizePx, gapPx } = computeG02StimulusLayout({
    widthPx: vpW,
    heightPx: vpH,
  });

  const directionWord = askDirection === 'cw' ? '時計回り' : '反時計回り';
  // v1.1.4：「+ を注視するゲームには注視を促すテキスト」（ユーザー要望）
  const guidanceText = `中央の + を見ながら、より${directionWord}に傾いているパッチを選んでください`;
  const groupAriaLabel = `より${directionWord}に傾いているパッチを選んでください`;
  const leftAriaLabel = `左の縞模様（タップで「左がより${directionWord}」と回答）`;
  const rightAriaLabel = `右の縞模様（タップで「右がより${directionWord}」と回答）`;

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
      testID="g02-side-by-side-tilt-screen"
    >
      <GamePlaySurface
        gameNameJa="G-02 左右並び傾き判別"
        remainingSeconds={remainingMs / 1000}
        onAbort={requestAbort}
        ariaInstruction={`左右に並んだ 2 つの縞模様のうち、より${directionWord}に傾いているパッチをタップしてください。気が変われば何度でも変更可。確定ボタンはありません。60 秒経過で自動採点します。`}
        guidanceText={guidanceText}
        guidanceLiveRegion
        stimulusInteractive
        stimulusArea={
          <SideBySideStimulus
            left={trial.left}
            right={trial.right}
            patchSizePx={patchSizePx}
            gapPx={gapPx}
            viewingDistanceCm={distanceCm}
            dpi={dpi}
            selectedSide={selectedSide}
            onSelectSide={handleSelectFromStimulus}
            disabled={phase !== 'playing'}
            leftAriaLabel={leftAriaLabel}
            rightAriaLabel={rightAriaLabel}
            groupAriaLabel={groupAriaLabel}
            testId="g02-stimulus"
          />
        }
        // Sprint 20-C：horizontal-2 撤去。answerChoices は空（パッチ自体が選択肢）。
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

function round1(v: number): number {
  return Math.round(v * 10) / 10;
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
