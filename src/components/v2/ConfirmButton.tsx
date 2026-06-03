/**
 * ConfirmButton.tsx — BN-1（components.md / F-02 方式②）。
 *
 * 採点方式②でのみ表示。ガボール格子の直下に Button primary lg（64px）「確定」。
 * 押すと m 秒を待たず即採点。方式①③では呼び出し側が描画しない（DOM に出さない）。
 *
 * a11y：aria-label「回答を確定する」、focus ring。
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import { fontSize, fontWeight, radius, spacing, tapTarget } from '../../theme/tokens';
import { t } from '../../i18n';

export type ConfirmButtonProps = {
  onConfirm: () => void;
  testId?: string;
};

export const ConfirmButton: React.FC<ConfirmButtonProps> = ({
  onConfirm,
  testId,
}) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();

  return (
    <Pressable
      onPress={onConfirm}
      accessibilityRole="button"
      accessibilityLabel={t('game.confirm_label')}
      style={({ pressed }) => [
        styles.button,
        focus,
        pressed && styles.pressed,
      ]}
      testID={testId}
    >
      <LinearGradient
        colors={[colors.actionPrimary, colors.actionPrimaryHover]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.buttonGradient}
      >
        <Text style={[styles.label, { color: colors.fgOnPrimary }]}>
          {t('game.confirm')}
        </Text>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: tapTarget.buttonLg,
    minWidth: 200,
    borderRadius: radius.pill,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s7,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  label: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
});
