# 再評価レポート: Sprint 6 — 中断時の結果カード誤表示 修正（前回 Major の再確認）
日時: 2026-05-31 03:00
モード: impl（当該修正点のみの再評価）
対象: 前回 Major `docs/evaluations/sprint-6-impl-20260531-0248.md` 観点5 の修正
判定: ✅ 合格（= Sprint 6 完了）

## サマリー
前回 Major「中断後にホームが『スコア 0／100』の結果カードを誤表示する」は解消。
中断（✕ 起点 / タブ起点 OK）はいずれも新設 IdleHomeScreen（「プレイを始める」CTA のみ、
スコア・連続日数・読み上げの一切なし）へ着地し、結果カードは出ない。
正常に r ラウンド完走したときのみ SessionResultCard（実スコア＋ストリーク＋「もう一度」）が
表示され、idle へ倒れていない（回帰なし）。コンソール/ネットワークもクリーン。

## 確認結果（観点別）

### 1. ✕ 起点中断 → IdleHomeScreen 着地（✅）
- クリーン起動（localStorage クリア）→ オンボ完了 → 距離リマインド → ゲーム自動開始
- プレイ中に ✕「ゲームを中断」→ ダイアログ「プレイを中断しますか？／中断するとこのセッションは記録されません。」→「中断する」
- 着地画面：IdleHomeScreen。DOM テキストは「ホーム／ここでゲームをプレイします。／プレイを始める／（タブ）」のみ。
  `/スコア|点|0\/100|連続/` 正規表現マッチ false。読み上げ region（SessionResultCard の「セッション結果。スコア…」）も非存在。
- 「プレイを始める」押下 → 距離リマインド（「画面から 40cm 離れてください」＋カウントダウン）→ 新セッション開始を確認。

### 2. タブ起点中断 OK → ホーム復帰時も idle（✅）
- プレイ中に履歴タブ選択 → 同ダイアログ →「中断する」→ pendingTab（履歴）へ着地。
- 履歴タブからホームタブへ戻ると IdleHomeScreen。スコア系テキスト・結果カードなし（正規表現マッチ false）。

### 3. 回帰：正常完走時は SessionResultCard（✅）
- roundCount=3 / gridSize=3 に設定して 1 セッション完走（確定×3）。
- 完了画面は SessionResultCard：「今回のスコア 0 ／100」「🔥 連続 1 日」「もう一度」、region 読み上げ
  「セッション結果。スコア 0 点（100 点満点）。連続 1 日」。idle に倒れていないことを確認。
  （スコア 0 はパッチ未選択での完走による正当な完了結果。中断の 0 とは出自が異なる）
- データ層回帰：完走セッションは記録済み（session 1 件・completedAt 設定・sessionScore 0・3 ラウンド）、
  playStats.totalSessions=1、streak.currentStreak=1、dailyStats:2026-05-31 生成。
  一方で観点1・2 の 2 回の中断は session レコードを一切残しておらず、記録されたのは完走 1 件のみ
  （= 中断非記録／完走記録の切り分けが UI・データ両面で正しい）。
- 「もう一度」→ 距離リマインド経由で新ゲーム開始を確認（result→replay 経路も健全）。

### 4. コンソール / ネットワーク（✅）
- console（全セッション通算）：エラー 0 / 警告 0。
- network：非静的リクエストなし。静的は `/`=200、AppEntry.js=304 のみ。4xx/5xx なし。

## 該当実装（参考）
- `src/screens/v2/AppRoot.tsx`：`HomePhase` に `'idle'` 追加。`confirmAbort` は `setHomePhase('idle')`
  へ着地（X 起点＝home、タブ起点＝pendingTab）。`DistanceReminderScreen onAbort` も `'idle'`。
  `'result'` は `handleSessionComplete`（実完了）からのみ遷移。
- `src/screens/v2/IdleHomeScreen.tsx`：再開 CTA「プレイを始める」のみ。スコア表示なし。SafeArea 準拠。

## 結論
前回 Major は完全解消。正常完了時の結果カードに回帰なし。
他の前回合格項目（起動フロー・免責・集計・レスポンシブ・a11y 等）は依頼どおり再検証対象外。
**判定：合格＝Sprint 6 完了。次工程へ進んで問題ありません。**
