/**
 * S8-OB-03 年齢層申告画面（onboarding.md §4）。
 *
 * 5 択（40s / 50s / 60s / 70s+ / unspecified）+ 「次へ」ボタン。
 * 70 代以上選択時は OB-03b へ分岐（呼び出し元で判定）。
 *
 * v1 の AgeGroupScreen と異なり、「タップ即遷移」ではなく「ラジオ選択 + 次へ」
 * の 2 タップ式（onboarding.md §1 タップ数見積りに準拠）。
 */

import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  radius,
  spacing,
  tapTarget,
} from '../../../theme/tokens';
import { Button } from '../../../components/Button';
import { StepIndicator } from '../../../components/StepIndicator';
import { AgeGroupV11 } from '../../../state/storage-v11';

export type OB03AgeGroupProps = {
  onNext: (ageGroup: AgeGroupV11) => void;
};

const OPTIONS: ReadonlyArray<{ value: AgeGroupV11; label: string }> = [
  { value: '40s', label: '40 代' },
  { value: '50s', label: '50 代' },
  { value: '60s', label: '60 代' },
  { value: '70s+', label: '70 代以上' },
  { value: 'unspecified', label: '指定しない' },
];

export const OB03AgeGroup: React.FC<OB03AgeGroupProps> = ({ onNext }) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [selected, setSelected] = React.useState<AgeGroupV11 | null>(null);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="ob-age-group"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        accessibilityRole="radiogroup"
        accessibilityLabel="年齢層を選択"
      >
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
          nativeID="age-group-question"
        >
          あなたの年齢層は？
        </Text>
        <Text style={[styles.body, { color: colors.fgSecondary }]}>
          訓練効果の参考として保存します{'\n'}（任意・後から変更可能）
        </Text>

        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <RadioCard
              key={opt.value}
              label={opt.label}
              isSelected={isSelected}
              onPress={() => setSelected(opt.value)}
              colors={colors}
              testId={`ob-age-${opt.value}`}
            />
          );
        })}

        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="次へ"
            onPress={() => {
              if (selected !== null) onNext(selected);
            }}
            disabled={selected === null}
            fullWidth
            testId="ob-age-next"
          />
        </View>
        <StepIndicator current={3} total={5} />
      </ScrollView>
    </View>
  );
};

const RadioCard: React.FC<{
  label: string;
  isSelected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof getColors>;
  testId: string;
}> = ({ label, isSelected, onPress, colors, testId }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected, checked: isSelected }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      testID={testId}
      style={({ pressed }) => {
        const style: ViewStyle = {
          minHeight: tapTarget.recommended,
          borderRadius: radius.md,
          borderWidth: isSelected ? 4 : 1,
          borderColor: isSelected
            ? colors.highlightCorrect
            : colors.borderInput,
          backgroundColor: colors.bgSurface,
          paddingHorizontal: spacing.s5,
          paddingVertical: spacing.s4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.s4,
          opacity: pressed ? 0.85 : 1,
          ...(Platform.OS === 'web' && focused
            ? ({
                outlineColor: colors.focusRing,
                outlineWidth: 3,
                outlineStyle: 'solid',
                outlineOffset: 2,
              } as object)
            : {}),
        };
        return style;
      }}
    >
      <Text
        style={{
          fontSize: fontSize.bodyLg, // 26
          color: colors.fgPrimary,
        }}
      >
        {isSelected ? '◉' : '○'}
      </Text>
      <Text
        style={{
          fontSize: fontSize.bodyLg, // 26
          color: colors.fgPrimary,
          fontWeight: fontWeight.medium as '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.s4,
    paddingTop: spacing.s6,
    paddingBottom: spacing.s7,
    gap: spacing.s3,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: fontSize.h2, // 30
    fontWeight: fontWeight.bold as '700',
    lineHeight: fontSize.h2 * 1.35,
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.5,
    marginBottom: spacing.s2,
  },
  cta: {
    width: '100%',
    marginTop: spacing.s3,
  },
});
