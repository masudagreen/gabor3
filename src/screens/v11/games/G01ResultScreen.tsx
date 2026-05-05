/**
 * G01ResultScreen — S9-03（screens.md §4）/ Sprint 20-B-2 改訂。
 *
 * G-01 1 試行終了直後に表示する結果サマリ画面。`ResultOverlay`（mode='single'）を
 * ラップし、G-01 固有の「正解ラベル＝変化対象パッチの位置一覧」「ユーザー回答ラベル
 * ＝選択していたパッチの位置一覧」と marks（◯/✕ 重畳）を組み立てて渡す。
 *
 * 単体プレイ時：`SinglePlayPostFooter`（3 ボタン）を ResultOverlay 内蔵で表示
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
import { MorphGridStimulus } from '../../../components/v11/games/MorphGridStimulus';
import {
  buildAnswerCountSummary,
  buildCorrectAnswerLabel,
  buildUserAnswerLabel,
} from '../../../lib/v11/g01Result';
import { buildG01Marks } from '../../../lib/v11/resultMarks';
import {
  DEFAULT_DPI,
  estimateDeviceType,
} from '../../../lib/calibration';
import { G01TrialResult } from './G01ChangeDetectScreen';

export type G01ResultScreenProps = {
  result: G01TrialResult;
  selectedIds: ReadonlyArray<string>;
  /** 過去のベスト閾値（今日を除く）。null なら「初回測定」（Sprint 20-B-2 で表示は撤去、props 互換のため残置） */
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
};

export const G01ResultScreen: React.FC<G01ResultScreenProps> = ({
  result,
  selectedIds,
  isCourseMode,
  nextGameLabel,
  onNext,
  onAbort,
  onPlayAgain,
  onBackToList,
  onGoHome,
  newlyAwardedBadges,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  const correctAnswerLabel = buildCorrectAnswerLabel(result.trial);
  const userAnswerLabel = buildUserAnswerLabel(selectedIds);
  const detailText = buildAnswerCountSummary(
    result.grading,
    result.unattempted,
  );

  const marks = buildG01Marks({
    trial: result.trial,
    selectedIds,
  });

  // G-01 result phase：プレイ中と同じ MorphGridStimulus を disabled で再描画し、
  // 各セルの `data-target-id` を `g01-${patch.id}` 形式で出すことで
  // ResultOverlay が `buildG01Marks` の出す targetId に対応する位置に
  // ◯/✕ アイコンを重畳できるようにする（Sprint 20 ラウンド 3 修正）。
  const gridLayout = computeResultGridSize();
  const dpi = React.useMemo(() => deviceDpi(), []);
  const extraStimulus = (
    <View style={styles.stimulusWrap} testID="g01-result-stimulus">
      <MorphGridStimulus
        rows={result.trial.config.rows}
        cols={result.trial.config.cols}
        patches={result.trial.patches}
        progress={1}
        selectedIds={selectedIds}
        onTogglePatch={() => {}}
        viewingDistanceCm={40}
        dpi={dpi}
        maxSizePx={gridLayout}
        disabled
        dataTargetIdPrefix="g01"
        testId="g01-result-stimulus-inner"
      />
      <View style={styles.detailRow} testID="g01-result-detail">
        <Text style={[styles.detailText, { color: colors.fgSecondary }]}>
          {detailText}
        </Text>
      </View>
    </View>
  );

  return (
    <ResultOverlay
      gameId="G-01"
      gameNameJa="G-01 変化察知"
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
      testId="g01-result-screen"
    />
  );
};

function deviceDpi(): number {
  return DEFAULT_DPI[estimateDeviceType(Platform.OS)];
}

/** result phase 用の MorphGrid 最大辺長。Sprint 22：プレイ時と同サイズ・同位置に統一。 */
function computeResultGridSize(): number {
  const { width, height } = Dimensions.get('window');
  const shortSide = Math.min(width, height);
  if (shortSide >= 600) return Math.min(480, shortSide - 96);
  return Math.min(360, shortSide - 32);
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
