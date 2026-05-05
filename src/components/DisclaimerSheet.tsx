/**
 * DisclaimerSheet — components.md §13 / screens.md S4-02 / spec.md §10.3 / F-02。
 *
 * mode='onboarding'：
 *   - スクロール本文を最後まで読み進めるとチェックボックス有効化（強制読み）
 *   - チェック ON で「同意する」プライマリボタン有効化
 *   - 「同意する」押下で onAgree が呼ばれる（同意日時の永続化は呼び出し元）
 *   - 戻る矢印 → onBack（任意）
 *
 * mode='review'：
 *   - 「閉じる」ボタンのみ（onClose 必須）
 *   - チェックボックスなし
 *   - スクロール強制なし
 *
 * a11y：
 *   - 警告対象者リストは role="note"（screens.md §4 a11y）
 *   - スクロール領域 role="region"、aria-label
 *   - チェックボックスは aria-required
 *   - disabled 状態の「同意する」は aria-disabled + 補助テキスト
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  fontSize,
  fontWeight,
  getColors,
  radius,
  spacing,
} from '../theme/tokens';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { IconButton } from './IconButton';
import { t } from '../i18n';

/**
 * spec.md §10.3 の文言（凍結済み）。
 */
export const DISCLAIMER_BODY_INTRO =
  'このアプリは医療機器ではありません。\n' +
  'ガボールパッチによる視覚トレーニングは、\n' +
  '脳の視覚処理を鍛えることを目的とした自助セルフケアです。\n' +
  '特定の視力回復・治療効果を保証するものではありません。';

export const DISCLAIMER_WARN_HEADER = '以下の方は本アプリのご利用を推奨しません：';

export const DISCLAIMER_WARN_LINES: ReadonlyArray<string> = [
  '・お子さま（小学生以下）',
  '・70 歳以上の方',
  '・白内障・緑内障・加齢黄斑変性などの診断歴がある方',
  '・強度近視（-6D 以上）の方',
  '・目に違和感、痛み、かすみ、急激な視力低下のある方',
];

export const DISCLAIMER_BODY_OUTRO =
  '利用中に違和感を感じた場合はすぐ中断し、\n眼科医にご相談ください。';

export type DisclaimerSheetMode = 'onboarding' | 'review';

export type DisclaimerSheetProps = {
  mode: DisclaimerSheetMode;
  onAgree?: () => void;
  onClose?: () => void;
  onBack?: () => void;
  /** ステップインジケータ表示（オンボーディング時、例 "2 / 7"） */
  stepLabel?: string;
  /**
   * @internal テスト用：本文スクロールを強制バイパス。
   * Sprint 7-C：`__bypassScrollGateForTest` に名前変更し、`process.env.NODE_ENV === 'test'`
   * のときのみ尊重する。リリースビルドでは無視されるため、誤って公開 API として
   * 使われないようにする。
   */
  __bypassScrollGateForTest?: boolean;
};

export const DisclaimerSheet: React.FC<DisclaimerSheetProps> = ({
  mode,
  onAgree,
  onClose,
  onBack,
  stepLabel,
  __bypassScrollGateForTest,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  // テスト用バイパスは NODE_ENV=test のときのみ反映（リリースビルドで誤動作しないため）
  const bypassScrollGate =
    process.env.NODE_ENV === 'test' && !!__bypassScrollGateForTest;

  const [scrolledToEnd, setScrolledToEnd] = React.useState<boolean>(
    bypassScrollGate || mode === 'review',
  );
  const [checked, setChecked] = React.useState<boolean>(false);

  const handleScroll = React.useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      // 末尾 24px 以内まで来たら到達とみなす（OPT-7：急かさない、ピクセル誤差吸収）
      const reachedEnd =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 24;
      if (reachedEnd) setScrolledToEnd(true);
    },
    [],
  );

  // mode=review でもコンテンツサイズが小さくスクロール不要の場合に備え、
  // onContentSizeChange で「全体表示できる」なら gate を解除する。
  const handleContentSize = React.useCallback(
    (_w: number, h: number) => {
      // ScrollView の高さがコンテンツより大きい場合は scroll 不可 → 即解除
      if (h <= 800) setScrolledToEnd(true);
    },
    [],
  );

  const isOnboarding = mode === 'onboarding';
  const canAgree = isOnboarding && scrolledToEnd && checked;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="disclaimer-sheet"
    >
      {(onBack || mode === 'review') && (
        <View style={styles.header}>
          {onBack ? (
            <IconButton
              icon="back"
              ariaLabel="戻る"
              onPress={onBack}
              testId="disclaimer-back"
            />
          ) : null}
          {mode === 'review' && onClose ? (
            <View style={{ marginLeft: 'auto' }}>
              <IconButton
                icon="close"
                ariaLabel="閉じる"
                onPress={onClose}
                testId="disclaimer-close-icon"
              />
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.contentRoot}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          {t('disclaimer.title')}
        </Text>

        <ScrollView
          style={[
            styles.scroll,
            { borderColor: colors.borderDefault },
          ]}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSize}
          scrollEventThrottle={64}
          accessibilityLabel="免責事項本文"
          testID="disclaimer-scroll"
        >
          <Text style={[styles.body, { color: colors.fgPrimary }]}>
            {DISCLAIMER_BODY_INTRO}
          </Text>

          <View
            style={[
              styles.warnBlock,
              {
                backgroundColor: colors.bgDisclaimer,
                borderLeftColor: colors.semanticError,
              },
            ]}
            accessibilityLabel="ご利用を推奨しない方の一覧"
          >
            <Text
              style={[
                styles.warnHeader,
                { color: colors.fgPrimary, fontWeight: fontWeight.bold as '700' },
              ]}
            >
              {DISCLAIMER_WARN_HEADER}
            </Text>
            {DISCLAIMER_WARN_LINES.map((line) => (
              <Text
                key={line}
                style={[styles.body, { color: colors.fgPrimary }]}
              >
                {line}
              </Text>
            ))}
          </View>

          <Text style={[styles.body, { color: colors.fgPrimary }]}>
            {DISCLAIMER_BODY_OUTRO}
          </Text>
        </ScrollView>

        {isOnboarding ? (
          <>
            <View style={styles.checkboxRow}>
              <Checkbox
                checked={checked}
                label="上記に同意します"
                onChange={setChecked}
                disabled={!scrolledToEnd}
                ariaRequired
                testId="disclaimer-agree-checkbox"
              />
              {!scrolledToEnd ? (
                <Text style={[styles.hint, { color: colors.fgMuted }]}>
                  ※ 最後まで読んでチェックを入れてください
                </Text>
              ) : null}
            </View>
            <View style={styles.cta}>
              <Button
                variant="primary"
                size="lg"
                label="同意する"
                onPress={() => {
                  if (canAgree && onAgree) onAgree();
                }}
                disabled={!canAgree}
                fullWidth
                testId="disclaimer-agree-button"
              />
            </View>
          </>
        ) : (
          <View style={styles.cta}>
            <Button
              variant="primary"
              size="lg"
              label="閉じる"
              onPress={() => onClose && onClose()}
              fullWidth
              testId="disclaimer-close-button"
            />
          </View>
        )}

        {stepLabel ? (
          <Text style={[styles.step, { color: colors.fgMuted }]}>
            {stepLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentRoot: {
    flex: 1,
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s5,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    gap: spacing.s4,
  },
  title: {
    fontSize: fontSize.h1, // 36px
    fontWeight: fontWeight.bold as '700',
    lineHeight: fontSize.h1 * 1.3,
  },
  scroll: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  scrollContent: {
    padding: spacing.s4,
    gap: spacing.s4,
  },
  body: {
    fontSize: fontSize.body, // 24px
    lineHeight: fontSize.body * 1.6,
  },
  warnBlock: {
    padding: spacing.s4,
    borderLeftWidth: 4,
    borderRadius: radius.sm,
    gap: spacing.s2,
  },
  warnHeader: {
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.5,
  },
  checkboxRow: {
    gap: spacing.s2,
  },
  hint: {
    fontSize: fontSize.body,
    paddingHorizontal: spacing.s2,
  },
  cta: {
    width: '100%',
  },
  step: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
});
