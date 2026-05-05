/**
 * S8-OB-03b 70 代以上の追加警告画面（onboarding.md §5）。
 *
 * フルスクリーン画面（モーダルではない）。OB-03 で「70 代以上」を選択した
 * ユーザーのみ表示。「了解しました」で OB-04 へ進む。
 */
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  spacing,
} from '../../../theme/tokens';
import { Button } from '../../../components/Button';
import { StepIndicator } from '../../../components/StepIndicator';

export type OB03bElderWarningProps = {
  onAcknowledge: () => void;
};

export const OB03bElderWarning: React.FC<OB03bElderWarningProps> = ({
  onAcknowledge,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="ob-elder-warning"
      accessibilityRole="alert"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          style={[styles.icon, { color: colors.semanticWarning }]}
          accessibilityElementsHidden
        >
          ⚠
        </Text>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
          nativeID="ob-elder-warning-title"
        >
          70 代以上の方への{'\n'}ご注意
        </Text>
        <View
          style={[
            styles.divider,
            { backgroundColor: colors.borderDefault },
          ]}
        />

        <Text style={[styles.body, { color: colors.fgPrimary }]}>
          本アプリは医療機器ではなく、視覚機能の診断や治療を目的としません。
        </Text>
        <Text style={[styles.body, { color: colors.fgPrimary }]}>
          視力低下・見えにくさ・視野の変化を感じる場合は、まず眼科受診をご優先ください。
        </Text>
        <Text style={[styles.body, { color: colors.fgPrimary }]}>
          60 秒間の注視がつらい場合は途中で × を押して中断できます。
        </Text>

        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="了解しました"
            onPress={onAcknowledge}
            fullWidth
            testId="ob-elder-warning-ok"
          />
        </View>
        <StepIndicator current={3} total={5} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.s5,
    paddingTop: spacing.s8,
    gap: spacing.s4,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.s7,
  },
  icon: {
    fontSize: 64,
    textAlign: 'center',
    lineHeight: 72,
  },
  title: {
    fontSize: fontSize.h2, // 30
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
    lineHeight: fontSize.h2 * 1.35,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: spacing.s2,
  },
  body: {
    fontSize: fontSize.bodyLg, // 26
    lineHeight: fontSize.bodyLg * 1.6,
  },
  cta: {
    width: '100%',
    marginTop: spacing.s4,
  },
});
