/**
 * IdleHomeScreen.tsx — ホームタブの待機（非進行）状態（F-07 / F-08）。
 *
 * 中断（× / タブ起点 OK）後に着地する画面。中断セッションは記録されないため、
 * **スコア 0 の結果カードを出さず**、再開 CTA のみを提示する（S6 評価 Major 修正）。
 *
 * 完了後の結果は `SessionResultCard`（'result' フェーズ）が担当する。本画面は
 * 「記録すべき結果が無い待機状態」専用。セーフエリア準拠（NF-30）。
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import {
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  spacing,
  tapTarget,
} from '../../theme/tokens';
import { t } from '../../i18n';

export type IdleHomeScreenProps = {
  /** 「プレイを始める」押下 → 距離リマインド経由で新セッション（F-08）。 */
  onStart: () => void;
  testId?: string;
};

export const IdleHomeScreen: React.FC<IdleHomeScreenProps> = ({
  onStart,
  testId,
}) => {
  const { mode, colors } = useTheme();
  const focus = useFocusStyle();

  // Breathing animation for the start button
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const gradientColors = (mode === 'dark' 
    ? [colors.bgCanvas, '#1A0B2E'] // Deep space to neon purple
    : [colors.bgCanvas, '#E0E7FF']) as [string, string]; // Light canvas to soft indigo

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.root}
    >
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={styles.safe}
        testID={testId}
      >
      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.fgPrimary }]}
          accessibilityRole="header"
        >
          {t('home.placeholder_title')}
        </Text>
        <Text style={[styles.body, { color: colors.fgSecondary }]}>
          {t('home.placeholder_body')}
        </Text>
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel={t('home.start')}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.actionPrimary },
              focus,
              pressed && styles.pressed,
            ]}
            testID={testId ? `${testId}-start` : undefined}
          >
            <LinearGradient
              colors={[colors.actionPrimary, colors.actionPrimaryHover]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={[styles.buttonText, { color: colors.fgOnPrimary }]}>
                {t('home.start')}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s5,
    gap: spacing.s4,
  },
  title: {
    fontSize: fontSize.display, // Make title larger and cooler
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.s2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  body: {
    fontSize: fontSize.bodyLg,
    lineHeight: lineHeight.bodyLg,
    textAlign: 'center',
    marginBottom: spacing.s6,
    opacity: 0.9,
  },
  button: {
    minHeight: tapTarget.buttonLg,
    minWidth: 240,
    borderRadius: radius.pill,
    overflow: 'hidden', // to contain gradient
    elevation: 8, // subtle shadow
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s5,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  buttonText: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
    letterSpacing: 1, // Premium feel
  },
});
