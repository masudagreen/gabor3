/**
 * SessionSummaryCard.tsx — RC-1 → SessionSummaryCard（components.md §225 / screens.md S7-3、
 * F-08/F-04、v3.1 でセッション要約に改訂）。
 *
 * セッション終了（指定時間超過でラウンド反復終了）後にホームタブへ表示する**セッション要約**。
 * 1 ラウンドごとのクリア/失敗・レベル変化はゲーム画面内開示（OV-1/LD-1）で済んでおり、本カードは
 * セッション全体の集計を表示する（AS-29）。
 *
 * 構成（縦、上から、v3.1 改訂）：
 *   1. 現在のレベル（主役・最大、LB-1 large、font.display 64px ＝次セッション開始レベル）
 *   2. セッション時間（パッチを見ている時間、font.numeric.l + ラベル）。※「このセッションの最高」は廃止。
 *   3. 集計（ST-1 compact 2 タイル：✅ クリア数 / ❌ 失敗数）。※ラウンド数は表示しない。
 *   4. 今日のストリーク（🔥 + 「連続 {n} 日」、形+テキストで色非依存）
 *   5. （任意）バッジ獲得演出（BadgeAwardToast、一定時間で自動消滅、§6.4）
 *   6. 「もう一度」（Button primary lg 64px ≧ 56pt、回数制限なし）
 *
 * 「セッション終了」見出しは廃止（無くても文脈で分かる）。LD-1（ラウンド昇降告知）も本カードに出さない。
 * セッション要約表示中はゲーム非進行 → タブ移動自由（呼び出し側）。セーフエリア準拠（NF-30）。
 *
 * a11y：role=region aria-label「現在のレベル {n}。セッション時間 {m} 分 {s} 秒。
 *   ✅ {c}、❌ {f}。連続 {d} 日」。
 */

import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import {
  fontSize,
  fontWeight,
  levelV3,
  lineHeight,
  radius,
  resultV3,
  spacing,
  tapTarget,
} from '../../theme/tokens';
import type { BadgeId } from '../../state/v3/schema';
import { BadgeAwardToast } from './BadgeAwardToast';
import { formatSessionDuration, splitDuration } from '../../lib/v3/timeFormat';
import { t } from '../../i18n';

export type SessionSummaryCardProps = {
  /** クリアしたラウンド数（✅）。 */
  clearCount: number;
  /** 失敗したラウンド数（❌）。 */
  failCount: number;
  /** 現在レベル（増減反映後 = 次セッション開始レベル）。主役表示。 */
  currentLevel: number;
  /** このセッションのプレイ時間（秒・パッチを見ている時間）。「セッション時間」として表示。 */
  sessionPlaySec: number;
  /** 今日のストリーク（連続日数）。 */
  streak: number;
  /** 今回新規獲得したバッジ ID（§6.4：獲得時に 1 度だけ演出）。空なら演出なし。 */
  newlyEarnedBadges?: readonly BadgeId[];
  /** バッジ獲得演出の表示開始時に 1 度（S10：音/ハプティクス発火点）。 */
  onBadgeShown?: (badgeIds: readonly BadgeId[]) => void;
  /** 「もう一度」押下（距離リマインド経由で新セッション）。 */
  onReplay: () => void;
  testId?: string;
};

export const SessionSummaryCard: React.FC<SessionSummaryCardProps> = ({
  clearCount,
  failCount,
  currentLevel,
  sessionPlaySec,
  streak,
  newlyEarnedBadges,
  onBadgeShown,
  onReplay,
  testId,
}) => {
  const { colors, mode } = useTheme();
  const focus = useFocusStyle();
  const lTokens = levelV3[mode];
  const rTokens = resultV3[mode];

  const streakText =
    streak > 0 ? t('sessionV3.streak', { n: streak }) : t('sessionV3.streak_zero');

  const playDuration = splitDuration(sessionPlaySec);
  const playDurationText = formatSessionDuration(sessionPlaySec);

  const regionLabel = t('sessionV3.region', {
    level: currentLevel,
    minutes: playDuration.minutes + playDuration.hours * 60,
    seconds: playDuration.seconds,
    clears: clearCount,
    fails: failCount,
    streak,
  });

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.root, { backgroundColor: colors.bgCanvas }]}
      testID={testId}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        // react-native-web: role=region + aria-label で要約全体を 1 まとめに読み上げ
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(Platform.OS === 'web' ? ({ role: 'region', 'aria-label': regionLabel } as any) : {})}
        accessibilityLabel={Platform.OS === 'web' ? undefined : regionLabel}
      >
        {/* 1. 現在のレベル（主役・LB-1 large 相当、64px） */}
        <View
          style={styles.currentLevel}
          accessibilityRole="text"
          accessibilityLabel={`${t('sessionV3.current_level_label')} ${currentLevel}`}
          testID={testId ? `${testId}-current-level` : undefined}
        >
          <Text style={[styles.currentLabel, { color: colors.fgSecondary }]}>
            {t('sessionV3.current_level_label')}
          </Text>
          <Text
            style={[styles.currentNumber, { color: lTokens.fg }]}
            testID={testId ? `${testId}-current-number` : undefined}
          >
            {String(currentLevel)}
          </Text>
        </View>

        {/* 2. セッション時間（パッチを見ている時間。「このセッションの最高」を置き換え） */}
        <View
          style={styles.sessionHighest}
          accessibilityRole="text"
          accessibilityLabel={`${t('sessionV3.session_time_label')} ${playDurationText}`}
          testID={testId ? `${testId}-session-time` : undefined}
        >
          <Text style={[styles.highestLabel, { color: colors.fgSecondary }]}>
            {t('sessionV3.session_time_label')}
          </Text>
          <Text
            style={[styles.highestNumber, { color: colors.fgPrimary }]}
            testID={testId ? `${testId}-session-time-value` : undefined}
          >
            {playDurationText}
          </Text>
        </View>

        {/* 3. 集計（✅ クリア数 / ❌ 失敗数。ラウンド数は出さない） */}
        <View style={styles.tiles} testID={testId ? `${testId}-tiles` : undefined}>
          <StatTileCompact
            label="✅"
            value={clearCount}
            valueColor={rTokens.aggregateClearBg}
            testId={testId ? `${testId}-clears` : undefined}
          />
          <StatTileCompact
            label="❌"
            value={failCount}
            valueColor={colors.fgPrimary}
            testId={testId ? `${testId}-fails` : undefined}
          />
        </View>

        {/* 4. 今日のストリーク */}
        <Text
          style={[styles.streak, { color: colors.streakFlameFg }]}
          accessibilityRole="text"
          testID={testId ? `${testId}-streak` : undefined}
        >
          🔥 {streakText}
        </Text>

        {/* 5. もう一度（primary lg 64px） */}
        <Pressable
          onPress={onReplay}
          accessibilityRole="button"
          accessibilityLabel={t('sessionV3.replay')}
          style={({ pressed }) => [
            styles.replay,
            { backgroundColor: colors.actionPrimary },
            focus,
            pressed && styles.pressed,
          ]}
          testID={testId ? `${testId}-replay` : undefined}
        >
          <Text style={[styles.replayText, { color: colors.fgOnPrimary }]}>
            {t('sessionV3.replay')}
          </Text>
        </Pressable>
      </ScrollView>

      {/* バッジ獲得演出（BG-2、§6.4）：新規獲得時のみ 1 度。中央上、もう一度と非干渉。 */}
      <BadgeAwardToast
        badgeIds={newlyEarnedBadges ?? []}
        onShown={onBadgeShown}
        testId={testId ? `${testId}-badge-toast` : undefined}
      />
    </SafeAreaView>
  );
};

/** セッション要約のラウンド集計タイル（ST-1 compact、26px Bold + ラベル）。 */
const StatTileCompact: React.FC<{
  label: string;
  value: number;
  valueColor: string;
  testId?: string;
}> = ({ label, value, valueColor, testId }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.tile, { backgroundColor: colors.bgSurface }]}
      accessibilityRole="text"
      accessibilityLabel={`${label} ${value}`}
      testID={testId}
    >
      <Text
        style={[styles.tileValue, { color: valueColor }]}
        testID={testId ? `${testId}-value` : undefined}
      >
        {String(value)}
      </Text>
      <Text style={[styles.tileLabel, { color: colors.fgSecondary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s5,
    padding: spacing.s5,
  },
  currentLevel: { alignItems: 'center', gap: spacing.s1 },
  currentLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
  },
  currentNumber: {
    // 主役・最大（components.md「font.display 64px」相当。tokens は numericXl=72 を主役強調に充てる）。
    fontSize: fontSize.numericXl,
    fontWeight: fontWeight.bold,
    includeFontPadding: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
  },
  sessionHighest: { alignItems: 'center', gap: spacing.s1 / 2 },
  highestLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
  },
  highestNumber: {
    fontSize: fontSize.numericL,
    fontWeight: fontWeight.bold,
    includeFontPadding: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.s2,
  },
  tile: {
    minWidth: 92,
    flexGrow: 1,
    flexBasis: 92,
    maxWidth: 160,
    borderRadius: radius.md,
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s3,
    alignItems: 'center',
    gap: spacing.s1 / 2,
  },
  tileValue: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
    includeFontPadding: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ fontVariant: ['tabular-nums'] } as any),
  },
  tileLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
  },
  streak: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.body * lineHeight.body,
    textAlign: 'center',
  },
  replay: {
    minHeight: tapTarget.buttonLg,
    minWidth: 220,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s6,
  },
  replayText: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
  },
  pressed: { opacity: 0.8 },
});
