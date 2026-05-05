/**
 * Toggle — components.md §6 の Switch コンポーネント。
 *
 * 仕様：
 *   - 48×28px の本体、内部つまみ 24×24px
 *   - ON 時：背景 actionPrimary、つまみ右
 *   - OFF 時：背景 borderInput（neutral 300/400）、つまみ左
 *   - ListItem 内では trailing="value" と組み合わせて「ON / OFF」テキストも併記
 *
 * a11y：
 *   - role="switch"、accessibilityState={{checked: value, disabled}}
 *   - ariaLabel を必ず受け取る（NF-7）
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export type ToggleProps = {
  value: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
  testId?: string;
};

export const Toggle: React.FC<ToggleProps> = ({
  value,
  onChange,
  ariaLabel,
  disabled,
  testId,
}) => {
  const { colors } = useTheme();
  const trackColor = value ? colors.actionPrimary : colors.borderInput;
  const thumbColor = colors.fgOnPrimary;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={!!disabled}
      onPress={() => onChange(!value)}
      testID={testId}
      // タップ領域は OPT-2 を満たすため、外側コンテナで 48×48 を確保（ListItem 側で 56pt 行高保証）
      style={({ pressed }) => [
        styles.hitbox,
        {
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          // Sprint 7-C：focus-visible 3px outline（Web）
          ...(Platform.OS === 'web'
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
      <View
        style={[
          styles.track,
          { backgroundColor: trackColor, justifyContent: value ? 'flex-end' : 'flex-start' },
        ]}
      >
        <View style={[styles.thumb, { backgroundColor: thumbColor }]} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  hitbox: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
