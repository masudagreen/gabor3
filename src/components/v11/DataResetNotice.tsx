/**
 * DataResetNotice — F-17（spec-v11.md §F-17）。
 * components.md §14 / sprints/sprint-8/screens.md §2。
 *
 * v1 由来データを消去した直後に 1 度だけ表示するモーダル風通知。
 * - title「最新版へのアップデート」
 * - 本文：データリセット完了 + 設定再入力のお願い
 * - OK ボタン（56pt 以上）でユーザーが進める
 *
 * 表示判定（フラグ管理）は呼び出し元（AppRouterV11）が担当。本コンポーネント
 * は「表示する」「OK で進む」のみを責務とする。
 */

import React from 'react';
import {
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
} from '../../theme/tokens';
import { Button } from '../Button';
import { getReleaseEnabledGameCount } from '../../lib/v11/releaseFilter';

export type DataResetNoticeProps = {
  onAcknowledge: () => void;
};

export const DataResetNotice: React.FC<DataResetNoticeProps> = ({
  onAcknowledge,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const enabledCount = getReleaseEnabledGameCount();

  return (
    <View
      style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
      testID="data-reset-notice"
      accessibilityViewIsModal
      // 真の Modal にしないのは、Web レスポンシブで position:fixed と相性が
      // 微妙になるため（v1 ConfirmDialog と同じ「擬似モーダル」方式）。
    >
      <View
        style={[
          styles.dialog,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderDefault,
          },
        ]}
      >
        <Text
          accessibilityRole="header"
          nativeID="data-reset-title"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          最新版へのアップデート
        </Text>

        <Text
          style={[styles.body, { color: colors.fgPrimary }]}
          accessibilityRole="text"
        >
          より良いトレーニングのため、過去のデータをリセットしました。
          新しい {enabledCount} ゲームをお楽しみください。
        </Text>

        <Text
          style={[styles.note, { color: colors.fgMuted }]}
          accessibilityRole="text"
        >
          ※ 視聴距離・年齢層・免責同意は新たに設定し直していただきます
        </Text>

        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="OK"
            onPress={onAcknowledge}
            fullWidth
            testId="data-reset-notice-ok"
            ariaLabel="OK ボタン。データリセットを確認しました"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    gap: spacing.s4,
  },
  title: {
    fontSize: fontSize.h3, // 26
    fontWeight: fontWeight.bold as '700',
  },
  body: {
    fontSize: fontSize.body, // 24
    lineHeight: fontSize.body * 1.6,
  },
  note: {
    fontSize: fontSize.body, // 24
    lineHeight: fontSize.body * 1.5,
  },
  cta: {
    width: '100%',
  },
});
