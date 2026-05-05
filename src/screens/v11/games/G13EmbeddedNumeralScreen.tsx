/**
 * G13EmbeddedNumeralScreen — G-13 数字探し（spec-v11.md §7.13、screens.md S17-05）。
 *
 * v1.1 OPT-12 統一フォーマット：
 *   - 1 試行 = 60 秒固定（早期終了不可）
 *   - 60 秒間ずっとノイズ + 微小コントラスト数字を同時提示（マスクなし、点滅なし、フェードなし）
 *   - 「0」〜「9」キーパッド（keypad-10）で回答
 *   - 再タップで解除、別を押すと切替（複数選択不可、radio 規約）
 *   - 確定ボタンなし
 *   - 60 秒経過で自動採点
 *   - 未回答 = 不正解、staircase 易方向（コントラスト増 = max=0.30 方向）
 *
 * staircase 値は **数字のコントラスト**（gameRegistry G-13 entry:
 * min 0.03 / max 0.30 / initial 0.10 / step 0.01）。
 *
 * 構造は G09LateralMaskingScreen / G11VernierAlignmentScreen の流用。違いは：
 *   - 注視領域が EmbeddedNumeralStimulus（GE-13）
 *   - staircase 値が「コントラスト」（小数 2 桁）
 *   - 選択肢が 0〜9 keypad（keypad-10）
 *   - Web 0〜9 数字キーで選択肢操作可（enableNumericKeyboard）
 */

import React from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { GamePlaySurface } from '../../../components/v11/GamePlaySurface';
import { EmbeddedNumeralStimulus } from '../../../components/v11/games/EmbeddedNumeralStimulus';
import { AnswerChoiceGroup } from '../../../components/v11/AnswerChoiceGroup';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useGameCountdown } from '../../../hooks/v11/useGameCountdown';
import { ViewingDistanceCm } from '../../../lib/calibration';
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
  buildG13Trial,
  computeG13StimulusLayout,
  G13_ALL_DIGITS,
  G13Digit,
  G13GradingResult,
  G13TrialSpec,
  GAME13_V11,
  gradeG13,
} from '../../../lib/v11/g13Trial';
import {
  fontSize,
  getColors,
  spacing,
} from '../../../theme/tokens';
import { G13ResultScreen } from './G13ResultScreen';
import { GamePostCompleteData } from './_shared/types';

/** G-13 1 試行終了時に親に返す結果 */
export type G13TrialResult = {
  /** 今回の閾値（直近 5 セッション平均、コントラスト、小数 2 桁） */
  thresholdContrast: number;
  /** 採点結果 */
  grading: G13GradingResult;
  /** 試行のスペック */
  trial: G13TrialSpec;
  /** 親が staircase 平均と一緒に「前回比」を計算するために使う今回の使用パラメータ */
  playedParam: number;
  /** staircase 判定上の正解 */
  isCorrectForStaircase: boolean;
};

export type G13EmbeddedNumeralScreenProps = {
  distanceCm: ViewingDistanceCm;
  onAbort: () => void;
  /** Sprint 20-B-3：60 秒経過時に親が永続化等を行い、Promise<PostCompleteData> を返す */
  onComplete: (
    result: G13TrialResult,
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

/** 0〜9 の id="数字" 形式の AnswerChoice 配列を作る */
const KEYPAD_CHOICES: ReadonlyArray<{ id: string; label: string }> =
  G13_ALL_DIGITS.map((d) => ({ id: String(d), label: String(d) }));

export const G13EmbeddedNumeralScreen: React.FC<
  G13EmbeddedNumeralScreenProps
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
  const totalDurationMs = totalDurationMsForTest ?? GAME13_V11.totalDurationMs;
  // distanceCm は spec §6 では直接使わないが、将来の物理的キャリブレーション拡張に
  // 備え API の一貫性のため受け取っている。実装上は描画サイズが viewport で
  // 決まるため未使用（layout 関数経由）。
  void distanceCm;

  const [staircase, setStaircase] = React.useState<StaircaseStateV11 | null>(
    null,
  );
  const [trial, setTrial] = React.useState<G13TrialSpec | null>(null);
  const [phase, setPhase] = React.useState<Phase>('loading');
  const [selectedDigit, setSelectedDigit] = React.useState<G13Digit | null>(
    null,
  );
  const [showAbort, setShowAbort] = React.useState(false);
  const [resultPayload, setResultPayload] =
    React.useState<G13TrialResult | null>(null);
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
      const s = await loadStaircaseV11('G-13');
      if (cancelled) return;
      const t = buildG13Trial(s.currentParam, rng);
      setStaircase(s);
      setTrial(t);
      setPhase('playing');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 最新の trial / staircase / selectedDigit を onTimeUp の closure に届ける ref
  const trialRef = React.useRef<G13TrialSpec | null>(trial);
  const staircaseRef = React.useRef<StaircaseStateV11 | null>(staircase);
  const selectedDigitRef = React.useRef<G13Digit | null>(selectedDigit);
  React.useEffect(() => {
    trialRef.current = trial;
  }, [trial]);
  React.useEffect(() => {
    staircaseRef.current = staircase;
  }, [staircase]);
  React.useEffect(() => {
    selectedDigitRef.current = selectedDigit;
  }, [selectedDigit]);

  // 60 秒到達 → 自動採点（OPT-11）。useGameCountdown が 1 度だけ呼ぶ。
  const handleTimeUp = React.useCallback(() => {
    const t = trialRef.current;
    const s = staircaseRef.current;
    if (!t || !s) return;

    const grading = gradeG13(t, selectedDigitRef.current);
    const isCorrect = grading.isCorrect;

    const next = applySessionResultV11(s, isCorrect ? 'correct' : 'incorrect');
    void saveStaircaseV11(next).catch(() => {});

    const threshold = round2(estimateThresholdV11(next));
    const payload: G13TrialResult = {
      thresholdContrast: threshold,
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

  const handleSelectFromGroup = React.useCallback(
    (id: string | null) => {
      if (phase !== 'playing') return;
      if (id === null) {
        setSelectedDigit(null);
        return;
      }
      const n = Number(id);
      if (Number.isInteger(n) && n >= 0 && n <= 9) {
        setSelectedDigit(n as G13Digit);
      }
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

  // Sprint 20-B-3：result phase は同じ Screen 内に G13ResultScreen を重畳。
  if (phase === 'result' && resultPayload) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bgCanvas }}
        testID="g13-embedded-numeral-screen"
      >
        <G13ResultScreen
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
  const layout = computeG13StimulusLayout(vpW);

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
      testID="g13-embedded-numeral-screen"
    >
      <GamePlaySurface
        gameNameJa="G-13 数字探し"
        remainingSeconds={remainingMs / 1000}
        onAbort={requestAbort}
        ariaInstruction="ノイズの中に薄く埋め込まれた 0〜9 の数字を「0」〜「9」のキーパッドから選んでください。じーっと見続けると埋もれた数字が浮かび上がります。気が変われば何度でも変更可。確定ボタンはありません。60 秒経過で自動採点します。"
        guidanceText="何の数字が埋まっている？"
        stimulusArea={
          <EmbeddedNumeralStimulus
            digit={trial.embeddedDigit}
            contrast={trial.paramContrast}
            noiseSeed={trial.noiseSeed}
            stimulusSizePx={layout.stimulusSizePx}
            testId="g13-stimulus"
          />
        }
        answerChoices={
          <AnswerChoiceGroup
            choices={KEYPAD_CHOICES}
            variant="numeric"
            selectedId={selectedDigit !== null ? String(selectedDigit) : null}
            onSelect={handleSelectFromGroup}
            layout="keypad-10"
            ariaLabelGroup="埋め込まれた数字（0〜9）"
            disabled={phase !== 'playing'}
            keypadButtonSizePx={layout.keypadButtonSizePx}
            enableNumericKeyboard
            // Sprint 20 ラウンド 3：buildG13Marks の `g13-key-${digit}` と
            // choice.id ("0".."9") を組み合わせて targetId を生成
            dataTargetIdPrefix="g13-key"
            testId="g13-answer-choice"
          />
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

/** コントラストは小数 2 桁（gameRegistry.step=0.01 と整合） */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
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
