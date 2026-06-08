/**
 * GaborEye v2.0 — エントリ。
 *
 * 起動フロー（F-06 / F-11）：
 *   1. 起動時に F-11 マイグレーション（旧名前空間消去 + v2 初期化）を実行
 *   2. 旧データを消去した初回のみ DataResetNotice（RZ-1）を 1 度だけ表示
 *   3. 設定 / プロフィールを読み込む
 *   4. 初回（onboardingCompleted=false）のみオンボーディング（S6-1）を表示。
 *      完了で UserProfile（onboardingCompleted/disclaimerAgreedAt/ageGroup/
 *      viewingDistanceCm）を保存し、AppRoot へ進む。
 *   5. AppRoot（3 タブ + 距離リマインド → 自動開始 → 結果カード）を表示する。
 *   6. darkMode 設定を ThemeProvider に反映。設定の「免責事項を読む」で再閲覧モーダル（F-10）。
 *
 * 2 回目以降：起動 → AppRoot（距離リマインド → 自動開始）。オンボなし。
 */

import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { getColors, fontSize, fontWeight, spacing, radius, tapTarget } from './src/theme/tokens';
import { AppRoot } from './src/screens/v2/AppRoot';
import { OnboardingScreen } from './src/screens/v2/OnboardingScreen';
import type { OnboardingResult } from './src/screens/v2/OnboardingScreen';
import { DataResetNotice } from './src/components/v2/DataResetNotice';
import { DisclaimerPanel } from './src/components/v2/DisclaimerPanel';
import { AdManager } from './src/components/v2/AdManager';
import {
  runStartupMigration,
  acknowledgeResetNotice,
} from './src/state/migration';
import {
  loadSettings,
  loadUserProfile,
  saveUserProfile,
} from './src/state/repository';
import { defaultSettings, defaultUserProfile, SCHEMA_VERSION } from './src/state/schema';
import type { Settings, DarkMode, UserProfile } from './src/state/schema';
import { estimateDeviceType } from './src/lib/calibration';
import type { ViewingDistanceCm } from './src/lib/calibration';
import { Platform } from 'react-native';
import { t } from './src/i18n';

function StatusBarForMode() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  const [ready, setReady] = React.useState(false);
  const [showResetNotice, setShowResetNotice] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState<DarkMode>('system');
  const [settings, setSettings] = React.useState<Settings>(defaultSettings());
  const [profile, setProfile] = React.useState<UserProfile>(
    defaultUserProfile(new Date().toISOString(), estimateDeviceType(Platform.OS)),
  );
  const [viewingDistanceCm, setViewingDistanceCm] =
    React.useState<ViewingDistanceCm>(40);
  const [disclaimerOpen, setDisclaimerOpen] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const result = await runStartupMigration();
      const [loadedSettings, loadedProfile] = await Promise.all([
        loadSettings(),
        loadUserProfile(),
      ]);
      if (!mounted) return;
      setSettings(loadedSettings);
      setDarkMode(loadedSettings.darkMode);
      setProfile(loadedProfile);
      setViewingDistanceCm(loadedProfile.viewingDistanceCm as ViewingDistanceCm);
      setShowResetNotice(result.shouldShowNotice);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSettingsChange = React.useCallback((next: Settings) => {
    setSettings(next);
    setDarkMode(next.darkMode);
  }, []);

  const handleAcknowledge = React.useCallback(async () => {
    await acknowledgeResetNotice();
    setShowResetNotice(false);
  }, []);

  // オンボーディング完了：UserProfile を保存して AppRoot へ（F-06/F-10）。
  const handleOnboardingComplete = React.useCallback(
    async (res: OnboardingResult) => {
      const next: UserProfile = {
        ...profile,
        onboardingCompleted: true,
        disclaimerAgreedAt: res.disclaimerAgreedAt,
        ageGroup: res.ageGroup,
        viewingDistanceCm: res.viewingDistanceCm,
        schemaVersion: SCHEMA_VERSION,
      };
      await saveUserProfile(next);
      setProfile(next);
      setViewingDistanceCm(res.viewingDistanceCm);
    },
    [profile],
  );

  // リセット通知の表示中はオンボより通知を優先する（F-11 → F-06 の順）。
  const showOnboarding =
    ready && !showResetNotice && !profile.onboardingCompleted;

  return (
    <SafeAreaProvider>
      <ThemeProvider preference={darkMode}>
        <StatusBarForMode />
        {!ready ? (
          <View
            style={[
              styles.loading,
              { backgroundColor: getColors('light').bgCanvas },
            ]}
          >
            <ActivityIndicator size="large" />
          </View>
        ) : showOnboarding ? (
          <OnboardingScreen onComplete={handleOnboardingComplete} testId="onboarding" />
        ) : (
          <AdManager>
            <AppRoot
              settings={settings}
              viewingDistanceCm={viewingDistanceCm}
              onSettingsChange={handleSettingsChange}
              onReadDisclaimer={() => setDisclaimerOpen(true)}
            />
          </AdManager>
        )}
        <DataResetNotice
          visible={ready && showResetNotice}
          onAcknowledge={handleAcknowledge}
        />
        <DisclaimerReviewModal
          visible={disclaimerOpen}
          onClose={() => setDisclaimerOpen(false)}
        />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** 設定からの免責再閲覧モーダル（F-10）。 */
const DisclaimerReviewModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View
            style={[styles.modalCard, { backgroundColor: colors.bgSurface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.fgPrimary }]}>
              {t('disclaimer.title')}
            </Text>
            <DisclaimerPanel />
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={({ pressed }) => [
                styles.modalClose,
                { backgroundColor: colors.actionPrimary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.modalCloseText, { color: colors.fgOnPrimary }]}>
                {t('common.close')}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalSafe: { justifyContent: 'center' },
  modalCard: {
    margin: spacing.s5,
    padding: spacing.s5,
    borderRadius: radius.lg,
    gap: spacing.s4,
  },
  modalTitle: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
  },
  modalClose: {
    minHeight: tapTarget.recommended,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
  },
});
