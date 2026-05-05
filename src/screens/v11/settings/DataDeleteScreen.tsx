/**
 * DataDeleteScreen — S19-06（design-v11/sprints/sprint-19/screens.md §7）。
 *
 * 全データ削除画面（2 段階確認）。spec-v11.md §F-14 受け入れ基準：
 *   - 「全データ削除」は 2 段階確認（タップ → 確認ダイアログ → 「削除」入力）で実行される
 *
 * 実装：
 *   - stage='intent'：意図確認 ConfirmDialog（キャンセル / 次へ進む）
 *   - stage='final'：「削除」テキスト入力 + キャンセル / 削除する（destructive、入力一致時のみ enable）
 *
 * a11y：
 *   - role="dialog", aria-modal="true"
 *   - 入力欄 role="textbox", aria-label="削除と入力"
 */

import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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

export type DataDeleteScreenProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

type Stage = 'intent' | 'final';

export const DataDeleteScreen: React.FC<DataDeleteScreenProps> = ({
  visible,
  onCancel,
  onConfirm,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [stage, setStage] = React.useState<Stage>('intent');
  const [confirmText, setConfirmText] = React.useState('');

  // visible が true→false（閉じた）または再度開いたら状態をリセット
  React.useEffect(() => {
    if (!visible) {
      setStage('intent');
      setConfirmText('');
    }
  }, [visible]);

  const handleCancel = () => {
    setStage('intent');
    setConfirmText('');
    onCancel();
  };

  const handleConfirm = () => {
    setStage('intent');
    setConfirmText('');
    onConfirm();
  };

  const matchOk = confirmText.trim() === '削除';

  return (
    <Modal
      visible={visible}
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
          aria-modal
          role="dialog"
          aria-labelledby={
            stage === 'intent' ? 'data-delete-title' : 'data-delete-final-title'
          }
          testID="data-delete-screen"
        >
          {stage === 'intent' ? (
            <>
              <Text
                accessibilityRole="header"
                nativeID="data-delete-title"
                style={[styles.title, { color: colors.fgPrimary }]}
              >
                全データを削除しますか？
              </Text>
              <Text style={[styles.message, { color: colors.fgPrimary }]}>
                本当に削除すると、進捗・ストリーク・バッジ・設定がすべて消えます。この操作は取り消せません。
              </Text>
              <View style={styles.actions}>
                <Button
                  variant="secondary"
                  size="lg"
                  label="キャンセル"
                  onPress={handleCancel}
                  fullWidth
                  testId="data-delete-cancel-1"
                />
                <View style={styles.spacer} />
                <Button
                  variant="destructive"
                  size="lg"
                  label="次へ進む"
                  onPress={() => setStage('final')}
                  fullWidth
                  testId="data-delete-next"
                />
              </View>
            </>
          ) : (
            <>
              <Text
                accessibilityRole="header"
                nativeID="data-delete-final-title"
                style={[styles.title, { color: colors.fgPrimary }]}
              >
                最終確認
              </Text>
              <Text style={[styles.message, { color: colors.fgPrimary }]}>
                下のフィールドに「削除」と入力してください。
              </Text>
              <TextInput
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="削除"
                placeholderTextColor={colors.fgMuted}
                accessibilityLabel="削除と入力"
                style={[
                  styles.input,
                  {
                    color: colors.fgPrimary,
                    borderColor: matchOk
                      ? colors.semanticSuccess
                      : colors.borderDefault,
                    backgroundColor: colors.bgSurface,
                  },
                ]}
                testID="data-delete-input"
              />
              <View style={styles.actions}>
                <Button
                  variant="secondary"
                  size="lg"
                  label="キャンセル"
                  onPress={handleCancel}
                  fullWidth
                  testId="data-delete-cancel-2"
                />
                <View style={styles.spacer} />
                <Button
                  variant="destructive"
                  size="lg"
                  label="削除する"
                  onPress={handleConfirm}
                  disabled={!matchOk}
                  fullWidth
                  testId="data-delete-confirm"
                />
              </View>
            </>
          )}
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
  },
  title: {
    fontSize: fontSize.h3, // 26
    fontWeight: fontWeight.bold as '700',
    marginBottom: spacing.s3,
  },
  message: {
    fontSize: fontSize.body, // 24
    lineHeight: fontSize.body * 1.6,
    marginBottom: spacing.s4,
  },
  input: {
    minHeight: 56,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.s4,
    fontSize: fontSize.body,
    marginBottom: spacing.s4,
  },
  actions: {
    flexDirection: 'column',
  },
  spacer: {
    height: spacing.s3,
  },
});
