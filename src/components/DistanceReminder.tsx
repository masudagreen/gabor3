/**
 * DistanceReminder — components.md §12 / screens.md S1-02 に従う最小実装。
 *
 * Sprint 1 では距離変更ボタンは Stub（Sprint 4 で本実装）。
 * 「準備ができました」プライマリ CTA のみ。
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
} from '../theme/tokens';
import { Button } from './Button';
import { IconButton } from './IconButton';

export type DistanceReminderProps = {
  distanceCm: 30 | 40 | 50;
  onProceed: () => void;
  onBack: () => void;
};

export const DistanceReminder: React.FC<DistanceReminderProps> = ({
  distanceCm,
  onProceed,
  onBack,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      <View style={styles.header}>
        <IconButton icon="back" ariaLabel="戻る" onPress={onBack} testId="reminder-back" />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        accessibilityLiveRegion="polite"
      >
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          画面から {distanceCm} cm 離れて{'\n'}ください
        </Text>
        <View
          style={[
            styles.illustration,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
          ]}
          accessibilityLabel="人と画面の距離を示すイラスト"
        >
          <Text style={[styles.illustrationGlyph, { color: colors.fgPrimary }]}>
            👤  ←  {distanceCm} cm  →  📱
          </Text>
        </View>
        <Text style={[styles.body, { color: colors.fgPrimary }]}>
          準備ができたら下のボタンを押してください
        </Text>
        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="準備ができました"
            onPress={onProceed}
            fullWidth
            testId="reminder-proceed"
          />
        </View>
        <Text style={[styles.note, { color: colors.fgMuted }]}>
          老眼の読書距離標準は 40cm です
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    padding: spacing.s4,
    paddingTop: spacing.s6,
    alignItems: 'center',
    gap: spacing.s5,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: fontSize.h1, // 36px
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
    lineHeight: fontSize.h1 * 1.3,
  },
  illustration: {
    width: 240,
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationGlyph: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium as '600',
  },
  body: {
    fontSize: fontSize.body,
    textAlign: 'center',
    lineHeight: fontSize.body * 1.6,
  },
  cta: {
    width: '100%',
    maxWidth: 480,
  },
  note: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
});
