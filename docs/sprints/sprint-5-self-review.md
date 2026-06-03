# Sprint 5 自己評価 — ボトムタブナビゲーション・中断ダイアログ（F-05 / F-07）

> 注：本スプリントは Generator がソケット切断で停止したため、実装本体（コンポーネント・配線）は
> Generator が完成済み、**AppRoot 中断ロジックのテストと本自己評価はオーケストレーターが補完**した。

## 完成の定義（spec §7 S5）に対する達成
- [x] ホーム/履歴/設定の 3 タブが切替できる（`BottomTabBar` NV-1、`AppRoot`）
- [x] プレイ中の × ・他タブで中断ダイアログ（同一 DG-1）
- [x] OK=記録せず中断（`confirmAbort` で `playing=false`、進行中セッションは保存経路に渡さず破棄）
- [x] キャンセル=継続（残り時間・選択は `GameScreen` 内 reducer state が保持、`paused` で一時停止）
- [x] 完了後・待機中は自由遷移
- [x] ナビ・中断の統合テスト追加

## 実装サマリ
- `src/components/v2/BottomTabBar.tsx`（NV-1）：3 タブ常時表示。アクティブは色＋上辺インジケータ＋太字＋アイコン形（塗り/線）で非色依存（NF-12）。role=tablist/tab、aria-selected、focus ring（NF-7/9/15）。タップ領域 64px。
- `src/screens/v2/AppRoot.tsx`：タブ状態・ゲーム進行状態・中断ダイアログ起点（X / タブ）を管理。`requestTab` がプレイ中の他タブ遷移をダイアログに迂回。`configFromSettings` で Settings→GameConfig 写像。
- `src/screens/v2/HomeWaitingScreen.tsx`：S5 暫定の手動開始 CTA（自動開始・結果カードは S6）。
- `src/screens/v2/HistoryPlaceholderScreen.tsx`：S7 まではプレースホルダ。
- `App.tsx`：起動マイグレーション（S2）→ AppRoot。darkMode を ThemeProvider に反映。
- 中断ダイアログ（`ConfirmDialog` DG-1）：初期フォーカスは安全側「続ける（キャンセル）」（S2 評価 Minor 申し送りに対応、autoFocus をキャンセル側に付与）。

## テスト（S4=240 → S5=254）
- `tests/components/v2/BottomTabBar.test.tsx`（+5）：3 タブ表示・role=tab・aria-selected・太字補強・押下通知。
- `tests/screens/v2/AppRoot.test.tsx`（+9、オーケストレーター補完）：configFromSettings 写像 / 待機中の自由遷移 / プレイ中の他タブ→ダイアログ（非切替）/ キャンセルで継続 / OK でタブ着地・ゲーム終了 / X→ダイアログ / X 起点 OK でホーム待機着地 / 中断後の自由遷移 / 待機中はダイアログ非表示。
- 合計：**254 件 全 PASS**（26 スイート）。

## 検証
- `npx tsc --noEmit`：エラー 0
- `npm test`：254 件 全 PASS
- `npm run build:web`：PASS

## 既知の申し送り（後続スプリント）
- 起動時の自動開始・距離リマインド・セッション結果カード（RC-1）は **S6**。S5 はホーム待機画面の「プレイを始める」で手動開始する暫定導線。
- 履歴タブ本実装（進捗グラフ・バッジ）は **S7/S8**。
- セッション記録の永続化（`saveSession`）配線は **S6 以降**。S5 は「中断は記録しない」を、記録経路自体が未配線であることと `confirmAbort` での破棄で構造的に担保。
- 採点方式ラジオの aria-checked、Toggle の aria-checked DOM 出力（S2 評価 Minor 2）は **S10 a11y 仕上げ**で対応予定。
