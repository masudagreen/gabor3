/**
 * GaborGridStimulus — GE-07（components.md §15、screens.md S14-05）。
 *
 * G-07 ガボールエッジ検出の注視領域。4×4 = 16 個のガボールパッチを 60 秒間ずっと
 * 表示する（マスクなし、点滅なし、フェードなし）。各セルは ImageChoiceCell で
 * ラップして checkbox 動作（複数選択可、再タップで解除）。
 *
 * spec-v11.md §7.7：
 *   - 16 個のうち 3 個が同じ向き・同一線上に並ぶ「線」を構成
 *   - ユーザーは「線」を構成する 3 パッチを全て選んで正解
 *   - 1 個でも誤りや欠落で不正解
 *
 * a11y（components.md §4 / §15.GE-07）：
 *   - 各セル `role="checkbox"` + `aria-checked` 動的更新
 *   - 16 セルすべて Tab で辿れる、Space / Enter で選択トグル
 *   - 採点後の正解開示（highlightIds）：3 セルを 1.5 秒拡大ハイライト
 *
 * Sprint 14 修正：highlightIds を渡されたとき、該当セルを 1.5 秒間
 * scale(1→1.18→1) で拡大表示する。reduced-motion 時は瞬時表示。
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
import { G07PatchSpec } from '../../../lib/v11/g07Trial';
import { ViewingDistanceCm } from '../../../lib/calibration';
import { usePrefersReducedMotion } from '../../../lib/motion';
import { palette } from '../../../theme/tokens';

export type GaborGridStimulusProps = {
  /** 16 パッチの spec（4×4 = row 0〜3, col 0〜3） */
  patches: ReadonlyArray<G07PatchSpec>;
  /** セル一辺（px）。computeG07GridLayout の cellSizePx を渡す */
  cellSizePx: number;
  /** セル間ギャップ（px）。computeG07GridLayout の gapPx を渡す */
  gapPx: number;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /** 現在ユーザーが選択中のセル ID 集合（順序問わず、複数可） */
  selectedIds: ReadonlyArray<string>;
  /** セルがタップされたとき呼ばれる。再タップで解除は本コンポーネント内でハンドリング済 */
  onToggleCell: (id: string) => void;
  disabled?: boolean;
  /**
   * 採点後の正解ハイライト（screens.md S14-06 §3）。
   * ID 配列を渡すと該当セルを 1.5 秒間 scale(1→1.18→1) で拡大表示。
   * reduced-motion 時は瞬時表示（duration 0、scale=1 のまま黄 4px 枠のみ）。
   */
  highlightIds?: ReadonlyArray<string>;
  /** ハイライト演出の長さ（ms、デフォルト 1500ms）。テスト用 */
  highlightDurationMs?: number;
  /** ハイライト演出ピーク倍率（デフォルト 1.18）。テスト用 */
  highlightPeakScale?: number;
  /** グループ全体の aria-label（screens.md S14-05 §a11y） */
  groupAriaLabel?: string;
  /**
   * v1.1.1（Sprint 20 ラウンド 3）：各セルの `data-target-id` 属性を
   * `${dataTargetIdPrefix}-${cellId}` 形式で付与する。`resultMarks.ts` の
   * `buildG07Marks` が `g07-${cellId}`（cellId = 'r0c0' 等）を出すため、
   * G-07 では `g07` を渡す。省略時は付与しない。
   */
  dataTargetIdPrefix?: string;
  testId?: string;
};

const DEFAULT_HIGHLIGHT_DURATION_MS = 1500;
const DEFAULT_HIGHLIGHT_PEAK_SCALE = 1.18;
const DEFAULT_GROUP_ARIA_LABEL =
  '4×4 のガボールパッチ盤面。同じ向きで一直線に並ぶ 3 個を全て選んでください';

export const GaborGridStimulus: React.FC<GaborGridStimulusProps> = ({
  patches,
  cellSizePx,
  gapPx,
  viewingDistanceCm,
  dpi,
  selectedIds,
  onToggleCell,
  disabled,
  highlightIds,
  highlightDurationMs = DEFAULT_HIGHLIGHT_DURATION_MS,
  highlightPeakScale = DEFAULT_HIGHLIGHT_PEAK_SCALE,
  groupAriaLabel,
  dataTargetIdPrefix,
  testId,
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const highlightSet = React.useMemo(
    () => new Set(highlightIds ?? []),
    [highlightIds],
  );

  // 各セル独立の Animated.Value（map）。マウント時に 16 個分作って使い回す。
  const scalesRef = React.useRef<Map<string, Animated.Value>>(new Map());
  const getScale = React.useCallback((id: string) => {
    let v = scalesRef.current.get(id);
    if (!v) {
      v = new Animated.Value(1);
      scalesRef.current.set(id, v);
    }
    return v;
  }, []);

  // highlightIds が変わったら該当セルだけアニメーション
  React.useEffect(() => {
    if (!highlightIds || highlightIds.length === 0) return;
    const stoppers: Array<() => void> = [];
    for (const id of highlightIds) {
      const target = getScale(id);
      if (reducedMotion) {
        target.setValue(1);
        continue;
      }
      const half = highlightDurationMs / 2;
      target.setValue(1);
      const anim = Animated.sequence([
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
      ]);
      anim.start();
      stoppers.push(() => target.stopAnimation());
    }
    return () => {
      for (const stop of stoppers) stop();
    };
  }, [
    highlightIds,
    reducedMotion,
    highlightDurationMs,
    highlightPeakScale,
    getScale,
  ]);

  // 4×4 行優先ソート（patches 順序が崩れていても安全）
  const sorted = React.useMemo(() => {
    return [...patches].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
  }, [patches]);

  return (
    <View
      style={styles.frame}
      testID={testId ?? 'gabor-grid-stimulus'}
      accessibilityRole="none"
      accessibilityLabel={groupAriaLabel ?? DEFAULT_GROUP_ARIA_LABEL}
    >
      {Array.from({ length: 4 }, (_, r) => (
        <View key={r} style={[styles.row, { marginBottom: r < 3 ? gapPx : 0 }]}>
          {Array.from({ length: 4 }, (_, c) => {
            const patch = sorted.find((p) => p.row === r && p.col === c);
            if (!patch) {
              // 想定外。空セルでスペースだけ確保
              return (
                <View
                  key={`${r}-${c}`}
                  style={{
                    width: cellSizePx,
                    height: cellSizePx,
                    marginRight: c < 3 ? gapPx : 0,
                  }}
                />
              );
            }
            const isSelected = selectedSet.has(patch.id);
            const isHighlighted = highlightSet.has(patch.id);
            const scale = getScale(patch.id);
            return (
              <Animated.View
                key={patch.id}
                style={{
                  marginRight: c < 3 ? gapPx : 0,
                  transform: [{ scale }],
                }}
                testID={`g07-cell-${patch.id}-anim`}
              >
                <ImageChoiceCell
                  id={patch.id}
                  isSelected={isSelected || isHighlighted}
                  onToggle={() => onToggleCell(patch.id)}
                  ariaLabel={`縞模様 ${patch.row + 1} 行 ${patch.col + 1} 列`}
                  cellSizePx={cellSizePx}
                  role="checkbox"
                  disabled={disabled}
                  dataTargetId={
                    dataTargetIdPrefix
                      ? `${dataTargetIdPrefix}-${patch.id}`
                      : undefined
                  }
                  testId={`g07-cell-${patch.id}`}
                >
                  <GaborPatch
                    cpd={patch.gabor.cpd}
                    contrast={patch.gabor.contrast}
                    orientationDeg={patch.gabor.orientationDeg}
                    phaseRad={patch.gabor.phaseRad}
                    sigmaDeg={patch.gabor.sigmaDeg}
                    sizePx={Math.max(48, cellSizePx - 8)}
                    viewingDistanceCm={viewingDistanceCm}
                    dpi={dpi}
                    ariaLabel={`縞模様 ${patch.row + 1}-${patch.col + 1}`}
                  />
                </ImageChoiceCell>
              </Animated.View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    backgroundColor: palette.gabor.bg, // #808080 固定（system.md §7）
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
});
