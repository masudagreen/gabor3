/**
 * Button — components.md §1 に従う基本コンポーネント。
 *
 * - lg: minHeight 64, font.body.lg = 26px Medium
 * - md: minHeight 56, font.body = 24px Medium（OPT-1 床）
 * - variant: primary / secondary / tertiary / destructive
 * - focus-visible は Web で 3px outline（react-native-web は CSS outline をサポート）
 *   Sprint 7-C で 1px → 3px に強化（NF-7 / screens.md S7-11）。
 */

import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  ViewStyle,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  radius,
  spacing,
  tapTarget,
} from '../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
export type ButtonSize = 'lg' | 'md';

export type ButtonProps = {
  variant: ButtonVariant;
  size: ButtonSize;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  ariaLabel?: string;
  testId?: string;
};

export const Button: React.FC<ButtonProps> = ({
  variant,
  size,
  label,
  onPress,
  disabled,
  fullWidth,
  ariaLabel,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [focused, setFocused] = React.useState(false);

  const minHeight = size === 'lg' ? tapTarget.buttonLg : tapTarget.buttonMd;
  const paddingX = size === 'lg' ? spacing.s5 : spacing.s4;
  const fontSz = size === 'lg' ? fontSize.bodyLg : fontSize.body;
  const radiusV = size === 'lg' ? radius.lg : radius.md;

  let bg: string;
  let fg: string;
  let borderColor: string | undefined;
  let borderWidth = 0;
  let underline = false;

  switch (variant) {
    case 'primary':
      bg = colors.actionPrimary;
      fg = colors.fgOnPrimary;
      break;
    case 'secondary':
      bg = colors.actionSecondary;
      fg = colors.fgPrimary;
      borderColor = colors.borderDefault;
      borderWidth = 1;
      break;
    case 'tertiary':
      bg = 'transparent';
      fg = colors.actionPrimary;
      underline = true;
      break;
    case 'destructive':
      bg = colors.semanticError;
      fg = colors.fgOnPrimary;
      break;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ariaLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testId}
      style={({ pressed }) => {
        const style: ViewStyle = {
          minHeight,
          paddingHorizontal: paddingX,
          paddingVertical: spacing.s2,
          backgroundColor: bg,
          borderRadius: radiusV,
          borderColor,
          borderWidth,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: fullWidth ? 'stretch' : 'center',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          // focus 時のみ 3px outline（Web）。常時表示するとボタンが輪付きで見えるため
          // Sprint 7-C 後の修正で focus state 限定に変更。Native では outline 系は無視。
          ...(Platform.OS === 'web' && focused
            ? ({
                outlineColor: colors.focusRing,
                outlineWidth: 3,
                outlineStyle: 'solid',
                outlineOffset: 2,
              } as object)
            : {}),
        };
        return style;
      }}
    >
      <Text
        style={[
          styles.label,
          {
            color: fg,
            fontSize: fontSz,
            fontWeight: fontWeight.medium as '600',
            textDecorationLine: underline ? 'underline' : 'none',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  label: {
    textAlign: 'center',
  },
});
