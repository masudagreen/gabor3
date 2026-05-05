/**
 * CourseRunnerScreen — S18-02 コースフロー全体オーケストレータ。
 *
 * 全ゲーム連続コースの状態機械（distance-reminder → game N → interstitial N
 * → ... → cooldown → complete）を駆動する。
 *
 * - 内部状態は `CourseSessionState`（lib/v11/courseSession.ts）。
 * - phase に応じて以下のいずれかを描画：
 *     - distance-reminder: DistanceReminderV11
 *     - game N: 該当ゲームの GamePlay 画面（gameId スイッチ）
 *     - interstitial N: ResultOverlay（mode="course"、Sprint 20 で
 *       CourseInterstitialResultScreen から ResultOverlay 直接呼び出しに移行）
 *     - cooldown: CourseCooldownScreen
 *     - complete: CourseCompleteScreen
 *
 * 各ゲーム結果は `extractCourseGameOutcome` で正規化し、
 * `GameSessionResultV11` として state に蓄積。
 *
 * コース完了時：
 *   - SessionRecord を保存
 *   - DailyStats を update（フルコース完了 + ベスト閾値 + ワイドスコア）
 *   - Streak を update（同日 2 回目以降は加算しない）
 *
 * 中断時：S18-06 ConfirmDialog を経由してホームへ戻る。
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { DistanceReminderV11 } from '../../../components/v11/DistanceReminderV11';
import { ViewingDistanceCm } from '../../../lib/calibration';
import {
  CourseSessionState,
  advanceFromCooldown,
  advanceFromDistanceReminder,
  advanceFromInterstitial,
  completeGameWithResult,
  startCourseSession,
} from '../../../lib/v11/courseSession';
import { extractCourseGameOutcome } from '../../../lib/v11/courseGameAdapter';
import { applyCourseCompletionV11 } from '../../../lib/v11/streak';
import {
  evaluateBadgesV11,
  createInitialBadgeStatusesV11,
} from '../../../lib/v11/badges';
import { BadgeIdV11 } from '../../../lib/v11/badgeDefinitions';
import { buildBadgeContextV11 } from '../../../lib/v11/badgeContext';
import {
  loadAllBadgeStatusesV11,
  saveAllBadgeStatusesV11,
} from '../../../state/storage-v11';
import { GameIdV11 } from '../../../state/gameIds-v11';
import {
  GameSessionResultV11,
  loadStreakV11,
  recordFullCourseCompletionV11,
  saveSessionRecordV11,
  saveStreakV11,
  SessionRecordV11,
  StreakV11,
} from '../../../state/storage-v11';
import { OneEyeGuidanceV11 } from '../../../state/storage-v11';
import { G01ChangeDetectScreen } from '../games/G01ChangeDetectScreen';
import { G02SideBySideTiltScreen } from '../games/G02SideBySideTiltScreen';
import { G03PeripheralHuntScreen } from '../games/G03PeripheralHuntScreen';
import { G04ContrastDiscrimScreen } from '../games/G04ContrastDiscrimScreen';
import { G05SfDiscrimScreen } from '../games/G05SfDiscrimScreen';
import { G06WindowSizeScreen } from '../games/G06WindowSizeScreen';
import { G07EdgeHuntScreen } from '../games/G07EdgeHuntScreen';
import { G08TiltAftereffectScreen } from '../games/G08TiltAftereffectScreen';
import { G09LateralMaskingScreen } from '../games/G09LateralMaskingScreen';
import { G10TextureSegmentationScreen } from '../games/G10TextureSegmentationScreen';
import { G11VernierAlignmentScreen } from '../games/G11VernierAlignmentScreen';
import { G12CrowdingScreen } from '../games/G12CrowdingScreen';
import { G13EmbeddedNumeralScreen } from '../games/G13EmbeddedNumeralScreen';
import {
  buildCorrectAnswerLabel as buildG01CorrectAnswerLabel,
  buildUserAnswerLabel as buildG01UserAnswerLabel,
} from '../../../lib/v11/g01Result';
import {
  buildG02CorrectAnswerLabel,
  buildG02UserAnswerLabel,
} from '../../../lib/v11/g02Result';
import {
  buildG03CorrectAnswerLabel,
  buildG03UserAnswerLabel,
} from '../../../lib/v11/g03Result';
import {
  buildG04CorrectAnswerLabel,
  buildG04UserAnswerLabel,
} from '../../../lib/v11/g04Result';
import {
  buildG05CorrectAnswerLabel,
  buildG05UserAnswerLabel,
} from '../../../lib/v11/g05Result';
import {
  buildG06CorrectAnswerLabel,
  buildG06UserAnswerLabel,
} from '../../../lib/v11/g06Result';
import {
  buildG07CorrectLabel,
  buildG07UserAnswerLabel,
} from '../../../lib/v11/g07Result';
import {
  buildG08CorrectAnswerLabel,
  buildG08UserAnswerLabel,
} from '../../../lib/v11/g08Result';
import {
  buildG09CorrectAnswerLabel,
  buildG09UserAnswerLabel,
} from '../../../lib/v11/g09Result';
import {
  buildG10CorrectAnswerLabel,
  buildG10UserAnswerLabel,
} from '../../../lib/v11/g10Result';
import {
  buildG11CorrectAnswerLabel,
  buildG11UserAnswerLabel,
} from '../../../lib/v11/g11Result';
import {
  buildG12CorrectAnswerLabel,
  buildG12UserAnswerLabel,
} from '../../../lib/v11/g12Result';
import {
  buildG13CorrectAnswerLabel,
  buildG13UserAnswerLabel,
} from '../../../lib/v11/g13Result';
import { loadRecentDailyStatsV11 } from '../../../state/storage-v11';
import { CourseCompleteScreen } from './CourseCompleteScreen';
import { CourseCooldownScreen } from './CourseCooldownScreen';
import { ResultMark } from '../../../components/v11/ResultOverlay';
import {
  buildG01Marks,
  buildG02Marks,
  buildG03Marks,
  buildG07Marks,
  buildG08Marks,
  buildG09Marks,
  buildG10Marks,
  buildG12Marks,
  buildG13Marks,
  buildHorizontalSideMarks,
} from '../../../lib/v11/resultMarks';

export type CourseRunnerScreenProps = {
  distanceCm: ViewingDistanceCm;
  oneEyeGuidance: OneEyeGuidanceV11;
  /** UUID 等の識別子（呼び出し側で生成） */
  sessionId: string;
  /** 開始日時（ISO 8601） */
  startedAt: string;
  /** 端末ローカル日付（YYYY-MM-DD）：DailyStats / Streak 反映時の鍵 */
  todayLocal: string;
  /** ホームへ戻る（中断 / 完了後） */
  onExitToHome: () => void;
  /** 進捗グラフへ */
  onOpenProgress: () => void;
  /** テスト用：各カウントダウンの初期値・tick を上書き */
  countdownOverrides?: {
    distanceReminderInitialSec?: number;
    interstitialInitialSec?: number;
    cooldownInitialSec?: number;
    tickMs?: number;
  };
};

export const CourseRunnerScreen: React.FC<CourseRunnerScreenProps> = ({
  distanceCm,
  oneEyeGuidance,
  sessionId,
  startedAt,
  todayLocal,
  onExitToHome,
  onOpenProgress,
  countdownOverrides,
}) => {
  const [state, setState] = React.useState<CourseSessionState>(() =>
    startCourseSession({ sessionId, startedAt }),
  );
  const [abortDialogOpen, setAbortDialogOpen] = React.useState(false);
  const [completeDisplay, setCompleteDisplay] = React.useState<{
    todayWideScore: number | null;
    diffFromPrevious: number | null;
    streak: StreakV11;
    newlyAwardedBadges: ReadonlyArray<BadgeIdV11>;
  } | null>(null);
  const persistedRef = React.useRef(false);
  /** 直近完了したゲームの生 result（interstitial の label 構築用） */
  const lastResultRef = React.useRef<{
    gameId: GameIdV11;
    result: unknown;
  } | null>(null);

  // Phase が complete に入ったタイミングで永続化（SessionRecord / DailyStats / Streak）
  React.useEffect(() => {
    if (state.phase.kind !== 'complete') return;
    if (persistedRef.current) return;
    persistedRef.current = true;
    void persistCourseCompletion(state, todayLocal).then((display) => {
      setCompleteDisplay(display);
    });
  }, [state, todayLocal]);

  const handleAbortConfirm = () => {
    setAbortDialogOpen(false);
    onExitToHome();
  };

  const handleAbortCancel = () => setAbortDialogOpen(false);

  const phase = state.phase;

  if (phase.kind === 'distance-reminder') {
    return (
      <View style={styles.root} testID="course-runner-distance">
        <DistanceReminderV11
          distanceCm={distanceCm}
          oneEyeGuidance={oneEyeGuidance}
          onCountdownComplete={() =>
            setState((s) => advanceFromDistanceReminder(s))
          }
          onAbort={() => setAbortDialogOpen(true)}
          paused={abortDialogOpen}
          initialSecondsForTest={
            countdownOverrides?.distanceReminderInitialSec ?? 3
          }
          tickMsForTest={countdownOverrides?.tickMs ?? 1000}
        />
        <ConfirmDialog
          isOpen={abortDialogOpen}
          title="コースを中断しますか？"
          message="ここまでの記録は未完了として保存されます"
          primaryLabel="中断する"
          secondaryLabel="続ける"
          destructive
          onPrimaryPress={handleAbortConfirm}
          onSecondaryPress={handleAbortCancel}
        />
      </View>
    );
  }

  if (phase.kind === 'game' || phase.kind === 'interstitial') {
    // Sprint 22：コース時も PlayScreen が phase='result' に遷移して
    // GxxResultScreen（extraStimulus 込み）を描画する。CourseRunner は game と
    // interstitial の両 phase で同じ PlayScreen をマウントし続け、PlayScreen
    // 内部の result 表示が ResultOverlay の mode='course' で動作する。
    const handleGameComplete = async (result: unknown) => {
      const outcome = extractCourseGameOutcome(phase.gameId, result);
      const sessionResult: GameSessionResultV11 = {
        gameId: phase.gameId,
        threshold: outcome.threshold,
        isCorrect: outcome.isCorrect,
      };
      setState((s) => completeGameWithResult(s, sessionResult));
      lastResultRef.current = { gameId: phase.gameId, result };
      return { previousBest: null, newlyAwardedBadges: [] };
    };

    // 「次のゲーム」ラベル（最終ゲームでは null → 「クールダウンへ」）。
    // game / interstitial 両 phase で同じインデックスから計算する。
    const nextIdx = phase.index + 1;
    const nextDef =
      nextIdx < state.games.length ? state.games[nextIdx] : null;
    const nextLabel = nextDef ? `${nextDef.gameId} ${nextDef.nameJa}` : null;

    // 中断確認ダイアログは各ゲーム Screen 内部の ConfirmDialog が担う
    // （「ゲームを中断しますか？」）。CourseRunner 側で外側 ConfirmDialog を
    // 出すと「中断しますか？」が二重表示になるため、ここでは出さない。
    return (
      <View style={styles.root} testID="course-runner-game">
        <CoursePlayDispatch
          gameId={phase.gameId}
          distanceCm={distanceCm}
          onComplete={handleGameComplete}
          onAbort={onExitToHome}
          isCourseMode
          nextGameLabel={nextLabel}
          onCourseAdvance={() => setState((s) => advanceFromInterstitial(s))}
        />
      </View>
    );
  }

  if (phase.kind === 'cooldown') {
    return (
      <View style={styles.root} testID="course-runner-cooldown">
        <CourseCooldownScreen
          onCompleted={() => setState((s) => advanceFromCooldown(s))}
          onAbort={() => setAbortDialogOpen(true)}
          paused={abortDialogOpen}
          initialSecondsForTest={countdownOverrides?.cooldownInitialSec ?? 10}
          tickMsForTest={countdownOverrides?.tickMs ?? 1000}
        />
        <ConfirmDialog
          isOpen={abortDialogOpen}
          title="コースを中断しますか？"
          message="ここまでの記録は未完了として保存されます"
          primaryLabel="中断する"
          secondaryLabel="続ける"
          destructive
          onPrimaryPress={handleAbortConfirm}
          onSecondaryPress={handleAbortCancel}
        />
      </View>
    );
  }

  // complete
  const display = completeDisplay;
  return (
    <View style={styles.root} testID="course-runner-complete">
      <CourseCompleteScreen
        todayWideScore={display?.todayWideScore ?? null}
        diffFromPrevious={display?.diffFromPrevious ?? null}
        gameCount={state.games.length}
        currentStreak={display?.streak.currentStreak ?? 0}
        longestStreak={display?.streak.longestStreak ?? 0}
        newlyAwardedBadges={display?.newlyAwardedBadges ?? []}
        onPressProgress={onOpenProgress}
        onPressHome={onExitToHome}
      />
    </View>
  );
};

/**
 * Sprint 20-B：13 ゲームの onComplete payload から ResultOverlay 用 marks を構築。
 * components.md §25 の規範に従う。grading が欠落している（中断 / 異常）等の
 * フォールバック時は空配列を返す（UI 側は ◯/✕ を出さず、SR 読み上げのみ）。
 *
 * 純関数。export してテストから直接呼べるようにする。
 */
export function buildMarksForGame(
  gameId: GameIdV11,
  result: unknown,
): ReadonlyArray<ResultMark> {
  type AnyR = {
    trial?: unknown;
    grading?: {
      correctSide?: 'left' | 'right';
      correctClockPosition?: unknown;
      correctDirection?: unknown;
      correctOrientation?: unknown;
      correctQuadrant?: unknown;
      correctIds?: unknown;
      embeddedDigit?: unknown;
      userAnswer?: unknown;
      truePositiveIds?: unknown;
      falsePositiveIds?: unknown;
      falseNegativeIds?: unknown;
    };
    isCorrectForStaircase?: boolean;
  };
  const r = result as AnyR;
  try {
    switch (gameId) {
      case 'G-01': {
        // G-01：trial.patches + grading.correctIds + incorrectIds
        if (r.trial && r.grading) {
          const correctIds = Array.isArray(
            (r.grading as { correctIds?: unknown }).correctIds,
          )
            ? ((r.grading as { correctIds: ReadonlyArray<string> }).correctIds)
            : [];
          const incorrectIds = Array.isArray(
            (r.grading as { incorrectIds?: unknown }).incorrectIds,
          )
            ? ((r.grading as { incorrectIds: ReadonlyArray<string> }).incorrectIds)
            : [];
          const selectedIds = [...correctIds, ...incorrectIds];
          return buildG01Marks({
            trial: r.trial as Parameters<typeof buildG01Marks>[0]['trial'],
            selectedIds,
          });
        }
        break;
      }
      case 'G-02': {
        const g = r.grading;
        if (g?.correctSide) {
          return buildG02Marks({
            correctSide: g.correctSide,
            userAnswer:
              (g.userAnswer ?? null) as 'left' | 'right' | null,
          });
        }
        break;
      }
      case 'G-03': {
        const g = r.grading;
        if (g?.correctClockPosition !== undefined) {
          return buildG03Marks({
            correctClockPosition: g.correctClockPosition as Parameters<
              typeof buildG03Marks
            >[0]['correctClockPosition'],
            userAnswer: (g.userAnswer ?? null) as Parameters<
              typeof buildG03Marks
            >[0]['userAnswer'],
          });
        }
        break;
      }
      case 'G-04':
      case 'G-05':
      case 'G-06': {
        const g = r.grading;
        if (g?.correctSide) {
          const idMap: Record<typeof gameId, 'g04' | 'g05' | 'g06'> = {
            'G-04': 'g04',
            'G-05': 'g05',
            'G-06': 'g06',
          };
          return buildHorizontalSideMarks({
            gameId: idMap[gameId],
            correctSide: g.correctSide,
            userAnswer: (g.userAnswer ?? null) as 'left' | 'right' | null,
          });
        }
        break;
      }
      case 'G-07': {
        const g = r.grading;
        if (g && Array.isArray(g.truePositiveIds)) {
          return buildG07Marks({
            grading: g as unknown as Parameters<typeof buildG07Marks>[0]['grading'],
          });
        }
        break;
      }
      case 'G-08': {
        const g = r.grading;
        if (g?.correctDirection !== undefined) {
          return buildG08Marks({
            correctDirection: g.correctDirection as 'cw' | 'ccw',
            userAnswer: (g.userAnswer ?? null) as 'cw' | 'ccw' | null,
          });
        }
        break;
      }
      case 'G-09': {
        const g = r.grading;
        if (g?.correctOrientation !== undefined) {
          return buildG09Marks({
            correctOrientation: g.correctOrientation as
              | 'vertical'
              | 'horizontal',
            userAnswer: (g.userAnswer ?? null) as
              | 'vertical'
              | 'horizontal'
              | null,
          });
        }
        break;
      }
      case 'G-10': {
        const g = r.grading;
        if (g?.correctQuadrant !== undefined) {
          return buildG10Marks({
            correctQuadrant: g.correctQuadrant as 'tl' | 'tr' | 'bl' | 'br',
            userAnswer: (g.userAnswer ?? null) as
              | 'tl'
              | 'tr'
              | 'bl'
              | 'br'
              | null,
          });
        }
        break;
      }
      case 'G-11': {
        // G-11 は grading.correctDirection / userAnswer = 'left' | 'right' を採用
        const g = r.grading;
        if (g?.correctDirection !== undefined) {
          return buildHorizontalSideMarks({
            gameId: 'g11',
            correctSide: g.correctDirection as 'left' | 'right',
            userAnswer: (g.userAnswer ?? null) as 'left' | 'right' | null,
          });
        }
        break;
      }
      case 'G-12': {
        const g = r.grading;
        if (g?.correctOrientation !== undefined) {
          return buildG12Marks({
            correctOrientation: g.correctOrientation as string,
            userAnswer: (g.userAnswer ?? null) as string | null,
          });
        }
        break;
      }
      case 'G-13': {
        const g = r.grading;
        if (g?.embeddedDigit !== undefined) {
          return buildG13Marks({
            embeddedDigit: g.embeddedDigit as Parameters<
              typeof buildG13Marks
            >[0]['embeddedDigit'],
            userAnswer: (g.userAnswer ?? null) as Parameters<
              typeof buildG13Marks
            >[0]['userAnswer'],
          });
        }
        break;
      }
    }
  } catch {
    // ラベル構築失敗時は空配列にフォールバック（既存挙動踏襲）
  }
  return [];
}

/**
 * 全 13 ゲームの interstitial 用「正解 / ユーザー回答」ラベルを組み立てる。
 *
 * 各ゲームの onComplete payload（`result`）から、その個別ゲーム lib の
 * label builder に必要な情報を抽出して呼び出す。result の shape は
 * 各 GamePlay 画面の `*TrialResult` 型（grading + trial + thresholdXxx 等）。
 *
 * - G-01：`trial.patches` から「N 列 M 行目」を、`grading.correctIds + incorrectIds`
 *   からユーザー選択 ID を組み立てる
 * - G-02 / G-04 / G-05 / G-06：`grading.correctSide` / `grading.userAnswer`
 * - G-03：`grading.correctClockPosition` / `grading.userAnswer`
 * - G-07：`grading` 全体を渡す（buildG07CorrectLabel / buildG07UserAnswerLabel が
 *   correctIds と userSelectedIds を内部で参照）
 * - G-08：`grading.correctDirection` / `grading.userAnswer`
 * - G-09：`grading.correctOrientation` / `grading.userAnswer`
 * - G-10：`grading.correctQuadrant` / `grading.userAnswer`
 * - G-11：`grading.correctDirection` / `grading.userAnswer`
 * - G-12：`grading.correctOrientation` / `grading.userAnswer`
 * - G-13：`grading.embeddedDigit` / `grading.userAnswer`
 *
 * いずれも grading が無い等で組み立てに失敗した場合は `'—'` / `null`
 * （= ResultSummaryV11 が「未回答」と表示）にフォールバック。
 *
 * `export` してユニットテストから直接呼べるようにしている。
 */
export function buildInterstitialLabels(
  gameId: GameIdV11,
  result: unknown,
): { correctAnswer: string; userAnswer: string | null } {
  type AnyR = {
    trial?: { patches?: unknown };
    grading?: {
      correctSide?: 'left' | 'right';
      correctClockPosition?: unknown;
      correctDirection?: unknown;
      correctOrientation?: unknown;
      correctQuadrant?: unknown;
      correctIds?: unknown;
      embeddedDigit?: unknown;
      userAnswer?: unknown;
      userSelectedIds?: unknown;
      incorrectIds?: unknown;
      unattempted?: boolean;
    };
  };
  const r = result as AnyR;
  try {
    switch (gameId) {
      case 'G-01': {
        if (r.trial && Array.isArray((r.trial as { patches?: unknown }).patches)) {
          const t = r.trial as Parameters<typeof buildG01CorrectAnswerLabel>[0];
          const correctIds = Array.isArray(r.grading?.correctIds)
            ? (r.grading?.correctIds as ReadonlyArray<string>)
            : [];
          const incorrectIds = Array.isArray(r.grading?.incorrectIds)
            ? (r.grading?.incorrectIds as ReadonlyArray<string>)
            : [];
          const selectedIds = [...correctIds, ...incorrectIds];
          return {
            correctAnswer: buildG01CorrectAnswerLabel(t),
            userAnswer: buildG01UserAnswerLabel(selectedIds),
          };
        }
        break;
      }
      case 'G-02': {
        const g = r.grading;
        if (g?.correctSide) {
          return {
            correctAnswer: buildG02CorrectAnswerLabel(g.correctSide),
            userAnswer: buildG02UserAnswerLabel(
              (g.userAnswer ?? null) as Parameters<
                typeof buildG02UserAnswerLabel
              >[0],
            ),
          };
        }
        break;
      }
      case 'G-03': {
        const g = r.grading;
        if (g?.correctClockPosition !== undefined) {
          return {
            correctAnswer: buildG03CorrectAnswerLabel(
              g.correctClockPosition as Parameters<
                typeof buildG03CorrectAnswerLabel
              >[0],
            ),
            userAnswer: buildG03UserAnswerLabel(
              (g.userAnswer ?? null) as Parameters<
                typeof buildG03UserAnswerLabel
              >[0],
            ),
          };
        }
        break;
      }
      case 'G-04': {
        const g = r.grading;
        if (g?.correctSide) {
          return {
            correctAnswer: buildG04CorrectAnswerLabel(
              g.correctSide as Parameters<typeof buildG04CorrectAnswerLabel>[0],
            ),
            userAnswer: buildG04UserAnswerLabel(
              (g.userAnswer ?? null) as Parameters<
                typeof buildG04UserAnswerLabel
              >[0],
            ),
          };
        }
        break;
      }
      case 'G-05': {
        const g = r.grading;
        if (g?.correctSide) {
          return {
            correctAnswer: buildG05CorrectAnswerLabel(
              g.correctSide as Parameters<typeof buildG05CorrectAnswerLabel>[0],
            ),
            userAnswer: buildG05UserAnswerLabel(
              (g.userAnswer ?? null) as Parameters<
                typeof buildG05UserAnswerLabel
              >[0],
            ),
          };
        }
        break;
      }
      case 'G-06': {
        const g = r.grading;
        if (g?.correctSide) {
          return {
            correctAnswer: buildG06CorrectAnswerLabel(
              g.correctSide as Parameters<typeof buildG06CorrectAnswerLabel>[0],
            ),
            userAnswer: buildG06UserAnswerLabel(
              (g.userAnswer ?? null) as Parameters<
                typeof buildG06UserAnswerLabel
              >[0],
            ),
          };
        }
        break;
      }
      case 'G-07': {
        const g = r.grading;
        if (g && Array.isArray(g.correctIds)) {
          const grading = g as Parameters<typeof buildG07CorrectLabel>[0];
          return {
            correctAnswer: buildG07CorrectLabel(grading),
            userAnswer: buildG07UserAnswerLabel(grading),
          };
        }
        break;
      }
      case 'G-08': {
        const g = r.grading;
        if (g?.correctDirection !== undefined) {
          return {
            correctAnswer: buildG08CorrectAnswerLabel(
              g.correctDirection as Parameters<
                typeof buildG08CorrectAnswerLabel
              >[0],
            ),
            userAnswer: buildG08UserAnswerLabel(
              (g.userAnswer ?? null) as Parameters<
                typeof buildG08UserAnswerLabel
              >[0],
            ),
          };
        }
        break;
      }
      case 'G-09': {
        const g = r.grading;
        if (g?.correctOrientation !== undefined) {
          return {
            correctAnswer: buildG09CorrectAnswerLabel(
              g.correctOrientation as Parameters<
                typeof buildG09CorrectAnswerLabel
              >[0],
            ),
            userAnswer: buildG09UserAnswerLabel(
              (g.userAnswer ?? null) as Parameters<
                typeof buildG09UserAnswerLabel
              >[0],
            ),
          };
        }
        break;
      }
      case 'G-10': {
        const g = r.grading;
        if (g?.correctQuadrant !== undefined) {
          return {
            correctAnswer: buildG10CorrectAnswerLabel(
              g.correctQuadrant as Parameters<
                typeof buildG10CorrectAnswerLabel
              >[0],
            ),
            userAnswer: buildG10UserAnswerLabel(
              (g.userAnswer ?? null) as Parameters<
                typeof buildG10UserAnswerLabel
              >[0],
            ),
          };
        }
        break;
      }
      case 'G-11': {
        const g = r.grading;
        if (g?.correctDirection !== undefined) {
          return {
            correctAnswer: buildG11CorrectAnswerLabel(
              g.correctDirection as Parameters<
                typeof buildG11CorrectAnswerLabel
              >[0],
            ),
            userAnswer: buildG11UserAnswerLabel(
              (g.userAnswer ?? null) as Parameters<
                typeof buildG11UserAnswerLabel
              >[0],
            ),
          };
        }
        break;
      }
      case 'G-12': {
        const g = r.grading;
        if (g?.correctOrientation !== undefined) {
          return {
            correctAnswer: buildG12CorrectAnswerLabel(
              g.correctOrientation as Parameters<
                typeof buildG12CorrectAnswerLabel
              >[0],
            ),
            userAnswer: buildG12UserAnswerLabel(
              (g.userAnswer ?? null) as Parameters<
                typeof buildG12UserAnswerLabel
              >[0],
            ),
          };
        }
        break;
      }
      case 'G-13': {
        const g = r.grading;
        if (g?.embeddedDigit !== undefined) {
          return {
            correctAnswer: buildG13CorrectAnswerLabel(
              g.embeddedDigit as Parameters<
                typeof buildG13CorrectAnswerLabel
              >[0],
            ),
            userAnswer: buildG13UserAnswerLabel(
              (g.userAnswer ?? null) as Parameters<
                typeof buildG13UserAnswerLabel
              >[0],
            ),
          };
        }
        break;
      }
    }
  } catch {
    // ラベル構築失敗時は簡易表示にフォールバック
  }
  // grading が欠けている等の異常時のみ ここに到達。
  // userAnswer=null とすることで ResultSummaryV11 が「未回答」と表示する。
  return { correctAnswer: '—', userAnswer: null };
}

/** 各ゲームの GamePlay 画面を gameId で dispatch */
const CoursePlayDispatch: React.FC<{
  gameId: GameIdV11;
  distanceCm: ViewingDistanceCm;
  onComplete: (result: unknown) => Promise<unknown> | void;
  onAbort: () => void;
  isCourseMode: boolean;
  nextGameLabel: string | null;
  onCourseAdvance: () => void;
}> = ({
  gameId,
  distanceCm,
  onComplete,
  onAbort,
  isCourseMode,
  nextGameLabel,
  onCourseAdvance,
}) => {
  // Sprint 20-B-3：onComplete は内部 PlayScreen に Promise 形式で渡す。`unknown`
  // 型から各 PlayScreen の TrialResult 型へ narrow するための helper。
  const wrap =
    <R,>(fn: (r: R) => Promise<unknown> | void) =>
    (r: R) =>
      fn(r) as Promise<{
        previousBest: number | null;
        newlyAwardedBadges: ReadonlyArray<BadgeIdV11>;
      }> | void;
  // game phase では中断ダイアログを各ゲーム Screen 内部の ConfirmDialog に
  // 任せるため、paused を外側から渡す必要がない（内部の showAbort で 60 秒
  // タイマーを停止している）。
  // Sprint 20-B-3：isCourseMode / nextGameLabel / onCourseAdvance を全 13
  // PlayScreen に伝搬し、result phase で ResultOverlay の mode='course' 描画と
  // 「次へ」進行に使う。
  const courseProps = {
    isCourseMode,
    nextGameLabel,
    onCourseAdvance,
  } as const;
  switch (gameId) {
    case 'G-01':
      return (
        <G01ChangeDetectScreen
          distanceCm={distanceCm}
          onAbort={onAbort}
          onComplete={wrap(onComplete)}
          {...courseProps}
        />
      );
    case 'G-02':
      return (
        <G02SideBySideTiltScreen
          distanceCm={distanceCm}
          onAbort={onAbort}
          onComplete={wrap(onComplete)}
          {...courseProps}
        />
      );
    case 'G-03':
      return (
        <G03PeripheralHuntScreen
          distanceCm={distanceCm}
          onAbort={onAbort}
          onComplete={wrap(onComplete)}
          {...courseProps}
        />
      );
    case 'G-04':
      return (
        <G04ContrastDiscrimScreen
          distanceCm={distanceCm}
          onAbort={onAbort}
          onComplete={wrap(onComplete)}
          {...courseProps}
        />
      );
    case 'G-05':
      return (
        <G05SfDiscrimScreen
          distanceCm={distanceCm}
          onAbort={onAbort}
          onComplete={wrap(onComplete)}
          {...courseProps}
        />
      );
    case 'G-06':
      return (
        <G06WindowSizeScreen
          distanceCm={distanceCm}
          onAbort={onAbort}
          onComplete={wrap(onComplete)}
          {...courseProps}
        />
      );
    case 'G-07':
      return (
        <G07EdgeHuntScreen
          distanceCm={distanceCm}
          onAbort={onAbort}
          onComplete={wrap(onComplete)}
          {...courseProps}
        />
      );
    case 'G-08':
      return (
        <G08TiltAftereffectScreen
          distanceCm={distanceCm}
          onAbort={onAbort}
          onComplete={wrap(onComplete)}
          {...courseProps}
        />
      );
    case 'G-09':
      return (
        <G09LateralMaskingScreen
          distanceCm={distanceCm}
          onAbort={onAbort}
          onComplete={wrap(onComplete)}
          {...courseProps}
        />
      );
    case 'G-10':
      return (
        <G10TextureSegmentationScreen
          distanceCm={distanceCm}
          onAbort={onAbort}
          onComplete={wrap(onComplete)}
          {...courseProps}
        />
      );
    case 'G-11':
      return (
        <G11VernierAlignmentScreen
          distanceCm={distanceCm}
          onAbort={onAbort}
          onComplete={wrap(onComplete)}
          {...courseProps}
        />
      );
    case 'G-12':
      return (
        <G12CrowdingScreen
          distanceCm={distanceCm}
          onAbort={onAbort}
          onComplete={wrap(onComplete)}
          {...courseProps}
        />
      );
    case 'G-13':
      return (
        <G13EmbeddedNumeralScreen
          distanceCm={distanceCm}
          onAbort={onAbort}
          onComplete={wrap(onComplete)}
          {...courseProps}
        />
      );
    default:
      return null;
  }
};

/**
 * コース完了時の永続化と表示用情報組み立て。
 *
 * 1. SessionRecord を保存（uuid 単位）
 * 2. DailyStats を update（フルコース完了 + ベスト閾値 + ワイドスコア）
 * 3. Streak を update（同日 2 回目は加算しない）
 * 4. 表示用：本日のワイドスコア / 前回比 / ストリーク を返す
 */
async function persistCourseCompletion(
  state: CourseSessionState,
  todayLocal: string,
): Promise<{
  todayWideScore: number | null;
  diffFromPrevious: number | null;
  streak: StreakV11;
  newlyAwardedBadges: ReadonlyArray<BadgeIdV11>;
}> {
  // 1. SessionRecord
  const record: SessionRecordV11 = {
    sessionId: state.sessionId,
    sessionType: 'full-course',
    startedAt: state.startedAt,
    completedAt: new Date().toISOString(),
    gameResults: [...state.results],
    wideScore: null, // 後で DailyStats から書き戻す
  };
  await saveSessionRecordV11(record);

  // 2. DailyStats（前回比のために、更新前の wideScore を覚えておく）
  // 過去日の wideScore（前回比用）：今日を除く最新の wideScore を取りたいが、
  // 簡易には「今日の DailyStats（更新前）の wideScore」を「前回」とみなす
  // …ではなく、「過去 7 日くらいから直近の wideScore」を採用したい。
  // ここでは「過去日の DailyStats 全件から最も新しい wideScore」を「前回」として扱う。
  const previousWideScore = await loadMostRecentPreviousWideScore(todayLocal);
  const updatedStats = await recordFullCourseCompletionV11(
    todayLocal,
    state.results,
  );
  // SessionRecord に wideScore を書き戻し
  if (updatedStats.wideScore !== null) {
    await saveSessionRecordV11({
      ...record,
      wideScore: updatedStats.wideScore,
    });
  }
  const todayWideScore = updatedStats.wideScore;
  const diffFromPrevious =
    todayWideScore !== null && previousWideScore !== null
      ? todayWideScore - previousWideScore
      : null;

  // 3. Streak
  const currentStreak = await loadStreakV11();
  const { streak: nextStreak } = applyCourseCompletionV11(
    currentStreak,
    todayLocal,
  );
  await saveStreakV11(nextStreak);

  // 4. Badges（Sprint 19 / F-13）
  const newlyAwardedBadges = await evaluateAndPersistBadgesForCourse();

  return {
    todayWideScore,
    diffFromPrevious,
    streak: nextStreak,
    newlyAwardedBadges,
  };
}

/**
 * Sprint 19 / F-13：コース完了時のバッジ評価と永続化（CourseRunner 専用）。
 *
 * 永続化済み BadgeStatus + 全永続化データから BadgeEvalContext を構築し、
 * 13 バッジを再評価。新規獲得があれば永続化し、newlyEarned を返す。
 */
async function evaluateAndPersistBadgesForCourse(): Promise<
  ReadonlyArray<BadgeIdV11>
> {
  const [persisted, ctx] = await Promise.all([
    loadAllBadgeStatusesV11(),
    buildBadgeContextV11(),
  ]);
  const merged = createInitialBadgeStatusesV11().map((init) => {
    const found = persisted.find((b) => b.badgeId === init.badgeId);
    return found
      ? {
          badgeId: init.badgeId,
          earned: found.earned,
          earnedAt: found.earnedAt,
        }
      : init;
  });
  const { next, newlyEarned } = evaluateBadgesV11(merged, ctx);
  if (newlyEarned.length > 0) {
    await saveAllBadgeStatusesV11(next);
  }
  return newlyEarned;
}

/**
 * 過去日の DailyStats から「今日を除く最新」の wideScore を返す。
 *
 * 用途：コース完了画面の「前回比」計算。
 */
async function loadMostRecentPreviousWideScore(
  todayLocal: string,
): Promise<number | null> {
  const recent = await loadRecentDailyStatsV11(todayLocal, 28);
  // 今日除く最新
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].date !== todayLocal && recent[i].wideScore !== null) {
      return recent[i].wideScore;
    }
  }
  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
