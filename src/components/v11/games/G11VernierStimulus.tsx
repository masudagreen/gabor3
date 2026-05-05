/**
 * G11VernierStimulus — GE-11 v1.1.2（components.md §15、screens.md S21-G11-PLAY）。
 *
 * v1.1.2（Sprint 21 直接選択化）改訂版の G-11 Vernier 整列判定の注視領域。
 *
 *   - 上：reference（垂直、中央位置、ズレなし）。タップ不可（disabled）、
 *         `dimOnDisabled={false}` で視覚は維持。SR からは「基準パッチ（タップ不可）」。
 *   - 下：左右 2 個のテストパッチ。一方は reference と整列（offset=0）、もう一方は
 *         `paramOffsetArcmin` 分横ズレ。`ImageChoiceCell` でラップして直接タップ回答（radio）。
 *
 * 旧 `VernierStackStimulus`（reference 上 + 下に 1 個のズレパッチ）は G-11 のみで
 * 使われていたが、後方互換のために残置（G11ResultScreen など）。本コンポーネントは
 * Sprint 21 直接選択化のために G-11 専用に新規作成。
 *
 * 採点後の正解ハイライト（screens.md §9.6）：
 *   `highlightSide`（'left' / 'right'）を渡すと該当側のテストパッチを 1.5 秒間
 *   scale(1→1.18→1) で拡大ハイライトする。reduced-motion 時は瞬時表示。
 *
 * staircase 値・採点ロジック・閾値計算は不変（paramOffsetArcmin の magnitude が difficulty）。
 */

import React from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { GaborPatch } from '../../GaborPatch';
import { ImageChoiceCell } from '../ImageChoiceCell';
import { G11GaborSpec } from '../../../lib/v11/g11Trial';
import { ViewingDistanceCm } from '../../../lib/calibration';
import { usePrefersReducedMotion } from '../../../lib/motion';
import { palette } from '../../../theme/tokens';

export type G11SelectableSide = 'left' | 'right';

export type G11VernierStimulusProps = {
  /** 上 reference spec（タップ不可、視覚維持、ズレなし） */
  upper: G11GaborSpec;
  /** 下 左テストパッチ spec */
  lowerLeft: G11GaborSpec;
  /** 下 右テストパッチ spec */
  lowerRight: G11GaborSpec;
  /** 各パッチの辺長（px） */
  patchSizePx: number;
  /** reference と下部 2 パッチの上下ギャップ（px） */
  gapPx: number;
  /** 下部 2 パッチの左右ギャップ。省略時は gapPx と同じ */
  bottomGapPx?: number;
  /** 「ズレている側」のパッチに適用する水平 px オフセット（符号付き）。
   *  正解側（correctSide）には 0、もう一方の側にこの値を適用する。 */
  shiftedSideOffsetPx: number;
  /** 下部のうち正解側（= reference と整列している側、ズレ 0） */
  correctSide: G11SelectableSide;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /** 現在の選択（null = 未選択） */
  selectedSide: G11SelectableSide | null;
  /** 再タップで解除、別タップで切替（本コンポーネント内で実装） */
  onSelectSide: (next: G11SelectableSide | null) => void;
  /** プレイ中 false / 結果表示中 true。下部パッチがタップ抑止される */
  disabled?: boolean;
  /** 採点後の正解ハイライト（'left' / 'right' で対応側パッチを 1.5 秒拡大） */
  highlightSide?: G11SelectableSide | null;
  /** ハイライト演出の長さ（ms、デフォルト 1500ms）。テスト用 */
  highlightDurationMs?: number;
  /** ハイライト演出ピーク倍率（デフォルト 1.18）。テスト用 */
  highlightPeakScale?: number;
  /** radiogroup 全体の aria-label */
  groupAriaLabel?: string;
  /** 左テストパッチの aria-label */
  leftAriaLabel?: string;
  /** 右テストパッチの aria-label */
  rightAriaLabel?: string;
  /** 各セルの data-target-id（ResultOverlay の MarkBadge 配置用） */
  leftDataTargetId?: string;
  rightDataTargetId?: string;
  testId?: string;
};

const DEFAULT_HIGHLIGHT_DURATION_MS = 1500;
const DEFAULT_HIGHLIGHT_PEAK_SCALE = 1.18;

const DEFAULT_LEFT_ARIA_LABEL = '下のテストパッチ 左';
const DEFAULT_RIGHT_ARIA_LABEL = '下のテストパッチ 右';
const DEFAULT_GROUP_ARIA_LABEL =
  '下のテストパッチ（上の基準と整列している側を選んでください）';

export const G11VernierStimulus: React.FC<G11VernierStimulusProps> = ({
  upper,
  lowerLeft,
  lowerRight,
  patchSizePx,
  gapPx,
  bottomGapPx,
  shiftedSideOffsetPx,
  correctSide,
  viewingDistanceCm,
  dpi,
  selectedSide,
  onSelectSide,
  disabled,
  highlightSide,
  highlightDurationMs = DEFAULT_HIGHLIGHT_DURATION_MS,
  highlightPeakScale = DEFAULT_HIGHLIGHT_PEAK_SCALE,
  groupAriaLabel,
  leftAriaLabel,
  rightAriaLabel,
  leftDataTargetId,
  rightDataTargetId,
  testId,
}) => {
  const reducedMotion = usePrefersReducedMotion();

  const handleToggle = React.useCallback(
    (side: G11SelectableSide) => {
      if (selectedSide === side) {
        onSelectSide(null);
      } else {
        onSelectSide(side);
      }
    },
    [selectedSide, onSelectSide],
  );

  // scale アニメーション値（左右 2 つ独立）
  const leftScale = React.useRef(new Animated.Value(1)).current;
  const rightScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!highlightSide) return;
    const target = highlightSide === 'left' ? leftScale : rightScale;
    if (reducedMotion) {
      target.setValue(1);
      return;
    }
    const half = highlightDurationMs / 2;
    target.setValue(1);
    Animated.sequence([
      Animated.timing(target, {
        toValue: highlightPeakScale,
        duration: half,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(target, {
        toValue: 1,
        duration: half,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    return () => {
      target.stopAnimation();
    };
  }, [
    highlightSide,
    reducedMotion,
    highlightDurationMs,
    highlightPeakScale,
    leftScale,
    rightScale,
  ]);

  const containerStyle: ViewStyle = {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gabor.bg,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: gapPx,
  };

  const renderTestPatch = (side: G11SelectableSide, spec: G11GaborSpec) => {
    const isLeft = side === 'left';
    const isSelected =
      selectedSide === side || (highlightSide ?? null) === side;
    const ariaLabel = isLeft
      ? (leftAriaLabel ?? DEFAULT_LEFT_ARIA_LABEL)
      : (rightAriaLabel ?? DEFAULT_RIGHT_ARIA_LABEL);
    const scaleValue = isLeft ? leftScale : rightScale;
    const dataTargetId = isLeft
      ? (leftDataTargetId ?? 'g11-test-left')
      : (rightDataTargetId ?? 'g11-test-right');
    // 「正解側（reference と整列）」には offset=0、もう一方は shiftedSideOffsetPx
    const offsetPx = side === correctSide ? 0 : shiftedSideOffsetPx;

    return (
      <Animated.View
        style={{
          transform: [{ scale: scaleValue }, { translateX: offsetPx }],
        }}
        testID={`${testId ?? 'g11-stimulus'}-test-${side}-anim`}
      >
        <ImageChoiceCell
          id={`test-${side}`}
          isSelected={isSelected}
          onToggle={() => handleToggle(side)}
          ariaLabel={ariaLabel}
          cellSizePx={patchSizePx}
          role="radio"
          disabled={disabled}
          dimOnDisabled={false}
          dataTargetId={dataTargetId}
          testId={`${testId ?? 'g11-stimulus'}-test-${side}`}
        >
          <GaborPatch
            {...spec}
            sizePx={patchSizePx - 8}
            viewingDistanceCm={viewingDistanceCm}
            dpi={dpi}
            ariaLabel={isLeft ? '下の左の縞模様' : '下の右の縞模様'}
          />
        </ImageChoiceCell>
      </Animated.View>
    );
  };

  return (
    <View
      style={containerStyle}
      testID={testId ?? 'g11-stimulus'}
      accessibilityRole="radiogroup"
      accessibilityLabel={groupAriaLabel ?? DEFAULT_GROUP_ARIA_LABEL}
    >
      {/* 上 reference：disabled + dimOnDisabled=false で視覚維持。
          aria-disabled で「選択不能」を表現。data-target-id は付けない（marks 対象外）。 */}
      <View
        style={{
          width: patchSizePx,
          height: patchSizePx,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.gabor.bg,
        }}
        testID={`${testId ?? 'g11-stimulus'}-reference`}
      >
        <ImageChoiceCell
          id="reference"
          isSelected={false}
          onToggle={() => {}}
          ariaLabel="上の基準パッチ（タップ不可）"
          cellSizePx={patchSizePx}
          role="radio"
          disabled
          dimOnDisabled={false}
          testId={`${testId ?? 'g11-stimulus'}-reference-cell`}
        >
          <GaborPatch
            {...upper}
            sizePx={patchSizePx - 8}
            viewingDistanceCm={viewingDistanceCm}
            dpi={dpi}
            ariaLabel="上の基準パッチ"
          />
        </ImageChoiceCell>
      </View>

      {/* 下 左右 2 テストパッチ */}
      <View
        style={[
          stylesBottomRow.container,
          { gap: bottomGapPx ?? gapPx },
        ]}
        testID={`${testId ?? 'g11-stimulus'}-bottom-row`}
      >
        {renderTestPatch('left', lowerLeft)}
        {renderTestPatch('right', lowerRight)}
      </View>
    </View>
  );
};

const stylesBottomRow = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gabor.bg,
  },
});
