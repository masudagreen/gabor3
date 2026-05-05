/**
 * G02ResultScreen — S10-03（screens.md §4）/ Sprint 20-B-2 改訂。
 *
 * G-02 1 試行終了直後に表示する結果サマリ画面。`ResultOverlay`（mode='single'）を
 * ラップし、G-02 固有の「正解は『左 / 右』」「あなたの回答『左 / 右 / 未回答』」と
 * marks（◯/✕ 重畳）を組み立てて渡す。
 *
 * 単体プレイ時：`SinglePlayPostFooter`（3 ボタン）を ResultOverlay 内蔵で表示
 * メトリクスバー（閾値 / 前回比 / 単位）は撤去（spec 再確定、F-10 v1.1.1）
 *
 * `SideBySideStimulus` を `extraStimulus` に埋め込み、`highlightSide=correctSide`
 * を渡して「正解側パッチを 1.5 秒拡大ハイライト」を実装する。
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
  buildG02CorrectAnswerLabel,
  buildG02UserAnswerLabel,
  buildG02ResultDetailText,
} from '../../../lib/v11/g02Result';
import { buildG02Marks } from '../../../lib/v11/resultMarks';
import { computeG02StimulusLayout } from '../../../lib/v11/g02Trial';
import {
  DEFAULT_DPI,
  estimateDeviceType,
} from '../../../lib/calibration';
import { G02TrialResult } from './G02SideBySideTiltScreen';

export type G02ResultScreenProps = {
  result: G02TrialResult;
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

export const G02ResultScreen: React.FC<G02ResultScreenProps> = ({
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

  const correctAnswerLabel = buildG02CorrectAnswerLabel(
    result.grading.correctSide,
  );
  const userAnswerLabel = buildG02UserAnswerLabel(result.grading.userAnswer);
  const detailText = buildG02ResultDetailText(result.grading);
  const marks = buildG02Marks({
    correctSide: result.grading.correctSide,
    userAnswer: result.grading.userAnswer,
  });

  // 結果開示用のレスポンシブ patch / gap（注視時より一回り小さく）
  const layout =
    layoutOverrideForTest ?? computeResultStimulusLayout();
  const dpi = React.useMemo(() => deviceDpi(), []);

  const extraStimulus = (
    <View style={styles.stimulusWrap} testID="g02-result-stimulus">
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
        testId="g02-result-stimulus-inner"
      />
      {detailText.length > 0 ? (
        <View style={styles.detailRow} testID="g02-result-detail">
          <Text style={[styles.detailText, { color: colors.fgSecondary }]}>
            {detailText}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ResultOverlay
      gameId="G-02"
      gameNameJa="G-02 左右並び傾き判別"
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
      testId="g02-result-screen"
    />
  );
};

function deviceDpi(): number {
  return DEFAULT_DPI[estimateDeviceType(Platform.OS)];
}

/** Sprint 22：プレイ時と同じ layout を共有して result でも同サイズ・同位置で描画。 */
function computeResultStimulusLayout(): { patchSizePx: number; gapPx: number } {
  const { width, height } = Dimensions.get('window');
  return computeG02StimulusLayout({ widthPx: width, heightPx: height });
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
