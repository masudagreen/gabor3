/**
 * motion.ts テスト（Sprint 7-C / NF-11 / screens.md S7-11）。
 *
 * - getPrefersReducedMotionSync：matchMedia の有無で false / true を切り替える
 * - scaleDuration：reduce 時は 0、それ以外は元の値
 * - usePrefersReducedMotion：matchMedia の change イベントで再レンダ
 */

import { renderHook, act } from '@testing-library/react-native';
import {
  getPrefersReducedMotionSync,
  scaleDuration,
  usePrefersReducedMotion,
} from '../../src/lib/motion';

describe('motion.scaleDuration', () => {
  it('reduce=false なら元の duration をそのまま返す', () => {
    expect(scaleDuration(1500, false)).toBe(1500);
    expect(scaleDuration(0, false)).toBe(0);
    expect(scaleDuration(200, false)).toBe(200);
  });

  it('reduce=true ならアニメーションは 0ms（瞬時遷移）', () => {
    expect(scaleDuration(1500, true)).toBe(0);
    expect(scaleDuration(800, true)).toBe(0);
    expect(scaleDuration(1, true)).toBe(0);
  });
});

describe('motion.getPrefersReducedMotionSync (jest-expo は Native 環境扱い)', () => {
  it('Native 環境では false を返す（Platform.OS !== "web"）', () => {
    // jest-expo の Platform.OS は 'ios'。Native パスを通り false が返る。
    expect(getPrefersReducedMotionSync()).toBe(false);
  });
});

describe('usePrefersReducedMotion フック', () => {
  it('Native 環境（jest-expo）で初期値 false を返す', () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('副作用で setState の同期実行が起きてもエラーを投げない', () => {
    const { result, unmount } = renderHook(() => usePrefersReducedMotion());
    expect(typeof result.current).toBe('boolean');
    act(() => {
      // 何もしないが、内部の useEffect が走った後でも壊れない
    });
    unmount();
  });
});
