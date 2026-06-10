import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import { webAria } from '../../theme/ariaWeb';
import { webSpaceActivation } from '../../theme/keyActivation';
import { fontSize, fontWeight, tapTarget } from '../../theme/tokens';

export type SettingRowProps = {
  label?: string;
  /** 縦並び（Slider 等の幅広コントロール）にする */
  stacked?: boolean;
  children?: React.ReactNode;
  /** ナビ行：押下で遷移。指定時は末尾に「›」を出す */
  onPress?: () => void;
  /** 全データ削除など危険操作はラベルを danger 色に */
  danger?: boolean;
  accessibilityLabel?: string;
  /** ラジオ選択肢として扱う（採点方式など）。指定時は role=radio + aria-checked を出す */
  radio?: boolean;
  /** radio のとき選択中かどうか（aria-checked） */
  checked?: boolean;
  /** 下部のボーダー線を非表示にする */
  noBorder?: boolean;
};

export const SettingRow: React.FC<SettingRowProps> = ({
  label,
  stacked,
  children,
  onPress,
  danger,
  accessibilityLabel,
  radio,
  checked,
  noBorder,
}) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();

  const labelColor = danger ? colors.semanticError : colors.fgPrimary;

  const inner = (
    <View
      style={[
        styles.row,
        stacked ? styles.stacked : styles.horizontal,
        { borderBottomColor: colors.borderDefault },
        noBorder && { borderBottomWidth: 0 },
      ]}
    >
      {label != null && (
        <Text
          style={[
            styles.label,
            { color: labelColor },
            stacked && styles.labelStacked,
          ]}
        >
          {label}
        </Text>
      )}
      {children != null && (
        <View style={stacked ? styles.controlStacked : styles.controlInline}>
          {children}
        </View>
      )}
      {onPress != null && !radio && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.fgSecondary}
          style={styles.chevron}
        />
      )}
    </View>
  );

  if (onPress != null) {
    const a11yLabel = accessibilityLabel ?? label;
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={radio ? 'radio' : 'button'}
        accessibilityState={radio ? { checked: !!checked } : undefined}
        accessibilityLabel={a11yLabel}
        {...(radio
          ? webAria('radio', { checked: !!checked }, a11yLabel)
          : webAria('button', undefined, a11yLabel))}
        // NF-9：radio 行は Space 未対応のため補完（button 行は RN-Web 既定で Space 起動可）
        {...(radio ? webSpaceActivation(onPress) : {})}
        style={({ pressed }) => [focus, pressed && styles.pressed]}
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
};

const styles = StyleSheet.create({
  row: {
    minHeight: tapTarget.recommended,
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stacked: {
    flexDirection: 'column',
  },
  pressed: { opacity: 0.6 },
  label: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
  },
  labelStacked: {
    marginBottom: 12,
  },
  controlInline: {
    flexShrink: 0,
    marginLeft: 12,
  },
  controlStacked: {
    width: '100%',
  },
  chevron: {
    marginLeft: 8,
  },
});

export type SettingGroupHeadingProps = {
  title: string;
  icon?: string;
};

/** グループ見出し（font.body 24px + Ionicons） */
export const SettingGroupHeading: React.FC<SettingGroupHeadingProps> = ({
  title,
  icon,
}) => {
  const { colors } = useTheme();
  return (
    <View style={headingStyles.container}>
      {icon != null && (
        <Ionicons
          name={icon as any}
          size={20}
          color={colors.actionPrimary}
          style={headingStyles.icon}
        />
      )}
      <Text style={[headingStyles.heading, { color: colors.fgSecondary }]}>
        {title}
      </Text>
    </View>
  );
};

const headingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 10,
    gap: 8,
    paddingHorizontal: 4,
  },
  heading: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  icon: {
    marginRight: 2,
  },
});
