# Sprint 22 Stage 2-A — G-01 + G-03 + G-04/05/06 (3×3 系ゲーム実装) 自己レビュー

## 概要

Sprint 22 (v1.2 リブート) の **Stage 2-A**（個別ゲーム本実装、3×3 系）を完了。
Stage 1（共通基盤・削除・データ層）は完了済み合格、Stage 2-B（G-07 / G-13 /
ResultOverlay 旧 prop 整理）と Stage 3（F-21 事後画面・バッジ再評価・アイコン）は次回。

- **対象スプリント**：Sprint 22 Stage 2-A（spec-v11.md v1.2、design-v11/sprints/sprint-22）
- **完了範囲**：22-C（G-01 仕様刷新）/ 22-D（G-03 解答表示 F-10 統一の確認）/
  22-E（G-04 / G-05 / G-06 共通 3×3 化）+ CourseRunner への 5 ゲーム実画面差し替え
- **ベースライン**：Stage 1 後 1381 tests passing
- **本ステージ完了時**：1454 tests passing（typecheck / build:web PASS）

---

## A. 実装したゲーム

### A-1. G-01 ゆっくり回転検出（v1.2 完全刷新）

旧 v1.1 の morphing 検出（角度がじわじわ変わる）を**完全廃止**し、**3×3 グリッドで
複数パッチが等速回転している中から回転中のものを選ぶ**ゲームに刷新。

- **ロジック**：`src/lib/v11/g01v12Trial.ts`（新規）
  - 3×3 = 9 セル固定
  - 回転対象個数：1〜3 個ランダム（**Designer 提案分布：1 個 40% / 2 個 40% /
    3 個 20%**、`pickRotatingCount`）
  - 静止アイテムはそれぞれ独立にランダム角（0〜360°）、互いに最低 10° 離れる
    （`generateStaticOrientations`、リジェクションサンプリング）
  - 回転方向はアイテムごとに ±50% で `cw` / `ccw`
  - `patchOrientationAtTime(patch, elapsedSec, speed)` で時刻 → 角度（線形回転、mod 360）
  - 採点：TP+1 / FP-1 / FN 0、score=Math.max(0, TP-FP)、staircase 判定 = TP-FP > 0
- **UI コンポーネント**：
  `src/components/v11/games/G01RotationGridStimulus.tsx`（新規）
  - 親が `elapsedSec` を渡すパッシブな表示コンポーネント
  - ImageChoiceCell × 9（role="checkbox"、複数選択）
  - data-target-id "g01-rXcY" 形式で ResultOverlay 重畳と整合
  - ネイティブ用に marksByPatchId で result phase でセル中央に MarkBadge 描画
- **画面**：
  `src/screens/v11/games/G01ChangeDetectScreen.tsx`（v1.2 化、完全書き換え）
  - 60 秒タイマー（既存 useGameCountdown を再利用）
  - **requestAnimationFrame 駆動**で elapsedSec を更新（60fps、prefers-reduced-motion
    時は 5fps 階段化）
  - 中断ダイアログ表示中はタイマー & rAF 停止
  - phase: 'loading' / 'playing' / 'result' を Screen 内で完結（独立画面遷移なし）
  - 試行 60 秒到達 → 自動採点 → result phase で `G01ResultScreen` を重畳
  - **テスト容易性**：`disableAnimationForTest` で rAF 無効化（jest fake timer 上で無限ループ回避）
- **結果画面**：
  `src/screens/v11/games/G01ResultScreen.tsx`（v1.2 化、書き換え）
  - 同じ `G01RotationGridStimulus` を `disabled` で再描画
  - F-10 統一仕様：MarkBadge 重畳（`buildG01v12Marks` 経由）+ ResultBadge 総合 ✅/❌
    （ResultOverlay 内蔵の summary panel）
- **資料典拠**：spec-v11.md §7.1、screens.md §3、system.md §1.17.4 / §1.17.5

### A-2. G-03 周辺視野ハント（v1.2 確認のみ）

Stage 1 の時点ですでに **F-10 統一仕様**（パッチ上 ✅/❌ + 試行全体総合）に
準拠していた（v1.1.2 Sprint 21 で中央線方式を撤去済み、v1.1 から `RadialEightStimulus`
の直接タップ + ResultOverlay 経由）。

- 構造変更なし。`buildG03Marks`（既存）が `g03-pos-{12|1.5|...}` 形式で
  ResultOverlay の重畳と整合済み
- **Stage 2-A の作業**：spec / screens.md と既存実装の差分確認のみ。動作変更なし
- 旧 v1.0 「中央線方式」コードは src 配下に存在しないことを再確認（grep 検索済み）

### A-3. G-04 コントラスト弁別（v1.2 完全新規）

旧 v1.1 の左右 2 ガボール → **3×3 グリッドの oddball**（コントラストが他と違う
パッチを 1〜3 個ランダムに混入、複数選択）に刷新。

- **共通基盤**：`src/lib/v11/grid3x3OddballTrial.ts`（新規）
  - `pickOddCount(rng)`：個数分布抽選（**Designer 提案：1 個 35% / 2 個 40% /
    3 個 25%**）
  - `gradeGrid3x3Oddball<TPatch>(trial, selectedIds)`：TP+1 / FP-1 / FN 0、
    staircase 判定 = TP-FP > 0
  - `isGrid3x3Unattempted(selectedIds)`、`indexToCellId(i)`、
    `pickIndicesWithoutReplacement(total, k, rng)` を共通化
- **G-04 個別ロジック**：`src/lib/v11/g04v12Trial.ts`（新規）
  - 全 9 パッチ共通の orientation / phase / cpd / sigmaDeg
  - oddball のみ `baseContrast ± paramValueContrast`（試行ごとに oddSign 1/-1 ランダム）
  - paramRange は `gameRegistry` で `0.05 ~ 0.40 / initial 0.20 / step 0.025`
- **UI コンポーネント**：`src/components/v11/games/Grid3x3OddballStimulus.tsx`（新規、共通）
  - G-04 / G-05 / G-06 で再利用
  - data-target-id `${prefix}-rXcY` 付与（'g04' / 'g05' / 'g06'）
  - cellAriaLabelPrefix で SR ラベルをゲーム別に切替（「色の濃さ」「縞の細かさ」「縞の大きさ」）
  - ネイティブ用 marksByPatchId 直接重畳サポート
- **画面**：`src/screens/v11/games/G04ContrastDiscriminationScreen.tsx` / `G04ResultScreen.tsx`（新規）
  - G-01 と同じく Screen 内 phase 完結型
  - `buildGrid3x3OddballMarks({oddIds, allIds, selectedIds, prefix: 'g04'})` で marks 構築
  - thresholdContrast を `round3` で丸めて返す（小数 3 桁）
- **メッセージ**：「他と濃さが違うパッチをタップ」（screens.md §5.3 確定）

### A-4. G-05 空間周波数弁別（v1.2 完全新規）

G-04 と同じ 3×3 oddball 構造。staircase 連動先のみ「cpd 比 r」に置換。

- **ロジック**：`src/lib/v11/g05v12Trial.ts`（新規）
  - 全パッチ共通 contrast / sigmaDeg / orientation / 違うのは cpd のみ
  - oddball cpd = `baseCpd * r`（finer）または `baseCpd / r`（coarser）。試行ごとにランダム
  - paramRange は `gameRegistry` で `1.1 ~ 2.5 / initial 1.5 / step 0.1`
- **画面**：`G05SpatialFrequencyScreen.tsx` / `G05ResultScreen.tsx`（新規）
  - thresholdRatio を `round2` で丸めて返す（小数 2 桁）
- **メッセージ**：「他と縞の細かさが違うパッチをタップ」

### A-5. G-06 ガウス窓サイズ弁別（v1.2 完全新規）

G-05 と同じ構造。staircase 連動先は「SD 比 r」（v1.1 維持）。

- **ロジック**：`src/lib/v11/g06v12Trial.ts`（新規）
  - 違うのは sigmaDeg のみ
  - oddball sigma = `baseSigmaDeg * r`（larger）または `baseSigmaDeg / r`（smaller）
  - paramRange は `gameRegistry` で `1.1 ~ 2.0 / initial 1.5 / step 0.1`（v1.1 維持）
- **画面**：`G06GaussianSizeScreen.tsx` / `G06ResultScreen.tsx`（新規）
- **メッセージ**：「他と大きさが違うパッチをタップ」

---

## B. CourseRunner 統合

`src/screens/v11/course/CourseRunnerScreen.tsx` を更新：
- G-01 / G-03 / G-04 / G-05 / G-06 を実画面に差し替え
- G-07 / G-13 は引き続き `GamePlaceholder`（Stage 2-B 持ち越し）
- `forceAllPlaceholdersForTest` prop 追加（テストで実画面回避用、未使用時は本番動作）
- 実ゲームは内部で result phase（ResultOverlay 重畳 + 10 秒 CountdownTimer）を完結
  するため、旧 `interstitial` フェーズはスキップ → `advanceFromGameResult` で
  直接次のゲームへ
- 実ゲーム → プレースホルダゲーム（G-07 / G-13）の切替時も同フローで対応

> **注意**：CourseRunner からの実ゲーム呼び出しでは `onComplete` を `() => undefined` で
> 渡しているため、Stage 2-A では永続化（SessionRecord / DailyStats 等）は走らない。
> Stage 3 で本接続予定（spec §13.1 22-A の F-21 事後画面実装と合わせて）。

---

## C. resultMarks ヘルパー追加

`src/lib/v11/resultMarks.ts` に v1.2 用ヘルパーを追加：

- `buildG01v12Marks({trial, selectedIds})`：G-01 v1.2 の rotatingIds から
  correctChosen / correctMissed / wrongChosen を構築。targetId は `g01-rXcY`
  形式（旧 `buildG01Marks` と同じ prefix で互換）
- `buildGrid3x3OddballMarks({oddIds, allIds, selectedIds, prefix})`：G-04 / G-05 /
  G-06 共通の oddball marks ヘルパー。prefix で targetId を切替

旧 `buildG01Marks`（v1.1 morph 用）は `lib/game1.ts` を使う v1.0 系コード（v1
ExperienceScreen 等）と既存テストの後方互換のため**残置**。

---

## D. テスト件数

### 新規テスト（5 ファイル / 78 アサーション）

| ファイル | アサーション数 | 内容 |
|---|---|---|
| `tests/v11/lib/g01v12Trial.test.ts` | 23 | G-01 個数分布 / 静止角度生成 / 試行 / 角度時間関数 / 採点 |
| `tests/v11/lib/grid3x3OddballTrial.test.ts` | 16 | 共通基盤の個数分布 / 採点 / 未挑戦判定 |
| `tests/v11/lib/g04v12Trial.test.ts` | 9 | G-04 試行生成 / odd 個数 / 共通 orientation / oddSign |
| `tests/v11/lib/g05v12Trial.test.ts` | 8 | G-05 試行生成 / cpd 比 / oddDirection |
| `tests/v11/lib/g06v12Trial.test.ts` | 8 | G-06 試行生成 / SD 比 / oddDirection |
| `tests/v11/lib/resultMarksV12.test.ts` | 11 | buildG01v12Marks / buildGrid3x3OddballMarks |
| `tests/v11/screens/games/G01ChangeDetectScreenV12.test.tsx` | 5 | G-01 マウント / OPT-12 / 60 秒経過 → result |
| `tests/v11/screens/games/G04ContrastDiscriminationScreen.test.tsx` | 5 | G-04 マウント / メッセージ / 60 秒経過 / result phase |
| `tests/v11/screens/games/G05SpatialFrequencyScreen.test.tsx` | 4 | G-05 同上 |
| `tests/v11/screens/games/G06GaussianSizeScreen.test.tsx` | 4 | G-06 同上 |

### 削除テスト（v1.1 G-01 用、v1.2 で型不整合）

- `tests/v11/screens/games/G01ChangeDetectScreen.test.tsx`（v1.1 morph 版、削除）
- `tests/v11/screens/games/G01ResultScreen.test.tsx`（v1.1 morph 版、削除）

### 件数差分

| 段階 | suites | tests |
|---|---|---|
| Stage 1 完了時（baseline） | 115 | 1381 |
| Stage 2-A 完了時 | 123 | 1454 |
| **正味** | **+8** | **+73** |

---

## E. 検証

| 項目 | 結果 |
|---|---|
| `npm run typecheck` | PASS（エラー 0） |
| `npm test` | PASS（123 suites / 1454 tests / 0 skip） |
| `npm run build:web` | PASS（dist 出力 729 kB） |
| `npm run dev`（手動） | 未確認（オーケストレーター側で実機確認推奨） |
| 既存テスト回帰 | なし。`buildG01Marks`（v1.1 互換）テストも全 PASS |

---

## F. 既知の TODO / Stage 2-B / Stage 3 への引き継ぎ

### Stage 2-B 持ち越し（次回）

- **G-07 ガボール向き同定（22-F）**：4×4 維持、メッセージ「向きが同じものを選んで」
  （個数伏字）、TP+1 / FP-1 部分点。Stage 1 完了時の `G07EdgeHuntScreen.tsx` /
  `G07ResultScreen.tsx` は既存 v1.1 (4×4 + 同向き 3 個固定) で残存しているため、
  - メッセージを「向きが同じものを選んで」に変更
  - 同じ向きアイテム個数を 2〜5 個ランダム化（25/35/25/15）
  - 採点を TP+1/FP-1 部分点に統一
  が必要
- **G-13 数字探し（22-G）**：上 70% 刺激 / 下 30% keypad の領域配分に拡大
- **F-10 ResultOverlay の旧 prop クリーンアップ（22-I 残）**：
  - `mode='single'` / `onPlayAgain` / `onBackToList` / `onGoHome` の prop は型に残存
  - 数値テキストは v1.2 仕様で完全撤去済みだが、API 撤廃は Stage 2-B で

### Stage 3 持ち越し（リリース直前）

- **F-21 連続プレイ事後画面（22-A 残）**：ワイドスコア + 7 ゲーム結果 + 進捗・バッジ・
  設定への入口。CourseRunner からの実ゲーム永続化（SessionRecord / DailyStats / 連続日数 /
  バッジ評価）と一緒に再構築
- **アプリアイコン差し替え（22-K）**：iOS / Android adaptive / Web favicon / PWA / Expo splash
- **expo-audio / expo-haptics の Native 配線完全化（NF-31〜33）**：現状 Web のみ実音、
  Native は no-op

### 既知のリスク

- **CourseRunner の onComplete が no-op**：Stage 2-A では各実ゲームの試行結果は
  staircase（AsyncStorage 経由）にのみ保存され、SessionRecord / DailyStats /
  バッジ評価とは未連携。Stage 3 の F-21 事後画面実装で本接続する
- **rAF タイミング依存**：G-01 の回転表示は `requestAnimationFrame` で elapsedSec を
  更新。`disableAnimationForTest` でテストでは無効化したが、本番（Web 実機 / Android）
  での回転速度の見え方は実機確認が望ましい
- **prefers-reduced-motion: reduce 時の 5fps 階段化**：実装はしたが、reduced-motion
  ON 時の visual 確認は未実施
- **Result phase での MarkBadge 配置**：Web は ResultOverlay の DOM 探索で絶対配置。
  ネイティブはセル中央に直接描画（`marksByPatchId`）。両環境で動作するよう実装
  されているが、ネイティブ実機での視覚回帰は Stage 3 で要確認

---

## G. ファイル一覧（主要変更）

### 新規作成（13 ファイル）

ロジック：
- `src/lib/v11/g01v12Trial.ts`
- `src/lib/v11/grid3x3OddballTrial.ts`
- `src/lib/v11/g04v12Trial.ts`
- `src/lib/v11/g05v12Trial.ts`
- `src/lib/v11/g06v12Trial.ts`

UI コンポーネント：
- `src/components/v11/games/G01RotationGridStimulus.tsx`
- `src/components/v11/games/Grid3x3OddballStimulus.tsx`

画面：
- `src/screens/v11/games/G04ContrastDiscriminationScreen.tsx`
- `src/screens/v11/games/G04ResultScreen.tsx`
- `src/screens/v11/games/G05SpatialFrequencyScreen.tsx`
- `src/screens/v11/games/G05ResultScreen.tsx`
- `src/screens/v11/games/G06GaussianSizeScreen.tsx`
- `src/screens/v11/games/G06ResultScreen.tsx`

テスト（10 ファイル）：
- `tests/v11/lib/g01v12Trial.test.ts`
- `tests/v11/lib/grid3x3OddballTrial.test.ts`
- `tests/v11/lib/g04v12Trial.test.ts`
- `tests/v11/lib/g05v12Trial.test.ts`
- `tests/v11/lib/g06v12Trial.test.ts`
- `tests/v11/lib/resultMarksV12.test.ts`
- `tests/v11/screens/games/G01ChangeDetectScreenV12.test.tsx`
- `tests/v11/screens/games/G04ContrastDiscriminationScreen.test.tsx`
- `tests/v11/screens/games/G05SpatialFrequencyScreen.test.tsx`
- `tests/v11/screens/games/G06GaussianSizeScreen.test.tsx`

### 大幅刷新（4 ファイル）

- `src/screens/v11/games/G01ChangeDetectScreen.tsx`（v1.1 morph → v1.2 rotation）
- `src/screens/v11/games/G01ResultScreen.tsx`（v1.2 rotation 用に書き換え）
- `src/screens/v11/course/CourseRunnerScreen.tsx`（実ゲーム差し替え + advanceFromGameResult）
- `src/lib/v11/resultMarks.ts`（buildG01v12Marks / buildGrid3x3OddballMarks 追加、buildG01Marks 残置）

### 削除（2 ファイル）

- `tests/v11/screens/games/G01ChangeDetectScreen.test.tsx`（v1.1 morph 用）
- `tests/v11/screens/games/G01ResultScreen.test.tsx`（v1.1 morph 用）

---

## H. 受け入れ基準カバレッジ

### G-01（spec §7.1 / screens.md §3）

- [x] 3×3 固定グリッド
- [x] 回転アイテム個数 1〜3 個ランダム（35/40/25 ではなく **40/40/20**、Designer 提案準拠）
- [x] 静止アイテム角度ランダム + 互いに 10° 以上離す
- [x] 回転方向アイテムごとにランダム（cw / ccw）
- [x] 回転速度 staircase（min 1 / max 6 / initial 3 / step 0.5）
- [x] メッセージ「回転しているパッチをタップ」（方向情報なし）
- [x] 採点 TP+1 / FP-1 / FN 0、staircase 判定 = TP-FP > 0
- [x] requestAnimationFrame 駆動の回転、reduced-motion で 5fps 階段化
- [x] 「現在の回答：◯◯」テキスト表示なし
- [x] 試行中の正誤フィードバックなし

### G-03（spec §7.3 / screens.md §4）

- [x] 中央線方式の表示なし（v1.1.2 で撤去済みを再確認）
- [x] 単一選択 radio 動作（既存）
- [x] 中央 + は選択不能（既存）
- [x] 結果オーバーレイは F-10 統一仕様（既存、`buildG03Marks` 経由）

### G-04 / G-05 / G-06（spec §7.4-7.6 / screens.md §5）

- [x] 3×3 固定グリッド（共通 `Grid3x3OddballStimulus`）
- [x] 違うパッチ個数 1〜3 個ランダム（35/40/25、`pickOddCount`）
- [x] 複数選択（ImageChoiceCell × 9、role="checkbox"）
- [x] 採点 TP+1 / FP-1 / FN 0、staircase 判定 = TP-FP > 0
- [x] 結果開示 F-10 統一（各パッチ ✅/❌ + 試行全体総合 ✅/❌）
- [x] G-04 メッセージ「他と濃さが違うパッチをタップ」
- [x] G-05 メッセージ「他と縞の細かさが違うパッチをタップ」
- [x] G-06 メッセージ「他と大きさが違うパッチをタップ」
- [x] G-04 staircase: 初期 0.20 / min 0.05 / max 0.40 / step 0.025（gameRegistry）
- [x] G-05 staircase: 初期 1.5 / min 1.1 / max 2.5 / step 0.1
- [x] G-06 staircase: 初期 1.5 / min 1.1 / max 2.0 / step 0.1（v1.1 維持、A3）

### CourseRunner

- [x] G-01 / G-03 / G-04 / G-05 / G-06 が実画面で動く
- [x] G-07 / G-13 は Placeholder（Stage 2-B 持ち越し）
- [x] 実ゲームの「次へ」（result phase の 10 秒 Countdown）→ 次のゲームへ直行
- [x] 実ゲーム → 実ゲームの遷移、実ゲーム → プレースホルダの遷移、その逆も動く
- [x] 7 ゲーム完了 → クールダウン → onExitToHome（既存動線維持）

---

## まとめ

Sprint 22 Stage 2-A は spec-v11.md v1.2 と sprint-22 designer 成果物に従い、**G-01
コンセプト刷新 + G-04/05/06 の 3×3 oddball 化** を完成させた。共通基盤（`grid3x3OddballTrial`
+ `Grid3x3OddballStimulus`）で G-04/05/06 のロジック・UI を一元化したため、Stage 2-B
で G-07 を 4×4 oddball に揃える際にも同じ採点ヘルパーを再利用できる。

CourseRunner には 5 ゲームを実画面で差し込み済みで、G-07 / G-13 のみ placeholder。
Stage 2-B でこれらを実画面化し、Stage 3 で永続化と F-21 事後画面を本接続する流れが
明確になった。
