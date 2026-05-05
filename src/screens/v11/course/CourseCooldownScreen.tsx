/**
 * CourseCooldownScreen — S18-05（design-v11/sprints/sprint-18/screens.md §6）。
 * F-15 セッションクールダウン。
 *
 * - 10 秒カウントダウン、自動で完了画面へ
 * - スキップボタン（Secondary lg、56pt+）
 * - イラストは静止（点滅・アニメなし、NF-11）
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
  spacing,
  radius,
} from '../../../theme/tokens';
import { Button } from '../../../components/Button';
import { IconButton } from '../../../components/IconButton';

export type CourseCooldownScreenProps = {
  onCompleted: () => void;
  /** 中断ボタン（× アイコン）押下時に呼ばれる。省略時は中断ボタン非表示。 */
  onAbort?: () => void;
  /**
   * true の間、カウントダウン tick を停止する（中断確認ダイアログ表示中など）。
   * 既定 false。false に戻ると残り秒数から再開する。
   */
  paused?: boolean;
  /** 既定 10 秒、テスト用 */
  initialSecondsForTest?: number;
  /** 既定 1000ms、テスト用 */
  tickMsForTest?: number;
};

export const CourseCooldownScreen: React.FC<CourseCooldownScreenProps> = ({
  onCompleted,
  onAbort,
  paused = false,
  initialSecondsForTest = 10,
  tickMsForTest = 1000,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [seconds, setSeconds] = React.useState<number>(initialSecondsForTest);
  const completedRef = React.useRef<boolean>(false);

  const finalize = React.useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleted();
  }, [onCompleted]);

  React.useEffect(() => {
    if (seconds <= 0) {
      finalize();
      return;
    }
    // paused のあいだは tick を発火させない。
    if (paused) return;
    const id = setTimeout(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, tickMsForTest);
    return () => clearTimeout(id);
  }, [seconds, tickMsForTest, finalize, paused]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="course-cooldown-screen"
    >
      {onAbort ? (
        <View style={styles.header}>
          <IconButton
            icon="close"
            ariaLabel="コースを中断"
            onPress={onAbort}
            testId="course-cooldown-abort"
          />
        </View>
      ) : null}
      <View style={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          目を休めましょう
        </Text>

        <View
          style={[
            styles.illustration,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
          accessibilityLabel="遠くを見るイラスト"
        >
          <Text
            style={[styles.illustrationGlyph, { color: colors.fgPrimary }]}
            accessibilityElementsHidden
          >
            👀  →  🌳
          </Text>
        </View>

        <Text style={[styles.body, { color: colors.fgPrimary }]}>
          {seconds} 秒間、できるだけ遠くを見る
        </Text>

        <Text
          accessibilityLabel={`残り ${seconds} 秒`}
          accessibilityLiveRegion="polite"
          style={[styles.countdown, { color: colors.fgPrimary }]}
          testID="course-cooldown-count"
        >
          {Math.max(0, seconds)}
        </Text>

        <Button
          variant="secondary"
          size="lg"
          label="スキップ"
          onPress={finalize}
          fullWidth
          testId="course-cooldown-skip"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.s5,
    gap: spacing.s5,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  illustration: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s5,
  },
  illustrationGlyph: {
    fontSize: 48,
  },
  body: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  countdown: {
    fontSize: fontSize.numericXl,
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
