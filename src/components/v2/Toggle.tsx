/**
 * Toggle.tsx — FT-1（components.md）。ON/OFF トグル。
 *
 * NF-12：ノブ位置 + テキスト「ON」/「OFF」併記で色のみに依存しない。
 * タップ領域 48pt 以上、role=switch + aria-checked。
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import { webAria } from '../../theme/ariaWeb';
import { fontSize, fontWeight, radius, tapTarget } from '../../theme/tokens';

export type ToggleProps = {
  value: boolean;
  onChange: (next: boolean) => void;
  /** SR 用ラベル（「効果音」等）。表示はしない（行ラベルが担う） */
  accessibilityLabel: string;
};

const TRACK_W = 64;
const TRACK_H = 36;
const KNOB = 28;

export const Toggle: React.FC<ToggleProps> = ({
  value,
  onChange,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();

  const trackColor = value ? colors.actionPrimary : colors.borderInput;
  const stateText = value ? 'ON' : 'OFF';

  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={`${accessibilityLabel} ${stateText}`}
      {...webAria('switch', { checked: value }, `${accessibilityLabel} ${stateText}`)}
      style={({ pressed }) => [
        styles.row,
        focus,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.stateText, { color: colors.fgPrimary }]}>
        {stateText}
      </Text>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.knob,
            { backgroundColor: '#FFFFFF' },
            value ? styles.knobOn : styles.knobOff,
          ]}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tapTarget.min,
    minWidth: tapTarget.min,
    justifyContent: 'flex-end',
  },
  pressed: { opacity: 0.7 },
  stateText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    marginRight: 12,
    minWidth: 48,
    textAlign: 'right',
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: radius.pill,
  },
  knobOn: { alignSelf: 'flex-end' },
  knobOff: { alignSelf: 'flex-start' },
});
