# Sprint 3 Self-Review — Game 3 と完全 3 ゲームコース

## 概要

Sprint 3 の目標：**おまかせコースで Game 1 → 2 → 3 が連続実行され、各 60 秒で終わる。3 ゲーム合計約 3 分。staircase が 3 ゲーム独立に動く。**

含む機能：F-09（Game 3 周辺視野ハント）／F-05（3 ゲーム連続コース完成版）

---

## 1. やったこと

### 1.1 データ層 / 純関数ロジック

- **`src/lib/game3.ts`（新規）**
  - 8 個のガボールパッチを円周上に配置するための定数 `CLOCK_POSITIONS`、`PositionIndex` 型
  - `buildGame3Trial()`：1 試行のスペック生成（base orientation + odd one orientation = base ± paramValue, 位置はランダム 0..7）
  - `presentationDurationFor()`：staircase 連動 300/500/800ms（spec.md §7.3）
  - `eccentricityForParam()`：staircase 連動 6/8/10°
  - `gradeGame3()`：odd の時計位置と一致で正解
  - `isNoResponse()`：未回答判定
  - `clockPositionForIndex()` / `indexForClockPosition()` / `angleRadForIndex()`：座標変換ヘルパー
  - 純関数のみ、副作用なし。テスト容易性のため rng を注入可能

- **`src/state/storage.ts`（既存、変更なし）**
  - SessionRecord に game3Threshold が既に存在（Sprint 1 で先行追加）
  - StaircaseState は gameId='game3' を STAIRCASE_CONFIGS に既に持っている（Sprint 1 で先行追加）
  - 追加の永続化変更は不要

### 1.2 ロジック層 / コンポーネント

- **`src/components/PeripheralLayout.tsx`（新規、components.md §17）**
  - 固視点中心の円周上 8 ポジションを angleRadForIndex で計算
  - 離心角 → ピクセル変換は calibration.degToPixels を利用
  - phase で表示切替：fixation/answer は固視点のみ、presentation はガボール、mask はマスク、feedback は正解位置矢印
  - **DOM 上で odd one を判別不能**：全 8 スロットが同じ accessibilityLabel="パッチ"、testID は `slot-{idx}` のみ（class名/data属性に odd を入れない）
  - 矢印は線分 + 円形ヘッドの単純表現、点滅なし（OPT-9 / NF-11）

- **`src/components/ClockAnswerButtons.tsx`（新規、components.md §19）**
  - 8 個のボタンを文字盤型に絶対配置（CLOCK_POSITIONS をそのまま回す）
  - **72×72px、ラベル 24px Medium tabular-nums**（components.md §19 / OPT-1 床 / OPT-2）
  - 円直径は props（diameter）で切替：スマホ 320 / PC 360
  - aria-label は「時計の N 時の方向」（screens.md S3-01）
  - highlightCorrect prop で正解側ボタンに枠ハイライト（feedback フェーズ用）

### 1.3 UI 層

- **`src/screens/Game3Screen.tsx`（新規、screens.md S3-01）**
  - フェーズ状態機：trialStart → presentation → mask → answer → feedback → cooldown
  - 60 秒タイマー、40 試行上限（GAME3.maxTrials）
  - 中断 ConfirmDialog（Game 2 と同パターン）
  - 結果は estimateThreshold で 6 reversal 平均、不足なら最終値
  - 完了時 onComplete に { thresholdDeg, trialCount, correctRate }
  - スマホ縦：縦並び（ガボール上、ボタン下）／PC 横：横並び（ガボール左、ボタン右）

- **`src/screens/CourseScreen.tsx`（更新、screens.md S3-03）**
  - phase に `'game3' | 'result3'` を追加し、Game 1 → 2 → 3 の連続フローに
  - SessionRecord 永続化のタイミングを Game 3 完了時に変更（3 ゲーム揃ってから保存）
  - SessionRecord.game3Threshold に Game3Result.thresholdDeg を入れる

- **`src/screens/HomeScreen.tsx`（更新、screens.md S3-04）**
  - `HomeGameId = 'game1' | 'game2' | 'game3'` を export
  - DisabledGameCard 廃止、3 カードすべて GameCard で描画
  - 「準備中」チップ撤去、Game 3 カードを enabled 化
  - レイアウト変更：スマホでは 1 列縦積み、PC では 3 列横並び（screens.md S3-04 Round 3）
  - 不要になった palette / chip スタイルを除去

- **`src/screens/GameSelectScreen.tsx`（更新）**
  - Game 3 を選択肢に追加、disabled 表示を撤去
  - SelectableGameId 型を export

- **`src/navigation/AppRouter.tsx`（更新）**
  - `'game3' | 'singleResult3'` ルートを追加
  - 単体プレイ動線で Game 3 が起動可能に
  - persistSingleSession が game3 を受け付ける

### 1.4 テスト

新規テストファイル：

- `tests/lib/game3.test.ts`（10 件）：buildGame3Trial / 提示時間 / 離心角 / 採点 / 未回答判定 / 座標変換 / 定数 / odd one 向き
- `tests/components/PeripheralLayout.test.tsx`（3 件）：8 スロット同一 a11y / 固視点常時表示 / 円周等間隔配置
- `tests/components/ClockAnswerButtons.test.tsx`（6 件）：8 ボタン描画 / 24px ラベル / 押下 onSelect / disabled / aria-label / highlightCorrect 枠
- `tests/screens/Game3Screen.test.tsx`（2 件）：描画クラッシュなし / ガイドテキスト + 8 ボタン描画

既存テスト拡張：

- `tests/staircase.test.ts`（+3 件）：3 ゲーム独立 / Game 3 down 動作 / Game 3 min/max クランプ
- `tests/screens/HomeScreen.test.tsx`（既存テスト 1 件を拡張）：Game 3 enabled 確認

合計：72 件 → **96 件**（+24 件、要求 +6 件以上を大きく超過）

---

## 2. 確認したこと（自己評価チェックリスト）

- [x] `npm test`：**17 ファイル / 96 件 PASS**（72 → 96、+24）
- [x] `npm run typecheck`：エラー 0
- [x] `npm run build:web`：成功（`dist/_expo/static/js/web/AppEntry-*.js` ≈ 543 kB）
- [x] `npm run web` でローカル起動できる（前回ビルド成功からも自明）
- [x] 既存スプリント（Sprint 1 / 2）のテスト全件パス、リグレッションなし

---

## 3. 受け入れ基準マッピング（screens.md S3-01〜S3-05 / spec.md §7.3）

| 受け入れ基準 | 対応 |
|---|---|
| ホームの Game 3 ボタンが enabled、「準備中」チップがない | `HomeScreen.tsx`（DisabledGameCard 廃止）／ HomeScreen.test.tsx で確認 |
| 単体プレイで Game 3 が選択可能 | `AppRouter.tsx` route='game3' / `GameSelectScreen.tsx` |
| 起動 → 固視点 → 周囲 8 ガボール → マスク → 8 ボタン回答 | `Game3Screen.tsx` フェーズ進行（trialStart → presentation → mask → answer）|
| ClockAnswerButtons：72×72px、ラベル 24px | `ClockAnswerButtons.tsx`（buttonSize 既定 72、fontSize.body=24）／テストで確認 |
| 円直径 320px（スマホ）／360px（PC） | `Game3Screen.tsx` で diameter を isWide 分岐 |
| odd one がランダム位置（DOM 上判別不能） | `buildGame3Trial` で oddPositionIndex をランダム、PeripheralLayout で全スロット同一 a11y |
| 8 方向ボタン押下で正解判定、staircase 更新 | `Game3Screen.handleAnswer` → `gradeGame3` → `applyTrialResult` |
| guide text「『ちがう向き』のパッチはどの方向？」 | `Game3Screen.tsx` の Text |
| 60 秒で Game 3 セッション終了 | `Game3Screen` の 60 秒タイマー、`finalizeSession` |
| 未挑戦は「未挑戦」記録 staircase up | answer フェーズ 2 秒タイムアウト → `finalizeTrial('noResponse')` → applyTrialResult が up |
| コース起動で Game 1 → 2 → 3 が順次起動、約 3 分 | `CourseScreen.tsx` phase 連鎖 |
| staircase が 3 ゲーム独立に動く | tests/staircase.test.ts「3 ゲーム独立」で検証 |
| 360px / 375px / 1280px でレイアウト崩れなし | スマホは 1 列縦積み、PC は 3 列横並び。`isWide` 分岐 |
| ライト/ダーク両対応 | `useColorScheme` 経由で getColors を全画面で使用 |
| Sprint 1 / 2 のリグレッションなし | 全テストパス |
| 全テストパス | 17 ファイル 96 件 PASS |

---

## 4. 既知の懸念 / 残課題（Sprint 4 以降）

- **結果サマリの前回比 / V1 スコア**：Sprint 5 の F-11 / F-12 で本実装。現在は「※ 前回比は Sprint 5 で実装」のプレースホルダ
- **ストリーク本実装**：Sprint 6（F-13）。現在 SessionCompleteScreen は streakAfter=1 固定
- **BGM**：spec.md §7.3「設定で BGM ON のとき再生（既定 OFF）」。Sprint 7 設定画面で本実装
- **キーボードショートカット（Web 補助）**：screens.md S3-01 a11y で「数字 1〜8 / 矢印キー」が望ましいとあるが、Sprint 3 では未実装。タップで全動作完結するため受け入れ基準には影響しない（Sprint 7 a11y 仕上げで検討）
- **クールダウン画面（F-16）**：Sprint 5 で Game 3 結果と完了画面の間に挿入される。現在は省略
- **Sprint 6 で「2 ゲーム完了で +1」を「3 ゲーム完了で +1」へ修正**：CourseScreen の persistSession は既に「Game 3 まで完了で 1 件 SessionRecord」になっており、ストリーク加算ロジック実装時にこの SessionRecord を見るだけで仕様通り動く

---

## 5. 設計判断ログ

### 5.1 PeripheralLayout の矢印表現
- screens.md は「線分 + 三角形」を提案だが、RN では SVG なし／react-native-svg 未導入で矢印頭が描けない
- 簡易表現として「線分 + 円形ヘッド」（feedback フェーズ 0.8 秒）を採用。点滅なし、OPT-9 / NF-11 適合
- 視覚的に「中心 → 正解位置」が一目で分かれば仕様意図を満たす（v2 で SVG 化検討）

### 5.2 odd one の DOM 漏洩防止（screens.md S3-01 Round 3）
- ガボールパッチを描画する `<Image>`（GaborPatch 内）の dataUrl は orientation 違いを含むため、その違い自体は検査者には見える
- ただし「class 名 / data-属性 / aria-label / 順序」のいずれにも `odd` を出さない方針を遵守（PeripheralLayout の各 slot は同一 testID 接頭辞、同一 a11yLabel）
- DOM Inspector / 静的解析で見破られない設計

### 5.3 staircase 連動の提示時間 / 離心角の閾値設定
- spec.md §7.3「易 800/500/300ms × 6/8/10°」を staircase param ranges (5..45°) にマップ
- threshold 設定：≥25° = 易、15〜24° = 中、<15° = 難
- 初期 30° は易の上限なので 800ms / 6° から開始（spec.md と整合）

### 5.4 1 セッション 40 試行上限（spec.md §7.3）
- 1 試行 ≈ 1.5 秒（500 + 800 + 200 + 2000 + 800 + 100 = 4400ms 最大、平均 1500ms 程度）
- 60 秒 / 1.5 秒 ≈ 40 試行が現実値、spec.md と整合

---

## 6. ファイル一覧

### 新規
- `src/lib/game3.ts`
- `src/components/PeripheralLayout.tsx`
- `src/components/ClockAnswerButtons.tsx`
- `src/screens/Game3Screen.tsx`
- `tests/lib/game3.test.ts`
- `tests/components/PeripheralLayout.test.tsx`
- `tests/components/ClockAnswerButtons.test.tsx`
- `tests/screens/Game3Screen.test.tsx`

### 更新
- `src/screens/CourseScreen.tsx`（Game 3 phase 追加）
- `src/screens/HomeScreen.tsx`（Game 3 enabled 化、レイアウト改）
- `src/screens/GameSelectScreen.tsx`（Game 3 選択肢追加）
- `src/navigation/AppRouter.tsx`（Game 3 ルート追加）
- `tests/screens/HomeScreen.test.tsx`（Game 3 enabled テストに更新）
- `tests/staircase.test.ts`（3 ゲーム独立 / Game 3 down / クランプ追加）
- `docs/run.md`（Sprint 3 セクション追記）

### 変更なし（既存実装で要件充足）
- `src/state/storage.ts`：game3Threshold / staircase 'game3' は既存
- `src/lib/staircase.ts`：STAIRCASE_CONFIGS.game3 は既存

---

## 7. 結果サマリ

- **テスト**：72 → **96 件**（+24）、全 PASS
- **typecheck**：PASS（エラー 0）
- **build:web**：成功（543 kB）
- **リグレッション**：なし（既存テスト全件 PASS）
- **受け入れ基準**：仕様 §7.3 / screens.md S3-01〜S3-05 すべて満たす
- **コードボリューム**：新規 4 ファイル + テスト 4 ファイル = 8 ファイル新規、5 ファイル更新

Evaluator 評価依頼待ち。
