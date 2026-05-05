/**
 * G11MiniInstructionScreen — S16-04（screens.md §3）。
 *
 * G-11 を初めてプレイするときに 1 度だけ表示するミニ説明画面。
 * 2 回目以降はスキップ（呼び出し元 AppRouterV11 が判断）。
 *
 * - 「上下に並んだ 2 つの縞模様の下のパッチが左右どちらにずれているか」
 * - 4 つのリスト（上下を見比べて整列を判定 / 左ズレ右ズレを選ぶ / じーっと見ると精度が上がる / とても微小なズレ）
 * - 「はじめる」Primary lg
 *
 * G-08 / G-09 のミニ説明画面の構造をコピー。文言だけ G-11 文脈に。
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

export type G11MiniInstructionScreenProps = {
  onStart: () => void;
  onBack: () => void;
};

const BULLETS = [
  '上下を見比べて整列を判定',
  '「左にずれ」「右にずれ」を選ぶ',
  'じーっと見るほど精度が上がる',
  'とても微小なズレ（網膜解像度を超える）',
];

export const G11MiniInstructionScreen: React.FC<
  G11MiniInstructionScreenProps
> = ({ onStart, onBack }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="g11-mini-instruction-screen"
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="一覧へ戻る"
          onPress={onBack}
          testId="g11-mini-instruction-back"
        />
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.fgPrimary }]}
        >
          G-11 Vernier 整列判定
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          上下に並んだ{'\n'}
          2 つの縞模様の下のパッチが{'\n'}
          左右どちらにずれているか
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
            {'    ▦|||▦\n'}
            {'    （上）\n'}
            {'\n'}
            {'     ▦|||▦  ← 少し右にズレ\n'}
            {'    （下）'}
          </Text>
        </View>

        <View
          accessibilityRole="list"
          style={styles.list}
          testID="g11-mini-instruction-list"
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
            testId="g11-mini-instruction-start"
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
