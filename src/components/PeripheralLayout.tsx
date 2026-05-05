/**
 * PeripheralLayout — components.md §17 / screens.md S3-01。
 *
 * 固視点を中心に、円周上に等間隔で 8 個のガボールパッチを配置するレイアウト。
 *
 * - 8 ポジションは時計の 12 / 1:30 / 3 / 4:30 / 6 / 7:30 / 9 / 10:30 時に対応
 *   position index 0 = 12 時、時計回りに +45° ずつ
 * - 離心角（°）→ ピクセル変換は calibration.ts 経由
 * - phase='presentation'：パッチ表示
 *   phase='mask'        ：全 8 位置にマスクを描画
 *   phase='fixation' / 'idle' / 'answer'：固視点のみ
 *   phase='feedback'    ：固視点 + 正解位置に矢印
 *
 * 注意：DOM 上で odd one を判別不能にするため、すべての patch View に
 *       同一 testID プレフィックス・同一 accessibilityLabel を付与する
 *       （screens.md S3-01 Round 3 注記）。
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GaborPatch, GaborPatchProps } from './GaborPatch';
import { GaborMask } from './GaborMask';
import { FixationCross } from './FixationCross';
import {
  DEFAULT_DPI,
  degToPixels,
} from '../lib/calibration';
import { palette } from '../theme/tokens';
import {
  PositionIndex,
  angleRadForIndex,
} from '../lib/game3';

export type PeripheralPhase =
  | 'idle'
  | 'fixation'
  | 'presentation'
  | 'mask'
  | 'answer'
  | 'feedback';

export type PeripheralPatch = Pick<
  GaborPatchProps,
  'cpd' | 'contrast' | 'orientationDeg' | 'phaseRad' | 'sigmaDeg'
>;

export type PeripheralLayoutProps = {
  /** 8 個のパッチ仕様（順序：12時, 1:30, 3, ..., 10:30） */
  patches: PeripheralPatch[];
  /** 現在のフェーズ */
  phase: PeripheralPhase;
  /** 離心角（°）— 中心から各パッチ中心までの距離 */
  eccentricityDeg: number;
  /** 視聴距離 */
  viewingDistanceCm: 30 | 40 | 50;
  /** 端末 dpi */
  dpi?: number;
  /** レイアウトの一辺（px、正方形） */
  framePx: number;
  /** 個別パッチのサイズ（px） */
  patchSizePx: number;
  /** feedback 時に矢印で示す正解位置 */
  correctIndex?: PositionIndex;
  /** マスクの seed（テスト容易性） */
  maskSeed?: number;
  testId?: string;
};

export const PeripheralLayout: React.FC<PeripheralLayoutProps> = ({
  patches,
  phase,
  eccentricityDeg,
  viewingDistanceCm,
  dpi = DEFAULT_DPI.pc,
  framePx,
  patchSizePx,
  correctIndex,
  maskSeed,
  testId,
}) => {
  const radiusPx = React.useMemo(() => {
    // 離心角 → px、ただしフレーム内に収める（patch の半分が外に出ないように）
    const raw = degToPixels(viewingDistanceCm, dpi, eccentricityDeg);
    const max = framePx / 2 - patchSizePx / 2 - 4;
    return Math.max(patchSizePx / 2, Math.min(raw, max));
  }, [viewingDistanceCm, dpi, eccentricityDeg, framePx, patchSizePx]);

  const center = framePx / 2;

  const showPatches = phase === 'presentation';
  const showMask = phase === 'mask';
  const showArrow = phase === 'feedback' && correctIndex !== undefined;

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
      testID={testId}
      accessible
      accessibilityLabel="周辺視野ハント、中心に固視点があります"
    >
      {/* 8 個のスロット */}
      {patches.map((patch, idx) => {
        const angle = angleRadForIndex(idx as PositionIndex);
        const x = center + radiusPx * Math.cos(angle);
        const y = center + radiusPx * Math.sin(angle);
        const left = x - patchSizePx / 2;
        const top = y - patchSizePx / 2;

        return (
          <View
            key={idx}
            style={[
              styles.slot,
              {
                width: patchSizePx,
                height: patchSizePx,
                left,
                top,
              },
            ]}
            // a11y / DOM 上で odd one を判別不能にする：
            // 全スロット同一の testID プレフィックスと aria
            testID={testId ? `${testId}-slot-${idx}` : undefined}
            accessibilityLabel="パッチ"
          >
            {showPatches ? (
              <GaborPatch
                cpd={patch.cpd}
                contrast={patch.contrast}
                orientationDeg={patch.orientationDeg}
                phaseRad={patch.phaseRad}
                sigmaDeg={patch.sigmaDeg}
                sizePx={patchSizePx}
                viewingDistanceCm={viewingDistanceCm}
                dpi={dpi}
                ariaLabel="パッチ"
              />
            ) : null}
            {showMask ? (
              <GaborMask
                sizePx={patchSizePx}
                viewingDistanceCm={viewingDistanceCm}
                dpi={dpi}
                seed={maskSeed !== undefined ? maskSeed + idx : undefined}
                cpd={3}
                sigmaDeg={0.6}
              />
            ) : null}
          </View>
        );
      })}

      {/* 中心の固視点（試行中ずっと表示） */}
      <View
        style={[
          styles.fixation,
          { left: center - 8, top: center - 8 },
          // RN Web 0.19+ では pointerEvents は style 経由が推奨
          { pointerEvents: 'none' },
        ]}
        testID={testId ? `${testId}-fixation` : undefined}
      >
        <FixationCross
          sizeDeg={0.5}
          viewingDistanceCm={viewingDistanceCm}
          dpi={dpi}
        />
      </View>

      {/* 正解位置への矢印（feedback フェーズのみ） */}
      {showArrow ? (
        <CorrectArrow
          centerX={center}
          centerY={center}
          radiusPx={radiusPx}
          correctIndex={correctIndex as PositionIndex}
          color={palette.light.highlightCorrect}
        />
      ) : null}
    </View>
  );
};

/**
 * 固視点 → 正解パッチ位置への矢印（feedback 0.8 秒、screens.md S3-01）。
 * 線分の終端に小さい正方形を置いて「矢印」を示す（簡易表現、点滅なし）。
 */
const CorrectArrow: React.FC<{
  centerX: number;
  centerY: number;
  radiusPx: number;
  correctIndex: PositionIndex;
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
        transform: [
          { translateX: 0 },
          { rotate: `${angle}rad` },
          { translateX: 0 },
        ],
        transformOrigin: '0% 50%',
        // RN Web 0.19+ では pointerEvents は style 経由が推奨
        pointerEvents: 'none',
      }}
      accessibilityLabel="正解の方向"
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
