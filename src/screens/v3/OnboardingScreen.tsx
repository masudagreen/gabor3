/**
 * OnboardingScreen.tsx — 初回オンボーディング（初回のみ、F-06/F-10）。
 *
 * 3 ページ構成（ユーザー要望リデザイン）：
 *   [1/3] 使用上の注意（免責文）— 「次へ」で進む。同意日時はここで確定。
 *   [2/3] 視聴距離（30/40/50）— **既定は非選択**。選択で「次へ」活性化。
 *          選択後、その距離での cpd=3 パッチ例を下部にプレビュー表示。
 *   [3/3] チュートリアル — 3x3 格子の 1 つが 12 deg/sec で回転。タップで完了 →
 *          onComplete（呼び出し側で距離リマインドのカウントダウンへ）。
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
import { webAria } from '../../theme/ariaWeb';
import { webSpaceActivation } from '../../theme/keyActivation';
import { SegmentedControl } from '../../components/v2/SegmentedControl';
import { GaborPatch } from '../../components/GaborPatch';
import { useGameTimer } from '../../hooks/v2/useGameTimer';
import type { AgeGroup } from '../../state/v3/schema';
import type { ViewingDistanceCm } from '../../lib/calibration';

const TOTAL_STEPS = 3;

/** プレビュー／チュートリアルのパッチ描画パラメータ。 */
const PREVIEW_CPD = 3; // ユーザー要望：距離プレビューは cpd=3。
const PATCH_CONTRAST = 0.5;
const PATCH_SIGMA_DEG = 0.6;
const PREVIEW_SIZE_PX = 140;
const TUTORIAL_SIZE_PX = 88;
const TUTORIAL_GRID = 3; // 3x3。
const TUTORIAL_CELLS = TUTORIAL_GRID * TUTORIAL_GRID;
/** チュートリアルの回転速度（ユーザー要望：12 deg/sec）。 */
const TUTORIAL_ROTATION_DEG_PER_SEC = 12;
/** 回転駆動用タイマーの十分長い上限（チュートリアルは時間切れ概念なし）。 */
const TUTORIAL_TIMER_SEC = 1e6;

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
  /** チュートリアルで回転させるセル index（テスト決定論）。既定はランダム。 */
  tutorialTargetIndex?: number;
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
  tutorialTargetIndex,
  testId,
}) => {
  const { colors } = useTheme();

  const [step, setStep] = React.useState(1);
  // 視聴距離は**既定非選択**（null）。選択して初めて「次へ」が活性化する。
  const [distance, setDistance] = React.useState<ViewingDistanceCm | null>(null);
  const agreedAtRef = React.useRef<string | null>(null);

  // チュートリアルで回転させるセル（マウント時に 1 度だけ確定）。
  const [targetIndex] = React.useState(() =>
    tutorialTargetIndex != null
      ? tutorialTargetIndex
      : Math.floor(Math.random() * TUTORIAL_CELLS),
  );

  // 回転駆動：step 3 のときだけ rAF で経過秒を進める。orientationDeg は transform で適用。
  const { elapsedSec } = useGameTimer({
    durationSec: TUTORIAL_TIMER_SEC,
    active: step === 3,
    roundKey: 'onboarding-tutorial',
    onTimeout: () => {},
  });
  const orientationDeg =
    (elapsedSec * TUTORIAL_ROTATION_DEG_PER_SEC) % 360;

  // [1/3] 使用上の注意：「次へ」で同意日時を確定しステップ 2 へ。
  const handleAgree = React.useCallback(() => {
    agreedAtRef.current = now().toISOString();
    setStep(2);
  }, [now]);

  // [3/3] 回転パッチのタップ＝チュートリアル終了 → 完了通知。
  const handleTutorialTap = React.useCallback(() => {
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
            {/* 距離オプションと「次へ」の間に常に 1 パッチ分の高さを確保し、選択しても
                「次へ」の位置がずれないようにする（未選択時は空のプレースホルダ）。 */}
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
              label={t('common.next')}
              onPress={() => setStep(3)}
              disabled={distance === null}
              testId={testId ? `${testId}-next-2` : undefined}
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepBody} testID={testId ? `${testId}-step-3` : undefined}>
            <Text style={[styles.h1, { color: colors.fgPrimary }]}>
              {t('onboardingV3.tutorial_title')}
            </Text>
            <Text
              style={[styles.body, { color: colors.fgPrimary }]}
              testID={testId ? `${testId}-tutorial-body` : undefined}
            >
              {t('onboardingV3.tutorial_body')}
            </Text>
            <View style={styles.tutorialGrid}>
              {Array.from({ length: TUTORIAL_GRID }, (_, r) => (
                <View key={`row-${r}`} style={styles.tutorialRow}>
                  {Array.from({ length: TUTORIAL_GRID }, (_, c) => {
                    const index = r * TUTORIAL_GRID + c;
                    const isTarget = index === targetIndex;
                    return (
                      <TutorialCell
                        key={`cell-${index}`}
                        isTarget={isTarget}
                        orientationDeg={isTarget ? orientationDeg : 0}
                        distance={distance ?? 40}
                        onPress={handleTutorialTap}
                        testId={
                          testId
                            ? `${testId}-tutorial-cell-${index}`
                            : undefined
                        }
                      />
                    );
                  })}
                </View>
              ))}
            </View>
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

/**
 * チュートリアル 1 セル。回転対象（isTarget）のみタップ可能（onPress）で a11y ラベルを持つ。
 * 非対象は装飾（SR から隠す）。
 */
const TutorialCell: React.FC<{
  isTarget: boolean;
  orientationDeg: number;
  distance: ViewingDistanceCm;
  onPress: () => void;
  testId?: string;
}> = ({ isTarget, orientationDeg, distance, onPress, testId }) => {
  const focus = useFocusStyle();
  const label = t('onboardingV3.tutorial_patch_label');

  const patch = (
    <GaborPatch
      cpd={PREVIEW_CPD}
      contrast={PATCH_CONTRAST}
      orientationDeg={orientationDeg}
      phaseRad={0}
      sigmaDeg={PATCH_SIGMA_DEG}
      sizePx={TUTORIAL_SIZE_PX}
      viewingDistanceCm={distance}
    />
  );

  if (!isTarget) {
    // 静止セルは装飾。SR から隠してチュートリアルのフォーカスを回転対象に集約する。
    return (
      <View
        style={styles.tutorialCell}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ 'aria-hidden': true } as any)}
        pointerEvents="none"
      >
        {patch}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...webAria('button', undefined, label)}
      {...webSpaceActivation(onPress)}
      style={({ pressed }) => [
        styles.tutorialCell,
        focus,
        pressed && styles.pressed,
      ]}
      testID={testId}
    >
      {patch}
    </Pressable>
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
  tutorialGrid: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s3,
    paddingTop: spacing.s3,
  },
  tutorialRow: {
    flexDirection: 'row',
    gap: spacing.s3,
  },
  tutorialCell: {
    width: TUTORIAL_SIZE_PX,
    height: TUTORIAL_SIZE_PX,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
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
