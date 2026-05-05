/**
 * StepIndicator — オンボーディングのステップ番号を表示する小さいヘルパー
 * （screens.md S4-01 〜 S4-07）。
 *
 * 単純な「current / total」表示。点滅などの装飾なし（OPT-9）。
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  useColorScheme,
} from 'react-native';
import { fontSize, getColors } from '../theme/tokens';

export type StepIndicatorProps = {
  current: number;
  total: number;
};

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  current,
  total,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <Text
      accessibilityLabel={`ステップ ${current} / ${total}`}
      style={[styles.text, { color: colors.fgMuted }]}
    >
      {current} / {total}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
});
