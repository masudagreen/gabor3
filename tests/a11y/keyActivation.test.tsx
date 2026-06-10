/**
 * keyActivation.test.tsx — NF-9（Web で Enter/Space 起動）。
 *
 * S5 申し送り：RN-Web の Pressable は非 button ロール（checkbox/tab/radio/switch）で
 * Space では onPress を発火しない（Enter のみ）。S11 で webSpaceActivation により
 * これらに Space 起動を補完した。本テストは：
 *   1. webSpaceActivation 純関数の挙動（Web で Space のみ起動・Enter は委譲・preventDefault）。
 *   2. GaborPatchCell / Toggle / SegmentedControl が Web で onKeyDown を持ち、Space で起動すること。
 *   3. Native では onKeyDown を付与しないこと。
 */

import React from 'react';
import { Platform } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { webSpaceActivation } from '../../src/theme/keyActivation';
import { GaborPatchCell } from '../../src/components/v3/GaborPatchCell';
import { Toggle } from '../../src/components/v2/Toggle';
import { SegmentedControl } from '../../src/components/v2/SegmentedControl';
import type { PatchDef } from '../../src/lib/v3/patch';

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

describe('webSpaceActivation（純関数）', () => {
  it('Web では onKeyDown を返し、Space で onActivate + preventDefault する', () => {
    asWeb(() => {
      const onActivate = jest.fn();
      const props = webSpaceActivation(onActivate) as {
        onKeyDown: (e: { key: string; preventDefault: () => void }) => void;
      };
      expect(typeof props.onKeyDown).toBe('function');
      const prevent = jest.fn();
      props.onKeyDown({ key: ' ', preventDefault: prevent });
      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(prevent).toHaveBeenCalledTimes(1);
    });
  });

  it('Web では Enter を無視する（RN-Web 既定に委譲、二重起動を避ける）', () => {
    asWeb(() => {
      const onActivate = jest.fn();
      const props = webSpaceActivation(onActivate) as {
        onKeyDown: (e: { key: string; preventDefault: () => void }) => void;
      };
      props.onKeyDown({ key: 'Enter', preventDefault: jest.fn() });
      expect(onActivate).not.toHaveBeenCalled();
    });
  });

  it('disabled のときは Space でも起動しない', () => {
    asWeb(() => {
      const onActivate = jest.fn();
      const props = webSpaceActivation(onActivate, true) as {
        onKeyDown: (e: { key: string; preventDefault: () => void }) => void;
      };
      props.onKeyDown({ key: ' ', preventDefault: jest.fn() });
      expect(onActivate).not.toHaveBeenCalled();
    });
  });

  it('Native では空オブジェクト（onKeyDown なし）', () => {
    const props = webSpaceActivation(jest.fn());
    expect(props.onKeyDown).toBeUndefined();
  });
});

describe('GaborPatchCell（role=checkbox）の Space 起動', () => {
  const patch: PatchDef = {
    index: 2,
    changeKind: 'rotation',
    initialOrientationDeg: 10,
    rotationSpeed: 6,
    rotationDir: 'cw',
    direction: 'one-way',
  };

  it('Web では onKeyDown を持ち、Space でトグルする', () => {
    asWeb(() => {
      const onToggle = jest.fn();
      render(
        wrap(
          <GaborPatchCell
            patch={patch}
            gridSize={3}
            sizePx={60}
            elapsedSec={0}
            selected={false}
            viewingDistanceCm={40}
            onToggle={onToggle}
            testId="cell"
          />,
        ),
      );
      const cell = screen.getByTestId('cell');
      expect(typeof cell.props.onKeyDown).toBe('function');
      cell.props.onKeyDown({ key: ' ', preventDefault: jest.fn() });
      expect(onToggle).toHaveBeenCalledWith(2);
    });
  });

  it('結果開示中（disabled）は Space で起動しない', () => {
    asWeb(() => {
      const onToggle = jest.fn();
      render(
        wrap(
          <GaborPatchCell
            patch={patch}
            gridSize={3}
            sizePx={60}
            elapsedSec={0}
            selected={false}
            viewingDistanceCm={40}
            onToggle={onToggle}
            disabled
            testId="cell"
          />,
        ),
      );
      const cell = screen.getByTestId('cell');
      cell.props.onKeyDown({ key: ' ', preventDefault: jest.fn() });
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  it('Native では onKeyDown を付与しない', () => {
    const onToggle = jest.fn();
    render(
      wrap(
        <GaborPatchCell
          patch={patch}
          gridSize={3}
          sizePx={60}
          elapsedSec={0}
          selected={false}
          viewingDistanceCm={40}
          onToggle={onToggle}
          testId="cell"
        />,
      ),
    );
    expect(screen.getByTestId('cell').props.onKeyDown).toBeUndefined();
  });
});

describe('Toggle（role=switch）の Space 起動', () => {
  it('Web では Space で反転する', () => {
    asWeb(() => {
      const onChange = jest.fn();
      render(wrap(<Toggle value={false} accessibilityLabel="効果音" onChange={onChange} />));
      const sw = screen.getByRole('switch');
      expect(typeof sw.props.onKeyDown).toBe('function');
      sw.props.onKeyDown({ key: ' ', preventDefault: jest.fn() });
      expect(onChange).toHaveBeenCalledWith(true);
    });
  });
});

describe('SegmentedControl（role=radio）の Space 起動', () => {
  it('Web では Space で当該セグメントを選択する', () => {
    asWeb(() => {
      const onChange = jest.fn();
      render(
        wrap(
          <SegmentedControl
            options={[
              { value: 'a', label: 'A' },
              { value: 'b', label: 'B' },
            ]}
            value="a"
            onChange={onChange}
            accessibilityLabel="選択"
          />,
        ),
      );
      const radios = screen.getAllByRole('radio');
      radios[1].props.onKeyDown({ key: ' ', preventDefault: jest.fn() });
      expect(onChange).toHaveBeenCalledWith('b');
    });
  });
});
