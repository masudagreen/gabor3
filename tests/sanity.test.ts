/**
 * テスト基盤の動作確認。
 * Sprint 1 以降で実ロジック・コンポーネントテストに置き換える。
 */

describe('sanity', () => {
  it('Jest が動作する', () => {
    expect(true).toBe(true);
  });

  it('TypeScript の型推論が動作する', () => {
    const sum = (a: number, b: number): number => a + b;
    expect(sum(2, 3)).toBe(5);
  });
});
