/**
 * G10TextureSegmentationScreen — G-10 テクスチャ分離（spec-v11.md §7.10、screens.md S21-G10-PLAY）。
 *
 * v1.1.2 Sprint 21 直接選択化（screens.md §8）：
 *   - grid-4 テキスト 4 択ボタン（旧 AnswerChoiceGroup）を**完全撤去**
 *   - 8×8 grid を 4 象限の ImageChoiceCell × 4 でラップ → 各象限を直接タップ
 *   - guidance：「違う向きのかたまりはどの象限？」（18pt 以上）
 *   - data-target-id：`g10-tl` / `g10-tr` / `g10-bl` / `g10-br`（resultMarks.ts と整合）
 *
 * v1.1 OPT-12 統一フォーマット：
 *   - 1 試行 = 60 秒固定（早期終了不可）
 *   - 60 秒間ずっと 8×8 = 64 ガボール grid 同時提示（マスクなし、点滅なし、フェードなし）
 *   - 再タップで解除、別を押すと切替（複数選択不可、radio 規約）
 *   - 確定ボタンなし
 *   - 60 秒経過で自動採点
 *   - 未回答 = 不正解、staircase 易方向（向き差を増やす方向 = max=90 方向）
 *
 * staircase 値・採点ロジックは不変。
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
import { TextureGridStimulus } from '../../../components/v11/games/TextureGridStimulus';
import { ImageChoiceCell } from '../../../components/v11/ImageChoiceCell';
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
  buildG10Trial,
  computeG10GridLayout,
  G10GradingResult,
  G10Quadrant,
  G10TrialSpec,
  GAME10_V11,
  gradeG10,
} from '../../../lib/v11/g10Trial';
import {
  fontSize,
  getColors,
  spacing,
} from '../../../theme/tokens';
import { G10ResultScreen } from './G10ResultScreen';
import { GamePostCompleteData } from './_shared/types';

/** G-10 1 試行終了時に親に返す結果 */
export type G10TrialResult = {
  /** 今回の閾値（直近 5 セッション平均、整数°） */
  thresholdDeg: number;
  /** 採点結果 */
  grading: G10GradingResult;
  /** 試行のスペック */
  trial: G10TrialSpec;
  /** 親が staircase 平均と一緒に「前回比」を計算するために使う今回の使用パラメータ */
  playedParam: number;
  /** staircase 判定上の正解 */
  isCorrectForStaircase: boolean;
};

export type G10TextureSegmentationScreenProps = {
  distanceCm: ViewingDistanceCm;
  onAbort: () => void;
  /** Sprint 20-B-3：60 秒経過時に親が永続化等を行い、Promise<PostCompleteData> を返す */
  onComplete: (
    result: G10TrialResult,
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

export const G10TextureSegmentationScreen: React.FC<
  G10TextureSegmentationScreenProps
> = ({
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
  const totalDurationMs = totalDurationMsForTest ?? GAME10_V11.totalDurationMs;

  const [staircase, setStaircase] = React.useState<StaircaseStateV11 | null>(
    null,
  );
  const [trial, setTrial] = React.useState<G10TrialSpec | null>(null);
  const [phase, setPhase] = React.useState<Phase>('loading');
  const [selectedQuadrant, setSelectedQuadrant] =
    React.useState<G10Quadrant | null>(null);
  const [showAbort, setShowAbort] = React.useState(false);
  const [resultPayload, setResultPayload] =
    React.useState<G10TrialResult | null>(null);
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
      const s = await loadStaircaseV11('G-10');
      if (cancelled) return;
      const t = buildG10Trial(s.currentParam, rng);
      setStaircase(s);
      setTrial(t);
      setPhase('playing');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 最新の trial / staircase / selectedQuadrant を onTimeUp の closure に届ける ref
  const trialRef = React.useRef<G10TrialSpec | null>(trial);
  const staircaseRef = React.useRef<StaircaseStateV11 | null>(staircase);
  const selectedQuadrantRef =
    React.useRef<G10Quadrant | null>(selectedQuadrant);
  React.useEffect(() => {
    trialRef.current = trial;
  }, [trial]);
  React.useEffect(() => {
    staircaseRef.current = staircase;
  }, [staircase]);
  React.useEffect(() => {
    selectedQuadrantRef.current = selectedQuadrant;
  }, [selectedQuadrant]);

  // 60 秒到達 → 自動採点（OPT-11）。useGameCountdown が 1 度だけ呼ぶ。
  const handleTimeUp = React.useCallback(() => {
    const t = trialRef.current;
    const s = staircaseRef.current;
    if (!t || !s) return;

    const grading = gradeG10(t, selectedQuadrantRef.current);
    const isCorrect = grading.isCorrect;

    const next = applySessionResultV11(s, isCorrect ? 'correct' : 'incorrect');
    void saveStaircaseV11(next).catch(() => {});

    const threshold = round0(estimateThresholdV11(next));
    const payload: G10TrialResult = {
      thresholdDeg: threshold,
      grading,
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

  const handleQuadrantToggle = React.useCallback(
    (q: G10Quadrant) => {
      if (phase !== 'playing') return;
      // 再タップで解除、別タップで切替（radio）
      setSelectedQuadrant((prev) => (prev === q ? null : q));
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

  // Sprint 20-B-3：result phase は同じ Screen 内に G10ResultScreen を重畳。
  if (phase === 'result' && resultPayload) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bgCanvas }}
        testID="g10-texture-segmentation-screen"
      >
        <G10ResultScreen
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
  const layout = computeG10GridLayout(vpW);

  // 8×8 grid 全体の辺長（gap 込み）= 8*cellSize + 7*gap。象限はその半分。
  const gridSidePx =
    layout.cellSizePx * 8 + layout.gapPx * 7;
  const quadrantSidePx = gridSidePx / 2;

  // 4 象限の定義（screens.md §8）：tl / tr / bl / br
  const QUADRANTS: ReadonlyArray<{
    q: G10Quadrant;
    targetId: string;
    label: string;
    ariaLabel: string;
    top: number;
    left: number;
  }> = [
    {
      q: 'top-left',
      targetId: 'g10-tl',
      label: '左上',
      ariaLabel: '左上の象限',
      top: 0,
      left: 0,
    },
    {
      q: 'top-right',
      targetId: 'g10-tr',
      label: '右上',
      ariaLabel: '右上の象限',
      top: 0,
      left: quadrantSidePx,
    },
    {
      q: 'bottom-left',
      targetId: 'g10-bl',
      label: '左下',
      ariaLabel: '左下の象限',
      top: quadrantSidePx,
      left: 0,
    },
    {
      q: 'bottom-right',
      targetId: 'g10-br',
      label: '右下',
      ariaLabel: '右下の象限',
      top: quadrantSidePx,
      left: quadrantSidePx,
    },
  ];

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
      testID="g10-texture-segmentation-screen"
    >
      <GamePlaySurface
        gameNameJa="G-10 テクスチャ分離"
        remainingSeconds={remainingMs / 1000}
        onAbort={requestAbort}
        ariaInstruction="画面いっぱいに敷き詰められた縞模様の中で、向きが違う 3×3 のかたまりがどの象限にあるかを左上・右上・左下・右下から直接タップしてください。気が変われば何度でも変更可。確定ボタンはありません。60 秒経過で自動採点します。"
        guidanceText="違う向きのかたまりはどの象限？"
        stimulusInteractive
        stimulusArea={
          <View
            style={{
              width: gridSidePx,
              height: gridSidePx,
              position: 'relative',
            }}
            testID="g10-stimulus-wrapper"
            accessibilityRole="radiogroup"
            accessibilityLabel="違う向きのかたまりがある象限を選んでください"
          >
            <TextureGridStimulus
              cells={trial.cells}
              cellSizePx={layout.cellSizePx}
              gapPx={layout.gapPx}
              viewingDistanceCm={distanceCm}
              dpi={dpi}
              testId="g10-stimulus"
            />
            {QUADRANTS.map(({ q, targetId, ariaLabel, top, left }) => (
              <View
                key={q}
                style={{
                  position: 'absolute',
                  top,
                  left,
                  width: quadrantSidePx,
                  height: quadrantSidePx,
                }}
              >
                <ImageChoiceCell
                  id={q}
                  isSelected={selectedQuadrant === q}
                  onToggle={() => handleQuadrantToggle(q)}
                  ariaLabel={ariaLabel}
                  cellSizePx={quadrantSidePx}
                  role="radio"
                  disabled={phase !== 'playing'}
                  // ガボール本体の視認性を阻害しないため透明背景。
                  // 枠は薄枠（color.selection.subtle）のままで象限境界示唆。
                  transparentBackground
                  // disabled でも視覚的減衰は無し（下層ガボールが見える状態を維持）
                  dimOnDisabled={false}
                  dataTargetId={targetId}
                  testId={`g10-quadrant-${q}`}
                >
                  {/* 中身は空（ガボールパッチは下層 TextureGridStimulus が描画） */}
                  <View style={{ width: 0, height: 0 }} />
                </ImageChoiceCell>
              </View>
            ))}
          </View>
        }
        answerChoices={null}
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

/** 向き差は整数°に丸める（gameRegistry.step=5 と整合） */
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
