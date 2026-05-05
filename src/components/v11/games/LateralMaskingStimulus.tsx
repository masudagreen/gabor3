/**
 * LateralMaskingStimulus — GE-09（components.md §15、screens.md S15-05）。
 *
 * G-09 側方マスキングの注視領域。横一列に「flanker | target | flanker」3 ガボールを
 * 60 秒同時提示する（マスクなし、点滅なし、フェードなし）。
 *
 * spec-v11.md §7.9 / Polat 系：
 *   - 中央 target：低コントラスト（staircase 連動）、向きは vertical / horizontal
 *   - 両側 flanker：高コントラスト 0.5、垂直 90° 平行
 *   - target-flanker spacing：target 直径の N 倍（staircase 連動）
 *
 * a11y（components.md §15.GE-09）：
 *   - 中央 target を ImageChoiceCell（disabled、SR 対象外）でラップして黄ハイライトを
 *     描画できるようにする
 *   - 左右 flanker は accessibilityElementsHidden（spec §7.9 SR 非到達）
 *   - 回答は AnswerChoiceGroup の 2 ボタン（「縦寄り」「横寄り」）が radio source
 *
 * 採点後の正解ハイライト（screens.md S15-06 §3）：
 *   highlightOrientation を渡したとき、中央 target を 1.5 秒間 scale(1→1.18→1) で
 *   拡大表示する。reduced-motion 時は瞬時表示。
 *
 * Sprint 15 修正ラウンド 2:
 *   - Critical：中央 target に `dimOnDisabled={false}` を渡し、disabled でも opacity=1
 *     を維持。spec §7.9 Polat 2004/2012 の臨床根拠を支える target コントラスト
 *     （staircase 0.05〜0.20）が描画前に opacity 0.5 で半減する破綻を解消。
 *   - Minor：プレイ中（selectedOrientation != null）に黄ハイライト枠が出ていた問題を修正。
 *     `isSelected` を `highlightOrientation != null` のみで判定し、回答選択中は枠なし。
 *     screens.md S15-05 のプレイ画面はハイライト記号なし、S15-06 結果のみ
 *     「[▦|▦] 中央拡大ハイライト」が描画される設計通りに揃える。
 */

import React from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import { GaborPatch } from '../../GaborPatch';
import { ImageChoiceCell } from '../ImageChoiceCell';
import { G09GaborSpec, G09Orientation } from '../../../lib/v11/g09Trial';
import { ViewingDistanceCm } from '../../../lib/calibration';
import { usePrefersReducedMotion } from '../../../lib/motion';
import { palette } from '../../../theme/tokens';

export type LateralMaskingStimulusProps = {
  /** 左 flanker spec（高コン 0.5、垂直） */
  flankerLeft: G09GaborSpec;
  /** 中央 target spec（低コン staircase、向きは vertical/horizontal） */
  target: G09GaborSpec;
  /** 右 flanker spec（高コン 0.5、垂直） */
  flankerRight: G09GaborSpec;
  /** 各パッチの辺長（px） */
  patchSizePx: number;
  /** flanker と target の edge-to-edge ギャップ（px） */
  gapPx: number;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /** 現在の選択（null = 未選択）。target 自体はタップ不可、AnswerChoiceGroup から伝達 */
  selectedOrientation: G09Orientation | null;
  /** 採点後のハイライト方向（target を 1.5 秒拡大） */
  highlightOrientation?: G09Orientation | null;
  /** ハイライト演出の長さ（ms、デフォルト 1500ms）。テスト用 */
  highlightDurationMs?: number;
  /** ハイライト演出ピーク倍率（デフォルト 1.18）。テスト用 */
  highlightPeakScale?: number;
  /**
   * v1.1.1（Sprint 20 ラウンド 3）：中央 target セルの `data-target-id` 属性を
   * `${dataTargetIdPrefix}-${correctOrientation}` 形式で付与する。
   * `resultMarks.ts` の `buildG09Marks` が `g09-${orientation}` を出すため、
   * `dataTargetIdPrefix='g09'` + `correctOrientation` を別 prop で渡す形にしている。
   * 仕様上、target 自体は 1 個しかなく、ResultOverlay が ◯/✕ を重畳する位置は
   * その target の中心（正解 / 誤答どちらでも同じ場所、`buildG09Marks` 出力に応じて
   * 該当 targetId を 1 個だけ DOM に出せば一致する）。
   */
  dataTargetId?: string;
  testId?: string;
};

const DEFAULT_HIGHLIGHT_DURATION_MS = 1500;
const DEFAULT_HIGHLIGHT_PEAK_SCALE = 1.18;

export const LateralMaskingStimulus: React.FC<LateralMaskingStimulusProps> = ({
  flankerLeft,
  target,
  flankerRight,
  patchSizePx,
  gapPx,
  viewingDistanceCm,
  dpi,
  selectedOrientation,
  highlightOrientation,
  highlightDurationMs = DEFAULT_HIGHLIGHT_DURATION_MS,
  highlightPeakScale = DEFAULT_HIGHLIGHT_PEAK_SCALE,
  dataTargetId,
  testId,
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const targetScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!highlightOrientation) return;
    if (reducedMotion) {
      targetScale.setValue(1);
      return;
    }
    const half = highlightDurationMs / 2;
    targetScale.setValue(1);
    Animated.sequence([
      Animated.timing(targetScale, {
        toValue: highlightPeakScale,
        duration: half,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(targetScale, {
        toValue: 1,
        duration: half,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    return () => {
      targetScale.stopAnimation();
    };
  }, [
    highlightOrientation,
    reducedMotion,
    highlightDurationMs,
    highlightPeakScale,
    targetScale,
  ]);

  // 中央 target の黄ハイライト枠は採点後（highlightOrientation 指定時）のみ描画。
  // プレイ中の回答選択フィードバックは AnswerChoiceGroup 側のボタン状態で十分。
  // screens.md S15-05 / S15-06 通り「プレイ中はハイライトなし、結果のみ拡大ハイライト」。
  // selectedOrientation はここでは枠表示判定に使わない（Sprint 15 round-2 Minor 修正）。
  void selectedOrientation;
  const isTargetSelected = highlightOrientation != null;

  const baseId = testId ?? 'lateral-masking-stimulus';

  /** flanker：accessibilityElementsHidden 配下（SR 非到達） */
  const renderFlanker = (
    spec: G09GaborSpec,
    side: 'left' | 'right',
  ): React.ReactNode => (
    <View
      style={{
        width: patchSizePx,
        height: patchSizePx,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.gabor.bg,
      }}
      testID={`${baseId}-flanker-${side}`}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID={`${baseId}-flanker-${side}-inner`}
      >
        <GaborPatch
          {...spec}
          sizePx={patchSizePx - 8}
          viewingDistanceCm={viewingDistanceCm}
          dpi={dpi}
          ariaLabel={
            side === 'left'
              ? '左の flanker（読み上げ対象外）'
              : '右の flanker（読み上げ対象外）'
          }
        />
      </View>
    </View>
  );

  return (
    <View
      style={[styles.container, { gap: gapPx }]}
      testID={baseId}
    >
      {renderFlanker(flankerLeft, 'left')}

      {/* 中央 target：ImageChoiceCell（disabled）。タップ不可、SR 非到達 */}
      <Animated.View
        style={{ transform: [{ scale: targetScale }] }}
        testID={`${baseId}-target-anim`}
      >
        <ImageChoiceCell
          id="target"
          isSelected={isTargetSelected}
          onToggle={() => {}}
          ariaLabel="中央の target（読み上げ対象外）"
          cellSizePx={patchSizePx}
          role="radio"
          disabled
          dimOnDisabled={false}
          dataTargetId={dataTargetId}
          testId={`${baseId}-target`}
        >
          <GaborPatch
            {...target}
            sizePx={patchSizePx - 8}
            viewingDistanceCm={viewingDistanceCm}
            dpi={dpi}
            ariaLabel="中央の縞模様"
          />
        </ImageChoiceCell>
      </Animated.View>

      {renderFlanker(flankerRight, 'right')}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gabor.bg, // #808080 固定
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexWrap: 'nowrap',
  },
});
