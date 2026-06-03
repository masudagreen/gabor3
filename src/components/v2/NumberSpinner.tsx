/**
 * NumberSpinner.tsx — 数値テキストボックス + スピンボタン（−/＋）。
 *
 * スライダー（Slider）の代替（ユーザー要望）。微小な step（例 b=0.005）でも、
 * テキストで現在値を直接読めて、−/＋ で正確に 1 step ずつ増減でき、直接入力も可能。
 *
 * - 値表示：TextInput（数値）。入力中は自由編集、確定（blur/Enter）で clamp + step スナップ。
 * - −/＋：1 step ずつ増減（範囲端で disabled）。長押し連続は付けない（老眼配慮の単純操作）。
 * - 単位（°/sec 等）は入力欄の右に添える。
 *
 * a11y：role=spinbutton + aria-valuemin/max/now/valuetext。−/＋ は個別ボタン。
 * タップ領域は 48pt 以上（OPT-2）。Web は TextInput / ボタンに Tab 到達 + focus ring。
 */

import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import { fontSize, fontWeight, radius, spacing, tapTarget } from '../../theme/tokens';
import { webAria } from '../../theme/ariaWeb';

export type NumberSpinnerProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** 表示小数桁（例 a=1, b=3, m/r=0）。入力の丸めにも使う。 */
  decimals?: number;
  /** 値の右に添える単位（例 '°/sec'）。無ければ空。 */
  unit?: string;
  /** スクリーンリーダー用の読み上げ文（単位込み）。 */
  valueText: (v: number) => string;
  onChange: (v: number) => void;
  /** 難易度ヒント（小=難しい / 大=易しい）の表示。 */
  showDifficultyHint?: boolean;
  testId?: string;
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** value を step 格子にスナップし、step の小数桁で丸めて float 誤差を消す。 */
function snap(v: number, step: number, min: number): number {
  const steps = Math.round((v - min) / step);
  const snapped = min + steps * step;
  const decimals = step.toString().includes('.')
    ? step.toString().split('.')[1].length
    : 0;
  return Number(snapped.toFixed(decimals));
}

export const NumberSpinner: React.FC<NumberSpinnerProps> = ({
  label,
  value,
  min,
  max,
  step,
  decimals = 0,
  unit = '',
  valueText,
  onChange,
  showDifficultyHint,
  testId,
}) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();

  const display = (v: number) => v.toFixed(decimals);
  const [text, setText] = React.useState(display(value));
  const [focused, setFocused] = React.useState(false);

  // 外部から value が変わった（−/＋ や他経路）ときは、編集中でなければ表示を同期。
  React.useEffect(() => {
    if (!focused) setText(display(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused, decimals]);

  const atMin = value <= min;
  const atMax = value >= max;

  const commit = React.useCallback(
    (raw: string) => {
      const parsed = parseFloat(raw.replace(/[^0-9.\-]/g, ''));
      if (Number.isNaN(parsed)) {
        setText(display(value)); // 不正入力は元に戻す
        return;
      }
      const next = snap(clamp(parsed, min, max), step, min);
      onChange(next);
      setText(display(next));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, min, max, step, onChange, decimals],
  );

  const decrement = () => {
    if (atMin) return;
    onChange(snap(clamp(value - step, min, max), step, min));
  };
  const increment = () => {
    if (atMax) return;
    onChange(snap(clamp(value + step, min, max), step, min));
  };

  const btnStyle = (disabled: boolean) =>
    ({ pressed }: { pressed: boolean }) =>
      [
        styles.stepBtn,
        {
          backgroundColor: disabled ? colors.actionSecondary : colors.actionPrimary,
          borderColor: colors.borderDefault,
        },
        focus,
        pressed && !disabled && styles.pressed,
      ];

  return (
    <View
      // 数値スピナーとして role/aria を提示（NF-15）。
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: valueText(value) }}
      {...webAria('spinbutton', undefined, label)}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(Platform.OS === 'web'
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ({
            'aria-valuemin': min,
            'aria-valuemax': max,
            'aria-valuenow': value,
            'aria-valuetext': valueText(value),
          } as any)
        : {})}
      testID={testId}
    >
      <Text style={[styles.label, { color: colors.fgPrimary }]}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          onPress={decrement}
          disabled={atMin}
          accessibilityRole="button"
          accessibilityLabel={`${label}を下げる`}
          accessibilityState={{ disabled: atMin }}
          style={btnStyle(atMin)}
          testID={testId ? `${testId}-dec` : undefined}
        >
          <Text style={[styles.glyph, { color: atMin ? colors.fgMuted : colors.fgOnPrimary }]}>
            −
          </Text>
        </Pressable>

        <View style={styles.field}>
          <TextInput
            value={text}
            onChangeText={setText}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              commit(text);
            }}
            onSubmitEditing={() => commit(text)}
            keyboardType={decimals > 0 ? 'decimal-pad' : 'number-pad'}
            inputMode={decimals > 0 ? 'decimal' : 'numeric'}
            selectTextOnFocus
            style={[
              styles.input,
              { color: colors.fgPrimary, borderColor: colors.borderDefault, backgroundColor: colors.bgSurface },
              focus,
            ]}
            // ラベルは外側のラッパ（role=spinbutton）が保持するため、入力欄では重複させない。
            testID={testId ? `${testId}-input` : undefined}
          />
          {unit ? (
            <Text style={[styles.unit, { color: colors.fgSecondary }]}>{unit}</Text>
          ) : null}
        </View>

        <Pressable
          onPress={increment}
          disabled={atMax}
          accessibilityRole="button"
          accessibilityLabel={`${label}を上げる`}
          accessibilityState={{ disabled: atMax }}
          style={btnStyle(atMax)}
          testID={testId ? `${testId}-inc` : undefined}
        >
          <Text style={[styles.glyph, { color: atMax ? colors.fgMuted : colors.fgOnPrimary }]}>
            ＋
          </Text>
        </Pressable>
      </View>
      {showDifficultyHint ? (
        <View style={styles.hintRow}>
          <Text style={[styles.hint, { color: colors.fgSecondary }]}>難しい（小）</Text>
          <Text style={[styles.hint, { color: colors.fgSecondary }]}>易しい（大）</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.s2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  stepBtn: {
    width: tapTarget.recommended,
    height: tapTarget.recommended,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    lineHeight: 32,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s2,
  },
  input: {
    minWidth: 96,
    minHeight: tapTarget.recommended,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.s3,
    textAlign: 'center',
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
    // react-native-web で tabular-nums（桁ぶれ防止）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
  },
  unit: {
    fontSize: fontSize.body,
  },
  pressed: { opacity: 0.8 },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.s2,
  },
  hint: {
    fontSize: fontSize.caption,
  },
});
