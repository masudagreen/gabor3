/**
 * S8-OB-04 視聴距離設定（オンボーディング版、onboarding.md §6）。
 *
 * v1 の `DistanceCalibrator` をそのまま流用。「次へ」で値を保存。
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
} from '../../../theme/tokens';
import { Button } from '../../../components/Button';
import { StepIndicator } from '../../../components/StepIndicator';
import { DistanceCalibrator } from '../../../components/DistanceCalibrator';
import {
  DEFAULT_VIEWING_DISTANCE_CM,
  DeviceType,
  ViewingDistanceCm,
  dpiForDevice,
} from '../../../lib/calibration';

export type OB04DistanceProps = {
  initialValue?: ViewingDistanceCm;
  /** 推定済み端末タイプ（dpi プレビュー算出用 + 表示文言用） */
  deviceTypeEstimated: DeviceType;
  onNext: (value: ViewingDistanceCm) => void;
};

const DEVICE_LABEL: Record<DeviceType, string> = {
  iphone: 'iPhone',
  android: 'Android',
  tablet: 'タブレット',
  pc: 'PC',
};

export const OB04Distance: React.FC<OB04DistanceProps> = ({
  initialValue = DEFAULT_VIEWING_DISTANCE_CM,
  deviceTypeEstimated,
  onNext,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [value, setValue] = React.useState<ViewingDistanceCm>(initialValue);
  const dpi = dpiForDevice(deviceTypeEstimated);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="ob-distance"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          視聴距離の設定
        </Text>
        <Text style={[styles.body, { color: colors.fgSecondary }]}>
          端末から目までの距離を{'\n'}選んでください
        </Text>

        <View
          style={[
            styles.deviceCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
          accessibilityLabel={`自動推定された端末タイプは ${DEVICE_LABEL[deviceTypeEstimated]}、解像度は ${dpi} ドット毎インチです`}
        >
          <Text style={[styles.deviceText, { color: colors.fgPrimary }]}>
            推定：{DEVICE_LABEL[deviceTypeEstimated]}（dpi {dpi}）
          </Text>
          <Text style={[styles.deviceSub, { color: colors.fgMuted }]}>
            自動推定された端末タイプ
          </Text>
        </View>

        <DistanceCalibrator
          value={value}
          onChange={setValue}
          showPreview
          previewDpi={dpi}
        />

        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="次へ"
            onPress={() => onNext(value)}
            fullWidth
            testId="ob-distance-next"
          />
        </View>
        <StepIndicator current={4} total={5} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.s4,
    paddingTop: spacing.s5,
    gap: spacing.s4,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.s7,
  },
  title: {
    fontSize: fontSize.h2, // 30
    fontWeight: fontWeight.bold as '700',
    lineHeight: fontSize.h2 * 1.35,
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.5,
  },
  deviceCard: {
    padding: spacing.s4,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.s2,
  },
  deviceText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
  },
  deviceSub: {
    fontSize: fontSize.body,
  },
  cta: {
    width: '100%',
    marginTop: spacing.s4,
  },
});
