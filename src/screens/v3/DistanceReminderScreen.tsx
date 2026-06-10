/**
 * DistanceReminderScreen.tsx — S7-2 距離リマインド（DR-1、F-06/OPT-10/F-12）v3.0。
 *
 * 「画面から {n}cm 離れてください」（{n}=viewingDistanceCm）を 18pt 以上（実際 h1 36px）で
 * 表示し、CountdownTimer large（v3）で短いカウントダウン（既定 3 秒）を回して自動進行する。
 * X 中断以外のユーザー操作は不要（F-06）。3 秒なので開始から赤 danger（F-12）。
 *
 * 片眼ガイダンス（off 以外）時のみ「片目を覆ってください（任意）」を表示する。
 * セーフエリア準拠（NF-30）。i18n は distanceV3.*。
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import {
  fontSize,
  fontWeight,
  lineHeight,
  spacing,
  tapTarget,
} from '../../theme/tokens';
import { t } from '../../i18n';
import { CountdownTimer } from '../../components/v3/CountdownTimer';
import type { ViewingDistanceCm } from '../../lib/calibration';
import type { OneEyeGuidance } from '../../state/v3/schema';

/** 距離リマインドのカウントダウン秒数（screens.md S7-2、Designer 提案 3 秒）。 */
export const DISTANCE_COUNTDOWN_SEC = 3;

export type DistanceReminderScreenProps = {
  viewingDistanceCm: ViewingDistanceCm;
  oneEyeGuidance?: OneEyeGuidance;
  /** カウントダウン完了でゲーム開始（自動進行）。 */
  onComplete: () => void;
  /** X 中断（ゲームを始めずホーム待機へ）。 */
  onAbort: () => void;
  /** テスト用：カウントダウン秒数の上書き。 */
  countdownSec?: number;
  testId?: string;
};

function oneEyeText(guidance: OneEyeGuidance): string | null {
  switch (guidance) {
    case 'left':
      return t('distanceV3.one_eye_left');
    case 'right':
      return t('distanceV3.one_eye_right');
    case 'alternate':
      return t('distanceV3.one_eye_cover');
    default:
      return null;
  }
}

export const DistanceReminderScreen: React.FC<DistanceReminderScreenProps> = ({
  viewingDistanceCm,
  oneEyeGuidance = 'off',
  onComplete,
  onAbort,
  countdownSec = DISTANCE_COUNTDOWN_SEC,
  testId,
}) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();
  const [remaining, setRemaining] = React.useState(countdownSec);
  // 完了通知は 1 度だけ（再レンダリングでの多重発火を防ぐ）。
  const completedRef = React.useRef(false);

  React.useEffect(() => {
    if (remaining <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onComplete]);

  const oneEye = oneEyeText(oneEyeGuidance);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.root, { backgroundColor: colors.bgCanvas }]}
      testID={testId}
    >
      <View style={styles.header}>
        <Pressable
          onPress={onAbort}
          accessibilityRole="button"
          accessibilityLabel={t('distanceV3.abort_label')}
          style={({ pressed }) => [styles.abort, focus, pressed && styles.pressed]}
          testID={testId ? `${testId}-abort` : undefined}
        >
          <Text style={[styles.abortMark, { color: colors.fgPrimary }]}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text
          style={[styles.title, { color: colors.fgPrimary }]}
          accessibilityRole="header"
          testID={testId ? `${testId}-title` : undefined}
        >
          {t('distanceV3.title', { n: viewingDistanceCm })}
        </Text>
        <Text style={[styles.title, { color: colors.fgPrimary }]}>
          {t('distanceV3.title_suffix')}
        </Text>

        {oneEye && (
          <Text
            style={[styles.oneEye, { color: colors.fgSecondary }]}
            testID={testId ? `${testId}-one-eye` : undefined}
          >
            {oneEye}
          </Text>
        )}

        {/* 数字のカウントダウンのみ（「n 秒後に自動で始まります」の文言は出さない＝ユーザー要望）。 */}
        <View style={styles.timer}>
          <CountdownTimer
            remainingSec={remaining}
            variant="large"
            testId={testId ? `${testId}-countdown` : undefined}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s2,
  },
  abort: {
    width: tapTarget.iconButton,
    height: tapTarget.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abortMark: { fontSize: 28, fontWeight: fontWeight.bold },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s5,
    padding: spacing.s5,
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.h1 * lineHeight.h1,
    textAlign: 'center',
  },
  oneEye: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  timer: { marginVertical: spacing.s4 },
  pressed: { opacity: 0.6 },
});
