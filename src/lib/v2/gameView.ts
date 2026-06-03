/**
 * gameView.ts — S4 描画・結果開示のための純粋な表示ロジック（spec F-03 / F-12）。
 *
 * 描画コンポーネント（GaborGrid / CountdownTimer / ResultOverlayLayer）が参照する
 * 「見た目の決定」を React 非依存の純関数に切り出す。これにより色段階・結果マーク
 * 分類・総合判定・cpd スロットリングをテストで決定論的に検証できる。
 *
 * - カウントダウン色段階（F-12）：白 / ≤5 秒 黄 / ≤3 秒 赤。
 * - 結果マーク分類（F-03）：選んだ変化=TP / 選び逃した変化=FN / 誤選択静止=FP /
 *   選ばなかった静止=none。
 * - 総合判定（OV-3）：TP=変化全数 かつ FP=0 → success、それ以外 danger。
 */

import { PatchDef, isChanging } from './patch';

// ---------------------------------------------------------------------------
// カウントダウン色段階（F-12 / CD-1）
// ---------------------------------------------------------------------------

/** カウントダウンの色段階。色＋太字補強で情報を伝える（NF-12）。 */
export type CountdownTier = 'normal' | 'warn' | 'danger';

/** ≤3 秒 = danger（赤・Black）、≤5 秒 = warn（黄・Bold）、それ以外 = normal（白・Bold）。 */
export function countdownTier(remainingSec: number): CountdownTier {
  if (remainingSec <= 3) return 'danger';
  if (remainingSec <= 5) return 'warn';
  return 'normal';
}

/**
 * カウントダウンの aria-live レベル（CD-1 / §6）。
 * 残り 6 秒以上は polite、5 秒以下は assertive。
 */
export function countdownAriaLive(remainingSec: number): 'polite' | 'assertive' {
  return remainingSec <= 5 ? 'assertive' : 'polite';
}

// ---------------------------------------------------------------------------
// 結果マーク分類（F-03 / OV-2）
// ---------------------------------------------------------------------------

/**
 * パッチ 1 個の結果開示マーク種別。
 * - tp：変化パッチを正しく選んだ（✅ 実線）
 * - fn：変化パッチを選び逃した（✅ 薄め 50%）
 * - fp：静止パッチを誤って選んだ（❌）
 * - none：静止パッチを選ばなかった（何も出さない）
 */
export type ResultMarkKind = 'tp' | 'fn' | 'fp' | 'none';

/** パッチ定義と選択状態から、開示時に出すマーク種別を決める（純関数）。 */
export function classifyMark(
  patch: PatchDef,
  selected: boolean,
): ResultMarkKind {
  if (isChanging(patch)) {
    return selected ? 'tp' : 'fn';
  }
  return selected ? 'fp' : 'none';
}

/** ラウンド全パッチのマーク種別を index 順で返す。 */
export function classifyMarks(
  patches: readonly PatchDef[],
  selected: ReadonlySet<number>,
): ResultMarkKind[] {
  return patches.map((p) => classifyMark(p, selected.has(p.index)));
}

// ---------------------------------------------------------------------------
// 総合判定（OV-3）
// ---------------------------------------------------------------------------

/** 総合バッジの種別。 */
export type AggregateKind = 'success' | 'danger';

/**
 * 総合 ✅/❌ の判定（OV-3）。
 * 変化パッチを過不足なく選んだ（FN=0 かつ FP=0 かつ変化が 1 個以上）→ success。
 * いずれか欠けると danger。
 */
export function aggregateKind(
  patches: readonly PatchDef[],
  selected: ReadonlySet<number>,
): AggregateKind {
  let changing = 0;
  let tp = 0;
  let fp = 0;
  for (const p of patches) {
    const picked = selected.has(p.index);
    if (isChanging(p)) {
      changing++;
      if (picked) tp++;
    } else if (picked) {
      fp++;
    }
  }
  return changing > 0 && tp === changing && fp === 0 ? 'success' : 'danger';
}

// ---------------------------------------------------------------------------
// cpd スロットリング（描画戦略：S1 申し送り）
// ---------------------------------------------------------------------------

/**
 * cpd（空間周波数）の BMP 再生成は重いため、毎フレーム再計算せず一定刻みに量子化する。
 * 回転は transform で安価に連続回転できるが、cpd は BMP 再生成が必要なため、
 * 値を `step` 単位に丸めて React の memo キーを安定させ、再生成頻度を抑える。
 *
 * （注）v2.0 初期はこの「値ベース量子化（step=0.25）」を使っていたが、b が小さいと
 * 0.25 を跨ぐのに数秒かかり「2 秒に 1 回」のカクついた変化に見えた。現在の描画は
 * `quantizeCpdTime`（時間ベースの一定レート更新）を使う。本関数はテスト互換のため残置。
 */
export function quantizeCpd(cpd: number, step = 0.25): number {
  return Math.round(cpd / step) * step;
}

/**
 * cpd アニメの更新レート（Hz）。回転は transform で 60fps 連続だが、cpd は BMP 再生成を
 * 伴うため、負荷を抑えつつ滑らかに見える上限レートで更新する。
 * 値が大きいほど滑らか（=回転に近い）だが、変化パッチ数 × このレートだけ BMP を再生成する
 * ため描画コストが上がる。実機の体感に応じて調整可能（20Hz ≒ 映像的に十分滑らか）。
 */
export const CPD_UPDATE_HZ = 20;

/**
 * 経過秒を CPD_UPDATE_HZ のフレームグリッドに丸める（cpd 再生成のスロットリング）。
 * 変化速度 b に依存せず**一定レート**で更新されるため、b が小さくても滑らかに見える
 * （値ベース量子化では b が小さいほど更新間隔が延びてカクついた）。
 */
export function quantizeCpdTime(tSec: number, hz = CPD_UPDATE_HZ): number {
  return Math.round(tSec * hz) / hz;
}
