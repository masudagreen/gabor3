/**
 * G11ResultScreen — S21-G11-RESULT（screens.md §9 / Sprint 21 v1.1.2 改訂）。
 *
 * G-11 1 試行終了直後に表示する結果サマリ画面。`ResultOverlay` をラップし、
 * G-11 固有の正解ラベル・ユーザー回答ラベル・marks を組み立てる。
 *
 * v1.1.2 Sprint 21（直接選択化）：
 *   - 構造：上 reference + 下に左右 2 テストパッチ（G11VernierStimulus）
 *   - marks：`buildG11Marks` が `g11-test-left/right` の正解側に correctChosen、
 *     誤選択側に wrongChosen を付与（reference には何も置かない）
 *   - highlightSide で正解側のテストパッチを 1.5 秒拡大ハイライト
 *
 * 閾値表示は小数 1 桁 + arcmin 略号（例：2.0'）、unit「ズレ量(arcmin)」。
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
import { G11VernierStimulus } from '../../../components/v11/games/G11VernierStimulus';
import {
  buildG11CorrectAnswerLabel,
  buildG11ResultDetailText,
  buildG11UserAnswerLabel,
} from '../../../lib/v11/g11Result';
import { buildG11Marks } from '../../../lib/v11/resultMarks';
import { arcminToVisiblePx, computeG11StimulusLayout } from '../../../lib/v11/g11Trial';
import {
  DEFAULT_DPI,
  estimateDeviceType,
} from '../../../lib/calibration';
import { G11TrialResult } from './G11VernierAlignmentScreen';

export type G11ResultScreenProps = {
  result: G11TrialResult;
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

export const G11ResultScreen: React.FC<G11ResultScreenProps> = ({
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

  const correctAnswerLabel = buildG11CorrectAnswerLabel(
    result.grading.correctDirection,
  );
  const userAnswerLabel = buildG11UserAnswerLabel(result.grading.userAnswer);
  const detailText = buildG11ResultDetailText(result.grading);
  // v1.1.2 Sprint 21：side ベースの marks を構築。grading.correctSide が新仕様で
  // 必ず存在するが、後方互換のため fallback。
  const correctSide =
    result.grading.correctSide ?? result.trial.correctSide;
  const userAnswerSide =
    result.grading.userAnswerSide ?? null;
  const marks = buildG11Marks({
    correctSide,
    userAnswerSide,
  });

  const layout = layoutOverrideForTest ?? computeResultStimulusLayout();
  const dpi = React.useMemo(() => deviceDpi(), []);

  // 結果開示でも実際のズレ方向と量で再現
  const offsetMagnitudePx = arcminToVisiblePx({
    arcminVal: result.trial.paramOffsetArcmin,
    distanceCm: 40,
    dpi,
    minVisiblePx: 2, // 結果画面では最低 2px で視認性を強調
  });
  const shiftedSideOffsetPx =
    result.trial.correctDirection === 'left'
      ? -offsetMagnitudePx
      : offsetMagnitudePx;

  const extraStimulus = (
    <View style={styles.stimulusWrap} testID="g11-result-stimulus">
      <G11VernierStimulus
        upper={result.trial.upper}
        lowerLeft={result.trial.lowerLeft}
        lowerRight={result.trial.lowerRight}
        patchSizePx={layout.patchSizePx}
        gapPx={layout.gapPx}
        shiftedSideOffsetPx={shiftedSideOffsetPx}
        correctSide={correctSide}
        viewingDistanceCm={40}
        dpi={dpi}
        selectedSide={null}
        onSelectSide={() => {}}
        disabled
        highlightSide={correctSide}
        leftDataTargetId="g11-test-left"
        rightDataTargetId="g11-test-right"
        testId="g11-result-stimulus-inner"
      />
      {detailText.length > 0 ? (
        <View style={styles.detailRow} testID="g11-result-detail">
          <Text style={[styles.detailText, { color: colors.fgSecondary }]}>
            {detailText}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ResultOverlay
      gameId="G-11"
      gameNameJa="G-11 Vernier 整列判定"
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
      testId="g11-result-screen"
    />
  );
};

function deviceDpi(): number {
  return DEFAULT_DPI[estimateDeviceType(Platform.OS)];
}

/** Sprint 22：プレイ時と同じ layout を共有して result でも同サイズ・同位置で描画。 */
function computeResultStimulusLayout(): {
  patchSizePx: number;
  gapPx: number;
} {
  const { width, height } = Dimensions.get('window');
  return computeG11StimulusLayout({ widthPx: width, heightPx: height });
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
