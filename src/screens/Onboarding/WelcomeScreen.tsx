/**
 * WelcomeScreen — オンボーディング 1-1（screens.md S4-01）。
 *
 * - GaborEye ロゴ + 「1 日 3 分の目の体操」
 * - 「医療機器ではありません」注記（A-1 / OPT-6）
 * - 「始める」プライマリ ボタンで次へ
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
} from '../../theme/tokens';
import { Button } from '../../components/Button';
import { StepIndicator } from '../../components/StepIndicator';

export type WelcomeScreenProps = {
  onNext: () => void;
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNext }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="onboarding-welcome"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoBlock}>
          <Text style={[styles.logoEmoji]}>👁️</Text>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.fgPrimary }]}
          >
            GaborEye
          </Text>
          <Text style={[styles.subtitle, { color: colors.fgPrimary }]}>
            1 日 3 分の{'\n'}目の体操
          </Text>
        </View>

        <Text style={[styles.note, { color: colors.fgPrimary }]}>
          このアプリは医療機器ではありません{'\n'}セルフケア用のアプリです
        </Text>

        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="始める"
            onPress={onNext}
            fullWidth
            testId="onboarding-welcome-next"
          />
        </View>

        <StepIndicator current={1} total={7} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.s5,
    paddingTop: spacing.s8,
    paddingBottom: spacing.s6,
    gap: spacing.s6,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  logoBlock: {
    alignItems: 'center',
    gap: spacing.s4,
  },
  logoEmoji: {
    fontSize: 96,
    lineHeight: 110,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.h2,
    textAlign: 'center',
    lineHeight: fontSize.h2 * 1.35,
  },
  note: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
    lineHeight: fontSize.body * 1.6,
  },
  cta: {
    width: '100%',
  },
});
