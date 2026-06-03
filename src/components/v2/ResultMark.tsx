/**
 * ResultMark.tsx — OV-2（components.md / F-03）。
 *
 * パッチ中央に半透明円（縞を完全には隠さない、直径 = パッチ辺の約 55%）+ アイコン。
 * - TP：✅ 実線・不透明（check.tp）
 * - FN：✅ 薄め（透過 50%、check.fn）= 取りこぼし（色＋透明度、aria で補完）
 * - FP：❌（cross.fp）
 * - none：何も表示しない（呼び出し側で出さない）
 *
 * a11y：aria-label「正解（選択済み）/正解（選び逃し）/不正解（誤選択）」。
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { resultV2 } from '../../theme/tokens';
import { ResultMarkKind } from '../../lib/v2/gameView';
import { t } from '../../i18n';

export type ResultMarkProps = {
  kind: Exclude<ResultMarkKind, 'none'>;
  /** パッチ辺長（px）。円径はこの 55%。 */
  patchSizePx: number;
  testId?: string;
};

const ICON: Record<ResultMarkProps['kind'], string> = {
  tp: '✓',
  fn: '✓',
  fp: '✕',
};

const LABEL_KEY: Record<ResultMarkProps['kind'], string> = {
  tp: 'result.tp_label',
  fn: 'result.fn_label',
  fp: 'result.fp_label',
};

export const ResultMark: React.FC<ResultMarkProps> = ({
  kind,
  patchSizePx,
  testId,
}) => {
  const { mode } = useTheme();
  const tokens = resultV2[mode];
  const diameter = Math.round(patchSizePx * 0.55);

  const iconColor = kind === 'fp' ? tokens.crossFp : tokens.checkTp;
  // FN（選び逃し）は透過 50% で「取りこぼし」を区別（system §1.4）
  const opacity = kind === 'fn' ? 0.5 : 1;

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
