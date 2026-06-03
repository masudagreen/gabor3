/**
 * BadgeAwardToast.tsx — BG-2（S8、§5.4 / screens.md S8-2）。
 *
 * セッション結果カード上層で、バッジ獲得時に 1 度だけ流す演出。
 * - motion.durationBadge 1500ms、拡大 + フェードのみ（点滅なし NF-11、reduced-motion 時は静的表示）。
 * - 🏅 + 名称（font.h2 30px）。複数同時獲得は 1 つのトーストに名称を列挙（合計時間が伸びない）。
 * - 「もう一度」と干渉しない中央上に配置（pointerEvents none で操作を妨げない）。
 * - 音/ハプティクスは S9 で配線（onShown コールバックで発火点を用意。本コンポーネントは発火しない）。
 *
 * a11y: aria-live=polite 相当で「バッジ獲得：{名称}」を読み上げ（AccessibilityInfo.announce）。
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
import {
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  spacing,
} from '../../theme/tokens';
import { t } from '../../i18n';
import type { BadgeId } from '../../state/schema';
import { resolveBadgeNames } from '../../lib/v2/badgeView';

const BADGE_DURATION_MS = 1500;

export type BadgeAwardToastProps = {
  /** 今回新規獲得したバッジ ID（空なら何も表示しない）。 */
  badgeIds: readonly BadgeId[];
  /**
   * 演出表示開始時に 1 度だけ呼ばれる（S9：音/ハプティクス発火点）。
   * 本コンポーネントは音/振動を直接鳴らさない（責務分離）。
   */
  onShown?: (badgeIds: readonly BadgeId[]) => void;
  testId?: string;
};

export const BadgeAwardToast: React.FC<BadgeAwardToastProps> = ({
  badgeIds,
  onShown,
  testId,
}) => {
  const { colors } = useTheme();
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.9)).current;

  const names = React.useMemo(() => resolveBadgeNames(badgeIds), [badgeIds]);
  const hasBadges = names.length > 0;
  const onShownRef = React.useRef(onShown);
  onShownRef.current = onShown;

  React.useEffect(() => {
    if (!hasBadges) return;
    let cancelled = false;

    // S9 発火点（音/ハプティクス）。表示開始時に 1 度だけ。
    onShownRef.current?.(badgeIds);

    // SR 読み上げ（複数同時は先頭名称＋件数）。
    const announceText =
      names.length === 1
        ? t('badge.award_announce', { name: names[0].name })
        : t('badge.award_announce', {
            name: `${names[0].name} ほか ${names.length - 1} 件`,
          });
    AccessibilityInfo.announceForAccessibility(announceText);

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (cancelled) return;
        if (reduced) {
          // 静的表示（点滅・拡大なし、1500ms 相当はマウント期間で担保）
          opacity.setValue(1);
          scale.setValue(1);
        } else {
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 280,
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.spring(scale, {
              toValue: 1,
              friction: 6,
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]).start();
        }
      })
      .catch(() => {
        opacity.setValue(1);
        scale.setValue(1);
      });

    return () => {
      cancelled = true;
    };
    // badgeIds の同一性が変わったときのみ再演出（結果カード 1 回表示につき 1 度）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBadges, badgeIds]);

  if (!hasBadges) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity, transform: [{ scale }] }]}
      // aria-live 相当：出現を読み上げる（announceForAccessibility で補完済み）
      accessibilityLiveRegion="polite"
      accessible
      accessibilityRole="text"
      testID={testId}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgSurfaceRaised, borderColor: colors.borderStrong },
        ]}
      >
        <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
          🏅
        </Text>
        <Text style={[styles.title, { color: colors.fgSecondary }]}>
          {t('badge.award_title')}
        </Text>
        {names.map((b) => (
          <Text
            key={b.id}
            style={[styles.name, { color: colors.fgPrimary }]}
            testID={testId ? `${testId}-name-${b.id}` : undefined}
          >
            {b.name}
          </Text>
        ))}
      </View>
    </Animated.View>
  );
};

export const BADGE_AWARD_DURATION_MS = BADGE_DURATION_MS;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.s6,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  card: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.lg,
    paddingVertical: spacing.s4,
    paddingHorizontal: spacing.s6,
    gap: spacing.s1,
    maxWidth: 360,
  },
  icon: { fontSize: fontSize.h1 },
  title: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
  },
  name: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.h2 * lineHeight.h2,
    textAlign: 'center',
  },
});
