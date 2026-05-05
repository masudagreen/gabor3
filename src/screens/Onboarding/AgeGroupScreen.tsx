/**
 * AgeGroupScreen — オンボーディング 1-3（screens.md S4-03 / spec.md A-9 / §12.1）。
 *
 * 年齢層申告：40s / 50s / 60s / 70s+ / unspecified
 * - カードタップで即座に次画面へ進行（タップ数削減、screens.md §2 タップ試算）
 * - 70s+ 選択時は AgeWarningModal を挟む（OPT-6）
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
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
  tapTarget,
} from '../../theme/tokens';
import { IconButton } from '../../components/IconButton';
import { AgeWarningModal } from '../../components/AgeWarningModal';
import { StepIndicator } from '../../components/StepIndicator';
import { AgeGroup } from '../../state/storage';

export type AgeGroupScreenProps = {
  onSelect: (group: AgeGroup) => void;
  onBack: () => void;
  /**
   * Sprint 7-C：選択済みの年齢層（あれば）を渡すと当該カードに
   * accessibilityState.checked=true / selected=true が反映される。
   *
   * オンボーディング初回フローでは「タップ即遷移」のためほぼ表示直後に画面が変わるが、
   * SR（VoiceOver / TalkBack）が選択を読み上げるためには checked 反映が必要（NF-7 / NF-10）。
   */
  initialSelected?: AgeGroup;
};

const OPTIONS: ReadonlyArray<{ value: AgeGroup; label: string }> = [
  { value: '40s', label: '40 代' },
  { value: '50s', label: '50 代' },
  { value: '60s', label: '60 代' },
  { value: '70s+', label: '70 代以上' },
];

export const AgeGroupScreen: React.FC<AgeGroupScreenProps> = ({
  onSelect,
  onBack,
  initialSelected,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [showWarning, setShowWarning] = React.useState(false);
  // Sprint 7-C：a11y のため tapped value を保持し、accessibilityState に反映
  const [pendingSelected, setPendingSelected] = React.useState<AgeGroup | null>(
    initialSelected ?? null,
  );

  const handleSelect = (group: AgeGroup) => {
    setPendingSelected(group);
    if (group === '70s+') {
      setShowWarning(true);
      return;
    }
    onSelect(group);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="onboarding-age-group"
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="戻る"
          onPress={onBack}
          testId="age-group-back"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        accessibilityRole="radiogroup"
        accessibilityLabel="年齢層を選択"
      >
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          年齢を教えてください
        </Text>
        <Text style={[styles.body, { color: colors.fgPrimary }]}>
          トレーニングの参考にします{'\n'}（任意・あとで変えられます）
        </Text>

        {OPTIONS.map((opt) => {
          const isSelected = pendingSelected === opt.value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: isSelected, checked: isSelected }}
              onPress={() => handleSelect(opt.value)}
              testID={`age-option-${opt.value}`}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: isSelected
                    ? colors.bgSurfaceRaised
                    : colors.bgSurface,
                  borderColor: isSelected
                    ? colors.actionPrimary
                    : colors.borderInput,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.fgPrimary }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="答えない（年齢層を未指定にする）"
          onPress={() => onSelect('unspecified')}
          testID="age-option-unspecified"
          style={({ pressed }) => [
            styles.tertiary,
            {
              borderColor: colors.borderInput,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.tertiaryLabel,
              { color: colors.actionPrimary },
            ]}
          >
            答えない
          </Text>
        </Pressable>

        <StepIndicator current={3} total={7} />
      </ScrollView>

      <AgeWarningModal
        isOpen={showWarning}
        onContinue={() => {
          setShowWarning(false);
          onSelect('70s+');
        }}
        onBack={() => setShowWarning(false)}
      />
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
    padding: spacing.s4,
    paddingBottom: spacing.s7,
    gap: spacing.s4,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold as '700',
    lineHeight: fontSize.h1 * 1.3,
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.6,
    marginBottom: spacing.s3,
  },
  card: {
    minHeight: tapTarget.listItem, // 72
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.s5,
    paddingVertical: spacing.s4,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: fontSize.h3, // 26
    fontWeight: fontWeight.medium as '600',
  },
  tertiary: {
    minHeight: tapTarget.buttonMd, // 56
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.s3,
  },
  tertiaryLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium as '600',
    textDecorationLine: 'underline',
  },
});
