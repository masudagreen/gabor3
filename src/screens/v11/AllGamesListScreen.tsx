/**
 * AllGamesListScreen — F-04 / sprints/sprint-8/screens.md §5。
 *
 * 単体プレイ用の全ゲーム一覧画面。`gameRegistry.getEnabledGames()` を経由して
 * enabled なゲームのみを表示する（F-18）。
 *
 * Sprint 8 時点ではどのゲームも本実装されていないため、各カードのタップは
 * 「準備中」状態として onSelectUnimplemented コールバックを呼ぶだけ。
 * Sprint 9 以降で個別ゲームが実装されたら、当該 gameId は `onSelectGame`
 * 経由で実プレイ画面へ遷移する。
 */

import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
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
import { IconButton } from '../../components/IconButton';
import { getEnabledGames, GameDefinition } from '../../state/gameRegistry';
import { GameIdV11 } from '../../state/gameIds-v11';

export type AllGamesListScreenProps = {
  /** 戻る（ホームへ） */
  onBack: () => void;
  /**
   * Sprint 9 以降で実装されたゲームのみ受信。Sprint 8 では呼ばれない（全部
   * unimplemented 扱い）。
   */
  onSelectGame?: (gameId: GameIdV11) => void;
  /**
   * Sprint 8 で全カードがタップされた際に呼ばれる。Toast 表示などで
   * 「準備中：Sprint X で実装予定」をユーザーに伝える役割。
   */
  onSelectUnimplemented?: (game: GameDefinition) => void;
  /**
   * 実装済みとみなす gameId の集合（テスト用 / Sprint 9 以降で渡す）。
   * 未指定なら全 ID が「未実装」として扱われる（Sprint 8 デフォルト）。
   */
  implementedGameIds?: ReadonlyArray<GameIdV11>;
  /**
   * v1.1.3：個別ゲームから戻ってきたときに前回のスクロール位置を復元する
   * ため、親（AppRouterV11）が保持するスクロールオフセット。
   */
  initialScrollOffsetY?: number;
  /** スクロール位置が変化したときに親に通知（次回マウント時の復元用） */
  onScrollOffsetChange?: (offsetY: number) => void;
};

export const AllGamesListScreen: React.FC<AllGamesListScreenProps> = ({
  onBack,
  onSelectGame,
  onSelectUnimplemented,
  implementedGameIds = [],
  initialScrollOffsetY = 0,
  onScrollOffsetChange,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const games = React.useMemo(() => getEnabledGames(), []);
  const implemented = React.useMemo(
    () => new Set(implementedGameIds),
    [implementedGameIds],
  );

  // v1.1.3：マウント直後に前回のスクロール位置を復元する。
  // ScrollView は contentOffset プロップで初期位置を渡せるが、Android では
  // 初期化タイミングによっては効かないことがあるため、ref 経由で scrollTo を
  // 呼んで確実に復元する。
  const scrollRef = React.useRef<ScrollView | null>(null);
  React.useEffect(() => {
    if (initialScrollOffsetY > 0) {
      const t = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: initialScrollOffsetY, animated: false });
      }, 0);
      return () => clearTimeout(t);
    }
    return undefined;
    // 初回マウント時のみ復元（その後のオフセット更新で自動巻き戻しはしない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="all-games-list-screen"
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="ホームに戻る"
          onPress={onBack}
          testId="all-games-back"
        />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          単体プレイ
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        contentOffset={{ x: 0, y: initialScrollOffsetY }}
        onScroll={
          onScrollOffsetChange
            ? (e) =>
                onScrollOffsetChange(e.nativeEvent.contentOffset.y)
            : undefined
        }
        scrollEventThrottle={64}
      >
        <Text
          style={[styles.intro, { color: colors.fgSecondary }]}
          accessibilityRole="text"
        >
          好きなゲームを選んでください{'\n'}（{games.length} 種類）
        </Text>

        {games.map((g) => {
          const isImplemented = implemented.has(g.gameId);
          return (
            <GameCard
              key={g.gameId}
              game={g}
              isImplemented={isImplemented}
              colors={colors}
              onPress={() => {
                if (isImplemented && onSelectGame) {
                  onSelectGame(g.gameId);
                } else if (onSelectUnimplemented) {
                  onSelectUnimplemented(g);
                }
              }}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const GameCard: React.FC<{
  game: GameDefinition;
  isImplemented: boolean;
  colors: ReturnType<typeof getColors>;
  onPress: () => void;
}> = ({ game, isImplemented, colors, onPress }) => {
  const [focused, setFocused] = React.useState(false);
  const ariaLabel = isImplemented
    ? `${game.gameId} ${game.nameJa} を 1 ゲーム単体プレイ。${game.description}`
    : `${game.gameId} ${game.nameJa}（準備中）。${game.description}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ disabled: !isImplemented }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={`game-card-${game.gameId}`}
      style={({ pressed }) => {
        const style: ViewStyle = {
          minHeight: 88,
          padding: spacing.s4,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.borderDefault,
          backgroundColor: isImplemented ? colors.bgSurface : colors.bgCanvas,
          opacity: isImplemented ? (pressed ? 0.9 : 1) : 0.65,
          gap: spacing.s2,
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
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.fgPrimary }]}>
          {game.gameId} {game.nameJa}
        </Text>
        {!isImplemented ? (
          <View
            style={[
              styles.statusTag,
              { borderColor: colors.borderDefault },
            ]}
            accessibilityElementsHidden
          >
            <Text style={[styles.statusTagText, { color: colors.fgMuted }]}>
              準備中
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.cardDescription, { color: colors.fgSecondary }]}>
        {game.description}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 64,
    paddingHorizontal: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s4,
  },
  title: {
    fontSize: fontSize.h2, // 30
    fontWeight: fontWeight.bold as '700',
  },
  content: {
    padding: spacing.s4,
    gap: spacing.s3,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.s7,
  },
  intro: {
    fontSize: fontSize.body, // 24
    lineHeight: fontSize.body * 1.5,
    marginBottom: spacing.s2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s3,
  },
  cardTitle: {
    fontSize: fontSize.bodyLg, // 26
    fontWeight: fontWeight.bold as '700',
    flexShrink: 1,
  },
  cardDescription: {
    fontSize: fontSize.body, // 24
    lineHeight: fontSize.body * 1.4,
  },
  statusTag: {
    paddingVertical: spacing.s1,
    paddingHorizontal: spacing.s3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  statusTagText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium as '600',
  },
});
