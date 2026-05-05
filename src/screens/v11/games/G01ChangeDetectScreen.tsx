/**
 * G01ChangeDetectScreen — G-01 変化察知（spec-v11.md §7.1、screens.md S9-02）。
 *
 * v1.1 OPT-12 統一フォーマット：
 *   - 1 試行 = 60 秒固定（早期終了不可）
 *   - 60 秒間ずっと同じグリッドが表示されモーフィングが進行（同一画面、切替なし）
 *   - タップで選択トグル（再タップ解除、複数選択可）
 *   - 確定ボタンなし
 *   - 60 秒経過で自動採点：True Positive +1 / False Positive -1 / False Negative 0
 *     合計 0 未満なら 0
 *   - 全変化対象を選択かつ FP=0 のときのみ staircase 「正解」
 *
 * v1 の `Game1Screen` のロジックを流用しつつ、UI は GamePlaySurface +
 * MorphGridStimulus に置き換え。
 *
 * Sprint 20-B-3：60 秒経過後は「画面遷移なし」で同じ Screen 内に
 * `G01ResultScreen` を描画する（`phase === 'result'`）。AppRouter / CourseRunner
 * は **`onComplete` の Promise から `previousBest` / `newlyAwardedBadges` を返す**
 * ことで、PlayScreen が result phase の表示に必要な情報を取得する。
 */

import React from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { GamePlaySurface } from '../../../components/v11/GamePlaySurface';
import { MorphGridStimulus } from '../../../components/v11/games/MorphGridStimulus';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useGameCountdown } from '../../../hooks/v11/useGameCountdown';
import {
  GAME1,
  Game1GradingResult,
  Game1TrialSpec,
  buildGame1Trial,
  gradeGame1,
  isUnattempted,
} from '../../../lib/game1';
import {
  DEFAULT_DPI,
  estimateDeviceType,
  ViewingDistanceCm,
} from '../../../lib/calibration';
import {
  applySessionResultV11,
  estimateThresholdV11,
  StaircaseStateV11,
} from '../../../lib/v11/staircaseV11';
import {
  loadStaircaseV11,
  saveStaircaseV11,
} from '../../../state/storage-v11';
import { usePrefersReducedMotion } from '../../../lib/motion';
import {
  fontSize,
  getColors,
  spacing,
} from '../../../theme/tokens';
import { G01ResultScreen } from './G01ResultScreen';
import { GamePostCompleteData } from './_shared/types';

/** G-01 の 1 試行終了時に親に返す結果 */
export type G01TrialResult = {
  /** 今回の閾値（直近 5 セッション平均、四捨五入 1 桁） */
  thresholdDeg: number;
  /** 採点結果（未挑戦時は null） */
  grading: Game1GradingResult | null;
  /** 未挑戦かどうか（60 秒経過時にタップ 0 件） */
  unattempted: boolean;
  /** 試行のスペック（変化対象 ID 等を結果画面で使う） */
  trial: Game1TrialSpec;
  /** 親が staircase 平均と一緒に「前回比」を計算するために使う今回の使用パラメータ */
  playedParam: number;
  /** staircase 判定上の正解（全 TP かつ FP=0） */
  isCorrectForStaircase: boolean;
};

// Sprint 20-B-3 共通型は ./_shared/types.ts に集約

export type G01ChangeDetectScreenProps = {
  distanceCm: ViewingDistanceCm;
  onAbort: () => void;
  /**
   * Sprint 20-B-3：60 秒経過時に親が永続化等を行い、PlayScreen の result phase 表示に
   * 必要な情報（previousBest / newlyAwardedBadges）を Promise で返す。
   */
  onComplete: (result: G01TrialResult) => Promise<GamePostCompleteData> | void;
  /**
   * 真の間は 60 秒カウントダウンを一時停止する（コース実行中の中断ダイアログ
   * 表示中など）。未指定 / false なら従来挙動（=単体プレイ画面はそのまま）。
   */
  paused?: boolean;
  /** Sprint 20-B-3：コースモード時 true。result phase で ResultOverlay の mode='course' に切替 */
  isCourseMode?: boolean;
  /** Sprint 20-B-3：コース時、次のゲーム表示用ラベル（最終なら null） */
  nextGameLabel?: string | null;
  /** Sprint 20-B-3：result phase で「次へ」が押されたとき呼ばれる（コース時：次のゲームへ進む） */
  onCourseAdvance?: () => void;
  /** Sprint 20-B-3：単体時、「同じゲームをもう一度」 */
  onPlayAgain?: () => void;
  /** Sprint 20-B-3：単体時、「ゲーム一覧へ戻る」 */
  onBackToList?: () => void;
  /** Sprint 20-B-3：単体時、「ホームへ」 */
  onGoHome?: () => void;
  /** テスト用：乱数注入 */
  rng?: () => number;
  /** テスト用：60 秒タイマーの代替（未指定なら setInterval ベース） */
  totalDurationMsForTest?: number;
  tickMsForTest?: number;
};

type Phase = 'loading' | 'playing' | 'result';

export const G01ChangeDetectScreen: React.FC<G01ChangeDetectScreenProps> = ({
  distanceCm,
  onAbort,
  onComplete,
  paused = false,
  isCourseMode = false,
  nextGameLabel = null,
  onCourseAdvance,
  onPlayAgain,
  onBackToList,
  onGoHome,
  rng,
  totalDurationMsForTest,
  tickMsForTest = 250,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const reduced = usePrefersReducedMotion();
  const dpi = React.useMemo(() => deviceDpi(), []);
  const totalDurationMs = totalDurationMsForTest ?? GAME1.totalDurationMs;

  const [staircase, setStaircase] = React.useState<StaircaseStateV11 | null>(
    null,
  );
  const [trial, setTrial] = React.useState<Game1TrialSpec | null>(null);
  const [phase, setPhase] = React.useState<Phase>('loading');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [showAbort, setShowAbort] = React.useState(false);
  // Sprint 20-B-3：result phase で表示する採点結果と PostCompleteData を保持
  const [resultPayload, setResultPayload] =
    React.useState<G01TrialResult | null>(null);
  const [postData, setPostData] = React.useState<GamePostCompleteData>({
    previousBest: null,
    newlyAwardedBadges: [],
  });

  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  // Sprint 20-B-3：handleTimeUp（useCallback dep=[]）の closure に最新の
  // isCourseMode を届けるための ref。
  const isCourseModeRef = React.useRef(isCourseMode);
  React.useEffect(() => {
    isCourseModeRef.current = isCourseMode;
  }, [isCourseMode]);

  // 初回：staircase 読み込み + 試行生成（タイマーは useGameCountdown が担当）
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadStaircaseV11('G-01');
      if (cancelled) return;
      const t = buildGame1Trial(s.currentParam, rng);
      setStaircase(s);
      setTrial(t);
      setPhase('playing');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 最新の trial / staircase / selectedIds を onTimeUp の closure に届ける ref
  const trialRef = React.useRef<Game1TrialSpec | null>(trial);
  const staircaseRef = React.useRef<StaircaseStateV11 | null>(staircase);
  const selectedIdsRef = React.useRef<string[]>(selectedIds);
  React.useEffect(() => {
    trialRef.current = trial;
  }, [trial]);
  React.useEffect(() => {
    staircaseRef.current = staircase;
  }, [staircase]);
  React.useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  // 60 秒到達 → 自動採点（OPT-11 強制 60 秒視聴）。useGameCountdown が 1 度だけ呼ぶ。
  // Sprint 20-B-3：採点後 result phase に遷移し、同じ Screen 内で ResultOverlay を重畳。
  // 親（onComplete）が Promise<PostCompleteData> を返すならその結果を待ち、previousBest /
  // newlyAwardedBadges を result 描画に反映する。
  const handleTimeUp = React.useCallback(() => {
    const t = trialRef.current;
    const s = staircaseRef.current;
    if (!t || !s) return;
    const ids = selectedIdsRef.current;

    const isAttemptZero = isUnattempted(ids, false);
    const grading = isAttemptZero ? null : gradeGame1(t, ids);
    const isCorrect =
      !isAttemptZero && grading !== null && grading.isCorrectForStaircase;

    // staircase 更新：正解 → applySessionResultV11('correct')、それ以外（未回答 / 部分点 / FP）→ 'incorrect'
    const next = applySessionResultV11(s, isCorrect ? 'correct' : 'incorrect');
    void saveStaircaseV11(next).catch(() => {});

    const threshold = round1(estimateThresholdV11(next));
    const payload: G01TrialResult = {
      thresholdDeg: threshold,
      grading,
      unattempted: isAttemptZero,
      trial: t,
      playedParam: s.currentParam,
      isCorrectForStaircase: isCorrect,
    };
    setResultPayload(payload);
    setPhase('result');
    const maybe = onCompleteRef.current(payload);
    if (maybe && typeof (maybe as Promise<unknown>).then === 'function') {
      void (maybe as Promise<GamePostCompleteData>)
        .then((data) => {
          if (data) setPostData(data);
        })
        .catch(() => {
          // 永続化失敗時は postData を初期値のまま
        });
    }
  }, []);

  const { remainingMs } = useGameCountdown({
    totalDurationMs,
    enabled: phase === 'playing',
    // 中断ダイアログ（showAbort）表示中も外部 paused と同様にタイマーを止める。
    // これでコース時の二重ダイアログ撤去後も、× 押下中は 60 秒タイマーが停止する。
    paused: paused || showAbort,
    onTimeUp: handleTimeUp,
    tickMs: tickMsForTest,
  });

  // morphing progress は remainingMs から導出（screens.md S9-02 §3）。
  // prefers-reduced-motion: reduce 時は 5 段階階段化。
  // v1.1.4：「回転速度を半分に」（ユーザー要望）→ 経過率を 0.5 倍にクランプ
  // （= 60 秒経過時の角度差は currentParam の半分まで）。
  const progress = React.useMemo(() => {
    const rawProgress = Math.min(
      1,
      Math.max(0, 1 - remainingMs / totalDurationMs),
    );
    const slowed = rawProgress * 0.5;
    return reduced ? Math.floor(slowed * 5) / 5 : slowed;
  }, [remainingMs, totalDurationMs, reduced]);

  const handleTogglePatch = React.useCallback(
    (id: string) => {
      if (phase !== 'playing') return;
      setSelectedIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        return [...prev, id];
      });
    },
    [phase],
  );

  const requestAbort = React.useCallback(() => {
    // Sprint 22：play / result 両 phase で × → ConfirmDialog 経由の確認動線。
    setShowAbort(true);
  }, []);

  const confirmAbort = React.useCallback(() => {
    setShowAbort(false);
    onAbort();
  }, [onAbort]);

  if (phase === 'loading' || !trial) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bgCanvas }]}>
        <Text style={[styles.loadingText, { color: colors.fgPrimary }]}>
          準備中…
        </Text>
      </View>
    );
  }

  // Sprint 20-B-3：result phase は同じ Screen 内に G01ResultScreen を重畳。
  if (phase === 'result' && resultPayload) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bgCanvas }}
        testID="g01-change-detect-screen"
      >
        <G01ResultScreen
          result={resultPayload}
          selectedIds={selectedIds}
          previousBestThreshold={postData.previousBest}
          isCourseMode={isCourseMode}
          nextGameLabel={nextGameLabel}
          onNext={onCourseAdvance}
          onAbort={requestAbort}
          onPlayAgain={onPlayAgain}
          onBackToList={onBackToList}
          onGoHome={onGoHome}
          newlyAwardedBadges={postData.newlyAwardedBadges}
        />
        {/* result phase でも × 中断は機能継続（screens.md §2.10） */}
        <ConfirmDialog
          isOpen={showAbort}
          title="ゲームを中断しますか？"
          message="ここまでの記録は未完了として保存されます"
          primaryLabel="続ける"
          secondaryLabel="中断する"
          onPrimaryPress={() => setShowAbort(false)}
          onSecondaryPress={confirmAbort}
        />
      </View>
    );
  }

  const gridMaxSize = computeGridMaxSize();

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
      testID="g01-change-detect-screen"
    >
      <GamePlaySurface
        gameNameJa="G-01 変化察知"
        remainingSeconds={remainingMs / 1000}
        onAbort={requestAbort}
        ariaInstruction="3 行 3 列から 5 行 5 列のグリッドの中で、わずかに角度が変化していくパッチを見つけます。動いていると思うパッチをタップしてください。複数選択可、再タップで解除。60 秒経過で自動採点します。"
        guidanceText="動いていると思うパッチをタップしてください"
        expandedStimulus
        stimulusArea={
          <MorphGridStimulus
            rows={trial.config.rows}
            cols={trial.config.cols}
            patches={trial.patches}
            progress={progress}
            selectedIds={selectedIds}
            onTogglePatch={handleTogglePatch}
            viewingDistanceCm={distanceCm}
            dpi={dpi}
            maxSizePx={gridMaxSize}
            disabled={phase !== 'playing'}
            dataTargetIdPrefix="g01"
          />
        }
        answerChoices={
          // G-01 の選択肢は MorphGridStimulus 内のセル自体。answerChoices には何も置かない
          // が、screen reader 用に空 View を置く（GamePlaySurface 側で role を持つ）
          <View accessibilityElementsHidden />
        }
      />

      <ConfirmDialog
        isOpen={showAbort}
        title="ゲームを中断しますか？"
        message="ここまでの記録は未完了として保存されます"
        primaryLabel="続ける"
        secondaryLabel="中断する"
        onPrimaryPress={() => setShowAbort(false)}
        onSecondaryPress={confirmAbort}
      />
    </View>
  );
};

function deviceDpi(): number {
  return DEFAULT_DPI[estimateDeviceType(Platform.OS)];
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function computeGridMaxSize(): number {
  const { width, height } = Dimensions.get('window');
  const shortSide = Math.min(width, height);
  if (shortSide >= 600) return Math.min(480, shortSide - 96);
  return Math.min(360, shortSide - 32);
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s5,
  },
  loadingText: {
    fontSize: fontSize.body,
  },
});
