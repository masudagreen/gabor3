/**
 * OnboardingScreen.tsx — S6-1 オンボーディング（初回のみ、F-06/F-10）。
 *
 * 4 ステップ・合計タップ 6 以下（F-06）：
 *   [1/4] 免責同意（DisclaimerPanel）— 理解チェック(1) + 同意(2)。未チェックで同意 disabled。
 *   [2/4] 年齢層（任意）— 選択で自動進行(3)。70 代以上は警告 + 別タップで続行(4)。
 *   [3/4] 視聴距離（30/40/50、既定 40）— 選択で自動進行(distance tap)。
 *   [4/4] ゲーム概要 — 「はじめる」(start tap) で完了 → onComplete。
 *
 * 完了時に onComplete(result) を呼ぶ。永続化（onboardingCompleted/disclaimerAgreedAt/
 * ageGroup/viewingDistanceCm）は呼び出し側（App）が UserProfile に保存する。
 * セーフエリア準拠（NF-30）。各 CTA 56pt 以上。
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import {
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  spacing,
  tapTarget,
} from '../../theme/tokens';
import { t } from '../../i18n';
import { DisclaimerPanel } from '../../components/v2/DisclaimerPanel';
import { SegmentedControl } from '../../components/v2/SegmentedControl';
import type { AgeGroup } from '../../state/schema';
import type { ViewingDistanceCm } from '../../lib/calibration';

const TOTAL_STEPS = 4;

export type OnboardingResult = {
  ageGroup: AgeGroup;
  viewingDistanceCm: ViewingDistanceCm;
  /** 免責同意日時（ISO 文字列）。同意した瞬間に確定する。 */
  disclaimerAgreedAt: string;
};

export type OnboardingScreenProps = {
  onComplete: (result: OnboardingResult) => void;
  /** 同意日時を採取する時計（テスト決定論）。既定は new Date()。 */
  now?: () => Date;
  testId?: string;
};

const AGE_OPTIONS: ReadonlyArray<{ value: AgeGroup; label: string }> = [
  { value: '40s', label: t('onboarding.age_40s') },
  { value: '50s', label: t('onboarding.age_50s') },
  { value: '60s', label: t('onboarding.age_60s') },
  { value: '70s+', label: t('onboarding.age_70s') },
  { value: 'unspecified', label: t('onboarding.age_unspecified') },
];

const DISTANCE_OPTIONS: ReadonlyArray<{
  value: ViewingDistanceCm;
  label: string;
}> = [
  { value: 30, label: `30${t('settings.unit_cm')}` },
  { value: 40, label: `40${t('settings.unit_cm')}` },
  { value: 50, label: `50${t('settings.unit_cm')}` },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
  now = () => new Date(),
  testId,
}) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();

  const [step, setStep] = React.useState(1);
  const [understood, setUnderstood] = React.useState(false);
  const [ageGroup, setAgeGroup] = React.useState<AgeGroup>('unspecified');
  const [ageChosen, setAgeChosen] = React.useState(false);
  const [distance, setDistance] = React.useState<ViewingDistanceCm>(40);
  const agreedAtRef = React.useRef<string | null>(null);

  // [1/4] 免責同意：チェックで disabled 解除、同意で日時確定 → ステップ 2。
  const handleAgree = React.useCallback(() => {
    if (!understood) return;
    agreedAtRef.current = now().toISOString();
    setStep(2);
  }, [understood, now]);

  // [2/4] 年齢層：選択を記録。70 代以上は警告を残し、別タップ（続行）で進む。
  //        それ以外は選択そのもので自動進行（タップ数節約、F-06）。
  const handleAge = React.useCallback((value: AgeGroup) => {
    setAgeGroup(value);
    setAgeChosen(true);
    if (value !== '70s+') {
      setStep(3);
    }
  }, []);

  // [3/4] 視聴距離：選択そのもので自動進行。
  const handleDistance = React.useCallback((value: ViewingDistanceCm) => {
    setDistance(value);
    setStep(4);
  }, []);

  // [4/4] はじめる：完了通知。
  const handleStart = React.useCallback(() => {
    onComplete({
      ageGroup,
      viewingDistanceCm: distance,
      disclaimerAgreedAt: agreedAtRef.current ?? now().toISOString(),
    });
  }, [ageGroup, distance, now, onComplete]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.root, { backgroundColor: colors.bgCanvas }]}
      testID={testId}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text
          style={[styles.progress, { color: colors.fgSecondary }]}
          accessibilityRole="text"
          accessibilityLabel={t('onboarding.step_progress', {
            current: step,
            total: TOTAL_STEPS,
          })}
          testID={testId ? `${testId}-progress` : undefined}
        >
          {t('onboarding.step_progress', { current: step, total: TOTAL_STEPS })}
        </Text>

        {step === 1 && (
          <View style={styles.stepBody} testID={testId ? `${testId}-step-1` : undefined}>
            <Text style={[styles.h1, { color: colors.fgPrimary }]}>
              {t('onboarding.welcome_title')}
            </Text>
            <DisclaimerPanel testId={testId ? `${testId}-disclaimer` : undefined} />
            <Pressable
              onPress={() => setUnderstood((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: understood }}
              accessibilityLabel={t('onboarding.understand_check')}
              style={({ pressed }) => [
                styles.checkRow,
                focus,
                pressed && styles.pressed,
              ]}
              testID={testId ? `${testId}-understand` : undefined}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: colors.borderStrong },
                  understood && { backgroundColor: colors.actionPrimary },
                ]}
              >
                {understood && (
                  <Text style={[styles.checkmark, { color: colors.fgOnPrimary }]}>
                    ✓
                  </Text>
                )}
              </View>
              <Text style={[styles.checkLabel, { color: colors.fgPrimary }]}>
                {t('onboarding.understand_check')}
              </Text>
            </Pressable>
            <PrimaryButton
              label={t('onboarding.agree')}
              onPress={handleAgree}
              disabled={!understood}
              testId={testId ? `${testId}-agree` : undefined}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepBody} testID={testId ? `${testId}-step-2` : undefined}>
            <Text style={[styles.h2, { color: colors.fgPrimary }]}>
              {t('onboarding.age_title')}
            </Text>
            <SegmentedControl<AgeGroup>
              options={AGE_OPTIONS}
              value={ageGroup}
              onChange={handleAge}
              accessibilityLabel={t('onboarding.age_title')}
            />
            {ageChosen && ageGroup === '70s+' && (
              <>
                <Text
                  style={[styles.warning, { color: colors.semanticError }]}
                  accessibilityRole="text"
                  testID={testId ? `${testId}-age-warning` : undefined}
                >
                  {t('onboarding.age_70s_warning')}
                </Text>
                <PrimaryButton
                  label={t('common.next')}
                  onPress={() => setStep(3)}
                  testId={testId ? `${testId}-age-continue` : undefined}
                />
              </>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepBody} testID={testId ? `${testId}-step-3` : undefined}>
            <Text style={[styles.h2, { color: colors.fgPrimary }]}>
              {t('onboarding.distance_title')}
            </Text>
            <SegmentedControl<ViewingDistanceCm>
              options={DISTANCE_OPTIONS}
              value={distance}
              onChange={handleDistance}
              accessibilityLabel={t('onboarding.distance_title')}
            />
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepBody} testID={testId ? `${testId}-step-4` : undefined}>
            <Text style={[styles.h2, { color: colors.fgPrimary }]}>
              {t('onboarding.overview_title')}
            </Text>
            <Text style={[styles.body, { color: colors.fgPrimary }]}>
              {t('onboarding.overview_body')}
            </Text>
            <PrimaryButton
              label={t('onboarding.start_game')}
              onPress={handleStart}
              testId={testId ? `${testId}-start` : undefined}
            />
          </View>
        )}

        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i + 1 === step ? colors.actionPrimary : colors.borderDefault,
                },
              ]}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const PrimaryButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testId?: string;
}> = ({ label, onPress, disabled = false, testId }) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: disabled ? colors.borderDefault : colors.actionPrimary },
        focus,
        pressed && !disabled && styles.pressed,
      ]}
      testID={testId}
    >
      <Text
        style={[
          styles.ctaText,
          { color: disabled ? colors.fgSecondary : colors.fgOnPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    padding: spacing.s5,
    gap: spacing.s5,
    flexGrow: 1,
  },
  progress: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  stepBody: { gap: spacing.s5, flex: 1 },
  h1: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.h1 * lineHeight.h1,
  },
  h2: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.h2 * lineHeight.h2,
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.body,
  },
  warning: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.body * lineHeight.body,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    minHeight: tapTarget.recommended,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { fontSize: 22, fontWeight: '900', lineHeight: 24 },
  checkLabel: {
    fontSize: fontSize.body,
    flexShrink: 1,
  },
  cta: {
    minHeight: tapTarget.recommended,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s6,
  },
  ctaText: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
  },
  pressed: { opacity: 0.8 },
  dots: {
    flexDirection: 'row',
    gap: spacing.s2,
    justifyContent: 'center',
    paddingTop: spacing.s4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
  },
});
