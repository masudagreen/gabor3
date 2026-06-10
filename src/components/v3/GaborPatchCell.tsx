/**
 * GaborPatchCell.tsx — GG-2（components.md / F-01、v3.0）。
 *
 * 1 個のガボールパッチ。直接タップでトグル選択（種類選択 UI なし、現在回答テキストなし）。
 * 経過秒 t と v3 PatchDef から現在の orientationDeg を導出して GaborPatch を描画する。
 *
 * 描画戦略（S4 申し送り / GaborPatch の transform 回転）：
 * - 回転（一方向 / 振動）：GaborPatch 内部の transform で安価に連続更新（BMP 再生成なし）。
 *   t に応じて毎フレーム orientationDeg を更新しても BMP は不変。
 *   振動は patchOrientationAt が三角波で往復角を返すため、時計回り↔反時計回りが観察できる
 *  （NF-28c）。reduced-motion でも止めない（NF-13、課題上必須）。
 * - 空間周波数：v3 は回転のみ（cpd は固定。patch には保持せず描画は基準 cpd を使う）。
 *
 * 選択中は控えめ枠（selectionV2.subtle 2px、縞の視認を阻害しない）。
 * 結果開示中は ResultMark を子レイヤとして重畳（中央配置）。
 *
 * a11y：role="checkbox" + aria-checked、aria-label「パッチ {行}-{列}」。
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GaborPatch } from '../GaborPatch';
import { useTheme } from '../../theme/ThemeProvider';
import { useFocusStyle } from '../../theme/focusStyle';
import { webAria } from '../../theme/ariaWeb';
import { webSpaceActivation } from '../../theme/keyActivation';
import { radius, selectionV2 } from '../../theme/tokens';
import type { ViewingDistanceCm } from '../../lib/calibration';
import type { PatchDef } from '../../lib/v3/patch';
import { patchOrientationAt } from '../../lib/v3/patch';
import type { RevealKind } from '../../lib/v3/gameMachine';
import { t } from '../../i18n';
import { ResultMark } from './ResultMark';

/** ガボールのコントラスト・ガウス窓・基準 cpd（system §7 既定、v3 は cpd 固定）。 */
const PATCH_CONTRAST = 0.5;
const PATCH_SIGMA_DEG = 0.6;
const PATCH_CPD = 3; // system §7.4 基準 3 cpd（@40cm）

export type GaborPatchCellProps = {
  patch: PatchDef;
  /** 格子サイズ n（行/列ラベル算出用） */
  gridSize: number;
  /** セル辺長（px） */
  sizePx: number;
  /** 経過秒（描画更新の駆動） */
  elapsedSec: number;
  selected: boolean;
  /** 開示中のマーク種別。none/undefined のときマークなし（試行中） */
  revealKind?: RevealKind;
  viewingDistanceCm: ViewingDistanceCm;
  dpi?: number;
  onToggle: (index: number) => void;
  /** 結果開示中はタップ無効（F-03） */
  disabled?: boolean;
  testId?: string;
};

const GaborPatchCellInner: React.FC<GaborPatchCellProps> = ({
  patch,
  gridSize,
  sizePx,
  elapsedSec,
  selected,
  revealKind,
  viewingDistanceCm,
  dpi,
  onToggle,
  disabled,
  testId,
}) => {
  const { mode } = useTheme();
  const focus = useFocusStyle();
  const selection = selectionV2[mode];

  const row = Math.floor(patch.index / gridSize) + 1;
  const col = (patch.index % gridSize) + 1;
  const label = t('gameV3.patch_label', { row, col });

  // 回転は transform で連続更新（BMP 不変）。cpd は固定。
  const orientationDeg = patchOrientationAt(patch, elapsedSec);

  const showMark = revealKind && revealKind !== 'none';

  return (
    <Pressable
      onPress={() => onToggle(patch.index)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={label}
      {...webAria('checkbox', { checked: selected, disabled: !!disabled }, label)}
      // NF-9：Space で選択トグル（Enter は RN-Web 既定が処理。checkbox は Space 未対応のため補完）
      {...webSpaceActivation(() => onToggle(patch.index), disabled)}
      style={({ pressed }) => [
        styles.cell,
        {
          width: sizePx,
          height: sizePx,
          borderColor: selected ? selection.subtle : 'transparent',
        },
        focus,
        pressed && !disabled && styles.pressed,
      ]}
      testID={testId}
    >
      {/* ガボール画像は装飾。a11y はラッパ Pressable（checkbox）に集約し、
          内部の GaborPatch は SR から隠す（ラベル二重化・正解漏洩を防ぐ）。 */}
      <View
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ 'aria-hidden': true } as any)}
        pointerEvents="none"
      >
        <GaborPatch
          cpd={PATCH_CPD}
          contrast={PATCH_CONTRAST}
          orientationDeg={orientationDeg}
          phaseRad={0}
          sigmaDeg={PATCH_SIGMA_DEG}
          sizePx={sizePx}
          viewingDistanceCm={viewingDistanceCm}
          dpi={dpi}
          ariaLabel=""
        />
      </View>
      {showMark ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ResultMark
            kind={revealKind as Exclude<RevealKind, 'none'>}
            patchSizePx={sizePx}
            testId={testId ? `${testId}-mark` : undefined}
          />
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cell: {
    borderWidth: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.9 },
});

export const GaborPatchCell = React.memo(GaborPatchCellInner);
