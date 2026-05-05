/**
 * G09ResultScreen — S15-06（screens.md §3）。
 *
 * G-09 1 試行終了直後に表示する結果サマリ画面。`ResultSummaryV11` をラップし、
 * G-09 固有の「正解は『中央は縦寄り / 横寄り』」「あなたの回答…」を組み立てる。
 *
 * G-09 の閾値は **target コントラスト + flanker 距離の合成**（spec §7.9）。
 * MetricCard の主要値には合成ラベル「c=0.10\nd=3.0λ」を渡す。
 *
 * 単体プレイ時：`SinglePlayPostFooter`（3 ボタン）
 * コース時：「次へ」Primary + 自動進行カウントダウン
 *
 * `LateralMaskingStimulus` を `extraStimulus` に埋め込み、
 * `highlightOrientation=correctOrientation` で「正解 target を 1.5 秒拡大ハイライト」。
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
} from '../../../theme/tokens';
import { ResultOverlay } from '../../../components/v11/ResultOverlay';
import { BadgeIdV11 } from '../../../lib/v11/badgeDefinitions';
import { LateralMaskingStimulus } from '../../../components/v11/games/LateralMaskingStimulus';
import {
  buildG09CorrectAnswerLabel,
  buildG09UserAnswerLabel,
  buildG09ResultDetailText,
} from '../../../lib/v11/g09Result';
import { buildG09Marks } from '../../../lib/v11/resultMarks';
import {
  computeG09SpacingPx,
  computeG09StimulusLayout,
} from '../../../lib/v11/g09Trial';
import {
  DEFAULT_DPI,
  estimateDeviceType,
} from '../../../lib/calibration';
import { G09TrialResult } from './G09LateralMaskingScreen';

export type G09ResultScreenProps = {
  result: G09TrialResult;
  /** 過去のベスト閾値（今日を除く）。null なら「初回測定」 */
  previousBestThreshold: number | null;
  isCourseMode: boolean;
  /** コース時：次のゲーム表示用ラベル（最終ゲームなら null）。 */
  nextGameLabel?: string | null;
  /** コース時 */
  onNext?: () => void;
  /** 単体時 */
  /** Sprint 22：プレイ時と同じ × ボタン動線。play / result 共通の requestAbort */
  onAbort?: () => void;
  onPlayAgain?: () => void;
  onBackToList?: () => void;
  onGoHome?: () => void;
  /** Sprint 19 / F-13：今回新たに獲得したバッジ ID 配列。S19-07 演出 */
  newlyAwardedBadges?: ReadonlyArray<BadgeIdV11>;
  /** テスト用：固定の patch / gap を渡したい場合 */
  layoutOverrideForTest?: { patchSizePx: number; gapPx: number };
};

export const G09ResultScreen: React.FC<G09ResultScreenProps> = ({
  result,
  isCourseMode,
  nextGameLabel,
  onNext,
  onAbort,
  onPlayAgain,
  onBackToList,
  onGoHome,
  newlyAwardedBadges,
  layoutOverrideForTest,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  const correctAnswerLabel = buildG09CorrectAnswerLabel(
    result.grading.correctOrientation,
  );
  const userAnswerLabel = buildG09UserAnswerLabel(result.grading.userAnswer);
  const detailText = buildG09ResultDetailText(result.grading);
  const marks = buildG09Marks({
    correctOrientation: result.grading.correctOrientation,
    userAnswer: result.grading.userAnswer,
  });

  // Sprint 22：プレイ時と同じ layout を共有して result でも同サイズ・同位置で描画。
  const layout =
    layoutOverrideForTest ??
    computeResultStimulusLayout(result.trial.derivedSpacingLambdaMultiplier);
  const dpi = React.useMemo(() => deviceDpi(), []);

  const extraStimulus = (
    <View style={styles.stimulusWrap} testID="g09-result-stimulus">
      <LateralMaskingStimulus
        flankerLeft={result.trial.flankerLeft}
        target={result.trial.target}
        flankerRight={result.trial.flankerRight}
        patchSizePx={layout.patchSizePx}
        gapPx={layout.gapPx}
        viewingDistanceCm={40}
        dpi={dpi}
        selectedOrientation={null}
        highlightOrientation={result.grading.correctOrientation}
        // Sprint 20 ラウンド 3：中央 target に正解向き対応の data-target-id を付与
        dataTargetId={`g09-${result.grading.correctOrientation}`}
        testId="g09-result-stimulus-inner"
      />
      {detailText.length > 0 ? (
        <View style={styles.detailRow} testID="g09-result-detail">
          <Text style={[styles.detailText, { color: colors.fgSecondary }]}>
            {detailText}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ResultOverlay
      gameId="G-09"
      gameNameJa="G-09 側方マスキング"
      marks={marks}
      correctAnswerLabel={correctAnswerLabel}
      userAnswerLabel={userAnswerLabel}
      isCorrect={result.isCorrectForStaircase}
      mode={isCourseMode ? 'course' : 'single'}
      nextGameLabel={nextGameLabel}
      extraStimulus={extraStimulus}
      onAdvance={isCourseMode ? (onNext ?? (() => {})) : (onBackToList ?? (() => {}))}
      onAbort={onAbort}
      onPlayAgain={onPlayAgain}
      onBackToList={onBackToList}
      onGoHome={onGoHome}
      newlyAwardedBadges={newlyAwardedBadges}
      testId="g09-result-screen"
    />
  );
};

function deviceDpi(): number {
  return DEFAULT_DPI[estimateDeviceType(Platform.OS)];
}

/** Sprint 22：プレイ時と同じ layout / spacing を再計算して result でも同サイズ・同位置で描画。 */
function computeResultStimulusLayout(
  spacingLambdaMultiplier?: number,
): { patchSizePx: number; gapPx: number } {
  const { width } = Dimensions.get('window');
  const layout = computeG09StimulusLayout(width);
  if (spacingLambdaMultiplier == null) {
    // テスト互換 / フォールバック：trial が無い場合は patch * 1.0 ≒ 標準 gap
    return { patchSizePx: layout.patchSizePx, gapPx: Math.round(layout.patchSizePx * 0.6) };
  }
  const { gapPx } = computeG09SpacingPx({
    spacingLambdaMultiplier,
    patchDiameterPx: layout.patchDiameterPx,
    viewportWidthPx: width,
  });
  return { patchSizePx: layout.patchSizePx, gapPx };
}

const styles = StyleSheet.create({
  stimulusWrap: {
    alignItems: 'center',
    width: '100%',
  },
  detailRow: {
    alignItems: 'center',
    marginTop: spacing.s2,
  },
  detailText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium as '600',
  },
});
