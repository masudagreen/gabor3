/**
 * ResultOverlayLayer.tsx — OV-1（components.md / F-03、v3.0）。
 *
 * 締め切り後、画面遷移せずガボール格子の上に重畳するレイヤ。
 * - 各パッチ上の ResultMark（OV-2）は GaborGridV3 の reveal 経由でセル内に描画される。
 *   本レイヤは「総合クリア/失敗の視覚表示（OV-3）」と「SR 読み上げ」を担う。
 * - 出現時 motion.duration.result 200ms フェードイン（reduced-motion 0ms）。
 * - 出現時 aria-live="assertive" で「クリア」/「失敗」を 1 度読み上げ（NF-10）。
 * - 内部数値テキストは画面に一切出さない（F-03）。
 * - v3.1：`srOnly` 指定時は視覚バッジ（AggregateResultBadge）を描画せず、読み上げのみを担う
 *   （総合の視覚表示は CenterResultMark が格子中心で行うため、視覚は重複させない）。
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
import type { GameResult } from '../../lib/v3/level';
import { t } from '../../i18n';
import { AggregateResultBadge } from './AggregateResultBadge';

export type ResultOverlayLayerProps = {
  result: GameResult;
  /** true なら視覚バッジを出さず SR 読み上げのみ（総合の視覚は CenterResultMark が担う、v3.1）。 */
  srOnly?: boolean;
  testId?: string;
};

export const ResultOverlayLayer: React.FC<ResultOverlayLayerProps> = ({
  result,
  srOnly = false,
  testId,
}) => {
  const opacity = React.useRef(new Animated.Value(0)).current;

  const announce =
    result === 'clear'
      ? t('resultV3.aggregate_clear')
      : t('resultV3.aggregate_fail');

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
    // SR へ 1 度だけ「クリア」/「失敗」を読み上げ（aria-live=assertive 相当、F-03 / NF-10）。
    AccessibilityInfo.announceForAccessibility(announce);
    return () => {
      cancelled = true;
    };
    // 出現時に 1 回だけ実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity }]} testID={testId}>
      <Text
        style={styles.srOnly}
        accessibilityLiveRegion="assertive"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ 'aria-live': 'assertive' } as any)}
      >
        {announce}
      </Text>
      {srOnly ? null : (
        <AggregateResultBadge
          result={result}
          testId={testId ? `${testId}-aggregate` : undefined}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
});
