/**
 * GaborGrid — Game 1 用の 3×3〜5×5 ガボールパッチグリッド（components.md §15）。
 *
 * - 各セルは GaborPatch を 1 枚配置
 * - セル全体がタップ可能、選択状態は黄色 4px 枠（GaborPatch 自体は枠を持たない構造のため、
 *   ここで Pressable 側に枠を描画）
 * - durationMs（既定 60_000）にわたり、各パッチの orientationDeg を
 *   start → end に線形補間。表示は外部から渡される `progress`（0〜1）に従う。
 *   親コンポーネント側でタイマーを管理する設計（テスト容易性のため）。
 * - 採点後は `highlightChangingIds` で正解パッチを 1.5 秒拡大ハイライト
 *   （アニメは React Native の Animated.View で scale 1 → 1.18 → 1.0）
 *
 * spec.md §7.1 / NF-11（点滅禁止）に従い、点滅はしない。
 */

import React from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import { GaborPatch } from './GaborPatch';
import {
  Game1PatchSpec,
  interpolateOrientation,
} from '../lib/game1';
import { fontSize, fontWeight, getColors, palette, spacing } from '../theme/tokens';

export type GaborGridProps = {
  rows: 3 | 4 | 5;
  cols: 3 | 4 | 5;
  patches: Game1PatchSpec[];
  /** 0〜1 のモーフィング進行率 */
  progress: number;
  selectedIds: string[];
  onTogglePatch: (id: string) => void;
  /** 採点後に拡大ハイライトするパッチ ID */
  highlightChangingIds?: string[];
  viewingDistanceCm: 30 | 40 | 50;
  dpi?: number;
  /** グリッド全体辺の最大値（px） */
  maxSizePx?: number;
  /** タップ無効化（採点中・ハイライト中） */
  disabled?: boolean;
  testId?: string;
};

const CELL_GAP = spacing.s2; // 8px

export const GaborGrid: React.FC<GaborGridProps> = ({
  rows,
  cols,
  patches,
  progress,
  selectedIds,
  onTogglePatch,
  highlightChangingIds,
  viewingDistanceCm,
  dpi,
  maxSizePx = 360,
  disabled,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const highlightSet = React.useMemo(
    () => new Set(highlightChangingIds ?? []),
    [highlightChangingIds],
  );

  // セル辺長：grid 全体辺 / cols（gap 込みで簡易計算）
  // タップ領域 OPT-2 を考慮し最小 56px を確保
  const totalCols = Math.max(rows, cols);
  const rawCellSize = Math.floor(
    (maxSizePx - CELL_GAP * (totalCols - 1)) / totalCols,
  );
  const cellSize = Math.max(56, rawCellSize);
  // パッチ描画サイズはセル内に収まる正方形
  const patchSize = Math.max(48, cellSize - 8);

  return (
    <View
      style={styles.grid}
      testID={testId}
      accessibilityLabel={`${rows} 行 ${cols} 列のガボールパッチ。変化したパッチをタップしてください`}
    >
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: cols }, (_, c) => {
            const patch = patches.find((p) => p.row === r && p.col === c);
            if (!patch) return <View key={`${r}-${c}`} style={{ width: cellSize, height: cellSize }} />;
            const isSelected = selectedSet.has(patch.id);
            const isHighlighted = highlightSet.has(patch.id);
            const orientation = interpolateOrientation(patch, progress);

            return (
              <GridCell
                key={patch.id}
                patch={patch}
                orientationDeg={orientation}
                cellSize={cellSize}
                patchSize={patchSize}
                marginRight={c < cols - 1 ? CELL_GAP : 0}
                marginBottom={r < rows - 1 ? CELL_GAP : 0}
                isSelected={isSelected}
                isHighlighted={isHighlighted}
                disabled={disabled}
                viewingDistanceCm={viewingDistanceCm}
                dpi={dpi}
                onPress={() => onTogglePatch(patch.id)}
                colors={colors}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

type GridCellProps = {
  patch: Game1PatchSpec;
  orientationDeg: number;
  cellSize: number;
  patchSize: number;
  marginRight: number;
  marginBottom: number;
  isSelected: boolean;
  isHighlighted: boolean;
  disabled?: boolean;
  viewingDistanceCm: 30 | 40 | 50;
  dpi?: number;
  onPress: () => void;
  colors: ReturnType<typeof getColors>;
};

const GridCell: React.FC<GridCellProps> = ({
  patch,
  orientationDeg,
  cellSize,
  patchSize,
  marginRight,
  marginBottom,
  isSelected,
  isHighlighted,
  disabled,
  viewingDistanceCm,
  dpi,
  onPress,
  colors,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // ハイライト時に 1 → 1.18 → 1 の scale アニメ（1.5s）
  React.useEffect(() => {
    if (!isHighlighted) {
      scaleAnim.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.18,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isHighlighted, scaleAnim]);

  const borderColor = isHighlighted
    ? colors.highlightCorrect
    : isSelected
      ? colors.highlightCorrect
      : 'transparent';
  const borderWidth = isHighlighted || isSelected ? 4 : 0;

  const cellStyle: ViewStyle = {
    width: cellSize,
    height: cellSize,
    marginRight,
    marginBottom,
    borderColor,
    borderWidth,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gabor.bg,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${patch.row + 1} 行 ${patch.col + 1} 列のパッチ`}
      accessibilityState={{ selected: isSelected, disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      testID={`grid-cell-${patch.id}`}
    >
      <Animated.View style={[cellStyle, { transform: [{ scale: scaleAnim }] }]}>
        <GaborPatch
          cpd={patch.cpd}
          contrast={patch.contrast}
          orientationDeg={orientationDeg}
          phaseRad={0}
          sigmaDeg={patch.sigmaDeg}
          sizePx={patchSize}
          viewingDistanceCm={viewingDistanceCm}
          dpi={dpi}
          ariaLabel={`縞模様 ${patch.row + 1}-${patch.col + 1}`}
        />
        {isSelected ? (
          <View
            style={[
              styles.selectedBadge,
              // RN Web 0.19+ では pointerEvents は style 経由が推奨
              { pointerEvents: 'none' },
            ]}
          >
            <Text style={[styles.selectedMark, { color: colors.fgPrimary }]}>✓</Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
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
  selectedBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFC53D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMark: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
    lineHeight: fontSize.body,
  },
});
