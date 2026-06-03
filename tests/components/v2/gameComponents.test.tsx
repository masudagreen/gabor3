/**
 * gameComponents.test.tsx — S4 描画コンポーネント（GG-1/GG-2/CD-1/OV-2/OV-3）。
 *
 * カウントダウン色段階・選択トグル・a11y ラベル非漏洩・結果マーク・総合バッジ・
 * 格子レイアウト算出を検証する。色値は system §1.4 トークン（dark 既定）で確認。
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { countdownV2, resultV2 } from '../../../src/theme/tokens';
import { CountdownTimer } from '../../../src/components/v2/CountdownTimer';
import { ResultMark } from '../../../src/components/v2/ResultMark';
import { AggregateResultBadge } from '../../../src/components/v2/AggregateResultBadge';
import { ConfirmButton } from '../../../src/components/v2/ConfirmButton';
import {
  GaborGrid,
  computeGridEdge,
  computeGap,
  computePatchSize,
} from '../../../src/components/v2/GaborGrid';
import { GaborPatchCell } from '../../../src/components/v2/GaborPatchCell';
import { PatchDef } from '../../../src/lib/v2/patch';

function dark(ui: React.ReactElement) {
  return render(
    <ThemeProvider preference="dark" systemScheme="dark">
      {ui}
    </ThemeProvider>,
  );
}

function flatStyle(node: { props: { style: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  return Array.isArray(s) ? Object.assign({}, ...s.flat(Infinity)) : (s as Record<string, unknown>);
}

function makePatch(index: number, over: Partial<PatchDef> = {}): PatchDef {
  return {
    index,
    changeKind: null,
    initialOrientationDeg: 30,
    initialCpd: 3,
    rotationSpeed: 6,
    rotationDir: 'cw',
    sfChangeSpeed: 0.15,
    sfDir: 'increase',
    ...over,
  };
}

describe('CountdownTimer (CD-1 / F-12)', () => {
  it('数字のみ表示・残り秒を SR ラベルに持つ', () => {
    const { getByTestId } = dark(<CountdownTimer remainingSec={18} testId="cd" />);
    expect(getByTestId('cd-number').props.children).toBe('18');
    expect(screen.getByLabelText('残り 18 秒')).toBeTruthy();
  });

  it('通常時（>5 秒）は normal 色・Bold', () => {
    const { getByTestId } = dark(<CountdownTimer remainingSec={10} testId="cd" />);
    const st = flatStyle(getByTestId('cd-number'));
    expect(st.color).toBe(countdownV2.dark.normal);
    expect(st.fontWeight).toBe('700');
  });

  it('≤5 秒は warn（黄）・Bold', () => {
    const { getByTestId } = dark(<CountdownTimer remainingSec={5} testId="cd" />);
    const st = flatStyle(getByTestId('cd-number'));
    expect(st.color).toBe(countdownV2.dark.warn);
    expect(st.fontWeight).toBe('700');
  });

  it('≤3 秒は danger（赤）・Black(900) 太字補強（NF-12）', () => {
    const { getByTestId } = dark(<CountdownTimer remainingSec={3} testId="cd" />);
    const st = flatStyle(getByTestId('cd-number'));
    expect(st.color).toBe(countdownV2.dark.danger);
    expect(st.fontWeight).toBe('900');
  });

  it('背景は不透明 countdown.bg（縞混入を防ぐ、system §1.4）', () => {
    const { getByTestId } = dark(<CountdownTimer remainingSec={3} testId="cd" />);
    const st = flatStyle(getByTestId('cd'));
    expect(st.backgroundColor).toBe(countdownV2.dark.bg);
  });
});

describe('ResultMark (OV-2 / F-03)', () => {
  it('TP は実線・不透明・正解（選択済み）ラベル', () => {
    dark(<ResultMark kind="tp" patchSizePx={100} testId="m" />);
    expect(screen.getByLabelText('正解（選択済み）')).toBeTruthy();
    const st = flatStyle(screen.getByLabelText('正解（選択済み）'));
    expect(st.opacity).toBe(1);
    expect(st.backgroundColor).toBe(resultV2.dark.overlayBg);
  });

  it('FN は透過 50% で取りこぼしを区別・正解（選び逃し）ラベル', () => {
    dark(<ResultMark kind="fn" patchSizePx={100} testId="m" />);
    const st = flatStyle(screen.getByLabelText('正解（選び逃し）'));
    expect(st.opacity).toBe(0.5);
  });

  it('FP は ❌・不正解（誤選択）ラベル', () => {
    dark(<ResultMark kind="fp" patchSizePx={100} testId="m" />);
    expect(screen.getByLabelText('不正解（誤選択）')).toBeTruthy();
    expect(screen.getByText('✕')).toBeTruthy();
  });

  it('円径はパッチ辺の約 55%（縞を完全には隠さない）', () => {
    dark(<ResultMark kind="tp" patchSizePx={100} testId="m" />);
    const st = flatStyle(screen.getByLabelText('正解（選択済み）'));
    expect(st.width).toBe(55);
    expect(st.height).toBe(55);
  });
});

describe('AggregateResultBadge (OV-3 / F-03)', () => {
  it('success は ✓・正解ラベル・成功背景', () => {
    dark(<AggregateResultBadge kind="success" testId="agg" />);
    expect(screen.getByLabelText('正解')).toBeTruthy();
    expect(screen.getByText('✓')).toBeTruthy();
    const st = flatStyle(screen.getByLabelText('正解'));
    expect(st.backgroundColor).toBe(resultV2.dark.aggregateSuccessBg);
  });

  it('danger は ✕・不正解ラベル', () => {
    dark(<AggregateResultBadge kind="danger" testId="agg" />);
    expect(screen.getByLabelText('不正解')).toBeTruthy();
    expect(screen.getByText('✕')).toBeTruthy();
  });

  it('数値テキストを含まない（F-03 数値禁止）', () => {
    dark(<AggregateResultBadge kind="success" testId="agg" />);
    expect(screen.queryByText(/\d/)).toBeNull();
  });
});

describe('ConfirmButton (BN-1 / F-02 方式②)', () => {
  it('「確定」表示・回答を確定するラベル・押下で onConfirm', () => {
    const onConfirm = jest.fn();
    dark(<ConfirmButton onConfirm={onConfirm} testId="cf" />);
    const btn = screen.getByLabelText('回答を確定する');
    expect(screen.getByText('確定')).toBeTruthy();
    fireEvent.press(btn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('GaborGrid レイアウト算出（GG-1）', () => {
  it('スマホは min(short-32, 360)、PC(>=1024) は 480', () => {
    expect(computeGridEdge(375)).toBe(343);
    expect(computeGridEdge(360)).toBe(328);
    expect(computeGridEdge(1280)).toBe(480);
  });
  it('隙間は n=3 で 8px、n>=4 で 6px', () => {
    expect(computeGap(3)).toBe(8);
    expect(computeGap(4)).toBe(6);
    expect(computeGap(5)).toBe(6);
  });
  it('パッチ辺長 = (全体辺 - 隙間合計)/n（正方形・はみ出さない）', () => {
    // n=4, short=375 → edge=343, gap 6×3=18 → (343-18)/4=81.25 → 81
    expect(computePatchSize(375, 4)).toBe(81);
    // n=3, short=375 → edge=343, gap 8×2=16 → (343-16)/3=109
    expect(computePatchSize(375, 3)).toBe(109);
  });
});

describe('GaborPatchCell (GG-2 / F-01 選択・a11y)', () => {
  const base = {
    gridSize: 4,
    sizePx: 80,
    elapsedSec: 0,
    selected: false,
    viewingDistanceCm: 40 as const,
    onToggle: jest.fn(),
  };

  it('role=checkbox・aria-checked・「パッチ 行-列」ラベル（正解非漏洩）', () => {
    // index 5 → 行 2 / 列 2（gridSize=4）
    dark(<GaborPatchCell {...base} patch={makePatch(5)} testId="cell" />);
    const cell = screen.getByLabelText('パッチ 2-2');
    expect(cell.props.accessibilityRole).toBe('checkbox');
    expect(cell.props.accessibilityState.checked).toBe(false);
  });

  it('変化/静止でラベルが変わらない（変化の種類を漏らさない、AS-2/NF-10）', () => {
    const onToggle = jest.fn();
    const { rerender } = dark(
      <GaborPatchCell
        {...base}
        onToggle={onToggle}
        patch={makePatch(0, { changeKind: 'rotation' })}
        testId="cell"
      />,
    );
    expect(screen.getByLabelText('パッチ 1-1')).toBeTruthy();
    rerender(
      <ThemeProvider preference="dark" systemScheme="dark">
        <GaborPatchCell
          {...base}
          onToggle={onToggle}
          patch={makePatch(0, { changeKind: null })}
          testId="cell"
        />
      </ThemeProvider>,
    );
    // 静止でも同じラベル（変化かどうかが label から判別できない）
    expect(screen.getByLabelText('パッチ 1-1')).toBeTruthy();
  });

  it('タップで onToggle(index) を呼ぶ', () => {
    const onToggle = jest.fn();
    dark(
      <GaborPatchCell {...base} onToggle={onToggle} patch={makePatch(7)} testId="cell" />,
    );
    fireEvent.press(screen.getByLabelText('パッチ 2-4'));
    expect(onToggle).toHaveBeenCalledWith(7);
  });

  it('disabled（開示中）はタップ無効・aria disabled', () => {
    const onToggle = jest.fn();
    dark(
      <GaborPatchCell
        {...base}
        disabled
        onToggle={onToggle}
        patch={makePatch(0)}
        testId="cell"
      />,
    );
    const cell = screen.getByLabelText('パッチ 1-1');
    expect(cell.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(cell);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('markKind を渡すと ResultMark を重畳する（開示中）', () => {
    dark(
      <GaborPatchCell
        {...base}
        markKind="tp"
        patch={makePatch(0)}
        testId="cell"
      />,
    );
    expect(screen.getByLabelText('正解（選択済み）')).toBeTruthy();
  });
});

describe('GaborGrid (GG-1 / F-01)', () => {
  const patches: PatchDef[] = Array.from({ length: 16 }, (_, i) =>
    makePatch(i, i === 1 ? { changeKind: 'rotation' } : {}),
  );
  const base = {
    patches,
    gridSize: 4,
    shortEdgePx: 375,
    elapsedSec: 0,
    viewingDistanceCm: 40 as const,
    onToggle: jest.fn(),
  };

  it('n×n（16 個）のセルを描画し、格子グループラベルを持つ', () => {
    dark(<GaborGrid {...base} selected={new Set()} testId="grid" />);
    expect(screen.getByLabelText('変化しているパッチをすべて選んでください')).toBeTruthy();
    // 全 16 個（行 1-1 〜 4-4）
    expect(screen.getByLabelText('パッチ 1-1')).toBeTruthy();
    expect(screen.getByLabelText('パッチ 4-4')).toBeTruthy();
  });

  it('selected 集合のセルが aria-checked=true', () => {
    dark(<GaborGrid {...base} selected={new Set([5])} testId="grid" />);
    expect(screen.getByLabelText('パッチ 2-2').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('パッチ 1-1').props.accessibilityState.checked).toBe(false);
  });

  it('revealed=true で格子全体 pointer-events=none（タップ無効、F-03）', () => {
    const { getByTestId } = dark(
      <GaborGrid {...base} selected={new Set()} revealed testId="grid" />,
    );
    expect(getByTestId('grid').props.pointerEvents).toBe('none');
  });

  it('marks を渡すと該当セルに開示マークが出る（index 1=tp）', () => {
    dark(
      <GaborGrid
        {...base}
        selected={new Set([1])}
        marks={['none', 'tp', ...Array(14).fill('none')]}
        revealed
        testId="grid"
      />,
    );
    expect(screen.getByLabelText('正解（選択済み）')).toBeTruthy();
  });
});
