/**
 * BottomTabBar.tsx — NV-1（components.md / screens.md S6-1、spec F-05）v3.0。
 *
 * 画面最下部に固定する 3 タブ（ホーム / 履歴 / 設定）。v2 の NV-1 を v3 に移設。
 *
 * v3.1 改訂：タブのテキストラベル（ホーム/履歴/設定）は表示しない。アイコンのみ・一回り大きく。
 * 名称はスクリーンリーダー用に accessibilityLabel として保持する（視覚的には非表示）。
 *
 * アクティブ表示は色のみに依存しない（NF-12）：
 *   - 上辺 3px インジケータ（actionPrimary）
 *   - 前景色（active=actionPrimary / inactive=fgSecondary）
 *   - アイコンを塗り（active）/ 線（inactive）で形も変える
 *
 * タップ領域は 64px（推奨）+ bottom セーフエリア（NF-30）。
 * a11y：role=tablist / 各タブ role=tab + aria-selected + aria-label（NF-7/15）。
 * Web：Tab で到達・Enter/Space 起動・focus ring 3px（NF-9、useFocusStyle）。
 *
 * プレイ中の他タブ連動（F-05/F-07）は本コンポーネントの責務ではなく、
 * onTabPress を受けた親（AppRoot）が「プレイ中なら中断ダイアログ、非進行中なら即切替」
 * を判断する。本コンポーネントは選択中タブの提示と押下通知のみを行う。
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import { webSpaceActivation } from '../../theme/keyActivation';
import { spacing } from '../../theme/tokens';
import { t } from '../../i18n';

export type TabKey = 'home' | 'history' | 'settings';

export const TAB_ORDER: readonly TabKey[] = ['home', 'history', 'settings'];

type TabDef = {
  key: TabKey;
  ariaLabel: string;
};

const TAB_DEFS: Record<TabKey, TabDef> = {
  home: { key: 'home', ariaLabel: t('nav.home_tab') },
  history: { key: 'history', ariaLabel: t('nav.history_tab') },
  settings: { key: 'settings', ariaLabel: t('nav.settings_tab') },
};

export type BottomTabBarProps = {
  current: TabKey;
  onTabPress: (key: TabKey) => void;
  testId?: string;
};

/**
 * 形でアクティブ/非アクティブを区別するアイコン（NF-12：塗り=active / 線=inactive）。
 */
const TabIcon: React.FC<{ tab: TabKey; active: boolean; color: string }> = ({
  tab,
  active,
  color,
}) => {
  if (tab === 'home') {
    return (
      <Ionicons name={active ? 'home' : 'home-outline'} size={32} color={color} />
    );
  }
  if (tab === 'history') {
    return (
      <Ionicons name={active ? 'time' : 'time-outline'} size={32} color={color} />
    );
  }
  return (
    <Ionicons
      name={active ? 'settings' : 'settings-outline'}
      size={32}
      color={color}
    />
  );
};

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  current,
  onTabPress,
  testId,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const focus = useFocusStyle();

  return (
    <View
      // react-native-web: role=tablist を DOM に透過
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(Platform.OS === 'web' ? ({ role: 'tablist' } as any) : {})}
      style={[
        styles.bar,
        {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderDefault,
          paddingBottom: insets.bottom,
        },
      ]}
      testID={testId}
    >
      {TAB_ORDER.map((key) => {
        const def = TAB_DEFS[key];
        const active = key === current;
        const fg = active ? colors.actionPrimary : colors.fgSecondary;
        return (
          <Pressable
            key={key}
            onPress={() => onTabPress(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={def.ariaLabel}
            // react-native-web：aria-selected を DOM に明示（role=tab と対応）
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...({ 'aria-selected': active } as any)}
            // NF-9：Space でタブ起動（Enter は RN-Web 既定。tab は Space 未対応のため補完）
            {...webSpaceActivation(() => onTabPress(key))}
            style={({ pressed }) => [styles.tab, focus, pressed && styles.pressed]}
            testID={testId ? `${testId}-${key}` : undefined}
          >
            {/* 上辺アクティブインジケータ 3px（色のみ非依存の補強の 1 つ） */}
            <View
              style={[
                styles.indicator,
                { backgroundColor: active ? colors.actionPrimary : 'transparent' },
              ]}
            />
            <TabIcon tab={key} active={active} color={fg} />
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    minHeight: 64, // 推奨 64px（OPT-2、48pt 以上）
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.s1,
    paddingBottom: spacing.s2,
    gap: spacing.s1,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  pressed: { opacity: 0.7 },
});
