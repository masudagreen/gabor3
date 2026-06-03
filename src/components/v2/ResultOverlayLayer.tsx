/**
 * ResultOverlayLayer.tsx — OV-1（components.md / F-03）。
 *
 * 採点後、画面遷移せずガボール格子の上に重畳するレイヤ。
 * - 各パッチ上の ResultMark（OV-2）は GaborGrid の marks 経由でセル内に描画される。
 *   本レイヤは「刺激領域直下の総合 ✅/❌（OV-3）」と「SR 読み上げ」を担う。
 * - 出現時 motion.duration.result 200ms フェードイン（reduced-motion 0ms）。
 * - 出現時 aria-live="assertive" で「正解」/「不正解」+ TP/FP/FN 要約を 1 度読み上げ。
 * - 数値テキストは画面に一切出さない（SR の要約は視覚表示しない隠しテキスト）。
 */

import React from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { motion } from '../../theme/tokens';
import { AggregateKind } from '../../lib/v2/gameView';
import { RoundScore } from '../../lib/v2/scoring';
import { t } from '../../i18n';
import { AggregateResultBadge } from './AggregateResultBadge';

export type ResultOverlayLayerProps = {
  aggregate: AggregateKind;
  /** SR 要約に使うラウンド採点（数値は視覚表示しない） */
  score: RoundScore;
  testId?: string;
};

export const ResultOverlayLayer: React.FC<ResultOverlayLayerProps> = ({
  aggregate,
  score,
  testId,
}) => {
  // 初期値 0、reduced-motion なら即 1（フェードなし）。
  const opacity = React.useRef(new Animated.Value(0)).current;

  const summary = t('result.summary', {
    aggregate: aggregate === 'success' ? t('result.correct') : t('result.wrong'),
    tp: score.tpCount,
    fp: score.fpCount,
    fn: score.fnCount,
  });

  React.useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (cancelled) return;
        if (reduced) {
          opacity.setValue(1);
        } else {
          Animated.timing(opacity, {
            toValue: 1,
            duration: motion.durationBase,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        }
      })
      .catch(() => opacity.setValue(1));
    // SR へ 1 度だけ要約を読み上げ（aria-live=assertive 相当、F-03 / NF-10）
    AccessibilityInfo.announceForAccessibility(summary);
    return () => {
      cancelled = true;
    };
    // 出現時に 1 回だけ実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity }]} testID={testId}>
      {/* 視覚的には総合バッジのみ。SR 要約は隠しテキスト（assertive live region） */}
      <Text
        style={styles.srOnly}
        accessibilityLiveRegion="assertive"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ 'aria-live': 'assertive' } as any)}
      >
        {summary}
      </Text>
      <View accessibilityElementsHidden={false}>
        <AggregateResultBadge
          kind={aggregate}
          testId={testId ? `${testId}-aggregate` : undefined}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // SR 専用：視覚的に隠すが読み上げ可能（react-native-web で position:absolute + 0 size）
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
});
