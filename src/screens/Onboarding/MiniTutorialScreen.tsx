/**
 * MiniTutorialScreen — オンボーディング 1-5（screens.md S4-05）。
 *
 * Game 1（変化察知）の最小チュートリアル。
 * 「やってみる」で体験 1 試行画面（S4-06）へ進む。
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
import { IconButton } from '../../components/IconButton';
import { StepIndicator } from '../../components/StepIndicator';

export type MiniTutorialScreenProps = {
  onTry: () => void;
  onBack: () => void;
};

export const MiniTutorialScreen: React.FC<MiniTutorialScreenProps> = ({
  onTry,
  onBack,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="onboarding-mini-tutorial"
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="戻る"
          onPress={onBack}
          testId="tutorial-back"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text
          style={[styles.eyebrow, { color: colors.fgPrimary }]}
        >
          最初のゲーム
        </Text>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          「変化察知」
        </Text>

        <View
          style={[
            styles.illustration,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
          ]}
          accessibilityLabel="3 行 3 列のガボールパッチのうち 1 つだけ角度が違う説明イラスト"
        >
          <Text style={[styles.illustrationGlyph, { color: colors.fgPrimary }]}>
            ▦ ▦ ▦{'\n'}▦ ▨ ▦{'\n'}▦ ▦ ▦
          </Text>
          <Text style={[styles.illustrationCaption, { color: colors.fgPrimary }]}>
            1 つだけ少し角度が違うパッチ
          </Text>
        </View>

        <Text style={[styles.body, { color: colors.fgPrimary }]}>
          60 秒の間に、{'\n'}少しずつ角度が変わるパッチを{'\n'}タップで選んでください
        </Text>
        <Text style={[styles.body, { color: colors.fgPrimary }]}>
          タップは何度でも選び直せます
        </Text>

        <Text
          style={[
            styles.bodyBold,
            { color: colors.fgPrimary },
          ]}
        >
          ※ 試しに 1 回だけやってみましょう
        </Text>

        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="やってみる"
            onPress={onTry}
            fullWidth
            testId="tutorial-try"
          />
        </View>

        <StepIndicator current={5} total={7} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    padding: spacing.s4,
    paddingBottom: spacing.s7,
    gap: spacing.s4,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  eyebrow: {
    fontSize: fontSize.h3,
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold as '700',
    marginBottom: spacing.s3,
  },
  illustration: {
    padding: spacing.s5,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.s3,
  },
  illustrationGlyph: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    textAlign: 'center',
  },
  illustrationCaption: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.6,
  },
  bodyBold: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
    lineHeight: fontSize.body * 1.6,
  },
  cta: {
    width: '100%',
    marginTop: spacing.s3,
  },
});
