# 再評価（追補）: Sprint 10 — Skip link キーボード起動の修正確認

日時: 2026-05-31 04:20
モード: impl（当該修正点のみ再確認 / 前回 docs/evaluations/sprint-10-impl-20260531-0414.md の追補）
判定: ✅ 合格

## サマリー
前回 Major 不合格となった「Skip link が Enter キーで起動しない（NF-14/NF-9 違反）」を、実機（Playwright MCP, isolated + chromium）で再確認した。修正後の SkipLink は実 DOM で `<button role="button">`（前回は `<div role="link">`）として描画され、**Tab で可視化 → Enter / Space の両方で `#ge-main-content` へ focus が移動**することを確認した。Space では preventDefault によりページスクロールも発生しない。S5 の focus-visible 出し分け回帰なし、コンソールエラー 0。前回唯一の不合格点が解消され、Sprint 10 完了＝v2.0 全 10 スプリント完了とする。

## 確認結果（当該点のみ）
- 起動・到達: ✅ `npm run build:web` PASS（AppEntry 673 kB）/ `npx serve -s dist` HTTP 200。onboardingCompleted を true 化して AppRoot へ到達
- DOM 実体: ✅ skip link は `tagName=BUTTON` / `role=button` / text「メインコンテンツへスキップ」。`#ge-main-content` 存在（初期は tabindex 無し＝設計どおり）
- Tab 1 回で可視化＋focus: ✅ activeElement=skip link、矩形 (x=8, y=8, w=248, h=49)、opacity=1, clip=auto（退避解除）
- **Enter で起動: ✅**（前回失敗点）Enter 押下後 `document.activeElement === #ge-main-content`、`tabindex=-1` がその場付与される
- **Space で起動: ✅** 状態リセット（main の tabindex 除去＋skip link 再 focus）後に Space 押下で再び `#ge-main-content` へ focus 移動。`window.scrollY===0`（preventDefault でページスクロール抑止）
- 回帰スポット:
  - Tab 巡回継続: ✅ skip link の次は `role=button`（ゲーム中断 ✕）へ正しく進む
  - focus-visible 出し分け: ✅ キーボード focus 時は `:focus-visible` match=true / outline 3px solid。実マウスクリック後の focus は match=false / outlineStyle=none（S5 修正の回帰なし）
  - コンソール: ✅ error 0 件（既知の無害な AudioContext autoplay warning 1 件のみ。ブラウザ仕様）

## 申し送り（スコープ外の観察、要対応ではない）
- AppRoot 復帰時、ホームタブが即「変化しているパッチを選ぶ」ゲーム進行中（カウントダウン稼働）状態で表示された。今回は localStorage を直接編集してオンボをスキップした結果の状態であり、本リチェックの対象（skip link）外。通常導線での挙動は前回総合評価で確認済みのため不問とするが、気になる場合は別途確認を推奨。

## 結論
前回 Major（Skip link 非起動）は解消。閾値（機能正しさ Critical0/Major0、コンソール error0、a11y キーボード操作可）を満たす。**Sprint 10 合格＝v2.0 全 10 スプリント完了。次工程へ進んで問題なし。**
