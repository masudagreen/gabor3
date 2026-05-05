/**
 * G12ResultScreen — S17-03（screens.md §2）。
 *
 * G-12 1 試行終了直後に表示する結果サマリ画面。`ResultSummaryV11` をラップし、
 * G-12 固有の「正解は『斜め右』」「あなたの回答…」を組み立てる。
 *
 * 単体プレイ時：`SinglePlayPostFooter`（3 ボタン）
 * コース時：「次へ」Primary + 自動進行カウントダウン
 *
 * `CrowdingStimulus` を `extraStimulus` に埋め込み、
 * `highlightOrientation=correctOrientation` で「中央 target を 1.5 秒拡大ハイライト」。
 *
 * 閾値表示は小数 1 桁 + × 単位（例：2.0×）、unit「spacing(target直径倍)」。
 */

import React from 'react';
import {
  Dimensions,
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
import { AnswerChoiceGroup } from '../../../components/v11/AnswerChoiceGroup';
import { CrowdingStimulus } from '../../../components/v11/games/CrowdingStimulus';
import {
  buildG12CorrectAnswerLabel,
  buildG12ResultDetailText,
  buildG12UserAnswerLabel,
} from '../../../lib/v11/g12Result';
import { buildG12Marks } from '../../../lib/v11/resultMarks';
import { computeG12FlankerSpacingPx, computeG12StimulusLayout } from '../../../lib/v11/g12Trial';
import { G12TrialResult } from './G12CrowdingScreen';

const G12_RESULT_CHOICES = [
  { id: 'vertical', label: '垂直' },
  { id: 'horizontal', label: '水平' },
  { id: 'diagonalRight', label: '斜め右' },
  { id: 'diagonalLeft', label: '斜め左' },
];

export type G12ResultScreenProps = {
  result: G12TrialResult;
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
  /** テスト用：固定の patch を渡したい場合 */
  layoutOverrideForTest?: { patchSizePx: number; containerSizePx: number };
};

export const G12ResultScreen: React.FC<G12ResultScreenProps> = ({
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

  const correctAnswerLabel = buildG12CorrectAnswerLabel(
    result.grading.correctOrientation,
  );
  const userAnswerLabel = buildG12UserAnswerLabel(result.grading.userAnswer);
  const detailText = buildG12ResultDetailText(result.grading);
  const marks = buildG12Marks({
    correctOrientation: result.grading.correctOrientation,
    userAnswer: result.grading.userAnswer,
  });

  const layout = layoutOverrideForTest ?? computeResultStimulusLayout();

  // 結果開示でも実際の spacing で再現（拡大ハイライトはコンポーネント側）
  const spacingResult = computeG12FlankerSpacingPx({
    spacingMultiplier: result.trial.paramSpacingMultiplier,
    targetDiameterPx: layout.patchSizePx,
    availableSizePx: layout.containerSizePx,
  });
  const placements = result.trial.flankerPlacements.map((p) => ({
    angleRad: p.angleRad,
    distanceMultiplier: spacingResult.clampedMultiplier,
  }));

  const extraStimulus = (
    <View style={styles.stimulusWrap} testID="g12-result-stimulus">
      <CrowdingStimulus
        target={result.trial.target}
        flankers={result.trial.flankers}
        flankerPlacements={placements}
        patchSizePx={layout.patchSizePx}
        containerSizePx={layout.containerSizePx}
        viewingDistanceCm={40}
        selectedOrientation={null}
        highlightOrientation={result.grading.correctOrientation}
        testId="g12-result-stimulus-inner"
      />
      {/* Sprint 20 ラウンド 3：4 択ボタンを disabled で再描画し、
          buildG12Marks の `g12-${orientation}` targetId と一致する
          data-target-id を ResultOverlay の MarkBadge 重畳先として供給する。 */}
      <View style={styles.choicesWrap} testID="g12-result-choices">
        <AnswerChoiceGroup
          choices={G12_RESULT_CHOICES}
          variant="text"
          selectedId={result.grading.userAnswer}
          onSelect={() => {}}
          layout="horizontal-4"
          ariaLabelGroup="中央のパッチの向き（結果開示）"
          disabled
          dataTargetIdPrefix="g12"
          testId="g12-result-answer-choice"
        />
      </View>
      {detailText.length > 0 ? (
        <View style={styles.detailRow} testID="g12-result-detail">
          <Text style={[styles.detailText, { color: colors.fgSecondary }]}>
            {detailText}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ResultOverlay
      gameId="G-12"
      gameNameJa="G-12 クラウディング"
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
      testId="g12-result-screen"
    />
  );
};

/** Sprint 22：プレイ時と同じ layout を共有して result でも同サイズ・同位置で描画。 */
function computeResultStimulusLayout(): {
  patchSizePx: number;
  containerSizePx: number;
} {
  const { width } = Dimensions.get('window');
  const layout = computeG12StimulusLayout(width);
  const availableSize = Math.max(160, width - 32);
  return {
    patchSizePx: layout.patchSizePx,
    containerSizePx: availableSize,
  };
}

const styles = StyleSheet.create({
  stimulusWrap: {
    alignItems: 'center',
    width: '100%',
  },
  choicesWrap: {
    width: '100%',
    paddingHorizontal: spacing.s4,
    marginTop: spacing.s3,
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
