/**
 * CourseStartScreen — S18-01（design-v11/sprints/sprint-18/screens.md §2）。
 *
 * 全ゲーム連続コースの開始確認画面。
 *
 * 構造：
 *   - × IconButton（キャンセル → ホーム）
 *   - h2「全ゲーム連続プレイ」「約 N 分」
 *   - 含まれるゲーム縦リスト（getEnabledGames 経由、F-18 動的反映）
 *   - 「はじめる」Primary lg
 *   - 「キャンセル」Secondary lg
 */

import React from 'react';
import {
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
} from '../../../theme/tokens';
import { Button } from '../../../components/Button';
import { IconButton } from '../../../components/IconButton';
import { GameDefinition, getEnabledGames } from '../../../state/gameRegistry';
import { estimateCourseDurationSec } from '../../../lib/v11/courseSession';

export type CourseStartScreenProps = {
  onStart: () => void;
  onCancel: () => void;
  /** テスト用に enabled ゲームを差し替え可（既定は getEnabledGames()） */
  enabledGamesForTest?: ReadonlyArray<GameDefinition>;
};

export const CourseStartScreen: React.FC<CourseStartScreenProps> = ({
  onStart,
  onCancel,
  enabledGamesForTest,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const games = enabledGamesForTest ?? getEnabledGames();
  const durationSec = estimateCourseDurationSec(games.length);
  const durationMin = Math.max(1, Math.round(durationSec / 60));

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="course-start-screen"
    >
      <View style={styles.header}>
        <IconButton
          icon="close"
          ariaLabel="コース開始をキャンセル"
          onPress={onCancel}
          testId="course-start-cancel-icon"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          全ゲーム連続プレイ
        </Text>
        <Text style={[styles.subtitle, { color: colors.fgSecondary }]}>
          約 {durationMin} 分
        </Text>

        <View
          style={[
            styles.list,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
          accessibilityLabel={`含まれるゲーム ${games.length} 件`}
          testID="course-start-list"
        >
          <Text
            style={[styles.listHeader, { color: colors.fgPrimary }]}
          >
            含まれるゲーム
          </Text>
          {games.map((g) => (
            <View
              key={g.gameId}
              style={[styles.row, { borderTopColor: colors.borderDefault }]}
              testID={`course-start-row-${g.gameId}`}
            >
              <Text
                style={[styles.rowText, { color: colors.fgPrimary }]}
              >
                {g.gameId} {g.nameJa}
              </Text>
            </View>
          ))}
        </View>

        <Button
          variant="primary"
          size="lg"
          label="はじめる"
          onPress={onStart}
          fullWidth
          testId="course-start-begin"
        />
        <Button
          variant="secondary"
          size="lg"
          label="キャンセル"
          onPress={onCancel}
          fullWidth
          testId="course-start-cancel"
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 64,
    paddingHorizontal: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    padding: spacing.s5,
    gap: spacing.s4,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.s8,
  },
  title: {
    fontSize: fontSize.h2, // 30
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.bodyLg, // 26
    textAlign: 'center',
  },
  list: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.s4,
    gap: spacing.s2,
  },
  listHeader: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold as '700',
    marginBottom: spacing.s2,
  },
  row: {
    minHeight: 56,
    borderTopWidth: 1,
    paddingTop: spacing.s3,
    paddingBottom: spacing.s3,
    justifyContent: 'center',
  },
  rowText: {
    fontSize: fontSize.body, // 24
  },
});
