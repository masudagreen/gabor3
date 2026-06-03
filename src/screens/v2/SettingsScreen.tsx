/**
 * SettingsScreen.tsx — F-13 設定タブ（screens.md S2-1）。
 *
 * n/m/r/a/b・採点方式①②③・視聴距離・ダークモード・音/振動・片眼・免責再閲覧・
 * 全データ削除（2 段階確認）を 1 画面に集約。各コントロール変更で即時保存（F-13）。
 *
 * S2 ではボトムタブ統合（S5）前のため、App から単体で表示・操作できる構成にする。
 * 視聴距離は UserProfile、それ以外は Settings に保存する。
 * ダークモード変更を即反映するため、保存後に onSettingsChange で親へ通知する。
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { webAria } from '../../theme/ariaWeb';
import { fontSize, fontWeight, spacing } from '../../theme/tokens';
import { t } from '../../i18n';
import {
  SettingRow,
  SettingGroupHeading,
} from '../../components/v2/SettingRow';
import { Toggle } from '../../components/v2/Toggle';
import { NumberSpinner } from '../../components/v2/NumberSpinner';
import { SegmentedControl } from '../../components/v2/SegmentedControl';
import { ConfirmDialog } from '../../components/v2/ConfirmDialog';
import {
  Settings,
  UserProfile,
  ScoringMode,
  DarkMode,
  OneEyeGuidance,
  PARAM_SPECS,
  GRID_SIZE_OPTIONS,
  VIEWING_DISTANCE_OPTIONS,
  APP_VERSION,
} from '../../state/schema';
import {
  loadSettings,
  loadUserProfile,
  saveUserProfile,
} from '../../state/repository';
import {
  updateSettings,
  setGridSize,
  setRoundSeconds,
  setRoundCount,
  setRotationSpeed,
  setSfChangeSpeed,
  setScoringMode,
  setDarkMode,
  setSoundEnabled,
  setHapticsEnabled,
  setOneEyeGuidance,
  normalizeViewingDistance,
} from '../../state/settings';
import { deleteAllData } from '../../state/dataReset';
import type { ViewingDistanceCm } from '../../lib/calibration';

export type SettingsScreenProps = {
  /** 設定変更時に親へ通知（ダークモード即反映等）。任意。 */
  onSettingsChange?: (settings: Settings) => void;
  /** 「免責事項を読む」押下。任意（S6 で配線）。 */
  onReadDisclaimer?: () => void;
  /** テスト/計測用の testID。任意。 */
  testId?: string;
};

const SCORING_OPTIONS: ReadonlyArray<{
  value: ScoringMode;
  label: string;
  desc: string;
}> = [
  {
    value: 'auto-no-confirm',
    label: t('settings.scoring_auto_no_confirm'),
    desc: t('settings.scoring_auto_no_confirm_desc'),
  },
  {
    value: 'auto-confirm',
    label: t('settings.scoring_auto_confirm'),
    desc: t('settings.scoring_auto_confirm_desc'),
  },
  {
    value: 'all-correct-advance',
    label: t('settings.scoring_all_correct'),
    desc: t('settings.scoring_all_correct_desc'),
  },
];

const DARK_OPTIONS: ReadonlyArray<{ value: DarkMode; label: string }> = [
  { value: 'system', label: t('settings.dark_system') },
  { value: 'light', label: t('settings.dark_light') },
  { value: 'dark', label: t('settings.dark_dark') },
];

const ONE_EYE_OPTIONS: ReadonlyArray<{ value: OneEyeGuidance; label: string }> =
  [
    { value: 'off', label: t('settings.one_eye_off') },
    { value: 'left', label: t('settings.one_eye_left') },
    { value: 'right', label: t('settings.one_eye_right') },
    { value: 'alternate', label: t('settings.one_eye_alternate') },
  ];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onSettingsChange,
  onReadDisclaimer,
  testId,
}) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 720);

  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const [s, p] = await Promise.all([loadSettings(), loadUserProfile()]);
      if (!mounted) return;
      setSettings(s);
      setProfile(p);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const apply = React.useCallback(
    async (updater: (s: Settings) => Settings) => {
      const next = await updateSettings(updater);
      setSettings(next);
      onSettingsChange?.(next);
    },
    [onSettingsChange],
  );

  const applyViewingDistance = React.useCallback(
    async (cm: ViewingDistanceCm) => {
      const current = profile ?? (await loadUserProfile());
      const next: UserProfile = {
        ...current,
        viewingDistanceCm: normalizeViewingDistance(cm),
      };
      await saveUserProfile(next);
      setProfile(next);
    },
    [profile],
  );

  const handleDelete = React.useCallback(async () => {
    setDeleteOpen(false);
    await deleteAllData();
    const [s, p] = await Promise.all([loadSettings(), loadUserProfile()]);
    setSettings(s);
    setProfile(p);
    onSettingsChange?.(s);
  }, [onSettingsChange]);

  if (!settings || !profile) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.bgCanvas }]}>
        <View style={styles.loadingWrap}>
          <Text style={[styles.title, { color: colors.fgPrimary }]}>
            {t('settings.title')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const agreedLabel = profile.disclaimerAgreedAt
    ? formatDateTime(profile.disclaimerAgreedAt)
    : t('settings.disclaimer_not_agreed');

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.fill, { backgroundColor: colors.bgCanvas }]}
      testID={testId}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        accessibilityLabel={t('settings.title')}
      >
        <View style={[styles.content, { width: contentWidth }]}>
          <View style={styles.headerBlock}>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.fgPrimary }]}
            >
              {t('settings.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.fgSecondary }]}>
              トレーニング環境や表示、フィードバックの動作設定を行います。
            </Text>
          </View>

          {/* ── ゲーム設定 ── */}
          <SettingGroupHeading title={t('settings.group_game')} icon="game-controller-outline" />
          <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
            <SettingRow label={t('settings.grid_size')}>
              <SegmentedControl
                options={GRID_SIZE_OPTIONS.map((n) => ({ value: n, label: `${n}` }))}
                value={settings.gridSize}
                onChange={(n) => apply((s) => setGridSize(s, n))}
                accessibilityLabel={t('settings.grid_size')}
              />
            </SettingRow>
            <SettingRow stacked>
              <NumberSpinner
                label={t('settings.round_seconds')}
                value={settings.roundSeconds}
                {...PARAM_SPECS.roundSeconds}
                decimals={0}
                unit={t('settings.unit_seconds')}
                valueText={(v) => `${t('settings.round_seconds')} ${v} 秒`}
                onChange={(v) => apply((s) => setRoundSeconds(s, v))}
              />
            </SettingRow>
            <SettingRow stacked>
              <NumberSpinner
                label={t('settings.round_count')}
                value={settings.roundCount}
                {...PARAM_SPECS.roundCount}
                decimals={0}
                valueText={(v) => `${t('settings.round_count')} ${v}`}
                onChange={(v) => apply((s) => setRoundCount(s, v))}
              />
            </SettingRow>
            <SettingRow stacked noBorder>
              <NumberSpinner
                label={t('settings.rotation_speed')}
                value={settings.rotationSpeed}
                {...PARAM_SPECS.rotationSpeed}
                decimals={1}
                unit={t('settings.unit_deg_per_sec')}
                valueText={(v) => `${t('settings.rotation_speed')} ${v.toFixed(1)} 度毎秒`}
                onChange={(v) => apply((s) => setRotationSpeed(s, v))}
                showDifficultyHint
              />
            </SettingRow>
          </View>

          {/* ── 採点方式 ── */}
          <SettingGroupHeading title={t('settings.group_scoring')} icon="list-outline" />
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('settings.group_scoring')}
            {...webAria('radiogroup', undefined, t('settings.group_scoring'))}
            style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}
          >
            {SCORING_OPTIONS.map((opt, index) => {
              const selected = settings.scoringMode === opt.value;
              return (
                <SettingRow
                  key={opt.value}
                  stacked
                  onPress={() => apply((s) => setScoringMode(s, opt.value))}
                  accessibilityLabel={`${opt.label}。${opt.desc}`}
                  radio
                  checked={selected}
                  noBorder={index === SCORING_OPTIONS.length - 1}
                >
                  <View style={styles.radioRow}>
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={selected ? colors.actionPrimary : colors.fgSecondary}
                      style={styles.radioIcon}
                    />
                    <View style={styles.radioTexts}>
                      <Text
                        style={[
                          styles.radioLabel,
                          {
                            color: colors.fgPrimary,
                            fontWeight: selected
                              ? fontWeight.bold
                              : fontWeight.medium,
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={[styles.radioDesc, { color: colors.fgSecondary }]}
                      >
                        {opt.desc}
                      </Text>
                    </View>
                  </View>
                </SettingRow>
              );
            })}
          </View>

          {/* ── 表示・視聴 ── */}
          <SettingGroupHeading title={t('settings.group_display')} icon="eye-outline" />
          <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
            <SettingRow label={t('settings.viewing_distance')}>
              <SegmentedControl
                options={VIEWING_DISTANCE_OPTIONS.map((cm) => ({
                  value: cm,
                  label: `${cm}`,
                }))}
                value={profile.viewingDistanceCm}
                onChange={(cm) => applyViewingDistance(cm as ViewingDistanceCm)}
                accessibilityLabel={t('settings.viewing_distance')}
              />
            </SettingRow>
            <SettingRow label={t('settings.dark_mode')} noBorder>
              <SegmentedControl
                options={DARK_OPTIONS}
                value={settings.darkMode}
                onChange={(m) => apply((s) => setDarkMode(s, m))}
                accessibilityLabel={t('settings.dark_mode')}
              />
            </SettingRow>
          </View>

          {/* ── フィードバック ── */}
          <SettingGroupHeading title={t('settings.group_feedback')} icon="notifications-outline" />
          <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
            <SettingRow label={t('settings.sound')}>
              <Toggle
                value={settings.soundEnabled}
                onChange={(v) => apply((s) => setSoundEnabled(s, v))}
                accessibilityLabel={t('settings.sound')}
              />
            </SettingRow>
            <SettingRow label={t('settings.haptics')}>
              <Toggle
                value={settings.hapticsEnabled}
                onChange={(v) => apply((s) => setHapticsEnabled(s, v))}
                accessibilityLabel={t('settings.haptics')}
              />
            </SettingRow>
            <SettingRow stacked label={t('settings.one_eye')} noBorder>
              <SegmentedControl
                options={ONE_EYE_OPTIONS}
                value={settings.oneEyeGuidance}
                onChange={(g) => apply((s) => setOneEyeGuidance(s, g))}
                accessibilityLabel={t('settings.one_eye')}
              />
            </SettingRow>
          </View>

          {/* ── その他 ── */}
          <SettingGroupHeading title={t('settings.group_other')} icon="ellipsis-horizontal-circle-outline" />
          <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
            {onReadDisclaimer != null ? (
              <>
                <SettingRow
                  label={t('settings.read_disclaimer')}
                  onPress={onReadDisclaimer}
                />
                <SettingRow
                  label={t('settings.delete_all')}
                  danger
                  onPress={() => setDeleteOpen(true)}
                  noBorder
                />
              </>
            ) : (
              <SettingRow
                label={t('settings.delete_all')}
                danger
                onPress={() => setDeleteOpen(true)}
                noBorder
              />
            )}
          </View>

          <View style={styles.versionBlock}>
            <Text style={[styles.caption, { color: colors.fgMuted }]}>
              {t('settings.version')}  v{APP_VERSION}
            </Text>
            <Text style={[styles.caption, { color: colors.fgMuted }]}>
              {t('settings.disclaimer_agreed_at')} {agreedLabel}
            </Text>
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={deleteOpen}
        title={t('settings.delete_confirm_title')}
        message={t('settings.delete_confirm_message')}
        confirmLabel={t('settings.delete_confirm_ok')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </SafeAreaView>
  );
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  loadingWrap: { padding: spacing.s5 },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: spacing.s5,
    paddingBottom: spacing.s9,
  },
  content: {
    width: '100%',
    maxWidth: 720,
  },
  headerBlock: {
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    marginTop: spacing.s4,
  },
  subtitle: {
    fontSize: fontSize.caption,
    marginTop: spacing.s1,
    marginBottom: spacing.s3,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
    // subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  radioIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  radioTexts: { flex: 1 },
  radioLabel: {
    fontSize: fontSize.body,
  },
  radioDesc: {
    fontSize: fontSize.caption,
    marginTop: 2,
  },
  versionBlock: {
    marginTop: spacing.s6,
    paddingHorizontal: 4,
  },
  caption: {
    fontSize: fontSize.caption,
    marginTop: 4,
  },
});
