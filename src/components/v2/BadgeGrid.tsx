/**
 * BadgeGrid.tsx — バッジ一覧グリッド（S8、F-09 バッジ部 / screens.md S8-1）。
 *
 * 全 11 バッジを BadgeCell で並べる。スマホ 2 列 / 広幅 3 列（レスポンシブ）。
 * role="list" + 各セル role=listitem 相当（BadgeCell が role=button）。点滅なし（NF-11）。
 */

import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { spacing } from '../../theme/tokens';
import { BadgeCell } from './BadgeCell';
import type { BadgeViewRow } from '../../lib/v2/badgeView';

export type BadgeGridProps = {
  rows: readonly BadgeViewRow[];
  testId?: string;
};

/** 幅からカラム数を決める（スマホ 2 / タブレット・PC 3）。 */
function columnsForWidth(width: number): number {
  return width >= 600 ? 3 : 2;
}

export const BadgeGrid: React.FC<BadgeGridProps> = ({ rows, testId }) => {
  const { width } = useWindowDimensions();
  const columns = columnsForWidth(width);

  return (
    <View
      style={styles.grid}
      accessibilityRole="list"
      testID={testId}
    >
      {rows.map((row) => (
        <View
          key={row.id}
          style={[styles.cellWrap, { width: `${100 / columns}%` }]}
          accessibilityRole="none"
        >
          <View style={styles.cellInner}>
            <BadgeCell
              row={row}
              testId={testId ? `${testId}-cell-${row.id}` : undefined}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.s1,
  },
  cellWrap: {
    paddingHorizontal: spacing.s1,
    marginBottom: spacing.s3,
  },
  cellInner: {
    flex: 1,
    flexDirection: 'row',
  },
});
