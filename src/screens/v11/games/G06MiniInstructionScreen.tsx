/**
 * G06MiniInstructionScreen — S14-01（screens.md §2）。
 *
 * G-06 を初めてプレイするときに 1 度だけ表示するミニ説明画面。
 * 2 回目以降はスキップ（呼び出し元 AppRouterV11 が判断）。
 *
 * - 「じーっと見比べて、どちらの広がりが大きいか」
 * - 4 つのリスト（60 秒 / 左右タップ / 何度でも変更可 / 範囲の差は微妙な注意）
 * - 「はじめる」Primary lg
 *
 * G-05 の構造をほぼコピー。違いは文言のみ（「細かい縞」→「ガウス窓の広がり」）。
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

export type G06MiniInstructionScreenProps = {
  onStart: () => void;
  onBack: () => void;
};

const BULLETS = [
  '60 秒間、両方をじーっと見比べる',
  '縞が見える範囲（パッチの大きさ）が広い方を選ぶ',
  '中心の濃さは似ていても、外側まで縞が伸びている方が「大きい」',
  '気が変われば何度でも変えてよい',
];

export const G06MiniInstructionScreen: React.FC<
  G06MiniInstructionScreenProps
> = ({ onStart, onBack }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="g06-mini-instruction-screen"
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="一覧へ戻る"
          onPress={onBack}
          testId="g06-mini-instruction-back"
        />
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: colors.fgPrimary }]}
        >
          G-06 ガウス窓サイズ弁別
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          縞が広い範囲まで{'\n'}伸びているのは{'\n'}どっち？
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
            ・▦・   ・・▦・・{'\n'}小さい  大きい  ← 縞模様が広く見えるのは？
          </Text>
        </View>

        <View
          accessibilityRole="list"
          style={styles.list}
          testID="g06-mini-instruction-list"
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
            testId="g06-mini-instruction-start"
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
    height: 160,
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
