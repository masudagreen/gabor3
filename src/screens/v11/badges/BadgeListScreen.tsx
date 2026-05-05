/**
 * BadgeListScreen — S19-01（spec-v11.md §F-13 / design-v11/sprints/sprint-19/screens.md §2）。
 *
 * 13 バッジの一覧画面。獲得済み / 未獲得を判別表示し、未獲得には進捗ヒントを表示する。
 *
 * F-18 反映：
 *   - バッジ自体は 13 種すべて表示（disabled でも項目は隠さない）
 *   - 獲得条件は `evaluateBadgesV11` で「enabled 集合に対して」評価
 *   - 単独依存ゲームが disabled なら hint で「現在 GXX は公開対象外のため取得できません」
 *
 * a11y：
 *   - グリッド `accessibilityRole="list"`、各バッジ `accessibilityRole="button"`
 *   - タップで BadgeDetailModal を開く（Web では `aria-haspopup`）
 *   - ヘッダ「獲得済み: N / 13」は本文情報として表示
 */

import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  radius,
  spacing,
} from '../../../theme/tokens';
import { IconButton } from '../../../components/IconButton';
import {
  ALL_BADGE_IDS_V11,
  BADGE_DEFINITIONS_V11,
  BadgeIdV11,
} from '../../../lib/v11/badgeDefinitions';
import {
  BadgeStatusV11,
  buildBadgeHintV11,
  BadgeEvalContextV11,
} from '../../../lib/v11/badges';

export type BadgeListScreenProps = {
  /** 13 件の BadgeStatus（順不同可） */
  statuses: ReadonlyArray<BadgeStatusV11>;
  /** 進捗ヒント計算用コンテキスト（B-09 / B-10 / B-13 等） */
  ctx: BadgeEvalContextV11;
  onBack: () => void;
  /** カードタップで詳細モーダルを開く */
  onPressBadge: (badgeId: BadgeIdV11) => void;
};

export const BadgeListScreen: React.FC<BadgeListScreenProps> = ({
  statuses,
  ctx,
  onBack,
  onPressBadge,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const { width } = useWindowDimensions();
  const columns = width >= 1080 ? 4 : width >= 720 ? 3 : 2;

  const byId = React.useMemo(() => {
    const m = new Map<BadgeIdV11, BadgeStatusV11>();
    for (const s of statuses) m.set(s.badgeId, s);
    return m;
  }, [statuses]);

  const earnedCount = React.useMemo(
    () =>
      ALL_BADGE_IDS_V11.filter((id) => byId.get(id)?.earned === true).length,
    [byId],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="badge-list-screen"
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="設定に戻る"
          onPress={onBack}
          testId="badge-list-back"
        />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          バッジ一覧
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text
          style={[styles.summary, { color: colors.fgPrimary }]}
          accessibilityLabel={`獲得済み ${earnedCount} 件、全 13 種類中`}
          testID="badge-list-summary"
        >
          獲得済み: {earnedCount} / 13
        </Text>

        <View style={styles.divider} />

        <View
          style={styles.grid}
          accessibilityRole="list"
          testID="badge-list-grid"
        >
          {ALL_BADGE_IDS_V11.map((badgeId) => {
            const def = BADGE_DEFINITIONS_V11[badgeId];
            const status = byId.get(badgeId) ?? {
              badgeId,
              earned: false,
              earnedAt: null,
            };
            const hint = status.earned
              ? null
              : buildBadgeHintV11(badgeId, ctx);
            return (
              <BadgeCard
                key={badgeId}
                badgeId={badgeId}
                name={def.name}
                emoji={def.emoji}
                earned={status.earned}
                earnedAt={status.earnedAt}
                hint={hint}
                onPress={() => onPressBadge(badgeId)}
                colors={colors}
                widthFraction={1 / columns}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const BadgeCard: React.FC<{
  badgeId: BadgeIdV11;
  name: string;
  emoji: string;
  earned: boolean;
  earnedAt: string | null;
  hint: string | null;
  onPress: () => void;
  colors: ReturnType<typeof getColors>;
  widthFraction: number;
}> = ({
  badgeId,
  name,
  emoji,
  earned,
  earnedAt,
  hint,
  onPress,
  colors,
  widthFraction,
}) => {
  const [focused, setFocused] = React.useState(false);
  const ariaLabel = earned
    ? `バッジ ${badgeId} ${name}、獲得済み`
    : `バッジ ${badgeId} ${name}、未獲得。${hint ?? ''}`;
  return (
    <View
      accessibilityRole="none"
      style={[styles.cardWrap, { width: `${Math.round(widthFraction * 100)}%` }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        onPress={onPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={`badge-card-${badgeId}`}
        style={({ pressed }) => {
          const style: ViewStyle = {
            padding: spacing.s4,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.borderDefault,
            backgroundColor: colors.bgSurface,
            alignItems: 'center',
            gap: spacing.s2,
            minHeight: 180,
            opacity: pressed ? 0.85 : 1,
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
        <View
          style={[
            styles.iconWrap,
            {
              borderColor: colors.borderDefault,
              backgroundColor: colors.bgSurfaceRaised,
              opacity: earned ? 1 : 0.5,
            },
          ]}
        >
          <Text style={styles.icon} accessibilityElementsHidden>
            {emoji}
          </Text>
        </View>
        <Text
          style={[styles.cardId, { color: colors.fgSecondary }]}
          numberOfLines={1}
        >
          {badgeId}
        </Text>
        <Text
          style={[styles.cardName, { color: colors.fgPrimary }]}
          numberOfLines={2}
        >
          {name}
        </Text>
        <Text
          style={[
            styles.cardSub,
            { color: earned ? colors.fgSecondary : colors.fgMuted },
          ]}
          numberOfLines={2}
        >
          {earned
            ? earnedAt
              ? `獲得済 ${formatEarnedDate(earnedAt)}`
              : '獲得済'
            : (hint ?? '未獲得')}
        </Text>
      </Pressable>
    </View>
  );
};

function formatEarnedDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 64,
    paddingHorizontal: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  title: {
    fontSize: fontSize.h2, // 30px
    fontWeight: fontWeight.bold as '700',
  },
  content: {
    padding: spacing.s4,
    gap: spacing.s4,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.s7,
  },
  summary: {
    fontSize: fontSize.bodyLg, // 26px
    fontWeight: fontWeight.bold as '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#0000001a',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -spacing.s2,
  },
  cardWrap: {
    padding: spacing.s2,
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
  cardId: {
    fontSize: fontSize.caption, // 20px（補助情報）
    fontWeight: fontWeight.medium as '600',
  },
  cardName: {
    fontSize: fontSize.bodyLg, // 26px
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  cardSub: {
    fontSize: fontSize.caption, // 20px
    textAlign: 'center',
  },
});
