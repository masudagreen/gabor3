/**
 * RadialEightStimulus — GE-03（components.md §15.GE-03、screens.md S11-02）。
 *
 * G-03 周辺視野ハントの注視領域。中央に固視点 + 円周 8 ガボールを 60 秒間ずっと
 * 同時提示する（OPT-12 統一フォーマット）。
 *
 * v1 の `PeripheralLayout` を v1.1 用に再設計したもの：
 *   - マスク関連 prop（showMask / presentationDurationMs / onTimeoutToMask）削除
 *   - 60 秒間ずっと提示する単純な静止配置
 *   - 各ガボールを `ImageChoiceCell` でラップしてタップで直接回答可
 *     （視線をガボールから離さずに済む、Sprint 9 で本実装した動的 aria-checked 動作を活用）
 *   - 採点後の正解開示は `correctIndexHighlight` で正解位置のパッチを 1.5 秒拡大ハイライト
 *   - prefers-reduced-motion 連動：reduced=true なら瞬時表示（黄 4px 枠のみ、
 *     screens.md S11-03 § 4 の演出は scale=1 固定）
 *
 * 親（G03PeripheralHuntScreen / G03ResultScreen）は selectedClockPosition を
 * 保持する。ImageChoiceCell の onToggle は「再タップで解除（null）／別を押すと切替」
 * を実装する。
 */

import React from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import { GaborPatch } from '../../GaborPatch';
import { FixationCross } from '../../FixationCross';
import { ImageChoiceCell } from '../ImageChoiceCell';
import {
  G03ClockPosition,
  G03GaborSpec,
  G03PositionIndex,
  angleRadForIndex,
  clockPositionForIndex,
  clockPositionToJaLabel,
  G03_CLOCK_POSITIONS,
} from '../../../lib/v11/g03Trial';
import {
  DEFAULT_DPI,
  ViewingDistanceCm,
  degToPixels,
} from '../../../lib/calibration';
import { usePrefersReducedMotion } from '../../../lib/motion';
import { getColors, palette } from '../../../theme/tokens';

export type RadialEightStimulusProps = {
  /** 8 ガボールの spec（順序：12時, 1.5, 3, 4.5, 6, 7.5, 9, 10.5 時） */
  patches: ReadonlyArray<G03GaborSpec>;
  /** ガボール領域の辺長（px、screens.md §5：スマホ 320 / PC 400） */
  framePx: number;
  /** 各ガボールの辺長（px、screens.md §5：スマホ 50〜56 / PC 64） */
  patchSizePx: number;
  /** 離心角（°、v1.1 では 8° 固定） */
  eccentricityDeg: number;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  /** 現在の選択（時計ラベル、null = 未選択） */
  selectedClockPosition: G03ClockPosition | null;
  /** 再タップで解除、別タップで切替の実装は本コンポーネント内で完結 */
  onSelectClockPosition: (next: G03ClockPosition | null) => void;
  disabled?: boolean;
  /**
   * 採点後の正解ハイライト（screens.md S11-03 §4）。
   * position index を渡すと該当パッチを 1.5 秒間 scale(1→1.18→1) で拡大表示。
   * reduced-motion 時は瞬時表示（scale=1 固定、黄 4px 枠のみ）。
   */
  correctIndexHighlight?: G03PositionIndex | null;
  /** ハイライト演出の長さ（ms、デフォルト 1500ms）。テスト用 */
  highlightDurationMs?: number;
  /** ハイライト演出ピーク倍率（デフォルト 1.18）。テスト用 */
  highlightPeakScale?: number;
  /**
   * v1.1.2（Sprint 21）：各 8 個のクロック位置パッチに `data-target-id`
   * 属性を `${dataTargetIdPrefix}-${clockPosition}` 形式で付与する。
   * `resultMarks.ts` の `buildG03Marks` が `g03-pos-${pos}` を出すため、
   * G-03 では `g03-pos` を渡す（v1.1.1 では `g03-clock` を渡していたが
   * Sprint 21 で直接選択化に伴い命名を変更）。省略時は付与しない。
   */
  dataTargetIdPrefix?: string;
  testId?: string;
};

/** screens.md S11-03 §4：1.5 秒拡大ハイライト */
const DEFAULT_HIGHLIGHT_DURATION_MS = 1500;
const DEFAULT_HIGHLIGHT_PEAK_SCALE = 1.18;

export const RadialEightStimulus: React.FC<RadialEightStimulusProps> = ({
  patches,
  framePx,
  patchSizePx,
  eccentricityDeg,
  viewingDistanceCm,
  dpi = DEFAULT_DPI.pc,
  selectedClockPosition,
  onSelectClockPosition,
  disabled,
  correctIndexHighlight,
  highlightDurationMs = DEFAULT_HIGHLIGHT_DURATION_MS,
  highlightPeakScale = DEFAULT_HIGHLIGHT_PEAK_SCALE,
  dataTargetIdPrefix,
  testId,
}) => {
  const scheme = useColorScheme() ?? 'light';
  const colors = getColors(scheme);
  void colors;
  const reducedMotion = usePrefersReducedMotion();

  // 円周配置の半径：離心角 → px、ただしフレーム内に収める
  const radiusPx = React.useMemo(() => {
    const raw = degToPixels(viewingDistanceCm, dpi, eccentricityDeg);
    const max = framePx / 2 - patchSizePx / 2 - 4;
    return Math.max(patchSizePx / 2, Math.min(raw, max));
  }, [viewingDistanceCm, dpi, eccentricityDeg, framePx, patchSizePx]);

  const center = framePx / 2;

  // scale アニメーション値（8 個独立）。
  // useRef は配列リテラルだと再生成されてしまうため、レイジー初期化で 1 回だけ作る。
  const scalesRef = React.useRef<Animated.Value[] | null>(null);
  if (scalesRef.current === null) {
    scalesRef.current = Array.from({ length: 8 }, () => new Animated.Value(1));
  }
  const scales = scalesRef.current;

  React.useEffect(() => {
    if (correctIndexHighlight === undefined || correctIndexHighlight === null) {
      return;
    }
    const target = scales[correctIndexHighlight];
    if (!target) return;
    if (reducedMotion) {
      target.setValue(1);
      return;
    }
    const half = highlightDurationMs / 2;
    target.setValue(1);
    Animated.sequence([
      Animated.timing(target, {
        toValue: highlightPeakScale,
        duration: half,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(target, {
        toValue: 1,
        duration: half,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    return () => {
      target.stopAnimation();
    };
  }, [
    correctIndexHighlight,
    reducedMotion,
    highlightDurationMs,
    highlightPeakScale,
    scales,
  ]);

  const handleToggle = React.useCallback(
    (pos: G03ClockPosition) => {
      if (selectedClockPosition === pos) {
        onSelectClockPosition(null);
      } else {
        onSelectClockPosition(pos);
      }
    },
    [selectedClockPosition, onSelectClockPosition],
  );

  return (
    <View
      style={[
        styles.frame,
        {
          width: framePx,
          height: framePx,
          backgroundColor: palette.gabor.bg,
        },
      ]}
      testID={testId ?? 'g03-stimulus'}
      accessibilityRole="radiogroup"
      accessibilityLabel="周辺視野ハントの 8 つの縞模様（中央を見ながら違う向きを探してください）"
    >
      {patches.slice(0, 8).map((patch, idx) => {
        const positionIndex = idx as G03PositionIndex;
        const angle = angleRadForIndex(positionIndex);
        const x = center + radiusPx * Math.cos(angle);
        const y = center + radiusPx * Math.sin(angle);
        const left = x - patchSizePx / 2;
        const top = y - patchSizePx / 2;
        const clockPos = clockPositionForIndex(positionIndex);
        const isSelected =
          selectedClockPosition === clockPos ||
          correctIndexHighlight === positionIndex;
        const scaleValue = scales[idx];

        // a11y：ガボール画像自体には個別ラベルを与えるが、odd one を判別不能に
        // するため、ガボール内部の aria-label は「縞模様」共通文言にする。
        // ImageChoiceCell の ariaLabel に時計位置を入れて回答用 SR 文言にする。
        return (
          <Animated.View
            key={idx}
            style={[
              styles.slot,
              {
                width: patchSizePx,
                height: patchSizePx,
                left,
                top,
                transform: [{ scale: scaleValue }],
              },
            ]}
            testID={`g03-stimulus-slot-${idx}-anim`}
          >
            <ImageChoiceCell
              id={`pos-${idx}`}
              isSelected={isSelected}
              onToggle={() => handleToggle(clockPos)}
              ariaLabel={`時計の${clockPositionToJaLabel(clockPos)}の縞模様（タップで回答）`}
              cellSizePx={patchSizePx}
              role="radio"
              disabled={disabled}
              dataTargetId={
                dataTargetIdPrefix
                  ? `${dataTargetIdPrefix}-${clockPos}`
                  : undefined
              }
              testId={`g03-stimulus-slot-${idx}`}
            >
              <GaborPatch
                cpd={patch.cpd as 1.5 | 3 | 6 | 9}
                contrast={patch.contrast}
                orientationDeg={patch.orientationDeg}
                phaseRad={patch.phaseRad}
                sigmaDeg={patch.sigmaDeg}
                sizePx={patchSizePx - 8}
                viewingDistanceCm={viewingDistanceCm}
                dpi={dpi}
                ariaLabel="縞模様"
              />
            </ImageChoiceCell>
          </Animated.View>
        );
      })}

      {/* 中央の固視点（試行中ずっと表示、SR からは隠す）。
          accessibilityElementsHidden は子の FixationCross が importantForAccessibility=
          "no-hide-descendants" で担当しているため、ここの testID 検索性を担保するため
          親 View には付けない。 */}
      <View
        style={[
          styles.fixation,
          { left: center - 8, top: center - 8 },
          // RN Web 0.19+ では pointerEvents は style 経由が推奨
          { pointerEvents: 'none' },
        ]}
        testID={`${testId ?? 'g03-stimulus'}-fixation`}
      >
        <FixationCross
          sizeDeg={0.5}
          viewingDistanceCm={viewingDistanceCm}
          dpi={dpi}
        />
      </View>

      {/* 正解位置への矢印（correctIndexHighlight があれば feedback 表示） */}
      {correctIndexHighlight !== undefined && correctIndexHighlight !== null ? (
        <CorrectArrow
          centerX={center}
          centerY={center}
          radiusPx={radiusPx}
          correctIndex={correctIndexHighlight}
          color={palette.light.highlightCorrect}
        />
      ) : null}
    </View>
  );
};

/**
 * 固視点 → 正解パッチ位置への矢印（feedback 1.5 秒、screens.md S11-03）。
 * 線分の終端に小さい円を置いて「矢印」を示す（簡易表現、点滅なし）。
 */
const CorrectArrow: React.FC<{
  centerX: number;
  centerY: number;
  radiusPx: number;
  correctIndex: G03PositionIndex;
  color: string;
}> = ({ centerX, centerY, radiusPx, correctIndex, color }) => {
  const angle = angleRadForIndex(correctIndex);
  const tipX = centerX + radiusPx * Math.cos(angle);
  const tipY = centerY + radiusPx * Math.sin(angle);
  const length = Math.hypot(tipX - centerX, tipY - centerY);
  const lineThickness = 4;
  const headSize = 16;

  return (
    <View
      style={{
        position: 'absolute',
        left: centerX,
        top: centerY - lineThickness / 2,
        width: length,
        height: lineThickness,
        backgroundColor: color,
        transform: [{ rotate: `${angle}rad` }],
        transformOrigin: '0% 50%',
        // RN Web 0.19+ では pointerEvents は style 経由が推奨
        pointerEvents: 'none',
      }}
      accessibilityLabel={`正解は${clockPositionToJaLabel(G03_CLOCK_POSITIONS[correctIndex])}`}
      testID="g03-correct-arrow"
    >
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: -(headSize - lineThickness) / 2,
          width: headSize,
          height: headSize,
          backgroundColor: color,
          borderRadius: headSize / 2,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  slot: {
    position: 'absolute',
  },
  fixation: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
