/**
 * G03MiniInstructionScreen — S11-01（screens.md §2）。
 *
 * G-03 を初めてプレイするときに 1 度だけ表示するミニ説明画面。
 * 2 回目以降はスキップ（呼び出し元 AppRouterV11 が判断）。
 *
 * - 「中央を見つめたまま、違う向きのパッチを 8 個から探す」
 * - 5 つのリスト（中央十字注視 / 周辺視で違う向き / 時計の方向で答える /
 *   60 秒間ずっと表示 / 何度でも変えてよい）
 * - 「はじめる」Primary lg
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

export type G03MiniInstructionScreenProps = {
  onStart: () => void;
  onBack: () => void;
};

const BULLETS = [
  '中央の十字をじーっと見続ける',
  '周辺視で違う向きを探す',
  '時計の方向で答える',
  '60 秒間ずっと表示される',
  '気が変われば何度でも変えてよい',
];

export const G03MiniInstructionScreen: React.FC<
  G03MiniInstructionScreenProps
> = ({ onStart, onBack }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="g03-mini-instruction-screen"
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="一覧へ戻る"
          onPress={onBack}
          testId="g03-mini-instruction-back"
        />
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.fgPrimary }]}
        >
          G-03 周辺視野ハント
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          中央を見つめたまま{'\n'}違う向きのパッチを{'\n'}8 個から探す
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
            {'    ▦    \n  ▦   ▦  \n▦   +   ▦\n  ▦   ▦  \n    ▦    '}
          </Text>
        </View>

        <View
          accessibilityRole="list"
          style={styles.list}
          testID="g03-mini-instruction-list"
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
            testId="g03-mini-instruction-start"
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
    fontSize: fontSize.h3, // 26
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
    fontSize: fontSize.h2, // 30
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
    lineHeight: fontSize.h2 * 1.4,
  },
  demo: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s4,
  },
  demoText: {
    fontSize: fontSize.body,
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: fontSize.body * 1.4,
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
