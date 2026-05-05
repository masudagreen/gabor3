/**
 * SettingsScreen — S19-03（spec-v11.md §F-14 / design-v11/sprints/sprint-19/screens.md §4）。
 *
 * 設定画面。受け入れ基準（F-14）：
 *   - 全項目がリスト型で並び、各行は 56pt 以上の高さ（SettingsRow 経由）
 *   - トグル系（音 / 振動 / ダークモード / 片眼ガイダンス）は ON/OFF が一目で判別
 *   - 全データ削除は 2 段階確認（本画面ではエントリのみ、確認は DataDeleteScreen）
 *   - staircase をリセットは確認ダイアログ（StaircaseResetConfirmDialog）
 *   - バージョン情報には v1.1.x と免責同意日時が表示
 *
 * v1.1 全項目（ASCII 図 §4 より）：
 *   - 表示：ダークモード（system / light / dark）、視聴距離（30 / 40 / 50）
 *   - 音・触覚：効果音 ON/OFF、振動 ON/OFF
 *   - ガイダンス：片眼ガイダンス（off / left / right / alternate）
 *   - 進捗・データ：バッジ一覧 / staircase リセット / 全データ削除
 *   - 情報：免責事項を読む / バージョン v1.1.x（同意日 yyyy-MM-dd）
 *
 * Sprint 19 範囲では、視聴距離 / ダークモード / 片眼ガイダンスはトグルではなく
 * 値表示 + 詳細遷移とするが、簡略化のためトグル化（ダーク→light/dark 二値、
 * 片眼ガイダンス→off/alternate 二値）して動作の最低ラインを担保する。
 * 詳細選択は OptionPickerModal が将来導入されたら拡張する（YAGNI）。
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
import { IconButton } from '../../../components/IconButton';
import { SettingsRow } from '../../../components/v11/SettingsRow';
import {
  DarkModePreferenceV11,
  OneEyeGuidanceV11,
  SettingsV11,
} from '../../../state/storage-v11';
import { ViewingDistanceCm } from '../../../lib/calibration';

export type SettingsScreenProps = {
  settings: SettingsV11;
  /** 視聴距離（v1.1 では UserProfile に保存） */
  viewingDistanceCm: ViewingDistanceCm;
  /** 免責同意日（YYYY-MM-DD or null） */
  disclaimerAgreedAt: string | null;
  /** アプリバージョン（"1.1.0" 等） */
  appVersion: string;
  onBack: () => void;
  onChangeSettings: (next: SettingsV11) => void;
  onChangeViewingDistance: (next: ViewingDistanceCm) => void;
  onPressBadgeList: () => void;
  onPressStaircaseReset: () => void;
  onPressDataDelete: () => void;
  onPressDisclaimer: () => void;
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  viewingDistanceCm,
  disclaimerAgreedAt,
  appVersion,
  onBack,
  onChangeSettings,
  onChangeViewingDistance,
  onPressBadgeList,
  onPressStaircaseReset,
  onPressDataDelete,
  onPressDisclaimer,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  const cycleDarkMode = (): DarkModePreferenceV11 => {
    const order: DarkModePreferenceV11[] = ['system', 'light', 'dark'];
    const idx = order.indexOf(settings.darkMode);
    return order[(idx + 1) % order.length];
  };

  const cycleViewingDistance = (): ViewingDistanceCm => {
    const order: ViewingDistanceCm[] = [30, 40, 50];
    const idx = order.indexOf(viewingDistanceCm);
    return order[(idx + 1) % order.length];
  };

  const cycleOneEye = (): OneEyeGuidanceV11 => {
    const order: OneEyeGuidanceV11[] = ['off', 'left', 'right', 'alternate'];
    const idx = order.indexOf(settings.oneEyeGuidance);
    return order[(idx + 1) % order.length];
  };

  const oneEyeLabel = (v: OneEyeGuidanceV11): string => {
    switch (v) {
      case 'off':
        return 'OFF';
      case 'left':
        return '左眼';
      case 'right':
        return '右眼';
      case 'alternate':
        return '交互';
    }
  };

  const darkModeLabel = (v: DarkModePreferenceV11): string => {
    switch (v) {
      case 'system':
        return 'システム';
      case 'light':
        return 'ライト';
      case 'dark':
        return 'ダーク';
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="settings-screen-v11"
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="ホームに戻る"
          onPress={onBack}
          testId="settings-back"
        />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          設定
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Section title="表示" colors={colors}>
          <SettingsRow
            kind="link"
            label="ダークモード"
            value={darkModeLabel(settings.darkMode)}
            onPress={() =>
              onChangeSettings({ ...settings, darkMode: cycleDarkMode() })
            }
            ariaLabel={`ダークモード、現在 ${darkModeLabel(settings.darkMode)}。タップで切替`}
            testId="settings-dark-mode"
          />
          <SettingsRow
            kind="link"
            label="視聴距離"
            value={`${viewingDistanceCm} cm`}
            onPress={() => onChangeViewingDistance(cycleViewingDistance())}
            ariaLabel={`視聴距離、現在 ${viewingDistanceCm} センチメートル。タップで切替`}
            testId="settings-viewing-distance"
          />
        </Section>

        <Section title="音・触覚" colors={colors}>
          <SettingsRow
            kind="toggle"
            label="効果音"
            checked={settings.soundEnabled}
            onToggle={(next) =>
              onChangeSettings({ ...settings, soundEnabled: next })
            }
            testId="settings-sound"
          />
          <SettingsRow
            kind="toggle"
            label="振動"
            checked={settings.hapticsEnabled}
            onToggle={(next) =>
              onChangeSettings({ ...settings, hapticsEnabled: next })
            }
            testId="settings-haptics"
          />
        </Section>

        <Section title="ガイダンス" colors={colors}>
          <SettingsRow
            kind="link"
            label="片眼ガイダンス"
            value={oneEyeLabel(settings.oneEyeGuidance)}
            onPress={() =>
              onChangeSettings({ ...settings, oneEyeGuidance: cycleOneEye() })
            }
            ariaLabel={`片眼ガイダンス、現在 ${oneEyeLabel(settings.oneEyeGuidance)}。タップで切替`}
            testId="settings-one-eye"
          />
        </Section>

        <Section title="進捗・データ" colors={colors}>
          <SettingsRow
            kind="link"
            label="バッジ一覧"
            icon="🏅"
            onPress={onPressBadgeList}
            testId="settings-badge-list"
          />
          <SettingsRow
            kind="link"
            label="staircase をリセット"
            onPress={onPressStaircaseReset}
            testId="settings-staircase-reset"
          />
          <SettingsRow
            kind="link"
            label="全データを削除"
            destructive
            onPress={onPressDataDelete}
            ariaLabel="全データを削除（取り消し不可）"
            testId="settings-data-delete"
          />
        </Section>

        <Section title="情報" colors={colors}>
          <SettingsRow
            kind="link"
            label="免責事項を読む"
            onPress={onPressDisclaimer}
            testId="settings-disclaimer"
          />
          <SettingsRow
            kind="static"
            label="バージョン"
            value={`v${appVersion}`}
            subtitle={
              disclaimerAgreedAt
                ? `同意日 ${formatDate(disclaimerAgreedAt)}`
                : '同意日 ―'
            }
            testId="settings-version"
          />
        </Section>
      </ScrollView>
    </View>
  );
};

const Section: React.FC<{
  title: string;
  colors: ReturnType<typeof getColors>;
  children: React.ReactNode;
}> = ({ title, colors, children }) => (
  <View style={styles.section}>
    <Text
      accessibilityRole="header"
      aria-level={2}
      style={[styles.sectionTitle, { color: colors.fgSecondary }]}
    >
      {title}
    </Text>
    <View style={styles.sectionItems}>{children}</View>
  </View>
);

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 64,
    paddingHorizontal: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  title: {
    fontSize: fontSize.h2, // 30
    fontWeight: fontWeight.bold as '700',
  },
  content: {
    padding: spacing.s4,
    gap: spacing.s4,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.s7,
  },
  section: {
    gap: spacing.s2,
  },
  sectionTitle: {
    fontSize: fontSize.body, // 24
    fontWeight: fontWeight.bold as '700',
    textTransform: 'none',
  },
  sectionItems: {
    gap: spacing.s2,
  },
});
