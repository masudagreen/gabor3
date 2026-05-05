/**
 * DistanceCalibrator — components.md §11 / screens.md S4-04 / S4-09 / F-03。
 *
 * 視聴距離を 30 / 40 / 50cm の 3 ノッチで選ばせるコンポーネント。
 * 値変更で onChange を呼ぶ（保存責任は呼び出し元）。
 *
 * showPreview=true の場合、cpd=3 / contrast=0.4 のサンプルガボールを描画する。
 * 距離変更で再計算されるため、距離ごとにパッチサイズが変わることが視覚確認できる。
 *
 * a11y：
 *   - 各ノッチボタンは role="radio"（accessibilityRole="radio"）でラジオグループを構成
 *   - グループ全体は accessibilityLabel="視聴距離"
 *   - 選択値変更時に aria-live で通知
 */

import React from 'react';
import {
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
  radius,
  spacing,
  tapTarget,
} from '../theme/tokens';
import {
  ViewingDistanceCm,
  VIEWING_DISTANCE_OPTIONS,
} from '../lib/calibration';
import { GaborPatch } from './GaborPatch';

export type DistanceCalibratorProps = {
  value: ViewingDistanceCm;
  onChange: (v: ViewingDistanceCm) => void;
  showPreview?: boolean;
  /** プレビュー描画に渡す端末 dpi（既定 110=PC） */
  previewDpi?: number;
};

export const DistanceCalibrator: React.FC<DistanceCalibratorProps> = ({
  value,
  onChange,
  showPreview,
  previewDpi = 110,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View style={styles.container} testID="distance-calibrator">
      <View
        style={[
          styles.illustration,
          { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
        ]}
        accessibilityLabel={`人と画面の距離を示すイラスト：${value} センチメートル`}
      >
        <Text style={[styles.illustrationGlyph, { color: colors.fgPrimary }]}>
          👤  ←  {value} cm  →  📱
        </Text>
      </View>

      <View
        style={styles.notchRow}
        accessibilityRole="radiogroup"
        accessibilityLabel="視聴距離を選択：30センチメートル、40センチメートル、50センチメートル"
      >
        {VIEWING_DISTANCE_OPTIONS.map((opt) => {
          const selected = opt === value;
          return (
            <Pressable
              key={opt}
              accessibilityRole="radio"
              accessibilityLabel={`${opt} センチメートル`}
              accessibilityState={{ selected, checked: selected }}
              onPress={() => onChange(opt)}
              testID={`distance-notch-${opt}`}
              style={({ pressed }) => [
                styles.notch,
                {
                  borderColor: selected
                    ? colors.actionPrimary
                    : colors.borderInput,
                  backgroundColor: selected
                    ? colors.actionPrimary
                    : colors.bgSurface,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.notchValue,
                  {
                    color: selected ? colors.fgOnPrimary : colors.fgPrimary,
                  },
                ]}
              >
                {opt}
              </Text>
              <Text
                style={[
                  styles.notchUnit,
                  {
                    color: selected ? colors.fgOnPrimary : colors.fgPrimary,
                  },
                ]}
              >
                cm
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text
        accessibilityLiveRegion="polite"
        style={[styles.currentValue, { color: colors.fgPrimary }]}
        testID="distance-current"
      >
        現在の距離：{value} cm
      </Text>

      {showPreview ? (
        <View style={styles.previewWrap} testID="distance-preview">
          <Text style={[styles.previewLabel, { color: colors.fgPrimary }]}>
            この大きさのパッチで訓練します
          </Text>
          <GaborPatch
            cpd={3}
            contrast={0.4}
            orientationDeg={45}
            phaseRad={0}
            sigmaDeg={0.6}
            sizePx={120}
            viewingDistanceCm={value}
            dpi={previewDpi}
            ariaLabel="サンプルのガボールパッチ"
            testId="distance-preview-patch"
          />
        </View>
      ) : null}

      <Text style={[styles.note, { color: colors.fgMuted }]}>
        老眼の読書距離は 40cm が目安です
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.s4,
  },
  illustration: {
    width: 240,
    height: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationGlyph: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium as '600',
  },
  notchRow: {
    flexDirection: 'row',
    gap: spacing.s3,
    width: '100%',
    maxWidth: 480,
    justifyContent: 'space-between',
  },
  notch: {
    flex: 1,
    minHeight: tapTarget.buttonLg, // 64
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  notchValue: {
    fontSize: fontSize.h2, // 30 px (>= 22pt)
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  notchUnit: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium as '600',
  },
  currentValue: {
    fontSize: fontSize.h3, // 26 px
    fontWeight: fontWeight.bold as '700',
  },
  previewWrap: {
    alignItems: 'center',
    gap: spacing.s3,
  },
  previewLabel: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  note: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
});
