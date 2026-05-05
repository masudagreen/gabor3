/**
 * ThemeProvider — Sprint 7-A で導入。
 *
 * Settings.darkMode（'system' | 'light' | 'dark'）を購読し、
 * 実効的な ThemeMode（'light' | 'dark'）と Colors を Context で配信する。
 *
 * 'system' のときは React Native の useColorScheme()（Web では prefers-color-scheme）に追従。
 *
 * 使い方：
 *   AppRouter のルートで <ThemeProvider preference={settings.darkMode}> でラップ。
 *   子コンポーネントは const { mode, colors } = useTheme() を呼ぶ。
 *
 * 非対応端末（Context が無い）でも壊れないよう、デフォルト値（system 連動）を持つ。
 */

import React from 'react';
import { useColorScheme } from 'react-native';
import { Colors, getColors, ThemeMode } from './tokens';
import { DarkModePreference } from '../state/storage';

export type ThemeContextValue = {
  /** ユーザー設定（system / light / dark） */
  preference: DarkModePreference;
  /** 実効モード（system は OS に追従して light / dark に解決） */
  mode: ThemeMode;
  /** 解決済みの Colors トークン */
  colors: Colors;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = {
  /** Settings.darkMode の値。未指定なら 'system' */
  preference?: DarkModePreference;
  /** テスト用：システムスキームを差し替える */
  systemScheme?: ThemeMode;
  children: React.ReactNode;
};

/**
 * preference を解決して実効 ThemeMode を返す純関数。
 * - 'light' / 'dark' はそのまま
 * - 'system' は systemScheme を採用、無ければ 'light'
 */
export function resolveThemeMode(
  preference: DarkModePreference,
  systemScheme: ThemeMode | null | undefined,
): ThemeMode {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemScheme ?? 'light';
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  preference = 'system',
  systemScheme,
  children,
}) => {
  const detected = useColorScheme();
  const effectiveSystem: ThemeMode =
    systemScheme ?? (detected === 'dark' ? 'dark' : 'light');
  const mode = resolveThemeMode(preference, effectiveSystem);
  const colors = React.useMemo(() => getColors(mode), [mode]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ preference, mode, colors }),
    [preference, mode, colors],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

/**
 * useTheme — Provider が無い環境でも安全にデフォルト値を返す。
 *
 * デフォルトは light。これにより既存コンポーネントは Provider 未設置でもクラッシュせず、
 * 段階的に移行できる。
 */
export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    preference: 'system',
    mode: 'light',
    colors: getColors('light'),
  };
}
