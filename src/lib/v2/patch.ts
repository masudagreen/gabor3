/**
 * patch.ts — ガボールパッチ 1 個の状態モデルと、時刻 t における
 * orientationDeg / cpd を返す純関数（S4 描画の入力）。
 *
 * spec F-01 / system §9.3・§9.4。
 * - 静止パッチ：初期角度・初期 cpd で固定（時間変化なし、AS-12）。
 * - 変化パッチ：回転（a deg/sec、CW/CCW）と空間周波数変化（b hz/sec、増/減）が
 *   独立に有効化されうる（回転のみ / 周波数のみ / 両方）。t 秒間一定速度で継続（AS-13）。
 */

/** 変化の種類（回転/周波数/両方）。静止パッチは null。 */
export type ChangeKind = 'rotation' | 'frequency' | 'both';

/** 回転方向。CW=時計回り（角度増加）、CCW=反時計回り（角度減少）。 */
export type RotationDir = 'cw' | 'ccw';

/** 周波数変化方向。 */
export type SfDir = 'increase' | 'decrease';

/**
 * パッチ 1 個の不変定義。ラウンド生成時に確定し、描画はこれと経過時刻 t から
 * 現在の orientationDeg / cpd を導出する。
 */
export type PatchDef = {
  /** 格子内の連番（0..n²-1、行優先） */
  index: number;
  /** 変化パッチなら種類、静止パッチなら null */
  changeKind: ChangeKind | null;
  /** 初期角度（度、0–180 正規化） */
  initialOrientationDeg: number;
  /** 初期空間周波数（cpd） */
  initialCpd: number;
  /** 回転速度（deg/sec）。changeKind に rotation を含むときのみ意味を持つ */
  rotationSpeed: number;
  /** 回転方向 */
  rotationDir: RotationDir;
  /** 周波数変化速度（hz/sec）。changeKind に frequency を含むときのみ意味を持つ */
  sfChangeSpeed: number;
  /** 周波数変化方向 */
  sfDir: SfDir;
};

/** このパッチが「変化パッチ」かどうか。 */
export function isChanging(patch: PatchDef): boolean {
  return patch.changeKind !== null;
}

function hasRotation(kind: ChangeKind | null): boolean {
  return kind === 'rotation' || kind === 'both';
}

function hasFrequency(kind: ChangeKind | null): boolean {
  return kind === 'frequency' || kind === 'both';
}

/** 周波数（cpd）の物理的な下限。0 以下や負の縞は意味を持たないためクランプする。 */
export const MIN_CPD = 0.5;

/**
 * 時刻 t 秒における orientationDeg を返す（純関数）。
 * 回転変化を持たないパッチは初期角度のまま。CW は加算、CCW は減算。
 * 表示用に 0–180 度へ正規化する（180 度で縞の見かけは一巡するため）。
 */
export function patchOrientationAt(patch: PatchDef, tSec: number): number {
  let deg = patch.initialOrientationDeg;
  if (hasRotation(patch.changeKind)) {
    const sign = patch.rotationDir === 'cw' ? 1 : -1;
    deg = patch.initialOrientationDeg + sign * patch.rotationSpeed * tSec;
  }
  return normalizeDeg180(deg);
}

/**
 * cpd を返す（純関数）。
 *
 * v2.0 仕様変更（周波数変化アニメは廃止・回転のみに統一）：cpd は**時間変化しない**。
 * パッチごとに様々な固定 cpd（roundGen で初期割当）を持つが、ラウンド中は不変。
 * 引数 tSec は API 互換のため残すが使用しない。物理下限 MIN_CPD でクランプ。
 */
export function patchCpdAt(patch: PatchDef, _tSec?: number): number {
  return Math.max(MIN_CPD, patch.initialCpd);
}

/** 角度を [0, 180) に正規化する。縞の見かけは 180 度周期。 */
export function normalizeDeg180(deg: number): number {
  let d = deg % 180;
  if (d < 0) d += 180;
  return d;
}
