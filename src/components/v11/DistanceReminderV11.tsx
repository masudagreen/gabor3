/**
 * DistanceReminderV11 — F-16 距離リマインド改訂（spec-v11.md §F-16、3 秒自動進行）。
 * components.md §13 / sprints/sprint-8/screens.md §4。
 *
 * v1 の `DistanceReminder`（「準備ができました」ボタンで進行）を置き換える。
 * - 3 秒カウントダウン → 自動でゲーム画面へ進む（onCountdownComplete）
 * - × ボタンのみ緊急脱出（onAbort）
 * - prefers-reduced-motion: reduce 時はフェード 0ms（呼び出し元で対応）
 */

import React from 'react';
import {
  AccessibilityInfo,
  Platform,
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
} from '../../theme/tokens';
import { IconButton } from '../IconButton';
import { ViewingDistanceCm } from '../../lib/calibration';

export type OneEyeGuidance = 'off' | 'left' | 'right' | 'alternate';

export type DistanceReminderV11Props = {
  distanceCm: ViewingDistanceCm;
  oneEyeGuidance?: OneEyeGuidance;
  onCountdownComplete: () => void;
  onAbort: () => void;
  /** テスト用：カウントダウンの初期秒数（デフォルト 3） */
  initialSecondsForTest?: number;
  /** テスト用：1 tick あたりのミリ秒（デフォルト 1000） */
  tickMsForTest?: number;
  /**
   * true の間、カウントダウン tick を停止する（中断確認ダイアログ表示中など）。
   * 既定 false（後方互換）。false に戻ると残り秒数から再開する。
   */
  paused?: boolean;
};

export const DistanceReminderV11: React.FC<DistanceReminderV11Props> = ({
  distanceCm,
  oneEyeGuidance = 'off',
  onCountdownComplete,
  onAbort,
  initialSecondsForTest = 3,
  tickMsForTest = 1000,
  paused = false,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [seconds, setSeconds] = React.useState<number>(initialSecondsForTest);
  // 連続再描画でも複数発火しないようガード
  const completedRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (seconds <= 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        // 即時呼び出し（フェード遷移は呼び出し元の責務）
        onCountdownComplete();
      }
      return;
    }
    // paused のあいだは tick を発火させない。state を変えないため、paused が
    // false に戻ったらこの effect が再実行されてカウントダウンが再開する。
    if (paused) return;
    const id = setTimeout(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, tickMsForTest);
    return () => clearTimeout(id);
  }, [seconds, tickMsForTest, onCountdownComplete, paused]);

  // SR：1 度だけメインメッセージを読み上げ（Native のみ。Web は aria-live で対応）
  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      AccessibilityInfo.announceForAccessibility(
        `画面から ${distanceCm} センチメートル離れてください。${initialSecondsForTest} 秒後に自動で開始します`,
      );
    } catch {
      // SR 機能未対応端末は無視
    }
  }, [distanceCm, initialSecondsForTest]);

  const showOneEye = oneEyeGuidance && oneEyeGuidance !== 'off';

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="distance-reminder-v11"
    >
      <View style={styles.header}>
        <IconButton
          icon="close"
          ariaLabel="ゲームを中断"
          onPress={onAbort}
          testId="distance-reminder-abort"
        />
      </View>

      <View style={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.headline, { color: colors.fgPrimary }]}
        >
          画面から {distanceCm}cm{'\n'}離れてください
        </Text>

        <View
          style={[
            styles.illustration,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
          accessibilityLabel={`人と画面の距離を示すイラスト：${distanceCm} センチメートル`}
        >
          <Text style={[styles.illustrationGlyph, { color: colors.fgPrimary }]}>
            👤  ←  {distanceCm} cm  →  📱
          </Text>
        </View>

        {showOneEye ? (
          <Text
            accessibilityRole="header"
            style={[styles.oneEye, { color: colors.fgPrimary }]}
          >
            片目を覆ってください{'\n'}（任意）
          </Text>
        ) : null}

        <View style={styles.countdownBox}>
          <Text
            accessibilityLabel={`${seconds} 秒`}
            accessibilityLiveRegion="polite"
            style={[styles.countdownNumber, { color: colors.fgPrimary }]}
            testID="distance-reminder-count"
          >
            {Math.max(0, seconds)}
          </Text>
          <Text style={[styles.countdownHint, { color: colors.fgPrimary }]}>
            {seconds > 0
              ? `${seconds} 秒後に自動で開始`
              : 'ゲームを開始します'}
          </Text>
        </View>
      </View>
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
    flex: 1,
    padding: spacing.s4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s5,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  headline: {
    fontSize: fontSize.h1, // 36
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
  oneEye: {
    fontSize: fontSize.h3, // 26
    fontWeight: fontWeight.medium as '600',
    textAlign: 'center',
    lineHeight: fontSize.h3 * 1.4,
  },
  countdownBox: {
    alignItems: 'center',
    gap: spacing.s3,
  },
  countdownNumber: {
    fontSize: fontSize.numericXl, // 72
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
    lineHeight: fontSize.numericXl,
  },
  countdownHint: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
});
