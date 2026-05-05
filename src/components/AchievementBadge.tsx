/**
 * AchievementBadge — components.md §25 / screens.md S6-01 / S6-02。
 *
 * - 80×80px のバッジアイコン（badges/b-XX-*.svg）
 *   ※ Sprint 6 では SVG 素材未配置。BADGE_META.emoji を暫定で使用
 * - 未獲得：グレースケール＋ 半透明（opacity 0.5）
 * - 獲得：色付き、下に獲得日（font.caption 20px、補助情報のため許容）
 *
 * 一覧グリッド用の「カード」形態。タップで詳細モーダルを開く。
 */
import React from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  radius,
  spacing,
} from '../theme/tokens';
import { BadgeId, BadgeStatus } from '../state/storage';
import { BADGE_META, buildBadgeHint, BadgeCheckContext } from '../lib/badges';

export type AchievementBadgeProps = {
  badgeId: BadgeId;
  earned: boolean;
  /** 獲得日時（earned=true の時のみ意味あり） */
  earnedAt?: string | null;
  /** 未獲得時のヒント文言（buildBadgeHint で構築済み）。null の場合は自動算出 */
  hint?: string;
  /** 詳細モーダルを開くコールバック */
  onPress?: () => void;
  testId?: string;
};

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  badgeId,
  earned,
  earnedAt,
  hint,
  onPress,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const meta = BADGE_META[badgeId];

  const earnedDateText = earned && earnedAt ? formatEarnedDate(earnedAt) : null;
  const subText = earned
    ? earnedDateText
      ? `獲得済 ${earnedDateText}`
      : '獲得済'
    : (hint ?? '未獲得');

  const ariaLabel = earned
    ? `バッジ：${meta.name}。獲得済${earnedDateText ? `、${earnedDateText} 獲得` : ''}`
    : `バッジ：${meta.name}。未獲得。${hint ? hint : `獲得条件は ${meta.conditionText}`}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      onPress={onPress ?? (() => {})}
      testID={testId}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderDefault,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: earned ? colors.bgSurfaceRaised : colors.bgSurface,
            borderColor: colors.borderDefault,
            opacity: earned ? 1 : 0.5,
          },
        ]}
      >
        <Text
          style={[styles.icon, !earned && styles.iconUnearned]}
          accessibilityElementsHidden
        >
          {meta.emoji}
        </Text>
      </View>
      <Text style={[styles.name, { color: colors.fgPrimary }]} numberOfLines={2}>
        {meta.name}
      </Text>
      <Text
        style={[
          styles.sub,
          {
            color: earned ? colors.fgSecondary : colors.fgMuted,
          },
        ]}
        numberOfLines={2}
      >
        {subText}
      </Text>
    </Pressable>
  );
};

/**
 * 一覧で大量に並ぶときに、ヒントを自動算出するヘルパ。
 * BadgeCheckContext を渡せる場合は親側で hint を計算するほうが効率的。
 */
export function autoHint(
  status: BadgeStatus,
  ctx: BadgeCheckContext,
): string | undefined {
  if (status.earned) return undefined;
  return buildBadgeHint(status.badgeId, ctx);
}

/**
 * earnedAt の ISO 文字列を「M/D」表記に整形。
 */
function formatEarnedDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.s4,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.s2,
    minHeight: 180,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 44,
  },
  iconUnearned: {
    // モノクロ寄せ：暫定で透過のみ。SVG 差し替え時に grayscale フィルタを使う
  },
  name: {
    fontSize: fontSize.bodyLg, // 26px
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  sub: {
    fontSize: fontSize.caption, // 20px（補助情報、components.md §25 で許容）
    textAlign: 'center',
  },
});
