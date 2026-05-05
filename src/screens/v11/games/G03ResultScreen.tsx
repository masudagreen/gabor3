/**
 * G03ResultScreen — S11-03（screens.md §4）/ Sprint 20-B-2 改訂。
 *
 * G-03 1 試行終了直後に表示する結果サマリ画面。`ResultOverlay`（mode='single'）を
 * ラップし、G-03 固有の「正解は『3 時の方向』」「あなたの回答『6 時の方向 / 未回答』」と
 * marks（◯/✕ 重畳）を組み立てて渡す。
 *
 * `RadialEightStimulus` を `extraStimulus` に埋め込み、`correctIndexHighlight=
 * trial.oddPositionIndex` を渡して「正解位置のパッチを 1.5 秒拡大ハイライト
 * + 矢印 1.5 秒提示」を実装する。
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
import { RadialEightStimulus } from '../../../components/v11/games/RadialEightStimulus';
import {
  buildG03CorrectAnswerLabel,
  buildG03UserAnswerLabel,
  buildG03ResultDetailText,
} from '../../../lib/v11/g03Result';
import { buildG03Marks } from '../../../lib/v11/resultMarks';
import { computeG03StimulusLayout } from '../../../lib/v11/g03Trial';
import {
  DEFAULT_DPI,
  estimateDeviceType,
} from '../../../lib/calibration';
import { G03TrialResult } from './G03PeripheralHuntScreen';

export type G03ResultScreenProps = {
  result: G03TrialResult;
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
  /** テスト用：固定のレイアウトを渡したい場合 */
  layoutOverrideForTest?: { framePx: number; patchSizePx: number };
};

export const G03ResultScreen: React.FC<G03ResultScreenProps> = ({
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

  const correctAnswerLabel = buildG03CorrectAnswerLabel(
    result.grading.correctClockPosition,
  );
  const userAnswerLabel = buildG03UserAnswerLabel(result.grading.userAnswer);
  const detailText = buildG03ResultDetailText(result.grading);
  const marks = buildG03Marks({
    correctClockPosition: result.grading.correctClockPosition,
    userAnswer: result.grading.userAnswer,
  });

  const layout = layoutOverrideForTest ?? computeResultStimulusLayout();
  const dpi = React.useMemo(() => deviceDpi(), []);

  const extraStimulus = (
    <View style={styles.stimulusWrap} testID="g03-result-stimulus">
      <RadialEightStimulus
        patches={result.trial.patches}
        framePx={layout.framePx}
        patchSizePx={layout.patchSizePx}
        eccentricityDeg={result.trial.eccentricityDeg}
        viewingDistanceCm={40}
        dpi={dpi}
        selectedClockPosition={null}
        onSelectClockPosition={() => {}}
        disabled
        correctIndexHighlight={result.trial.oddPositionIndex}
        dataTargetIdPrefix="g03-pos"
        testId="g03-result-stimulus-inner"
      />
      {detailText.length > 0 ? (
        <View style={styles.detailRow} testID="g03-result-detail">
          <Text style={[styles.detailText, { color: colors.fgSecondary }]}>
            {detailText}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ResultOverlay
      gameId="G-03"
      gameNameJa="G-03 周辺視野ハント"
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
      testId="g03-result-screen"
    />
  );
};

function deviceDpi(): number {
  return DEFAULT_DPI[estimateDeviceType(Platform.OS)];
}

/** Sprint 22：プレイ時と同じ layout を共有して result でも同サイズ・同位置で描画。 */
function computeResultStimulusLayout(): {
  framePx: number;
  patchSizePx: number;
} {
  const { width, height } = Dimensions.get('window');
  const { framePx, patchSizePx } = computeG03StimulusLayout({
    widthPx: width,
    heightPx: height,
  });
  return { framePx, patchSizePx };
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
