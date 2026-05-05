/**
 * SettingsRow — S19-03（design-v11/sprints/sprint-19/screens.md §4）。
 *
 * 設定画面のリスト行。56pt+ の高さを保証する。トグル / リンク / 値表示 の 3 形態。
 *
 * F-14 受け入れ基準：
 *   - 全項目がリスト型で並び、各行は 56pt 以上の高さ
 *   - トグル系 ON/OFF が一目で判別できる
 *
 * a11y：
 *   - リンク行：role="button"
 *   - トグル行：role="switch", aria-checked
 *   - destructive: アイコン + テキスト両方で識別可能
 */

import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  radius,
  spacing,
} from '../../theme/tokens';

export type SettingsRowProps =
  | {
      kind: 'link';
      label: string;
      /** 右側の値（"システム" / "40 cm" など） */
      value?: string;
      destructive?: boolean;
      onPress: () => void;
      ariaLabel?: string;
      testId?: string;
      icon?: string;
    }
  | {
      kind: 'toggle';
      label: string;
      checked: boolean;
      onToggle: (next: boolean) => void;
      ariaLabel?: string;
      testId?: string;
    }
  | {
      kind: 'static';
      label: string;
      /** 右側に表示する値 */
      value: string;
      /** 補足情報（同意日 等） */
      subtitle?: string;
      testId?: string;
    };

export const SettingsRow: React.FC<SettingsRowProps> = (props) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [focused, setFocused] = React.useState(false);

  const baseStyle: ViewStyle = {
    minHeight: 56,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.s3,
  };

  const focusStyle: ViewStyle =
    Platform.OS === 'web' && focused
      ? ({
          outlineColor: colors.focusRing,
          outlineWidth: 3,
          outlineStyle: 'solid',
          outlineOffset: 2,
        } as object)
      : {};

  if (props.kind === 'static') {
    return (
      <View
        style={baseStyle}
        accessibilityRole="none"
        testID={props.testId}
      >
        <View style={styles.labelArea}>
          <Text
            style={[styles.label, { color: colors.fgPrimary }]}
            numberOfLines={1}
          >
            {props.label}
          </Text>
          {props.subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.fgSecondary }]}
              numberOfLines={1}
            >
              {props.subtitle}
            </Text>
          ) : null}
        </View>
        <Text
          style={[styles.value, { color: colors.fgPrimary }]}
          numberOfLines={1}
        >
          {props.value}
        </Text>
      </View>
    );
  }

  if (props.kind === 'toggle') {
    const checked = props.checked;
    const handle = () => props.onToggle(!checked);
    return (
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked }}
        accessibilityLabel={props.ariaLabel ?? props.label}
        onPress={handle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={({ pressed }) => [
          baseStyle,
          focusStyle,
          { opacity: pressed ? 0.85 : 1 },
        ]}
        testID={props.testId}
      >
        <Text
          style={[styles.label, { color: colors.fgPrimary }]}
          numberOfLines={1}
        >
          {props.label}
        </Text>
        <View
          style={[
            styles.toggleTrack,
            {
              backgroundColor: checked
                ? colors.actionPrimary
                : colors.actionSecondary,
              borderColor: colors.borderDefault,
            },
          ]}
          accessibilityElementsHidden
        >
          <View
            style={[
              styles.toggleThumb,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderDefault,
                left: checked ? 22 : 2,
              },
            ]}
          />
          <Text
            style={[
              styles.toggleText,
              { color: checked ? colors.fgOnPrimary : colors.fgPrimary },
            ]}
            accessibilityElementsHidden
          >
            {checked ? 'ON' : 'OFF'}
          </Text>
        </View>
      </Pressable>
    );
  }

  // link
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.ariaLabel ?? props.label}
      onPress={props.onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        baseStyle,
        focusStyle,
        { opacity: pressed ? 0.85 : 1 },
      ]}
      testID={props.testId}
    >
      <View style={styles.labelArea}>
        <Text
          style={[
            styles.label,
            {
              color: props.destructive
                ? colors.semanticError
                : colors.fgPrimary,
            },
          ]}
          numberOfLines={1}
        >
          {props.icon ? `${props.icon} ` : ''}
          {props.label}
        </Text>
      </View>
      <View style={styles.linkRight}>
        {props.value ? (
          <Text
            style={[styles.value, { color: colors.fgSecondary }]}
            numberOfLines={1}
          >
            {props.value}
          </Text>
        ) : null}
        <Text style={[styles.chevron, { color: colors.fgSecondary }]}>
          ›
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  labelArea: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: fontSize.body, // 24
    fontWeight: fontWeight.medium as '600',
  },
  subtitle: {
    fontSize: fontSize.caption, // 20
  },
  value: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium as '600',
  },
  linkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
  },
  chevron: {
    fontSize: fontSize.h3, // 26
  },
  toggleTrack: {
    width: 56,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 6,
    alignItems: 'flex-start',
    flexDirection: 'row',
    position: 'relative',
  },
  toggleThumb: {
    position: 'absolute',
    top: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold as '700',
    alignSelf: 'center',
  },
});
