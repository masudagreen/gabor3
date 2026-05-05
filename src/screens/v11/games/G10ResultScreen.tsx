/**
 * G10ResultScreen — S21-G10-RESULT（screens.md §8 / Sprint 21 v1.1.2 改訂）。
 *
 * G-10 1 試行終了直後に表示する結果サマリ画面。`ResultOverlay` をラップし、
 * G-10 固有の「正解は『左上 / 右上 / 左下 / 右下』」「あなたの回答…」を組み立てる。
 *
 * v1.1.2 Sprint 21（直接選択化）：
 *   - 結果開示でも grid-4 テキスト 4 択ボタンは描画しない
 *   - TextureGridStimulus（8×8 grid）の上に 4 象限の disabled ImageChoiceCell を重畳
 *   - 各象限の `data-target-id` で ResultOverlay の MarkBadge が ◯/✕ を重畳
 *   - `highlightTargetRegion=true` で target 領域 3×3 を 1.5 秒拡大ハイライト
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
import { ImageChoiceCell } from '../../../components/v11/ImageChoiceCell';
import { TextureGridStimulus } from '../../../components/v11/games/TextureGridStimulus';
import {
  buildG10CorrectAnswerLabel,
  buildG10ResultDetailText,
  buildG10UserAnswerLabel,
} from '../../../lib/v11/g10Result';
import { buildG10Marks } from '../../../lib/v11/resultMarks';
import { computeG10GridLayout, type G10Quadrant } from '../../../lib/v11/g10Trial';
import {
  DEFAULT_DPI,
  estimateDeviceType,
} from '../../../lib/calibration';
import { G10TrialResult } from './G10TextureSegmentationScreen';

export type G10ResultScreenProps = {
  result: G10TrialResult;
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
  layoutOverrideForTest?: { cellSizePx: number; gapPx: number };
};

export const G10ResultScreen: React.FC<G10ResultScreenProps> = ({
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

  const correctAnswerLabel = buildG10CorrectAnswerLabel(
    result.grading.correctQuadrant,
  );
  const userAnswerLabel = buildG10UserAnswerLabel(result.grading.userAnswer);
  const detailText = buildG10ResultDetailText(result.grading);
  // G10Quadrant ('top-left' 等) を resultMarks ヘルパの短縮形 ('tl' 等) に変換
  const marks = buildG10Marks({
    correctQuadrant: g10QuadrantToShort(result.grading.correctQuadrant),
    userAnswer:
      result.grading.userAnswer === null
        ? null
        : g10QuadrantToShort(result.grading.userAnswer),
  });

  // 結果開示用のレスポンシブ cell / gap（注視時より一回り小さく）
  const layout = layoutOverrideForTest ?? computeResultGridLayout();
  const dpi = React.useMemo(() => deviceDpi(), []);

  // v1.1.2 Sprint 21：grid-4 ボタン撤去、TextureGridStimulus の上に 4 象限の
  // disabled ImageChoiceCell を重畳して `g10-${tl|tr|bl|br}` の data-target-id
  // を ResultOverlay の MarkBadge 重畳先として供給する。
  const gridSidePx = layout.cellSizePx * 8 + layout.gapPx * 7;
  const quadrantSidePx = gridSidePx / 2;
  const QUADRANTS_RESULT: ReadonlyArray<{
    q: G10Quadrant;
    short: 'tl' | 'tr' | 'bl' | 'br';
    targetId: string;
    ariaLabel: string;
    top: number;
    left: number;
  }> = [
    { q: 'top-left', short: 'tl', targetId: 'g10-tl', ariaLabel: '左上の象限', top: 0, left: 0 },
    {
      q: 'top-right',
      short: 'tr',
      targetId: 'g10-tr',
      ariaLabel: '右上の象限',
      top: 0,
      left: quadrantSidePx,
    },
    {
      q: 'bottom-left',
      short: 'bl',
      targetId: 'g10-bl',
      ariaLabel: '左下の象限',
      top: quadrantSidePx,
      left: 0,
    },
    {
      q: 'bottom-right',
      short: 'br',
      targetId: 'g10-br',
      ariaLabel: '右下の象限',
      top: quadrantSidePx,
      left: quadrantSidePx,
    },
  ];

  const extraStimulus = (
    <View style={styles.stimulusWrap} testID="g10-result-stimulus">
      <View
        style={{
          width: gridSidePx,
          height: gridSidePx,
          position: 'relative',
        }}
      >
        <TextureGridStimulus
          cells={result.trial.cells}
          cellSizePx={layout.cellSizePx}
          gapPx={layout.gapPx}
          viewingDistanceCm={40}
          dpi={dpi}
          highlightTargetRegion
          testId="g10-result-stimulus-inner"
        />
        {QUADRANTS_RESULT.map(({ q, targetId, ariaLabel, top, left }) => (
          <View
            key={q}
            style={{
              position: 'absolute',
              top,
              left,
              width: quadrantSidePx,
              height: quadrantSidePx,
            }}
          >
            <ImageChoiceCell
              id={`result-${q}`}
              isSelected={result.grading.userAnswer === q}
              onToggle={() => {}}
              ariaLabel={ariaLabel}
              cellSizePx={quadrantSidePx}
              role="radio"
              disabled
              dimOnDisabled={false}
              transparentBackground
              dataTargetId={targetId}
              testId={`g10-result-quadrant-${q}`}
            >
              <View style={{ width: 0, height: 0 }} />
            </ImageChoiceCell>
          </View>
        ))}
      </View>
      {detailText.length > 0 ? (
        <View style={styles.detailRow} testID="g10-result-detail">
          <Text style={[styles.detailText, { color: colors.fgSecondary }]}>
            {detailText}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ResultOverlay
      gameId="G-10"
      gameNameJa="G-10 テクスチャ分離"
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
      testId="g10-result-screen"
    />
  );
};

function deviceDpi(): number {
  return DEFAULT_DPI[estimateDeviceType(Platform.OS)];
}

/** Sprint 22：プレイ時と同じ layout を共有して result でも同サイズ・同位置で描画。 */
function computeResultGridLayout(): { cellSizePx: number; gapPx: number } {
  const { width } = Dimensions.get('window');
  const layout = computeG10GridLayout(width);
  return { cellSizePx: layout.cellSizePx, gapPx: layout.gapPx };
}

function g10QuadrantToShort(q: G10Quadrant): 'tl' | 'tr' | 'bl' | 'br' {
  switch (q) {
    case 'top-left':
      return 'tl';
    case 'top-right':
      return 'tr';
    case 'bottom-left':
      return 'bl';
    case 'bottom-right':
      return 'br';
  }
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
