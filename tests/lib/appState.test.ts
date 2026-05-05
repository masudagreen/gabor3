/**
 * appState.ts のテスト：visibilitychange イベント検知と onBackground 発火
 *
 * Platform.OS = 'web' に固定して、document polyfill 経由のパスを検証。
 * jest の node 環境には document が無いので、globalThis.document に簡易シムを置く。
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';

Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });

// document polyfill（visibility 状態 + 簡易 EventTarget）
type Listener = () => void;
type DocShim = {
  visibilityState: 'visible' | 'hidden';
  _listeners: Map<string, Listener[]>;
  addEventListener: (type: string, l: Listener) => void;
  removeEventListener: (type: string, l: Listener) => void;
  dispatchEvent: (type: string) => void;
};

function makeDocShim(): DocShim {
  const listeners = new Map<string, Listener[]>();
  return {
    visibilityState: 'visible',
    _listeners: listeners,
    addEventListener(type, l) {
      const arr = listeners.get(type) ?? [];
      arr.push(l);
      listeners.set(type, arr);
    },
    removeEventListener(type, l) {
      const arr = listeners.get(type) ?? [];
      listeners.set(type, arr.filter((x) => x !== l));
    },
    dispatchEvent(type) {
      const arr = listeners.get(type) ?? [];
      for (const l of [...arr]) l();
    },
  };
}

let docShim: DocShim;

beforeEach(() => {
  docShim = makeDocShim();
  (globalThis as unknown as { document: DocShim }).document = docShim;
});

afterEach(() => {
  delete (globalThis as unknown as { document?: DocShim }).document;
});

// テスト本体（Platform.OS / document 設定後に require）
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const { useAppForeground, getCurrentForegroundState, subscribeAppForeground } = require('../../src/lib/appState');

const TestHarness: React.FC<{
  onBg: () => void;
  onFg: () => void;
}> = ({ onBg, onFg }) => {
  useAppForeground({ onBackground: onBg, onForeground: onFg });
  return React.createElement(Text, null, 'harness');
};

describe('appState (web)', () => {
  it('getCurrentForegroundState は visibilityState=visible なら active を返す', () => {
    docShim.visibilityState = 'visible';
    expect(getCurrentForegroundState()).toBe('active');
  });

  it('visibilityState=hidden なら background を返す', () => {
    docShim.visibilityState = 'hidden';
    expect(getCurrentForegroundState()).toBe('background');
  });

  it('subscribeAppForeground 経由で hidden への遷移が listener に届く', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeAppForeground(listener);
    docShim.visibilityState = 'hidden';
    docShim.dispatchEvent('visibilitychange');
    expect(listener).toHaveBeenCalledWith('background');
    unsubscribe();
  });

  it('useAppForeground：active → background 遷移で onBackground が呼ばれ、復帰で onForeground が呼ばれる', () => {
    const onBg = jest.fn();
    const onFg = jest.fn();

    docShim.visibilityState = 'visible';
    render(React.createElement(TestHarness, { onBg, onFg }));

    expect(onBg).not.toHaveBeenCalled();

    // hidden へ遷移
    act(() => {
      docShim.visibilityState = 'hidden';
      docShim.dispatchEvent('visibilitychange');
    });
    expect(onBg).toHaveBeenCalledTimes(1);
    expect(onFg).not.toHaveBeenCalled();

    // visible に戻る
    act(() => {
      docShim.visibilityState = 'visible';
      docShim.dispatchEvent('visibilitychange');
    });
    expect(onFg).toHaveBeenCalledTimes(1);
  });
});
