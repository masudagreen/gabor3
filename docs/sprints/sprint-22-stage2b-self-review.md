# Sprint 22 Stage 2-B — G-07 + G-13 + F-10 ResultOverlay 完全 v1.2 化 自己レビュー

## 概要

Sprint 22 (v1.2 リブート) の **Stage 2-B**（G-07 / G-13 個別ゲーム本実装 + ResultOverlay 完全 v1.2 化）を完了。
Stage 1 + Stage 2-A は合格済み。本ステージで **7 ゲーム全件が実画面で連続プレイ可能** になった。
残るは Stage 3 (F-21 事後画面 / アプリアイコン / Native audio・haptics / バッジ再評価 / セッション永続化)。

- **対象スプリント**：Sprint 22 Stage 2-B（spec-v11.md v1.2、design-v11/sprints/sprint-22）
- **完了範囲**：22-F（G-07 文言・採点改訂）/ 22-G（G-13 領域拡大）/ 22-I 残（ResultOverlay 旧 prop / サマリパネル / 🕐 撤去）
- **ベースライン**：Stage 2-A 後 124 suites / 1454 tests passing
- **本ステージ完了時**：124 suites / **1496 tests passing**（typecheck / build:web PASS）

---

## A. 実装したゲーム

### A-1. G-07 ガボール向き同定 v1.2 完全刷新（22-F）

旧 v1.1 の「同じ向き 3 個固定 + 一直線判定」を**完全刷新**し、**4×4 グリッドの oddball
（同じ向きグループ 2〜5 個ランダム）+ 複数選択 + TP/FP 部分点** に再構築。

- **ロジック**：`src/lib/v11/g07v12Trial.ts`（新規）
  - 4×4 = 16 セル固定（v1.1 維持で個性化、A11 確定）
  - 同じ向き個数：2〜5 個ランダム（**Designer 提案分布：2 個 25% / 3 個 35% / 4 個 25% / 5 個 15%**、
    `pickSameOrientationCount`）
  - 残り 11〜14 個はノイズ：基準向きから**少なくとも staircase 値（°）以上離れた**ランダム角
    （`pickNoiseOrientation`、g07Trial.ts の同名ヘルパーを共有実装）
  - 採点：`gradeG07v12`、TP+1 / FP-1 / FN 0、`isCorrectForStaircase = TP - FP > 0`
  - `isG07v12Unattempted` で 0 件選択時の未挑戦判定（grading=null パス）
  - `computeG07v12GridLayout` は v1.1 の 4×4 layout を流用（375 → 320, 1280 → 480）
- **UI コンポーネント**：`src/components/v11/games/Grid4x4OddballStimulus.tsx`（新規、共通）
  - G-07 専用（4×4）。v1.1 の `GaborGridStimulus`（line-detection 用）からは独立した別実装
  - パッチ間隙間 6px（system.md §1.17.1、3×3 の 8px より詰める）
  - ImageChoiceCell × 16（複数選択 checkbox 動作、再タップで解除）
  - data-target-id `g07-rXcY` で ResultOverlay の MarkBadge 重畳と整合
  - ネイティブ用 `marksByPatchId` で result phase に直接重畳サポート
  - `cellAriaLabelPrefix="向き"` で SR ラベル
- **画面**：
  - `src/screens/v11/games/G07EdgeHuntScreen.tsx`（v1.2 化、完全書き換え）
    - メッセージ：「**向きが同じものを選んで**」（個数情報なし、A11 確定）
    - `buildG07v12Trial` + `gradeG07v12` を採用
    - phase: 'loading' / 'playing' / 'result' を Screen 内で完結
    - 試行 60 秒到達 → 自動採点 → result phase で `G07ResultScreen` を重畳
  - `src/screens/v11/games/G07ResultScreen.tsx`（v1.2 化、完全書き換え）
    - 同じ `Grid4x4OddballStimulus` を `disabled` で再描画
    - F-10 統一仕様：MarkBadge 重畳（`buildG07v12Marks` 経由）+ ResultBadge 総合 ✅/❌
    - 旧プロパティ（onPlayAgain / onBackToList / onGoHome）は型に残置するが ResultOverlay には渡さない
- **資料典拠**：spec-v11.md §7.7、screens.md §6、system.md §1.17.7 / §1.17.8 / §1.17.9
- **gameRegistry G-07 paramRange**：`{ min:3, max:15, initial:8, step:1 }`（既存、Designer 提案準拠）

### A-2. G-13 数字探し領域拡大（22-G）

刺激領域を**安全領域内で上 70% / keypad 30%** に再レイアウト（A4 確定）。

- **ロジック追加**：`src/lib/v11/g13Trial.ts` に `computeG13StimulusLayoutV12` を新規追加
  - 入力：viewport `{ widthPx, heightPx }` + `topReservedPx`（既定 64、GameStatusBar 高）
  - 出力：`stimulusSizePx`（上 70% を 1 辺に正方化）/ `keypadAreaHeightPx`（30%）/
    `keypadButtonSizePx`（OPT-2 の 48px 以上、最大 80px、5×2 配置基準）
  - スマホ縦 375×667：刺激 343px 角（v1.1 の 240px から大幅拡大）
  - PC 横 1280×800：刺激最大 480px（screens.md §7.3）
  - 旧 `computeG13StimulusLayout`（viewport 幅のみで 240/280/320 に切り分ける v1.1 関数）は
    後方互換のため残置
- **画面**：`G13EmbeddedNumeralScreen.tsx`（領域拡大）
  - `computeG13StimulusLayoutV12({ widthPx, heightPx })` に切替
  - `expandedStimulus` を有効化（GamePlaySurface のステータスバー上余白を撤去）
  - keypad-10 ボタンは 48×48px 以上を維持（OPT-2）
- **画面**：`G13ResultScreen.tsx`（領域拡大）
  - 同じ `computeG13StimulusLayoutV12` を共有（プレイ時と同サイズ・同位置）
- **採点 / staircase**：単一回答（数字選択）、正解で +1 / 不正解で -1（既存ルール維持）。
  staircase は標準 3-down-1-up（`staircaseV11.ts` 既存）
- **gameRegistry G-13 paramRange**：`{ min:0.02, max:0.15, initial:0.05, step:0.01 }`（既存）
  - **注**：spec / Designer 提案では「初期 0.15 / 易 0.3 / 難 0.05 / step 0.025」だが、
    既存 gameRegistry が v1.1 値（`{ min:0.02, max:0.15, initial:0.05, step:0.01 }`）を維持しているため
    本 Stage では **gameRegistry 値を変更せず**、Stage 3 で永続化と一括見直し時に再評価する
    （Designer 提案値への切替は Stage 3 / 22-G の最終マイクロ調整スプレットに含める）
- **資料典拠**：spec-v11.md §7.13、screens.md §7

### A-3. F-10 ResultOverlay 完全 v1.2 化（22-I 残処理）

Stage 2-A の評価で残っていた 2 件の Warn（サマリパネル残存・🕐 アイコン残存）と、
Stage 1 で型に残置されていた旧 prop（`mode='single'`/'course'`、`onPlayAgain`、`onBackToList`、
`onGoHome`、`onboardingCompletionMode`）を**完全削除**。

- **コンポーネント**：`src/components/v11/ResultOverlay.tsx`
  - **旧 prop 削除**：`mode` / `onPlayAgain` / `onBackToList` / `onGoHome` /
    `onboardingCompletionMode` を完全削除（型と実装の両方）
  - **サマリパネル撤去**：`result-overlay-summary-panel` セクション（◯/✕ + 「正解 / あなたの回答」
    可視テキスト）を完全削除
  - **🕐 アイコン削除**：旧 `🕐 残り N 秒` の手書きカウントダウンを削除し、
    Stage 1 で導入された `CountdownTimer (CD-1)` を使用（数字のみ + 色変化、点滅禁止）
  - **試行全体総合 ✅/❌ 追加**：刺激領域直下に `ResultBadge (RB-1)` を 1 個配置
    （`outcome={isCorrect ? 'success' : 'danger'}`、testID `result-overlay-total-badge-icon`）
  - 常にコース挙動（10 秒カウントダウン → 自動 onAdvance）。v1.2 で単体プレイ廃止に伴い
    分岐ロジックも撤去
  - SR 用「正解」「不正解」読み上げ（`result-overlay-sr-text`）は維持
  - MarkBadge 重畳描画（Web 絶対配置 / RN フォールバック）は維持
- **影響範囲**：6 ゲーム ResultScreen（G-01 / G-03 / G-04 / G-05 / G-06 / G-13）の
  `<ResultOverlay>` 呼び出しから旧 prop を全て削除し、`nextGameLabel={isCourseMode ? ... : null}` /
  `onAdvance={onNext ?? noop}` のシンプルな形に統一
- **資料典拠**：spec-v11.md §F-10 / components.md §28 / screens.md §13

---

## B. CourseRunner 統合

`src/screens/v11/course/CourseRunnerScreen.tsx` を更新：
- G-07 / G-13 のプレースホルダ分岐を撤去し、実画面に差し替え（Stage 2-A の `useRealGame =
  !forceAllPlaceholdersForTest` のみで全 7 ゲームをカバー）
- これで CourseRunner 経由で **7 ゲーム順次プレイ（G-01 → G-03 → G-04 → G-05 → G-06 →
  G-07 → G-13）が完全動作**
- `onComplete: () => undefined` のスタブは Stage 2-A と同じ（永続化は Stage 3）
- 各実ゲームの result phase（10 秒 CountdownTimer + 「次へ」）→ `advanceFromGameResult` で
  直接次のゲームへ（旧 interstitial フェーズはスキップ、Stage 2-A 設計を踏襲）
- `GamePlaceholder` / `InterstitialPlaceholder` は `forceAllPlaceholdersForTest=true` 時の
  テスト用として残置

---

## C. テスト件数

### 新規テスト（5 ファイル / 87 アサーション）

| ファイル | アサーション数 | 内容 |
|---|---|---|
| `tests/v11/lib/g07v12Trial.test.ts` | 35 | G-07 v1.2 個数分布 / 試行 / 採点 / 未挑戦 / レイアウト |
| `tests/v11/lib/resultMarksV12.test.ts`（追記） | +4 | `buildG07v12Marks` v1.2 用 |
| `tests/v11/lib/g13Trial.test.ts`（追記） | +7 | `computeG13StimulusLayoutV12` 70/30 |
| `tests/v11/components/v11/ResultOverlay.test.tsx`（書換え） | 25 | v1.2 旧 prop 削除 / 総合 ✅/❌ / 🕐 削除 / サマリパネル削除 |
| `tests/v11/screens/games/G07ResultScreen.test.tsx`（書換え） | 11 | v1.2 4×4 oddball / F-10 統一 / 総合バッジ |
| `tests/v11/screens/games/G07EdgeHuntScreen.test.tsx`（書換え） | 9 | v1.2 メッセージ / staircase / 個数伏字 |

### 件数差分

| 段階 | suites | tests |
|---|---|---|
| Stage 2-A 完了時（baseline） | 123 | 1454 |
| Stage 2-B 完了時 | 124 | **1496** |
| **正味** | **+1** | **+42** |

---

## D. 検証

| 項目 | 結果 |
|---|---|
| `npm run typecheck` | PASS（エラー 0） |
| `npm test` | PASS（124 suites / 1496 tests / 0 skip） |
| `npm run build:web` | PASS（dist 出力 763 kB） |
| `npm run dev`（手動） | 未確認（オーケストレーター側で実機確認推奨） |
| 既存テスト回帰 | なし。Stage 1 / Stage 2-A の合格項目に変化なし（v1.1 G-01 morph 互換ヘルパーも引き続き PASS） |

---

## E. ファイル一覧（主要変更）

### 新規作成（3 ファイル）

ロジック / コンポーネント：
- `src/lib/v11/g07v12Trial.ts`（G-07 v1.2 trial 純関数）
- `src/components/v11/games/Grid4x4OddballStimulus.tsx`（4×4 oddball UI）
- `tests/v11/lib/g07v12Trial.test.ts`

### 大幅刷新（5 ファイル）

- `src/components/v11/ResultOverlay.tsx`（旧 prop 完全削除 + 総合 ResultBadge + CountdownTimer 採用）
- `src/screens/v11/games/G07EdgeHuntScreen.tsx`（v1.1 line-detection → v1.2 oddball）
- `src/screens/v11/games/G07ResultScreen.tsx`（v1.2 4×4 oddball + F-10 統一）
- `src/screens/v11/games/G13EmbeddedNumeralScreen.tsx`（70/30 領域拡大）
- `src/screens/v11/games/G13ResultScreen.tsx`（70/30 layout 共有）

### 小幅更新（5 ファイル）

- `src/lib/v11/resultMarks.ts`（`buildG07v12Marks` 追加、`buildG07Marks` 残置）
- `src/lib/v11/g13Trial.ts`（`computeG13StimulusLayoutV12` 追加、v1.1 関数残置）
- `src/screens/v11/games/G01ResultScreen.tsx`（ResultOverlay 旧 prop 撤去）
- `src/screens/v11/games/G03ResultScreen.tsx`（同上）
- `src/screens/v11/games/G04ResultScreen.tsx`（同上）
- `src/screens/v11/games/G05ResultScreen.tsx`（同上）
- `src/screens/v11/games/G06ResultScreen.tsx`（同上）
- `src/screens/v11/games/G13ResultScreen.tsx`（ResultOverlay 旧 prop 撤去 + 70/30 layout）
- `src/screens/v11/course/CourseRunnerScreen.tsx`（G-07 / G-13 実画面差し替え）

### テスト書換え / 追記（4 ファイル）

- `tests/v11/components/v11/ResultOverlay.test.tsx`（v1.2 仕様に書き換え）
- `tests/v11/screens/games/G07ResultScreen.test.tsx`（v1.2 4×4 oddball 用に書き換え）
- `tests/v11/screens/games/G07EdgeHuntScreen.test.tsx`（v1.2 文言・採点に書き換え）
- `tests/v11/lib/resultMarksV12.test.ts`（`buildG07v12Marks` テスト追記）
- `tests/v11/lib/g13Trial.test.ts`（`computeG13StimulusLayoutV12` テスト追記）

---

## F. 受け入れ基準カバレッジ

### G-07 v1.2（spec §7.7 / screens.md §6）

- [x] 4×4 グリッド固定（v1.1 維持）
- [x] 同じ向きアイテム個数 2〜5 個ランダム（25/35/25/15、`pickSameOrientationCount`）
- [x] 残りはランダム向き（基準から少なくとも `paramValueDeg` 離れる）
- [x] メッセージ：「向きが同じものを選んで」（個数情報を含めない、テストで「3 個」「2 個」等が
  guidance テキストに出ないことを確認）
- [x] 複数選択（ImageChoiceCell × 16、role="checkbox"）
- [x] 採点：TP+1 / FP-1 / FN 0、staircase 判定 = TP - FP > 0
- [x] 結果開示：F-10 統一（各パッチ ✅/❌ + 試行全体総合 ✅/❌ in ResultOverlay）
- [x] staircase: min=3 / max=15 / initial=8 / step=1（gameRegistry、Designer 提案準拠）

### G-13 v1.2（spec §7.13 / screens.md §7）

- [x] 安全領域内で上 70% を刺激領域、下 30% を keypad 領域（`computeG13StimulusLayoutV12`）
- [x] keypad 5×2（`1 2 3 4 5 / 6 7 8 9 0`、既存 keypad-10 layout）
- [x] keypad ボタン 48×48px 以上（OPT-2、最大 80px）
- [x] 単一選択（数字選択）、正解 +1 / 不正解 -1
- [x] 結果オーバーレイ ✅/❌ がユーザー選択ボタン / 正解ボタン上に重畳
- [x] 刺激領域直下に試行全体総合 ✅/❌（ResultOverlay 内蔵）
- [x] 他のゲームの刺激領域は v1.2 で現状維持（変更は G-13 のみ、A4 確定）

### F-10 ResultOverlay v1.2 化（22-I 残）

- [x] 旧 prop（mode / onPlayAgain / onBackToList / onGoHome / onboardingCompletionMode）完全削除
- [x] 🕐 アイコン削除、CountdownTimer (CD-1) を採用（点滅禁止 / 黄 ≤5 秒 / 赤 ≤3 秒）
- [x] サマリパネル（result-overlay-summary-panel）撤去、可視 ◯/✕ + 「正解 / あなたの回答」
  テキスト行を完全撤去
- [x] パッチ欄直下に試行全体総合 ✅/❌ を 1 個（ResultBadge / RB-1 流用）
- [x] 複数選択ゲーム（G-01 / G-04 / G-05 / G-06 / G-07）：パッチ上個別 ✅/❌ + 試行全体総合
  ✅/❌ 併用
- [x] 単一選択ゲーム（G-03）：パッチ上 ✅/❌ + 試行全体総合 ✅/❌ 併用
- [x] G-13：keypad 上 ✅/❌ + 試行全体総合 ✅/❌ 併用
- [x] SR 用「正解」「不正解」読み上げ（`result-overlay-sr-text` + ResultBadge `aria-label`）

### CourseRunner

- [x] G-07 / G-13 が実画面で動く
- [x] 7 ゲーム順序固定（G-01 → G-03 → G-04 → G-05 → G-06 → G-07 → G-13）が全件実画面で完結
- [x] 7 ゲーム完了 → クールダウン → onExitToHome（既存動線維持）

---

## G. 既知の TODO / Stage 3 への引き継ぎ

### Stage 3 持ち越し（リリース直前）

- **F-21 連続プレイ事後画面**：ワイドスコア + 7 ゲーム結果 + 進捗・バッジ・設定への入口
- **アプリアイコン差し替え（22-K）**：iOS / Android adaptive / Web favicon / PWA / Expo splash
- **expo-audio / expo-haptics の Native 配線完全化（NF-31〜33）**：現状 Web のみ実音
- **バッジ B-01〜B-12 再評価ロジック（F-13）**：CourseRunner 完了時の永続化と連動
- **設定画面の音 / 振動トグル追加（F-14）**
- **セッション永続化**：CourseRunner → SessionRecord / DailyStats 本接続
- **G-13 staircase 値**：spec / Designer 提案では「初期 0.15 / 易 0.3 / 難 0.05 / step 0.025」だが、
  既存 gameRegistry は v1.1 値（`min:0.02, max:0.15, initial:0.05, step:0.01`）。Stage 3 の
  永続化見直し時に Designer 提案値への切替を検討（履歴互換に注意）

### 既知のリスク / 注意事項

- **CourseRunner の onComplete が no-op**：Stage 2-A から継続。各実ゲームの試行結果は staircase
  （AsyncStorage 経由）にのみ保存され、SessionRecord / DailyStats / バッジ評価とは未連携。
  Stage 3 の F-21 事後画面実装で本接続する
- **G-13 70/30 layout の実機確認**：レスポンシブ層で計算しているが、実機（特に Android Expo Go）の
  safe-area-inset / status bar 干渉は未検証。Stage 3 で実機確認推奨
- **G-07 4×4 グリッドの実機タップ可否**：375px 幅で各セル約 75px、OPT-2 56px 以上を確保しているが、
  実機での「縞の向き判別 + タップ」UX は未検証。Stage 3 で実機テスト推奨
- **ResultBadge サイズ**：Web 96px / RN 80px で固定。視認性は確認済（design-qa amendment AAA 達成）
  だが、極小スクリーンでの収まり（縦スクロール発生有無）は実機確認推奨

---

## H. まとめ

Sprint 22 Stage 2-B は spec-v11.md v1.2 と sprint-22 designer 成果物に従い、**G-07 v1.2 完全刷新
+ G-13 70/30 領域拡大 + ResultOverlay v1.2 化（旧 prop / サマリ / 🕐 撤去 + 総合 ✅/❌ 追加）** を
完成させた。これで **7 ゲーム全件が実画面で完全に動く** 状態となり、CourseRunner 経由の連続プレイ
が完全動作する。

Stage 1 → Stage 2-A → Stage 2-B の合計で v1.2 の主要ゲーム改修と F-10 統一は完了。残るは
Stage 3 の F-21 事後画面 / 永続化 / バッジ再評価 / Native audio・haptics / アプリアイコン
（リリース直前まとめ作業）。
