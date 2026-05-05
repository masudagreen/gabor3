/**
 * OnboardingDoneScreen — オンボーディング 1-7（screens.md S4-07）。
 *
 * 「準備ができました」+ ホームへ進むボタン。
 * onboardingCompleted=true の永続化は呼び出し元（AppRouter）で行う。
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
  radius,
  spacing,
} from '../../theme/tokens';
import { Button } from '../../components/Button';
import { StepIndicator } from '../../components/StepIndicator';

export type OnboardingDoneScreenProps = {
  onHome: () => void;
};

export const OnboardingDoneScreen: React.FC<OnboardingDoneScreenProps> = ({
  onHome,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="onboarding-done"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.emoji]}>🎉</Text>
        <Text
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          準備ができました
        </Text>
        <Text style={[styles.body, { color: colors.fgPrimary }]}>
          毎日 3 分のトレーニングで{'\n'}見え方をならしていきましょう
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
          ]}
        >
          <Text style={[styles.cardBody, { color: colors.fgPrimary }]}>
            続けることが大切です。{'\n'}継続日数（ストリーク）と{'\n'}バッジで応援します。
          </Text>
        </View>

        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="ホームへ"
            onPress={onHome}
            fullWidth
            testId="onboarding-done-home"
          />
        </View>

        <StepIndicator current={7} total={7} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.s5,
    paddingBottom: spacing.s7,
    gap: spacing.s5,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 80,
    lineHeight: 96,
    textAlign: 'center',
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.bodyLg,
    textAlign: 'center',
    lineHeight: fontSize.bodyLg * 1.55,
  },
  card: {
    padding: spacing.s5,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  cardBody: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.6,
    textAlign: 'center',
  },
  cta: {
    width: '100%',
  },
});
