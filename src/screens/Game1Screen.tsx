/**
 * Game1Screen — Sprint 2 のメインプレイ画面（screens.md S2-03 / spec.md §7.1）。
 *
 * 流れ（仕様改訂：強制 60 秒視聴）：
 *   1. 起動時：staircase 読み込み → 1 試行のパッチ群を生成
 *   2. 60 秒間、progress を 0 → 1 にリニア更新（モーフィング）。早期終了は不可
 *   3. ユーザーは変化したと思うパッチをタップ（多重選択可、再タップで解除）。
 *      残り時間 0 秒まで自由に選択を変更できる
 *   4. 60 秒経過 → 自動採点 → 1.5 秒拡大ハイライト → 結果画面へ
 *   5. 緊急時のみ × ボタンで中断（ConfirmDialog 経由、staircase 非反映）
 *
 * 未挑戦判定（screens.md S2-03 §4 / spec.md §7.1）：
 *   60 秒経過時にタップ 0 件のとき：
 *     - 結果は「未挑戦」（TrialRecord.isCorrect = null）
 *     - staircase は up（易方向）
 *     - グリッド上に変化していたパッチを 1.5 秒拡大ハイライト
 *
 * 仕様変更履歴：
 *   - 旧：完了ボタン押下 or 60 秒経過で採点
 *   - 新：60 秒経過のみで採点（強制視聴。アプリの目的「ガボールアイを見せる」に合致）
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
import {
  fontSize,
  fontWeight,
  getColors,
  spacing,
} from '../theme/tokens';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { GameStatusBar } from '../components/GameStatusBar';
import { GaborGrid } from '../components/GaborGrid';
import {
  GAME1,
  Game1GradingResult,
  Game1TrialSpec,
  buildGame1Trial,
  gradeGame1,
  isUnattempted,
} from '../lib/game1';
import {
  DEFAULT_DPI,
  estimateDeviceType,
} from '../lib/calibration';
import {
  StaircaseState,
  applyTrialResult,
} from '../lib/staircase';
import {
  loadStaircase,
  saveStaircase,
} from '../state/storage';
import { playCorrect } from '../lib/audio';
import { lightImpact } from '../lib/haptics';
import { useAppForeground } from '../lib/appState';
import { usePrefersReducedMotion, scaleDuration } from '../lib/motion';

export type Game1Result = {
  /** 今回の閾値（最大角度差 °） */
  thresholdDeg: number;
  /** 採点結果（未挑戦時は null） */
  grading: Game1GradingResult | null;
  /** 未挑戦かどうか */
  unattempted: boolean;
  /** 試行のスペック（変化対象 ID 等を結果画面で使う） */
  trial: Game1TrialSpec;
};

export type Game1ScreenProps = {
  distanceCm: 30 | 40 | 50;
  onAbort: () => void;
  onComplete: (result: Game1Result) => void;
  /** テスト用：乱数注入 */
  rng?: () => number;
};

type Phase =
  | 'loading'
  | 'playing'
  | 'highlighting' // 採点後の 1.5 秒拡大ハイライト
  | 'done';

export const Game1Screen: React.FC<Game1ScreenProps> = ({
  distanceCm,
  onAbort,
  onComplete,
  rng,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const dpi = React.useMemo(() => deviceDpi(), []);

  const reduced = usePrefersReducedMotion();

  const [staircase, setStaircase] = React.useState<StaircaseState | null>(null);
  const [trial, setTrial] = React.useState<Game1TrialSpec | null>(null);
  const [phase, setPhase] = React.useState<Phase>('loading');
  const [progress, setProgress] = React.useState(0);
  const [remainingMs, setRemainingMs] = React.useState<number>(
    GAME1.totalDurationMs,
  );
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [grading, setGrading] = React.useState<Game1GradingResult | null>(null);
  const [unattempted, setUnattempted] = React.useState(false);
  const [showAbort, setShowAbort] = React.useState(false);

  const startedAtRef = React.useRef<number>(Date.now());
  const tickerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // 初回：staircase 読み込み + 試行生成
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadStaircase('game1');
      if (cancelled) return;
      const t = buildGame1Trial(s.currentParam, rng);
      setStaircase(s);
      setTrial(t);
      setPhase('playing');
      startedAtRef.current = Date.now();
      // タイマー：250ms 毎に progress 更新 + 残り時間
      tickerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        const remaining = GAME1.totalDurationMs - elapsed;
        const p = Math.min(1, Math.max(0, elapsed / GAME1.totalDurationMs));
        setProgress(p);
        setRemainingMs(Math.max(0, remaining));
        if (remaining <= 0 && tickerRef.current) {
          clearInterval(tickerRef.current);
          tickerRef.current = null;
        }
      }, 250);
    })();
    return () => {
      cancelled = true;
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 60 秒到達 → 自動採点（screens.md S2-03 §4 / 仕様改訂：強制 60 秒視聴）
  React.useEffect(() => {
    if (phase !== 'playing') return;
    if (remainingMs <= 0) {
      finalizeTrial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, remainingMs]);

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

  // 仕様改訂：完了ボタンを廃止したため、本関数は常に「60 秒経過 = 自動採点」経由でのみ呼ばれる。
  // isUnattempted の completedByButton は常に false（純関数 API は維持）。
  const finalizeTrial = React.useCallback(
    () => {
      if (!trial || !staircase) return;
      if (phase !== 'playing') return;

      if (tickerRef.current) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }

      const isAttemptZero = isUnattempted(selectedIds, false);
      const result = isAttemptZero ? null : gradeGame1(trial, selectedIds);

      // 正解時の音声 + ハプティクス（Settings ON 時のみ実発火、no-op 安全）
      if (result?.isCorrectForStaircase) {
        playCorrect();
        lightImpact();
      }

      // staircase 更新：
      //   - 未挑戦：spec.md §7.1 → up（易方向）
      //   - 挑戦かつ全正解：correct（down）
      //   - 挑戦かつ不正解 or 部分点：incorrect（up）
      const outcome: 'correct' | 'incorrect' | 'noResponse' = isAttemptZero
        ? 'noResponse'
        : result?.isCorrectForStaircase
          ? 'correct'
          : 'incorrect';
      const updated = applyTrialResult(staircase, outcome);
      void saveStaircase(updated).catch(() => {});

      setGrading(result);
      setUnattempted(isAttemptZero);
      setPhase('highlighting');

      // 1.5 秒後に結果画面へ。reduce-motion 時は瞬時遷移（NF-11 / screens.md S7-11）。
      const highlightMs = scaleDuration(GAME1.highlightDurationMs, reduced);
      setTimeout(() => {
        setPhase('done');
        onComplete({
          thresholdDeg: round1(updated.currentParam),
          grading: result,
          unattempted: isAttemptZero,
          trial,
        });
      }, highlightMs);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trial, staircase, phase, selectedIds],
  );

  const requestAbort = React.useCallback(() => {
    if (phase === 'playing') {
      setShowAbort(true);
    } else {
      // 採点中・done でも中断可能（保険）
      onAbort();
    }
  }, [phase, onAbort]);

  // バックグラウンド遷移：spec.md A-8 中断
  // 未完了試行として扱い、staircase は触らずホームへ戻す
  useAppForeground({
    onBackground: () => {
      if (phase === 'playing' || phase === 'highlighting') {
        if (tickerRef.current) clearInterval(tickerRef.current);
        onAbort();
      }
    },
  });

  const confirmAbort = React.useCallback(() => {
    if (tickerRef.current) clearInterval(tickerRef.current);
    setShowAbort(false);
    onAbort();
  }, [onAbort]);

  if (phase === 'loading' || !trial || !staircase) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
        <Text style={[styles.loading, { color: colors.fgPrimary }]}>準備中…</Text>
      </View>
    );
  }

  const gridMaxSize = computeGridMaxSize();
  const isHighlighting = phase === 'highlighting';
  const highlightChangingIds = isHighlighting
    ? trial.patches.filter((p) => p.isChanging).map((p) => p.id)
    : undefined;

  // 案内テキスト（先頭 3 秒のみ表示、screens.md S2-03）
  const showGuide = phase === 'playing' && remainingMs > GAME1.totalDurationMs - 3000;
  const showHighlightAnnounce = isHighlighting;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCanvas }]}>
      <GameStatusBar
        remainingSeconds={remainingMs / 1000}
        onAbort={requestAbort}
      />
      <View style={styles.center}>
        {showGuide ? (
          <>
            <Text style={[styles.guide, { color: colors.fgPrimary }]}>
              変化したパッチをタップ
            </Text>
            <Text style={[styles.subGuide, { color: colors.fgSecondary }]}>
              60 秒のあいだ、何度でも選び直せます
            </Text>
          </>
        ) : null}
        {showHighlightAnnounce ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.guide, { color: colors.fgPrimary }]}
          >
            {unattempted
              ? '時間切れです。変化していたパッチを表示します'
              : '採点しました。正解箇所を表示します'}
          </Text>
        ) : null}
        <GaborGrid
          rows={trial.config.rows}
          cols={trial.config.cols}
          patches={trial.patches}
          progress={progress}
          selectedIds={selectedIds}
          onTogglePatch={handleTogglePatch}
          highlightChangingIds={highlightChangingIds}
          viewingDistanceCm={distanceCm}
          dpi={dpi}
          maxSizePx={gridMaxSize}
          disabled={phase !== 'playing'}
          testId="game1-grid"
        />
        <Text style={[styles.counter, { color: colors.fgPrimary }]}>
          選択中: {selectedIds.length} 個
        </Text>
      </View>

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
  // 余白考慮：最大 360（スマホ）/ 480（PC 想定）
  if (shortSide >= 600) return Math.min(480, shortSide - 96);
  return Math.min(360, shortSide - 32);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s4,
    gap: spacing.s4,
  },
  guide: {
    fontSize: fontSize.body, // 24px
    textAlign: 'center',
    marginBottom: spacing.s1,
  },
  subGuide: {
    fontSize: fontSize.caption, // 18pt 相当（OPT-7 / OPT-6 優しい言い回し）
    textAlign: 'center',
    marginBottom: spacing.s2,
  },
  counter: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium as '600',
  },
  loading: {
    flex: 1,
    fontSize: fontSize.body,
    textAlign: 'center',
    textAlignVertical: 'center',
    marginTop: spacing.s8,
  },
});
