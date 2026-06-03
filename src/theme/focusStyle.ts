/**
 * focusStyle.ts — NF-7 / NF-9（Web の focus 可視性）。
 *
 * 方針（S5 評価 Critical 修正）：
 * 以前はインラインで `outlineStyle:'solid'` を**常時**付与していたため、
 * react-native-web では擬似クラスを伴わず outline が常時描画され、ガボール格子の
 * 全セルやボタンに青枠が永続表示されてしまった（F-01 視認阻害・NF-9 破綻）。
 *
 * 修正：インライン outline を撤去し、Web では大域 CSS の `:focus-visible` のみで
 * outline を出す（マウス/タップ focus では消す、キーボード focus でのみ 3px ring）。
 * outline 色はテーマで変わるため CSS 変数 `--ge-focus-ring` 経由で動的に切替える。
 *
 * Native では outline 概念が無いため本ヘルパーは何もしない（document には触れない）。
 */

import { Platform, ViewStyle } from 'react-native';

let installed = false;

/**
 * Web 専用：`:focus-visible` のときだけ 3px outline を出す大域スタイルを 1 度だけ注入する。
 * - 通常 focus（マウス/タップ）: outline なし
 * - キーボード focus: 3px solid ring + offset（NF-9）
 * 色は CSS 変数 `--ge-focus-ring`（既定はフォールバック色）で、ThemeProvider が現テーマ色を設定する。
 */
export function installFocusVisibleStyle(): void {
  if (Platform.OS !== 'web' || installed) return;
  if (typeof document === 'undefined') return;
  installed = true;
  const style = document.createElement('style');
  style.id = 'ge-focus-visible';
  style.textContent = [
    // 既定の常時 outline を抑止（マウス/タップ focus では出さない）
    ':focus{outline:none;}',
    // キーボード focus（focus-visible）でのみ ring を表示
    ':focus-visible{outline:3px solid var(--ge-focus-ring,#4DA3FF);outline-offset:2px;}',
    // Skip link（NF-14）：通常は画面外に退避し、focus されたときだけ左上に出す。
    '[data-ge-skip-link]{position:absolute;left:-9999px;top:0;}',
    '[data-ge-skip-link]:focus,[data-ge-skip-link]:focus-within{left:8px;top:8px;}',
  ].join('\n');
  document.head.appendChild(style);
}

/** Web 専用：focus ring 色を CSS 変数に反映する（テーマ変更時に呼ぶ）。 */
export function setFocusRingColor(color: string): void {
  if (Platform.OS !== 'web') return;
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--ge-focus-ring', color);
}

/**
 * 後方互換：呼び出し側（`style={[..., focus]}`）はそのままでよいよう空スタイルを返す。
 * focus-visible の outline は大域 CSS（installFocusVisibleStyle）が担当するため、
 * インラインスタイルは付与しない。
 */
export function buildFocusStyle(_focusRingColor?: string): ViewStyle {
  return {};
}

/** useFocusStyle — 互換 API。インライン outline は返さない（大域 CSS が担当）。 */
export function useFocusStyle(): ViewStyle {
  return {};
}
