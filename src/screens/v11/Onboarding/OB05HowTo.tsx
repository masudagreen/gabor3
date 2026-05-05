/**
 * S8-OB-05 ゲーム説明画面（onboarding.md §7）。
 *
 * リリース対象ゲームの全体像と操作仕様を 1 画面で簡潔に説明する。
 * 「N 種類」は releaseEnabled=true なゲーム数を動的に表示（v1.1.4）。
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
import { StepIndicator } from '../../../components/StepIndicator';
import { getReleaseEnabledGameCount } from '../../../lib/v11/releaseFilter';

export type OB05HowToProps = {
  onNext: () => void;
};

const ENABLED_GAME_COUNT = getReleaseEnabledGameCount();

const BLOCKS: ReadonlyArray<{ icon: string; title: string; body: string }> = [
  {
    icon: '📊',
    title: `${ENABLED_GAME_COUNT} 種類のゲームがあります`,
    body: 'ガボールパッチ（縞模様）を使った視覚弁別トレーニングです',
  },
  {
    icon: '⏱',
    title: '各ゲームは 60 秒',
    body: '60 秒間ずっと注視して、選択肢をタップして回答します',
  },
  {
    icon: '✋',
    title: '確定ボタンはありません',
    body:
      '時間切れまで何度でも回答を変更できます。' +
      '60 秒経過時点の選択が自動で採点されます',
  },
];

export const OB05HowTo: React.FC<OB05HowToProps> = ({ onNext }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="ob-howto"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
          nativeID="ob-howto-title"
        >
          使い方
        </Text>
        <View
          style={[styles.divider, { backgroundColor: colors.borderDefault }]}
        />
        {BLOCKS.map((b, i) => (
          <View key={b.title} style={styles.block}>
            <Text
              style={[styles.blockTitle, { color: colors.fgPrimary }]}
              accessibilityRole="header"
            >
              <Text accessibilityElementsHidden>{b.icon} </Text>
              {b.title}
            </Text>
            <Text style={[styles.blockBody, { color: colors.fgPrimary }]}>
              {b.body}
            </Text>
            {i < BLOCKS.length - 1 ? (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.borderDefault },
                ]}
              />
            ) : null}
          </View>
        ))}

        <Text style={[styles.nextHint, { color: colors.fgSecondary }]}>
          👇 次の画面で 1 試行体験します
        </Text>

        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="次へ"
            onPress={onNext}
            fullWidth
            testId="ob-howto-next"
          />
        </View>
        <StepIndicator current={5} total={5} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.s4,
    paddingTop: spacing.s5,
    gap: spacing.s4,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.s7,
  },
  title: {
    fontSize: fontSize.h2, // 30
    fontWeight: fontWeight.bold as '700',
    lineHeight: fontSize.h2 * 1.35,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: spacing.s2,
  },
  block: {
    gap: spacing.s3,
  },
  blockTitle: {
    fontSize: fontSize.bodyLg, // 26
    fontWeight: fontWeight.bold as '700',
  },
  blockBody: {
    fontSize: fontSize.body, // 24
    lineHeight: fontSize.body * 1.6,
  },
  nextHint: {
    fontSize: fontSize.body,
    marginTop: spacing.s2,
  },
  cta: {
    width: '100%',
    marginTop: spacing.s4,
  },
});
