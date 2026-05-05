/**
 * ExperienceScreen — オンボーディング 1-6（screens.md S4-06）。
 *
 * Sprint 2 の Game 1 を流用しつつ、以下を変更：
 *   - 試行時間：60 秒 → 20 秒（オンボーディング時短）
 *   - 難易度：固定 3×3 / 同時変化数 1 / 角度差 8°（最易）
 *   - 結果サマリは出さず、即座に親へ完了通知（onDone）
 *   - 中断 × ボタンは無効化、戻る矢印のみ
 *   - staircase 状態は更新しない（練習扱い）
 *   - 完了ボタンが押されるか 20 秒経過で完了
 *
 * 「試しの 1 回です」を SR で 1 回読み上げ（accessibilityLiveRegion）。
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
} from '../../theme/tokens';
import { Button } from '../../components/Button';
import { GaborGrid } from '../../components/GaborGrid';
import { IconButton } from '../../components/IconButton';
import {
  buildGame1Trial,
  Game1TrialSpec,
} from '../../lib/game1';
import {
  DEFAULT_DPI,
  estimateDeviceType,
  ViewingDistanceCm,
} from '../../lib/calibration';

/** オンボーディング体験用の固定パラメータ（screens.md S4-06） */
const EXPERIENCE = {
  totalDurationMs: 20_000,
  /** 角度差 8°（最易、3×3、変化 1 個 → difficultyFromParam(>6) で easy 確定） */
  paramDeg: 8,
} as const;

export type ExperienceScreenProps = {
  distanceCm: ViewingDistanceCm;
  dpi?: number;
  onDone: () => void;
  onBack: () => void;
  /** テスト用：rng / 即時完了など */
  rng?: () => number;
  /** テスト用：試行時間を短縮 */
  durationMsOverride?: number;
};

export const ExperienceScreen: React.FC<ExperienceScreenProps> = ({
  distanceCm,
  dpi,
  onDone,
  onBack,
  rng,
  durationMsOverride,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  const totalMs = durationMsOverride ?? EXPERIENCE.totalDurationMs;
  const resolvedDpi = dpi ?? DEFAULT_DPI[estimateDeviceType(Platform.OS)];

  const trialRef = React.useRef<Game1TrialSpec>(
    buildGame1Trial(EXPERIENCE.paramDeg, rng),
  );
  const [progress, setProgress] = React.useState(0);
  const [remainingMs, setRemainingMs] = React.useState(totalMs);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [done, setDone] = React.useState(false);

  const startedAtRef = React.useRef<number>(Date.now());
  const tickerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // タイマー開始
  React.useEffect(() => {
    startedAtRef.current = Date.now();
    tickerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      const remaining = totalMs - elapsed;
      const p = Math.min(1, Math.max(0, elapsed / totalMs));
      setProgress(p);
      setRemainingMs(Math.max(0, remaining));
      if (remaining <= 0 && tickerRef.current) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
    }, 200);
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [totalMs]);

  // 時間切れ → 自動完了
  React.useEffect(() => {
    if (remainingMs <= 0 && !done) {
      setDone(true);
      // 1 フレーム待ってから親へ通知
      setTimeout(onDone, 50);
    }
  }, [remainingMs, done, onDone]);

  const handleToggle = React.useCallback(
    (id: string) => {
      if (done) return;
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    },
    [done],
  );

  const handleComplete = React.useCallback(() => {
    if (done) return;
    setDone(true);
    if (tickerRef.current) clearInterval(tickerRef.current);
    onDone();
  }, [done, onDone]);

  const trial = trialRef.current;
  const remainingSec = Math.ceil(remainingMs / 1000);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCanvas }]}
      testID="onboarding-experience"
    >
      <View style={styles.header}>
        <IconButton
          icon="back"
          ariaLabel="戻る"
          onPress={onBack}
          testId="experience-back"
        />
        <Text
          accessibilityLabel={`残り時間 ${remainingSec} 秒`}
          style={[styles.timer, { color: colors.fgPrimary }]}
        >
          残り {remainingSec} 秒
        </Text>
      </View>

      <View style={styles.center}>
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.guide, { color: colors.fgPrimary }]}
        >
          試しの 1 回です。{'\n'}変化したパッチをタップしてください
        </Text>
        <GaborGrid
          rows={trial.config.rows}
          cols={trial.config.cols}
          patches={trial.patches}
          progress={progress}
          selectedIds={selectedIds}
          onTogglePatch={handleToggle}
          viewingDistanceCm={distanceCm}
          dpi={resolvedDpi}
          maxSizePx={computeGridMaxSize()}
          disabled={done}
          testId="experience-grid"
        />
      </View>

      <View style={styles.bottom}>
        <Button
          variant="primary"
          size="lg"
          label="完了して次へ"
          onPress={handleComplete}
          disabled={done}
          fullWidth
          testId="experience-complete"
        />
      </View>
    </View>
  );
};

function computeGridMaxSize(): number {
  const { width, height } = Dimensions.get('window');
  const shortSide = Math.min(width, height);
  if (shortSide >= 600) return Math.min(420, shortSide - 96);
  return Math.min(320, shortSide - 32);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timer: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold as '700',
    fontVariant: ['tabular-nums'],
    marginRight: spacing.s4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s4,
    gap: spacing.s4,
  },
  guide: {
    fontSize: fontSize.body,
    textAlign: 'center',
    lineHeight: fontSize.body * 1.5,
    marginBottom: spacing.s2,
  },
  bottom: {
    padding: spacing.s4,
    paddingBottom: spacing.s6,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
});
