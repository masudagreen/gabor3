/**
 * SkipLink — Sprint 7-C / screens.md S7-11「Skip Link（Web 全画面共通）」。
 *
 * Web 専用：Tab で focus したら表示、Enter / Space で props.onActivate を呼ぶ。
 * Native では何も描画しない（return null）。
 *
 * デフォルトでは画面左上に absolute 配置し、`focus-visible` 時のみ可視。
 * 既存ヘッダーと干渉しないよう、上部に薄くオーバーレイする。
 *
 * 過去スプリントの a11y Minor 3（PC Skip link が未実装）への対応。
 */

import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fontSize, fontWeight, radius, spacing } from '../theme/tokens';
import { buildFocusStyle } from '../theme/focusStyle';

export type SkipLinkProps = {
  /** 「メインコンテンツへ移動」がアクティブになったとき呼ばれる */
  onActivate: () => void;
  /** デフォルト：「メインコンテンツへ移動」 */
  label?: string;
  testId?: string;
};

const DEFAULT_LABEL = 'メインコンテンツへ移動';

export const SkipLink: React.FC<SkipLinkProps> = ({
  onActivate,
  label = DEFAULT_LABEL,
  testId = 'skip-link',
}) => {
  const { colors } = useTheme();
  const [focused, setFocused] = React.useState(false);

  // Web 以外では描画しない（NF-9 は Web のみキーボード必須）
  if (Platform.OS !== 'web') {
    return null;
  }

  const focusStyle = buildFocusStyle(colors.focusRing);

  return (
    <View
      style={[
        styles.wrapper,
        focused ? styles.wrapperFocused : styles.wrapperHidden,
        // RN Web 0.19+ では pointerEvents は style 経由が推奨
        { pointerEvents: focused ? 'auto' : 'none' },
      ]}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        onPress={onActivate}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        testID={testId}
        style={[
          styles.link,
          {
            backgroundColor: colors.actionPrimary,
          },
          focused ? focusStyle : null,
        ]}
      >
        <Text
          style={[styles.label, { color: colors.fgOnPrimary }]}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: spacing.s2,
    left: spacing.s2,
    zIndex: 9999,
  },
  // focus 時：通常表示
  wrapperFocused: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
  // 非 focus 時：translate でビューポート外に飛ばし、pointerEvents='none' で
  // 透明オーバーレイのクリック横取りを完全に防ぐ。Tab focus は受けられる。
  wrapperHidden: {
    opacity: 0,
    transform: [{ translateY: -200 }],
  },
  link: {
    minHeight: 48,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s2,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.body, // 24px (OPT-1)
    fontWeight: fontWeight.medium as '600',
  },
});
