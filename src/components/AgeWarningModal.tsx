/**
 * AgeWarningModal — screens.md S4-08 / spec.md A-9 / F-02。
 *
 * 70 代以上選択時に表示するモーダル。
 * - 「戻る」（secondary）：年齢層選択に戻る（onBack）
 * - 「理解した上で続ける」（primary）：選択を確定して次へ（onContinue）
 *
 * フォーカスは「戻る」（安全側、screens.md §10 a11y）。
 * 点滅・自動クローズなし（OPT-7 / NF-11）。
 */

import React from 'react';
import {
  Modal,
  Pressable,
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

export type AgeWarningModalProps = {
  isOpen: boolean;
  onContinue: () => void;
  onBack: () => void;
};

export const AgeWarningModal: React.FC<AgeWarningModalProps> = ({
  isOpen,
  onContinue,
  onBack,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent
      onRequestClose={onBack}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.backdrop}
        onPress={onBack}
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
          testID="age-warning-modal"
        >
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.semanticWarning }]}
          >
            ⚠ ご注意ください
          </Text>
          <Text style={[styles.body, { color: colors.fgPrimary }]}>
            本アプリは 70 歳以上の方のご利用を推奨していません。
          </Text>
          <Text style={[styles.body, { color: colors.fgPrimary }]}>
            視覚に関するお困りごとがある場合は、まず眼科医にご相談ください。
          </Text>
          <Text style={[styles.body, { color: colors.fgPrimary }]}>
            ご利用される場合は、無理せず目に違和感を感じたらすぐ中断してください。
          </Text>
          <View style={styles.actions}>
            <Button
              variant="secondary"
              size="lg"
              label="戻る"
              onPress={onBack}
              fullWidth
              testId="age-warning-back"
            />
            <View style={styles.spacer} />
            <Button
              variant="primary"
              size="lg"
              label="理解した上で続ける"
              onPress={onContinue}
              fullWidth
              testId="age-warning-continue"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

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
    padding: spacing.s5,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.s3,
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold as '700',
    marginBottom: spacing.s2,
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.6,
  },
  actions: {
    flexDirection: 'column',
    marginTop: spacing.s3,
  },
  spacer: {
    height: spacing.s3,
  },
});
