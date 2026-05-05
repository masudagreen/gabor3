/**
 * G10MiniInstructionScreen — S16-01（screens.md §2）。
 *
 * G-10 を初めてプレイするときに 1 度だけ表示するミニ説明画面。
 * 2 回目以降はスキップ（呼び出し元 AppRouterV11 が判断）。
 *
 * - 「画面いっぱいに敷き詰めたパッチの中で、向きが違うかたまりがどの象限にあるか」
 * - 4 つのリスト（grid 全体を 60 秒見渡す / 違う向きのかたまりがどこか / 4 象限から選ぶ / 何度でも変更可）
 * - 「はじめる」Primary lg
 *
 * G-09 のミニ説明画面の構造をコピー。文言だけ G-10 文脈に。
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

export type G10MiniInstructionScreenProps = {
  onStart: () => void;
  onBack: () => void;
};

const BULLETS = [
  'grid 全体を 60 秒見渡す',
  '違う向きのかたまりがどこか探す',
  '「左上 / 右上 / 左下 / 右下」を選ぶ',
  '気が変われば何度でも変えてよい',
];

export const G10MiniInstructionScreen: React.FC<
  G10MiniInstructionScreenProps
> = ({ onStart, onBack }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="g10-mini-instruction-screen"
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="一覧へ戻る"
          onPress={onBack}
          testId="g10-mini-instruction-back"
        />
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.fgPrimary }]}
        >
          G-10 テクスチャ分離
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          画面いっぱいの{'\n'}
          パッチの中で、向きが違う{'\n'}
          かたまりがどの象限にあるか
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
            {'|||||| ||||||\n'}
            {'|||||| ||||||\n'}
            {'||┌─┐|| |||||\n'}
            {'||│-│|| |||||\n'}
            {'||└─┘|| |||||\n'}
            {'|||||| ||||||\n'}
            {'背景=同向き / 中=違う向き'}
          </Text>
        </View>

        <View
          accessibilityRole="list"
          style={styles.list}
          testID="g10-mini-instruction-list"
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
            testId="g10-mini-instruction-start"
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
