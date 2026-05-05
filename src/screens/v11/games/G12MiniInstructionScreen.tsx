/**
 * G12MiniInstructionScreen — S17-01（screens.md §2）。
 *
 * G-12 を初めてプレイするときに 1 度だけ表示するミニ説明画面。
 * 2 回目以降はスキップ（呼び出し元 AppRouterV11 が判断）。
 *
 * - 「中央のパッチがどの向きを向いているか」（周囲のパッチに邪魔されながら）
 * - 4 つのリスト（中央 target の向きを判定 / 周囲のパッチが「のませ」てくる /
 *   「垂直 / 水平 / 斜め右 / 斜め左」/ 60 秒見続けると向きが浮かぶ）
 * - 「はじめる」Primary lg
 *
 * G-09 / G-11 のミニ説明画面の構造をコピー。文言だけ G-12 文脈に。
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
  spacing,
} from '../../../theme/tokens';
import { Button } from '../../../components/Button';
import { IconButton } from '../../../components/IconButton';

export type G12MiniInstructionScreenProps = {
  onStart: () => void;
  onBack: () => void;
};

const BULLETS = [
  '中央 target の向きを判定',
  '周囲のパッチが「のませ」てくる',
  '「垂直 / 水平 / 斜め右 / 斜め左」',
  '60 秒見続けると向きが浮かぶ',
];

export const G12MiniInstructionScreen: React.FC<
  G12MiniInstructionScreenProps
> = ({ onStart, onBack }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="g12-mini-instruction-screen"
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="一覧へ戻る"
          onPress={onBack}
          testId="g12-mini-instruction-back"
        />
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.fgPrimary }]}
        >
          G-12 クラウディング
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          中央のパッチが{'\n'}
          どの向きを向いているか{'\n'}
          （周囲のパッチに邪魔されながら）
        </Text>

        <View
          style={[
            styles.demo,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
          accessibilityElementsHidden
        >
          <Text style={[styles.demoText, { color: colors.fgSecondary }]}>
            {'    ▦|▦  ▦/▦\n'}
            {'  ▦\\▦ [▦/▦] ▦/▦\n'}
            {'    ▦|▦  ▦|▦\n'}
            {'\n'}
            {'  spacing が staircase 連動'}
          </Text>
        </View>

        <View
          accessibilityRole="list"
          style={styles.list}
          testID="g12-mini-instruction-list"
        >
          {BULLETS.map((b, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={[styles.bullet, { color: colors.fgPrimary }]}>
                ・
              </Text>
              <Text style={[styles.itemText, { color: colors.fgPrimary }]}>
                {b}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="はじめる"
            onPress={onStart}
            fullWidth
            testId="g12-mini-instruction-start"
          />
        </View>
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
    gap: spacing.s4,
  },
  headerTitle: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold as '700',
    flexShrink: 1,
  },
  content: {
    padding: spacing.s5,
    gap: spacing.s5,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.s8,
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
    lineHeight: fontSize.h2 * 1.4,
  },
  demo: {
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
  },
  demoText: {
    fontSize: fontSize.body,
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: fontSize.body * 1.6,
  },
  list: {
    gap: spacing.s3,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s2,
  },
  bullet: {
    fontSize: fontSize.body,
  },
  itemText: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.5,
    flexShrink: 1,
  },
  cta: {
    marginTop: spacing.s4,
  },
});
