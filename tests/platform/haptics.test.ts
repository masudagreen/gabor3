/**
 * haptics.test.ts — 触覚バックエンド（S9 / F-14、platform/haptics.ts）。
 *
 * expo-haptics をモックし、種別ごとに impactAsync が正しいスタイルで呼ばれること、
 * badge は heavy→medium の 2 連であること、API 失敗でクラッシュしないこと、
 * Noop/差し替えを検証する。
 */

import {
  HAPTIC_KINDS,
  NoopHapticsBackend,
  getDefaultHapticsBackend,
  setDefaultHapticsBackend,
} from '../../src/platform/haptics';

const mockImpactAsync = jest.fn((_style: string) => Promise.resolve());

jest.mock('expo-haptics', () => ({
  impactAsync: (style: string) => mockImpactAsync(style),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
    Soft: 'soft',
    Rigid: 'rigid',
  },
}));

describe('HAPTIC_KINDS', () => {
  it('3 種別を持つ', () => {
    expect([...HAPTIC_KINDS]).toEqual(['light', 'medium', 'badge']);
  });
});

describe('NoopHapticsBackend', () => {
  it('利用不可で trigger がクラッシュしない', () => {
    const b = new NoopHapticsBackend();
    expect(b.isAvailable()).toBe(false);
    expect(() => b.trigger('light')).not.toThrow();
  });
});

describe('NativeHapticsBackend（expo-haptics モック）', () => {
  // jest-expo の既定 Platform.OS='ios' で NativeHapticsBackend が生成される。
  let backend: ReturnType<typeof getDefaultHapticsBackend>;

  beforeEach(() => {
    mockImpactAsync.mockClear();
    setDefaultHapticsBackend(null);
    backend = getDefaultHapticsBackend();
  });
  afterEach(() => setDefaultHapticsBackend(null));

  it('light → impactAsync(Light) を 1 回', () => {
    backend.trigger('light');
    expect(mockImpactAsync).toHaveBeenCalledTimes(1);
    expect(mockImpactAsync).toHaveBeenCalledWith('light');
  });

  it('medium → impactAsync(Medium) を 1 回', () => {
    backend.trigger('medium');
    expect(mockImpactAsync).toHaveBeenCalledTimes(1);
    expect(mockImpactAsync).toHaveBeenCalledWith('medium');
  });

  it('badge → heavy 即時 + medium 遅延の 2 連', () => {
    jest.useFakeTimers();
    backend.trigger('badge');
    expect(mockImpactAsync).toHaveBeenCalledTimes(1);
    expect(mockImpactAsync).toHaveBeenCalledWith('heavy');
    jest.advanceTimersByTime(100);
    expect(mockImpactAsync).toHaveBeenCalledTimes(2);
    expect(mockImpactAsync).toHaveBeenLastCalledWith('medium');
    jest.useRealTimers();
  });

  it('isAvailable は true', () => {
    expect(backend.isAvailable()).toBe(true);
  });
});
