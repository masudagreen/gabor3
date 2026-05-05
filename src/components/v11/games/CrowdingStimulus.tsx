/**
 * CrowdingStimulus — GE-12（components.md §15、screens.md S17-02）。
 *
 * G-12 クラウディングの注視領域。中央 target ガボール + 周囲 6 個の flanker を
 * ヘキサゴン配置で 60 秒同時提示する（マスクなし、点滅なし、フェードなし）。
 *
 * spec-v11.md §7.12 / Levi & Li 2009 / Whitney & Levi 2011：
 *   - 中央 target：staircase 値の向き（垂直 / 水平 / 斜め右 / 斜め左）
 *   - 周囲 flanker 6 個：ランダム向き（target を「のませる」役割）
 *   - target-flanker spacing：target 直径の N 倍（staircase 連動）
 *
 * a11y（components.md §15.GE-12）：
 *   - 中央 target を ImageChoiceCell（disabled、SR 対象外）でラップして黄ハイライト
 *     枠を描画できるようにする（採点後のみ）
 *   - 周囲 6 flanker は accessibilityElementsHidden（spec §7.12 SR 非到達）
 *   - 回答は AnswerChoiceGroup の 4 ボタン（「垂直 / 水平 / 斜め右 / 斜め左」）が
 *     radio source（GamePlaySurface 側）
 *
 * 採点後の正解ハイライト（screens.md S17-03 §3）：
 *   highlightOrientation を渡したとき、中央 target を 1.5 秒間 scale(1→1.18→1) で
 *   拡大表示する。reduced-motion 時は瞬時表示。
 *
 * Sprint 15〜16 教訓：
 *   - 刺激の ImageChoiceCell には必ず `dimOnDisabled={false}`（disabled でも
 *     opacity=1）。プレイ中のハイライト枠は出さない（採点後のみ）。
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
import {
  computeG12FlankerOffsetPx,
  G12FlankerPlacement,
  G12GaborSpec,
  G12Orientation,
} from '../../../lib/v11/g12Trial';
import { ViewingDistanceCm } from '../../../lib/calibration';
import { usePrefersReducedMotion } from '../../../lib/motion';
import { palette } from '../../../theme/tokens';

export type CrowdingStimulusProps = {
  /** 中央 target spec */
  target: G12GaborSpec;
  /** 周囲 flanker 配列（6 個想定、components.md §15 GE-12） */
  flankers: ReadonlyArray<G12GaborSpec>;
  /** 各 flanker の極座標配置（同 index で対応） */
  flankerPlacements: ReadonlyArray<G12FlankerPlacement>;
  /** 各パッチの辺長（px、target も flanker も同一） */
  patchSizePx: number;
  /** stimulus 領域全体の辺長（px）。中心配置のために使う */
  containerSizePx: number;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /** 現在の選択（null = 未選択）。target 自体はタップ不可、AnswerChoiceGroup から伝達 */
  selectedOrientation: G12Orientation | null;
  /** 採点後の正解ハイライト（指定時に target を 1.5 秒拡大） */
  highlightOrientation?: G12Orientation | null;
  /** ハイライト演出の長さ（ms、デフォルト 1500ms）。テスト用 */
  highlightDurationMs?: number;
  /** ハイライト演出ピーク倍率（デフォルト 1.18）。テスト用 */
  highlightPeakScale?: number;
  testId?: string;
};

const DEFAULT_HIGHLIGHT_DURATION_MS = 1500;
const DEFAULT_HIGHLIGHT_PEAK_SCALE = 1.18;

export const CrowdingStimulus: React.FC<CrowdingStimulusProps> = ({
  target,
  flankers,
  flankerPlacements,
  patchSizePx,
  containerSizePx,
  viewingDistanceCm,
  dpi,
  selectedOrientation,
  highlightOrientation,
  highlightDurationMs = DEFAULT_HIGHLIGHT_DURATION_MS,
  highlightPeakScale = DEFAULT_HIGHLIGHT_PEAK_SCALE,
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

  // プレイ中の選択中ハイライト枠は出さず、採点後のみ表示（Sprint 15 教訓）。
  void selectedOrientation;
  const isTargetSelected = highlightOrientation != null;

  const baseId = testId ?? 'crowding-stimulus';

  const cx = containerSizePx / 2;
  const cy = containerSizePx / 2;

  return (
    <View
      style={[
        styles.container,
        { width: containerSizePx, height: containerSizePx },
      ]}
      testID={baseId}
    >
      {/* 周囲 flanker（accessibilityElementsHidden 配下、SR 非到達）*/}
      {flankers.map((spec, i) => {
        const placement = flankerPlacements[i];
        if (!placement) return null;
        const offset = computeG12FlankerOffsetPx(placement, patchSizePx);
        const left = cx + offset.xPx - patchSizePx / 2;
        const top = cy + offset.yPx - patchSizePx / 2;
        return (
          <View
            key={`flanker-${i}`}
            style={{
              position: 'absolute',
              left,
              top,
              width: patchSizePx,
              height: patchSizePx,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.gabor.bg,
            }}
            testID={`${baseId}-flanker-${i}`}
          >
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              testID={`${baseId}-flanker-${i}-inner`}
            >
              <GaborPatch
                {...spec}
                sizePx={patchSizePx - 8}
                viewingDistanceCm={viewingDistanceCm}
                dpi={dpi}
                ariaLabel="周囲の flanker（読み上げ対象外）"
              />
            </View>
          </View>
        );
      })}

      {/* 中央 target：ImageChoiceCell（disabled、SR 非到達） */}
      <Animated.View
        style={{
          position: 'absolute',
          left: cx - patchSizePx / 2,
          top: cy - patchSizePx / 2,
          transform: [{ scale: targetScale }],
        }}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: palette.gabor.bg, // #808080 固定
    alignSelf: 'center',
  },
});
