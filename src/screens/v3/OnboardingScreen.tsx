/**
 * OnboardingScreen.tsx — 初回オンボーディング（初回のみ、F-06/F-10）。
 *
 * 2 ページ構成（v3.2：旧 3 ページ目「遊び方」はチュートリアル Lv0（§4.8）と重複するため廃止）：
 *   [1/2] 使用上の注意（免責文）— 「次へ」で進む。同意日時はここで確定。
 *   [2/2] 視聴距離（30/40/50）— **既定は非選択**。選択で「はじめる」活性化。
 *          選択後、その距離での cpd=3 パッチ例を下部にプレビュー表示。
 *          「はじめる」で onComplete（呼び出し側で距離リマインド → 初回はチュートリアル Lv0 へ）。
 *
 * 年代（ageGroup）はゲーム内容に未使用のため**設問を廃止**し、結果は 'unspecified' 固定で返す
 * （永続化スキーマは不変）。
 *
 * 完了時に onComplete(result) を呼ぶ。永続化（onboardingCompleted/disclaimerAgreedAt/
 * ageGroup/viewingDistanceCm）は呼び出し側（App）が UserProfile に保存する。
 * セーフエリア準拠（NF-30）。各 CTA 56pt 以上。i18n は onboardingV3.*。
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
import { SegmentedControl } from '../../components/v2/SegmentedControl';
import { GaborPatch } from '../../components/GaborPatch';
import type { AgeGroup } from '../../state/v3/schema';
import type { ViewingDistanceCm } from '../../lib/calibration';

const TOTAL_STEPS = 2;

/** 距離プレビューのパッチ描画パラメータ。 */
const PREVIEW_CPD = 3; // ユーザー要望：距離プレビューは cpd=3。
const PATCH_CONTRAST = 0.5;
const PATCH_SIGMA_DEG = 0.6;
const PREVIEW_SIZE_PX = 140;

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

  const [step, setStep] = React.useState(1);
  // 視聴距離は**既定非選択**（null）。選択して初めて「はじめる」が活性化する。
  const [distance, setDistance] = React.useState<ViewingDistanceCm | null>(null);
  const agreedAtRef = React.useRef<string | null>(null);

  // [1/2] 使用上の注意：「次へ」で同意日時を確定しステップ 2 へ。
  const handleAgree = React.useCallback(() => {
    agreedAtRef.current = now().toISOString();
    setStep(2);
  }, [now]);

  // [2/2] 「はじめる」＝オンボーディング完了 → 完了通知（距離リマインド → チュートリアルへ）。
  const handleComplete = React.useCallback(() => {
    onComplete({
      ageGroup: 'unspecified',
      viewingDistanceCm: distance ?? 40,
      disclaimerAgreedAt: agreedAtRef.current ?? now().toISOString(),
    });
  }, [distance, now, onComplete]);

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
          accessibilityLabel={t('onboardingV3.step_progress', {
            current: step,
            total: TOTAL_STEPS,
          })}
          testID={testId ? `${testId}-progress` : undefined}
        >
          {t('onboardingV3.step_progress', { current: step, total: TOTAL_STEPS })}
        </Text>

        {step === 1 && (
          <View style={styles.stepBody} testID={testId ? `${testId}-step-1` : undefined}>
            <Text style={[styles.h1, { color: colors.fgPrimary }]}>
              {t('onboardingV3.disclaimer_title')}
            </Text>
            <Text
              style={[styles.body, { color: colors.fgPrimary }]}
              testID={testId ? `${testId}-disclaimer` : undefined}
            >
              {t('onboardingV3.disclaimer_body')}
            </Text>
            <PrimaryButton
              label={t('common.next')}
              onPress={handleAgree}
              testId={testId ? `${testId}-next-1` : undefined}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepBody} testID={testId ? `${testId}-step-2` : undefined}>
            <Text style={[styles.h2, { color: colors.fgPrimary }]}>
              {t('onboardingV3.distance_title')}
            </Text>
            <SegmentedControl<ViewingDistanceCm>
              options={DISTANCE_OPTIONS}
              // null（未選択）時は options に無い値を渡して全 segment 非選択にする。
              value={(distance ?? -1) as ViewingDistanceCm}
              onChange={setDistance}
              accessibilityLabel={t('onboardingV3.distance_title')}
            />
            {/* 距離オプションと「はじめる」の間に常に 1 パッチ分の高さを確保し、選択しても
                ボタン位置がずれないようにする（未選択時は空のプレースホルダ）。 */}
            <View
              style={styles.previewSlot}
              testID={testId ? `${testId}-distance-preview` : undefined}
            >
              {distance !== null && (
                <GaborPatch
                  cpd={PREVIEW_CPD}
                  contrast={PATCH_CONTRAST}
                  orientationDeg={0}
                  phaseRad={0}
                  sigmaDeg={PATCH_SIGMA_DEG}
                  sizePx={PREVIEW_SIZE_PX}
                  viewingDistanceCm={distance}
                  ariaLabel={t('onboardingV3.distance_preview_label')}
                  testId={testId ? `${testId}-preview-patch` : undefined}
                />
              )}
            </View>
            <PrimaryButton
              label={t('onboardingV3.start_game')}
              onPress={handleComplete}
              disabled={distance === null}
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
  previewSlot: {
    height: PREVIEW_SIZE_PX,
    alignItems: 'center',
    justifyContent: 'center',
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
