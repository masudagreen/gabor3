/**
 * G12CrowdingScreen — G-12 クラウディング（spec-v11.md §7.12、screens.md S17-02）。
 *
 * v1.1 OPT-12 統一フォーマット：
 *   - 1 試行 = 60 秒固定（早期終了不可）
 *   - 60 秒間ずっと中央 target + 周囲 6 flanker 同時提示（マスクなし、点滅なし、フェードなし）
 *   - 「垂直 / 水平 / 斜め右 / 斜め左」ボタン（horizontal-4）で回答
 *   - 再タップで解除、別を押すと切替（複数選択不可、radio 規約）
 *   - 確定ボタンなし
 *   - 60 秒経過で自動採点
 *   - 未回答 = 不正解、staircase 易方向（spacing 増 = max=4 方向）
 *
 * staircase 値は **target-flanker spacing 倍率**（gameRegistry G-12 entry:
 * min 1.2 / max 4 / initial 2 / step 0.2）。
 *
 * 構造は G09LateralMaskingScreen / G11VernierAlignmentScreen の流用。違いは：
 *   - 注視領域が CrowdingStimulus（GE-12）
 *   - staircase 値が「spacing 倍率」（小数 1 桁）
 *   - 描画時に viewport 幅で spacing をクランプ（`computeG12FlankerSpacingPx`）
 *   - 選択肢が「垂直 / 水平 / 斜め右 / 斜め左」の 4 択（horizontal-4）
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
import { CrowdingStimulus } from '../../../components/v11/games/CrowdingStimulus';
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
  buildG12Trial,
  computeG12FlankerSpacingPx,
  computeG12StimulusLayout,
  G12_ALL_ORIENTATIONS,
  G12GradingResult,
  G12Orientation,
  G12TrialSpec,
  GAME12_V11,
  gradeG12,
} from '../../../lib/v11/g12Trial';
import {
  fontSize,
  getColors,
  spacing,
} from '../../../theme/tokens';
import { G12ResultScreen } from './G12ResultScreen';
import { GamePostCompleteData } from './_shared/types';

/** G-12 1 試行終了時に親に返す結果 */
export type G12TrialResult = {
  /** 今回の閾値（直近 5 セッション平均、spacing 倍率、小数 1 桁） */
  thresholdSpacing: number;
  /** 採点結果 */
  grading: G12GradingResult;
  /** 試行のスペック */
  trial: G12TrialSpec;
  /** 親が staircase 平均と一緒に「前回比」を計算するために使う今回の使用パラメータ */
  playedParam: number;
  /** staircase 判定上の正解 */
  isCorrectForStaircase: boolean;
};

export type G12CrowdingScreenProps = {
  distanceCm: ViewingDistanceCm;
  onAbort: () => void;
  /** Sprint 20-B-3：60 秒経過時に親が永続化等を行い、Promise<PostCompleteData> を返す */
  onComplete: (
    result: G12TrialResult,
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

const ORIENTATION_CHOICES: ReadonlyArray<{
  id: G12Orientation;
  label: string;
}> = [
  { id: 'vertical', label: '垂直' },
  { id: 'horizontal', label: '水平' },
  { id: 'diagonalRight', label: '斜め右' },
  { id: 'diagonalLeft', label: '斜め左' },
];

export const G12CrowdingScreen: React.FC<G12CrowdingScreenProps> = ({
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
  const totalDurationMs = totalDurationMsForTest ?? GAME12_V11.totalDurationMs;

  const [staircase, setStaircase] = React.useState<StaircaseStateV11 | null>(
    null,
  );
  const [trial, setTrial] = React.useState<G12TrialSpec | null>(null);
  const [phase, setPhase] = React.useState<Phase>('loading');
  const [selectedOrientation, setSelectedOrientation] =
    React.useState<G12Orientation | null>(null);
  const [showAbort, setShowAbort] = React.useState(false);
  const [resultPayload, setResultPayload] =
    React.useState<G12TrialResult | null>(null);
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
      const s = await loadStaircaseV11('G-12');
      if (cancelled) return;
      const t = buildG12Trial(s.currentParam, rng);
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
  const trialRef = React.useRef<G12TrialSpec | null>(trial);
  const staircaseRef = React.useRef<StaircaseStateV11 | null>(staircase);
  const selectedOrientationRef =
    React.useRef<G12Orientation | null>(selectedOrientation);
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

    const grading = gradeG12(t, selectedOrientationRef.current);
    const isCorrect = grading.isCorrect;

    const next = applySessionResultV11(s, isCorrect ? 'correct' : 'incorrect');
    void saveStaircaseV11(next).catch(() => {});

    const threshold = round1(estimateThresholdV11(next));
    const payload: G12TrialResult = {
      thresholdSpacing: threshold,
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
      } else if (
        (G12_ALL_ORIENTATIONS as ReadonlyArray<string>).includes(id)
      ) {
        setSelectedOrientation(id as G12Orientation);
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

  // Sprint 20-B-3：result phase は同じ Screen 内に G12ResultScreen を重畳。
  if (phase === 'result' && resultPayload) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bgCanvas }}
        testID="g12-crowding-screen"
      >
        <G12ResultScreen
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
  const layout = computeG12StimulusLayout(vpW);
  const availableSize = Math.max(160, vpW - 32);
  const spacingResult = computeG12FlankerSpacingPx({
    spacingMultiplier: trial.paramSpacingMultiplier,
    targetDiameterPx: layout.targetDiameterPx,
    availableSizePx: availableSize,
  });
  // 画面に収まるよう clampedMultiplier を flankerPlacements に反映
  const clampedPlacements = trial.flankerPlacements.map((p) => ({
    angleRad: p.angleRad,
    distanceMultiplier: spacingResult.clampedMultiplier,
  }));
  const containerSizePx = Math.max(
    layout.targetDiameterPx + 16,
    spacingResult.boundingSizePx + 16,
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
      testID="g12-crowding-screen"
    >
      <GamePlaySurface
        gameNameJa="G-12 クラウディング"
        remainingSeconds={remainingMs / 1000}
        onAbort={requestAbort}
        ariaInstruction="中央の縞模様パッチがどの向きを向いているかを「垂直 / 水平 / 斜め右 / 斜め左」から選んでください。周囲の 6 個の縞模様は妨害刺激で、中央の見え方を「のませ」てきます。じーっと見続けると向きが浮かび上がります。気が変われば何度でも変更可。確定ボタンはありません。60 秒経過で自動採点します。"
        guidanceText="中央のパッチの向きは？"
        stimulusArea={
          <CrowdingStimulus
            target={trial.target}
            flankers={trial.flankers}
            flankerPlacements={clampedPlacements}
            patchSizePx={layout.patchSizePx}
            containerSizePx={containerSizePx}
            viewingDistanceCm={distanceCm}
            dpi={dpi}
            selectedOrientation={selectedOrientation}
            testId="g12-stimulus"
          />
        }
        answerChoices={
          <AnswerChoiceGroup
            choices={ORIENTATION_CHOICES.map((c) => ({
              id: c.id,
              label: c.label,
            }))}
            variant="text"
            selectedId={selectedOrientation}
            onSelect={handleSelectFromGroup}
            layout="horizontal-4"
            ariaLabelGroup="中央のパッチの向き：垂直 / 水平 / 斜め右 / 斜め左"
            disabled={phase !== 'playing'}
            // Sprint 20 ラウンド 3：buildG12Marks の出す `g12-${orientation}` と
            // choice.id (vertical/horizontal/diagonalRight/diagonalLeft) を直接一致
            dataTargetIdPrefix="g12"
            testId="g12-answer-choice"
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

/** spacing 倍率は小数 1 桁に丸める（gameRegistry.step=0.2 と整合） */
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
