/**
 * IconButton — components.md §2 に従う。
 *
 * 文字アイコン（×, ←, ▶ 等の Unicode）をベースに実装する。
 * Sprint 1 では SVG アイコンセットは未配置のため、Unicode で代用。
 * Sprint 2 でアセット導入時に icon name → SVG 解決に置き換える。
 */

import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
} from 'react-native';
import { fontSize, getColors, tapTarget } from '../theme/tokens';

export type IconGlyph = 'close' | 'back' | 'info' | 'settings';

export type IconButtonProps = {
  icon: IconGlyph;
  ariaLabel: string;
  size?: 'lg' | 'md';
  variant?: 'ghost' | 'filled';
  onPress: () => void;
  testId?: string;
};

const GLYPH_MAP: Record<IconGlyph, string> = {
  close: '✕',
  back: '←',
  info: 'i',
  settings: '⚙',
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  ariaLabel,
  size = 'md',
  variant = 'ghost',
  onPress,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [focused, setFocused] = React.useState(false);

  const dim = size === 'lg' ? 56 : tapTarget.iconButton;
  const bg = variant === 'filled' ? colors.actionSecondary : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testId}
      style={({ pressed }) => [
        styles.base,
        {
          width: dim,
          height: dim,
          backgroundColor: bg,
          opacity: pressed ? 0.85 : 1,
          // Sprint 7-C：focus 時のみ 3px outline（Web のみ）
          ...(Platform.OS === 'web' && focused
            ? ({
                outlineColor: colors.focusRing,
                outlineWidth: 3,
                outlineStyle: 'solid',
                outlineOffset: 2,
              } as object)
            : {}),
        },
      ]}
    >
      <Text
        style={{
          color: colors.fgPrimary,
          fontSize: size === 'lg' ? fontSize.h2 : 28,
          fontWeight: '600',
        }}
      >
        {GLYPH_MAP[icon]}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
});
