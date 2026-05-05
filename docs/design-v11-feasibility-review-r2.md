# v1.1 デザイン実現性レビュー（planner、ラウンド 2）

**レビュー対象**：
- 仕様書：`/Users/np_202212_11/projects/gabor3/docs/spec-v11.md`（変更なし）
- 修正後デザイン：`/Users/np_202212_11/projects/gabor3/docs/design-v11/`
  - 新規：`sprints/sprint-8/onboarding.md`（S8-OB-01〜06、OB-03b 含む計 7 画面）
  - 既存修正：`sprints/sprint-8/screens.md`、`sprints/sprint-18/screens.md`、`sprints/sprint-19/screens.md`、`components.md`
- 前回レビュー：`/Users/np_202212_11/projects/gabor3/docs/design-v11-feasibility-review.md`

---

## 結果サマリ

- 前回致命的 2 件 → **2 件とも完全対応（◯ × 2）**
- 前回軽微 3 件 → **3 件とも完全対応（◯ × 3）**
- 新たな致命的不足：**0 件**
- 新たな軽微不足：**0 件**

総合判定：**◯ デザイン凍結 OK → Evaluator design-qa へ進んでよい**

---

## 前回指摘の対応確認

### 1. 【前回 致命的】F-01 オンボーディング本体フロー　**◯ 完全対応**

新規ファイル `sprint-8/onboarding.md` で S8-OB-01〜06 + S8-OB-03b の計 7 画面が完全に設計された。

確認した項目：

- [x] **画面構造**：S8-OB-01 ようこそ / S8-OB-02 免責同意（オンボーディング版）/ S8-OB-03 年齢層申告 / S8-OB-03b 70 代以上の追加警告（条件付き）/ S8-OB-04 視聴距離設定 / S8-OB-05 ゲーム説明 / S8-OB-06 1 試行体験。各画面に ASCII モックアップ、フェーズタイミング、a11y、状態遷移が記述されている
- [x] **タップ数 6 回以下の根拠**：onboarding.md §1「タップ数見積り」表で UI 移行タップは 5（70s+ 経由時 6）と算出。「学習体験本体」のタップは別カウント方針も明記
- [x] **「次へ」ボタン 56pt+**：全画面で 64px 高 Primary lg を採用、§13 受け入れ基準カバレッジ表で全画面網羅
- [x] **データ消去通知連動**：mermaid フロー図（§1）で S8-01（screens.md §2 既存）→ S8-OB-01 への接続を明示
- [x] **スキップ機能なし**：全画面に Skip ボタンなし、戻るボタンも S8-OB-03b の Esc 以外不在と §13 で明示
- [x] **70 代以上分岐**：S8-OB-03 の状態表で「70s+ 選択時のみ S8-OB-03b 経由 → S8-OB-04」と明記
- [x] **1 試行体験の使用ゲーム**：G-04 コントラスト弁別を推奨（理由・差し替え条件も明記）。完了通知バナー・`onboardingCompleted` フラグ保存も規定
- [x] **Sprint 8 screens.md との整合**：sprint-8/screens.md §0 で「F-01 オンボーディング全画面は別ファイル onboarding.md」と明記、§1 受け入れ基準カバレッジ表に F-01 / F-02 / F-03 のオンボーディング担当行が追加されている

### 2. 【前回 致命的】F-03 視聴距離キャリブレーション画面　**◯ 完全対応**

`sprint-19/screens.md §9-CAL「S19-CAL-01：視聴距離キャリブレーション（設定からの独立画面）」` および `sprint-8/onboarding.md §6「S8-OB-04：視聴距離設定（オンボーディング版）」` の 2 画面で完全に設計された。

確認した項目：

- [x] **端末タイプ自動推定**：両画面に「推定：iPhone（dpi 326）」Card 表示、推定失敗時「不明」表示も S19-CAL-01 §状態で規定
- [x] **3 ノッチスライダー**：両画面で 30 / 40 / 50 cm の 3 値、左右矢印で離散移動、Home/End で両端と a11y 仕様
- [x] **現在値 22pt+ 表示**：両画面で「40 cm」を `font.h1 36px Bold` = 約 27pt（22pt 余裕で超過）と明記
- [x] **プレビューパッチ**：両画面で GaborPatch 200×200px（スマホ）/ 240×240px（PC、S19-CAL-01）を配置、距離変更で即時再描画と規定
- [x] **設定からいつでも変更でき、即座に保存**：S19-CAL-01 §フェーズタイミング表「ユーザー、ノッチ変更 → 即座に `viewingDistanceCm` を localStorage に保存」と明記
- [x] **オンボーディング版／設定再訪問版の差**：onboarding.md §6 と sprint-19/screens.md §9-CAL の両方で「同一の UI コンポーネントを使用、違いは前後の遷移と CTA ラベル（『次へ』vs『設定に戻る』）のみ」と明示。重複設計の冗長を避けつつ要件は両画面で独立担保

### 3. 【前回 軽微】F-02 70 代以上選択時の追加警告　**◯ 完全対応**

S8-OB-03b として独立画面で設計された（onboarding.md §5）。

確認した項目：

- [x] **追加警告画面の独立設計**：`role="alertdialog"` フルスクリーン画面遷移、警告アイコン ⚠️（静止）、`palette.semantic.warning` 装飾色、「了解しました」Primary lg 64px
- [x] **文言内容**：「医療機器ではない」「眼科受診優先」「60 秒間の注視がつらい場合は × で中断可」を `font.body.lg 26px line-height 1.6` で記述
- [x] **遷移条件**：S8-OB-03 の年齢層申告で `70s+` 選択時のみ表示、S8-OB-04 視聴距離設定へ続く（フロー図 §1 で明示）
- [x] **設定からの再閲覧と同意日表示**：sprint-19/screens.md §5 S19-04 で v1 DisclaimerSheet `mode="review"` + 「同意日 2026-04-30」表示 + 起動経路（「設定 → 免責事項を読む ›」タップでモーダル）が明記
- [x] **F-02 受け入れ基準のカバレッジ表**：S19-04 §F-02 受け入れ基準カバレッジで 3 項目（18pt 以上 / 設定からの再閲覧 / 同意日時保存と表示）すべてチェック済み

### 4. 【前回 軽微】F-06 単体プレイ後 3 択 UI　**◯ 完全対応**

`components.md §22「SinglePlayPostFooter（FT-1）」` として新規コンポーネントを定義し、`ResultSummaryV11`（§8）の API 拡張で全 13 ゲームの結果サマリから自動呼び出しされる構造になっている。

確認した項目：

- [x] **3 択の存在**：`onBackToList` / `onPlayAgain` / `onGoHome` の 3 ハンドラを ResultSummaryV11 §8 API に追加
- [x] **ボタン優先度の明示**：§22 「CTA 順序の優先度」で Primary（同じゲームをもう一度）→ Secondary（ゲーム一覧へ戻る）→ Tertiary（ホームへ）の縦 3 列配置と理由を明記
- [x] **配置位置**：ASCII モックアップで MetricCard ×2 と区切り線の下に配置、コース時（`isCourseMode=true`）は非表示と §8 / §22 の両方で規定
- [x] **オンボーディング体験完了時の差**：`onboardingCompletionMode=true` のとき「ホームへ」1 つだけ + 完了通知バナー、フッター非表示と §22 / §8 / onboarding.md §8 の 3 箇所で整合
- [x] **a11y**：フッター全体 `role="group"`、各ボタンの `aria-label`（gameNameJa 与えられた場合）、自動フォーカス（Primary）、Tab 順を §22 a11y で網羅
- [x] **Generator 実装ガイド整合**：components.md §19 Generator 実装ガイドに「単体プレイ後のフッターは生 Button を 3 つ並べず、`SinglePlayPostFooter`（§22）経由で `ResultSummaryV11` に組み込むこと」と追記済み
- [x] **全 13 ゲームの結果サマリ画面（S9-03 〜 S17-06）に自動適用される構造**：§22「Generator 実装ノート」で「各ゲームの結果サマリ画面（13 ファイル）を個別に書き換える必要はない、ResultSummaryV11 が `isCourseMode=false` のときに自動で本フッターを描画」と明記。各ゲームの screens.md を個別修正していないが、構造的には 13 ゲーム全カバー

### 5. 【前回 軽微】F-13 バッジ獲得演出の挿入位置　**◯ 完全対応**

`sprint-19/screens.md §8 S19-07` がフェーズタイミング・挿入位置・複数バッジ順次表示・S18-09 連動を含む完全仕様に拡張された。

確認した項目：

- [x] **挿入位置**：§8.1 で ASCII モックアップ提示「MetricCard ×2 と『次へ』ボタンの間、区切り線 1 本 + バッジ獲得カード（高 160px）」と明記
- [x] **フェーズタイミング表**：§8.3 で時刻 0.0s（マウント）→ 2.0s（演出開始 scale 0.6→1.05 overshoot 5%）→ 3.5s（演出完了、計 1.5 秒）→ 任意（次へタップ）or コース時 10s（自動進行）と整理
- [x] **複数バッジ同時獲得時の挙動**：§8.4 で「1.5 秒ずつ順次表示」テーブル明示。3 個以上同時獲得時のフォールバック（10 秒超で 3 個目以降は静止表示のみ）も規定
- [x] **S18-04 / S18-09 連動**：§8.2 でフルコース完了系バッジ（B-02, B-03, B-04, B-09, B-12 等）は S18-09 で演出、1 ゲーム完了系バッジ（B-01, B-06, B-08 等）は各ゲーム結果サマリ S9-03〜S17-06 で演出と振り分け明示
- [x] **prefers-reduced-motion: reduce 時**：§8.6 で scale 即時化、`aria-live` は通常通りと規定
- [x] **a11y**：§8.7 で `role="status"`, `aria-live="assertive"`, `aria-atomic="true"`、複数バッジ時は順次 SR と明記
- [x] **NF-11（点滅なし）遵守**：§8.5 で「フラッシュ・点滅なし」明示
- [x] **受け入れ基準カバレッジ表**：§8.8 で F-13 の 5 項目（1.5 秒演出 / 配置 / 点滅なし / 複数獲得時 / S18-09 連動）すべてチェック済み

---

## 全 F / G 再走サマリ

前回 ◯ 判定の機能 / ゲーム群（24 件）について、修正による劣化や副作用がないか軽くチェック：

### 機能 F（24 件中、修正影響を受けた可能性のあるもの）
- **F-04 ホーム**（◯ 維持）：S8-02 は変更なし、HomeHeroCTA / StreakBadge の規格そのまま
- **F-05 連続コース**（◯ 維持）：S18-01〜S18-06 変更なし、ResultSummaryV11 §8 API 拡張は単体時にしか影響しない（コース時は `isCourseMode=true` で SinglePlayPostFooter 非表示と §22 で明示）
- **F-07 注視訓練ゲーム群（共通）**（◯ 維持）：GamePlaySurface / GameStatusBarV11 / AnswerChoiceGroup の API 変更なし
- **F-10 結果サマリ**（◯ 維持）：ResultSummaryV11 §8 に `onBackToList` / `onPlayAgain` / `onGoHome` / `onboardingCompletionMode` が追加されたが、既存の `onNext` / `isCourseMode` / `countdownSeconds` / `badgeAwarded` のセマンティクスは保たれている。コース時の挙動は変わらない
- **F-13 バッジ獲得**（軽微 → ◯）：上記 5 で詳細確認済み、§8 §19 §22 全節で整合
- **F-14 設定**（◯ 維持）：S19-03 設定画面に「視聴距離 40 cm ›」エントリが新たな S19-CAL-01 への遷移先として正しく接続。「免責事項を読む ›」エントリも S19-04 への遷移経路が明示。設定 ListItem の他項目に変更なし
- **F-17 起動時データリセット**（◯ 維持）：S8-01 / DataResetNotice (RZ-1) 変更なし、S8-OB-01 への接続が mermaid フロー図に追加されただけ
- **F-18 releaseEnabled**（◯ 維持）：onboarding.md / S19-CAL-01 で `releaseEnabled` フラグに依存する処理はない（オンボーディング・距離設定はすべての enabled ゲームに対して 1 度だけ実施するもの）

### ゲーム G-01〜G-13（◯ 維持）
13 ゲームの screens.md（S9-S17）と GE-01〜GE-13 コンポーネントは変更されていない。修正範囲は components.md §8 ResultSummaryV11 と §22 SinglePlayPostFooter 追加・onboarding.md 新規・S19-04 / S19-07 / S19-CAL-01 のみで、ゲーム本体には影響なし。

**前回 ◯ 判定からの劣化：なし。全件維持。**

---

## 新規指摘

なし。

修正過程で特に注意して確認した項目（いずれも問題なし）：

1. **ResultSummaryV11 API 拡張による既存コース動線への影響** → なし。`isCourseMode=true` 時は `onNext` + `countdownSeconds` の従来挙動を維持し、SinglePlayPostFooter は表示しないと §8 / §22 の両方で明示
2. **S8-OB-04（オンボーディング版視聴距離）と S19-CAL-01（設定再訪問版）の一貫性** → 「同一の UI コンポーネントを使用」「違いは前後遷移と CTA ラベルのみ」と両画面で明示。F-03 受け入れ基準は両画面で独立にチェック済みで、Generator 実装時のコード重複も避けられる構造
3. **オンボーディング完了時の `disclaimerAgreedAt` / `ageGroup` / `viewingDistanceCm` / `onboardingCompleted` 4 項目の永続化** → onboarding.md §12 テスト観点で「OB-06 完了で 4 項目すべて永続化」と明示
4. **S8-OB-06 で使用する G-04 が Sprint 8 では未実装（Sprint 12 で本実装）** → onboarding.md §8 で「Sprint 8 はスタブで OK」と Generator 向けに明記。これは Sprint 順序依存の現実解として妥当
5. **F-01 受け入れ基準「タップ数 6 回以下」の解釈** → onboarding.md §1 で「『次へ・同意・選択』系のタップ（=UI 移行タップ）を 6 以下に収め、体験ゲーム本体のタップはカウント外」と方針を明示。70s+ 経由時 6、通常 5 でいずれも基準内
6. **DisclaimerSheet の `mode` 拡張余地** → onboarding.md §3 / §9、sprint-19/screens.md §5 の両方で v1 DisclaimerSheet の mode 拡張可能性に言及。Generator 実装時に v1 コードを確認のうえ最小拡張する旨が明記され、責務が分離されている

---

## 総合判定

**◯ デザイン凍結 OK → Evaluator design-qa（a11y / レスポンシブ / モックアップ実体 / トークン整合性）へ進む**

前回致命的 2 件・軽微 3 件すべてが完全対応された。修正による副作用や新規不足は確認されない。仕様書 spec-v11.md の F-01〜F-18 / G-01〜G-13 の受け入れ基準は、すべて Designer のデザイン成果物で実装可能なレベルでカバーされている。

Evaluator は a11y（aria-label / コントラスト / focus / キーボード動線）、レスポンシブ（360 / 375 / 1280）、モックアップ実体、トークン整合性を中心に最終チェックすればよい。仕様カバレッジは planner 担当として保証する。
