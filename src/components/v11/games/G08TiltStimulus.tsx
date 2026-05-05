/**
 * G08TiltStimulus — GE-08 v1.1.1（components.md §15、screens.md S20-G08-PLAY）。
 *
 * v1.1.1（Sprint 20-C）改訂版の G-08 残像方位弁別の注視領域。
 *
 *   - 上：adapter（傾き 20° 固定、高コントラスト）。タップ不可（disabled）、
 *         `dimOnDisabled={false}` で視覚は維持。
 *   - 下：左右 2 個のテストパッチ（±絶対角度で対称配置）。`ImageChoiceCell` で
 *         ラップして直接タップ回答（radio）。
 *
 * 旧 `VerticalStackStimulus`（adapter 上 + 下に 1 個）は G-08 のみで使われていたが、
 * 後方互換のために残置。本コンポーネントは G-08 専用の新規派生。
 *
 * 採点後の正解ハイライト（screens.md §6）：
 *   `highlightSide`（'left' / 'right'）を渡すと該当側のテストパッチを 1.5 秒間
 *   scale(1→1.18→1) で拡大ハイライトする。reduced-motion 時は瞬時表示。
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
import { G08GaborSpec } from '../../../lib/v11/g08Trial';
import { ViewingDistanceCm } from '../../../lib/calibration';
import { usePrefersReducedMotion } from '../../../lib/motion';
import { palette } from '../../../theme/tokens';

export type G08SelectableSide = 'left' | 'right';

export type G08TiltStimulusProps = {
  /** 上 adapter spec（タップ不可、視覚維持） */
  adapter: G08GaborSpec;
  /** 下 左テストパッチ spec */
  testLeft: G08GaborSpec;
  /** 下 右テストパッチ spec */
  testRight: G08GaborSpec;
  /** 各パッチの辺長（px） */
  patchSizePx: number;
  /** adapter と下部 2 パッチの上下ギャップ（px） */
  gapPx: number;
  /** 下部 2 パッチの左右ギャップ。省略時は gapPx と同じ */
  bottomGapPx?: number;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /** 現在の選択（null = 未選択） */
  selectedSide: G08SelectableSide | null;
  /** 再タップで解除、別タップで切替（本コンポーネント内で実装） */
  onSelectSide: (next: G08SelectableSide | null) => void;
  /** プレイ中 false / 結果表示中 true。下部パッチがタップ抑止される */
  disabled?: boolean;
  /** 採点後の正解ハイライト（'left' / 'right' で対応側パッチを 1.5 秒拡大） */
  highlightSide?: G08SelectableSide | null;
  /** ハイライト演出の長さ（ms、デフォルト 1500ms）。テスト用 */
  highlightDurationMs?: number;
  /** ハイライト演出ピーク倍率（デフォルト 1.18）。テスト用 */
  highlightPeakScale?: number;
  /** radiogroup 全体の aria-label */
  groupAriaLabel?: string;
  /** 左パッチの aria-label */
  leftAriaLabel?: string;
  /** 右パッチの aria-label */
  rightAriaLabel?: string;
  /** 各セルの data-target-id（ResultOverlay の MarkBadge 配置用） */
  leftDataTargetId?: string;
  rightDataTargetId?: string;
  testId?: string;
};

const DEFAULT_HIGHLIGHT_DURATION_MS = 1500;
const DEFAULT_HIGHLIGHT_PEAK_SCALE = 1.18;

const DEFAULT_LEFT_ARIA_LABEL = '下の左の縞模様';
const DEFAULT_RIGHT_ARIA_LABEL = '下の右の縞模様';
const DEFAULT_GROUP_ARIA_LABEL =
  '下の左右の縞模様（出題方向に近いパッチを選んでください）';

export const G08TiltStimulus: React.FC<G08TiltStimulusProps> = ({
  adapter,
  testLeft,
  testRight,
  patchSizePx,
  gapPx,
  bottomGapPx,
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
    (side: G08SelectableSide) => {
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

  const renderTestPatch = (side: G08SelectableSide, spec: G08GaborSpec) => {
    const isLeft = side === 'left';
    // selectedSide / highlightSide のどちらかが該当側なら枠を出す（プレイ中
    // は selectedSide で枠 2px、結果開示中は highlightSide で拡大演出 + 枠）。
    const isSelected =
      selectedSide === side || (highlightSide ?? null) === side;
    const ariaLabel = isLeft
      ? (leftAriaLabel ?? DEFAULT_LEFT_ARIA_LABEL)
      : (rightAriaLabel ?? DEFAULT_RIGHT_ARIA_LABEL);
    const scaleValue = isLeft ? leftScale : rightScale;
    const dataTargetId = isLeft
      ? (leftDataTargetId ?? 'g08-test-left')
      : (rightDataTargetId ?? 'g08-test-right');

    return (
      <Animated.View
        style={{ transform: [{ scale: scaleValue }] }}
        testID={`${testId ?? 'g08-stimulus'}-test-${side}-anim`}
      >
        <ImageChoiceCell
          id={`test-${side}`}
          isSelected={isSelected}
          onToggle={() => handleToggle(side)}
          ariaLabel={ariaLabel}
          cellSizePx={patchSizePx}
          role="radio"
          disabled={disabled}
          // 結果画面で disabled=true でも視覚は維持（spec §7.8 刺激パラメータ忠実性）
          dimOnDisabled={false}
          dataTargetId={dataTargetId}
          testId={`${testId ?? 'g08-stimulus'}-test-${side}`}
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
      testID={testId ?? 'g08-stimulus'}
      accessibilityRole="radiogroup"
      accessibilityLabel={groupAriaLabel ?? DEFAULT_GROUP_ARIA_LABEL}
    >
      {/* 上 adapter：disabled + dimOnDisabled=false で視覚維持。
          ImageChoiceCell の disabled が aria-disabled を設定し、SR からは
          「選択対象外」と伝わる。radiogroup 配下に置くが accessibilityElementsHidden
          は使わず（テストや SR からセル自体には到達できる）、aria-disabled で
          「選択不能」を表現する。 */}
      <View
        style={{
          width: patchSizePx,
          height: patchSizePx,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.gabor.bg,
        }}
        testID={`${testId ?? 'g08-stimulus'}-adapter`}
      >
        <ImageChoiceCell
          id="adapter"
          isSelected={false}
          onToggle={() => {}}
          ariaLabel="上の adapter（参照用、選択対象外）"
          cellSizePx={patchSizePx}
          role="radio"
          disabled
          dimOnDisabled={false}
          dataTargetId="g08-adapter"
          testId={`${testId ?? 'g08-stimulus'}-adapter-cell`}
        >
          <GaborPatch
            {...adapter}
            sizePx={patchSizePx - 8}
            viewingDistanceCm={viewingDistanceCm}
            dpi={dpi}
            ariaLabel="上の adapter"
          />
        </ImageChoiceCell>
      </View>

      {/* 下 左右 2 テストパッチ */}
      <View
        style={[
          stylesBottomRow.container,
          { gap: bottomGapPx ?? gapPx },
        ]}
        testID={`${testId ?? 'g08-stimulus'}-bottom-row`}
      >
        {renderTestPatch('left', testLeft)}
        {renderTestPatch('right', testRight)}
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
