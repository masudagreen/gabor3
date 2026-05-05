/**
 * G11VernierAlignmentScreen — G-11 Vernier 整列判定（spec-v11.md §7.11、screens.md S21-G11-PLAY）。
 *
 * v1.1.2 Sprint 21 直接選択化（screens.md §9）：
 *   - horizontal-2 テキスト 2 択ボタン（旧 AnswerChoiceGroup）を**完全撤去**
 *   - 構造変更：上 reference（disabled）+ 下に左右 2 テストパッチ（ImageChoiceCell × 2）
 *   - 下 2 パッチのうち一方は reference と整列（offset=0、= 正解側）、
 *     もう一方は staircase 値分横ズレ
 *   - guidance：「下のパッチのうち上と整列しているものを選んでください」（18pt 以上）
 *   - data-target-id：`g11-test-left` / `g11-test-right`（resultMarks.ts と整合）
 *   - reference は disabled + dimOnDisabled=false で視覚維持
 *
 * v1.1 OPT-12 統一フォーマット：
 *   - 1 試行 = 60 秒固定（早期終了不可）
 *   - 60 秒間ずっと表示（マスクなし、点滅なし、フェードなし）
 *   - 再タップで解除、別を押すと切替（複数選択不可、radio 規約）
 *   - 確定ボタンなし
 *   - 60 秒経過で自動採点
 *   - 未回答 = 不正解、staircase 易方向（ズレ量を増やす方向 = max=5 方向）
 *
 * staircase 値・採点ロジック・閾値計算は不変（paramOffsetArcmin の magnitude が difficulty）。
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
import {
  G11VernierStimulus,
  G11SelectableSide,
} from '../../../components/v11/games/G11VernierStimulus';
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
  arcminToVisiblePx,
  buildG11Trial,
  computeG11StimulusLayout,
  G11GradingResult,
  G11TrialSpec,
  GAME11_V11,
  gradeG11BySide,
} from '../../../lib/v11/g11Trial';
import {
  fontSize,
  getColors,
  spacing,
} from '../../../theme/tokens';
import { G11ResultScreen } from './G11ResultScreen';
import { GamePostCompleteData } from './_shared/types';

/** G-11 1 試行終了時に親に返す結果 */
export type G11TrialResult = {
  /** 今回の閾値（直近 5 セッション平均、ズレ量 arcmin、小数 1 桁） */
  thresholdArcmin: number;
  /** 採点結果 */
  grading: G11GradingResult;
  /** 試行のスペック */
  trial: G11TrialSpec;
  /** 親が staircase 平均と一緒に「前回比」を計算するために使う今回の使用パラメータ */
  playedParam: number;
  /** staircase 判定上の正解 */
  isCorrectForStaircase: boolean;
};

export type G11VernierAlignmentScreenProps = {
  distanceCm: ViewingDistanceCm;
  onAbort: () => void;
  /** Sprint 20-B-3：60 秒経過時に親が永続化等を行い、Promise<PostCompleteData> を返す */
  onComplete: (
    result: G11TrialResult,
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

export const G11VernierAlignmentScreen: React.FC<
  G11VernierAlignmentScreenProps
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
  const totalDurationMs = totalDurationMsForTest ?? GAME11_V11.totalDurationMs;

  const [staircase, setStaircase] = React.useState<StaircaseStateV11 | null>(
    null,
  );
  const [trial, setTrial] = React.useState<G11TrialSpec | null>(null);
  const [phase, setPhase] = React.useState<Phase>('loading');
  const [selectedSide, setSelectedSide] =
    React.useState<G11SelectableSide | null>(null);
  const [showAbort, setShowAbort] = React.useState(false);
  const [resultPayload, setResultPayload] =
    React.useState<G11TrialResult | null>(null);
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
      const s = await loadStaircaseV11('G-11');
      if (cancelled) return;
      const t = buildG11Trial(s.currentParam, rng);
      setStaircase(s);
      setTrial(t);
      setPhase('playing');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 最新の trial / staircase / selectedSide を onTimeUp の closure に届ける ref
  const trialRef = React.useRef<G11TrialSpec | null>(trial);
  const staircaseRef = React.useRef<StaircaseStateV11 | null>(staircase);
  const selectedSideRef =
    React.useRef<G11SelectableSide | null>(selectedSide);
  React.useEffect(() => {
    trialRef.current = trial;
  }, [trial]);
  React.useEffect(() => {
    staircaseRef.current = staircase;
  }, [staircase]);
  React.useEffect(() => {
    selectedSideRef.current = selectedSide;
  }, [selectedSide]);

  // 60 秒到達 → 自動採点（OPT-11）。useGameCountdown が 1 度だけ呼ぶ。
  const handleTimeUp = React.useCallback(() => {
    const t = trialRef.current;
    const s = staircaseRef.current;
    if (!t || !s) return;

    const grading = gradeG11BySide(t, selectedSideRef.current);
    const isCorrect = grading.isCorrect;

    const next = applySessionResultV11(s, isCorrect ? 'correct' : 'incorrect');
    void saveStaircaseV11(next).catch(() => {});

    const threshold = round1(estimateThresholdV11(next));
    const payload: G11TrialResult = {
      thresholdArcmin: threshold,
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
    (next: G11SelectableSide | null) => {
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

  // Sprint 20-B-3：result phase は同じ Screen 内に G11ResultScreen を重畳。
  if (phase === 'result' && resultPayload) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bgCanvas }}
        testID="g11-vernier-alignment-screen"
      >
        <G11ResultScreen
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
  const layout = computeG11StimulusLayout({ widthPx: vpW, heightPx: vpH });
  // 「ズレている側」のパッチに適用する水平 px オフセット。
  // correctDirection（rng で決定）が 'right' なら正、'left' なら負の符号を付ける。
  const offsetMagnitudePx = arcminToVisiblePx({
    arcminVal: trial.paramOffsetArcmin,
    distanceCm,
    dpi,
    minVisiblePx: 1,
  });
  const shiftedSideOffsetPx =
    trial.correctDirection === 'left' ? -offsetMagnitudePx : offsetMagnitudePx;

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
      testID="g11-vernier-alignment-screen"
    >
      <GamePlaySurface
        gameNameJa="G-11 Vernier 整列判定"
        remainingSeconds={remainingMs / 1000}
        onAbort={requestAbort}
        ariaInstruction="上に基準パッチ、下に左右 2 つのテストパッチが並びます。下のテストパッチのうち上の基準と整列している（横ズレしていない）方を直接タップしてください。とても微小なズレなのでじっと見ると判別精度が上がります。気が変われば何度でも変更可。確定ボタンはありません。60 秒経過で自動採点します。"
        guidanceText="下のパッチのうち上と整列しているものを選んでください"
        stimulusInteractive
        stimulusArea={
          <G11VernierStimulus
            upper={trial.upper}
            lowerLeft={trial.lowerLeft}
            lowerRight={trial.lowerRight}
            patchSizePx={layout.patchSizePx}
            gapPx={layout.gapPx}
            shiftedSideOffsetPx={shiftedSideOffsetPx}
            correctSide={trial.correctSide}
            viewingDistanceCm={distanceCm}
            dpi={dpi}
            selectedSide={selectedSide}
            onSelectSide={handleSelectFromStimulus}
            disabled={phase !== 'playing'}
            leftDataTargetId="g11-test-left"
            rightDataTargetId="g11-test-right"
            testId="g11-stimulus"
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

/** ズレ量は小数 1 桁に丸める（gameRegistry.step=0.2 と整合） */
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
