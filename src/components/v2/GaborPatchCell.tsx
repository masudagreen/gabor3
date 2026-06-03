/**
 * GaborPatchCell.tsx — GG-2（components.md / F-01）。
 *
 * 1 個のガボールパッチ。直接タップでトグル選択（種類選択 UI なし、現在回答テキストなし）。
 * 経過秒 t と PatchDef から現在の orientationDeg / cpd を導出して GaborPatch を描画する。
 *
 * 描画戦略（S1 申し送り）：
 * - 回転（a deg/sec）：GaborPatch 内部の transform で安価に連続回転（BMP 再計算不要）。
 *   よって t に応じて毎フレーム orientationDeg を更新しても BMP は再生成されない。
 * - 空間周波数：v2.0 仕様変更で周波数変化アニメは廃止。cpd はパッチ固有の固定値
 *   （様々な周波数の多様性は維持）。BMP は cpd 固定なので 1 度だけ生成され、点滅しない。
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
import { radius, selectionV2 } from '../../theme/tokens';
import type { ViewingDistanceCm } from '../../lib/calibration';
import { PatchDef } from '../../lib/v2/patch';
import { patchCpdAt, patchOrientationAt } from '../../lib/v2/patch';
import { ResultMarkKind } from '../../lib/v2/gameView';
import { t } from '../../i18n';
import { ResultMark } from './ResultMark';

/** ガボールのコントラスト・ガウス窓（system §7 既定）。 */
const PATCH_CONTRAST = 0.5;
const PATCH_SIGMA_DEG = 0.6;

export type GaborPatchCellProps = {
  patch: PatchDef;
  /** 格子サイズ n（行/列ラベル算出用） */
  gridSize: number;
  /** セル辺長（px） */
  sizePx: number;
  /** ラウンド経過秒（描画更新の駆動） */
  elapsedSec: number;
  selected: boolean;
  /** 開示中のマーク種別。none/undefined のときマークなし（試行中） */
  markKind?: ResultMarkKind;
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
  markKind,
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
  const label = t('game.patch_label', { row, col });

  // 回転は transform で連続更新（BMP 不変）。cpd は固定（時間変化なし）。
  const orientationDeg = patchOrientationAt(patch, elapsedSec);
  const cpd = patchCpdAt(patch);

  const showMark = markKind && markKind !== 'none';

  return (
    <Pressable
      onPress={() => onToggle(patch.index)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={label}
      {...webAria('checkbox', { checked: selected, disabled: !!disabled }, label)}
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
          cpd={cpd}
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
            kind={markKind as Exclude<ResultMarkKind, 'none'>}
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
