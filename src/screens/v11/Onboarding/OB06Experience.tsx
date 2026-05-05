/**
 * S8-OB-06 1 試行体験（onboarding.md §8）。
 *
 * 本来は G-04 コントラスト弁別を 1 試行プレイする画面だが、Sprint 8 では
 * G-04 がまだ未実装のため、プレースホルダ画面として「ホームへ」ボタンで
 * オンボーディング完了処理を行う。
 *
 * Sprint 12（G-04 実装スプリント）以降で本コンポーネントをゲームプレイ画面
 * + 結果サマリ + 完了通知バナーに差し替える。
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

export type OB06ExperienceProps = {
  onComplete: () => void;
};

export const OB06Experience: React.FC<OB06ExperienceProps> = ({
  onComplete,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="ob-experience"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.banner,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.semanticSuccess,
            },
          ]}
          accessibilityRole="text"
          accessibilityLabel="オンボーディング完了。お疲れさまでした。明日からはホームの全ゲーム連続プレイから 13 ゲームをご利用ください"
        >
          <Text
            style={[styles.bannerTitle, { color: colors.fgPrimary }]}
            accessibilityRole="header"
          >
            ✓ オンボーディング完了
          </Text>
          <Text style={[styles.bannerBody, { color: colors.fgPrimary }]}>
            お疲れさまでした。{'\n'}
            明日からはホームの「全ゲーム連続プレイ」から{'\n'}
            13 ゲームをご利用ください。
          </Text>
        </View>

        <View
          style={[
            styles.placeholder,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[styles.placeholderTitle, { color: colors.fgPrimary }]}
          >
            1 試行体験
          </Text>
          <Text style={[styles.placeholderBody, { color: colors.fgSecondary }]}>
            実際のゲームは Sprint 9 以降で順次実装されます。{'\n'}
            今回は体験省略で完了とします。
          </Text>
        </View>

        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="ホームへ"
            onPress={onComplete}
            fullWidth
            testId="ob-experience-home"
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
    paddingTop: spacing.s5,
    gap: spacing.s4,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.s7,
  },
  banner: {
    padding: spacing.s5,
    borderRadius: radius.md,
    borderWidth: 2,
    gap: spacing.s3,
  },
  bannerTitle: {
    fontSize: fontSize.bodyLg, // 26
    fontWeight: fontWeight.bold as '700',
  },
  bannerBody: {
    fontSize: fontSize.body, // 24
    lineHeight: fontSize.body * 1.6,
  },
  placeholder: {
    padding: spacing.s5,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.s3,
    alignItems: 'flex-start',
  },
  placeholderTitle: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold as '700',
  },
  placeholderBody: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.6,
  },
  cta: {
    width: '100%',
    marginTop: spacing.s4,
  },
});
