/**
 * HomeHeroCTA — F-04 / HM-1（components.md §9 / sprints/sprint-8/screens.md §3）。
 *
 * ホーム画面のプライマリ CTA カード。「全ゲーム連続プレイ（約 N 分）」を表示する。
 * todayCompleted=true のときは「✓ 本日完了」装飾タグ + ラベル「もう一度挑戦」に切替。
 *
 * Sprint 8 時点では gameRegistry がまだゲーム本実装を持たないため、
 * onPress は呼び出し元側で「Sprint 18 で実装予定」スタブまたは単体プレイ一覧
 * に遷移する形でハンドルする。
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

export type HomeHeroCTAProps = {
  /** enabled なゲーム数（F-04 / F-18：「約 N 分」の N） */
  enabledGameCount: number;
  /** 本日のフルコース完了済みか */
  todayCompleted: boolean;
  onPress: () => void;
  testId?: string;
};

export const HomeHeroCTA: React.FC<HomeHeroCTAProps> = ({
  enabledGameCount,
  todayCompleted,
  onPress,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [focused, setFocused] = React.useState(false);

  const minutes = enabledGameCount; // 1 ゲーム≒1 分換算（spec-v11.md §A-5）
  const headlineLabel = todayCompleted
    ? '今日のトレーニング完了'
    : '全ゲーム連続プレイ';
  const subLabel = `（約 ${minutes} 分）`;
  const ctaText = todayCompleted ? 'もう一度挑戦' : '▶ はじめる';
  const ariaLabel = `全ゲーム連続プレイを始める。約 ${minutes} 分。本日のトレーニングを開始します`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ disabled: false }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testId ?? 'home-hero-cta'}
      style={({ pressed }) => {
        const style: ViewStyle = {
          backgroundColor: colors.actionPrimary,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.s5,
          paddingVertical: spacing.s5,
          minHeight: 128,
          width: '100%',
          maxWidth: 480,
          alignSelf: 'center',
          opacity: pressed ? 0.9 : 1,
          ...(Platform.OS === 'web' && focused
            ? ({
                outlineColor: colors.focusRing,
                outlineWidth: 3,
                outlineStyle: 'solid',
                outlineOffset: 2,
              } as object)
            : {}),
        };
        return style;
      }}
    >
      {todayCompleted ? (
        <View style={styles.completedBadge}>
          <Text style={[styles.completedBadgeText, { color: colors.fgOnPrimary }]}>
            ✓ 本日完了
          </Text>
        </View>
      ) : null}
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text
            style={[styles.headline, { color: colors.fgOnPrimary }]}
          >
            {headlineLabel}
          </Text>
          <Text
            style={[styles.sub, { color: colors.fgOnPrimary }]}
          >
            {subLabel}
          </Text>
        </View>
        <View style={styles.ctaCol}>
          <Text style={[styles.ctaText, { color: colors.fgOnPrimary }]}>
            {ctaText}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    gap: spacing.s4,
  },
  textCol: {
    flexShrink: 1,
    gap: spacing.s2,
  },
  ctaCol: {
    alignItems: 'flex-end',
  },
  headline: {
    fontSize: fontSize.bodyLg, // 26
    fontWeight: fontWeight.bold as '700',
    lineHeight: fontSize.bodyLg * 1.3,
  },
  sub: {
    fontSize: fontSize.body, // 24
    lineHeight: fontSize.body * 1.4,
  },
  ctaText: {
    fontSize: fontSize.body, // 24
    fontWeight: fontWeight.bold as '700',
  },
  completedBadge: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.s1,
    paddingHorizontal: spacing.s3,
    borderRadius: radius.sm,
    marginBottom: spacing.s3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  completedBadgeText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
  },
});
