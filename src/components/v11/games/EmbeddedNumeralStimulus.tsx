/**
 * EmbeddedNumeralStimulus — GE-13（components.md §15、screens.md S17-05）。
 *
 * G-13 数字探しの注視領域。ガウシアン風のノイズ背景上に、低コントラストで
 * 数字（0〜9）が埋め込まれた合成画像を 60 秒間ずっと表示する（マスクなし、
 * 点滅なし、フェードなし）。
 *
 * spec-v11.md §7.13 / Pelli-Robson 系：
 *   - ノイズ：背景画素値ランダム（決定論的、seed 駆動）
 *   - 数字：低コントラスト（staircase 値の alpha）で重ね描画
 *   - 注視を続けることで埋もれた形が浮かび上がる「ポップアウト効果」を活用
 *
 * a11y（components.md §15.GE-13）：
 *   - stimulus 領域全体は accessibilityElementsHidden（SR 非到達、
 *     回答は AnswerChoiceGroup keypad-10 の 10 ボタン経由）
 *   - GamePlaySurface 側で `accessibilityElementsHidden` でくるまれる前提
 *
 * 採点後の正解開示（screens.md S17-06 §3）：
 *   highlightDigit を渡したとき、数字を本来の高コントラスト（1.0）で 1.5 秒
 *   表示する（reduced-motion 時は瞬時切替）。
 *
 * 描画方法：
 *   - ノイズ層：8×8 = 64 個の半グレー濃度ランダム矩形（seed 決定論）
 *   - 数字層：中央に大きな数字テキスト（フォントサイズ stimulus の 60%）を
 *     低 opacity で重ねる
 *
 * Sprint 17 設計判断：
 *   - Web/RN 共通の View + Text で実装する（Canvas / SVG は依存追加が大きいため避ける）
 *   - ノイズ粒度はパフォーマンスのため 8×8（実機 30fps 維持目安）
 */

import React from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { palette } from '../../../theme/tokens';
import {
  contrastToDigitAlpha,
  createNoiseRng,
  G13Digit,
} from '../../../lib/v11/g13Trial';

/**
 * ノイズ粒度（一辺セル数）。パフォーマンスと「ノイズらしさ」のバランス。
 * v1.1.4：「数字をもっと見にくく」（ユーザー要望）→ 8 → 16 に細分化（粗い数字輪郭がノイズに埋もれやすくなる）
 */
const NOISE_GRID = 16;

/** 採点後の正解開示時間（ms） */
const DEFAULT_HIGHLIGHT_DURATION_MS = 1500;

export type EmbeddedNumeralStimulusProps = {
  /** 埋め込まれた数字（0〜9） */
  digit: G13Digit;
  /** 数字の表示コントラスト（0〜1、staircase 連動）。`contrastToDigitAlpha` で alpha 換算 */
  contrast: number;
  /** ノイズパターン生成 seed（決定論的描画、buildG13Trial の noiseSeed） */
  noiseSeed: number;
  /** stimulus 全体の辺長（px、正方形） */
  stimulusSizePx: number;
  /**
   * 採点後の正解開示。指定時は数字を 1.0 alpha + ハイライトカラーで表示する。
   * undefined / null：通常描画（contrast に応じた半透明）。
   */
  highlightDigit?: G13Digit | null;
  /** ハイライト演出の長さ（ms、デフォルト 1500ms）。テスト用 */
  highlightDurationMs?: number;
  testId?: string;
};

export const EmbeddedNumeralStimulus: React.FC<
  EmbeddedNumeralStimulusProps
> = ({
  digit,
  contrast,
  noiseSeed,
  stimulusSizePx,
  highlightDigit,
  highlightDurationMs = DEFAULT_HIGHLIGHT_DURATION_MS,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  // ハイライト時の数字色：scheme に依存（dark なら明るい色、light なら暗い色）
  const highlightDigitColor = scheme === 'dark' ? '#ffffff' : '#000000';

  // ハイライト時に数字 alpha を高めるためのアニメーション値
  const highlightAlpha = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (highlightDigit == null) {
      highlightAlpha.setValue(0);
      return;
    }
    Animated.timing(highlightAlpha, {
      toValue: 1,
      duration: Math.min(300, Math.floor(highlightDurationMs / 5)),
      useNativeDriver: true,
    }).start();
    return () => {
      highlightAlpha.stopAnimation();
    };
  }, [highlightDigit, highlightDurationMs, highlightAlpha]);

  // ノイズパターン（決定論、seed 駆動）
  const noiseCells = React.useMemo(() => {
    const rng = createNoiseRng(noiseSeed);
    const cells: number[] = [];
    for (let i = 0; i < NOISE_GRID * NOISE_GRID; i++) {
      // v1.1.4：濃度幅を 0.3〜0.7 → 0.2〜0.8 に拡大（コントラスト幅が大きく、数字が埋もれやすい）
      cells.push(0.2 + rng() * 0.6);
    }
    return cells;
  }, [noiseSeed]);

  const cellSizePx = stimulusSizePx / NOISE_GRID;
  const baseId = testId ?? 'embedded-numeral-stimulus';
  const digitAlpha = contrastToDigitAlpha({ contrast });

  // 全体の accessibilityElementsHidden は GamePlaySurface 側でくるまれる前提（spec §7.13、
  // TextureGridStimulus と同じパターン）。本コンポーネント自体はテストでも testID を
  // 直接辿れるよう accessibilityElementsHidden をルートに付けない。
  return (
    <View
      style={[
        styles.container,
        {
          width: stimulusSizePx,
          height: stimulusSizePx,
          backgroundColor: palette.gabor.bg,
        },
      ]}
      testID={baseId}
    >
      {/* ノイズ層（accessibilityElementsHidden、SR 非到達） */}
      <View
        style={[StyleSheet.absoluteFillObject, styles.noiseGrid]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID={`${baseId}-noise`}
      >
        {noiseCells.map((v, i) => {
          const row = Math.floor(i / NOISE_GRID);
          const col = i % NOISE_GRID;
          const grayCh = Math.round(v * 255);
          const bg = `rgb(${grayCh}, ${grayCh}, ${grayCh})`;
          return (
            <View
              key={`noise-${i}`}
              style={{
                position: 'absolute',
                left: col * cellSizePx,
                top: row * cellSizePx,
                width: cellSizePx,
                height: cellSizePx,
                backgroundColor: bg,
              }}
              testID={`${baseId}-noise-${row}-${col}`}
            />
          );
        })}
      </View>

      {/* 通常時の数字（半透明、staircase 値の alpha） */}
      <View
        style={[StyleSheet.absoluteFillObject, styles.center]}
        testID={`${baseId}-digit-base`}
      >
        <Text
          style={{
            fontSize: stimulusSizePx * 0.6,
            fontWeight: '900',
            color: '#000000',
            opacity: highlightDigit == null ? digitAlpha : 0,
            // 数字フォントの線幅を太めに（埋もれを表現するために形状重視）
            textAlign: 'center',
            lineHeight: stimulusSizePx * 0.7,
            includeFontPadding: false,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {String(digit)}
        </Text>
      </View>

      {/* 採点後の正解開示：本来コントラストの数字 + 黄色アクセント */}
      {highlightDigit != null ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.center,
            { opacity: highlightAlpha },
          ]}
          testID={`${baseId}-digit-highlight`}
        >
          <Text
            style={{
              fontSize: stimulusSizePx * 0.6,
              fontWeight: '900',
              color: highlightDigitColor,
              textAlign: 'center',
              lineHeight: stimulusSizePx * 0.7,
              includeFontPadding: false,
              // 黄色のアウトラインで強調（ResultSummaryV11 の黄ハイライト規約）
              textShadowColor: palette.light.highlightCorrect,
              textShadowRadius: 6,
              textShadowOffset: { width: 0, height: 0 },
            }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {String(highlightDigit)}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  noiseGrid: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
