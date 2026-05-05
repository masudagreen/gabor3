/**
 * StaircaseDebugScreen — screens.md S1-05。
 *
 * 開発用：staircase の現在状態と試行履歴を表示する。
 * リリース時は `process.env.NODE_ENV === 'development'` で gating する想定。
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
  spacing,
} from '../theme/tokens';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import {
  StaircaseState,
  estimateThreshold,
} from '../lib/staircase';
import {
  TrialRecord,
  loadStaircase,
  loadTrials,
  resetStaircaseStorage,
} from '../state/storage';

export type StaircaseDebugScreenProps = {
  onBack: () => void;
};

export const StaircaseDebugScreen: React.FC<StaircaseDebugScreenProps> = ({
  onBack,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);

  const [state, setState] = React.useState<StaircaseState | null>(null);
  const [trials, setTrials] = React.useState<TrialRecord[]>([]);

  const refresh = React.useCallback(async () => {
    const [s, t] = await Promise.all([loadStaircase('game2'), loadTrials()]);
    setState(s);
    setTrials(t.filter((tr) => tr.gameId === 'game2').slice(-30));
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleReset = React.useCallback(async () => {
    await resetStaircaseStorage('game2');
    await refresh();
  }, [refresh]);

  const threshold = React.useMemo(() => {
    if (!state) return null;
    return estimateThreshold(
      trials.map((t) => ({
        paramValue: t.paramValue,
        outcome:
          t.isCorrect === null
            ? ('noResponse' as const)
            : t.isCorrect
              ? ('correct' as const)
              : ('incorrect' as const),
      })),
      state.currentParam,
    );
  }, [trials, state]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      <View style={styles.header}>
        <IconButton icon="back" ariaLabel="戻る" onPress={onBack} testId="debug-back" />
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.fgPrimary }]}
        >
          Staircase Debug
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.fgPrimary }]}>
          Game 2 状態
        </Text>
        {state ? (
          <View style={styles.kvBlock}>
            <KV label="currentParam" value={`${state.currentParam.toFixed(2)} °`} colors={colors} />
            <KV label="currentStep" value={`${state.currentStep.toFixed(2)}`} colors={colors} />
            <KV label="reversalCount" value={`${state.reversalCount}`} colors={colors} />
            <KV label="lastDirection" value={state.lastDirection} colors={colors} />
            <KV label="consecutiveCorrect" value={`${state.consecutiveCorrect}`} colors={colors} />
            <KV label="updatedAt" value={state.updatedAt} colors={colors} />
          </View>
        ) : (
          <Text style={{ color: colors.fgPrimary, fontSize: fontSize.body }}>読み込み中…</Text>
        )}

        <Text style={[styles.sectionTitle, { color: colors.fgPrimary, marginTop: spacing.s5 }]}>
          推定閾値（最終 6 reversal 平均、なければ最終値）
        </Text>
        <Text style={[styles.threshold, { color: colors.fgPrimary }]}>
          {threshold !== null ? `${threshold.toFixed(2)} °` : '—'}
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.fgPrimary, marginTop: spacing.s5 }]}>
          Trial History (最新 {trials.length})
        </Text>
        <View style={[styles.historyBox, { borderColor: colors.borderDefault }]}>
          {trials.length === 0 ? (
            <Text style={[styles.historyEmpty, { color: colors.fgMuted }]}>履歴なし</Text>
          ) : (
            trials.map((t, idx) => {
              const result =
                t.isCorrect === null
                  ? 'noResponse'
                  : t.isCorrect
                    ? 'correct'
                    : 'incorrect';
              return (
                <Text
                  key={t.trialId}
                  style={[styles.historyItem, { color: colors.fgPrimary }]}
                >
                  #{idx + 1}  param={t.paramValue.toFixed(1)}  ans={result}
                </Text>
              );
            })
          )}
        </View>

        <View style={{ height: spacing.s5 }} />

        <Button
          variant="destructive"
          size="md"
          label="Reset staircase"
          onPress={handleReset}
          fullWidth
          testId="debug-reset"
        />
      </ScrollView>
    </View>
  );
};

const KV: React.FC<{ label: string; value: string; colors: ReturnType<typeof getColors> }> = ({
  label,
  value,
  colors,
}) => (
  <View style={styles.kv}>
    <Text style={[styles.kvLabel, { color: colors.fgSecondary }]}>{label}:</Text>
    <Text style={[styles.kvValue, { color: colors.fgPrimary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s4,
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold as '700',
  },
  content: {
    padding: spacing.s4,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold as '700',
    marginBottom: spacing.s3,
  },
  kvBlock: {
    gap: spacing.s2,
  },
  kv: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s3,
  },
  kvLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium as '600',
  },
  kvValue: {
    fontSize: fontSize.body,
    fontVariant: ['tabular-nums'],
  },
  threshold: {
    fontSize: fontSize.numericL,
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
  },
  historyBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.s3,
    minHeight: 80,
    gap: 4,
  },
  historyItem: {
    fontSize: fontSize.body,
    fontVariant: ['tabular-nums'],
  },
  historyEmpty: {
    fontSize: fontSize.body,
    textAlign: 'center',
  },
});
