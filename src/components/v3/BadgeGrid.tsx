/**
 * BadgeGrid.tsx — BG-2（components.md / sprint-9 screens.md S9-1、v3.0）。
 *
 * 全 11 バッジを 3 軸（継続日数 / 高難度到達 / 高レベル到達）の見出し付きで並べる。
 * 各軸内は BadgeCell をグリッド配置（スマホ 2 列 / 広幅 3 列、レスポンシブ）。
 * 各軸グリッドは role="list"、各セルは role=button（BadgeCell）。点滅なし（NF-11）。
 *
 * 軸見出しはテキスト（色＋テキスト）で区別（screens.md S9-1 の「継続日数」等）。
 */

import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, spacing } from '../../theme/tokens';
import { BadgeCell } from './BadgeCell';
import {
  groupBadgeRowsByAxis,
  type BadgeViewRow,
} from '../../lib/v3/badgeView';
import type { BadgeAxis } from '../../lib/v3/badgeDefinitions';
import { t } from '../../i18n';

export type BadgeGridProps = {
  rows: readonly BadgeViewRow[];
  testId?: string;
};

/** 幅からカラム数を決める（スマホ 2 / タブレット・PC 3）。 */
function columnsForWidth(width: number): number {
  return width >= 600 ? 3 : 2;
}

const AXIS_LABEL_KEY: Record<BadgeAxis, string> = {
  streak: 'badge.axis_streak',
  difficulty: 'badge.axis_difficulty',
  level: 'badge.axis_level',
};

export const BadgeGrid: React.FC<BadgeGridProps> = ({ rows, testId }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const columns = columnsForWidth(width);
  const groups = groupBadgeRowsByAxis(rows);

  return (
    <View testID={testId}>
      {groups.map((group) => (
        <View key={group.axis} style={styles.group}>
          <Text
            style={[styles.axisLabel, { color: colors.fgSecondary }]}
            accessibilityRole="header"
            testID={testId ? `${testId}-axis-${group.axis}` : undefined}
          >
            {t(AXIS_LABEL_KEY[group.axis])}
          </Text>
          <View
            style={styles.grid}
            accessibilityRole="list"
            testID={testId ? `${testId}-list-${group.axis}` : undefined}
          >
            {group.rows.map((row) => (
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
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    marginTop: spacing.s3,
  },
  axisLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.s2,
  },
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
