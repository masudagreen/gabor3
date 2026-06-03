/**
 * webAriaComponents.test.tsx — NF-15 是正の DOM 透過をコンポーネント単位で検証。
 *
 * S10 評価 Minor 1〜4：
 *  1. SegmentedControl（採点方式ラジオ）: role=radio + aria-checked
 *  2. Toggle（音/振動）: role=switch + aria-checked
 *  3. GaborPatchCell（選択パッチ）: role=checkbox + aria-checked
 *  4. BadgeCell（バッジ展開）: role=button + aria-expanded
 *  5. SettingRow（radio）: role=radio + aria-checked（採点方式行）
 *
 * Web 透過は Platform.OS==='web' のときのみ webAria() が props を返す。
 * jest-expo の既定は ios のため、asWeb() で一時的に web へ切替えて検証する。
 *
 * 注意：テストランナー（jest-expo）は **react-native コア**で描画するため、
 * 渡した `aria-checked` 等は createDOMProps（react-native-web 本体）ではなく
 * RN コアによって `accessibilityState` へ正規化される。よって観測点は：
 *  - `role`：webAria が返したときのみ付与される（web 分岐が走った証跡）。
 *  - `accessibilityState`：aria-* が host へ受理され checked/expanded が反映された証跡。
 * webAria 自体の生 DOM props（aria-checked 等）は ariaWeb.test.tsx で直接検証済み。
 */

import React from 'react';
import { Platform } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { Toggle } from '../../src/components/v2/Toggle';
import { SegmentedControl } from '../../src/components/v2/SegmentedControl';
import { BadgeCell } from '../../src/components/v2/BadgeCell';
import { GaborPatchCell } from '../../src/components/v2/GaborPatchCell';
import type { BadgeViewRow } from '../../src/lib/v2/badgeView';
import type { PatchDef } from '../../src/lib/v2/patch';

function asWeb<T>(fn: () => T): T {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
  try {
    return fn();
  } finally {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => original,
    });
  }
}

function wrap(node: React.ReactElement) {
  return <ThemeProvider preference="light">{node}</ThemeProvider>;
}

describe('Toggle — role=switch + aria-checked（NF-15 / Minor 2）', () => {
  it('Web では DOM へ aria-checked を透過する', () => {
    asWeb(() => {
      render(wrap(<Toggle value accessibilityLabel="効果音" onChange={jest.fn()} />));
      const sw = screen.getByRole('switch');
      expect(sw.props.role).toBe('switch');
      expect(sw.props.accessibilityState.checked).toBe(true);
    });
  });

  it('Native では aria-checked を出さない（accessibilityState が担う）', () => {
    render(wrap(<Toggle value={false} accessibilityLabel="振動" onChange={jest.fn()} />));
    const sw = screen.getByRole('switch');
    expect(sw.props['aria-checked']).toBeUndefined();
    expect(sw.props.accessibilityState.checked).toBe(false);
  });
});

describe('SegmentedControl — role=radio + aria-checked（NF-15 / Minor 1）', () => {
  it('Web では選択セグメントに aria-checked=true、非選択に false を透過', () => {
    asWeb(() => {
      render(
        wrap(
          <SegmentedControl
            options={[
              { value: 3, label: '3' },
              { value: 4, label: '4' },
            ]}
            value={4}
            onChange={jest.fn()}
            accessibilityLabel="格子サイズ"
          />,
        ),
      );
      const radios = screen.getAllByRole('radio');
      expect(radios[0].props.role).toBe('radio');
      expect(radios[0].props.accessibilityState.checked).toBe(false);
      expect(radios[1].props.accessibilityState.checked).toBe(true);
      // グループも role=radiogroup を DOM へ透過
      expect(screen.getByLabelText('格子サイズ').props.role).toBe('radiogroup');
    });
  });
});

describe('BadgeCell — role=button + aria-expanded（NF-15 / Minor 4）', () => {
  const earnedRow: BadgeViewRow = {
    id: 'B-01',
    axis: 'streak',
    name: '3日連続',
    earned: true,
    earnedDate: '2026-05-30',
    hint: '3日続ける',
    condition: '3日連続でプレイすると獲得',
  };

  it('Web では初期 aria-expanded=false を透過する', () => {
    asWeb(() => {
      render(wrap(<BadgeCell row={earnedRow} testId="badge" />));
      const cell = screen.getByTestId('badge');
      expect(cell.props.role).toBe('button');
      expect(cell.props.accessibilityState.expanded).toBe(false);
    });
  });
});

describe('GaborPatchCell — role=checkbox + aria-checked（NF-15 / Minor 3）', () => {
  const patch: PatchDef = {
    index: 5,
    changeKind: 'both',
    initialOrientationDeg: 30,
    initialCpd: 3,
    rotationSpeed: 6,
    rotationDir: 'cw',
    sfChangeSpeed: 0.15,
    sfDir: 'increase',
  };

  it('Web では選択中パッチに aria-checked=true を透過する', () => {
    asWeb(() => {
      render(
        wrap(
          <GaborPatchCell
            patch={patch}
            gridSize={4}
            sizePx={60}
            elapsedSec={0}
            selected
            viewingDistanceCm={40}
            onToggle={jest.fn()}
            testId="cell"
          />,
        ),
      );
      const cell = screen.getByTestId('cell');
      expect(cell.props.role).toBe('checkbox');
      expect(cell.props.accessibilityState.checked).toBe(true);
    });
  });
});
