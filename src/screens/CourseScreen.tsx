/**
 * CourseScreen — おまかせコース状態機（screens.md S2-02 〜 S5-04）。
 *
 * Sprint 5 拡張：
 *   - 各 ResultSummary で「前回比 diff」を表示（前日 DailyStats と比較）
 *   - 各 ResultSummary は sessionType="course" でカウントダウン自動進行
 *   - Game 3 終了 → CooldownScreen → SessionCompleteScreen → ホーム
 *   - SessionCompleteScreen に V1 スコア + 前回比を渡す
 *   - DailyStats を upsert（その日のベスト閾値・V1 スコア）
 *
 * 内部フェーズ：
 *   reminder → game1 → result1 → game2 → result2 → game3 → result3
 *     → cooldown → complete
 */

import React from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { getColors } from '../theme/tokens';
import { DistanceReminder } from '../components/DistanceReminder';
import { ResultSummary, ResultDiff } from '../components/ResultSummary';
import { Game1Screen, Game1Result } from './Game1Screen';
import { Game2Screen, Game2Result } from './Game2Screen';
import { Game3Screen, Game3Result } from './Game3Screen';
import { SessionCompleteScreen } from './SessionCompleteScreen';
import { CooldownScreen } from './CooldownScreen';
import {
  appendSession,
  appendTrials,
  BadgeId,
  createDefaultBadgeStatuses,
  createDefaultStreak,
  DailyStats,
  getTotalTrialCount,
  loadAllDailyStats,
  loadBadgeStatuses,
  loadStreak,
  saveBadgeStatuses,
  saveStreak,
  TrialRecord,
  upsertDailyStats,
} from '../state/storage';
import { computeV1Score, computeThresholdDiff } from '../lib/v1score';
import { formatDateLocal } from '../lib/weeklyStats';
import { applyCourseCompletion } from '../lib/streak';
import { evaluateBadges } from '../lib/badges';

export type CourseScreenProps = {
  distanceCm: 30 | 40 | 50;
  onAbort: () => void;
  onComplete: () => void;
  /** 進捗グラフへ遷移 */
  onOpenProgress?: () => void;
};

type Phase =
  | 'reminder'
  | 'game1'
  | 'result1'
  | 'game2'
  | 'result2'
  | 'game3'
  | 'result3'
  | 'cooldown'
  | 'complete';

export const CourseScreen: React.FC<CourseScreenProps> = ({
  distanceCm,
  onAbort,
  onComplete,
  onOpenProgress,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const [phase, setPhase] = React.useState<Phase>('reminder');
  const [game1Result, setGame1Result] = React.useState<Game1Result | null>(null);
  const [game2Result, setGame2Result] = React.useState<Game2Result | null>(null);
  const [game3Result, setGame3Result] = React.useState<Game3Result | null>(null);
  const startedAtRef = React.useRef<string>(new Date().toISOString());
  const [previousStats, setPreviousStats] = React.useState<DailyStats[]>([]);
  const [streakAfter, setStreakAfter] = React.useState<number>(0);
  const [newlyEarnedBadges, setNewlyEarnedBadges] = React.useState<BadgeId[]>(
    [],
  );

  // 起動時に過去 DailyStats を読み込む（前回比計算用、レンダリングをブロックしない）
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await loadAllDailyStats();
      if (!cancelled) setPreviousStats(all);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 直近過去日（今日を除く最新日）の DailyStats を取得
  const todayDate = formatDateLocal(new Date());
  const previousDay: DailyStats | undefined = React.useMemo(() => {
    const past = previousStats
      .filter((s) => s.date < todayDate)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return past[0];
  }, [previousStats, todayDate]);

  const persistSession = React.useCallback(
    async (g1: Game1Result, g2: Game2Result, g3: Game3Result) => {
      const sessionId = `course-${Date.now()}`;
      const now = new Date().toISOString();
      const v1 = computeV1Score(g1.thresholdDeg, g2.thresholdDeg, g3.thresholdDeg);
      const courseTrialCount =
        (g1.unattempted ? 0 : 1) + g2.trialCount + g3.trialCount;
      try {
        await appendSession({
          sessionId,
          sessionType: 'course',
          startedAt: startedAtRef.current,
          completedAt: now,
          game1Threshold: g1.thresholdDeg,
          game2Threshold: g2.thresholdDeg,
          game3Threshold: g3.thresholdDeg,
          v1Score: v1,
          trialCount: courseTrialCount,
        });
        // TrialRecord も append（B-05 累計試行数に必要）。
        // Sprint 6 では試行ごとの詳細ログを持たないため、サマリ件数分のスタブを記録。
        const trialStubs: TrialRecord[] = Array.from(
          { length: courseTrialCount },
          (_, i) => ({
            trialId: `${sessionId}-t${i}`,
            sessionId,
            gameId:
              i === 0 && !g1.unattempted
                ? 'game1'
                : i < (g1.unattempted ? 0 : 1) + g2.trialCount
                  ? 'game2'
                  : 'game3',
            paramValue: 0,
            isCorrect: null,
            responseTimeMs: null,
            timestamp: now,
          }),
        );
        await appendTrials(trialStubs);
        await upsertDailyStats(todayDate, {
          courseCompleted: true,
          game1BestThreshold: g1.thresholdDeg,
          game2BestThreshold: g2.thresholdDeg,
          game3BestThreshold: g3.thresholdDeg,
          v1Score: v1,
          sessionCount: 1,
        });
        // ストリーク更新（spec.md §9.3）
        const currentStreak = await loadStreak().catch(() => createDefaultStreak());
        const { streak: nextStreak } = applyCourseCompletion(
          currentStreak,
          todayDate,
        );
        await saveStreak(nextStreak);
        setStreakAfter(nextStreak.currentStreak);
        // バッジ判定（spec.md §9.3）
        const [allStats, totalTrials, currentBadges] = await Promise.all([
          loadAllDailyStats(),
          getTotalTrialCount(),
          loadBadgeStatuses().catch(() => createDefaultBadgeStatuses()),
        ]);
        const { next: nextBadges, newlyEarned } = evaluateBadges(currentBadges, {
          streak: nextStreak,
          totalTrialCount: totalTrials,
          allDailyStats: allStats,
          today: new Date(),
        });
        if (newlyEarned.length > 0) {
          await saveBadgeStatuses(nextBadges);
          setNewlyEarnedBadges(newlyEarned);
        }
      } catch {
        // 永続化失敗時もコースは進める
      }
    },
    [todayDate],
  );

  if (phase === 'reminder') {
    return (
      <DistanceReminder
        distanceCm={distanceCm}
        onProceed={() => setPhase('game1')}
        onBack={onAbort}
      />
    );
  }

  if (phase === 'game1') {
    return (
      <Game1Screen
        distanceCm={distanceCm}
        onAbort={onAbort}
        onComplete={(result) => {
          setGame1Result(result);
          setPhase('result1');
        }}
      />
    );
  }

  if (phase === 'result1' && game1Result) {
    const diff = computeDiffForGame(
      'game1',
      game1Result.thresholdDeg,
      previousDay,
    );
    return (
      <ResultSummary
        gameName="Game 1(変化察知)"
        sessionType="course"
        unattempted={game1Result.unattempted}
        unattemptedReason={
          game1Result.unattempted
            ? 'タップせずに時間切れになりました'
            : undefined
        }
        primary={{
          label: '今回の閾値(最大角度差)',
          value: game1Result.thresholdDeg.toFixed(1),
          unit: '度',
        }}
        secondary={
          game1Result.unattempted
            ? undefined
            : [
                {
                  label: '正答',
                  value: `${game1Result.grading?.correctIds.length ?? 0}`,
                  unit: '個',
                },
                {
                  label: '誤タップ',
                  value: `${game1Result.grading?.incorrectIds.length ?? 0}`,
                  unit: '個',
                },
              ]
        }
        diff={game1Result.unattempted ? undefined : diff}
        onNext={() => setPhase('game2')}
        onBack={onAbort}
      />
    );
  }

  if (phase === 'game2') {
    return (
      <Game2Screen
        distanceCm={distanceCm}
        onAbort={onAbort}
        onComplete={(result) => {
          setGame2Result(result);
          setPhase('result2');
        }}
      />
    );
  }

  if (phase === 'result2' && game2Result) {
    const diff = computeDiffForGame(
      'game2',
      game2Result.thresholdDeg,
      previousDay,
    );
    return (
      <ResultSummary
        gameName="Game 2(二重表裏判別)"
        sessionType="course"
        primary={{
          label: '今回の閾値(最小判別角度差)',
          value: game2Result.thresholdDeg.toFixed(1),
          unit: '度',
        }}
        secondary={[
          {
            label: '正答率',
            value: `${Math.round(game2Result.correctRate * 100)}`,
            unit: '%',
          },
          {
            label: '試行数',
            value: `${game2Result.trialCount}`,
          },
        ]}
        diff={diff}
        onNext={() => setPhase('game3')}
        onBack={onAbort}
      />
    );
  }

  if (phase === 'game3') {
    return (
      <Game3Screen
        distanceCm={distanceCm}
        onAbort={onAbort}
        onComplete={(result) => {
          setGame3Result(result);
          setPhase('result3');
          if (game1Result && game2Result) {
            void persistSession(game1Result, game2Result, result);
          }
        }}
      />
    );
  }

  if (phase === 'result3' && game3Result) {
    const diff = computeDiffForGame(
      'game3',
      game3Result.thresholdDeg,
      previousDay,
    );
    return (
      <ResultSummary
        gameName="Game 3(周辺視野ハント)"
        sessionType="course"
        primary={{
          label: '今回の閾値(最小角度差)',
          value: game3Result.thresholdDeg.toFixed(1),
          unit: '度',
        }}
        secondary={[
          {
            label: '正答率',
            value: `${Math.round(game3Result.correctRate * 100)}`,
            unit: '%',
          },
          {
            label: '試行数',
            value: `${game3Result.trialCount}`,
          },
        ]}
        diff={diff}
        onNext={() => setPhase('cooldown')}
        onBack={onAbort}
      />
    );
  }

  if (phase === 'cooldown') {
    return <CooldownScreen onComplete={() => setPhase('complete')} />;
  }

  if (phase === 'complete') {
    const v1 =
      game1Result && game2Result && game3Result
        ? computeV1Score(
            game1Result.thresholdDeg,
            game2Result.thresholdDeg,
            game3Result.thresholdDeg,
          )
        : null;
    return (
      <SessionCompleteScreen
        onHome={onComplete}
        onOpenProgress={() => {
          if (onOpenProgress) onOpenProgress();
          else onComplete();
        }}
        streakAfter={streakAfter || 1}
        v1Score={v1}
        previousScore={previousDay?.v1Score ?? null}
        newlyEarnedBadges={newlyEarnedBadges}
      />
    );
  }

  return <View style={[styles.fallback, { backgroundColor: colors.bgCanvas }]} />;
};

/** 前回比 diff を ResultDiff 形に整形 */
function computeDiffForGame(
  gameId: 'game1' | 'game2' | 'game3',
  current: number,
  previousDay: DailyStats | undefined,
): ResultDiff {
  const prevValue =
    gameId === 'game1'
      ? (previousDay?.game1BestThreshold ?? null)
      : gameId === 'game2'
        ? (previousDay?.game2BestThreshold ?? null)
        : (previousDay?.game3BestThreshold ?? null);
  const td = computeThresholdDiff(current, prevValue);
  if (td.direction === 'first') {
    return { text: 'はじめての記録です', direction: 'first' };
  }
  if (td.direction === 'flat') {
    return { text: '前回と同じ', direction: 'flat' };
  }
  if (td.direction === 'improved') {
    const abs = Math.abs(td.delta ?? 0);
    return {
      text: `↓ 前回より ${abs.toFixed(1)} 度改善 ✨`,
      direction: 'improved',
    };
  }
  // worse
  const abs = Math.abs(td.delta ?? 0);
  return {
    text: `↑ 前回より ${abs.toFixed(1)} 度上がりました`,
    direction: 'worse',
  };
}

const styles = StyleSheet.create({
  fallback: { flex: 1 },
});
