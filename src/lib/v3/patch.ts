/**
 * patch.ts — v3.0 ガボールパッチ 1 個の状態モデルと、時刻 t における
 * orientationDeg を返す純関数（S5 描画の入力）。spec F-01 / system §4.1・§7.2。
 *
 * v3.0 の変化軸は**回転のみ**（spec §0：空間周波数変化 b は廃止）。
 * 回転は次の 2 種類（レベルの `direction` 変数が決定）：
 * - 一方向（'one-way'）：t 秒一定速度で同じ向きに連続回転（単調増加 or 単調減少）。
 * - 振動（'oscillate'）：中心角を基準に CW↔CCW を一定振幅で往復（三角波）。難（spec AS-11）。
 *
 * 静止パッチ（changeKind=null）は初期角度で固定（時間変化なし、AS-10）。
 * cpd は v3 では固定（patch には保持しない。描画は基準 cpd を使う。spec §0）。
 */

import type { Direction } from './level';

/** 回転方向（一方向時の符号）。CW=時計回り（角度増加）/ CCW=反時計回り（角度減少）。 */
export type RotationDir = 'cw' | 'ccw';

/** 変化の種類。v3 は回転のみ。静止パッチは null。 */
export type ChangeKind = 'rotation' | null;

/**
 * v3 パッチ 1 個の不変定義。ラウンド生成時に確定し、描画はこれと経過時刻 t から
 * 現在の orientationDeg を導出する（純関数 patchOrientationAt）。
 */
export type PatchDef = {
  /** 格子内の連番（0..n²-1、行優先）。 */
  index: number;
  /** 回転パッチなら 'rotation'、静止パッチなら null。 */
  changeKind: ChangeKind;
  /** 初期角度（度、0–180 正規化）。静止パッチはこの角度で固定。 */
  initialOrientationDeg: number;
  /** 回転速度（deg/sec）。changeKind='rotation' のときのみ意味を持つ。 */
  rotationSpeed: number;
  /** 回転方向（一方向時の符号。振動時は初動の向き）。 */
  rotationDir: RotationDir;
  /** 回転種別（一方向 / 振動）。changeKind='rotation' のときのみ意味を持つ。 */
  direction: Direction;
};

/**
 * 振動の振幅（片側、度）。spec AS-11 / system §4.1「狙い値 ±20°〜±40°」の中央付近。
 *
 * なぜ 30°：折り返しが明確に観察でき（一方向との弁別）、かつ往復幅が大きすぎず
 * 縞の見かけ（180° 周期）の一巡を跨がない範囲。体感調整余地として定数化。
 */
export const OSCILLATION_AMPLITUDE_DEG = 30;

/** このパッチが「回転パッチ」かどうか。 */
export function isChanging(patch: PatchDef): boolean {
  return patch.changeKind === 'rotation';
}

/**
 * 時刻 t 秒における未正規化の角度オフセット（初期角度からの差分、度）。
 *
 * - 一方向：sign × speed × t（単調）。
 * - 振動：振幅 A・角速度 speed の三角波。1 往復の周期 = 4A/speed 秒。
 *   折り返しの瞬間（offset = ±A）で瞬間角速度が 0 になり「一瞬止まって見える」
 *   （spec AS-11：振動が難しい根拠）。瞬間角速度の大きさは折り返し点を除き speed で
 *   一方向と同等（system §4.1 狙い 3：角速度の保存）。
 *
 * 三角波：位相 p = (sign × speed × t) を周期 4A の三角波に通す。
 */
export function oscillationOffsetDeg(
  tSec: number,
  speed: number,
  sign: number,
  amplitude: number = OSCILLATION_AMPLITUDE_DEG,
): number {
  if (amplitude <= 0 || speed <= 0) return 0;
  const period = 4 * amplitude; // 位相空間（度）での 1 周期 = 4×振幅
  const raw = sign * speed * tSec;
  // raw を [0, period) に折りたたみ、三角波（0→+A→0→−A→0）に写像する。
  let phase = raw % period;
  if (phase < 0) phase += period;
  if (phase < amplitude) return phase; // 0 → +A（上り）
  if (phase < 3 * amplitude) return 2 * amplitude - phase; // +A → −A（下り）
  return phase - period; // −A → 0（戻り）
}

/**
 * 時刻 t 秒における orientationDeg を返す（純関数）。
 * 回転しないパッチ（changeKind=null）は初期角度のまま。
 * - 一方向：CW は加算、CCW は減算で単調回転。
 * - 振動：初期角度を中心に三角波で往復。
 * 表示用に 0–180 度へ正規化する（180 度で縞の見かけは一巡するため）。
 */
export function patchOrientationAt(patch: PatchDef, tSec: number): number {
  if (patch.changeKind !== 'rotation') {
    return normalizeDeg180(patch.initialOrientationDeg);
  }
  const sign = patch.rotationDir === 'cw' ? 1 : -1;
  const offset =
    patch.direction === 'oscillate'
      ? oscillationOffsetDeg(tSec, patch.rotationSpeed, sign)
      : sign * patch.rotationSpeed * tSec;
  return normalizeDeg180(patch.initialOrientationDeg + offset);
}

/** 角度を [0, 180) に正規化する。縞の見かけは 180 度周期。 */
export function normalizeDeg180(deg: number): number {
  let d = deg % 180;
  if (d < 0) d += 180;
  return d;
}
