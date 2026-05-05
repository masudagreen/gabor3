/**
 * G09LateralMaskingScreen — G-09 側方マスキング（spec-v11.md §7.9、screens.md S15-05）。
 *
 * v1.1 OPT-12 統一フォーマット：
 *   - 1 試行 = 60 秒固定（早期終了不可）
 *   - 60 秒間ずっと「flanker | target | flanker」の 3 ガボール横一列同時提示
 *   - 「縦寄り」/「横寄り」ボタン（horizontal-2）で回答
 *   - 再タップで解除、別を押すと切替（複数選択不可、radio 規約）
 *   - 確定ボタンなし
 *   - 60 秒経過で自動採点
 *   - 未回答 = 不正解、staircase 易方向（contrast を増やす方向 = max 方向、距離も連動増）
 *
 * staircase 値は **target コントラスト**（gameRegistry G-09 entry: min 0.05 / max 0.20 /
 * initial 0.10 / step 0.01）。flanker spacing は `derivePolatSpacingFromContrast` で派生。
 *
 * 構造は G06WindowSizeScreen の流用。違いは：
 *   - 注視領域が LateralMaskingStimulus（GE-09）
 *   - staircase 値が「target コントラスト」（小数 2 桁）
 *   - ガイド文「中央のパッチはどっち寄り？」
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
import { LateralMaskingStimulus } from '../../../components/v11/games/LateralMaskingStimulus';
import { AnswerChoiceGroup } from '../../../components/v11/AnswerChoiceGroup';
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
  buildG09Trial,
  computeG09SpacingPx,
  computeG09StimulusLayout,
  G09GradingResult,
  G09Orientation,
  G09TrialSpec,
  GAME9_V11,
  gradeG09,
} from '../../../lib/v11/g09Trial';
import {
  fontSize,
  getColors,
  spacing,
} from '../../../theme/tokens';
import { G09ResultScreen } from './G09ResultScreen';
import { GamePostCompleteData } from './_shared/types';

/** G-09 1 試行終了時に親に返す結果 */
export type G09TrialResult = {
  /** 今回の閾値（直近 5 セッション平均、target コントラスト、小数 2 桁） */
  thresholdContrast: number;
  /** 採点結果（未回答時も grading は返る、unattempted フラグで判定） */
  grading: G09GradingResult;
  /** 試行のスペック */
  trial: G09TrialSpec;
  /** 親が staircase 平均と一緒に「前回比」を計算するために使う今回の使用パラメータ */
  playedParam: number;
  /** staircase 判定上の正解 */
  isCorrectForStaircase: boolean;
};

export type G09LateralMaskingScreenProps = {
  distanceCm: ViewingDistanceCm;
  onAbort: () => void;
  /** Sprint 20-B-3：60 秒経過時に親が永続化等を行い、Promise<PostCompleteData> を返す */
  onComplete: (
    result: G09TrialResult,
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

export const G09LateralMaskingScreen: React.FC<
  G09LateralMaskingScreenProps
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
  const totalDurationMs = totalDurationMsForTest ?? GAME9_V11.totalDurationMs;

  const [staircase, setStaircase] = React.useState<StaircaseStateV11 | null>(
    null,
  );
  const [trial, setTrial] = React.useState<G09TrialSpec | null>(null);
  const [phase, setPhase] = React.useState<Phase>('loading');
  const [selectedOrientation, setSelectedOrientation] =
    React.useState<G09Orientation | null>(null);
  const [showAbort, setShowAbort] = React.useState(false);
  const [resultPayload, setResultPayload] =
    React.useState<G09TrialResult | null>(null);
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
      const s = await loadStaircaseV11('G-09');
      if (cancelled) return;
      const t = buildG09Trial(s.currentParam, rng);
      setStaircase(s);
      setTrial(t);
      setPhase('playing');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 最新の trial / staircase / selectedOrientation を onTimeUp の closure に届ける ref
  const trialRef = React.useRef<G09TrialSpec | null>(trial);
  const staircaseRef = React.useRef<StaircaseStateV11 | null>(staircase);
  const selectedOrientationRef =
    React.useRef<G09Orientation | null>(selectedOrientation);
  React.useEffect(() => {
    trialRef.current = trial;
  }, [trial]);
  React.useEffect(() => {
    staircaseRef.current = staircase;
  }, [staircase]);
  React.useEffect(() => {
    selectedOrientationRef.current = selectedOrientation;
  }, [selectedOrientation]);

  // 60 秒到達 → 自動採点（OPT-11）。useGameCountdown が 1 度だけ呼ぶ。
  const handleTimeUp = React.useCallback(() => {
    const t = trialRef.current;
    const s = staircaseRef.current;
    if (!t || !s) return;

    const grading = gradeG09(t, selectedOrientationRef.current);
    const isCorrect = grading.isCorrect;

    const next = applySessionResultV11(s, isCorrect ? 'correct' : 'incorrect');
    void saveStaircaseV11(next).catch(() => {});

    const threshold = round2(estimateThresholdV11(next));
    const payload: G09TrialResult = {
      thresholdContrast: threshold,
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

  const handleSelectFromGroup = React.useCallback(
    (id: string | null) => {
      if (phase !== 'playing') return;
      if (id === null) {
        setSelectedOrientation(null);
      } else if (id === 'vertical' || id === 'horizontal') {
        setSelectedOrientation(id);
      }
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

  // Sprint 20-B-3：result phase は同じ Screen 内に G09ResultScreen を重畳。
  if (phase === 'result' && resultPayload) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bgCanvas }}
        testID="g09-lateral-masking-screen"
      >
        <G09ResultScreen
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

  const { width: vpW } = Dimensions.get('window');
  const layout = computeG09StimulusLayout(vpW);
  const { gapPx } = computeG09SpacingPx({
    spacingLambdaMultiplier: trial.derivedSpacingLambdaMultiplier,
    patchDiameterPx: layout.patchDiameterPx,
    viewportWidthPx: vpW,
  });

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
      testID="g09-lateral-masking-screen"
    >
      <GamePlaySurface
        gameNameJa="G-09 側方マスキング"
        remainingSeconds={remainingMs / 1000}
        onAbort={requestAbort}
        ariaInstruction="中央の薄い縞模様が「縦縞（｜｜｜）」か「横縞（＝＝＝）」のどちらかを選んでください。両側のパッチは妨害刺激で、中央の見え方を促進したり抑制したりします。気が変われば何度でも変更可。確定ボタンはありません。60 秒経過で自動採点します。"
        guidanceText="中央のパッチは縦縞？横縞？"
        stimulusArea={
          <LateralMaskingStimulus
            flankerLeft={trial.flankerLeft}
            target={trial.target}
            flankerRight={trial.flankerRight}
            patchSizePx={layout.patchSizePx}
            gapPx={gapPx}
            viewingDistanceCm={distanceCm}
            dpi={dpi}
            selectedOrientation={selectedOrientation}
            // Sprint 20 ラウンド 3：中央 target に正解向き対応の data-target-id を付与。
            // `buildG09Marks` の出す `g09-${correctOrientation}` と一致させ、
            // ResultOverlay が target 中央に ◯ を重畳できるようにする。
            dataTargetId={`g09-${trial.correctOrientation}`}
            testId="g09-stimulus"
          />
        }
        answerChoices={
          <AnswerChoiceGroup
            choices={[
              { id: 'vertical', label: '縦縞 ｜｜｜' },
              { id: 'horizontal', label: '横縞 ＝＝＝' },
            ]}
            variant="text"
            selectedId={selectedOrientation}
            onSelect={handleSelectFromGroup}
            layout="horizontal-2"
            ariaLabelGroup="中央のパッチが縦縞か横縞か"
            disabled={phase !== 'playing'}
            // Sprint 20 ラウンド 3：誤回答ボタン側にも target id を付け、
            // wrongChosen mark が ✕ をボタン中央に重畳できるようにする
            dataTargetIdPrefix="g09"
            testId="g09-answer-choice"
          />
        }
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

/** target コントラストは小数 2 桁（gameRegistry.step=0.01 と整合） */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
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
