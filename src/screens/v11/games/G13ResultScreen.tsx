/**
 * G13ResultScreen — S17-06（screens.md §3）。
 *
 * G-13 1 試行終了直後に表示する結果サマリ画面。`ResultSummaryV11` をラップし、
 * G-13 固有の「正解は『3』」「あなたの回答…」を組み立てる。
 *
 * 単体プレイ時：`SinglePlayPostFooter`（3 ボタン）
 * コース時：「次へ」Primary + 自動進行カウントダウン
 *
 * `EmbeddedNumeralStimulus` を `extraStimulus` に埋め込み、
 * `highlightDigit=embeddedDigit` で「数字を本来コントラストで 1.5 秒表示」。
 *
 * 閾値表示は小数 2 桁（例：0.10）、unit「コントラスト」。
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
import { EmbeddedNumeralStimulus } from '../../../components/v11/games/EmbeddedNumeralStimulus';
import {
  buildG13CorrectAnswerLabel,
  buildG13ResultDetailText,
  buildG13UserAnswerLabel,
} from '../../../lib/v11/g13Result';
import { buildG13Marks } from '../../../lib/v11/resultMarks';
import { G13_ALL_DIGITS, computeG13StimulusLayout } from '../../../lib/v11/g13Trial';
import { G13TrialResult } from './G13EmbeddedNumeralScreen';

const G13_RESULT_KEYPAD_CHOICES = G13_ALL_DIGITS.map((d) => ({
  id: String(d),
  label: String(d),
}));

export type G13ResultScreenProps = {
  result: G13TrialResult;
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
  /** テスト用：固定の stimulus サイズ */
  layoutOverrideForTest?: { stimulusSizePx: number };
};

export const G13ResultScreen: React.FC<G13ResultScreenProps> = ({
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

  const correctAnswerLabel = buildG13CorrectAnswerLabel(
    result.grading.embeddedDigit,
  );
  const userAnswerLabel = buildG13UserAnswerLabel(result.grading.userAnswer);
  const detailText = buildG13ResultDetailText(result.grading);
  const marks = buildG13Marks({
    embeddedDigit: result.grading.embeddedDigit,
    userAnswer: result.grading.userAnswer,
  });

  const layout = layoutOverrideForTest ?? computeResultStimulusLayout();

  const extraStimulus = (
    <View style={styles.stimulusWrap} testID="g13-result-stimulus">
      <EmbeddedNumeralStimulus
        digit={result.trial.embeddedDigit}
        contrast={result.trial.paramContrast}
        noiseSeed={result.trial.noiseSeed}
        stimulusSizePx={layout.stimulusSizePx}
        highlightDigit={result.grading.embeddedDigit}
        testId="g13-result-stimulus-inner"
      />
      {/* Sprint 20 ラウンド 3：keypad-10 を disabled で再描画し、
          buildG13Marks の `g13-key-${digit}` targetId と一致する
          data-target-id を ResultOverlay の MarkBadge 重畳先として供給する。 */}
      <View style={styles.choicesWrap} testID="g13-result-choices">
        <AnswerChoiceGroup
          choices={G13_RESULT_KEYPAD_CHOICES}
          variant="numeric"
          selectedId={
            result.grading.userAnswer !== null
              ? String(result.grading.userAnswer)
              : null
          }
          onSelect={() => {}}
          layout="keypad-10"
          ariaLabelGroup="埋め込まれた数字 0〜9（結果開示）"
          disabled
          dataTargetIdPrefix="g13-key"
          testId="g13-result-answer-choice"
        />
      </View>
      {detailText.length > 0 ? (
        <View style={styles.detailRow} testID="g13-result-detail">
          <Text style={[styles.detailText, { color: colors.fgSecondary }]}>
            {detailText}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ResultOverlay
      gameId="G-13"
      gameNameJa="G-13 数字探し"
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
      testId="g13-result-screen"
    />
  );
};

/** Sprint 22：プレイ時と同じ layout を共有して result でも同サイズ・同位置で描画。 */
function computeResultStimulusLayout(): { stimulusSizePx: number } {
  const { width } = Dimensions.get('window');
  const layout = computeG13StimulusLayout(width);
  return { stimulusSizePx: layout.stimulusSizePx };
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
