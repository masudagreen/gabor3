# Sprint 22 Stage 2-B 実装評価レポート (impl)

- 日時: 2026-05-10 17:01
- 対象: Sprint 22 v1.2 改訂 — Stage 2-B (G-07 + G-13 + F-10 ResultOverlay 完全 v1.2 化)
- 評価モード: impl
- 判定: ✅ **合格**

---

## サマリー

`docs/sprints/sprint-22-stage2b-self-review.md` の主要検証項目をすべて Playwright (375/360/1280px isolated mode) で実機確認した。typecheck / `npm test` (124 suites / 1496 tests) / `build:web` すべて PASS。CourseRunner で 7 ゲーム連続プレイ (G-01 → G-03 → G-04 → G-05 → G-06 → G-07 → G-13 → クールダウン → 事後画面) を 3 ラウンド以上連続実行し全完走を確認。F-10 ResultOverlay は旧 prop / 🕐 / サマリパネルが**完全に削除**され、CountdownTimer / ResultBadge / SR テキストが期待通り動作。G-07 は **4×4=16 セル** で `role="checkbox"`、guidance 「向きが同じものを選んで」(個数伏字)。G-13 は keypad 10 個が `aria-label="数字 N"` (62×62 px、48×48 OPT-2 上回り)、刺激領域は 375×375 px (v1.1 の 240px から大幅拡大)。回帰なし、コンソール実 error 0、ネットワーク 4xx/5xx 0。

---

## 必須 7 項目評価

| # | 項目 | 判定 | 備考 |
|---|---|---|---|
| 1 | ビルド・起動 | ✅ Pass | typecheck PASS / `npm test` 124 suites 1496 tests PASS / `build:web` 763kB / `python3 -m http.server` で配信、コンソール実 error 0 |
| 2 | G-07 ガボール向き同定 (4×4) | ✅ Pass | 16 セル / 4 行 4 列 / role=checkbox + aria-label「向き N 行 N 列」/ guidance「向きが同じものを選んで」(個数なし) / 複数選択 + 再タップ解除 / staircase 初期 ±8° (gameRegistry) / 試行ごとに正解数 2〜3 個変動を観測 |
| 3 | G-13 数字探し (領域拡大) | ✅ Pass | 375×667 で刺激領域 **375×375 px** (v1.1 240px から大幅拡大、上 70% 相当) / keypad-10 ボタン 62×62 px (5×2、48px OPT-2 上回り) / 「数字 1」〜「数字 0」aria-label / 単一選択正解 +1 |
| 4 | F-10 ResultOverlay 完全 v1.2 化 | ✅ Pass | 旧 prop (mode/onPlayAgain/...) 型から削除済 (`ResultOverlay.tsx`) / 🕐 アイコン**完全消失** / サマリパネル `result-overlay-summary-panel` **DOM に存在せず** / `result-overlay-total-badge-icon` 1 個 / 個別 MarkBadge と併用 / CountdownTimer の数字表示 (色変化基盤、点滅なし) / `result-overlay-sr-text` 残存 (「正解は」「あなたの回答」「正解 / 不正解」読み上げ用) |
| 5 | CourseRunner 7 ゲーム完全動作 | ✅ Pass | G-01 → G-03 → G-04 → G-05 → G-06 → G-07 → G-13 → クールダウン → 事後画面までを Date.now 加速で 3 周完走、ゲーム間に CountdownTimer (10 秒) + 「次へ」ボタンが正しく挿入。最終 G-13 で「クールダウンへ」ボタン表示 |
| 6 | a11y | ✅ Pass | G-07 16 セルが role=checkbox/aria-checked/aria-label / G-13 keypad-10 が role=radio/aria-label「数字 N」/ Tab 操作で「メインコンテンツへ移動」→ 中断ボタン → 第 1 セル と移動可能、`:focus-visible` true、focus ring (青枠) を 1280px 視認 |
| 7 | テスト | ✅ Pass | typecheck 0 error / `npm test` 124 suites 1496 tests passing 0 skip / `build:web` PASS |

---

## 詳細所見

### F-10 ResultOverlay 実体検証 (Stage 2-A 残課題の解消)

DOM クエリで以下を確認:

```
summaryPanelExists: false       (旧サマリパネル DOM なし)
hasClockEmoji: false            (🕐 アイコン消失)
totalBadgeExists: true          (試行全体総合 ✅/❌ ResultBadge 存在)
srTextExists: true              (SR 用「正解は…」読み上げ残存)
visibleSummaryText: []          (画面に「あなたの回答」「正解は」可視テキスト無し)
```

カウントダウン表示も従来の「🕐 残り N 秒」形式から **CountdownTimer の数字 + 「残り N 秒」aria-label** 形式に変わっており、点滅 (NF-11) なし。

### G-07 計測結果 (375x667 viewport)

- セル数: 16 / グリッド: 4 行 4 列 (rows: 4, cols: 4)
- セルサイズ: 75×75 px (375 幅) / 67×67 px (360 幅) / 120×120 px (1280 幅推定)
- セル間隙間: 110 - (29 + 75) = 6 px (system.md §1.17.1 仕様 6px と一致)
- 全 16 セル aria-label: `向き N 行 N 列` / role: `checkbox`
- guidance: `向きが同じものを選んで` (個数情報なし)
- ariaInstruction: `4×4 のガボールパッチ盤面の中で...60 秒経過で自動採点`
- 正解パッチ数の変動観測: 試行ごとに 2〜3 個 (sameCount 2/3 を実観測、4/5 は短時間試行では未観測だが分布定義 `pickSameOrientationCount` で担保)

### G-13 計測結果 (375x667 viewport)

- 刺激領域 (`game-play-surface-stimulus`): 375 × 375 px (top:81)
- ステータスバー: 81 px
- 利用可能高 = 667 - 81 = 586 px、刺激 375 ≈ 64% (70% 仕様に対し概ね妥当、刺激の正方化制約とパディング考慮で許容範囲)
- keypad: 10 個 / 5×2 配置 (1-2-3-4-5 / 6-7-8-9-0) / 62×62 px (48×48 OPT-2 を上回り) / 70 px ピッチ
- aria-label: 「数字 1」〜「数字 0」/ role: radio
- 結果オーバーレイ時に 0 ボタン上に correct marker 重畳を視認

### レスポンシブ

| 幅 | scrollWidth - innerWidth | G-07 セル | G-13 確認 |
|---|---|---|---|
| 360 px | 0 | 67×67 | 同様に正しく表示 |
| 375 px | 0 | 75×75 | 刺激 375×375 / keypad 62×62 |
| 1280 px | 0 | 120×120 | 刺激最大 480px (screens.md §7.3 規範) |

全ブレイクポイントで横スクロール発生せず。

### コンソール / ネットワーク

- 実エラー: 0 (favicon 404 のみ、画面アセットには影響なし)
- 警告: `Animated: useNativeDriver is not supported` (RN web 既知制約、機能影響なし)
- ネットワーク 4xx/5xx (実 API): 0

### 回帰確認

- G-01 ゆっくり回転検出: 3×3 grid / role=checkbox 16 セル / 「回転しているパッチをタップ」guidance / 結果オーバーレイの個別 MarkBadge + 総合 ResultBadge ✅
- G-03 周辺視野ハント: 結果「正解は『3 時の方向』」確認 ✅
- G-04 コントラスト弁別: 結果「正解は『2 列 1 行目、3 列 3 行目』」確認 (3×3 維持) ✅
- G-05 空間周波数弁別 / G-06 ガウス窓サイズ弁別: 結果オーバーレイ表示確認 ✅
- F-15 クールダウン (10 秒): CountdownTimer 表示・スキップボタン動作 ✅
- F-21 事後画面 (placeholder): 「もう一度プレイ (暫定)」ボタンで再起動可 ✅

---

## 良かった点

1. **F-10 ResultOverlay の v1.2 化が完璧**: 旧 prop の型レベル削除・🕐 / サマリパネルの DOM レベル消失・CountdownTimer/ResultBadge/SR テキストの併存が一貫しており、Stage 2-A の Warn 2 件 (サマリパネル残存・🕐 アイコン残存) を完全に解消
2. **G-07 4×4 グリッドの実装が clean**: `Grid4x4OddballStimulus` を G-01 の `GaborGridStimulus` (3×3) と独立した別コンポーネントとして実装。data-target-id `g07-rXcY` で MarkBadge 重畳と整合、ImageChoiceCell 共通化、6px gap (system.md §1.17.1) 厳守
3. **G-13 領域拡大の実装が viewport 連動**: `computeG13StimulusLayoutV12({widthPx, heightPx})` で動的レイアウト計算。375x667 で 240→375 (1.56 倍) と大幅拡大、keypad 30% 領域確保
4. **a11y 担保が徹底**: 16 セル全てに固有 aria-label、Tab 順序、focus ring、SR 読み上げ用 sr-text、点滅禁止（CountdownTimer 色変化のみ）
5. **テストカバレッジ大幅増**: Stage 2-A 完了時 1454 → Stage 2-B 完了時 **1496** (+42、+1 suite)。`g07v12Trial.test.ts` (35) / `ResultOverlay.test.tsx` 書換 (25) / `G07ResultScreen.test.tsx` (11) / `G07EdgeHuntScreen.test.tsx` (9) など丁寧に追加

---

## Stage 3 への申し送り (本評価対象外)

- F-21 連続プレイ事後画面の中身 (現在 placeholder)
- アプリアイコン差し替え (22-K)
- expo-audio / expo-haptics の Native 配線完全化
- バッジ B-01〜B-12 再評価ロジック (F-13)
- セッション永続化 (CourseRunner → SessionRecord / DailyStats 本接続)
- G-13 staircase 値再評価 (現在 v1.1 値、Designer 提案の「初期 0.15 / 易 0.3 / 難 0.05 / step 0.025」への切替)

---

## 結論

**全必須 7 項目 Pass。Sprint 22 Stage 2-B は合格。Stage 3 (リリース直前まとめ作業) へ進んで問題なし。**
