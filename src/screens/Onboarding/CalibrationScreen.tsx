/**
 * CalibrationScreen — オンボーディング 1-4（screens.md S4-04 / spec.md F-03）。
 *
 * DistanceCalibrator を showPreview=true で内包。
 * 「次へ」で値を保存（永続化は親コールバック）→ 次画面へ。
 */

import React from 'react';
import {
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
  spacing,
} from '../../theme/tokens';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { DistanceCalibrator } from '../../components/DistanceCalibrator';
import { StepIndicator } from '../../components/StepIndicator';
import {
  ViewingDistanceCm,
  DEFAULT_VIEWING_DISTANCE_CM,
} from '../../lib/calibration';

export type CalibrationScreenProps = {
  initialValue?: ViewingDistanceCm;
  /** 確定時に呼ばれる（永続化は呼び出し元） */
  onNext: (value: ViewingDistanceCm) => void;
  onBack: () => void;
  /** プレビュー描画用 dpi（端末タイプから計算） */
  previewDpi?: number;
};

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({
  initialValue = DEFAULT_VIEWING_DISTANCE_CM,
  onNext,
  onBack,
  previewDpi,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [value, setValue] = React.useState<ViewingDistanceCm>(initialValue);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="onboarding-calibration"
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="戻る"
          onPress={onBack}
          testId="calibration-back"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          画面からの距離を{'\n'}教えてください
        </Text>
        <Text style={[styles.body, { color: colors.fgPrimary }]}>
          ふだん使う距離を選んでください
        </Text>

        <DistanceCalibrator
          value={value}
          onChange={setValue}
          showPreview
          previewDpi={previewDpi}
        />

        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="次へ"
            onPress={() => onNext(value)}
            fullWidth
            testId="calibration-next"
          />
        </View>

        <StepIndicator current={4} total={7} />
      </ScrollView>
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
    gap: spacing.s5,
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
  },
  cta: {
    width: '100%',
  },
});
