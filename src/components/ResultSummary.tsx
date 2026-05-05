/**
 * ResultSummary — Sprint 5 完成版（components.md §21、screens.md S5-01）。
 *
 * 拡張点：
 *   - 前回比 diff（improved / worse / flat / first）の表示
 *   - 未挑戦時のレイアウト（screens.md S5-01 §3）
 *   - sessionType による自動進行カウントダウンの有無（§3.1）
 *   - 「次へ」押下時の遷移先は呼び出し側で sessionType に応じて分岐
 *
 * Sprint 1 から既存：
 *   - primary / secondary メトリクスカード
 *   - 戻るボタン
 *
 * 既存ユーザー（CourseScreen / AppRouter）は引き続き primary を渡す。
 * `unattempted=true` の場合は primary / secondary / diff は描画しない。
 *
 * 自動進行（コースモードのみ）は内部 setInterval で countdown を減算し、
 * 0 で onNext を呼ぶ。reduce-motion 環境でもカウントダウンは進む（情報のため）。
 */

import React from 'react';
import {
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

export type ResultMetric = {
  label: string;
  value: string;
  unit?: string;
};

export type ResultDiff = {
  /** 表示テキスト（例：「↓ 前回より 0.3 度改善」） */
  text: string;
  /** 改善ならアクセント色（success）、それ以外は muted */
  direction: 'improved' | 'worse' | 'flat' | 'first';
};

export type SessionType = 'course' | 'single';

export type ResultSummaryProps = {
  gameName: string;
  primary: ResultMetric;
  secondary?: ResultMetric[];
  /** 前回比（任意） */
  diff?: ResultDiff;
  /** 未挑戦かどうか。true の場合は閾値カード・diff を表示せず、未挑戦レイアウトに切り替える */
  unattempted?: boolean;
  /** 未挑戦時の説明文（例：「タップせずに時間切れになりました」） */
  unattemptedReason?: string;
  /** コース時のみカウントダウン表示・自動進行。'course' / 'single'。デフォルト 'single'（自動進行なし） */
  sessionType?: SessionType;
  /** カウントダウン秒数（コース時のみ。デフォルト 10） */
  countdownSeconds?: number;
  onNext: () => void;
  onBack: () => void;
  notes?: string[];
};

export const ResultSummary: React.FC<ResultSummaryProps> = ({
  gameName,
  primary,
  secondary,
  diff,
  unattempted = false,
  unattemptedReason,
  sessionType = 'single',
  countdownSeconds = 10,
  onNext,
  onBack,
  notes,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  // コースモードのみカウントダウン → 自動進行
  const [remaining, setRemaining] = React.useState<number>(countdownSeconds);
  const onNextRef = React.useRef(onNext);
  React.useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);
  React.useEffect(() => {
    if (sessionType !== 'course') return;
    setRemaining(countdownSeconds);
    const id = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(id);
          onNextRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sessionType, countdownSeconds]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="戻る"
          onPress={onBack}
          testId="result-back"
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.gameName, { color: colors.fgPrimary }]}
        >
          {gameName}
        </Text>
        <Text style={[styles.subtitle, { color: colors.fgPrimary }]}>結果</Text>

        {unattempted ? (
          <UnattemptedBlock
            colors={colors}
            reason={unattemptedReason}
          />
        ) : (
          <>
            <View
              style={[
                styles.primaryCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderDefault,
                },
              ]}
              testID="result-primary-card"
            >
              <Text
                style={[styles.primaryValue, { color: colors.fgPrimary }]}
                accessibilityLabel={`${primary.label} ${primary.value}${primary.unit ?? ''}`}
              >
                {primary.value}
                {primary.unit ? (
                  <Text style={styles.unit}> {primary.unit}</Text>
                ) : null}
              </Text>
              <Text style={[styles.primaryLabel, { color: colors.fgPrimary }]}>
                {primary.label}
              </Text>
            </View>

            {diff ? (
              <Text
                testID="result-diff"
                style={[
                  styles.diff,
                  {
                    color:
                      diff.direction === 'improved'
                        ? colors.semanticSuccess
                        : colors.fgSecondary,
                  },
                ]}
                accessibilityLabel={diff.text}
              >
                {diff.text}
              </Text>
            ) : null}

            {secondary && secondary.length > 0 ? (
              <View style={styles.secondaryRow}>
                {secondary.map((m) => (
                  <View
                    key={m.label}
                    style={[
                      styles.secondaryCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.borderDefault,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryValue,
                        { color: colors.fgPrimary },
                      ]}
                    >
                      {m.value}
                      {m.unit ? (
                        <Text style={styles.secondaryUnit}> {m.unit}</Text>
                      ) : null}
                    </Text>
                    <Text
                      style={[
                        styles.secondaryLabel,
                        { color: colors.fgPrimary },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}

        {notes?.map((n) => (
          <Text key={n} style={[styles.note, { color: colors.fgMuted }]}>
            {n}
          </Text>
        ))}

        <View style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            label="次へ"
            onPress={onNext}
            fullWidth
            testId="result-next"
          />
        </View>

        {sessionType === 'course' ? (
          <Text
            testID="result-countdown"
            accessibilityLiveRegion={remaining <= 5 ? 'polite' : 'none'}
            style={[styles.countdown, { color: colors.fgSecondary }]}
          >
            あと {remaining} 秒で次のゲームへ
          </Text>
        ) : (
          // レイアウトシフト防止：高さだけ予約
          <View testID="result-no-countdown" style={styles.countdownPlaceholder} />
        )}
      </ScrollView>
    </View>
  );
};

const UnattemptedBlock: React.FC<{
  colors: ReturnType<typeof getColors>;
  reason?: string;
}> = ({ colors, reason }) => (
  <>
    <View
      style={[
        styles.primaryCard,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderDefault,
        },
      ]}
      testID="result-unattempted-card"
    >
      <Text
        accessibilityLabel="未挑戦"
        style={[styles.unattemptedLabel, { color: colors.fgSecondary }]}
      >
        未挑戦
      </Text>
    </View>
    {reason ? (
      <Text style={[styles.unattemptedReason, { color: colors.fgSecondary }]}>
        {reason}
      </Text>
    ) : null}
    <Text style={[styles.unattemptedNote, { color: colors.fgMuted }]}>
      この回はスコアに記録されません
    </Text>
  </>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
  },
  content: {
    padding: spacing.s4,
    alignItems: 'center',
    gap: spacing.s5,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  gameName: {
    fontSize: fontSize.h2, // 30px
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.h3, // 26px
    fontWeight: fontWeight.medium as '600',
  },
  primaryCard: {
    width: '100%',
    maxWidth: 480,
    padding: spacing.s6,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  primaryValue: {
    fontSize: fontSize.numericL, // 48px
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold as '700',
  },
  primaryLabel: {
    fontSize: fontSize.bodyLg, // 26px
    marginTop: spacing.s3,
  },
  diff: {
    fontSize: fontSize.bodyLg, // 26px、24px 床以上
    fontWeight: fontWeight.bold as '700',
    textAlign: 'center',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.s4,
    width: '100%',
    maxWidth: 480,
  },
  secondaryCard: {
    flex: 1,
    padding: spacing.s4,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryValue: {
    fontSize: fontSize.h2, // 30px Bold
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  secondaryUnit: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
  },
  secondaryLabel: {
    fontSize: fontSize.body,
    marginTop: spacing.s2,
  },
  note: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  cta: {
    width: '100%',
    maxWidth: 480,
  },
  countdown: {
    fontSize: fontSize.body, // 24px
    textAlign: 'center',
    minHeight: 24,
  },
  countdownPlaceholder: {
    height: 24, // レイアウトシフト防止
  },
  unattemptedLabel: {
    fontSize: fontSize.h1, // 32px 相当（h1=36px、screens.md は 32pt 指定だが系内最も近い）
    fontWeight: fontWeight.bold as '700',
  },
  unattemptedReason: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
  unattemptedNote: {
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
});
