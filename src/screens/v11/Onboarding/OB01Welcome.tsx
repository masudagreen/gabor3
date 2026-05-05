/**
 * S8-OB-01 ようこそ画面（onboarding.md §2）。
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

export type OB01WelcomeProps = {
  onNext: () => void;
};

export const OB01Welcome: React.FC<OB01WelcomeProps> = ({ onNext }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="ob-welcome"
      accessibilityLabel="ようこそ画面"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoBlock}>
          <Text style={styles.logoEmoji}>👁️</Text>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.fgPrimary }]}
            nativeID="ob-welcome-title"
          >
            GaborEye へようこそ
          </Text>
          <Text style={[styles.body, { color: colors.fgSecondary }]}>
            60 秒の注視で目を鍛える{'\n'}視覚トレーニング 13 種
          </Text>
          <Text style={[styles.body, { color: colors.fgSecondary }]}>
            最初に 90 秒だけ初期設定をお願いします
          </Text>
        </View>

        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="次へ"
            onPress={onNext}
            fullWidth
            testId="ob-welcome-next"
          />
        </View>
        <StepIndicator current={1} total={5} />
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
    maxWidth: 480,
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
    fontSize: fontSize.h1, // 36
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.bodyLg, // 26
    textAlign: 'center',
    lineHeight: fontSize.bodyLg * 1.6,
  },
  cta: {
    width: '100%',
  },
});
