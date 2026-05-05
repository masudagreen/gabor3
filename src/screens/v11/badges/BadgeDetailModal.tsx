/**
 * BadgeDetailModal — S19-02（design-v11/sprints/sprint-19/screens.md §3）。
 *
 * バッジ詳細モーダル。獲得条件 / 進捗 / 状態 / 閉じるボタンを表示。
 *
 * F-18 反映：
 *   - B-06 / B-07 で依存ゲームが disabled なら hint で「現在 GXX は公開対象外」
 *   - B-09 / B-10 / B-13：「公開対象 N ゲーム中 M 達成」と動的計算
 *
 * a11y：
 *   - role="dialog", aria-modal="true", aria-labelledby="badge-detail-title"
 *   - 開時に閉じるボタンへフォーカス（Web で動作）
 *   - Esc で閉じる（Modal の onRequestClose 経由）
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
} from '../../../theme/tokens';
import { Button } from '../../../components/Button';
import { IconButton } from '../../../components/IconButton';
import {
  BADGE_DEFINITIONS_V11,
  BadgeIdV11,
} from '../../../lib/v11/badgeDefinitions';
import {
  BadgeStatusV11,
  buildBadgeHintV11,
  BadgeEvalContextV11,
  isBlockedByDisabledGame,
} from '../../../lib/v11/badges';

export type BadgeDetailModalProps = {
  visible: boolean;
  badgeId: BadgeIdV11 | null;
  status: BadgeStatusV11 | null;
  ctx: BadgeEvalContextV11;
  onClose: () => void;
};

export const BadgeDetailModal: React.FC<BadgeDetailModalProps> = ({
  visible,
  badgeId,
  status,
  ctx,
  onClose,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  if (!visible || !badgeId) return null;
  const def = BADGE_DEFINITIONS_V11[badgeId];
  const earned = status?.earned ?? false;
  const earnedAt = status?.earnedAt ?? null;
  const hint = buildBadgeHintV11(badgeId, ctx);
  const blocked = isBlockedByDisabledGame(badgeId);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="none"
      >
        <Pressable
          style={[
            styles.dialog,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderDefault,
            },
          ]}
          onPress={() => {}}
          accessibilityRole="none"
          accessibilityLabel={`${def.name} のバッジ詳細`}
          aria-modal
          role="dialog"
          aria-labelledby="badge-detail-title"
          testID="badge-detail-modal"
        >
          <View style={styles.headerRow}>
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
                  borderColor: colors.borderDefault,
                  backgroundColor: colors.bgSurfaceRaised,
                  opacity: earned ? 1 : 0.5,
                },
              ]}
            >
              <Text style={styles.bigIcon} accessibilityElementsHidden>
                {def.emoji}
              </Text>
            </View>

            <Text
              accessibilityRole="header"
              nativeID="badge-detail-title"
              style={[styles.titleText, { color: colors.fgPrimary }]}
              testID="badge-detail-title"
            >
              {badgeId} {def.name}
            </Text>

            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.fgPrimary }]}
              >
                獲得条件
              </Text>
              <Text
                style={[styles.sectionBody, { color: colors.fgPrimary }]}
              >
                {def.conditionText}
              </Text>
            </View>

            {!earned ? (
              <View style={styles.section}>
                <Text
                  style={[styles.sectionTitle, { color: colors.fgPrimary }]}
                >
                  進捗
                </Text>
                <Text
                  style={[
                    styles.sectionBody,
                    {
                      color: blocked
                        ? colors.semanticError
                        : colors.fgPrimary,
                    },
                  ]}
                  testID="badge-detail-hint"
                >
                  {hint}
                </Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.fgPrimary }]}
              >
                状態
              </Text>
              <Text
                style={[styles.sectionBody, { color: colors.fgPrimary }]}
                testID="badge-detail-state"
              >
                {earned
                  ? earnedAt
                    ? `獲得済（${formatYmd(earnedAt)} 獲得）`
                    : '獲得済'
                  : '未獲得'}
              </Text>
            </View>

            <View style={styles.actions}>
              <Button
                variant="primary"
                size="lg"
                label="閉じる"
                onPress={onClose}
                fullWidth
                testId="badge-detail-close-primary"
              />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

function formatYmd(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s4,
  },
  dialog: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    padding: spacing.s4,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  body: {
    alignItems: 'center',
    gap: spacing.s4,
    paddingBottom: spacing.s4,
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
  titleText: {
    fontSize: fontSize.h2, // 30
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  section: {
    width: '100%',
    gap: spacing.s2,
  },
  sectionTitle: {
    fontSize: fontSize.h3, // 26
    fontWeight: fontWeight.bold as '700',
  },
  sectionBody: {
    fontSize: fontSize.body, // 24
    lineHeight: fontSize.body * 1.6,
  },
  actions: {
    width: '100%',
    marginTop: spacing.s3,
  },
});
