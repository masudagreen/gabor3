/**
 * keyboardShortcuts.ts のテスト：mapKeyToGame2 / mapKeyToGame3 純関数 + フック挙動
 *
 * jest の node 環境では window.addEventListener が無いので、globalThis に簡易
 * EventTarget シムを置き、keydown を dispatch して購読パスを検証する。
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';

Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });

// シム：globalThis に addEventListener / removeEventListener / dispatchEvent を生やす
type KeyListener = (e: { key: string; preventDefault?: () => void }) => void;
const _gListeners = new Map<string, KeyListener[]>();

beforeEach(() => {
  _gListeners.clear();
  (globalThis as unknown as { addEventListener: unknown }).addEventListener = (type: string, l: KeyListener) => {
    const arr = _gListeners.get(type) ?? [];
    arr.push(l);
    _gListeners.set(type, arr);
  };
  (globalThis as unknown as { removeEventListener: unknown }).removeEventListener = (type: string, l: KeyListener) => {
    const arr = _gListeners.get(type) ?? [];
    _gListeners.set(type, arr.filter((x) => x !== l));
  };
});

afterEach(() => {
  delete (globalThis as unknown as { addEventListener?: unknown }).addEventListener;
  delete (globalThis as unknown as { removeEventListener?: unknown }).removeEventListener;
});

function dispatchKey(key: string): void {
  const arr = _gListeners.get('keydown') ?? [];
  for (const l of [...arr]) l({ key, preventDefault: jest.fn() });
}

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const ks = require('../../src/lib/keyboardShortcuts');

describe('mapKeyToGame2', () => {
  it('ArrowLeft → left（左ガボール選択）', () => {
    expect(ks.mapKeyToGame2('ArrowLeft')).toBe('left');
  });
  it('ArrowRight → right（右ガボール選択）', () => {
    expect(ks.mapKeyToGame2('ArrowRight')).toBe('right');
  });
  it('未対応キーは null', () => {
    expect(ks.mapKeyToGame2('Enter')).toBeNull();
    expect(ks.mapKeyToGame2('a')).toBeNull();
  });
});

describe('mapKeyToGame3', () => {
  it('1-8 が ClockPosition と 1:1 対応する', () => {
    expect(ks.mapKeyToGame3('1')).toBe('12');
    expect(ks.mapKeyToGame3('2')).toBe('1:30');
    expect(ks.mapKeyToGame3('3')).toBe('3');
    expect(ks.mapKeyToGame3('4')).toBe('4:30');
    expect(ks.mapKeyToGame3('5')).toBe('6');
    expect(ks.mapKeyToGame3('6')).toBe('7:30');
    expect(ks.mapKeyToGame3('7')).toBe('9');
    expect(ks.mapKeyToGame3('8')).toBe('10:30');
  });
  it('9 や 0 など範囲外は null', () => {
    expect(ks.mapKeyToGame3('9')).toBeNull();
    expect(ks.mapKeyToGame3('0')).toBeNull();
    expect(ks.mapKeyToGame3('a')).toBeNull();
  });
});

describe('useGame2Keyboard hook', () => {
  const Harness: React.FC<{ onAnswer: (d: string) => void; enabled: boolean }> = ({
    onAnswer,
    enabled,
  }) => {
    ks.useGame2Keyboard({ onAnswer, enabled });
    return React.createElement(Text, null, 'g2');
  };

  it('enabled=true で ← を押すと onAnswer("left") が呼ばれる', () => {
    const onAnswer = jest.fn();
    render(React.createElement(Harness, { onAnswer, enabled: true }));
    act(() => {
      dispatchKey('ArrowLeft');
    });
    expect(onAnswer).toHaveBeenCalledWith('left');
  });

  it('enabled=false なら ← を押しても何も起きない', () => {
    const onAnswer = jest.fn();
    render(React.createElement(Harness, { onAnswer, enabled: false }));
    act(() => {
      dispatchKey('ArrowLeft');
    });
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('→ で "right" が呼ばれる', () => {
    const onAnswer = jest.fn();
    render(React.createElement(Harness, { onAnswer, enabled: true }));
    act(() => {
      dispatchKey('ArrowRight');
    });
    expect(onAnswer).toHaveBeenCalledWith('right');
  });
});

describe('useGame3Keyboard hook', () => {
  const Harness: React.FC<{ onAnswer: (p: string) => void; enabled: boolean }> = ({
    onAnswer,
    enabled,
  }) => {
    ks.useGame3Keyboard({ onAnswer, enabled });
    return React.createElement(Text, null, 'g3');
  };

  it('enabled=true で 5 を押すと onAnswer("6") が呼ばれる', () => {
    const onAnswer = jest.fn();
    render(React.createElement(Harness, { onAnswer, enabled: true }));
    act(() => {
      dispatchKey('5');
    });
    expect(onAnswer).toHaveBeenCalledWith('6');
  });

  it('1-8 がそれぞれの ClockPosition を呼び出す', () => {
    const onAnswer = jest.fn();
    render(React.createElement(Harness, { onAnswer, enabled: true }));
    act(() => {
      ['1', '2', '3', '4', '5', '6', '7', '8'].forEach(dispatchKey);
    });
    expect(onAnswer.mock.calls.map((c) => c[0])).toEqual([
      '12', '1:30', '3', '4:30', '6', '7:30', '9', '10:30',
    ]);
  });
});

describe('useEscapeKey hook', () => {
  const Harness: React.FC<{ onEscape: () => void; enabled: boolean }> = ({
    onEscape,
    enabled,
  }) => {
    ks.useEscapeKey({ onEscape, enabled });
    return React.createElement(Text, null, 'esc');
  };

  it('Escape キーで onEscape が呼ばれる', () => {
    const onEscape = jest.fn();
    render(React.createElement(Harness, { onEscape, enabled: true }));
    act(() => {
      dispatchKey('Escape');
    });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});
