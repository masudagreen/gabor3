/**
 * SettingsScreen — Sprint 7-A / screens.md S7-01 / spec.md F-15。
 *
 * セクション構成（spec.md §10.1 / screens.md S7-01）：
 *   1. 画面表示：ダークモード（system / light / dark）
 *   2. 音と振動：効果音・振動・Game 3 BGM
 *   3. 視聴環境：視聴距離・片眼ガイダンス
 *   4. データと法的事項：免責再表示・全データ削除
 *   5. アプリ情報：バージョン
 *
 * 注意（Sprint 7-A スコープ）：
 *   - 音声／ハプティクスの実発火、AppState、キーボード対応は Sprint 7-B
 *   - a11y 仕上げ・focus outline 強化・skip link は Sprint 7-C
 *   - staircase リセット導線は本タスクで触らず（spec.md F-15 はあるが Sprint 7-B/C で扱う想定）
 *     → Sprint 7-A では「データと法的事項」セクションには「全データ削除」「免責再表示」のみ
 *
 * 各設定変更は updateSettings() で即時保存。
 */

import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { IconButton } from '../components/IconButton';
import { ListItem } from '../components/ListItem';
import { OptionPickerModal, OptionItem } from '../components/OptionPickerModal';
import { DataDeletionConfirmModal } from '../components/DataDeletionConfirmModal';
import { DisclaimerSheet } from '../components/DisclaimerSheet';
import { DistanceCalibrator } from '../components/DistanceCalibrator';
import { Button } from '../components/Button';
import { Snackbar } from '../components/Snackbar';
import {
  DarkModePreference,
  OneEyeGuidance,
  Settings,
  UserProfile,
} from '../state/storage';
import { ViewingDistanceCm } from '../lib/calibration';

export const APP_VERSION = '1.0.0';

const DARK_MODE_OPTIONS: ReadonlyArray<OptionItem<DarkModePreference>> = [
  { value: 'system', label: 'OS 連動', description: '端末の設定に合わせる', icon: '📱' },
  { value: 'light', label: '明るい(ライト)', icon: '☀' },
  { value: 'dark', label: '暗い(ダーク)', icon: '🌙' },
];

const ONE_EYE_OPTIONS: ReadonlyArray<OptionItem<OneEyeGuidance>> = [
  { value: 'off', label: 'OFF', description: '両目で行う' },
  { value: 'left', label: '左目で行う' },
  { value: 'right', label: '右目で行う' },
  { value: 'alternate', label: '交互(セッションごと)' },
];

export type SettingsScreenProps = {
  settings: Settings;
  profile: UserProfile;
  onUpdateSettings: (patch: Partial<Settings>) => Promise<void> | void;
  onUpdateProfile: (patch: Partial<UserProfile>) => Promise<void> | void;
  onClearAllData: () => Promise<void> | void;
  onBack: () => void;
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  profile,
  onUpdateSettings,
  onUpdateProfile,
  onClearAllData,
  onBack,
}) => {
  const { colors } = useTheme();

  const [darkModePicker, setDarkModePicker] = React.useState(false);
  const [oneEyePicker, setOneEyePicker] = React.useState(false);
  const [distancePicker, setDistancePicker] = React.useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = React.useState(false);
  const [versionOpen, setVersionOpen] = React.useState(false);
  const [deletionOpen, setDeletionOpen] = React.useState(false);
  const [snackbarMsg, setSnackbarMsg] = React.useState<string | null>(null);

  const showSnackbar = React.useCallback((msg: string) => {
    setSnackbarMsg(msg);
  }, []);

  // 設定変更 + Snackbar 通知
  const handleToggle = React.useCallback(
    async (patch: Partial<Settings>, label: string) => {
      await onUpdateSettings(patch);
      showSnackbar(`${label}を保存しました`);
    },
    [onUpdateSettings, showSnackbar],
  );

  const handlePickDarkMode = React.useCallback(
    async (v: DarkModePreference) => {
      setDarkModePicker(false);
      await onUpdateSettings({ darkMode: v });
      showSnackbar('ダークモードを保存しました');
    },
    [onUpdateSettings, showSnackbar],
  );

  const handlePickOneEye = React.useCallback(
    async (v: OneEyeGuidance) => {
      setOneEyePicker(false);
      await onUpdateSettings({ oneEyeGuidance: v });
      showSnackbar('片眼ガイダンスを保存しました');
    },
    [onUpdateSettings, showSnackbar],
  );

  const handleConfirmDeletion = React.useCallback(async () => {
    setDeletionOpen(false);
    await onClearAllData();
    // 削除完了時はオンボーディングへ遷移するため snackbar は出さなくても OK
  }, [onClearAllData]);

  const darkModeLabel = labelOf(DARK_MODE_OPTIONS, settings.darkMode);
  const oneEyeLabel = labelOf(ONE_EYE_OPTIONS, settings.oneEyeGuidance);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]} testID="settings-screen">
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="設定を閉じてホームに戻る"
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
        {/* セクション 1：画面表示 */}
        <SectionHeader title="画面表示" colors={colors} />
        <ListItem
          title="ダークモード"
          iconLeading="🌙"
          trailing="value"
          trailingValue={darkModeLabel}
          onPress={() => setDarkModePicker(true)}
          testId="settings-darkmode"
        />

        {/* セクション 2：音と振動 */}
        <SectionHeader title="音と振動" colors={colors} />
        <ListItem
          title="効果音"
          subtitle="ボタン操作などの音"
          iconLeading="🔊"
          trailing="toggle"
          toggleValue={settings.soundEnabled}
          onToggleChange={(v) => handleToggle({ soundEnabled: v }, '効果音')}
          testId="settings-sound"
        />
        <ListItem
          title="振動(ハプティクス)"
          subtitle={
            Platform.OS === 'web'
              ? 'Web ブラウザでは無効'
              : '操作時に短い振動'
          }
          iconLeading="📳"
          trailing="toggle"
          toggleValue={settings.hapticsEnabled}
          onToggleChange={(v) => handleToggle({ hapticsEnabled: v }, '振動')}
          disabled={Platform.OS === 'web'}
          testId="settings-haptics"
        />
        <ListItem
          title="Game 3 リズム BGM"
          subtitle="周辺視野ハント中の BGM"
          iconLeading="🎵"
          trailing="toggle"
          toggleValue={settings.game3BgmEnabled}
          onToggleChange={(v) => handleToggle({ game3BgmEnabled: v }, 'BGM')}
          testId="settings-bgm"
        />

        {/* セクション 3：視聴環境 */}
        <SectionHeader title="視聴環境" colors={colors} />
        <ListItem
          title="視聴距離"
          iconLeading="📏"
          trailing="value"
          trailingValue={`${profile.viewingDistanceCm} cm`}
          onPress={() => setDistancePicker(true)}
          testId="settings-distance"
        />
        <ListItem
          title="片眼ガイダンス"
          iconLeading="👁"
          trailing="value"
          trailingValue={oneEyeLabel}
          onPress={() => setOneEyePicker(true)}
          testId="settings-oneeye"
        />

        {/* セクション 4：データと法的事項 */}
        <SectionHeader title="データと法的事項" colors={colors} />
        <ListItem
          title="免責事項を読む"
          iconLeading="📄"
          trailing="chevron"
          onPress={() => setDisclaimerOpen(true)}
          testId="settings-disclaimer"
        />
        <ListItem
          title="全データを削除"
          subtitle="記録・設定をすべて消去"
          iconLeading="🗑"
          trailing="chevron"
          destructive
          onPress={() => setDeletionOpen(true)}
          testId="settings-delete-all"
        />

        {/* セクション 5：アプリ情報 */}
        <SectionHeader title="アプリ情報" colors={colors} />
        <ListItem
          title="バージョン情報"
          iconLeading="ℹ"
          trailing="value"
          trailingValue={`V${APP_VERSION}`}
          onPress={() => setVersionOpen(true)}
          testId="settings-version"
        />
      </ScrollView>

      {/* ダークモード picker */}
      <OptionPickerModal
        isOpen={darkModePicker}
        title="ダークモード"
        options={DARK_MODE_OPTIONS}
        selected={settings.darkMode}
        onSelect={handlePickDarkMode}
        onClose={() => setDarkModePicker(false)}
        testId="darkmode-picker"
      />

      {/* 片眼ガイダンス picker */}
      <OptionPickerModal
        isOpen={oneEyePicker}
        title="片眼ガイダンス"
        options={ONE_EYE_OPTIONS}
        selected={settings.oneEyeGuidance}
        onSelect={handlePickOneEye}
        onClose={() => setOneEyePicker(false)}
        testId="oneeye-picker"
      />

      {/* 視聴距離 modal（軽量、フルスクリーン inline で表示） */}
      {distancePicker ? (
        <View
          style={[styles.distanceOverlay, { backgroundColor: colors.bgCanvas }]}
          testID="distance-overlay"
        >
          <View style={styles.header}>
            <IconButton
              icon="back"
              ariaLabel="視聴距離設定を閉じる"
              onPress={() => setDistancePicker(false)}
              testId="distance-overlay-back"
            />
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.fgPrimary }]}
            >
              視聴距離
            </Text>
          </View>
          <View style={styles.distanceBody}>
            <DistanceCalibrator
              value={profile.viewingDistanceCm}
              onChange={async (v: ViewingDistanceCm) => {
                await onUpdateProfile({ viewingDistanceCm: v });
              }}
              showPreview
            />
            <Button
              variant="primary"
              size="lg"
              label="保存して閉じる"
              fullWidth
              onPress={() => {
                setDistancePicker(false);
                showSnackbar('視聴距離を保存しました');
              }}
              testId="distance-overlay-save"
            />
          </View>
        </View>
      ) : null}

      {/* 免責事項 review シート（フル画面） */}
      {disclaimerOpen ? (
        <View
          style={[styles.distanceOverlay, { backgroundColor: colors.bgCanvas }]}
          testID="disclaimer-overlay"
        >
          <DisclaimerSheet
            mode="review"
            onClose={() => setDisclaimerOpen(false)}
            onBack={() => setDisclaimerOpen(false)}
          />
          {profile.disclaimerAgreedAt ? (
            <Text
              style={[styles.agreedDate, { color: colors.fgMuted }]}
              testID="disclaimer-agreed-date"
            >
              同意日時：{formatAgreedDate(profile.disclaimerAgreedAt)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* バージョン情報モーダル */}
      <OptionPickerModal
        isOpen={versionOpen}
        title="バージョン情報"
        options={[
          {
            value: 'info',
            label: `GaborEye V${APP_VERSION}`,
            description: profile.disclaimerAgreedAt
              ? `免責事項同意日：${formatAgreedDate(profile.disclaimerAgreedAt)}`
              : '免責事項：未同意',
          },
        ]}
        selected="info"
        onSelect={() => setVersionOpen(false)}
        onClose={() => setVersionOpen(false)}
        testId="version-modal"
      />

      {/* 全データ削除 */}
      <DataDeletionConfirmModal
        isOpen={deletionOpen}
        onCancel={() => setDeletionOpen(false)}
        onConfirm={handleConfirmDeletion}
      />

      {/* Snackbar */}
      <Snackbar
        visible={snackbarMsg != null}
        message={snackbarMsg ?? ''}
        onDismiss={() => setSnackbarMsg(null)}
      />
    </View>
  );
};

const SectionHeader: React.FC<{
  title: string;
  colors: ReturnType<typeof import('../theme/tokens').getColors>;
}> = ({ title, colors }) => (
  <View
    style={[styles.section, { backgroundColor: colors.bgCanvas }]}
    accessibilityRole="header"
  >
    <Text
      style={[
        styles.sectionTitle,
        { color: colors.fgSecondary, fontWeight: fontWeight.bold as '700' },
      ]}
    >
      {title}
    </Text>
  </View>
);

function labelOf<V extends string>(
  options: ReadonlyArray<OptionItem<V>>,
  value: V,
): string {
  return options.find((o) => o.value === value)?.label ?? String(value);
}

function formatAgreedDate(iso: string): string {
  // ISO 8601 → 'YYYY 年 M 月 D 日 HH:MM'。新規 Date が無効でも文字列を返す。
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y} 年 ${m} 月 ${day} 日 ${hh}:${mm}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: fontSize.h2, // 30
    fontWeight: fontWeight.bold as '700',
  },
  content: {
    paddingBottom: spacing.s7,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  section: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s5,
    paddingBottom: spacing.s2,
  },
  sectionTitle: {
    fontSize: fontSize.body, // 24
    letterSpacing: 0.5,
  },
  distanceOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  distanceBody: {
    padding: spacing.s4,
    gap: spacing.s5,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  agreedDate: {
    position: 'absolute',
    bottom: spacing.s9,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: fontSize.body,
    paddingHorizontal: spacing.s4,
  },
});

// 未使用ガード（radius は将来 inline スタイルで使う想定）
void radius;
