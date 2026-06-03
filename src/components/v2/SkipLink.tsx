/**
 * SkipLink.tsx — NF-14（Web 専用：メインコンテンツへスキップ）。
 *
 * Web でキーボード操作時、Tab の最初の到達要素として「メインコンテンツへスキップ」を出す。
 * 通常は画面外（視覚的に隠す）に置き、focus されたときだけ左上に現れる（標準パターン）。
 * 押下（Enter/Space/クリック）で nativeID=targetId の要素へフォーカスを移し、
 * タブバー等の前段を読み飛ばせるようにする（SR/キーボード両対応）。
 *
 * Native（iOS/Android）では概念が無く、VoiceOver/TalkBack のローター/見出し送りが
 * 代替手段になるため何も描画しない。
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { t } from '../../i18n';

export type SkipLinkProps = {
  /** スキップ先のメインコンテンツ領域に付与した nativeID */
  targetId: string;
  testId?: string;
};

export const SkipLink: React.FC<SkipLinkProps> = ({ targetId, testId }) => {
  const { colors } = useTheme();

  if (Platform.OS !== 'web') return null;

  const focusMain = () => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(targetId);
    if (el) {
      // tabIndex=-1 をその場で付与してフォーカス可能にする（フォーカス後は維持）。
      if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      (el as HTMLElement).focus();
    }
  };

  // Enter/Space で確実に起動する（NF-9）。RNW は role=link に活性化を合成しないため
  // role=button 化に加え、Web の onKeyDown でも focusMain を呼ぶ（二重担保）。
  const handleKeyDown = (e: { key?: string; preventDefault?: () => void }) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault?.();
      focusMain();
    }
  };

  return (
    <Pressable
      onPress={focusMain}
      accessibilityRole="button"
      accessibilityLabel={t('nav.skip_to_content')}
      // RNW: role=button で Enter/Space 活性化。dataSet でフォーカス時のみ可視化（focusStyle の CSS）。
      // onKeyDown は React DOM ハンドラとして div に付与され、Enter/Space を確実に拾う。
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({ role: 'button', dataSet: { geSkipLink: 'true' }, onKeyDown: handleKeyDown } as any)}
      style={[styles.link, { backgroundColor: colors.actionPrimary }]}
      testID={testId}
    >
      <Text style={[styles.text, { color: colors.fgOnPrimary }]}>
        {t('nav.skip_to_content')}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  link: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
  },
});
