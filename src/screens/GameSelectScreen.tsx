/**
 * GameSelectScreen — 単体プレイのゲーム選択画面（screens.md S2-08 「別のゲームをやる」）。
 *
 * 単体プレイの導線で「ホーム → 単体プレイ → ゲーム選択」のための画面。
 * Sprint 3：3 ゲームすべて有効化。
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
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
} from '../theme/tokens';
import { IconButton } from '../components/IconButton';

export type SelectableGameId = 'game1' | 'game2' | 'game3';

export type GameSelectScreenProps = {
  onSelect: (gameId: SelectableGameId) => void;
  onBack: () => void;
  /** 除外するゲーム（「別のゲームをやる」で使う、現在プレイ済みを除外） */
  excludeIds?: SelectableGameId[];
};

export const GameSelectScreen: React.FC<GameSelectScreenProps> = ({
  onSelect,
  onBack,
  excludeIds = [],
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const games: Array<{ id: SelectableGameId; name: string; desc: string }> = [
    { id: 'game1', name: 'Game 1', desc: '変化察知' },
    { id: 'game2', name: 'Game 2', desc: '二重表裏判別' },
    { id: 'game3', name: 'Game 3', desc: '周辺視野ハント' },
  ];
  const filtered = games.filter((g) => !excludeIds.includes(g.id));

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      <View style={styles.header}>
        <IconButton icon="back" ariaLabel="戻る" onPress={onBack} testId="select-back" />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          単体プレイ
        </Text>
        <Text style={[styles.subtitle, { color: colors.fgPrimary }]}>
          ゲームを選んでください
        </Text>

        {filtered.map((g) => (
          <Pressable
            key={g.id}
            accessibilityRole="button"
            accessibilityLabel={`${g.name}（${g.desc}）を始める`}
            onPress={() => onSelect(g.id)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderDefault,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            testID={`select-${g.id}`}
          >
            <Text style={[styles.cardName, { color: colors.fgPrimary }]}>
              {g.name}
            </Text>
            <Text style={[styles.cardDesc, { color: colors.fgPrimary }]}>
              {g.desc}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
  },
  content: {
    padding: spacing.s4,
    gap: spacing.s4,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold as '700',
  },
  subtitle: {
    fontSize: fontSize.body,
    marginBottom: spacing.s3,
  },
  card: {
    padding: spacing.s5,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 120,
    gap: spacing.s2,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold as '700',
  },
  cardDesc: {
    fontSize: fontSize.body,
  },
});
