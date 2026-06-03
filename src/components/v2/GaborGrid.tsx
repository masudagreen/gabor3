/**
 * GaborGrid.tsx — GG-1（components.md / F-01）。
 *
 * n×n のガボールパッチ格子コンテナ。GaborPatchCell を n² 個配置する。
 * - 全体辺長：スマホ min(short_edge - 32, 360)px、PC 480px。
 * - 隙間：n=3 は 8px、n≥4 は 6px（視認性確保のため詰める）。
 * - パッチ辺長 = (全体辺 - 隙間合計) / n。
 * - 結果開示中は格子全体 pointer-events: none（採点後の誤操作防止、F-03）。
 *
 * a11y：role="group" + aria-label「変化しているパッチをすべて選んでください」。
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewingDistanceCm } from '../../lib/calibration';
import { PatchDef } from '../../lib/v2/patch';
import { ResultMarkKind } from '../../lib/v2/gameView';
import { t } from '../../i18n';
import { GaborPatchCell } from './GaborPatchCell';

/** 全体辺長を算出する（GG-1）。スマホは min(short-32, 360)、PC は 480。 */
export function computeGridEdge(shortEdgePx: number): number {
  if (shortEdgePx >= 1024) return 480;
  return Math.min(shortEdgePx - 32, 360);
}

/** 隙間を算出する（GG-1）。n=3 は 8px、n≥4 は 6px。 */
export function computeGap(gridSize: number): number {
  return gridSize >= 4 ? 6 : 8;
}

/** パッチ辺長を算出する。 */
export function computePatchSize(
  shortEdgePx: number,
  gridSize: number,
): number {
  const edge = computeGridEdge(shortEdgePx);
  const gap = computeGap(gridSize);
  return Math.floor((edge - gap * (gridSize - 1)) / gridSize);
}

export type GaborGridProps = {
  patches: readonly PatchDef[];
  gridSize: number;
  /** 画面短辺（px）。レイアウト算出用 */
  shortEdgePx: number;
  elapsedSec: number;
  selected: ReadonlySet<number>;
  /** index → 開示マーク。null/undefined のとき試行中（マークなし） */
  marks?: readonly ResultMarkKind[] | null;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  onToggle: (index: number) => void;
  /** 結果開示中は格子全体タップ無効（F-03） */
  revealed?: boolean;
  testId?: string;
};

const GaborGridInner: React.FC<GaborGridProps> = ({
  patches,
  gridSize,
  shortEdgePx,
  elapsedSec,
  selected,
  marks,
  viewingDistanceCm,
  dpi,
  onToggle,
  revealed,
  testId,
}) => {
  const gap = computeGap(gridSize);
  const patchSize = computePatchSize(shortEdgePx, gridSize);

  return (
    <View
      accessibilityRole={
        // RN-Web は role="group" を直接受けないため Web 用に透過。Native は無害。
        'none'
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({ role: 'group', 'aria-label': t('game.grid_label') } as any)}
      accessibilityLabel={t('game.grid_label')}
      // 開示中は格子全体タップ無効
      pointerEvents={revealed ? 'none' : 'auto'}
      style={styles.grid}
      testID={testId}
    >
      {Array.from({ length: gridSize }, (_, r) => (
        <View key={`row-${r}`} style={[styles.row, { marginBottom: r < gridSize - 1 ? gap : 0 }]}>
          {Array.from({ length: gridSize }, (_, c) => {
            const index = r * gridSize + c;
            const patch = patches[index];
            if (!patch) return null;
            return (
              <View
                key={`cell-${index}`}
                style={{ marginRight: c < gridSize - 1 ? gap : 0 }}
              >
                <GaborPatchCell
                  patch={patch}
                  gridSize={gridSize}
                  sizePx={patchSize}
                  elapsedSec={elapsedSec}
                  selected={selected.has(index)}
                  markKind={marks ? marks[index] : undefined}
                  viewingDistanceCm={viewingDistanceCm}
                  dpi={dpi}
                  onToggle={onToggle}
                  disabled={revealed}
                  testId={testId ? `${testId}-cell-${index}` : undefined}
                />
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

export const GaborGrid = React.memo(GaborGridInner);
