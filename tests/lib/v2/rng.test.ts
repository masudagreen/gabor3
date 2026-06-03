/**
 * rng.test.ts — 注入可能 RNG の決定論と分布ヘルパー。
 */

import {
  mulberry32,
  randInt,
  randFloat,
  sampleWithoutReplacement,
} from '../../../src/lib/v2/rng';

describe('mulberry32', () => {
  it('同一シードは同一の系列を返す（決定論）', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('異なるシードは異なる系列を返す', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('値は [0, 1) の範囲に収まる', () => {
    const rng = mulberry32(999);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('randInt', () => {
  it('[min, max) の整数を返す（max は含まない）', () => {
    const rng = mulberry32(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = randInt(rng, 3, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(6);
      seen.add(v);
    }
    expect(seen).toEqual(new Set([3, 4, 5]));
  });
});

describe('randFloat', () => {
  it('[min, max] の範囲に収まる', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = randFloat(rng, 2, 4);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(4);
    }
  });
});

describe('sampleWithoutReplacement', () => {
  it('重複なく count 個を返す', () => {
    const rng = mulberry32(5);
    const picked = sampleWithoutReplacement(rng, [0, 1, 2, 3, 4, 5], 3);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
    picked.forEach((v) => expect([0, 1, 2, 3, 4, 5]).toContain(v));
  });

  it('count が要素数を超える場合は全要素を返す', () => {
    const rng = mulberry32(5);
    const picked = sampleWithoutReplacement(rng, [1, 2], 9);
    expect(new Set(picked)).toEqual(new Set([1, 2]));
  });
});
