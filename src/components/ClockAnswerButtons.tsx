/**
 * ClockAnswerButtons — components.md §19 / screens.md S3-01。
 *
 * 8 個の時計方向ボタンを文字盤型に絶対配置する Game 3 回答 UI。
 *
 * - ラベル：12 / 1:30 / 3 / 4:30 / 6 / 7:30 / 9 / 10:30
 * - 各ボタン 72×72px（OPT-2 タップ領域 + 24px ラベル収容）
 * - フォント 24px Medium、tabular-nums（OPT-1 床）
 * - 円直径：スマホ 320px、PC 360px（diameter prop で切替）
 * - 配置：中心 (diameter/2, diameter/2)、半径 r = diameter/2 - buttonSize/2 - margin
 *   12 時 = -π/2、時計回りに +45°
 * - feedback：highlightCorrect prop で正解側に枠を表示（0.8 秒、親が制御）
 * - aria-label：「時計の N 時の方向」
 */

import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  tapTarget,
} from '../theme/tokens';
import {
  CLOCK_POSITIONS,
  ClockPosition,
  PositionIndex,
  angleRadForIndex,
} from '../lib/game3';

export type ClockAnswerButtonsProps = {
  /** 直径（px）。components.md §19：スマホ 320 / PC 360 */
  diameter?: number;
  /** ボタン径 px（components.md §19：72px 固定推奨） */
  buttonSize?: number;
  disabled?: boolean;
  onSelect: (pos: ClockPosition) => void;
  /** 正解位置をハイライト（feedback フェーズ 0.8 秒） */
  highlightCorrect?: ClockPosition;
  testId?: string;
};

const ARIA_LABELS: Record<ClockPosition, string> = {
  '12': '時計の 12 時の方向',
  '1:30': '時計の 1 時 30 分の方向',
  '3': '時計の 3 時の方向',
  '4:30': '時計の 4 時 30 分の方向',
  '6': '時計の 6 時の方向',
  '7:30': '時計の 7 時 30 分の方向',
  '9': '時計の 9 時の方向',
  '10:30': '時計の 10 時 30 分の方向',
};

export const ClockAnswerButtons: React.FC<ClockAnswerButtonsProps> = ({
  diameter = 320,
  buttonSize = 72,
  disabled,
  onSelect,
  highlightCorrect,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  // ボタン中心の半径：直径の半分から、ボタン半径＋マージンを差し引く
  const margin = 8;
  const radius = diameter / 2 - buttonSize / 2 - margin;
  const cx = diameter / 2;
  const cy = diameter / 2;

  return (
    <View
      style={[styles.frame, { width: diameter, height: diameter }]}
      accessibilityRole={(Platform.OS === 'web' ? 'none' : undefined) as undefined}
      accessibilityLabel="時計の方向ボタン 8 個"
      testID={testId}
    >
      {CLOCK_POSITIONS.map((pos, idx) => {
        const angle = angleRadForIndex(idx as PositionIndex);
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        const isHighlighted = highlightCorrect === pos;

        const left = x - buttonSize / 2;
        const top = y - buttonSize / 2;

        return (
          <Pressable
            key={pos}
            onPress={() => onSelect(pos)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={ARIA_LABELS[pos]}
            accessibilityState={{ disabled: !!disabled }}
            testID={testId ? `${testId}-btn-${pos}` : `clock-btn-${pos}`}
            style={({ pressed }) => [
              styles.btn,
              {
                width: buttonSize,
                height: buttonSize,
                left,
                top,
                backgroundColor: isHighlighted
                  ? colors.highlightCorrect
                  : colors.actionSecondary,
                // Sprint 7-C：WCAG 1.4.11（非テキスト要素 3:1）を満たすため
                // borderDefault（neutral200、低コントラスト）→ fgMuted（neutral500、
                // light: #4D525C 7.84:1 / dark: #9CA3AD 8.26:1）に強化。
                borderColor: isHighlighted
                  ? colors.highlightCorrect
                  : colors.fgMuted,
                borderWidth: isHighlighted ? 3 : 2,
                opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isHighlighted ? colors.fgPrimary : colors.fgPrimary,
                },
              ]}
            >
              {pos}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    alignSelf: 'center',
  },
  btn: {
    position: 'absolute',
    minWidth: tapTarget.min,
    minHeight: tapTarget.min,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    // OPT-1 床：24px、Medium、tabular-nums
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium as '600',
    fontVariant: ['tabular-nums'],
    lineHeight: fontSize.body,
  },
});
