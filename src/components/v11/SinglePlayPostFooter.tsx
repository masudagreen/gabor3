/**
 * SinglePlayPostFooter — FT-1（components.md §22）。
 *
 * 単体プレイ後の 3 択フッター。F-06 の受け入れ基準「単体プレイ後はゲーム一覧に
 * 戻る／同じゲームをもう一度／ホームへ の 3 択」を全 13 ゲーム共通で担保する。
 *
 * CTA 順序：
 *   1. もう一度（Primary、最も主要）
 *   2. ゲーム一覧へ戻る（Secondary）
 *   3. ホームへ（Tertiary、下線）
 *
 * 配置：ResultSummaryV11 の isCourseMode=false のときに自動描画される。
 */

import React from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { getColors, spacing } from '../../theme/tokens';
import { Button } from '../Button';

export type SinglePlayPostFooterProps = {
  onPlayAgain?: () => void;
  onBackToList?: () => void;
  onGoHome?: () => void;
  /** SR aria-label 用、省略可 */
  gameNameJa?: string;
  testId?: string;
};

export const SinglePlayPostFooter: React.FC<SinglePlayPostFooterProps> = ({
  onPlayAgain,
  onBackToList,
  onGoHome,
  gameNameJa,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  return (
    <View
      style={[
        styles.container,
        { borderTopColor: colors.borderDefault },
      ]}
      accessibilityRole="none"
      accessibilityLabel="単体プレイ後のアクション選択"
      testID={testId ?? 'single-play-post-footer'}
    >
      {onPlayAgain ? (
        <Button
          variant="primary"
          size="lg"
          label="同じゲームをもう一度"
          ariaLabel={
            gameNameJa
              ? `${gameNameJa} をもう一度プレイする`
              : '同じゲームをもう一度プレイする'
          }
          onPress={onPlayAgain}
          fullWidth
          testId="single-play-post-play-again"
        />
      ) : null}
      {onPlayAgain && (onBackToList || onGoHome) ? (
        <View style={styles.gap} />
      ) : null}
      {onBackToList ? (
        <Button
          variant="secondary"
          size="lg"
          label="ゲーム一覧へ戻る"
          ariaLabel="ゲーム一覧へ戻る"
          onPress={onBackToList}
          fullWidth
          testId="single-play-post-back-to-list"
        />
      ) : null}
      {onBackToList && onGoHome ? <View style={styles.gap} /> : null}
      {onGoHome ? (
        <Button
          variant="tertiary"
          size="lg"
          label="ホームへ"
          ariaLabel="ホームへ戻る"
          onPress={onGoHome}
          fullWidth
          testId="single-play-post-go-home"
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingTop: spacing.s4,
    marginTop: spacing.s4,
    borderTopWidth: 1,
    flexDirection: 'column',
  },
  gap: {
    height: spacing.s2,
  },
});
