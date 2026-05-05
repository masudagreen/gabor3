/**
 * G03PeripheralHuntScreen — G-03 周辺視野ハント（spec-v11.md §7.3、screens.md S21-G03-PLAY）。
 *
 * v1.1.2 Sprint 21 直接選択化（screens.md §3）：
 *   - clock-8 テキスト 8 択ボタン（旧 AnswerChoiceGroup）を**完全撤去**
 *   - 円周 8 ガボールパッチを ImageChoiceCell × 8 でラップして直接タップ回答
 *   - guidance 文言：「違う向きのパッチを選んでください」（18pt 以上）
 *   - 中央固視点（+）はタップ不可（aria-hidden、装飾）
 *   - data-target-id：`g03-pos-{12|1.5|3|4.5|6|7.5|9|10.5}`（resultMarks.ts と整合）
 *
 * v1.1 OPT-12 統一フォーマット：
 *   - 1 試行 = 60 秒固定（早期終了不可）
 *   - 60 秒間ずっと中央固視点 + 円周 8 ガボール同時提示（点滅・マスク・フェードなし）
 *   - 8 ガボールのうち 1 個（odd one）が他と異なる向き
 *   - 再タップで解除、別を押すと切替（複数選択不可、radio 規約）
 *   - 確定ボタンなし
 *   - 60 秒経過で自動採点
 *   - 未回答 = 不正解、staircase 易方向
 *
 * staircase は「向き差」のみ。離心角は 8° 固定。staircase 値・採点ロジックは不変。
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
import { RadialEightStimulus } from '../../../components/v11/games/RadialEightStimulus';
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
  buildG03Trial,
  computeG03StimulusLayout,
  GAME3_V11,
  G03ClockPosition,
  G03GradingResult,
  G03TrialSpec,
  gradeG03,
} from '../../../lib/v11/g03Trial';
import {
  fontSize,
  getColors,
  spacing,
} from '../../../theme/tokens';
import { G03ResultScreen } from './G03ResultScreen';
import { GamePostCompleteData } from './_shared/types';

/** G-03 1 試行終了時に親に返す結果 */
export type G03TrialResult = {
  /** 今回の閾値（直近 5 セッション平均、四捨五入 1 桁） */
  thresholdDeg: number;
  /** 採点結果（未回答時も grading は返る、unattempted フラグで判定） */
  grading: G03GradingResult;
  /** 試行のスペック */
  trial: G03TrialSpec;
  /** 親が staircase 平均と一緒に「前回比」を計算するために使う今回の使用パラメータ */
  playedParam: number;
  /** staircase 判定上の正解 */
  isCorrectForStaircase: boolean;
};

export type G03PeripheralHuntScreenProps = {
  distanceCm: ViewingDistanceCm;
  onAbort: () => void;
  /** Sprint 20-B-3：60 秒経過時に親が永続化等を行い、Promise<PostCompleteData> を返す */
  onComplete: (
    result: G03TrialResult,
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

export const G03PeripheralHuntScreen: React.FC<G03PeripheralHuntScreenProps> = ({
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
  const totalDurationMs = totalDurationMsForTest ?? GAME3_V11.totalDurationMs;

  const [staircase, setStaircase] = React.useState<StaircaseStateV11 | null>(
    null,
  );
  const [trial, setTrial] = React.useState<G03TrialSpec | null>(null);
  const [phase, setPhase] = React.useState<Phase>('loading');
  const [selectedClockPosition, setSelectedClockPosition] =
    React.useState<G03ClockPosition | null>(null);
  const [showAbort, setShowAbort] = React.useState(false);
  const [resultPayload, setResultPayload] =
    React.useState<G03TrialResult | null>(null);
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
      const s = await loadStaircaseV11('G-03');
      if (cancelled) return;
      const t = buildG03Trial(s.currentParam, rng);
      setStaircase(s);
      setTrial(t);
      setPhase('playing');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 最新の trial / staircase / selectedClockPosition を onTimeUp の closure に届ける ref
  const trialRef = React.useRef<G03TrialSpec | null>(trial);
  const staircaseRef = React.useRef<StaircaseStateV11 | null>(staircase);
  const selectedClockPositionRef =
    React.useRef<G03ClockPosition | null>(selectedClockPosition);
  React.useEffect(() => {
    trialRef.current = trial;
  }, [trial]);
  React.useEffect(() => {
    staircaseRef.current = staircase;
  }, [staircase]);
  React.useEffect(() => {
    selectedClockPositionRef.current = selectedClockPosition;
  }, [selectedClockPosition]);

  // 60 秒到達 → 自動採点（OPT-11）。useGameCountdown が 1 度だけ呼ぶ。
  const handleTimeUp = React.useCallback(() => {
    const t = trialRef.current;
    const s = staircaseRef.current;
    if (!t || !s) return;

    const grading = gradeG03(t, selectedClockPositionRef.current);
    const isCorrect = grading.isCorrect;

    // staircase 更新：正解 → 'correct'、未回答含むそれ以外 → 'incorrect'
    const next = applySessionResultV11(s, isCorrect ? 'correct' : 'incorrect');
    void saveStaircaseV11(next).catch(() => {});

    const threshold = round1(estimateThresholdV11(next));
    const payload: G03TrialResult = {
      thresholdDeg: threshold,
      grading,
      trial: t,
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
    (next: G03ClockPosition | null) => {
      if (phase !== 'playing') return;
      setSelectedClockPosition(next);
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

  // Sprint 20-B-3：result phase は同じ Screen 内に G03ResultScreen を重畳。
  if (phase === 'result' && resultPayload) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bgCanvas }}
        testID="g03-peripheral-hunt-screen"
      >
        <G03ResultScreen
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
  const { framePx, patchSizePx } = computeG03StimulusLayout({
    widthPx: vpW,
    heightPx: vpH,
  });

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
      testID="g03-peripheral-hunt-screen"
    >
      <GamePlaySurface
        gameNameJa="G-03 周辺視野ハント"
        remainingSeconds={remainingMs / 1000}
        onAbort={requestAbort}
        ariaInstruction="中央の十字を見ながら、円周上に並んだ 8 個の縞模様の中から違う向きのパッチを直接タップしてください。気が変われば何度でも変更可。確定ボタンはありません。60 秒経過で自動採点します。"
        guidanceText="中央の + を見ながら、違う向きのパッチを選んでください"
        stimulusInteractive
        stimulusArea={
          <RadialEightStimulus
            patches={trial.patches}
            framePx={framePx}
            patchSizePx={patchSizePx}
            eccentricityDeg={trial.eccentricityDeg}
            viewingDistanceCm={distanceCm}
            dpi={dpi}
            selectedClockPosition={selectedClockPosition}
            onSelectClockPosition={handleSelectFromStimulus}
            disabled={phase !== 'playing'}
            dataTargetIdPrefix="g03-pos"
            testId="g03-stimulus"
          />
        }
        answerChoices={null}
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
