/**
 * DataDeletionConfirmModal — screens.md S7-04 + S7-05 / spec.md F-15 / §10.2。
 *
 * 2 段階確認の全データ削除モーダル。
 *
 * 段階 1（確認）：
 *   - 削除されるものの一覧
 *   - 「キャンセル」「次へ進む」の 2 ボタン
 *   - 「次へ進む」で段階 2 へ
 *
 * 段階 2（テキスト入力）：
 *   - 「削除」と入力するまで Confirm ボタンが disabled
 *   - 「キャンセル」で段階 1 に戻る
 *   - 「削除」で onConfirm()
 *
 * 仕様：
 *   - F-15「2 段階確認（タップ → 確認ダイアログ → 「削除」入力）」
 *   - confirmation phrase は「削除」で完全一致
 */

import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { useEscapeKey } from '../lib/keyboardShortcuts';

export type DataDeletionConfirmModalProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  testId?: string;
};

const CONFIRMATION_PHRASE = '削除';

export const DataDeletionConfirmModal: React.FC<DataDeletionConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  testId,
}) => {
  const { colors } = useTheme();
  const [phase, setPhase] = React.useState<1 | 2>(1);
  const [phrase, setPhrase] = React.useState<string>('');

  // モーダルが開かれるたびに state を初期化
  React.useEffect(() => {
    if (isOpen) {
      setPhase(1);
      setPhrase('');
    }
  }, [isOpen]);

  const canConfirm = phrase.trim() === CONFIRMATION_PHRASE;

  const handleCancel = () => {
    setPhase(1);
    setPhrase('');
    onCancel();
  };

  // Esc キーでモーダル閉じる（Web 専用）
  useEscapeKey({ onEscape: handleCancel, enabled: isOpen });

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent
      onRequestClose={handleCancel}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.backdrop}
        onPress={handleCancel}
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
          testID={testId ?? 'data-deletion-modal'}
        >
          {phase === 1 ? (
            <Phase1
              colors={colors}
              onCancel={handleCancel}
              onProceed={() => setPhase(2)}
            />
          ) : (
            <Phase2
              colors={colors}
              phrase={phrase}
              setPhrase={setPhrase}
              canConfirm={canConfirm}
              onCancel={handleCancel}
              onConfirm={onConfirm}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const Phase1: React.FC<{
  colors: ReturnType<typeof import('../theme/tokens').getColors>;
  onCancel: () => void;
  onProceed: () => void;
}> = ({ colors, onCancel, onProceed }) => (
  <>
    <Text
      accessibilityRole="header"
      style={[styles.title, { color: colors.semanticError }]}
    >
      ⚠ すべての記録を削除しますか？
    </Text>
    <Text style={[styles.body, { color: colors.fgPrimary }]}>削除されるもの：</Text>
    <View style={styles.list}>
      {[
        '・セッション履歴',
        '・難易度（staircase）の状態',
        '・バッジ獲得状況',
        '・連続日数（ストリーク）',
        '・設定',
      ].map((line) => (
        <Text key={line} style={[styles.body, { color: colors.fgPrimary }]}>
          {line}
        </Text>
      ))}
    </View>
    <Text
      style={[
        styles.body,
        {
          color: colors.fgPrimary,
          fontWeight: fontWeight.bold as '700',
        },
      ]}
    >
      この操作は取り消せません。
    </Text>
    <View style={styles.actions}>
      <Button
        variant="secondary"
        size="md"
        label="キャンセル"
        onPress={onCancel}
        fullWidth
        testId="data-deletion-cancel-1"
      />
      <View style={styles.spacer} />
      <Button
        variant="destructive"
        size="md"
        label="次へ進む"
        onPress={onProceed}
        fullWidth
        testId="data-deletion-proceed"
      />
    </View>
  </>
);

const Phase2: React.FC<{
  colors: ReturnType<typeof import('../theme/tokens').getColors>;
  phrase: string;
  setPhrase: (v: string) => void;
  canConfirm: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ colors, phrase, setPhrase, canConfirm, onCancel, onConfirm }) => (
  <>
    <Text
      accessibilityRole="header"
      style={[styles.title, { color: colors.fgPrimary }]}
    >
      最終確認
    </Text>
    <Text style={[styles.body, { color: colors.fgPrimary }]}>
      削除を確定するには{'\n'}下の欄に「{CONFIRMATION_PHRASE}」と{'\n'}入力してください。
    </Text>
    <TextInput
      value={phrase}
      onChangeText={setPhrase}
      placeholder="削除"
      placeholderTextColor={colors.fgMuted}
      accessibilityLabel="確認のため『削除』と入力"
      accessibilityHint="『削除』と入力するとボタンが有効になります"
      style={[
        styles.input,
        {
          color: colors.fgPrimary,
          borderColor: canConfirm ? colors.actionPrimary : colors.borderInput,
          backgroundColor: colors.bgSurfaceRaised,
        },
      ]}
      testID="data-deletion-input"
      autoCapitalize="none"
      autoCorrect={false}
    />
    <View style={styles.actions}>
      <Button
        variant="secondary"
        size="md"
        label="キャンセル"
        onPress={onCancel}
        fullWidth
        testId="data-deletion-cancel-2"
      />
      <View style={styles.spacer} />
      <Button
        variant="destructive"
        size="md"
        label="削除"
        onPress={() => {
          if (canConfirm) onConfirm();
        }}
        disabled={!canConfirm}
        fullWidth
        testId="data-deletion-confirm"
      />
    </View>
  </>
);

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
    fontSize: fontSize.h3, // 26
    fontWeight: fontWeight.bold as '700',
  },
  body: {
    fontSize: fontSize.body, // 24
    lineHeight: fontSize.body * 1.5,
  },
  list: {
    paddingLeft: spacing.s2,
    gap: 2,
  },
  input: {
    minHeight: 56,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.s4,
    fontSize: fontSize.body,
  },
  actions: {
    flexDirection: 'column',
    marginTop: spacing.s3,
  },
  spacer: {
    height: spacing.s3,
  },
});
