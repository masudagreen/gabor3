/**
 * BadgeDetailModal — screens.md S6-02（獲得済み）/ S6-03（未獲得）。
 *
 * - 120×120px の大アイコン
 * - 獲得済み：説明 + 獲得日 + 「閉じる」
 * - 未獲得：獲得条件 + 進捗ヒント + 「閉じる」（B-06/B-07 は Game N をプレイ動線も）
 * - B-08 は「3 ゲーム中 N ゲームが先週比で改善中」+ ゲーム別状態を表示
 *
 * Modal（react-native の Modal API）を使う。a11y：
 *   - accessibilityViewIsModal=true で SR フォーカスをトラップ
 *   - 「✕」と「閉じる」ボタンの両方で閉じられる
 */
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  radius,
  spacing,
} from '../theme/tokens';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { BadgeId, BadgeStatus, DailyStats, Streak } from '../state/storage';
import {
  BADGE_META,
  buildBadgeHint,
  checkAllImprovingStatus,
  GameImprovementStatus,
} from '../lib/badges';

export type BadgeDetailModalProps = {
  visible: boolean;
  status: BadgeStatus | null;
  /** B-08 など進捗判定に必要なコンテキスト */
  streak: Streak;
  totalTrialCount: number;
  allDailyStats: DailyStats[];
  today: Date;
  onClose: () => void;
  /** B-06 / B-07 で「Game N をプレイ」する動線（未提供なら閉じるだけ） */
  onPlayGame?: (gameId: 'game2' | 'game3') => void;
};

export const BadgeDetailModal: React.FC<BadgeDetailModalProps> = ({
  visible,
  status,
  streak,
  totalTrialCount,
  allDailyStats,
  today,
  onClose,
  onPlayGame,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  if (!status) return null;
  const meta = BADGE_META[status.badgeId];
  const ctx = { streak, totalTrialCount, allDailyStats, today };
  const hint = buildBadgeHint(status.badgeId, ctx);

  // B-08 の場合は各ゲームの状態を表示
  const isB08 = status.badgeId === 'B-08';
  const allImproving = isB08
    ? checkAllImprovingStatus(allDailyStats, today)
    : null;

  const earnedDate =
    status.earned && status.earnedAt ? formatEarnedDate(status.earnedAt) : null;

  // B-06 / B-07 はゲームへの動線（未獲得時のみ）
  const ctaPlayGame: 'game2' | 'game3' | null =
    !status.earned && status.badgeId === 'B-06'
      ? 'game3'
      : !status.earned && status.badgeId === 'B-07'
        ? 'game2'
        : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View
        style={styles.backdrop}
        accessibilityViewIsModal
        testID="badge-detail-backdrop"
      >
        <View
          style={[
            styles.modal,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
          testID="badge-detail-modal"
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }} />
            <IconButton
              icon="close"
              ariaLabel="閉じる"
              onPress={onClose}
              testId="badge-detail-close"
            />
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View
              style={[
                styles.bigIconWrap,
                {
                  backgroundColor: colors.bgSurfaceRaised,
                  borderColor: colors.borderDefault,
                  opacity: status.earned ? 1 : 0.5,
                },
              ]}
            >
              <Text style={styles.bigIcon} accessibilityElementsHidden>
                {meta.emoji}
              </Text>
            </View>

            <Text
              accessibilityRole="header"
              style={[styles.name, { color: colors.fgPrimary }]}
            >
              {meta.name}
            </Text>

            {!status.earned ? (
              <Text style={[styles.subtitle, { color: colors.fgSecondary }]}>
                （未獲得）
              </Text>
            ) : null}

            {status.earned ? (
              <>
                <Text style={[styles.body18, { color: colors.fgPrimary }]}>
                  {meta.earnedDescription}
                </Text>
                {earnedDate ? (
                  <Text
                    testID="badge-earned-date"
                    style={[styles.bodyLg, { color: colors.fgPrimary }]}
                  >
                    獲得日: {earnedDate}
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={[styles.bodyLg, { color: colors.fgPrimary }]}>
                  獲得条件:
                </Text>
                <Text style={[styles.body18, { color: colors.fgPrimary }]}>
                  {meta.conditionText}
                </Text>
                <Text
                  testID="badge-detail-hint"
                  style={[styles.hint, { color: colors.actionPrimary }]}
                >
                  {hint}
                </Text>
                {isB08 && allImproving ? (
                  <View
                    testID="badge-detail-b08-status"
                    style={[
                      styles.statusBlock,
                      {
                        backgroundColor: colors.bgCanvas,
                        borderColor: colors.borderDefault,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTitle,
                        { color: colors.fgPrimary },
                      ]}
                    >
                      現在の状態：
                    </Text>
                    <GameStatusRow
                      label="Game 1（変化察知）"
                      status={allImproving.game1}
                      colors={colors}
                    />
                    <GameStatusRow
                      label="Game 2（二重表裏）"
                      status={allImproving.game2}
                      colors={colors}
                    />
                    <GameStatusRow
                      label="Game 3（周辺視野）"
                      status={allImproving.game3}
                      colors={colors}
                    />
                  </View>
                ) : null}
              </>
            )}

            {ctaPlayGame && onPlayGame ? (
              <View style={styles.ctaWrap}>
                <Button
                  variant="primary"
                  size="lg"
                  label={
                    ctaPlayGame === 'game2'
                      ? 'Game 2 をプレイ'
                      : 'Game 3 をプレイ'
                  }
                  onPress={() => onPlayGame(ctaPlayGame)}
                  fullWidth
                  testId="badge-detail-play"
                />
              </View>
            ) : null}

            <View style={styles.ctaWrap}>
              <Button
                variant={ctaPlayGame ? 'secondary' : 'primary'}
                size="lg"
                label="閉じる"
                onPress={onClose}
                fullWidth
                testId="badge-detail-close-cta"
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const GameStatusRow: React.FC<{
  label: string;
  status: GameImprovementStatus;
  colors: ReturnType<typeof getColors>;
}> = ({ label, status, colors }) => {
  const text =
    status === 'improving'
      ? '↓ 改善中'
      : status === 'flat-or-worse'
        ? '→ 横ばい／悪化'
        : '─ データ不足';
  const accentColor =
    status === 'improving'
      ? colors.semanticSuccess
      : status === 'flat-or-worse'
        ? colors.semanticWarning
        : colors.fgMuted;
  return (
    <View style={styles.statusRow}>
      <Text style={[styles.statusLabel, { color: colors.fgPrimary }]}>
        {label}
      </Text>
      <Text style={[styles.statusValue, { color: accentColor }]}>{text}</Text>
    </View>
  );
};

function formatEarnedDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

// 未使用ガード
void Pressable;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s4,
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    padding: spacing.s2,
    alignItems: 'center',
  },
  body: {
    padding: spacing.s5,
    alignItems: 'center',
    gap: spacing.s3,
  },
  bigIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigIcon: {
    fontSize: 64,
  },
  name: {
    fontSize: fontSize.h2, // 30px
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.h3, // 26px
  },
  body18: {
    fontSize: fontSize.body, // 24px
    textAlign: 'center',
  },
  bodyLg: {
    fontSize: fontSize.bodyLg, // 26px
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  hint: {
    fontSize: fontSize.bodyLg, // 26px、accent
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  statusBlock: {
    width: '100%',
    padding: spacing.s4,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.s2,
  },
  statusTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.s1,
  },
  statusLabel: {
    fontSize: fontSize.body, // 24px
    flex: 1,
  },
  statusValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
  },
  ctaWrap: {
    width: '100%',
    marginTop: spacing.s2,
  },
});
