/**
 * GameTopBar.tsx — GB-1（components.md / F-01・F-02・F-05・F-07）。
 *
 * ゲームプレイ画面の上部固定バー。高さ 64px + top セーフエリア分オフセット（NF-29）。
 * 内容（X・セッション残り時間・レベル番号）はセーフエリア内に収める。
 *
 * v3.1 改訂：
 *   - 左：X（中断、aria-label「ゲームを中断」、48pt+）+ セッション残り時間「{mm}:{ss}」
 *     （font.label・fg 控えめ灰・段階色なし。**「あと」表記は付けない**＝ユーザー要望）。
 *   - 右：LB-1 LevelBadge inline「レベル {n}」（F-02：ゲーム画面にレベル番号）。
 *   - 中央：何も置かない。制限時間カウントダウンはメイン画面（格子の上）へ移設（GameScreen）。
 *
 * バー全体を不透明 dark バーにする（ガボール縞が文字背景に混入しない、system §1.4 / GB-1）。
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusStyle } from '../../theme/focusStyle';
import { countdownV2, fontSize, fontWeight, radius, spacing, tapTarget } from '../../theme/tokens';
import { t } from '../../i18n';
import { LevelBadge } from './LevelBadge';

const BAR_HEIGHT = 64;

/** 上部バーの高さ（セーフエリア除く）。GameScreen の画面中央レイアウト計算で参照する。 */
export const GAME_TOP_BAR_HEIGHT = BAR_HEIGHT;

/**
 * 暗い不透明バー（#15171C）上のセッション残り時間の控えめ灰文字（GB-1・段階色なし）。
 * #15171C 上で 7:1 以上（NF-8）を満たす落ち着いたグレー。
 */
const SESSION_REMAINING_FG = '#A6ADBA';

/** 残り秒数（>=0）を mm:ss にフォーマットする（セッション残り時間表示用、GB-1）。 */
export function formatSessionRemaining(remainingSessionSec: number): {
  mm: string;
  ss: string;
  minutes: number;
  seconds: number;
} {
  const clamped = Math.max(0, Math.floor(remainingSessionSec));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return {
    mm: String(minutes),
    ss: String(seconds).padStart(2, '0'),
    minutes,
    seconds,
  };
}

export type GameTopBarProps = {
  /** 現在の挑戦レベル番号（右ピル、F-02）。 */
  level: number;
  /**
   * セッション残り時間（秒、v3.1）。指定時のみ左に「{mm}:{ss}」を表示（GB-1、「あと」表記なし）。
   * 段階色なし・控えめ。
   */
  remainingSessionSec?: number;
  onAbort: () => void;
  testId?: string;
};

export const GameTopBar: React.FC<GameTopBarProps> = ({
  level,
  remainingSessionSec,
  onAbort,
  testId,
}) => {
  const focus = useFocusStyle();
  const insets = useSafeAreaInsets();
  // ゲーム上部バーはアプリのテーマに関わらず常に暗い不透明バー（モックアップ準拠）。
  const tokens = countdownV2.dark;

  const session =
    remainingSessionSec != null ? formatSessionRemaining(remainingSessionSec) : null;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: tokens.bg,
          paddingTop: insets.top,
          height: BAR_HEIGHT + insets.top,
        },
      ]}
      testID={testId}
    >
      <View style={styles.leftSlot}>
        <Pressable
          onPress={onAbort}
          accessibilityRole="button"
          accessibilityLabel={t('gameV3.abort_label')}
          hitSlop={8}
          style={({ pressed }) => [styles.xButton, focus, pressed && styles.pressed]}
          testID={testId ? `${testId}-abort` : undefined}
        >
          <Text style={[styles.xIcon, { color: tokens.normal }]}>✕</Text>
        </Pressable>
        {session ? (
          <Text
            style={[styles.sessionRemaining, { color: SESSION_REMAINING_FG }]}
            accessibilityRole="text"
            accessibilityLabel={t('gameV3.session_remaining_a11y', {
              m: session.minutes,
              s: session.seconds,
            })}
            testID={testId ? `${testId}-session-remaining` : 'session-remaining'}
          >
            {t('gameV3.session_remaining', { mm: session.mm, ss: session.ss })}
          </Text>
        ) : null}
      </View>
      <View style={styles.levelSlot}>
        <LevelBadge
          level={level}
          variant="inline"
          testId={testId ? `${testId}-level` : undefined}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  leftSlot: {
    position: 'absolute',
    left: spacing.s2,
    bottom: (BAR_HEIGHT - tapTarget.iconButton) / 2,
    height: tapTarget.iconButton,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s1,
    maxWidth: '50%',
  },
  xButton: {
    width: tapTarget.iconButton,
    height: tapTarget.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  xIcon: {
    fontSize: fontSize.h2,
  },
  sessionRemaining: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    // tabular-nums で mm:ss の桁ぶれ防止。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
    includeFontPadding: false,
  },
  levelSlot: {
    position: 'absolute',
    right: spacing.s4,
    bottom: (BAR_HEIGHT - tapTarget.min) / 2,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
