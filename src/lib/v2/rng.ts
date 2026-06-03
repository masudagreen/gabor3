/**
 * rng.ts — 注入可能な擬似乱数生成器（テスト決定論のため）。
 *
 * ゲームのラウンド生成は乱数依存だが、テストで再現可能にするため
 * 「[0,1) を返す関数」を `Rng` として外部から注入する設計にする。
 * 本番では `Math.random` を渡し、テストでは固定シード rng を渡す。
 */

/** [0, 1) を返す関数。Math.random と同じ契約。 */
export type Rng = () => number;

/**
 * mulberry32 — 32bit シード 1 個から決定論的に [0,1) を返す軽量 PRNG。
 * 暗号用途ではない。テストと刺激生成の再現性のためだけに使う。
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** [min, max) の整数を 1 個返す（max は含まない）。 */
export function randInt(rng: Rng, minInclusive: number, maxExclusive: number): number {
  return minInclusive + Math.floor(rng() * (maxExclusive - minInclusive));
}

/** [min, max] の浮動小数を返す。 */
export function randFloat(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** 配列から重複なく count 個を選ぶ（Fisher–Yates 部分シャッフル）。 */
export function sampleWithoutReplacement<T>(
  rng: Rng,
  items: readonly T[],
  count: number,
): T[] {
  const pool = items.slice();
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, n);
}
