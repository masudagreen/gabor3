/**
 * GaborGrid.tsx — GG-1（components.md / F-01、v3.0）。
 *
 * n×n のガボールパッチ格子コンテナ。GaborPatchCell を n² 個配置する。n は現在レベルの
 * gridSize（v3.1：3 / 4 / 5 / 6）。
 * - 全体辺長：スマホ min(short_edge - 32, 360)px、PC 480px。
 * - 隙間（system §16.6）：n=3 は 8px、n=4 は 6px、n=5 は 5px、n=6 は 4px。
 *   パッチ辺長 = (全体辺 - 隙間合計) / n。6x6 でも辺 ≈ 51px を確保し 360px に収める。
 * - 結果開示中は格子全体 pointer-events: none（締め切り後の誤操作防止、F-03）。
 *
 * a11y：role="group" + aria-label「回転しているパッチをすべて選んでください」。
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewingDistanceCm } from '../../lib/calibration';
import type { PatchDef } from '../../lib/v3/patch';
import type { RevealItem } from '../../lib/v3/gameMachine';
import { t } from '../../i18n';
import { GaborPatchCell } from './GaborPatchCell';

/** 全体辺長を算出する（GG-1）。スマホは min(short-32, 360)、PC は 480。 */
export function computeGridEdge(shortEdgePx: number): number {
  if (shortEdgePx >= 1024) return 480;
  return Math.min(shortEdgePx - 32, 360);
}

/**
 * 隙間を算出する（GG-1 / system §16.6）。n=3:8px / n=4:6px / n=5:5px / n=6:4px。
 * 大きい n ほど隙間を詰め、6x6 でもパッチ辺長を確保して 360px に収める（NF-28d）。
 */
export function computeGap(gridSize: number): number {
  if (gridSize >= 6) return 4;
  if (gridSize === 5) return 5;
  if (gridSize === 4) return 6;
  return 8;
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
  /** index → 開示区分。null/undefined のとき試行中（マークなし） */
  reveal?: readonly RevealItem[] | null;
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
  reveal,
  viewingDistanceCm,
  dpi,
  onToggle,
  revealed,
  testId,
}) => {
  const gap = computeGap(gridSize);
  const patchSize = computePatchSize(shortEdgePx, gridSize);

  // index → RevealKind の参照を作る（reveal は index 順だが安全のため map 化）。
  const revealByIndex = React.useMemo(() => {
    if (!reveal) return null;
    const m = new Map<number, RevealItem['kind']>();
    for (const item of reveal) m.set(item.index, item.kind);
    return m;
  }, [reveal]);

  return (
    <View
      accessibilityRole={'none'}
      // RN-Web は role="group" を直接受けないため Web 用に透過。Native は無害。
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({ role: 'group', 'aria-label': t('gameV3.grid_label') } as any)}
      accessibilityLabel={t('gameV3.grid_label')}
      // 開示中は格子全体タップ無効
      pointerEvents={revealed ? 'none' : 'auto'}
      style={styles.grid}
      testID={testId}
    >
      {Array.from({ length: gridSize }, (_, r) => (
        <View
          key={`row-${r}`}
          style={[styles.row, { marginBottom: r < gridSize - 1 ? gap : 0 }]}
        >
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
                  revealKind={revealByIndex ? revealByIndex.get(index) : undefined}
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
