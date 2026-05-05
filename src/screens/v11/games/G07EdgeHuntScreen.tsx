/**
 * G07EdgeHuntScreen — G-07 ガボールエッジ検出（spec-v11.md §7.7、screens.md S14-05）。
 *
 * v1.1 OPT-12 統一フォーマット：
 *   - 1 試行 = 60 秒固定（早期終了不可）
 *   - 4×4 = 16 個のガボールパッチを 60 秒間ずっと表示（マスクなし、点滅なし、フェードなし）
 *   - うち 3 個が同じ向き・同一線上に並ぶ「線」を構成
 *   - 各パッチ直接タップで選択、再タップで解除（複数選択可、checkbox 系）
 *   - 確定ボタンなし、60 秒経過で自動採点
 *   - 採点：正解 3 個をすべて選択 = 正解、1 個でも誤りや欠落で不正解
 *   - 未回答（1 個も選んでいない）= 不正解、staircase 易方向（向きズレ許容角を増やす方向 = max=10° 方向）
 *
 * G-01 変化察知の構造を参考に、グリッド型ゲームとして実装。注視領域は GE-07
 * GaborGridStimulus（4×4）。answerChoices は空（パッチ自体が選択肢）。
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
import { GaborGridStimulus } from '../../../components/v11/games/GaborGridStimulus';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useGameCountdown } from '../../../hooks/v11/useGameCountdown';
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
import {
  buildG07Trial,
  computeG07GridLayout,
  G07GradingResult,
  G07TrialSpec,
  GAME7_V11,
  gradeG07,
} from '../../../lib/v11/g07Trial';
import {
  fontSize,
  getColors,
  spacing,
} from '../../../theme/tokens';
import { G07ResultScreen } from './G07ResultScreen';
import { GamePostCompleteData } from './_shared/types';

/** G-07 1 試行終了時に親に返す結果 */
export type G07TrialResult = {
  /** 今回の閾値（直近 5 セッション平均、四捨五入 0 桁） */
  thresholdDeg: number;
  /** 採点結果 */
  grading: G07GradingResult;
  /** 試行のスペック */
  trial: G07TrialSpec;
  /** ユーザーが最終的に選んだ ID 集合（順序保持しない） */
  userSelectedIds: ReadonlyArray<string>;
  /** 親が staircase 平均と一緒に「前回比」を計算するために使う今回の使用パラメータ */
  playedParam: number;
  /** staircase 判定上の正解 */
  isCorrectForStaircase: boolean;
};

export type G07EdgeHuntScreenProps = {
  distanceCm: ViewingDistanceCm;
  onAbort: () => void;
  /** Sprint 20-B-3：60 秒経過時に親が永続化等を行い、Promise<PostCompleteData> を返す */
  onComplete: (
    result: G07TrialResult,
  ) => Promise<GamePostCompleteData> | void;
  /** コース中断ダイアログ等で 60 秒タイマーを一時停止したいとき true。既定 false */
  paused?: boolean;
  /** Sprint 20-B-3：コースモード時 true */
  isCourseMode?: boolean;
  /** Sprint 20-B-3：コース時、次のゲーム表示用ラベル（最終なら null） */
  nextGameLabel?: string | null;
  /** Sprint 20-B-3：result phase で「次へ」（コース時） */
  onCourseAdvance?: () => void;
  /** Sprint 20-B-3：単体時の 3 ボタン */
  onPlayAgain?: () => void;
  onBackToList?: () => void;
  onGoHome?: () => void;
  /** テスト用：乱数注入 */
  rng?: () => number;
  /** テスト用：60 秒タイマーの代替 */
  totalDurationMsForTest?: number;
  tickMsForTest?: number;
};

type Phase = 'loading' | 'playing' | 'result';

export const G07EdgeHuntScreen: React.FC<G07EdgeHuntScreenProps> = ({
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
  const dpi = React.useMemo(() => deviceDpi(), []);
  const totalDurationMs = totalDurationMsForTest ?? GAME7_V11.totalDurationMs;

  const [staircase, setStaircase] = React.useState<StaircaseStateV11 | null>(
    null,
  );
  const [trial, setTrial] = React.useState<G07TrialSpec | null>(null);
  const [phase, setPhase] = React.useState<Phase>('loading');
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const [showAbort, setShowAbort] = React.useState(false);
  const [resultPayload, setResultPayload] =
    React.useState<G07TrialResult | null>(null);
  const [postData, setPostData] = React.useState<GamePostCompleteData>({
    previousBest: null,
    newlyAwardedBadges: [],
  });

  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  const isCourseModeRef = React.useRef(isCourseMode);
  React.useEffect(() => {
    isCourseModeRef.current = isCourseMode;
  }, [isCourseMode]);

  // 初回：staircase 読み込み + 試行生成（タイマーは useGameCountdown が担当）
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadStaircaseV11('G-07');
      if (cancelled) return;
      const t = buildG07Trial(s.currentParam, rng);
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
  const trialRef = React.useRef<G07TrialSpec | null>(trial);
  const staircaseRef = React.useRef<StaircaseStateV11 | null>(staircase);
  const selectedIdsRef =
    React.useRef<ReadonlyArray<string>>(selectedIds);
  React.useEffect(() => {
    trialRef.current = trial;
  }, [trial]);
  React.useEffect(() => {
    staircaseRef.current = staircase;
  }, [staircase]);
  React.useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  // 60 秒到達 → 自動採点（OPT-11）。useGameCountdown が 1 度だけ呼ぶ。
  const handleTimeUp = React.useCallback(() => {
    const t = trialRef.current;
    const s = staircaseRef.current;
    if (!t || !s) return;
    const ids = selectedIdsRef.current;

    const grading = gradeG07(t, ids);
    const isCorrect = grading.isCorrect;

    const next = applySessionResultV11(s, isCorrect ? 'correct' : 'incorrect');
    void saveStaircaseV11(next).catch(() => {});

    const threshold = round0(estimateThresholdV11(next));
    const payload: G07TrialResult = {
      thresholdDeg: threshold,
      grading,
      trial: t,
      userSelectedIds: ids,
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
        .catch(() => {});
    }
  }, []);

  const { remainingMs } = useGameCountdown({
    totalDurationMs,
    enabled: phase === 'playing',
    // 中断ダイアログ表示中もタイマーを停止（コース時の二重ダイアログ撤去対応）
    paused: paused || showAbort,
    onTimeUp: handleTimeUp,
    tickMs: tickMsForTest,
  });

  const handleToggleCell = React.useCallback(
    (id: string) => {
      if (phase !== 'playing') return;
      setSelectedIds((prev) => {
        const set = new Set(prev);
        if (set.has(id)) {
          set.delete(id);
        } else {
          set.add(id);
        }
        return Array.from(set);
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

  // Sprint 20-B-3：result phase は同じ Screen 内に G07ResultScreen を重畳。
  if (phase === 'result' && resultPayload) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bgCanvas }}
        testID="g07-edge-hunt-screen"
      >
        <G07ResultScreen
          result={resultPayload}
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

  const { width: vpW } = Dimensions.get('window');
  const { cellSizePx, gapPx } = computeG07GridLayout({ widthPx: vpW });

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
      testID="g07-edge-hunt-screen"
    >
      <GamePlaySurface
        gameNameJa="G-07 ガボールエッジ検出"
        remainingSeconds={remainingMs / 1000}
        onAbort={requestAbort}
        ariaInstruction="4×4 のガボールパッチ盤面の中に、縞の向きがそろって一列に並ぶ 3 個のパッチがあります。他のパッチは縞の向きがバラバラ。縞の向きが同じで「線」のように並んでいる 3 個全部をタップで選んでください。複数選択可、再タップで解除。確定ボタンはありません。60 秒経過で自動採点します。"
        guidanceText="縞の向きがそろって並んでいる 3 個を選んでください"
        stimulusArea={
          <GaborGridStimulus
            patches={trial.patches}
            cellSizePx={cellSizePx}
            gapPx={gapPx}
            viewingDistanceCm={distanceCm}
            dpi={dpi}
            selectedIds={selectedIds}
            onToggleCell={handleToggleCell}
            disabled={phase !== 'playing'}
            dataTargetIdPrefix="g07"
            testId="g07-stimulus"
          />
        }
        answerChoices={
          // G-07 の選択肢は GaborGridStimulus 内のセル自体。answerChoices には何も置かない
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

/** 向きズレ許容角は整数°に丸める（gameRegistry.step=1 と整合） */
function round0(v: number): number {
  return Math.round(v);
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
