/**
 * ResultMark.tsx — OV-2（components.md / F-03、v3.0）。
 *
 * パッチ中央に半透明円（縞を完全には隠さない、直径 = パッチ辺の約 55%）+ アイコン。
 * v3.0 は「回転だった/誤選択」に読み替え（部分点 TP/FP/FN は廃止）：
 * - correct：✓ 実線・不透明（回転を正しく選択）
 * - missed ：✓ 薄め（透過 50%、回転の選び逃し）= 取りこぼし。実線との透明度差で区別（F-03）
 * - wrong  ：✕（静止を誤選択）
 * - none   ：何も表示しない（呼び出し側で出さない）
 *
 * a11y：aria-label「回転（選択済み）/回転（選び逃し）/誤選択」。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { resultV3 } from '../../theme/tokens';
import type { RevealKind } from '../../lib/v3/gameMachine';
import { t } from '../../i18n';

export type ResultMarkProps = {
  kind: Exclude<RevealKind, 'none'>;
  /** パッチ辺長（px）。円径はこの 55%。 */
  patchSizePx: number;
  testId?: string;
};

const ICON: Record<ResultMarkProps['kind'], string> = {
  correct: '✓',
  missed: '✓',
  wrong: '✕',
};

const LABEL_KEY: Record<ResultMarkProps['kind'], string> = {
  correct: 'resultV3.check_correct_label',
  missed: 'resultV3.check_missed_label',
  wrong: 'resultV3.cross_wrong_label',
};

export const ResultMark: React.FC<ResultMarkProps> = ({
  kind,
  patchSizePx,
  testId,
}) => {
  const { mode } = useTheme();
  const tokens = resultV3[mode];
  const diameter = Math.round(patchSizePx * 0.55);

  const iconColor = kind === 'wrong' ? tokens.crossWrong : tokens.checkCorrect;
  // 選び逃し（missed）は透過 50% で「取りこぼし」を実線と区別（system §1.4 / F-03）。
  const opacity = kind === 'missed' ? 0.5 : 1;

  return (
    <View style={styles.layer} pointerEvents="none">
      <View
        style={[
          styles.circle,
          {
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            backgroundColor: tokens.overlayBg,
            opacity,
          },
        ]}
        accessibilityRole="image"
        accessibilityLabel={t(LABEL_KEY[kind])}
        testID={testId}
      >
        <Text style={[styles.icon, { color: iconColor, fontSize: diameter * 0.6 }]}>
          {ICON[kind]}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
