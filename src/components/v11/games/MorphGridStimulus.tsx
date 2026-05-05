/**
 * MorphGridStimulus — GE-01（components.md §15、screens.md S9-02）。
 *
 * G-01 変化察知の注視領域。3×3〜5×5 グリッドのガボールパッチを 60 秒間モーフィング
 * 表示する。各セルは ImageChoiceCell でラップし、タップで選択トグル（複数可）。
 *
 * v1 の `GaborGrid` を参照しつつ、v1.1 では：
 *   - ImageChoiceCell を介して選択 UI を分離
 *   - 採点後の正解ハイライトは ResultSummaryV11 側で別レイアウトで開示するため
 *     本コンポーネントでは不要（screens.md §3）
 *   - prefers-reduced-motion 時は 5 段階階段状モーフィング
 *
 * 親コンポーネント（G01ChangeDetectScreen）が timer 管理をする。本コンポーネントは
 * `progress`（0〜1）を受け取って描画するのみ（テスト容易性）。
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GaborPatch } from '../../GaborPatch';
import { ImageChoiceCell } from '../ImageChoiceCell';
import {
  Game1PatchSpec,
  interpolateOrientation,
} from '../../../lib/game1';
import { spacing } from '../../../theme/tokens';
import { ViewingDistanceCm } from '../../../lib/calibration';

export type MorphGridStimulusProps = {
  rows: 3 | 4 | 5;
  cols: 3 | 4 | 5;
  patches: Game1PatchSpec[];
  /** 0〜1 のモーフィング進行率（reduced 時は親が階段化して渡す） */
  progress: number;
  selectedIds: ReadonlyArray<string>;
  onTogglePatch: (id: string) => void;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /** グリッド全体辺の最大値（px、親が viewport 計算結果を渡す） */
  maxSizePx: number;
  disabled?: boolean;
  /**
   * v1.1.1（Sprint 20 ラウンド 3）：各セルの `data-target-id` 属性を
   * `${dataTargetIdPrefix}-${patch.id}` 形式で生成する。`resultMarks.ts` の
   * `buildG01Marks` が `g01-${patch.id}` を出すため、G-01 では `g01` を渡す。
   * 省略時は付与しない（既存テストの後方互換）。
   */
  dataTargetIdPrefix?: string;
  testId?: string;
};

const CELL_GAP = spacing.s2; // 8px

export const MorphGridStimulus: React.FC<MorphGridStimulusProps> = ({
  rows,
  cols,
  patches,
  progress,
  selectedIds,
  onTogglePatch,
  viewingDistanceCm,
  dpi,
  maxSizePx,
  disabled,
  dataTargetIdPrefix,
  testId,
}) => {
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  // セル辺長：components.md §15 / OPT-2（最小 56px）
  const totalCols = Math.max(rows, cols);
  const rawCellSize = Math.floor(
    (maxSizePx - CELL_GAP * (totalCols - 1)) / totalCols,
  );
  const cellSize = Math.max(56, rawCellSize);
  const patchSize = Math.max(48, cellSize - 8);

  return (
    <View
      style={styles.grid}
      testID={testId ?? 'morph-grid-stimulus'}
      accessibilityLabel={`${rows} 行 ${cols} 列のガボールパッチ。動いていると思うパッチをタップしてください`}
      accessibilityRole="none"
    >
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: cols }, (_, c) => {
            const patch = patches.find((p) => p.row === r && p.col === c);
            if (!patch) {
              return (
                <View
                  key={`${r}-${c}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    marginRight: c < cols - 1 ? CELL_GAP : 0,
                    marginBottom: r < rows - 1 ? CELL_GAP : 0,
                  }}
                />
              );
            }
            const isSelected = selectedSet.has(patch.id);
            const orientation = interpolateOrientation(patch, progress);
            return (
              <View
                key={patch.id}
                style={{
                  marginRight: c < cols - 1 ? CELL_GAP : 0,
                  marginBottom: r < rows - 1 ? CELL_GAP : 0,
                }}
              >
                <ImageChoiceCell
                  id={patch.id}
                  isSelected={isSelected}
                  onToggle={() => onTogglePatch(patch.id)}
                  ariaLabel={`縞模様 ${patch.row + 1} 行 ${patch.col + 1} 列`}
                  cellSizePx={cellSize}
                  disabled={disabled}
                  dataTargetId={
                    dataTargetIdPrefix
                      ? `${dataTargetIdPrefix}-${patch.id}`
                      : undefined
                  }
                  testId={`morph-grid-cell-${patch.id}`}
                >
                  <GaborPatch
                    cpd={patch.cpd}
                    contrast={patch.contrast}
                    orientationDeg={orientation}
                    phaseRad={0}
                    sigmaDeg={patch.sigmaDeg}
                    sizePx={patchSize}
                    viewingDistanceCm={viewingDistanceCm}
                    dpi={dpi}
                    ariaLabel={`縞模様 ${patch.row + 1}-${patch.col + 1}`}
                  />
                </ImageChoiceCell>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
});
