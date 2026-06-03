# Sprint 6 自己評価 — ホームタブ・起動フロー・免責（F-08 / F-06 / F-10）

> v2.0（旧 v1.x の本ファイル内容を上書き）。spec §7 S6。デザイン：`docs/design/sprints/sprint-6/screens.md`（S6-1 オンボ / S6-2 距離リマインド / S6-3 結果カード RC-1）。

## やったこと

### データ/集計層（テスト可能・日付注入）
- `src/lib/v2/dateUtil.ts`：端末ローカル日付（YYYY-MM-DD）・日数差。すべて Date/日付文字列を引数注入する純関数（AS-20）。
- `src/lib/v2/statsAggregation.ts`：完了セッション 1 件から DailyStats（その日の最良スコア max・件数 +1）/ Streak（前日継続で +1、同日据え置き、2 日以上空きで 1 にリセット・longest 保持）/ PlayStats（累計 +1）を計算する純関数。
- `src/state/statsRecorder.ts`：`recordCompletedSession` が `persistCompletedSession`（SessionRecord 保存）+ 上記集計の保存を束ねる。完了時刻 `now` を注入可能。中断は呼ばない（記録経路に渡さない）。

### オンボ/距離リマインド（UI）
- `src/components/v2/DisclaimerPanel.tsx`（DC-1）：医療機器でない旨・対象外ユーザーを薄黄パネルで表示（本文 24px≥18pt）。オンボ初回と設定再閲覧で共用。
- `src/screens/v2/OnboardingScreen.tsx`（ON-1 / S6-1）：4 ステップ。免責同意（理解チェック→同意、未チェックで disabled）→ 年齢層（選択で自動進行、70 代以上は警告+続行）→ 視聴距離（選択で自動進行）→ 概要（はじめる）。合計タップは通常 5、70 代以上経路でも 6（F-06 ≤6 厳守）。
- `src/screens/v2/DistanceReminderScreen.tsx`（DR-1 / S6-2）：「画面から {n}cm 離れてください」を h1 36px で表示。`CountdownTimer` large（テーマ追従、F-12 統一）で 3 秒自動進行。X 中断以外の操作不要。片眼ガイダンス時のみ補助文。

### ホーム結果カード＋配線
- `src/components/v2/SessionResultCard.tsx`（RC-1 / S6-3）：0〜100 スコアを 72px tabular-nums で最大強調、今日のストリーク（炎+テキスト、色非依存）、「もう一度」64px（≥56pt）。region ラベルでスコア/連続日数を読み上げ。
- `src/screens/v2/AppRoot.tsx`：ホームを 3 フェーズ（distance / playing / result）に再構成。起動・「もう一度」は distance から始まり自動で playing へ。完了で `recordCompletedSession` を呼び結果カードへ。中断は記録経路に渡さず result（非進行）へ着地。
- `App.tsx`：マイグレーション後、初回（onboardingCompleted=false）のみオンボーディングを表示。完了で UserProfile（onboardingCompleted / disclaimerAgreedAt / ageGroup / viewingDistanceCm）を保存。設定の「免責事項を読む」で再閲覧モーダル（F-10）。

## 受け入れ基準マッピング

### F-06 起動フロー
- [x] 初回のみオンボ表示・2 回目以降なし（App の `onboardingCompleted` ゲート、startupFlow/Onboarding テスト）
- [x] オンボ完了までのタップ ≤6（通常 5、70 代以上 6）
- [x] 免責未チェックで先に進めない（「同意する」disabled、Onboarding テスト）
- [x] オンボ後/2 回目以降は距離リマインド経由でホーム自動開始（AppRoot/startupFlow テスト）
- [x] 距離リマインド「{n}cm 離れて」18pt 以上・F-12 カウントダウンで自動進行
- [x] X 中断以外の操作なしで自動進行（DistanceReminder テスト）
- [x] クールダウン画面なし（廃止）

### F-08 ホーム（ゲーム＋結果＋再プレイ）
- [x] ホームでプレイ（playing フェーズ）
- [x] r 完了後 0〜100 スコア表示（SessionResultCard、startupFlow テスト）
- [x] 今日のストリーク表示（currentStreak）
- [x] 「もう一度」56pt 以上・押すと距離リマインド経由で新セッション
- [x] 回数制限なし（フェーズ遷移のみ、上限ロジックなし）
- [x] 結果表示中は非進行＝タブ自由（AppRoot テスト）

### F-10 免責
- [x] 文言 18pt 以上（DisclaimerPanel body 24px）
- [x] 「同意する」まで進めない（オンボ時）
- [x] 設定から再閲覧（App の DisclaimerReviewModal、`onReadDisclaimer` 配線）
- [x] 同意日時を保存（disclaimerAgreedAt に ISO 文字列）
- [x] 70 代以上で追加警告・医師相談推奨

### F-04 / §6 永続化・集計
- [x] 完了セッション保存（SessionRecord、completedAt 非 null）
- [x] DailyStats max 更新・件数（statsAggregation/statsRecorder テスト）
- [x] Streak 連続/途切れ（同日据え置き・前日 +1・2 日空き reset）
- [x] PlayStats 累計 +1
- [x] 中断は記録しない（startupFlow テスト：X→中断する でセッション 0 件・累計 0）

## 確認したこと
- `npx tsc --noEmit`：エラー 0
- `npm test`：**33 スイート / 297 件 全 PASS**（S5=256 → +41）
- `npm run build:web`：PASS（web bundle ≈ 588 kB）
- 主要動線（自動テストで通過）：距離リマインド自動進行 → 自動開始 → 完了 → 結果カード → もう一度 → 距離リマインド。免責ゲート、70 代警告、オンボ完了で結果が onComplete に渡る。
- 状態網羅：空（streak 0 →「今日からスタート」）/ 初期スコア 0 / 中断時の非進行着地。

## 既知の懸念・申し送り
- **実機スクリーンショット未取得**：本スプリントで起動フローが App から到達可能になったため、Web/Expo Go での実描画確認（オンボ・距離リマインド・結果カードのレイアウト/セーフエリア）は実機推奨。点滅なし・トークン準拠はコード上で担保済み。
- **act 警告（cosmetic）**：startupFlow テストで完了 effect の永続化 Promise / useGameTimer の保留タイマーがアサート後に解決し React の act 警告が出るが、テストは全 PASS。挙動への影響なし。
- **バッジ判定（S8）・音/ハプティクス（S9）は未配線**：`recordCompletedSession` の戻り値と完了 effect が接続点。
- スキーマ変更なし（DailyStats/Streak/PlayStats は §6 で凍結済みフィールドのみ使用）。
