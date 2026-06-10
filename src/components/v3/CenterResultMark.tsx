/**
 * CenterResultMark.tsx — OV-3 相当（F-03、v3.1 改訂）。
 *
 * ラウンド締切後、**格子（パッチ）の中心に大きく**ラウンド全体の正解/不正解を重畳する総合マーク。
 * 見た目はパッチごとの ResultMark と同じ「半透明円 + ✓/✕」を**大きく**したもの（ユーザー要望）：
 * - clear：✓（緑 checkCorrect）
 * - fail ：✕（赤 crossWrong）
 * 円背景はパッチマークよりさらに薄く（透過を強め、下のパッチが透けて見える＝ユーザー要望）。
 *
 * 中央パッチの個別マークは本マークの下に隠れる（ユーザー了承済み）。
 * - 親（gridWrap）の絶対配置で中央に重ねる。pointerEvents: none。
 * - 出現時 motion.durationBase フェードイン（reduced-motion 0ms）。
 * - 読み上げ（「クリア」/「失敗」）は ResultOverlayLayer（srOnly）が担うため、本マークは
 *   accessibilityElementsHidden（二重読み上げ回避）。
 */

import React from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { motion, resultV3 } from '../../theme/tokens';
import type { GameResult } from '../../lib/v3/level';

/**
 * 総合マークの円背景（テーマ別）。パッチマークの overlayBg（α0.82）よりずっと薄く、
 * 下のパッチが透けて見える程度（ユーザー要望「背景色をすごく薄く」）。
 */
const FAINT_OVERLAY_BG = {
  light: 'rgba(255,255,255,0.20)',
  dark: 'rgba(20,24,32,0.20)',
} as const;

export type CenterResultMarkProps = {
  result: GameResult;
  /** 円の直径（px）。未指定は 140。 */
  diameterPx?: number;
  testId?: string;
};

export const CenterResultMark: React.FC<CenterResultMarkProps> = ({
  result,
  diameterPx = 140,
  testId,
}) => {
  const { mode } = useTheme();
  const tokens = resultV3[mode];
  const opacity = React.useRef(new Animated.Value(0)).current;

  const isClear = result === 'clear';
  const iconColor = isClear ? tokens.checkCorrect : tokens.crossWrong;

  React.useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (cancelled) return;
        if (reduced) {
          opacity.setValue(1);
        } else {
          Animated.timing(opacity, {
            toValue: 1,
            duration: motion.durationBase,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        }
      })
      .catch(() => opacity.setValue(1));
    return () => {
      cancelled = true;
    };
    // 出現時に 1 回だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none" testID={testId}>
      <Animated.View
        style={[
          styles.circle,
          {
            width: diameterPx,
            height: diameterPx,
            borderRadius: diameterPx / 2,
            backgroundColor: FAINT_OVERLAY_BG[mode],
            opacity,
          },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          style={[styles.icon, { color: iconColor, fontSize: diameterPx * 0.6 }]}
          testID={testId ? `${testId}-icon` : undefined}
        >
          {isClear ? '✓' : '✕'}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
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
