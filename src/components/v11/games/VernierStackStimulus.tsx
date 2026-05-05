/**
 * VernierStackStimulus — GE-11（components.md §15、screens.md S16-05）。
 *
 * G-11 Vernier 整列判定の注視領域。上下 2 ガボールを 60 秒同時提示する。
 * 上は中央位置（reference）、下は staircase 値分 水平にズレる（staircase 連動 arcmin）。
 *
 * spec-v11.md §7.11：
 *   - 上下 2 つの垂直ガボール（共通 cpd / contrast / sigma、垂直方向）
 *   - 下のガボールが水平方向に staircase 値分（arcmin → px 換算後）ズレる
 *   - 60 秒同時提示、確定ボタンなし、自動採点
 *   - 「左にずれている」「右にずれている」の 2 択（horizontal-2 layout）
 *
 * a11y（components.md §15.GE-11）：
 *   - 上は accessibilityElementsHidden（reference 役、SR 非到達）
 *   - 下は ImageChoiceCell（disabled、SR 非到達）でラップして黄ハイライト枠を
 *     描画できるようにする（採点後のみ）。dimOnDisabled={false} で disabled でも
 *     opacity=1（spec §7.11 ハイパーアキュイティ）
 *   - 回答は AnswerChoiceGroup の 2 ボタンが radio source（GamePlaySurface 側）
 *
 * 採点後の正解ハイライト（screens.md S16-06 §3）：
 *   highlightDirection を渡したとき、下パッチを 1.5 秒間 scale(1→1.18→1) で
 *   拡大表示する。reduced-motion 時は瞬時表示。
 *
 * Sprint 16 設計判断（self-review）：
 *   - VerticalStackStimulus（GE-08）は上下とも中央位置で、下パッチ自体に角度が
 *     乗る。一方 GE-11 は両パッチとも垂直で、下パッチの「水平位置」がズレる。
 *     描画責務が異なるため別実装にする
 *   - 下パッチの水平オフセットは `lowerOffsetXPx`（符号付き、左=負 / 右=正）として
 *     親から渡す。算出は g11Trial.computeG11LowerOffsetPx の責務
 *   - Sprint 15 教訓：刺激の ImageChoiceCell には必ず `dimOnDisabled={false}` を
 *     渡す。プレイ中（selectedDirection != null）は枠を出さない。
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
import {
  G11GaborSpec,
  G11OffsetDirection,
} from '../../../lib/v11/g11Trial';
import { ViewingDistanceCm } from '../../../lib/calibration';
import { usePrefersReducedMotion } from '../../../lib/motion';
import { palette } from '../../../theme/tokens';

export type VernierStackStimulusProps = {
  /** 上ガボール spec（垂直、reference 役、タップ不可、SR 非到達） */
  upper: G11GaborSpec;
  /** 下ガボール spec（垂直、水平 lowerOffsetXPx で translateX される） */
  lower: G11GaborSpec;
  /** 各パッチの辺長（px） */
  patchSizePx: number;
  /** 上下のギャップ（px、screens.md §3 GE-11：space.4=16） */
  gapPx: number;
  /**
   * 下パッチの水平オフセット（px、符号付き）。
   * 左 = 負、右 = 正、ズレなし = 0。`computeG11LowerOffsetPx` で算出。
   */
  lowerOffsetXPx: number;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /** 現在の選択（null = 未選択）。下パッチ自体はタップ不可、AnswerChoiceGroup から伝達 */
  selectedDirection: G11OffsetDirection | null;
  /** 採点後の正解ハイライト（'left' / 'right' で下パッチを 1.5 秒拡大） */
  highlightDirection?: G11OffsetDirection | null;
  /** ハイライト演出の長さ（ms、デフォルト 1500ms）。テスト用 */
  highlightDurationMs?: number;
  /** ハイライト演出ピーク倍率（デフォルト 1.18）。テスト用 */
  highlightPeakScale?: number;
  /**
   * v1.1.1（Sprint 20 ラウンド 3）：下パッチの `data-target-id` 属性。
   * `resultMarks.ts` の `buildHorizontalSideMarks({gameId:'g11', ...})` が
   * `g11-${side}` を出すため、PlayScreen / ResultScreen から
   * `g11-${correctDirection}` を渡す（仕様上 lower パッチはひとつ、ResultOverlay
   * は該当 targetId に対する MarkBadge を 1 個だけ重畳する）。
   */
  dataTargetId?: string;
  testId?: string;
};

const DEFAULT_HIGHLIGHT_DURATION_MS = 1500;
const DEFAULT_HIGHLIGHT_PEAK_SCALE = 1.18;

export const VernierStackStimulus: React.FC<VernierStackStimulusProps> = ({
  upper,
  lower,
  patchSizePx,
  gapPx,
  lowerOffsetXPx,
  viewingDistanceCm,
  dpi,
  selectedDirection,
  highlightDirection,
  highlightDurationMs = DEFAULT_HIGHLIGHT_DURATION_MS,
  highlightPeakScale = DEFAULT_HIGHLIGHT_PEAK_SCALE,
  dataTargetId,
  testId,
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const lowerScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!highlightDirection) return;
    if (reducedMotion) {
      lowerScale.setValue(1);
      return;
    }
    const half = highlightDurationMs / 2;
    lowerScale.setValue(1);
    Animated.sequence([
      Animated.timing(lowerScale, {
        toValue: highlightPeakScale,
        duration: half,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(lowerScale, {
        toValue: 1,
        duration: half,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    return () => {
      lowerScale.stopAnimation();
    };
  }, [
    highlightDirection,
    reducedMotion,
    highlightDurationMs,
    highlightPeakScale,
    lowerScale,
  ]);

  // プレイ中の選択中ハイライト枠は出さず、採点後のみ表示（Sprint 15 教訓）。
  void selectedDirection;
  const isLowerSelected = highlightDirection != null;

  const baseId = testId ?? 'vernier-stack-stimulus';

  const containerStyle: ViewStyle = {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gabor.bg, // #808080 固定（system.md §7）
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: gapPx,
  };

  return (
    <View
      style={containerStyle}
      testID={baseId}
    >
      {/* 上 reference：タップ不可、SR 非到達。視覚的にだけ存在 */}
      <View
        style={{
          width: patchSizePx,
          height: patchSizePx,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.gabor.bg,
        }}
        testID={`${baseId}-upper`}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID={`${baseId}-upper-inner`}
        >
          <GaborPatch
            {...upper}
            sizePx={patchSizePx - 8}
            viewingDistanceCm={viewingDistanceCm}
            dpi={dpi}
            ariaLabel="上の reference パッチ（読み上げ対象外）"
          />
        </View>
      </View>

      {/* 下 lower：水平にズレる。translateX で位置をずらし、ImageChoiceCell でラップ */}
      <Animated.View
        style={{
          transform: [
            { translateX: lowerOffsetXPx },
            { scale: lowerScale },
          ],
        }}
        testID={`${baseId}-lower-anim`}
      >
        <ImageChoiceCell
          id="lower"
          isSelected={isLowerSelected}
          onToggle={() => {}}
          ariaLabel="下のパッチ（読み上げ対象外、AnswerChoiceGroup で回答）"
          cellSizePx={patchSizePx}
          role="radio"
          disabled
          dimOnDisabled={false}
          dataTargetId={dataTargetId}
          testId={`${baseId}-lower`}
        >
          <GaborPatch
            {...lower}
            sizePx={patchSizePx - 8}
            viewingDistanceCm={viewingDistanceCm}
            dpi={dpi}
            ariaLabel="下の縞模様"
          />
        </ImageChoiceCell>
      </Animated.View>
    </View>
  );
};

// styles unused export prevention（tsc strict 環境では不要）
const _unused = StyleSheet.create({});
void _unused;
