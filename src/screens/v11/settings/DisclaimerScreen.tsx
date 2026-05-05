/**
 * DisclaimerScreen — S19-04（design-v11/sprints/sprint-19/screens.md §5）。
 *
 * 設定からの再閲覧モード。免責事項本文 + 同意日 + 「閉じる」を表示する。
 * オンボーディング時の DisclaimerSheet と異なり、再同意は走らない（閲覧のみ）。
 *
 * F-02 受け入れ基準：
 *   - 文言が 18pt 以上 → font.body 24px
 *   - 設定からいつでも再閲覧できる
 *   - 同意日時を画面内に表示
 *
 * a11y：
 *   - role="dialog", aria-modal="true", aria-labelledby="disclaimer-review-title"
 *   - 開時に「閉じる」ボタンへフォーカス
 *   - Esc / 背景タップで閉じる
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

export type DisclaimerScreenProps = {
  visible: boolean;
  /** YYYY-MM-DD（同意日）。null なら「―」表示 */
  disclaimerAgreedAt: string | null;
  onClose: () => void;
};

const DISCLAIMER_BODY = `本アプリは医療機器ではありません。視機能の診断・治療・予防を目的としません。

以下に該当する方は使用を推奨しません：
 - 緑内障・網膜疾患の治療中の方
 - 強い光感受性てんかんの既往の方
 - 眼科で検査・治療を受けるべき症状（急な視力低下・視野欠損・飛蚊症の急増等）がある方

このアプリのトレーニングは、研究知見に基づいた知覚学習パラダイム（ガボールパッチ刺激）を採用していますが、効果には個人差があります。継続使用しても症状の改善を保証するものではありません。

異常を感じた場合は使用を中止し、医療機関にご相談ください。`;

export const DisclaimerScreen: React.FC<DisclaimerScreenProps> = ({
  visible,
  disclaimerAgreedAt,
  onClose,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  if (!visible) return null;
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
          accessibilityLabel="免責事項（再閲覧）"
          aria-modal
          role="dialog"
          aria-labelledby="disclaimer-review-title"
          testID="disclaimer-screen-v11"
        >
          <View style={styles.header}>
            <Text
              accessibilityRole="header"
              nativeID="disclaimer-review-title"
              style={[styles.title, { color: colors.fgPrimary }]}
            >
              免責事項
            </Text>
            <IconButton
              icon="close"
              ariaLabel="閉じる"
              onPress={onClose}
              testId="disclaimer-close"
            />
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            accessibilityLabel="免責事項本文"
          >
            <Text style={[styles.body, { color: colors.fgPrimary }]}>
              {DISCLAIMER_BODY}
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <Text
              style={[styles.agreedAt, { color: colors.fgSecondary }]}
              testID="disclaimer-agreed-at"
            >
              同意日 {disclaimerAgreedAt ? formatDate(disclaimerAgreedAt) : '―'}
            </Text>
            <Button
              variant="primary"
              size="lg"
              label="OK / 閉じる"
              onPress={onClose}
              fullWidth
              testId="disclaimer-ok"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
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
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    height: 64,
    paddingHorizontal: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.h3, // 26
    fontWeight: fontWeight.bold as '700',
  },
  bodyScroll: {
    maxHeight: 480,
  },
  bodyContent: {
    padding: spacing.s4,
  },
  body: {
    fontSize: fontSize.body, // 24
    lineHeight: fontSize.body * 1.6,
  },
  footer: {
    padding: spacing.s4,
    gap: spacing.s3,
  },
  agreedAt: {
    fontSize: fontSize.body,
  },
});
