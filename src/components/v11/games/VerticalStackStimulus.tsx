/**
 * VerticalStackStimulus — GE-08（components.md §15、screens.md S15-02）。
 *
 * G-08 残像方位弁別の注視領域。上下 2 ガボールを 60 秒間同時提示する。
 * 上は adapter（傾き 20° 固定、高コントラスト）、下はテストパッチ（傾き
 * staircase 値 × 方向ランダム）。
 *
 * v1.1 OPT-12 統一（spec §7.8 注記）：
 *   - 60 秒間ずっと表示（点滅・マスク・フェードなし）
 *   - 下テストパッチを ImageChoiceCell でラップしてタップで直接回答可
 *   - 「時計回り」「反時計回り」ボタン（horizontal-2）と併存可
 *   - **adapter は accessibilityElementsHidden 配下で SR 非到達**（spec §7.8）
 *
 * 親コンポーネント（G08TiltAftereffectScreen）は selectedDirection を保持し、
 * onSelectDirection で再タップ解除 / 別タップ切替を実装する（radio）。
 *
 * 採点後の正解ハイライト（screens.md S15-03 §2）：
 *   highlightDirection を渡したとき、下テストパッチを 1.5 秒間 scale(1→1.18→1) で
 *   拡大表示する。reduced-motion 時は瞬時表示（duration 0、scale=1 のまま黄 4px 枠のみ）。
 *
 * Sprint 15 修正ラウンド 2:
 *   - Critical：下テストパッチに `dimOnDisabled={false}` を渡し、disabled でも
 *     opacity=1 を維持。spec §7.8 の test 絶対角度（staircase）が描画前に opacity 0.5
 *     で半減する破綻を解消。
 *   - Minor：プレイ中（selectedDirection != null）に黄ハイライト枠が出ていた問題を修正。
 *     `isSelected` を `highlightDirection != null` のみで判定し、回答選択中は枠なし。
 *     screens.md S15-02 のプレイ画面ではハイライト記号がなく、S15-03 結果画面のみ
 *     「[▦|▦] 黄拡大」が描画される設計通りに揃える。
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
import { G08Direction, G08GaborSpec } from '../../../lib/v11/g08Trial';
import { ViewingDistanceCm } from '../../../lib/calibration';
import { usePrefersReducedMotion } from '../../../lib/motion';
import { palette } from '../../../theme/tokens';

export type VerticalStackStimulusProps = {
  /** 上 adapter spec（タップ不可、SR 非到達） */
  adapter: G08GaborSpec;
  /** 下テストパッチ spec（タップ可、radio） */
  test: G08GaborSpec;
  /** 各パッチの辺長（px） */
  patchSizePx: number;
  /** 上下のギャップ（px） */
  gapPx: number;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /** 現在の選択（null = 未選択） */
  selectedDirection: G08Direction | null;
  /** 再タップで解除、選択肢が cw/ccw ランダム入れ替わる radio：本コンポーネントでは
   * 「下パッチをタップしたとき userAnswer を 'cw' / 'ccw' のどちらに切り替えるか」を
   * 親が指示する形にする。下パッチ自体は単一要素なのでタップ → 親側で次の値を決める。
   * よりシンプルに、ImageChoiceCell の単一トグル動作にして「タップで現在の選択を
   * トグル」させる（cw <-> ccw <-> null）と SR 利用者には不便なので、本コンポーネントは
   * AnswerChoiceGroup のボタンと併用する前提で「下パッチタップは選択操作にしない、
   * ただしフォーカス枠だけ表示」とする。これが GE-02 と異なる点。
   *
   * 結局、a11y 規約を踏襲するため**下テストパッチも ImageChoiceCell で囲み
   * accessibilityElementsHidden 配下に置く**形にする（読み上げ対象は AnswerChoiceGroup
   * の 2 ボタンのみ）。タップは無効（disabled）にする。
   */
  /** 採点後の正解ハイライト（'cw' / 'ccw' で下パッチを 1.5 秒拡大） */
  highlightDirection?: G08Direction | null;
  /** ハイライト演出の長さ（ms、デフォルト 1500ms）。テスト用 */
  highlightDurationMs?: number;
  /** ハイライト演出ピーク倍率（デフォルト 1.18）。テスト用 */
  highlightPeakScale?: number;
  testId?: string;
};

const DEFAULT_HIGHLIGHT_DURATION_MS = 1500;
const DEFAULT_HIGHLIGHT_PEAK_SCALE = 1.18;

export const VerticalStackStimulus: React.FC<VerticalStackStimulusProps> = ({
  adapter,
  test,
  patchSizePx,
  gapPx,
  viewingDistanceCm,
  dpi,
  selectedDirection,
  highlightDirection,
  highlightDurationMs = DEFAULT_HIGHLIGHT_DURATION_MS,
  highlightPeakScale = DEFAULT_HIGHLIGHT_PEAK_SCALE,
  testId,
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const testScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!highlightDirection) return;
    if (reducedMotion) {
      testScale.setValue(1);
      return;
    }
    const half = highlightDurationMs / 2;
    testScale.setValue(1);
    Animated.sequence([
      Animated.timing(testScale, {
        toValue: highlightPeakScale,
        duration: half,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(testScale, {
        toValue: 1,
        duration: half,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    return () => {
      testScale.stopAnimation();
    };
  }, [highlightDirection, reducedMotion, highlightDurationMs, highlightPeakScale, testScale]);

  // 下パッチの黄ハイライト枠は採点後（highlightDirection 指定時）のみ描画。
  // プレイ中の回答選択フィードバックは AnswerChoiceGroup 側のボタン状態で十分。
  // screens.md S15-02 / S15-03 通り「プレイ中はハイライトなし、結果のみ拡大ハイライト」。
  // selectedDirection はここでは枠表示判定に使わない（Sprint 15 round-2 Minor 修正）。
  void selectedDirection;
  const isTestSelected = highlightDirection != null;

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
      testID={testId ?? 'vertical-stack-stimulus'}
    >
      {/* 上 adapter：タップ不可、SR 非到達。視覚的にだけ存在。
          GamePlaySurface 側で stimulus 全体が accessibilityElementsHidden で
          くるまれるので、SR からは到達しない。テスト容易性のため adapter 個別の
          accessibilityElementsHidden は内側 inner ビュー側に置き、外枠 testID
          は queryByTestId で見つけられるようにする。 */}
      <View
        style={{
          width: patchSizePx,
          height: patchSizePx,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.gabor.bg,
        }}
        testID={`${testId ?? 'vertical-stack-stimulus'}-adapter`}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID={`${testId ?? 'vertical-stack-stimulus'}-adapter-inner`}
        >
          <GaborPatch
            {...adapter}
            sizePx={patchSizePx - 8}
            viewingDistanceCm={viewingDistanceCm}
            dpi={dpi}
            ariaLabel="上の adapter（読み上げ対象外）"
          />
        </View>
      </View>

      {/* 下テストパッチ：黄ハイライトはハイライト中のみ。SR は AnswerChoiceGroup を読む */}
      <Animated.View
        style={{ transform: [{ scale: testScale }] }}
        testID={`${testId ?? 'vertical-stack-stimulus'}-test-anim`}
      >
        <ImageChoiceCell
          id="test"
          isSelected={isTestSelected}
          onToggle={() => {}}
          ariaLabel="下のテストパッチ（読み上げ対象外）"
          cellSizePx={patchSizePx}
          role="radio"
          disabled
          dimOnDisabled={false}
          testId={`${testId ?? 'vertical-stack-stimulus'}-test`}
        >
          <GaborPatch
            {...test}
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
