/**
 * TextureGridStimulus — GE-10（components.md §15、screens.md S16-02）。
 *
 * G-10 テクスチャ分離の注視領域。8×8 = 64 個のガボールパッチを画面いっぱいに
 * 敷き詰めて 60 秒間ずっと表示する（マスクなし、点滅なし、フェードなし）。
 *
 * spec-v11.md §7.10：
 *   - 背景は全パッチが同じ向き
 *   - うち 3×3 = 9 個の領域だけパッチの向きが異なる（target 領域）
 *   - target 領域は 4 象限（左上 / 右上 / 左下 / 右下）のいずれかに配置
 *
 * a11y（components.md §15.GE-10）：
 *   - 8×8 grid 全体は accessibilityElementsHidden（spec §7.10、SR 非到達。
 *     回答は AnswerChoiceGroup の 4 ボタン経由）
 *   - 各セルは ImageChoiceCell でラップしない（タップ対象ではないため OPT-2 例外、
 *     components.md §15 GE-10 注記）。単純な GaborPatch を View で並べる
 *   - GamePlaySurface 側で `accessibilityElementsHidden` でくるまれる前提
 *
 * 採点後の正解ハイライト（screens.md S16-03 §2）：
 *   highlightTargetRegion を渡したとき、target 領域 3×3 = 9 個のパッチを
 *   1.5 秒間 scale(1→1.18→1) で拡大表示し、領域全体を黄 4px 枠で囲む。
 *   reduced-motion 時は瞬時表示。
 *
 * 設計判断（Sprint 16 self-review）：
 *   - 64 個の Animated.Value を作るとパフォーマンスが落ちるため、target 領域
 *     全体をくるむ親 View 1 つだけアニメーションする
 *   - 黄 4px 枠は target 領域全体を囲む親 View に position: absolute で重ねる
 */

import React from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import { GaborPatch } from '../../GaborPatch';
import { G10CellSpec } from '../../../lib/v11/g10Trial';
import { ViewingDistanceCm } from '../../../lib/calibration';
import { usePrefersReducedMotion } from '../../../lib/motion';
import { palette } from '../../../theme/tokens';

export type TextureGridStimulusProps = {
  /** 64 セルの spec（行優先順、cells[r * 8 + c] でアクセス可能） */
  cells: ReadonlyArray<G10CellSpec>;
  /** 1 セル一辺（px）。computeG10GridLayout の cellSizePx を渡す */
  cellSizePx: number;
  /** セル間ギャップ（px、ベタ敷きなら 0） */
  gapPx: number;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /**
   * 採点後の正解ハイライト（screens.md S16-03 §2）。
   * true を渡すと target 領域全体を 1.5 秒拡大表示 + 黄 4px 枠で囲む。
   * false / undefined のときはハイライトなし。
   */
  highlightTargetRegion?: boolean;
  /** ハイライト演出の長さ（ms、デフォルト 1500ms）。テスト用 */
  highlightDurationMs?: number;
  /** ハイライト演出ピーク倍率（デフォルト 1.18）。テスト用 */
  highlightPeakScale?: number;
  testId?: string;
};

const DEFAULT_HIGHLIGHT_DURATION_MS = 1500;
const DEFAULT_HIGHLIGHT_PEAK_SCALE = 1.18;

export const TextureGridStimulus: React.FC<TextureGridStimulusProps> = ({
  cells,
  cellSizePx,
  gapPx,
  viewingDistanceCm,
  dpi,
  highlightTargetRegion,
  highlightDurationMs = DEFAULT_HIGHLIGHT_DURATION_MS,
  highlightPeakScale = DEFAULT_HIGHLIGHT_PEAK_SCALE,
  testId,
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const targetScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!highlightTargetRegion) return;
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
    highlightTargetRegion,
    reducedMotion,
    highlightDurationMs,
    highlightPeakScale,
    targetScale,
  ]);

  const baseId = testId ?? 'texture-grid-stimulus';

  // 8×8 行優先ソート（cells 順序が崩れていても安全）
  const sorted = React.useMemo(() => {
    return [...cells].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
  }, [cells]);

  // target 領域の 3×3 範囲を導出（採点後ハイライト枠の位置計算用）
  const targetRegion = React.useMemo(() => {
    const targets = sorted.filter((c) => c.isTargetMember);
    if (targets.length === 0) return null;
    const minRow = Math.min(...targets.map((t) => t.row));
    const minCol = Math.min(...targets.map((t) => t.col));
    return {
      topLeftRow: minRow,
      topLeftCol: minCol,
    };
  }, [sorted]);

  /**
   * target 領域を囲む拡大ハイライト枠の位置（px）。
   * gridContainer の左上を (0, 0) として算出。
   */
  const highlightFrameStyle = React.useMemo(() => {
    if (!targetRegion) return null;
    const totalCellSize = cellSizePx + gapPx;
    const left = targetRegion.topLeftCol * totalCellSize;
    const top = targetRegion.topLeftRow * totalCellSize;
    const width = cellSizePx * 3 + gapPx * 2;
    const height = cellSizePx * 3 + gapPx * 2;
    return { left, top, width, height };
  }, [targetRegion, cellSizePx, gapPx]);

  // 外枠は SR 隠蔽せず、子の inner（GaborPatch ラッパ）で隠蔽する。
  // GamePlaySurface 側で stimulus 全体が accessibilityElementsHidden に包まれるため
  // 二重保険。テスト容易性のため外枠の testID は queryByTestId で見つけられる。
  return (
    <View
      style={styles.frame}
      testID={baseId}
    >
      {/* 64 セルを描画 */}
      {Array.from({ length: 8 }, (_, r) => (
        <View
          key={r}
          style={[styles.row, { marginBottom: r < 7 ? gapPx : 0 }]}
        >
          {Array.from({ length: 8 }, (_, c) => {
            const cell = sorted.find((p) => p.row === r && p.col === c);
            if (!cell) {
              return (
                <View
                  key={`${r}-${c}`}
                  style={{
                    width: cellSizePx,
                    height: cellSizePx,
                    marginRight: c < 7 ? gapPx : 0,
                  }}
                />
              );
            }
            return (
              <View
                key={`${cell.row}-${cell.col}`}
                style={{
                  width: cellSizePx,
                  height: cellSizePx,
                  marginRight: c < 7 ? gapPx : 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: palette.gabor.bg,
                }}
                testID={`${baseId}-cell-${cell.row}-${cell.col}`}
              >
                {/* 各セルの内部だけ accessibilityElementsHidden で SR 非到達。
                    spec §7.10：8×8 grid 全体は SR 非到達、回答は 4 ボタンのみ */}
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <GaborPatch
                    cpd={cell.gabor.cpd}
                    contrast={cell.gabor.contrast}
                    orientationDeg={cell.gabor.orientationDeg}
                    phaseRad={cell.gabor.phaseRad}
                    sigmaDeg={cell.gabor.sigmaDeg}
                    sizePx={cellSizePx}
                    viewingDistanceCm={viewingDistanceCm}
                    dpi={dpi}
                    ariaLabel={`縞模様 ${cell.row + 1}-${cell.col + 1}`}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ))}

      {/* 採点後のみ：target 領域の 3×3 枠 + アニメ */}
      {highlightTargetRegion && highlightFrameStyle ? (
        <Animated.View
          style={[
            styles.targetFrame,
            highlightFrameStyle,
            { transform: [{ scale: targetScale }] },
            // RN Web 0.19+ では pointerEvents は style 経由が推奨
            { pointerEvents: 'none' },
          ]}
          testID={`${baseId}-target-highlight`}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    backgroundColor: palette.gabor.bg, // #808080 固定（system.md §7）
    padding: 0,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
  },
  targetFrame: {
    position: 'absolute',
    // 黄系の正解開示色（system.md §6、light/dark 共通の highlightCorrect）。
    // light で #FFC53D / dark で #FFD66B。GE-07/08/09 の選択枠と同色系（OPT-9 / a11y）。
    borderColor: palette.light.highlightCorrect,
    borderWidth: 4,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
});
