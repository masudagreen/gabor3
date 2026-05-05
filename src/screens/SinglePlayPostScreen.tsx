/**
 * SinglePlayPostScreen — 単体プレイ後の選択画面（screens.md S2-08 / F-06）。
 *
 * ゲーム終了後に：
 *   - ホームに戻る
 *   - 同じゲームをもう一度
 *   - 別のゲームをやる（→ GameSelectScreen）
 * の 3 択を提示する。
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { fontSize, fontWeight, getColors, spacing } from '../theme/tokens';
import { Button } from '../components/Button';

export type SinglePlayPostScreenProps = {
  gameLabel: string; // 例：「Game 1」
  onHome: () => void;
  onRepeat: () => void;
  onPickAnother: () => void;
};

export const SinglePlayPostScreen: React.FC<SinglePlayPostScreenProps> = ({
  gameLabel,
  onHome,
  onRepeat,
  onPickAnother,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          {gameLabel} を完了しました
        </Text>
        <Text style={[styles.subtitle, { color: colors.fgPrimary }]}>
          次は何にしますか？
        </Text>

        <View style={styles.btn}>
          <Button
            variant="secondary"
            size="lg"
            label="ホームに戻る"
            onPress={onHome}
            fullWidth
            testId="post-home"
          />
        </View>
        <View style={styles.btn}>
          <Button
            variant="secondary"
            size="lg"
            label="同じゲームをもう一度"
            onPress={onRepeat}
            fullWidth
            testId="post-repeat"
          />
        </View>
        <View style={styles.btn}>
          <Button
            variant="secondary"
            size="lg"
            label="別のゲームをやる"
            onPress={onPickAnother}
            fullWidth
            testId="post-another"
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.s4,
    gap: spacing.s4,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingTop: spacing.s7,
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.body,
    textAlign: 'center',
    marginBottom: spacing.s3,
  },
  btn: {
    width: '100%',
  },
});
