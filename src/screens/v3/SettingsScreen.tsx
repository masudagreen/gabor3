/**
 * SettingsScreen.tsx — v3.0 設定タブ（F-13 / screens.md S3-1）。
 *
 * レベルの定義域（5 変数の振れ幅・変化順）をテスト用に調整しつつ、継承項目
 * （視聴距離 / ダークモード / 音 / 振動 / 片眼ガイダンス / 免責再閲覧 / 全データ削除）を
 * 集約する。各コントロール変更で即保存（F-13）。
 *
 * 範囲（RG-1）/ 変化順（OR-1）の変更は updateLevelSettings を呼び、spec §4.5 のクランプ
 * （現在レベルを新総レベル数にクランプ + 連続失敗 0 リセット）を走らせる。クランプで現在
 * レベルが変わったら Toast で「{N} に調整されました」を案内する。
 *
 * v3.0 では旧設定 UI（n/m/r/a/b 手動スライダー・採点方式①②③）は一切存在しない（F-13）。
 * 範囲・変化順は「梯子の作り方」を変えるだけで、個別レベルの値を固定する手動 UI ではない。
 *
 * セーフエリア準拠（NF-30）。各項目行 56pt 以上（SR-1 / RG-1 / OR-1 が担保）。
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import { fontSize, fontWeight, radius, spacing, tapTarget } from '../../theme/tokens';
import { t } from '../../i18n';
import { SettingRow, SettingGroupHeading } from '../../components/v2/SettingRow';
import { Toggle } from '../../components/v2/Toggle';
import { SegmentedControl } from '../../components/v2/SegmentedControl';
import { ConfirmDialog } from '../../components/v3/ConfirmDialog';
import { RangeSelector } from '../../components/v3/RangeSelector';
import { VariableOrderList } from '../../components/v3/VariableOrderList';
import { DisclaimerModal } from '../../components/v3/DisclaimerModal';
import { Toast } from '../../components/v3/Toast';
import {
  Settings,
  UserProfile,
  DarkMode,
  OneEyeGuidance,
  APP_VERSION,
  VALUE_SETS,
  VIEWING_DISTANCE_OPTIONS,
  SESSION_MINUTES_MIN,
  SESSION_MINUTES_MAX,
  REPEAT_COUNT_MIN,
  REPEAT_COUNT_MAX,
  COUNT_RANGE_PRESETS,
  type VariableKey,
  type CountRangePreset,
} from '../../state/v3/schema';
import type { Direction, GridSize } from '../../lib/v3/level';
import {
  loadSettings,
  loadUserProfile,
  loadLevelState,
  saveUserProfile,
} from '../../state/v3/repository';
import {
  updateSettings,
  updateLevelSettings,
  setVariableRange,
  setVariableOrder,
  resetVariableOrder,
  setDarkMode,
  setSoundEnabled,
  setHapticsEnabled,
  setOneEyeGuidance,
  setSessionMinutes,
  setRepeatCount,
  setCountRange,
  settingsTotalLevels,
  normalizeViewingDistance,
} from '../../state/v3/settings';
import { deleteAllData } from '../../state/v3/dataReset';
import type { ViewingDistanceCm } from '../../lib/calibration';

export type SettingsScreenProps = {
  /** 設定変更時に親へ通知（ダークモード即反映・範囲/変化順を AppRoot へ反映）。 */
  onSettingsChange?: (settings: Settings) => void;
  /** 全データ削除完了時に親へ通知（現在レベル L1 へ・ホーム遷移等）。 */
  onDataDeleted?: () => void;
  /** テスト決定論：日時整形のクロック（既定 new Date）。 */
  testId?: string;
};

const DIRECTION_LABEL: Record<Direction, string> = {
  'one-way': t('settingsV3.direction_one_way'),
  oscillate: t('settingsV3.direction_oscillate'),
};
const GRID_LABEL: Record<GridSize, string> = {
  3: t('settingsV3.grid_3'),
  4: t('settingsV3.grid_4'),
  5: t('settingsV3.grid_5'),
  6: t('settingsV3.grid_6'),
};

const DARK_OPTIONS: ReadonlyArray<{ value: DarkMode; label: string }> = [
  { value: 'system', label: t('settingsV3.dark_system') },
  { value: 'light', label: t('settingsV3.dark_light') },
  { value: 'dark', label: t('settingsV3.dark_dark') },
];

const ONE_EYE_OPTIONS: ReadonlyArray<{ value: OneEyeGuidance; label: string }> = [
  { value: 'off', label: t('settingsV3.one_eye_off') },
  { value: 'left', label: t('settingsV3.one_eye_left') },
  { value: 'right', label: t('settingsV3.one_eye_right') },
  { value: 'alternate', label: t('settingsV3.one_eye_alternate') },
];

const VAR_LABEL: Record<VariableKey, string> = {
  repeat: t('settingsV3.var_repeat'),
  seconds: t('settingsV3.var_seconds'),
  direction: t('settingsV3.var_direction'),
  gridSize: t('settingsV3.var_gridSize'),
  rotationSpeed: t('settingsV3.var_rotationSpeed'),
};

/** countRange プリセットの選択肢（SegmentedControl 用）。 */
const COUNT_RANGE_OPTIONS: ReadonlyArray<{
  value: CountRangePreset;
  label: string;
}> = COUNT_RANGE_PRESETS.map((preset) => ({
  value: preset,
  label: t(`settingsV3.count_range_${preset}`),
}));

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onSettingsChange,
  onDataDeleted,
  testId,
}) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 720);

  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [noticeTone, setNoticeTone] = React.useState<'info' | 'error'>('info');

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

  const showInfo = React.useCallback((message: string) => {
    setNoticeTone('info');
    setNotice(message);
  }, []);
  const showError = React.useCallback((message: string) => {
    setNoticeTone('error');
    setNotice(message);
  }, []);

  // 範囲を変えないトグル系（音/振動/ダークモード/片眼）。即保存。
  const applySetting = React.useCallback(
    async (updater: (s: Settings) => Settings) => {
      const next = await updateSettings(updater);
      setSettings(next);
      onSettingsChange?.(next);
    },
    [onSettingsChange],
  );

  // 範囲（RG-1）/ 変化順（OR-1）の変更。§4.5 クランプ + 連続失敗 0 リセット。
  const applyLevelSetting = React.useCallback(
    async (updater: (s: Settings) => Settings) => {
      const result = await updateLevelSettings(updater);
      setSettings(result.settings);
      onSettingsChange?.(result.settings);
      if (result.clamped) {
        showInfo(
          t('settingsV3.clamp_notice', { level: result.levelState.currentLevel }),
        );
      } else {
        setNotice(null);
      }
    },
    [onSettingsChange, showInfo],
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
    setNotice(null);
    onSettingsChange?.(s);
    onDataDeleted?.();
  }, [onSettingsChange, onDataDeleted]);

  if (!settings || !profile) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.fill, { backgroundColor: colors.bgCanvas }]}
        testID={testId}
      >
        <View style={styles.loadingWrap}>
          <Text style={[styles.title, { color: colors.fgPrimary }]}>
            {t('settingsV3.title')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const total = settingsTotalLevels(settings);
  // v3.2：repeat は最内側固定で組み替え対象外のため、変化順 UI からは除外する（§4.2）。
  const orderItems = settings.variableOrder
    .filter((key) => key !== 'repeat')
    .map((key) => ({
      key,
      label: VAR_LABEL[key],
    }));
  const agreedLabel = profile.disclaimerAgreedAt
    ? formatDateTime(profile.disclaimerAgreedAt)
    : t('settingsV3.disclaimer_not_agreed');

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.fill, { backgroundColor: colors.bgCanvas }]}
      testID={testId}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        accessibilityLabel={t('settingsV3.title')}
      >
        <View style={[styles.content, { width: contentWidth }]}>
          <Text
            accessibilityRole="header"
            nativeID="settings-title"
            style={[styles.title, { color: colors.fgPrimary }]}
          >
            {t('settingsV3.title')}
          </Text>

          {/* ── プレイ（v3.1：sessionMinutes、SR-1a、F-13/AS-23）── */}
          <SettingGroupHeading title={t('settingsV3.group_play')} icon="play-outline" />
          <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
            <SessionMinutesRow
              minutes={settings.sessionMinutes}
              onChange={(m) =>
                applySetting((s) => setSessionMinutes(s, m))
              }
              testId={testId ? `${testId}-session-minutes` : 'session-minutes'}
            />
            {/* v3.2：繰り返し回数（梯子に影響＝updateLevelSettings）。 */}
            <RepeatCountRow
              value={settings.repeatCount}
              onChange={(n) =>
                applyLevelSetting((s) => setRepeatCount(s, n))
              }
              testId={testId ? `${testId}-repeat-count` : 'repeat-count'}
            />
            {/* v3.2：個数の範囲プリセット（梯子に非干渉＝updateSettings）。 */}
            <View style={styles.segmentRow} testID={testId ? `${testId}-count-range` : 'count-range'}>
              <Text style={[styles.sessionLabel, { color: colors.fgPrimary }]}>
                {t('settingsV3.count_range')}
              </Text>
              <SegmentedControl
                options={COUNT_RANGE_OPTIONS}
                value={settings.countRange}
                onChange={(preset) =>
                  applySetting((s) => setCountRange(s, preset))
                }
                accessibilityLabel={t('settingsV3.count_range')}
              />
              <Text style={[styles.sessionHint, { color: colors.fgSecondary }]}>
                {t('settingsV3.count_range_hint')}
              </Text>
            </View>
          </View>

          {/* ── 各変数の範囲（テスト用）── */}
          <SettingGroupHeading title={t('settingsV3.group_ranges')} icon="options-outline" />
          <Text
            accessibilityLabel={t('settingsV3.total_levels_a11y', { n: total })}
            style={[styles.totalLevels, { color: colors.fgPrimary }]}
            testID={testId ? `${testId}-total` : 'settings-total'}
          >
            {t('settingsV3.total_levels', { n: total })}
          </Text>

          <RangeRow
            label={t('settingsV3.range_seconds')}
            groupLabel={t('settingsV3.range_seconds')}
            chips={VALUE_SETS.seconds.map((v) => ({ value: v, label: `${v}` }))}
            selected={settings.variableRanges.seconds}
            onChange={(values) =>
              applyLevelSetting((s) => setVariableRange(s, 'seconds', values))
            }
            onMinViolation={() => showError(t('settingsV3.range_min_one'))}
            testId={testId ? `${testId}-range-seconds` : 'range-seconds'}
          />
          <RangeRow
            label={t('settingsV3.range_direction')}
            groupLabel={t('settingsV3.range_direction')}
            chips={VALUE_SETS.direction.map((v) => ({
              value: v,
              label: DIRECTION_LABEL[v],
            }))}
            selected={settings.variableRanges.direction}
            onChange={(values) =>
              applyLevelSetting((s) =>
                setVariableRange(s, 'direction', values as Direction[]),
              )
            }
            onMinViolation={() => showError(t('settingsV3.range_min_one'))}
            testId={testId ? `${testId}-range-direction` : 'range-direction'}
          />
          <RangeRow
            label={t('settingsV3.range_gridSize')}
            groupLabel={t('settingsV3.range_gridSize')}
            chips={VALUE_SETS.gridSize.map((v) => ({
              value: v,
              label: GRID_LABEL[v],
            }))}
            selected={settings.variableRanges.gridSize}
            onChange={(values) =>
              applyLevelSetting((s) =>
                setVariableRange(s, 'gridSize', values as GridSize[]),
              )
            }
            onMinViolation={() => showError(t('settingsV3.range_min_one'))}
            testId={testId ? `${testId}-range-gridSize` : 'range-gridSize'}
          />
          <RangeRow
            label={t('settingsV3.range_rotationSpeed')}
            groupLabel={t('settingsV3.range_rotationSpeed')}
            chips={VALUE_SETS.rotationSpeed.map((v) => ({
              value: v,
              label: `${v}`,
            }))}
            selected={settings.variableRanges.rotationSpeed}
            onChange={(values) =>
              applyLevelSetting((s) => setVariableRange(s, 'rotationSpeed', values))
            }
            onMinViolation={() => showError(t('settingsV3.range_min_one'))}
            testId={testId ? `${testId}-range-rotationSpeed` : 'range-rotationSpeed'}
          />

          <Toast
            message={notice}
            tone={noticeTone}
            testId={testId ? `${testId}-notice` : 'settings-notice'}
          />

          {/* ── 変化順（テスト用）── */}
          <SettingGroupHeading title={t('settingsV3.group_order')} icon="swap-vertical-outline" />
          <Text style={[styles.hint, { color: colors.fgSecondary }]}>
            {t('settingsV3.order_hint')}
          </Text>
          <VariableOrderList
            items={orderItems}
            onReorder={(keys) =>
              // repeat を最内側に戻して保存（UI は外側 4 変数のみ並べ替え、§4.2）。
              applyLevelSetting((s) => setVariableOrder(s, ['repeat', ...keys]))
            }
            onMoved={(label, pos) =>
              showInfo(t('settingsV3.order_moved', { name: label, pos }))
            }
            testId={testId ? `${testId}-order` : 'order-list'}
          />
          <Pressable
            onPress={() => applyLevelSetting((s) => resetVariableOrder(s))}
            accessibilityRole="button"
            accessibilityLabel={t('settingsV3.order_reset')}
            style={({ pressed }) => [styles.linkRow, focus, pressed && styles.pressed]}
            testID={testId ? `${testId}-order-reset` : 'order-reset'}
          >
            <Text style={[styles.link, { color: colors.actionPrimary }]}>
              {t('settingsV3.order_reset')}
            </Text>
          </Pressable>

          {/* ── 表示・視聴 ── */}
          <SettingGroupHeading title={t('settingsV3.group_display')} icon="eye-outline" />
          <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
            <SettingRow label={t('settingsV3.viewing_distance')}>
              <SegmentedControl
                options={VIEWING_DISTANCE_OPTIONS.map((cm) => ({
                  value: cm,
                  label: `${cm}`,
                }))}
                value={profile.viewingDistanceCm}
                onChange={(cm) => applyViewingDistance(cm as ViewingDistanceCm)}
                accessibilityLabel={t('settingsV3.viewing_distance')}
              />
            </SettingRow>
            <SettingRow label={t('settingsV3.dark_mode')} noBorder>
              <SegmentedControl
                options={DARK_OPTIONS}
                value={settings.darkMode}
                onChange={(m) => applySetting((s) => setDarkMode(s, m))}
                accessibilityLabel={t('settingsV3.dark_mode')}
              />
            </SettingRow>
          </View>

          {/* ── フィードバック ── */}
          <SettingGroupHeading title={t('settingsV3.group_feedback')} icon="notifications-outline" />
          <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
            <SettingRow label={t('settingsV3.sound')}>
              <Toggle
                value={settings.soundEnabled}
                onChange={(v) => applySetting((s) => setSoundEnabled(s, v))}
                accessibilityLabel={t('settingsV3.sound')}
              />
            </SettingRow>
            <SettingRow label={t('settingsV3.haptics')}>
              <Toggle
                value={settings.hapticsEnabled}
                onChange={(v) => applySetting((s) => setHapticsEnabled(s, v))}
                accessibilityLabel={t('settingsV3.haptics')}
              />
            </SettingRow>
            <SettingRow stacked label={t('settingsV3.one_eye')} noBorder>
              <SegmentedControl
                options={ONE_EYE_OPTIONS}
                value={settings.oneEyeGuidance}
                onChange={(g) => applySetting((s) => setOneEyeGuidance(s, g))}
                accessibilityLabel={t('settingsV3.one_eye')}
              />
            </SettingRow>
          </View>

          {/* ── その他 ── */}
          <SettingGroupHeading title={t('settingsV3.group_other')} icon="ellipsis-horizontal-circle-outline" />
          <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
            <SettingRow
              label={t('settingsV3.read_disclaimer')}
              onPress={() => setDisclaimerOpen(true)}
              accessibilityLabel={t('settingsV3.read_disclaimer')}
            />
            <SettingRow
              label={t('settingsV3.delete_all')}
              danger
              onPress={() => setDeleteOpen(true)}
              accessibilityLabel={t('settingsV3.delete_all')}
              noBorder
            />
          </View>

          <View style={styles.versionBlock}>
            <Text style={[styles.caption, { color: colors.fgMuted }]}>
              {t('settingsV3.version')}  v{APP_VERSION}
            </Text>
            <Text style={[styles.caption, { color: colors.fgMuted }]}>
              {t('settingsV3.disclaimer_agreed_at')} {agreedLabel}
            </Text>
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={deleteOpen}
        title={t('settingsV3.delete_confirm_title')}
        message={t('settingsV3.delete_confirm_message')}
        confirmLabel={t('settingsV3.delete_confirm_ok')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        testId={testId ? `${testId}-delete-dialog` : 'delete-dialog'}
      />
      <DisclaimerModal
        visible={disclaimerOpen}
        onClose={() => setDisclaimerOpen(false)}
        testId={testId ? `${testId}-disclaimer` : 'disclaimer-modal'}
      />
    </SafeAreaView>
  );
};

/** ラベル + RangeSelector を 1 ブロックにまとめる（SR-1  stacked 相当）。 */
const RangeRow = <T extends string | number>({
  label,
  groupLabel,
  chips,
  selected,
  onChange,
  onMinViolation,
  testId,
}: {
  label: string;
  groupLabel: string;
  chips: ReadonlyArray<{ value: T; label: string }>;
  selected: ReadonlyArray<T>;
  onChange: (next: T[]) => void;
  onMinViolation: () => void;
  testId?: string;
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.rangeRow}>
      <Text style={[styles.rangeLabel, { color: colors.fgPrimary }]}>{label}</Text>
      <RangeSelector
        groupLabel={groupLabel}
        chips={chips}
        selected={selected}
        onChange={onChange}
        onMinViolation={onMinViolation}
        testId={testId}
      />
    </View>
  );
};

/**
 * SR-1a：sessionMinutes ステッパー行（[−] {n}分 [+]、56pt タップ、1〜15・既定 5）。
 * 下限/上限で対応ボタンを disabled（押下無効・不透明度 0.4）。値変更を aria-live で読み上げ。
 * レベルの梯子に影響しない旨を caption で補足（components.md SR-1a）。
 */
const SessionMinutesRow: React.FC<{
  minutes: number;
  onChange: (minutes: number) => void;
  testId?: string;
}> = ({ minutes, onChange, testId }) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();
  const atMin = minutes <= SESSION_MINUTES_MIN;
  const atMax = minutes >= SESSION_MINUTES_MAX;
  const valueText = t('settingsV3.session_minutes_value', { n: minutes });

  return (
    <View style={styles.sessionRowOuter} testID={testId}>
      <View style={styles.sessionRow}>
        <Text style={[styles.sessionLabel, { color: colors.fgPrimary }]}>
          {t('settingsV3.session_minutes')}
        </Text>
        <View
          style={styles.stepper}
          // RN-Web：spinbutton の現在値・範囲を透過（components.md SR-1a a11y）。
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({
            role: 'spinbutton',
            'aria-valuenow': minutes,
            'aria-valuemin': SESSION_MINUTES_MIN,
            'aria-valuemax': SESSION_MINUTES_MAX,
            'aria-valuetext': valueText,
            'aria-label': t('settingsV3.session_minutes'),
          } as any)}
        >
          <Pressable
            onPress={() => !atMin && onChange(minutes - 1)}
            disabled={atMin}
            accessibilityRole="button"
            accessibilityLabel={t('settingsV3.session_minutes_dec')}
            accessibilityState={{ disabled: atMin }}
            style={({ pressed }) => [
              styles.stepperBtn,
              { borderColor: colors.borderInput },
              atMin && styles.stepperBtnDisabled,
              focus,
              pressed && !atMin && styles.pressed,
            ]}
            testID={testId ? `${testId}-dec` : undefined}
          >
            <Text style={[styles.stepperSign, { color: colors.fgPrimary }]}>−</Text>
          </Pressable>
          <Text
            style={[styles.stepperValue, { color: colors.fgPrimary }]}
            accessibilityLiveRegion="polite"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...({ 'aria-live': 'polite' } as any)}
            testID={testId ? `${testId}-value` : undefined}
          >
            {valueText}
          </Text>
          <Pressable
            onPress={() => !atMax && onChange(minutes + 1)}
            disabled={atMax}
            accessibilityRole="button"
            accessibilityLabel={t('settingsV3.session_minutes_inc')}
            accessibilityState={{ disabled: atMax }}
            style={({ pressed }) => [
              styles.stepperBtn,
              { borderColor: colors.borderInput },
              atMax && styles.stepperBtnDisabled,
              focus,
              pressed && !atMax && styles.pressed,
            ]}
            testID={testId ? `${testId}-inc` : undefined}
          >
            <Text style={[styles.stepperSign, { color: colors.fgPrimary }]}>＋</Text>
          </Pressable>
        </View>
      </View>
      <Text style={[styles.sessionHint, { color: colors.fgSecondary }]}>
        {t('settingsV3.session_minutes_hint')}
      </Text>
    </View>
  );
};

/**
 * SR-1b：repeatCount ステッパー行（[−] {n}回 [+]、56pt タップ、1〜6・既定 4、v3.2）。
 * SR-1a と同型だが、こちらは**梯子に影響する**（総レベル数 n×180／クランプ+連続失敗リセット）。
 */
const RepeatCountRow: React.FC<{
  value: number;
  onChange: (n: number) => void;
  testId?: string;
}> = ({ value, onChange, testId }) => {
  const { colors } = useTheme();
  const focus = useFocusStyle();
  const atMin = value <= REPEAT_COUNT_MIN;
  const atMax = value >= REPEAT_COUNT_MAX;
  const valueText = t('settingsV3.repeat_count_value', { n: value });

  return (
    <View style={styles.sessionRowOuter} testID={testId}>
      <View style={styles.sessionRow}>
        <Text style={[styles.sessionLabel, { color: colors.fgPrimary }]}>
          {t('settingsV3.repeat_count')}
        </Text>
        <View
          style={styles.stepper}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({
            role: 'spinbutton',
            'aria-valuenow': value,
            'aria-valuemin': REPEAT_COUNT_MIN,
            'aria-valuemax': REPEAT_COUNT_MAX,
            'aria-valuetext': valueText,
            'aria-label': t('settingsV3.repeat_count'),
          } as any)}
        >
          <Pressable
            onPress={() => !atMin && onChange(value - 1)}
            disabled={atMin}
            accessibilityRole="button"
            accessibilityLabel={t('settingsV3.repeat_count_dec')}
            accessibilityState={{ disabled: atMin }}
            style={({ pressed }) => [
              styles.stepperBtn,
              { borderColor: colors.borderInput },
              atMin && styles.stepperBtnDisabled,
              focus,
              pressed && !atMin && styles.pressed,
            ]}
            testID={testId ? `${testId}-dec` : undefined}
          >
            <Text style={[styles.stepperSign, { color: colors.fgPrimary }]}>−</Text>
          </Pressable>
          <Text
            style={[styles.stepperValue, { color: colors.fgPrimary }]}
            accessibilityLiveRegion="polite"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...({ 'aria-live': 'polite' } as any)}
            testID={testId ? `${testId}-value` : undefined}
          >
            {valueText}
          </Text>
          <Pressable
            onPress={() => !atMax && onChange(value + 1)}
            disabled={atMax}
            accessibilityRole="button"
            accessibilityLabel={t('settingsV3.repeat_count_inc')}
            accessibilityState={{ disabled: atMax }}
            style={({ pressed }) => [
              styles.stepperBtn,
              { borderColor: colors.borderInput },
              atMax && styles.stepperBtnDisabled,
              focus,
              pressed && !atMax && styles.pressed,
            ]}
            testID={testId ? `${testId}-inc` : undefined}
          >
            <Text style={[styles.stepperSign, { color: colors.fgPrimary }]}>＋</Text>
          </Pressable>
        </View>
      </View>
      <Text style={[styles.sessionHint, { color: colors.fgSecondary }]}>
        {t('settingsV3.repeat_count_hint')}
      </Text>
    </View>
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
    paddingBottom: spacing.s6 * 2,
  },
  content: {
    width: '100%',
    maxWidth: 720,
  },
  title: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    marginTop: spacing.s4,
    paddingHorizontal: 4,
  },
  totalLevels: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    paddingHorizontal: 4,
    marginBottom: spacing.s2,
  },
  hint: {
    fontSize: fontSize.caption,
    paddingHorizontal: 4,
    marginBottom: spacing.s2,
  },
  // SR-1a sessionMinutes ステッパー
  sessionRowOuter: {
    paddingVertical: spacing.s1,
  },
  segmentRow: {
    paddingVertical: spacing.s2,
    gap: spacing.s2,
  },
  sessionRow: {
    minHeight: tapTarget.recommended,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.s2,
  },
  sessionLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
  },
  stepperBtn: {
    width: tapTarget.recommended,
    height: tapTarget.recommended,
    borderWidth: 2,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperSign: {
    fontSize: fontSize.h2,
    fontWeight: '900',
    includeFontPadding: false,
  },
  stepperValue: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
  },
  sessionHint: {
    fontSize: fontSize.caption,
    marginTop: spacing.s1,
  },
  rangeRow: {
    paddingHorizontal: 4,
    marginBottom: spacing.s2,
  },
  rangeLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.s1,
  },
  card: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.s4,
    paddingVertical: 4,
    marginBottom: spacing.s2,
  },
  linkRow: {
    minHeight: tapTarget.recommended,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  link: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  pressed: { opacity: 0.6 },
  versionBlock: {
    marginTop: spacing.s6,
    paddingHorizontal: 4,
  },
  caption: {
    fontSize: fontSize.caption,
    marginTop: 4,
  },
});
