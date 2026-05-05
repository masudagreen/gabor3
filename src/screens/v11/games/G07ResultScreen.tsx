/**
 * G07ResultScreen — S14-06（screens.md §3）。
 *
 * G-07 1 試行終了直後に表示する結果サマリ画面。`ResultSummaryV11` をラップし、
 * G-07 固有の「正解は『2 行 2 列・2 行 4 列・3 行 3 列』」（3 個の線位置）と
 * 「あなたの回答『N/3 個正解 (M 過剰)』」を組み立てる。
 *
 * 単体プレイ時：`SinglePlayPostFooter`（3 ボタン）を内蔵
 * コース時：「次へ」Primary + 自動進行カウントダウン（Sprint 18 連携時）
 *
 * `GaborGridStimulus` を `extraStimulus` に埋め込み、`highlightIds=correctIds` を
 * 渡して「正解 3 セルを 1.5 秒拡大ハイライト」を実装する。
 *
 * 閾値表示は整数（例：5）、unit「向きズレ°」（spec §7.7、screens.md §3 G-07 指標）。
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
import { GaborGridStimulus } from '../../../components/v11/games/GaborGridStimulus';
import {
  buildG07CorrectLabel,
  buildG07UserAnswerLabel,
} from '../../../lib/v11/g07Result';
import { buildG07Marks } from '../../../lib/v11/resultMarks';
import { computeG07GridLayout } from '../../../lib/v11/g07Trial';
import {
  DEFAULT_DPI,
  estimateDeviceType,
} from '../../../lib/calibration';
import { G07TrialResult } from './G07EdgeHuntScreen';

export type G07ResultScreenProps = {
  result: G07TrialResult;
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
  /** テスト用：固定の cellSize / gap を渡したい場合 */
  layoutOverrideForTest?: {
    cellSizePx: number;
    gapPx: number;
    gridSizePx: number;
  };
};

export const G07ResultScreen: React.FC<G07ResultScreenProps> = ({
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

  const correctAnswerLabel = buildG07CorrectLabel(result.grading);
  const userAnswerLabel = buildG07UserAnswerLabel(result.grading);
  const marks = buildG07Marks({ grading: result.grading });

  // 結果開示用のレスポンシブ cellSize / gap（注視時より一回り小さく）
  const layout = layoutOverrideForTest ?? computeResultGridLayout();
  const dpi = React.useMemo(() => deviceDpi(), []);

  // ResultSummaryV11 は `userAnswerLabel` を「あなたの回答『…』」として表示する。
  // G-07 では「N/3 個正解 (M 過剰)」のような数値内訳がそのまま入るため、追加の補助
  // テキストは未回答時のみ別レンダで補強する（screens.md S14-06）。
  const showUnattemptedDetail = result.grading.unattempted;

  const extraStimulus = (
    <View style={styles.stimulusWrap} testID="g07-result-stimulus">
      <GaborGridStimulus
        patches={result.trial.patches}
        cellSizePx={layout.cellSizePx}
        gapPx={layout.gapPx}
        viewingDistanceCm={40}
        dpi={dpi}
        selectedIds={[]}
        onToggleCell={() => {}}
        disabled
        highlightIds={result.grading.correctIds}
        groupAriaLabel="正解 3 個のパッチを表示中"
        dataTargetIdPrefix="g07"
        testId="g07-result-stimulus-inner"
      />
      {showUnattemptedDetail ? (
        <View style={styles.detailRow} testID="g07-result-detail">
          <Text style={[styles.detailText, { color: colors.fgSecondary }]}>
            未回答
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ResultOverlay
      gameId="G-07"
      gameNameJa="G-07 ガボールエッジ検出"
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
      testId="g07-result-screen"
    />
  );
};

function deviceDpi(): number {
  return DEFAULT_DPI[estimateDeviceType(Platform.OS)];
}

/** Sprint 22：プレイ時と同じ layout を共有して result でも同サイズ・同位置で描画。 */
function computeResultGridLayout(): {
  cellSizePx: number;
  gapPx: number;
  gridSizePx: number;
} {
  const { width } = Dimensions.get('window');
  const layout = computeG07GridLayout({ widthPx: width });
  return {
    cellSizePx: layout.cellSizePx,
    gapPx: layout.gapPx,
    gridSizePx: layout.cellSizePx * 4 + layout.gapPx * 3,
  };
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
