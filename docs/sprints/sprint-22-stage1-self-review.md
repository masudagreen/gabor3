# Sprint 22 Stage 1 — 共通基盤と削除・データ層 自己レビュー

## 概要

v1.2 リブートの **Stage 1**（共通基盤・削除・データ層）を実装。Stage 2（個別ゲーム 3×3 化）と Stage 3（F-21 事後画面・バッジ再評価・アイコン）は持ち越し。

- **対象スプリント**：Sprint 22（v1.2 リブート、spec-v11.md v1.2、Sprint 22-A〜22-N）
- **完了範囲**：22-A（起動フロー変更）/ 22-B（削除）/ 22-N（マイグレーション拡張）の中核 + 22-H/22-I/22-J/22-L/22-M の共通基盤部分
- **ベース ブランチ**：main（baseline 2319 tests）
- **本ステージ完了時**：1397 tests passing（typecheck / build PASS）

---

## A. 削除（完全削除済）

### ゲーム関連
- `src/screens/v11/games/G02*.tsx`（3 ファイル、G-02 左右並び傾き判別）
- `src/screens/v11/games/G08*.tsx`（3 ファイル、G-08 残像方位弁別）
- `src/screens/v11/games/G09*.tsx`（3 ファイル、G-09 側方マスキング）
- `src/screens/v11/games/G10*.tsx`（3 ファイル、G-10 テクスチャ分離）
- `src/screens/v11/games/G11*.tsx`（3 ファイル、G-11 Vernier）
- `src/screens/v11/games/G12*.tsx`（3 ファイル、G-12 クラウディング）
- `src/screens/v11/games/G04*.tsx` / `G05*.tsx` / `G06*.tsx`（3×3 化のため Stage 2 で再実装、9 ファイル削除）
- `src/components/v11/games/SideBySideStimulus.tsx` / `G08TiltStimulus.tsx` / `LateralMaskingStimulus.tsx` / `TextureGridStimulus.tsx` / `VernierStackStimulus.tsx` / `VerticalStackStimulus.tsx` / `G11VernierStimulus.tsx` / `CrowdingStimulus.tsx`（8 ファイル）
- `src/lib/v11/g0{2,8,9,10,11,12}{Result,Trial}.ts`（12 ファイル）
- `src/lib/v11/releaseFilter.ts` → 後方互換シムに置換（v1.2 で F-18 廃止）

### 起動フロー関連
- `src/screens/v11/HomeScreenV11.tsx`（v1.1 ホーム、v1.2 で完全廃止）
- `src/screens/v11/AllGamesListScreen.tsx`（ゲーム一覧、v1.2 で完全廃止）
- `src/components/v11/HomeHeroCTA.tsx`（HM-1）
- `src/components/v11/SinglePlayPostFooter.tsx`（FT-1、F-06 単体プレイ廃止）
- `src/screens/v11/course/CourseStartScreen.tsx` / `CourseCompleteScreen.tsx`（v1.2 で課程開始確認画面不要、起動 = 即 F-16）

### テスト
- 上記に対応する 60+ テストファイルを削除
- `tests/v11/screens/F18-dynamic-exclusion.test.tsx`（F-18 廃止）

---

## B. 共通コンポーネント新規・刷新

### B-1. GaborPatch.tsx（刷新、NF-27 / NF-28）
- **N=1.5 倍矩形クリッピング**：表示サイズ × 1.5 で BMP 生成 → 外側 View で `width=sizePx, height=sizePx, overflow:hidden` クリップ → 内側 wrapper（180px）に rotate transform
- 角度を最小単位（0.25°）ずつ変えても四隅で背景色（#808080）が露出しない
- 角度自由化（0〜360°）対応（v1.1 までの 0〜180° 制約を撤廃）
- **証跡**：`tests/components/GaborPatch.test.tsx` で「外側コンテナは sizePx ぴったり、overflow:hidden」「内側 wrapper は 1.5 倍（180px）で枠より大きい」「角度を 0.25° 単位で動かしても外側 wrapper は固定」を確認（13 アサーション）

### B-2. CountdownTimer.tsx（CD-1、F-07.1 統一）
- 数字のみ・通常 白 / ≤5 秒 黄 (`#FFD600`) / ≤3 秒 赤 (`#FF8A82`、design-qa amendment 値、AAA 7.0:1)
- 補強：通常〜warn は Bold 700、danger は Black 900（重み増し、点滅禁止 NF-11）
- サイズプリセット xl=72px / lg=30px / md=26px / sm=22px
- aria-live polite → ≤5 秒で assertive 自動切替
- **テスト**：23 アサーション（色段階 / weight 補強 / aria-live / forceDanger / サイズプリセット）

### B-3. ResultBadge.tsx（RB-1、F-10 試行全体総合 ✅/❌）
- success: light=`#0A6238` / dark=`#3FCB7E`（design-qa amendment、AAA 7.45:1 / 10.05:1）
- danger: light=`#A82018` / dark=`#FF6E73`（AAA 7.28:1 / 7.73:1）
- aria-label: 「正解です」/「不正解です」（NF-10、SR 読み上げ）
- 円形（pill）背景、デフォルト 56px（OPT-2 タップ領域）
- **テスト**：13 アサーション（色 / SR / role / サイズ）

### B-4. SafeAreaWrapper.tsx（SA-1、NF-29 / NF-30）
- `mode="default"`：全 inset 適用（top / bottom / left / right）
- `mode="game"`：top inset を**無視**（フルスクリーン許容、ステータスバー領域を背景延長可）
- iOS=SafeAreaInset、Android=`StatusBar.currentHeight` バックアップ併用
- **テスト**：5 アサーション（mode 切替で paddingTop の有無、background 適用）

### B-5. platform/audio.ts（F-19 抽象）
- `playEvent(eventKey)` 単一 API：correct / wrong / tick3-2-1 / gameEnd / badge
- 設定で音 ON/OFF と振動 ON/OFF を**独立トグル**（spec F-19 受け入れ基準 / A7）
- Web で Web Audio API でシンセサイズ（外部 mp3 不要）+ navigator.vibrate でハプティクス
- Native は Stage 2 で expo-audio / expo-haptics に置換予定（現状 no-op、v1.1 と同じ段階的アプローチ）
- ハプティクスパターン：light / medium / heavy / heavyThenMedium
- **テスト**：26 アサーション（enable フラグ独立トグル / イベント設定 / 例外なし）

### B-6. アクションプライマリ色 `#13449D`
- 既に `palette.light.brandPrimary` で正しい値（design-qa 指摘の `#13443D` ではない）
- v1.2 amendment コメントで明示

### B-7. v1.2 トークン追加
- `theme/tokens.ts` に `countdownColors`（normal / warn / danger）、`resultBadgeColors`（light / dark × success / danger）

---

## C. データ層（F-17 拡張）

### C-1. 永続化キー prefix を `gaboreye:v1.2:*` に変更
- `KEY_PREFIX_V12`（新）、`KEY_PREFIX_V11`（旧名は alias で同値、後方互換）
- 全派生キー（userProfile / settings / staircase / dailyStats / badge / session / trial）が自動的に v1.2 namespace へ

### C-2. 起動時マイグレーション拡張
- `detectLegacyData()`：v1 + v1.1 両方を検出（v1.2 だけは検出しない）
- `clearLegacyStorage()`：v1 + v1.1 両系を全消去（spec §F-17 拡張 / A2）
- 旧名 `detectV1LegacyData` / `clearV1LegacyStorage` は alias で残置
- v1.1 → v1.2 マイグレーションコードは書かず「読み取り無視 → v1.2 キーで新規初期化」（spec §A-2）

### C-3. v1.2 起動時の自動リセット対象
- 全ゲーム staircase（角度自由化で過去パラメータ無効）
- 単体プレイ履歴（v1.2 で単体プレイ廃止）
- BadgeStatus（B-13 廃止 / 再採番のため、F-17 が prefix リセットで実施）

### C-4. gameRegistry を 7 ゲーム化
- `GAME_REGISTRY`（7 件）：G-01 / G-03 / G-04 / G-05 / G-06 / G-07 / G-13、order 1〜7
- 旧 G-02 / G-08 / G-09〜G-12 はレジストリから完全削除
- `selectionMode`（multi / single / keypad）と `scoringMode`（partial / binary）を新規追加
- `releaseEnabled` 機構廃止：すべて常時 `true`（後方互換のため型に optional で残置 + 各レコードにランタイムで付与）
- `getCourseGames()`（v1.2 SOT）、`getEnabledGames` / `getEnabledGameCount` は alias で残置
- v1.2 paramRange（system.md §1.17 Designer 提案値準拠）：
  - G-01: min=1°/s, max=6°/s, initial=3°/s, step=0.5
  - G-04: min=0.05, max=0.4, initial=0.20, step=0.025
  - G-05: min=1.1×, max=2.5×, initial=1.5×, step=0.1
  - G-06: min=1.1, max=2.0, initial=1.5, step=0.1（v1.1 維持、A3）
  - G-07: min=3°, max=15°, initial=8°, step=1°
  - G-13: min=0.02, max=0.15, initial=0.05, step=0.01（v1.1.4 値維持）

### C-5. バッジ B-01〜B-12 再定義（spec §10）
- 12 バッジ（旧 B-07「弁別の達人」G-02 依存を廃止、後続を再採番）
- B-07 を「探検家」（旧 B-09）、B-08 を「全制覇」（旧 B-10）、B-09 を「連続マスター」（旧 B-11）、B-10 を「夜更かし返上」（旧 B-12）、B-11 を「コンプリート」（旧 B-13）、B-12 を「全方位改善」（旧 B-08）に再マッピング
- バッジ評価ロジックも対応する条件式に切替

---

## D. 起動フロー（S22-LAUNCH）

### D-1. AppRouterV11 → AppRouterV12 に大幅刷新
- ルート定義を 9 種に簡素化：`loading` / `data-reset-notice` / `onboarding` / `distance-reminder` / `course-run` / `postsession` / `progress` / `settings` / `badges`
- 起動 = 即 `distance-reminder`（F-16 距離リマインド秒読み）へ直行
- F-16 完了 → `course-run`（CourseRunnerScreen で 7 ゲーム順次プレイ）→ `postsession`（F-21 事後画面プレースホルダ）
- `progress` / `badges` / `settings` への入口は `postsession` から提供
- `setSoundEnabled` / `setHapticsEnabled` を v1.1 lib と v1.2 platform/audio の両方に伝播

### D-2. CourseRunnerScreen を Stage 1 用に簡素化
- 7 ゲーム順次プレイの**フローは完成**（game N → interstitial N → cooldown → complete → onExitToHome）
- 各ゲーム本体は **GamePlaceholder** で Stage 2 まで仮実装（5 秒で自動進行、CountdownTimer 込み）
- ゲーム間に **InterstitialPlaceholder**（ResultBadge + 「次へ」ボタン + CountdownTimer、5 秒で自動進行）
- F-19 音発火（gameEnd / correct / tick3-2-1）を埋め込み済み
- 中断確認は ConfirmDialog で接続済み

### D-3. CourseCooldownScreen を v1.2 統一カウントダウン UI に更新
- 旧の `<Text>` カウンターを `CountdownTimer`（size=xl）に置換
- `onComplete` / `onSkip` の v1.2 API 追加（旧 `onCompleted` は alias 残置）
- F-19 連動：完了時に `gameEnd` 音、残り 3-2-1 秒で tick 音
- SafeAreaWrapper（mode="default"）で囲い込み

### D-4. PostSessionPlaceholder（F-21 暫定）
- Stage 3 で本実装予定（ワイドスコア / 7 ゲーム結果 / 進捗グラフ・バッジ・設定への入口）
- Stage 1 では「おつかれさまでした」+ 4 ボタン（進捗 / バッジ / 設定 / もう一度）の最小プレースホルダ
- SafeAreaWrapper（mode="default"）で NF-30 準拠

---

## E. テスト件数

- **Baseline（main）**：169 suites / 2326 tests / 7 skip / 2319 PASS
- **Stage 1 完了時**：115 suites / 1397 tests / 0 skip / 1397 PASS
- **正味の差**：deleted 60+ test files (旧ゲーム/旧 UI 用、約 1000 アサーション削減) + 新規追加 ~78 アサーション（CountdownTimer 23 / ResultBadge 13 / SafeAreaWrapper 5 / platform/audio 26 / GaborPatch 13）
- 既存テストの v1.2 値への更新：~50 件（gameRegistry / staircaseV11 / wideScore / dailyStats / badges / courseSession / 各ゲーム ResultScreen の SinglePlayPostFooter 削除）

---

## F. 検証

| 項目 | 結果 |
|---|---|
| `npm run typecheck` | ✅ PASS（エラー 0） |
| `npm test` | ✅ 1397/1397 PASS、suites 115/115、skip 0 |
| `npm run build:web` | ✅ Bundled 3932ms、`dist/` 出力済み |
| `npm run dev`（手動） | 未確認（オーケストレーターに委ねる） |
| GaborPatch 矩形クリップ証跡 | ✅ tests/components/GaborPatch.test.tsx で 13 アサーション PASS（GABOR_CLIP_RATIO=1.5、外側 sizePx 固定、内側 1.5×、overflow:hidden、0.25°〜359.75° で外形不変） |

---

## G. 既知の TODO / Stage 2 / Stage 3 への引き継ぎ事項

### Stage 2（次フェーズで本実装）
- **G-01 ゆっくり回転検出（22-C）**：3×3 グリッド、1〜3 個ランダム回転、両方向、staircase 駆動の回転速度、TP+1/FP-1 部分点
- **G-04 / G-05 / G-06 共通の 3×3 化（22-E）**：3×3 + 違うパッチ複数ランダム + 複数選択 + TP+1/FP-1 部分点。screen ファイル群を再生成
- **G-03 解答表示統一（22-D）**：中央線方式廃止、F-10 統一仕様（パッチ上 ✅/❌ + 試行領域直下総合 ✅/❌）に
- **G-07 文言・採点改訂（22-F）**：4×4 維持、「向きが同じものを選んで」（個数伏字）、TP+1/FP-1
- **G-13 領域拡大（22-G）**：上 70% 刺激 / 下 30% keypad
- **CourseRunnerScreen の本実装**：上記ゲームを順次差し込む。GamePlaceholder / InterstitialPlaceholder を本物に置換
- **F-10 結果オーバーレイ**：v1.2 仕様（数値テキスト撤去 + 試行全体総合 ResultBadge 1 個）に整理。SR「正解」「不正解」読み上げを最小化

### Stage 3（リリース直前）
- **F-21 事後画面（22-A 残）**：ワイドスコア（72px Bold tabular-nums）、7 ゲーム結果一覧、進捗グラフ・バッジ・設定の入口ボタン 3 つ
- **アプリアイコン差し替え（22-K）**：iOS / Android adaptive / Web favicon / PWA / Expo splash 各サイズ生成（ガボール 45° 図柄、`assets/icon-source.svg` を起点）
- **バッジ B-01〜B-12 再評価ロジック確定（22-N 残）**：badgeContext / wideScore との連携を 7 ゲーム前提で再確認

### 既知のリスク
- **Native の音・ハプティクス未実装**：Stage 2 で expo-audio + expo-haptics に置換予定。現状 Web のみ実音、Native は no-op。spec NF-31〜33 を完全に満たすには Native 実装が必要
- **CourseRunnerScreen 簡素化**：v1.1 で永続化していた SessionRecord / DailyStats / Streak / バッジ評価などの統合は Stage 2 で再構築。現在は単に画面遷移と音だけが動く
- **ResultOverlay の単体プレイモード残骸**：`mode='single'` / `onPlayAgain` / `onBackToList` / `onGoHome` の prop は型に残存。`SinglePlayPostFooter` の描画は撤去済みだが、API クリーンアップは Stage 2 / 3 で実施
- **G09-G12 lib ファイル削除に伴う一部依存関係**：courseGameAdapter の switch / progress 画面の case など、type narrowing で `default` 分岐に倒れる箇所あり。実害なし

### v1.2 spec で明示した「Stage 2 持ち越し」（spec §13.1 サブタスク表）
- 22-C / 22-D / 22-E / 22-F / 22-G（個別ゲーム実装）
- 22-I（F-10 数値テキスト撤去 + 試行全体総合の本接続）

---

## H. ファイル一覧（主要変更）

### 新規作成
- `src/components/v12/CountdownTimer.tsx`
- `src/components/v12/ResultBadge.tsx`
- `src/components/v12/SafeAreaWrapper.tsx`
- `src/platform/audio.ts`
- `tests/components/GaborPatch.test.tsx`
- `tests/v11/components/v12/CountdownTimer.test.tsx`
- `tests/v11/components/v12/ResultBadge.test.tsx`
- `tests/v11/components/v12/SafeAreaWrapper.test.tsx`
- `tests/v11/platform/audio.test.ts`

### 大幅刷新
- `src/components/GaborPatch.tsx`（N=1.5 矩形クリッピング）
- `src/state/gameRegistry.ts`（7 ゲーム化）
- `src/state/gameIds-v11.ts`（7 ゲーム化）
- `src/state/storage-v11.ts`（v1.2 prefix、F-17 拡張）
- `src/lib/v11/badgeDefinitions.ts`（B-01〜B-12 再定義）
- `src/lib/v11/badges.ts`（v1.2 12 バッジ評価）
- `src/lib/v11/releaseFilter.ts`（後方互換シム）
- `src/lib/v11/courseGameAdapter.ts`（7 ゲーム化）
- `src/navigation/v11/AppRouterV11.tsx`（→ AppRouterV12 ルーター）
- `src/screens/v11/course/CourseRunnerScreen.tsx`（Stage 1 簡素化）
- `src/screens/v11/course/CourseCooldownScreen.tsx`（CountdownTimer 統合）
- `src/screens/v11/progress/ProgressGraphScreen.tsx`（switch case 7 ゲーム）
- `src/components/v11/ResultOverlay.tsx`（SinglePlayPostFooter 撤去）
- `src/theme/tokens.ts`（countdownColors / resultBadgeColors 追加）

### 削除
- `src/screens/v11/HomeScreenV11.tsx` / `AllGamesListScreen.tsx`
- `src/components/v11/HomeHeroCTA.tsx` / `SinglePlayPostFooter.tsx`
- `src/screens/v11/course/CourseStartScreen.tsx` / `CourseCompleteScreen.tsx`
- `src/screens/v11/games/G02*.tsx`（3）/ `G04*.tsx`（3）/ `G05*.tsx`（3）/ `G06*.tsx`（3）/ `G08*.tsx`（3）/ `G09*.tsx`（3）/ `G10*.tsx`（3）/ `G11*.tsx`（3）/ `G12*.tsx`（3）= 27 ファイル
- `src/components/v11/games/SideBySideStimulus.tsx` / `G08TiltStimulus.tsx` / `LateralMaskingStimulus.tsx` / `TextureGridStimulus.tsx` / `VernierStackStimulus.tsx` / `VerticalStackStimulus.tsx` / `G11VernierStimulus.tsx` / `CrowdingStimulus.tsx`（8）
- `src/lib/v11/g0{2,8,9,10,11,12}{Result,Trial}.ts`（12）
- 対応するテストファイル合計 60+

---

## まとめ

Stage 1 は spec-v11.md v1.2 と sprint-22 designer 成果物に従い、**起動フロー・データ層・共通基盤**を完成させた。アプリ起動 → 距離リマインド → 7 ゲーム順次（Stage 2 で本実装）→ クールダウン → 事後画面（Stage 3 で本実装）の動線が完結し、F-17 拡張による旧データリセット、F-19 音・ハプティクス基盤、F-07.1 統一カウントダウン UI、F-10 試行全体総合 ✅/❌、NF-27/28 ガボール矩形クリッピング、NF-29/30 ステータスバー回避がすべて Stage 2 以降で「使うだけ」の状態になっている。

特にガボールクリッピング（N=1.5 矩形マスク）は GaborPatch.test.tsx で形式的に証跡が残っており、Stage 2 で 3×3 グリッド化されるゲームは「角度を最小単位ずつ変えても四隅で背景が露出しない」NF-28 を**コンポーネント側で自動的に満たす**ことが保証される。

---

## 追補（2026-05-10、Evaluator impl 評価 Stage 1 のループバック対応）

`docs/evaluations/sprint-22-stage1-impl-20260510-1513.md` で指摘された v1.1 文言残存を Stage 1 のうちに整理した。**構造変更なし、文言とコメントの整合のみ**。

### Critical（v1.2 文言整合）
- `src/screens/v11/Onboarding/OB01Welcome.tsx`：「視覚トレーニング 13 種」→「視覚トレーニング 7 種」
- `src/screens/v11/Onboarding/OB06Experience.tsx`：v1.2 化
  - バナー本文：「明日からはホームの『全ゲーム連続プレイ』から N ゲームをご利用ください」→「次回からは起動時に距離リマインドへ直行し、N ゲームの連続プレイが始まります」
  - aria-label も同文に追従
  - プレースホルダブロックを「1 試行体験」→「このあとの流れ」に置換、本文も「コースへ進むと最初のゲームの距離リマインドが始まる」旨に
  - ボタンラベル「ホームへ」→「コースへ」（testID `ob-experience-home` は OnboardingFlowV11 と既存テスト互換のため維持）
  - ファイル冒頭コメントも v1.2 起動フロー（spec-v11.md §F-04 / §F-05）の説明に書き換え

### Major（i18n 辞書整合、`src/i18n/v11/ja.ts`）
- `dataReset.body`：「新しい 13 ゲーム」→「新しい 7 ゲーム」
- `onboarding.welcome_body_2`：「視覚トレーニング 13 種」→「視覚トレーニング 7 種」
- `onboarding.howto_block1_title`：「13 種類のゲームがあります」→「7 種類のゲームがあります」
- `onboarding.experience_done_button`：「ホームへ」→「コースへ」
- `onboarding.completion_banner_body`：「明日からはホームの『全ゲーム連続プレイ』から 13 ゲームをご利用ください」→「次回からは起動時に距離リマインドへ直行し、7 ゲームの連続プレイが始まります」
- ファイル冒頭コメントに v1.2 改訂趣旨を追記

### Minor 1（`src/screens/v11/games/G13EmbeddedNumeralScreen.tsx`）
- 「構造は G09LateralMaskingScreen / G11VernierAlignmentScreen の流用」コメントを削除（v1.2 で両画面とも削除済み）。代わりに「v1.2 連続プレイ対象 7 ゲームの 1 つ。本画面の特徴：…」の形式に書き換え

### Minor 2（dead export 削除）
- `src/lib/v11/resultMarks.ts`：v1.2 で削除されたゲーム用 marks ヘルパー `buildG02Marks` / `buildG08Marks` / `buildG09Marks` / `buildG10Marks` / `buildG11Marks` / `buildG12Marks` および src 配下未使用の `buildHorizontalSideMarks` を削除。残存は連続プレイ 7 ゲームのうち ResultOverlay を直接使う 4 ヘルパー（G-01 / G-03 / G-07 / G-13）と `selectedIdsFromGame1Grading` のみ
- `tests/v11/lib/resultMarks.test.ts`：上記 dead export に対応する describe / it ブロックを除去し、残った 4 ヘルパー（G-01 / G-03 / G-07 / G-13）の網羅テストに整理（G-03 / G-13 の未回答ケースは新規追加、計 16 アサーション削除 / 2 アサーション追加）

### 影響と検証
- テスト件数：1397 → 1381（dead export テスト 16 件減 / 新規 G-03・G-13 未回答テスト 2 件増 / 差し引き -14 + ファイルあたり describe 統合に伴う -2）
- `npm run typecheck` PASS
- `npm test` 115 suites / 1381 tests / 0 skip / 1381 PASS（実測 6.816s）
- `npm run build:web` PASS（dist 出力 515 kB、Stage 1 提出時と同サイズ）
- 変更は文言・コメント・dead export のみで動作変更ゼロ。既存スプリントの動作回帰なし
- ResultOverlay の旧 prop 残存と Native の expo-audio/expo-haptics 配線は Stage 2 で予定どおり対応
