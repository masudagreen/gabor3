/**
 * haptics.ts のテスト：hapticsEnabled ガード、navigator.vibrate 呼出、Web 非対応の no-op
 *
 * Platform.OS は test ファイル先頭で 'web' に上書きする（isolateModules を使うと
 * Platform module が reset されて override が効かなくなるため）。
 */
import { Platform } from 'react-native';
Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });

import {
  lightImpact,
  setHapticsEnabled,
  _resetHapticsForTest,
} from '../../src/lib/haptics';

describe('haptics: setHapticsEnabled / lightImpact', () => {
  let originalVibrate: typeof navigator.vibrate | undefined;

  beforeEach(() => {
    _resetHapticsForTest();
    originalVibrate = (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate;
  });

  afterEach(() => {
    if (originalVibrate === undefined) {
      delete (navigator as unknown as { vibrate?: unknown }).vibrate;
    } else {
      (navigator as Navigator & { vibrate?: unknown }).vibrate = originalVibrate;
    }
  });

  it('hapticsEnabled=true + navigator.vibrate あり で lightImpact が vibrate(50) を呼ぶ', () => {
    const vibrateMock = jest.fn().mockReturnValue(true);
    (navigator as Navigator & { vibrate?: unknown }).vibrate = vibrateMock;
    setHapticsEnabled(true);
    lightImpact();
    expect(vibrateMock).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenCalledWith(50);
  });

  it('hapticsEnabled=false なら lightImpact は vibrate を呼ばない', () => {
    const vibrateMock = jest.fn().mockReturnValue(true);
    (navigator as Navigator & { vibrate?: unknown }).vibrate = vibrateMock;
    setHapticsEnabled(false);
    lightImpact();
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('navigator.vibrate が無い環境では no-op（例外を投げない）', () => {
    delete (navigator as unknown as { vibrate?: unknown }).vibrate;
    setHapticsEnabled(true);
    expect(() => lightImpact()).not.toThrow();
  });

  it('vibrate が例外を投げても catch して握り潰す', () => {
    (navigator as Navigator & { vibrate?: unknown }).vibrate = () => {
      throw new TypeError('not allowed');
    };
    setHapticsEnabled(true);
    expect(() => lightImpact()).not.toThrow();
  });
});
