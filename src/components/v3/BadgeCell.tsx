/**
 * BadgeCell.tsx — BG-1（components.md / sprint-9 screens.md S9-1、v3.0）。
 *
 * バッジ 1 種のセル。獲得＝フルカラー 🏅 + 名称 + 獲得日、未獲得＝グレースケール
 * + 鍵 🔒 + 条件ヒント（NF-12：色のみに依存せず、鍵アイコン＝形 + テキストで区別）。
 * タップで条件全文を展開/折りたたみ（screens.md S9-1）。点滅なし（NF-11）。
 *
 * v3.0：3 軸（継続日数 / 高難度到達 / 高レベル到達）。旧スコア依存条件は存在しない（spec §6.4）。
 * a11y: role=button / aria-expanded、aria-label「{名称}、{獲得済み（{日付}）/未獲得：{ヒント}}」。
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import { webAria } from '../../theme/ariaWeb';
import {
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  spacing,
  tapTarget,
} from '../../theme/tokens';
import { t } from '../../i18n';
import type { BadgeViewRow } from '../../lib/v3/badgeView';

export type BadgeCellProps = {
  row: BadgeViewRow;
  testId?: string;
};

export const BadgeCell: React.FC<BadgeCellProps> = ({ row, testId }) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();
  const [expanded, setExpanded] = React.useState(false);

  const earned = row.earned;
  // 状態テキスト：獲得＝獲得日、未獲得＝ヒント。
  const statusText = earned
    ? row.earnedDate
      ? t('badge.earned_at', { date: row.earnedDate })
      : t('badge.earned_label')
    : row.hint;

  const a11yLabel = earned
    ? t('badge.cell_earned_label', {
        name: row.name,
        date: row.earnedDate ?? '',
      })
    : t('badge.cell_locked_label', { name: row.name, hint: row.hint });

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ expanded }}
      {...webAria('button', { expanded }, a11yLabel)}
      style={({ pressed }) => [
        styles.cell,
        {
          backgroundColor: colors.bgSurface,
          borderColor: earned ? colors.borderStrong : colors.borderDefault,
        },
        // 未獲得は彩度を落とした見た目（鍵アイコン + ヒントが主たる区別、NF-12）。
        !earned && styles.locked,
        focus,
        pressed && styles.pressed,
      ]}
      testID={testId}
    >
      <View style={styles.iconRow}>
        <Text
          style={[styles.icon, !earned && styles.lockedIcon]}
          accessibilityElementsHidden
          importantForAccessibility="no"
          testID={testId ? `${testId}-icon` : undefined}
        >
          {earned ? '🏅' : '🔒'}
        </Text>
      </View>

      <Text
        style={[
          styles.name,
          { color: earned ? colors.fgPrimary : colors.fgSecondary },
        ]}
        numberOfLines={2}
        testID={testId ? `${testId}-name` : undefined}
      >
        {row.name}
      </Text>

      <Text
        style={[styles.status, { color: colors.fgSecondary }]}
        testID={testId ? `${testId}-status` : undefined}
      >
        {statusText}
      </Text>

      {/* 展開時は条件全文（screens.md S9-1：セルタップで詳細） */}
      {expanded ? (
        <Text
          style={[styles.condition, { color: colors.fgSecondary }]}
          testID={testId ? `${testId}-condition` : undefined}
        >
          {row.condition}
        </Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    minHeight: tapTarget.listItem,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.s4,
    gap: spacing.s2,
  },
  locked: {
    opacity: 0.9,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: { fontSize: fontSize.h1 },
  lockedIcon: {
    // 未獲得はグレースケール（色のみに依存しない＝鍵の形でも区別、NF-12）。
    opacity: 0.55,
  },
  name: {
    fontSize: fontSize.bodyBold,
    fontWeight: fontWeight.bold,
  },
  status: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.body,
  },
  condition: {
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption * lineHeight.body,
  },
  pressed: { opacity: 0.7 },
});
