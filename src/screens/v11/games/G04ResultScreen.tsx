/**
 * G04ResultScreen — S12-03（screens.md §4）/ Sprint 20-B-2 改訂。
 *
 * G-04 1 試行終了直後に表示する結果サマリ画面。`ResultOverlay`（mode='single'）を
 * ラップし、G-04 固有の「正解は『左が濃い / 右が濃い』」「あなたの回答…」と
 * marks（◯/✕ 重畳）を組み立てて渡す。
 *
 * G-02 と同様、`SideBySideStimulus` を `extraStimulus` に埋め込み、
 * `highlightSide=correctSide` を渡して「正解側パッチを 1.5 秒拡大ハイライト」を実装。
 *
 * メトリクスバー（閾値 / 前回比 / 単位）は撤去（spec 再確定、F-10 v1.1.1）
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
  buildG04CorrectAnswerLabel,
  buildG04UserAnswerLabel,
  buildG04ResultDetailText,
} from '../../../lib/v11/g04Result';
import { buildHorizontalSideMarks } from '../../../lib/v11/resultMarks';
import { computeG04StimulusLayout } from '../../../lib/v11/g04Trial';
import {
  DEFAULT_DPI,
  estimateDeviceType,
} from '../../../lib/calibration';
import { G04TrialResult } from './G04ContrastDiscrimScreen';

export type G04ResultScreenProps = {
  result: G04TrialResult;
  /** 過去のベスト閾値（props 互換のため残置、表示は撤去） */
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

export const G04ResultScreen: React.FC<G04ResultScreenProps> = ({
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

  const correctAnswerLabel = buildG04CorrectAnswerLabel(
    result.grading.correctSide,
  );
  const userAnswerLabel = buildG04UserAnswerLabel(result.grading.userAnswer);
  const detailText = buildG04ResultDetailText(result.grading);
  const marks = buildHorizontalSideMarks({
    gameId: 'g04',
    correctSide: result.grading.correctSide,
    userAnswer: result.grading.userAnswer,
  });

  const layout =
    layoutOverrideForTest ?? computeResultStimulusLayout();
  const dpi = React.useMemo(() => deviceDpi(), []);

  const extraStimulus = (
    <View style={styles.stimulusWrap} testID="g04-result-stimulus">
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
        leftAriaLabel="左の縞模様（タップで「左が濃い」と回答）"
        rightAriaLabel="右の縞模様（タップで「右が濃い」と回答）"
        groupAriaLabel="左右の縞模様（コントラストが濃い方を選んでください）"
        leftDataTargetId="g04-left"
        rightDataTargetId="g04-right"
        testId="g04-result-stimulus-inner"
      />
      {detailText.length > 0 ? (
        <View style={styles.detailRow} testID="g04-result-detail">
          <Text style={[styles.detailText, { color: colors.fgSecondary }]}>
            {detailText}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ResultOverlay
      gameId="G-04"
      gameNameJa="G-04 コントラスト弁別"
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
      testId="g04-result-screen"
    />
  );
};

function deviceDpi(): number {
  return DEFAULT_DPI[estimateDeviceType(Platform.OS)];
}

/** Sprint 22：プレイ時と同じ layout を共有して result でも同サイズ・同位置で描画。 */
function computeResultStimulusLayout(): { patchSizePx: number; gapPx: number } {
  const { width, height } = Dimensions.get('window');
  return computeG04StimulusLayout({ widthPx: width, heightPx: height });
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
