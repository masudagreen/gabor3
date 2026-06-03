/**
 * DisclaimerPanel.tsx — DC-1（components.md / F-10）。
 *
 * 免責事項本文（医療機器でない旨・対象外ユーザー）を薄黄背景パネルで表示する。
 * 本文 18pt 以上（実際 body 24px、F-10）。スクロール可能。
 * オンボーディング初回（S6-1 ステップ 1）と設定の「免責事項を読む」再閲覧で共用する。
 *
 * 本コンポーネントは表示のみ。同意チェック・同意ボタンは利用側（OnboardingScreen 等）が持つ。
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fontSize, fontWeight, lineHeight, radius, spacing } from '../../theme/tokens';
import { t, tArray } from '../../i18n';

export type DisclaimerPanelProps = {
  /** スクロール可能にするか（パネル内スクロール）。既定 true。 */
  scrollable?: boolean;
  testId?: string;
};

export const DisclaimerPanel: React.FC<DisclaimerPanelProps> = ({
  scrollable = true,
  testId,
}) => {
  const { colors } = useTheme();
  const targets = tArray('disclaimer.targets');

  const body = (
    <View style={styles.inner}>
      <Text style={[styles.body, { color: colors.fgPrimary }]}>
        {t('disclaimer.body_intro')}
      </Text>
      <Text style={[styles.label, { color: colors.fgPrimary }]}>
        {t('disclaimer.body_targets_label')}
      </Text>
      {targets.map((item, i) => (
        <Text
          key={i}
          style={[styles.bullet, { color: colors.fgPrimary }]}
          testID={testId ? `${testId}-target-${i}` : undefined}
        >
          ・{item}
        </Text>
      ))}
      <Text style={[styles.note, { color: colors.fgPrimary }]}>
        {t('disclaimer.body_note')}
      </Text>
    </View>
  );

  return (
    <View
      style={[styles.panel, { backgroundColor: colors.bgDisclaimer }]}
      accessibilityRole="text"
      testID={testId}
    >
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.lg,
    padding: spacing.s4,
    maxHeight: 360,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: spacing.s2 },
  inner: { gap: spacing.s3 },
  body: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.body,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.body * lineHeight.body,
  },
  bullet: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.body,
  },
  note: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.body,
  },
});
