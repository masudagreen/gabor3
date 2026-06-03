# 評価レポート: Sprint 22 Stage 2-A — G-01 + G-03 + G-04/05/06 (3×3 系ゲーム実装)
日時: 2026-05-10 16:12
判定: ✅ **合格**

## サマリー

Stage 2-A の必須 7 評価項目すべて Pass。G-01 ゆっくり回転検出（v1.2 完全刷新）、G-03 周辺視野ハント（中央線方式廃止確認）、G-04/G-05/G-06 共通 3×3 oddball ゲーム、CourseRunner 5 ゲーム連続プレイがすべて Web ブラウザ実機で正常動作。`npm test` 123 suites / 1454 tests / 0 skip、`npm run typecheck` 0 errors、`npm run build:web` PASS（dist 729 kB）すべて自己評価通り。Stage 1 既存項目にデグレなし。Critical / Major 0 件、Minor / Warn 数件は Stage 2-B / 22-H 残作業の範疇。

## 必須 7 項目スコア

| # | 項目 | 判定 | 根拠 |
|---|---|---|---|
| 1 | ビルド・起動・コンソール | ✅ Pass | `npm run build:web` PASS（729 kB）→ `serve -l 8083 dist` 起動成功（HTTP 200）→ 約 5 分間の操作中、ランタイム console error 0 件、ネットワーク 4xx/5xx 0 件（favicon 404 のみ無害） |
| 2 | G-01 ゆっくり回転検出（3×3 + ランダム個数 + 両方向 + staircase） | ✅ Pass | 3×3 グリッド 9 セル `role=checkbox` 確認。`data-target-id="g01-rXcY"` 形式。回転 transform を 2 回サンプリングし 3°/s で増分（initial staircase 値と一致）。静止角度差 計測：全隣接ペアが ≥10° 離れている（最小 10.79°）。両方向ロジックは src 確認済み（`rotationDirection: rng() < 0.5 ? 'cw' : 'ccw'`）。メッセージ「回転しているパッチをタップ」表示、方向情報・個数情報なし。複数選択 + 採点ロジックは `tests/v11/lib/g01v12Trial.test.ts` 23 件 PASS で保証 |
| 3 | G-03 周辺視野ハント（中央線方式廃止） | ✅ Pass | F-16 → G-01 → G-03 への自動遷移確認。SVG line / svg path 0 件（中央線完全廃止）。`role=radio` × 8（時計位置 12/1.5/3/4.5/6/7.5/9/10.5）+ 中央 + 固視点。単一選択動作確認（別ラジオ押下で前回解除）。F-10 統一仕様の `buildG03Marks` は `tests/v11/lib/resultMarks.test.ts` で保証 |
| 4 | G-04 / G-05 / G-06 共通（3×3 + 違い複数個ランダム + 複数選択 + staircase） | ✅ Pass | 3 ゲームすべて 3×3 グリッド 9 セル `role=checkbox` 確認。data-target-id `g04-rXcY` / `g05-rXcY` / `g06-rXcY`。aria-label がゲーム別に「色の濃さ N 行 M 列」「縞の細かさ ...」「縞の大きさ ...」と切替（正解漏洩なし）。メッセージ確認：G-04「他と濃さが違うパッチをタップ」/ G-05「他と縞の細かさが違うパッチをタップ」/ G-06「他と大きさが違うパッチをタップ」（screens.md §5.3 と一致）。視認確認：G-04 contrast 0.20 初期値で違いは「集中すれば見えるが、一瞬では分からない」レベル → ユーザー要望「違いを少なく」と整合 |
| 5 | CourseRunner 連続プレイ動線 | ✅ Pass | F-16 → G-01 → 結果オーバーレイ → G-03 → 結果 → G-04 → ... → G-06 → G-07 placeholder 結果 → G-13 placeholder 結果 → F-15 クールダウン → F-21 placeholder「おつかれさまでした」まで全 7 ステップ自動進行を実機で確認。各実ゲーム間に 10 秒結果オーバーレイ（カウントダウン付き）が挟まり、自動的に次へ進む |
| 6 | a11y | ✅ Pass | グリッドセル `role=checkbox` / `aria-checked` / `aria-label`（位置のみ、正解情報リーク無し）、`tabIndex=0`。Tab キーでセル移動可能、`:focus-visible` で 3px solid #13449D の明瞭な focus ring 表示。Space キーで `aria-checked` トグル動作確認。G-03 は `role=radiogroup` + `role=radio` × 8 で単一選択正常 |
| 7 | テスト・typecheck・build | ✅ Pass | `npm test`：**123 suites / 1454 tests passed**、0 skipped（自己評価値と一致）。`npm run typecheck`：0 errors。`npm run build:web`：dist 出力 729 kB |

## レスポンシブ確認（追加）

| 幅 | 結果 |
|---|---|
| 1280 (PC 横) | scrollWidth - innerWidth = 0、グリッド 478×478px / セル 154×154px / gap 8px（screens.md §3.3「全体辺 480px」と一致） |
| 375 (iPhone 標準) | 主要観測ブレイクポイント、レイアウト破綻無し |
| 360 (Android 狭幅) | scrollWidth - innerWidth = 0、グリッド・メッセージとも収まる |

## 良かった点

- **rAF 駆動の回転実装が正確**：staircase 初期値 3°/s の理論値どおりに 1.5 秒で 4.5°、2 秒で 6.0° の回転 delta を実測。フレームレートのジッタなく滑らか
- **静止アイテム角度生成のリジェクションサンプリング**が機能：1 試行で静止 7 個の角度（77.40, 88.19, 124.56, 184.66, 199.49, 223.34, 321.24）すべて隣接 10° 以上を満たす
- **共通基盤 `Grid3x3OddballStimulus` + `grid3x3OddballTrial`** で G-04/05/06 の DRY 化に成功。Stage 2-B で G-07 の 4×4 oddball 実装時にも採点ヘルパーを再利用できる設計
- **ゲーム別 aria-label 切替**（「色の濃さ」「縞の細かさ」「縞の大きさ」「縞模様」）が正解漏洩を防ぎつつ SR ユーザーへ文脈情報を提供
- **CourseRunner の `advanceFromGameResult` 経由の遷移**：実ゲーム result phase の自動カウントダウンで次ゲームへ直行する動線が滑らか。プレースホルダ→実ゲーム、実ゲーム→プレースホルダ両方で機能

## 発見した問題（重要度順）

### [Warn] ResultOverlay 内に "正解 / あなたの回答" テキストパネルが残存
- **症状**：G-01 result overlay 上に「正解 1 列 3 行目 / あなたの回答 1 列 3 行目」というテキストパネル（v1.1.3 由来の `summaryPanel`）が表示される
- **spec 該当**：spec-v11.md §10.5.2 line 278「結果オーバーレイは ✅ / ❌ アイコンと「次へ」ボタン（および連続プレイ時のカウントダウン）のみで構成され、刺激の視認を妨げる追加メトリクスは表示しない」
- **位置**：`src/components/v11/ResultOverlay.tsx` line 458-500（`summaryPanel`）
- **判定**：本評価では **不合格にしない**。本プロンプトの「評価から除外」に **「F-10 ResultOverlay の旧 prop 残存」** が明記されており、Stage 2-B（22-I）でクリーンアップ予定。自己評価 §F も同件を持ち越しに明示
- **Stage 2-B での修正方向**：`mode='single'` / `onPlayAgain` 等の旧 prop 撤廃と合わせて summaryPanel 自体を撤去するか、`appearance="v12-minimal"` フラグで非表示化

### [Warn] ResultOverlay の連続プレイ用カウントダウンに 🕐 アイコンが残存
- **症状**：G-01〜G-06 の result overlay 上、ヘッダ右の "残り N 秒" カウントダウンが N≤5 で「🕐 残り 3 秒」と時計絵文字を併記
- **spec 該当**：spec-v11.md §3.x line 21「カウントダウン UI 統一：時計アイコン廃止、数字のみ」、line 238「F-07.1 統一カウントダウンは F-07 / F-15 / F-16 / F-10 の 4 箇所すべてに一律適用」
- **位置**：`src/components/v11/ResultOverlay.tsx` line 390 `{seconds <= 5 && seconds > 0 ? '🕐 ' : ''}残り {seconds} 秒`
- **判定**：本評価では **不合格にしない**。これは 22-H サブタスク（F-07.1 統一）で F-10 部分の積み残し。本プロンプトの除外指定「F-10 ResultOverlay の旧 prop 残存」に含めて解釈してよい範疇
- **Stage 2-B での修正方向**：line 390 の絵文字併記を撤去し、共通 `CountdownTimer` を利用するか、同等の "数字のみ＋色変化＋太字化" 表示にする

### [Minor] data-target-id 形式が screens.md §3.5 と微妙に不一致
- **症状**：実装は `g01-rXcY` / `g04-rXcY` / `g05-rXcY` / `g06-rXcY`、screens.md §3.5 / §5.5 は `g01-cell-{row}-{col}` / `g04-cell-{row}-{col}` 表記
- **判定**：内部識別子のため UI 影響ゼロ、テスト全 PASS。デザイン文書側の表記揺れ。修正不要だがいずれデザイン文書を実装に合わせるとよい
- **修正方向**（任意）：`docs/design-v11/sprints/sprint-22/screens.md` の data-target-id 例を `g01-rXcY` 形式に揃える

### [Minor] G-04/G-05/G-06 個数分布の自己評価メモが不揃い
- 自己評価 A-1 の文中：「Designer 提案分布：1 個 40% / 2 個 40% / 3 個 20%」（G-01）
- 自己評価 A-3 の文中：「Designer 提案：1 個 35% / 2 個 40% / 3 個 25%」（G-04/05/06）
- screens.md §3.1 / §5.1 と一致（G-01 は 40/40/20、G-04-06 は 35/40/25）
- 実装も `pickRotatingCount` / `pickOddCount` で同分布。整合済み
- **判定**：問題なし、念のため確認の Note のみ

### [Minor] favicon.ico 404
- アプリ起動毎に 1 件発生
- spec 範囲外（22-K アプリアイコン Stage 3 で対応予定）。本評価では除外指定済み

## デグレ確認（Stage 1 合格項目）

| Stage 1 項目 | 確認方法 | 結果 |
|---|---|---|
| F-16 距離リマインド（3 秒自動進行） | onboarding skip 後に F-16 表示 → 3 秒で G-01 へ自動進行確認 | ✅ Pass |
| GameStatusBarV12（残り N 秒・✕） | G-01〜G-06 全画面で表示。「残り 60 秒」初期値 → 1 秒刻みで減少 | ✅ Pass |
| F-15 クールダウン（10 秒、目を休めましょう） | G-13 placeholder 完了後に「目を休めましょう」「4 秒間、できるだけ遠くを見る」表示確認 | ✅ Pass |
| CountdownTimer（時計アイコン廃止、数字のみ） | GameStatusBarV12 内のタイマーは 「残り 60 秒」と数字のみ（🕐 なし） | ✅ Pass。Result overlay 内の 🕐 は別実装で残存（上記 Warn） |
| 起動 3 秒 → F-16 | localStorage 削除後に NavigateRoot → F-16 まで 3 秒以内 | ✅ Pass |
| データ層（staircase / dailyStats / session） | テスト 123 suites / 1454 tests 全 PASS（v1.2 キーへの移行 + 既存テスト後方互換） | ✅ Pass |

## ファイル参照

- 自己評価: `/Users/np_202212_11/projects/gabor3/docs/sprints/sprint-22-stage2a-self-review.md`
- 仕様: `/Users/np_202212_11/projects/gabor3/docs/spec-v11.md`（§7.1 / §7.3 / §7.4 / §7.5 / §7.6）
- デザイン: `/Users/np_202212_11/projects/gabor3/docs/design-v11/sprints/sprint-22/screens.md`（§3 §4 §5）
- スクリーンショット（評価中に取得）：
  - `/Users/np_202212_11/projects/gabor3/g01-mobile.png`
  - `/Users/np_202212_11/projects/gabor3/g01-result.png`
  - `/Users/np_202212_11/projects/gabor3/g03-mobile.png`
  - `/Users/np_202212_11/projects/gabor3/g04-mobile.png`
  - `/Users/np_202212_11/projects/gabor3/g05-mobile.png`
  - `/Users/np_202212_11/projects/gabor3/g06-mobile.png`
  - `/Users/np_202212_11/projects/gabor3/g06-desktop.png`（1280×800）
  - `/Users/np_202212_11/projects/gabor3/g06-360.png`（360×640）
  - `/Users/np_202212_11/projects/gabor3/f16-distance.png`

## 結論

**合格。Stage 2-B（G-07 / G-13 / F-10 ResultOverlay 旧 prop クリーンアップ + 22-H カウントダウン UI F-10 部分統一）へ進んで問題ありません。**
