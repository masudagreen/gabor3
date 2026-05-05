/**
 * G08ResultScreen — S20-G08-RESULT（screens.md §6）。
 *
 * v1.1.1 Sprint 20-C 改訂：
 *   - 下部 2 パッチ直接選択に対応した正解側ハイライト
 *   - `G08TiltStimulus` を `extraStimulus` に埋め込み、`highlightSide` で正解側
 *     を 1.5 秒拡大ハイライト（screens.md §6）
 *   - marks は `g08-test-left` / `g08-test-right` を使う（adapter には ◯/✕ なし）
 *
 * 単体プレイ時：`SinglePlayPostFooter`（3 ボタン）を内蔵
 * コース時：「次へ」Primary + 自動進行カウントダウン
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
import { G08TiltStimulus } from '../../../components/v11/games/G08TiltStimulus';
import {
  buildG08CorrectSideLabel,
  buildG08UserSideLabel,
  buildG08ResultDetailText,
} from '../../../lib/v11/g08Result';
import { buildG08Marks } from '../../../lib/v11/resultMarks';
import { computeG08StimulusLayout } from '../../../lib/v11/g08Trial';
import {
  DEFAULT_DPI,
  estimateDeviceType,
} from '../../../lib/calibration';
import { G08TrialResult } from './G08TiltAftereffectScreen';

export type G08ResultScreenProps = {
  result: G08TrialResult;
  /** 過去のベスト閾値（今日を除く）。null なら「初回測定」。表示は撤去（spec 再確定） */
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

export const G08ResultScreen: React.FC<G08ResultScreenProps> = ({
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

  // v1.1.1 Sprint 20-C：side ベースの正解 / 回答ラベル。trial.correctSide が
  // 必ず存在する前提（buildG08Trial が必ず埋める）。grading.correctSide も
  // 効果的に同じ値が入る。
  const correctSide = result.grading.correctSide ?? result.trial.correctSide;
  const userAnswerSide = result.grading.userAnswerSide ?? null;
  const correctAnswerLabel = buildG08CorrectSideLabel(correctSide);
  const userAnswerLabel = buildG08UserSideLabel(userAnswerSide);
  const detailText = buildG08ResultDetailText(result.grading);
  const marks = buildG08Marks({
    correctSide,
    userAnswerSide,
  });

  // 結果開示用のレスポンシブ patch / gap（注視時より一回り小さく）
  const layout = layoutOverrideForTest ?? computeResultStimulusLayout();
  const dpi = React.useMemo(() => deviceDpi(), []);

  const extraStimulus = (
    <View style={styles.stimulusWrap} testID="g08-result-stimulus">
      <G08TiltStimulus
        adapter={result.trial.adapter}
        testLeft={result.trial.testLeft}
        testRight={result.trial.testRight}
        patchSizePx={layout.patchSizePx}
        gapPx={layout.gapPx}
        viewingDistanceCm={40}
        dpi={dpi}
        selectedSide={null}
        onSelectSide={() => {}}
        disabled
        highlightSide={correctSide}
        testId="g08-result-stimulus-inner"
      />
      {detailText.length > 0 ? (
        <View style={styles.detailRow} testID="g08-result-detail">
          <Text style={[styles.detailText, { color: colors.fgSecondary }]}>
            {detailText}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <ResultOverlay
      gameId="G-08"
      gameNameJa="G-08 残像方位弁別"
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
      testId="g08-result-screen"
    />
  );
};

function deviceDpi(): number {
  return DEFAULT_DPI[estimateDeviceType(Platform.OS)];
}

/** Sprint 22：プレイ時と同じ layout を共有して result でも同サイズ・同位置で描画。 */
function computeResultStimulusLayout(): { patchSizePx: number; gapPx: number } {
  const { width, height } = Dimensions.get('window');
  return computeG08StimulusLayout({ widthPx: width, heightPx: height });
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
