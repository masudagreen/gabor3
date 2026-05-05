/**
 * SideBySideStimulus — GE-02（components.md §16、screens.md S10-02）。
 *
 * G-02 左右並び傾き判別の注視領域。左右 2 つのガボールを 60 秒間同時提示する。
 *
 * v1 の `SideBySideGabor` を v1.1 OPT-12 統一に沿ってリファクタしたもの：
 *   - 60 秒間ずっと表示（点滅・マスク・フェードなし）
 *   - 中央に固視点 0.5° を表示
 *   - 各パッチを ImageChoiceCell でラップしてタップで直接回答可
 *     （視線をガボールから離さずに済む、Sprint 9 で本実装した M-1 修正後の
 *      動的 aria-checked 動作を活用）
 *   - 「左」/「右」ボタンと併存可（呼び出し側 AnswerChoiceGroup で対応）
 *
 * 親コンポーネント（G02SideBySideTiltScreen）は selectedSide / setSelectedSide
 * を保持する。ImageChoiceCell の onToggle は「再タップで解除（null）／別を押すと切替」
 * を実装する。
 *
 * Sprint 10 修正ラウンド 2 / G-3 修正：
 *   `highlightSide` を渡したとき、該当側パッチを 1.5 秒間 scale(1→1.18→1) で
 *   拡大ハイライトする（screens.md S10-03 §4 / spec-v11.md §7.2）。
 *   prefers-reduced-motion 連動：reduced=true なら瞬時表示（duration 0）に切替。
 *   結果サマリ画面（G02ResultScreen）から呼び出される。
 */

import React from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { GaborPatch } from '../../GaborPatch';
import { ImageChoiceCell } from '../ImageChoiceCell';
import { G02GaborSpec, G02Side } from '../../../lib/v11/g02Trial';
import { ViewingDistanceCm } from '../../../lib/calibration';
import { usePrefersReducedMotion } from '../../../lib/motion';
import { getColors, palette } from '../../../theme/tokens';

/**
 * SideBySideStimulus が受け入れるガボール spec の汎用型。
 *
 * G02GaborSpec の cpd は v1 由来の literal union `1.5 | 3 | 6 | 9` だが、
 * Sprint 13 の G-05 SF 弁別は staircase 比（1.1〜2.0）で連続的に cpd を変える
 * 必要があるため、本コンポーネントの prop 型ではより一般化した `number` を
 * 受け付ける。GaborPatch 自体は元から内部で number を扱うため、
 * 描画ロジックには影響しない（破壊的変更ではない）。
 *
 * G-02 / G-04 で渡される G02GaborSpec / G04GaborSpec は本型と構造的型互換で
 * そのまま受け入れられる。
 */
type StimulusGaborSpec = Omit<G02GaborSpec, 'cpd'> & { cpd: number };

export type SideBySideStimulusProps = {
  /** 左ガボール spec（cpd は number 受け付け、構造的型互換で G02/G04/G05GaborSpec OK） */
  left: StimulusGaborSpec;
  /** 右ガボール spec */
  right: StimulusGaborSpec;
  /** 各パッチの辺長（px） */
  patchSizePx: number;
  /** 左右の間隔（px） */
  gapPx: number;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /** 現在の選択（null = 未選択） */
  selectedSide: G02Side | null;
  /** 再タップで解除、別タップで切替の実装は本コンポーネント内で完結 */
  onSelectSide: (next: G02Side | null) => void;
  disabled?: boolean;
  /**
   * 採点後の正解ハイライト（screens.md S10-03 §4）。
   * 'left' / 'right' を渡すと該当側パッチを 1.5 秒間 scale(1→1.18→1) で拡大表示する。
   * reduced-motion 時は瞬時表示（duration 0、scale=1 のまま黄 4px 枠のみ）。
   */
  highlightSide?: G02Side | null;
  /** ハイライト演出の長さ（ms、デフォルト 1500ms）。テスト用 */
  highlightDurationMs?: number;
  /** ハイライト演出ピーク倍率（デフォルト 1.18）。テスト用 */
  highlightPeakScale?: number;
  /**
   * 左パッチの aria-label を文脈に合わせて差し替える（Sprint 13 改修）。
   * 未指定時は GE-02 既定文面「左の縞模様（タップで「左が時計回り」と回答）」。
   * G-04 / G-05 など他ゲームから再利用するときに、ゲーム文脈に合った文面（例：
   * 「左の縞模様（タップで「左が濃い」と回答）」「左の縞模様（タップで「左が
   * 細かい」と回答）」）を渡せるようにする破壊的変更ではない後方互換 prop。
   * ガボール領域全体は `accessibilityElementsHidden` 配下にあるため SR からは
   * 直接読み上げられないが、将来 SR 解放時の文面整合性のために用意する。
   */
  leftAriaLabel?: string;
  /** 右パッチの aria-label。leftAriaLabel と同じく optional 後方互換 */
  rightAriaLabel?: string;
  /**
   * radiogroup 自体の aria-label を差し替える（Sprint 13 改修）。
   * 未指定時は GE-02 既定文面「左右の縞模様（時計回りに傾いている方を選んでください）」。
   */
  groupAriaLabel?: string;
  /**
   * v1.1.1（Sprint 20-C）：各セルの data-target-id を差し替える。
   * 未指定時は `g02-left` / `g02-right`（screens.md S20-G02-PLAY a11y §3.6 既定）。
   * G-04 / G-05 等から再利用するときに `g04-left` 等を指定可能。
   */
  leftDataTargetId?: string;
  rightDataTargetId?: string;
  /**
   * v1.1.2（Sprint 21）：各セルの testID プレフィックスを差し替える。
   * 未指定時は `g02-stimulus`（後方互換）。G-04 / G-05 / G-06 で直接選択化された
   * 際にゲーム別の testID（例：`g04-stimulus-left`）でテストから参照できるようにする。
   */
  cellTestIdPrefix?: string;
  testId?: string;
};

/** screens.md S10-03 §4：1.5 秒拡大ハイライト */
const DEFAULT_HIGHLIGHT_DURATION_MS = 1500;
const DEFAULT_HIGHLIGHT_PEAK_SCALE = 1.18;

/** GE-02 既定 aria-label（後方互換のため未指定時のフォールバック） */
const DEFAULT_LEFT_ARIA_LABEL = '左の縞模様（タップで「左が時計回り」と回答）';
const DEFAULT_RIGHT_ARIA_LABEL = '右の縞模様（タップで「右が時計回り」と回答）';
const DEFAULT_GROUP_ARIA_LABEL =
  '左右の縞模様（時計回りに傾いている方を選んでください）';

export const SideBySideStimulus: React.FC<SideBySideStimulusProps> = ({
  left,
  right,
  patchSizePx,
  gapPx,
  viewingDistanceCm,
  dpi,
  selectedSide,
  onSelectSide,
  disabled,
  highlightSide,
  highlightDurationMs = DEFAULT_HIGHLIGHT_DURATION_MS,
  highlightPeakScale = DEFAULT_HIGHLIGHT_PEAK_SCALE,
  leftAriaLabel,
  rightAriaLabel,
  groupAriaLabel,
  leftDataTargetId,
  rightDataTargetId,
  cellTestIdPrefix,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const reducedMotion = usePrefersReducedMotion();

  const handleToggle = React.useCallback(
    (side: G02Side) => {
      // 再タップ → 解除、別タップ → 切替
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
      // 瞬時表示：scale は 1 のまま（黄 4px 枠だけで開示）
      target.setValue(1);
      return;
    }
    // 0ms→half scale 1→peak、half→full scale peak→1
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

  const renderPatch = (side: G02Side, spec: StimulusGaborSpec) => {
    const isLeft = side === 'left';
    const isSelected =
      selectedSide === side || (highlightSide ?? null) === side;
    const ariaLabel = isLeft
      ? (leftAriaLabel ?? DEFAULT_LEFT_ARIA_LABEL)
      : (rightAriaLabel ?? DEFAULT_RIGHT_ARIA_LABEL);
    const scaleValue = isLeft ? leftScale : rightScale;
    const dataTargetId = isLeft
      ? (leftDataTargetId ?? 'g02-left')
      : (rightDataTargetId ?? 'g02-right');

    const prefix = cellTestIdPrefix ?? 'g02-stimulus';
    return (
      <Animated.View
        style={{ transform: [{ scale: scaleValue }] }}
        testID={`${prefix}-${side}-anim`}
      >
        <ImageChoiceCell
          id={side}
          isSelected={isSelected}
          onToggle={() => handleToggle(side)}
          ariaLabel={ariaLabel}
          cellSizePx={patchSizePx}
          role="radio"
          disabled={disabled}
          dataTargetId={dataTargetId}
          testId={`${prefix}-${side}`}
        >
          <GaborPatch
            {...spec}
            sizePx={patchSizePx - 8}
            viewingDistanceCm={viewingDistanceCm}
            dpi={dpi}
            ariaLabel={isLeft ? '左の縞模様' : '右の縞模様'}
          />
        </ImageChoiceCell>
      </Animated.View>
    );
  };

  return (
    <View
      style={[styles.container, { gap: gapPx }]}
      testID={testId ?? 'side-by-side-stimulus'}
      accessibilityRole="radiogroup"
      accessibilityLabel={groupAriaLabel ?? DEFAULT_GROUP_ARIA_LABEL}
    >
      {renderPatch('left', left)}
      {/* 中央固視点：装飾用の小さな十字。SR からは隠す */}
      <View
        style={[
          styles.fixation,
          {
            backgroundColor: palette.gabor.bg,
          },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          style={[
            styles.fixationText,
            { color: colors.fgPrimary },
          ]}
        >
          +
        </Text>
      </View>
      {renderPatch('right', right)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gabor.bg, // #808080 固定（system.md §7）
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fixation: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixationText: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
  },
});
