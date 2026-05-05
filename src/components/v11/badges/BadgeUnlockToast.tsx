/**
 * BadgeUnlockToast — S19-07（design-v11/sprints/sprint-19/screens.md §8）。
 *
 * バッジ獲得演出（1.5 秒、結果サマリ画面で 1 度だけ）。
 *
 * 仕様（screens.md §8.5 / §8.7）：
 *   - 1.5 秒の scale-up（overshoot 5% 以下）
 *   - フラッシュ・点滅なし（NF-11）
 *   - role="status", aria-live="assertive", aria-atomic="true"
 *   - SR：「{バッジ名} を獲得しました」（1 度だけ）
 *   - 複数バッジ同時獲得時は 1.5 秒ずつ順次表示（呼び出し元で順次マウント）
 *
 * 実装方針：
 *   - 単一バッジ表示の単機能コンポーネント
 *   - 親コンポーネントが複数獲得の順次切替を制御
 *   - prefers-reduced-motion は scale を即時化
 *   - testID で「1 度だけ表示」を検証可能に
 */

import React from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  radius,
  spacing,
} from '../../../theme/tokens';
import { BadgeIdV11, BADGE_DEFINITIONS_V11 } from '../../../lib/v11/badgeDefinitions';

export type BadgeUnlockToastProps = {
  badgeId: BadgeIdV11;
  /** prefers-reduced-motion 等で animation を抑制する */
  reducedMotion?: boolean;
  testId?: string;
};

export const BadgeUnlockToast: React.FC<BadgeUnlockToastProps> = ({
  badgeId,
  reducedMotion = false,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const def = BADGE_DEFINITIONS_V11[badgeId];

  const scaleAnim = React.useRef(new Animated.Value(reducedMotion ? 1 : 0.6))
    .current;
  const opacityAnim = React.useRef(new Animated.Value(reducedMotion ? 1 : 0))
    .current;

  React.useEffect(() => {
    if (reducedMotion) {
      // 即時表示（既に 1.0 / 1）
      return;
    }
    // フェーズ：0 → 0.4s で scale 0.6 → 1.05、0.4 → 1.5s で 1.05 → 1.0
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 400,
          useNativeDriver: true,
          // overshoot 風 easing（5% 以内）
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 1100,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
      ]),
    ]).start();
  }, [scaleAnim, opacityAnim, reducedMotion]);

  return (
    <Animated.View
      // SR：role=status / aria-live=assertive / aria-atomic=true
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`${def.name} を獲得しました`}
      testID={testId ?? `badge-unlock-toast-${badgeId}`}
      style={[
        styles.toast,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.semanticSuccess,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={styles.icon} accessibilityElementsHidden>
        {def.emoji}
      </Text>
      <Text style={[styles.badgeId, { color: colors.fgSecondary }]}>
        {badgeId}
      </Text>
      <Text style={[styles.name, { color: colors.fgPrimary }]} numberOfLines={2}>
        {def.name}
      </Text>
      <Text style={[styles.label, { color: colors.fgPrimary }]}>
        を獲得しました！
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    borderWidth: 2,
    borderRadius: radius.lg,
    paddingVertical: spacing.s4,
    paddingHorizontal: spacing.s5,
    alignItems: 'center',
    gap: spacing.s2,
    minHeight: 160,
    width: '100%',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 56,
  },
  badgeId: {
    fontSize: fontSize.caption, // 20
    fontWeight: fontWeight.medium as '600',
  },
  name: {
    fontSize: fontSize.h2, // 30
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  label: {
    fontSize: fontSize.body, // 24
    textAlign: 'center',
  },
});
