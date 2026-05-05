/**
 * CooldownScreen — セッションクールダウン画面（screens.md S5-02 / spec.md F-16）。
 *
 * - おまかせコース完了直後に 1 枚挟む
 * - 10 秒カウントダウン（1 秒ごと減算）
 * - スキップボタンで途中スキップ可能（スキップしてもセッション完了は記録される、
 *   ただし記録は呼び出し元 CourseScreen で済んでいる前提）
 * - イラストは静止（テキストのみ、点滅・アニメなし）
 *
 * a11y：
 *   - 数字は aria-live=polite（5 秒以下時のみ）
 *   - スキップボタン aria-label
 *   - 数字は tabular-nums で 1 秒ごと更新
 */

import React from 'react';
import {
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
} from '../theme/tokens';
import { Button } from '../components/Button';

export type CooldownScreenProps = {
  /** スキップ／自動完了で呼ばれる遷移コールバック */
  onComplete: () => void;
  /** カウントダウン秒数（デフォルト 10） */
  totalSeconds?: number;
};

export const CooldownScreen: React.FC<CooldownScreenProps> = ({
  onComplete,
  totalSeconds = 10,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [remaining, setRemaining] = React.useState<number>(totalSeconds);
  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  React.useEffect(() => {
    setRemaining(totalSeconds);
    const id = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(id);
          onCompleteRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [totalSeconds]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="cooldown-screen"
    >
      <View style={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          遠くを見て{'\n'}目を休めましょう
        </Text>

        <View
          accessibilityRole="image"
          accessibilityLabel="遠くを見るイラスト"
          style={[
            styles.illustration,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
        >
          <Text style={styles.illustrationGlyph}>🌄</Text>
        </View>

        <View
          style={[
            styles.countdownBox,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
        >
          <Text
            testID="cooldown-number"
            accessibilityLiveRegion={remaining <= 5 ? 'polite' : 'none'}
            style={[styles.countdownNumber, { color: colors.fgPrimary }]}
          >
            {remaining}
          </Text>
          <Text style={[styles.countdownUnit, { color: colors.fgPrimary }]}>
            秒
          </Text>
        </View>

        <Text style={[styles.note, { color: colors.fgMuted }]}>
          20-20-20 ルール：20 秒ごと{'\n'}20 フィート（6m）先を見ましょう
        </Text>

        <View style={styles.cta}>
          <Button
            variant="tertiary"
            size="lg"
            label="スキップ"
            ariaLabel="クールダウンをスキップ"
            onPress={onComplete}
            fullWidth
            testId="cooldown-skip"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.s4,
    paddingTop: spacing.s7,
    gap: spacing.s5,
    alignItems: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: fontSize.h1, // 36px
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
    lineHeight: fontSize.h1 * 1.3,
  },
  illustration: {
    width: 200,
    height: 200,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationGlyph: {
    fontSize: 96,
  },
  countdownBox: {
    minWidth: 160,
    padding: spacing.s4,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: fontSize.numericXl, // 72px
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
    lineHeight: fontSize.numericXl * 1.0,
  },
  countdownUnit: {
    fontSize: fontSize.bodyLg,
    marginTop: spacing.s2,
  },
  note: {
    fontSize: fontSize.caption, // 20px（注釈、装飾扱い）
    textAlign: 'center',
  },
  cta: {
    width: '100%',
    paddingTop: spacing.s4,
  },
});
