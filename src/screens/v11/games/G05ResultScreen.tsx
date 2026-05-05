/**
 * G05ResultScreen — S13-03（screens.md §4）。
 *
 * G-05 1 試行終了直後に表示する結果サマリ画面。`ResultSummaryV11` をラップし、
 * G-05 固有の「正解は『左が細かい / 右が細かい』」「あなたの回答『左が細かい /
 * 右が細かい / 未回答』」を組み立てる。
 *
 * 単体プレイ時：`SinglePlayPostFooter`（3 ボタン）を内蔵
 * コース時：「次へ」Primary + 自動進行カウントダウン（Sprint 18 連携時）
 *
 * G-02 / G-04 と同様、`SideBySideStimulus` を `extraStimulus` に埋め込み、
 * `highlightSide=correctSide` を渡して「正解側パッチを 1.5 秒拡大ハイライト」
 * を実装する（screens.md S13-03 §4 / spec-v11.md §7.5 準拠）。
 *
 * 閾値表示は小数 1 桁（例：1.5）、unit「cpd 比」（spec §7.5）。
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
import { SideBySideStimulus } from '../../../components/v11/games/SideBySideStimulus';
import {
  buildG05CorrectAnswerLabel,
  buildG05UserAnswerLabel,
  buildG05ResultDetailText,
} from '../../../lib/v11/g05Result';
import { buildHorizontalSideMarks } from '../../../lib/v11/resultMarks';
import { computeG05StimulusLayout } from '../../../lib/v11/g05Trial';
import {
  DEFAULT_DPI,
  estimateDeviceType,
} from '../../../lib/calibration';
import { G05TrialResult } from './G05SfDiscrimScreen';

export type G05ResultScreenProps = {
  result: G05TrialResult;
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

export const G05ResultScreen: React.FC<G05ResultScreenProps> = ({
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

  const correctAnswerLabel = buildG05CorrectAnswerLabel(
    result.grading.correctSide,
  );
  const userAnswerLabel = buildG05UserAnswerLabel(result.grading.userAnswer);
  const detailText = buildG05ResultDetailText(result.grading);
  const marks = buildHorizontalSideMarks({
    gameId: 'g05',
    correctSide: result.grading.correctSide,
    userAnswer: result.grading.userAnswer,
  });

  // 結果開示用のレスポンシブ patch / gap（注視時より一回り小さく）
  const layout =
    layoutOverrideForTest ?? computeResultStimulusLayout();
  const dpi = React.useMemo(() => deviceDpi(), []);

  const extraStimulus = (
    <View style={styles.stimulusWrap} testID="g05-result-stimulus">
      <SideBySideStimulus
        left={result.trial.left}
        right={result.trial.right}
        patchSizePx={layout.patchSizePx}
        gapPx={layout.gapPx}
        viewingDistanceCm={40}
        dpi={dpi}
        selectedSide={null}
        onSelectSide={() => {}}
        disabled
        highlightSide={result.grading.correctSide}
        // Sprint 13：結果開示時も G-05 文脈の aria-label を維持
        leftAriaLabel="左の縞模様（タップで「左が細かい」と回答）"
        rightAriaLabel="右の縞模様（タップで「右が細かい」と回答）"
        groupAriaLabel="左右の縞模様（縞が細かい方を選んでください）"
        leftDataTargetId="g05-left"
        rightDataTargetId="g05-right"
        testId="g05-result-stimulus-inner"
      />
      {detailText.length > 0 ? (
        <View style={styles.detailRow} testID="g05-result-detail">
          <Text style={[styles.detailText, { color: colors.fgSecondary }]}>
            {detailText}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ResultOverlay
      gameId="G-05"
      gameNameJa="G-05 空間周波数弁別"
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
      testId="g05-result-screen"
    />
  );
};

function deviceDpi(): number {
  return DEFAULT_DPI[estimateDeviceType(Platform.OS)];
}

/** Sprint 22：プレイ時と同じ layout を共有して result でも同サイズ・同位置で描画。 */
function computeResultStimulusLayout(): { patchSizePx: number; gapPx: number } {
  const { width, height } = Dimensions.get('window');
  return computeG05StimulusLayout({ widthPx: width, heightPx: height });
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
