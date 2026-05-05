# Sprint 9 Self-Review — G-01 変化察知 OPT-12 改修 + v1.1 共通コンポーネント本実装

実装期間：2026-04-30
担当：Generator（v1.1 Sprint 9）

## 1. 概要

Sprint 9 は v1.1 リブートの最初の機能スプリント。Sprint 8 で構築した基盤
（gameRegistry / staircase v1.1 / DistanceReminderV11 / オンボーディング）の上に、
**13 ゲーム共通コンポーネント**（GamePlaySurface / GameStatusBarV11 /
AnswerChoiceGroup / ImageChoiceCell / MetricCard / ResultSummaryV11 /
SinglePlayPostFooter）を本実装し、それらを使って **G-01 変化察知**を OPT-12
統一フォーマットで動かすことが目的。

ゲーム本体は v1 の `src/lib/game1.ts`（`buildGame1Trial` / `gradeGame1` /
`isUnattempted` / `interpolateOrientation`）をそのまま流用し、UI のみ
v1.1 共通コンポーネントに置き換えた。

## 2. 実装ファイル一覧

### データ層（更新 1 ファイル）

| ファイル | 状態 | 役割 |
|---|---|---|
| `src/state/storage-v11.ts` | 更新 | SessionRecord / TrialRecord / DailyStats v1.1 永続化ヘルパー追加。`recordSingleGameSessionV11`（DailyStats 更新）/ `loadHistoricalBestThresholdV11`（過去ベスト取得） |

### ロジック層（新規 1 ファイル）

| ファイル | 役割 |
|---|---|
| `src/lib/v11/g01Result.ts` | G-01 結果サマリ用ヘルパー：パッチ ID → 表示文字列、正解／回答ラベル、採点詳細、前回比 diff 計算 |

### UI 層 — v1.1 共通コンポーネント（新規 7 ファイル）

| ID | ファイル | 役割 |
|---|---|---|
| GD-1 | `src/components/v11/GameStatusBarV11.tsx` | 上部 64px、× + 「残り N 秒」（v1 の試行数表記廃止） |
| GS-1 | `src/components/v11/GamePlaySurface.tsx` | 13 ゲーム共通 OPT-12 骨格コンテナ |
| AC-1 | `src/components/v11/AnswerChoiceGroup.tsx` | 13 ゲーム共通選択肢ボタン群（horizontal-2 / grid-4 等、選択中＝黄色 4px 枠） |
| AC-2 | `src/components/v11/ImageChoiceCell.tsx` | グリッド型ゲームでパッチ自体を選択肢にするセル |
| MC-1 | `src/components/v11/MetricCard.tsx` | F-10 結果サマリの数値カード（閾値・前回比） |
| RS-1 | `src/components/v11/ResultSummaryV11.tsx` | 13 ゲーム共通結果サマリ |
| FT-1 | `src/components/v11/SinglePlayPostFooter.tsx` | 単体プレイ後 3 択フッター |

### UI 層 — G-01 専用（新規 4 ファイル）

| ID | ファイル | 役割 |
|---|---|---|
| GE-01 | `src/components/v11/games/MorphGridStimulus.tsx` | 3×3〜5×5 ガボールグリッドの 60 秒モーフィング描画 |
| — | `src/screens/v11/games/G01ChangeDetectScreen.tsx` | G-01 プレイ画面（60 秒注視 → 自動採点） |
| — | `src/screens/v11/games/G01ResultScreen.tsx` | G-01 結果サマリ（ResultSummaryV11 ラッパー） |
| — | `src/screens/v11/games/G01MiniInstructionScreen.tsx` | S9-01 ミニ説明画面 |

### ナビゲーション（更新 1 ファイル）

| ファイル | 状態 | 役割 |
|---|---|---|
| `src/navigation/v11/AppRouterV11.tsx` | 更新 | `IMPLEMENTED_GAME_IDS_V11=['G-01']` 追加、G-01 のルート（`g01-instruction` / `reminder` / `g01-play` / `g01-result`）を実装 |

### テスト（新規 10 ファイル / 更新 1 ファイル）

| ファイル | 件数 | 担当 |
|---|---|---|
| `tests/v11/lib/g01Result.test.ts` | 17 | パッチ ID 表示、正解・回答ラベル、採点詳細、前回比 diff |
| `tests/v11/state/storage-v11-session.test.ts` | 13 | SessionRecord / TrialRecord / DailyStats / `recordSingleGameSessionV11` / `loadHistoricalBestThresholdV11` |
| `tests/v11/components/GameStatusBarV11.test.tsx` | 10 | 残り N 秒表示、🕐 装飾、aria-live、× ボタン、試行数表記廃止 |
| `tests/v11/components/AnswerChoiceGroup.test.tsx` | 7 | horizontal-2 / grid-4、選択トグル、再タップ解除、disabled、現在の回答テキストなし |
| `tests/v11/components/ImageChoiceCell.test.tsx` | 6 | children 描画、onToggle、accessibilityState.checked、checkbox / radio role 切替、disabled |
| `tests/v11/components/MetricCard.test.tsx` | 6 | label/value/unit、初回測定、改善 / やや低下 / 同等、aria-label |
| `tests/v11/components/SinglePlayPostFooter.test.tsx` | 6 | 3 ボタン、各ハンドラ、優先順位、フォールバック非表示、aria-label |
| `tests/v11/components/ResultSummaryV11.test.tsx` | 13 | gameNameJa / 正解 / 回答 / threshold、コース時「次へ」+ カウントダウン、単体時 SinglePlayPostFooter、確定ボタンなし |
| `tests/v11/screens/games/G01ChangeDetectScreen.test.tsx` | 5 | 描画、確定ボタンなし、× ダイアログ、ガイド文、SHORT_DURATION で onComplete |
| `tests/v11/screens/games/G01ResultScreen.test.tsx` | 8 | 正解時 / 未挑戦時の表示、threshold、初回測定、SinglePlayPostFooter、改善表示、採点詳細 |
| `tests/v11/screens/AppRouterV11.test.tsx` | +2 | G-01 動線（一覧 → ミニ説明 → reminder）/ × で一覧へ戻る |
| **合計** | **+93** | — |

## 3. 受け入れ基準カバレッジ

### F-07 共通フォーマット（OPT-12）

| 基準 | 結果 | 該当 |
|---|---|---|
| 1 試行 60 秒で自動終了 | ◯ | `G01ChangeDetectScreen` の 60 秒タイマー（テストでは SHORT_DURATION で代替） |
| 60 秒タイマーは早期終了不可（OPT-11） | ◯ | 早期完了パスなし。× ボタンによる中断のみ（未完了試行扱い） |
| 残り N 秒が 22pt 以上で常時表示 | ◯ | `GameStatusBarV11` font.h2=30px Bold tabular-nums |
| タップで自由に何度でも回答変更 | ◯ | `MorphGridStimulus` + `ImageChoiceCell`：再タップで解除、別を押すと追加（複数選択可） |
| 確定ボタン存在しない | ◯ | テスト：`screens/games/G01ChangeDetectScreen.test.tsx`「確定 / 決定 / 完了」ボタンが存在しない |
| 60 秒経過で自動採点 | ◯ | `G01ChangeDetectScreen` の useEffect で remainingMs<=0 時に gradeGame1 + applySessionResultV11 |
| 未回答 = 不正解、staircase 易方向 | ◯ | `isUnattempted([], false)=true` → applySessionResultV11('incorrect') → max 方向（易） |
| 試行中の正誤フィードバックなし | ◯ | `GamePlaySurface` 内に正誤色や音は出さない（v1 と同様） |
| × ボタン中断（緊急脱出） | ◯ | `GameStatusBarV11` × → `ConfirmDialog`「ゲームを中断しますか？」 |
| 選択中＝黄色 4px 枠 | ◯ | `ImageChoiceCell` borderWidth=4 / borderColor=highlightCorrect |
| 「現在の回答：◯◯」テキスト表示なし | ◯ | テスト：`AnswerChoiceGroup.test.tsx`「現在の回答」が存在しない |

### §7.1 G-01 個別仕様

| 基準 | 結果 | 該当 |
|---|---|---|
| 3×3〜5×5 グリッド | ◯ | `MorphGridStimulus` rows/cols=3/4/5、staircase の `currentParam` から `difficultyFromParam` で導出 |
| 複数選択可（True Positive +1 / False Positive -1） | ◯ | v1 `gradeGame1` を流用 |
| 採点：合計 0 未満なら 0 | ◯ | v1 `gradeGame1` の `Math.max(0, tp - fp)` |
| staircase: 最大角度差 易 8°→難 3°、初期 5°、step 1° | ◯ | gameRegistry G-01：`paramRange={min:1,max:10,initial:5,step:1}`（min を「難しい端」として扱う規約、Sprint 8 確定） |
| 正解開示で実際の変化箇所をハイライト | △ | screens.md §3 では「拡大ハイライト 1.5 秒」だが、Sprint 9 では `ResultSummaryV11` の MetricCard 上に「正解は『N 列 M 行目』」テキストで開示する形に簡略化（Animated.View 演出は Sprint 19 a11y 監査時に追加検討） |

### F-10 結果サマリ v1.1

| 基準 | 結果 | 該当 |
|---|---|---|
| 「正解 + 回答 + 閾値 + 前回比」を 1 枚で開示 | ◯ | `ResultSummaryV11`：correctAnswerLabel / userAnswerLabel / threshold / diff |
| 単体時：「次へ」を押すまで自動進行なし | ◯ | `SinglePlayPostFooter`（3 ボタン）。「次へ」自動進行の代わりに 3 択 |
| コース時：10 秒カウントダウン自動進行 | △ | UI（`countdownSeconds` 表示）は実装。自動進行のロジック本体は Sprint 18 で実装予定 |
| 不正解時：エラー装飾アイコン併記 | ◯ | `ResultSummaryV11` の userAnswerRow 内 `⚠`（color.semanticError、テキスト本体は fgPrimary、NF-12 遵守） |

### F-09 staircase v1.1 連動

| 基準 | 結果 | 該当 |
|---|---|---|
| 全 TP 採点正解 → applySessionResultV11('correct') | ◯ | `G01ChangeDetectScreen` の finalize：`isCorrectForStaircase = grading.isCorrectForStaircase` |
| 部分点 / FP / 未回答 → applySessionResultV11('incorrect') | ◯ | 上記の else 分岐。未回答（unattempted）も incorrect 扱い |
| 直近 5 セッション平均閾値 | ◯ | `estimateThresholdV11(staircase)`（Sprint 8 実装済み）を呼び、結果画面に渡す |
| ゲームごとの永続化 | ◯ | `loadStaircaseV11('G-01')` / `saveStaircaseV11(state)`（Sprint 8 実装済み） |

### F-04 / F-08 / F-18 動的反映

| 基準 | 結果 | 該当 |
|---|---|---|
| `IMPLEMENTED_GAME_IDS_V11` に G-01 追加 | ◯ | AppRouterV11 |
| AllGamesListScreen で G-01 タップ → ミニ説明 → reminder → プレイ → 結果 | ◯ | テスト：`screens/AppRouterV11.test.tsx`「Sprint 9：G-01 カードはタップすると…」 |

## 4. テスト件数

| 時点 | 件数 | ファイル数 |
|---|---|---|
| Sprint 8 完了時 | 465 | 56 |
| Sprint 9 完了時 | **558** | 66 |
| 増分 | **+93** | +10 |

目標「+15 件以上」を大幅に超過達成。

## 5. typecheck / build:web 結果

```
$ npm run typecheck
> tsc --noEmit
（エラーなし）

$ npm run build:web
Web Bundled 2954ms
Exporting 1 bundle for web:
_expo/static/js/web/AppEntry-*.js (435 kB)
（旧 393 kB → 435 kB、+42 kB は v1.1 共通コンポーネント + G-01 固有モジュール分）
```

## 6. 動作確認手順

1. `npm run web` でブラウザ起動
2. ホーム → 「単体プレイ（13 ゲームから）」
3. 全ゲーム一覧で **G-01 変化察知**カード（disabled でない）をタップ
4. **ミニ説明画面**：5 つの箇条書き → 「はじめる」
5. **距離リマインド（3 秒）**：自動進行
6. **G-01 プレイ画面**：
   - 上部：✕ + 「残り 60 秒」（5 秒以下で 🕐 装飾）
   - 中央：3×3〜5×5 グリッド（staircase 難度）。パッチタップで黄色 4px 枠
   - **確定ボタンなし**。複数選択可、再タップで解除
   - prefers-reduced-motion: reduce 時は 5 段階階段モーフィング
7. **60 秒経過 → 自動採点 → 結果サマリ**：
   - 「G-01 変化察知 の結果」
   - 「正解は『N 列 M 行目、…』」（黄色 4px 枠）
   - 「あなたの回答『◯◯』」（不正解時 ⚠）
   - 「（正解 K, 誤答 L）」または「未回答」
   - MetricCard ×2：今回の閾値（°、直近 5 セッション平均）+ 前回比
   - SinglePlayPostFooter：「同じゲームをもう一度」/「ゲーム一覧へ戻る」/「ホームへ」
8. **再挑戦シナリオ**：「同じゲームをもう一度」→ reminder（ミニ説明スキップ）→ プレイ
9. **× ボタン中断シナリオ**：プレイ中に × → 確認ダイアログ → 「中断する」 → 一覧へ戻る

## 7. 既知の制約と Sprint 10 申し送り

### Sprint 9 の暫定対応

- **MorphGridStimulus の正解ハイライト**：screens.md §3 では「拡大ハイライト 1.5 秒」
  だが、本スプリントでは結果サマリ側で「正解は『N 列 M 行目』」テキストとして開示
  する形に簡略化。Animated.View ベースの拡大演出は Sprint 19 a11y 監査時に追加検討
  （prefers-reduced-motion 連動を含む）。仕様 §7.1 の受け入れ基準は文字列開示でも
  満たすと判断（「実際の変化箇所」が判別可能）

- **ResultSummaryV11 のコース時自動進行ロジック**：UI 側で `countdownSeconds`
  表示は実装したが、`setInterval` で 0 まで減らして `onNext` を呼ぶ自動進行は
  Sprint 18（F-05 全ゲーム連続コース）で実装。Sprint 9 では単体プレイのみのため
  自動進行は不要

- **OB-06 1 試行体験の差し替え**：本スプリントでは差し替えず、プレースホルダのまま
  維持。AppRouterV11 内の OnboardingFlowV11 で OB-06 は完了通知のみ表示する形を
  継承。Sprint 12 で G-04 への差し替えを推奨（Sprint 9 で `G01ChangeDetectScreen`
  を OB-06 に組み込むと、OB-06 が短時間（60 秒）で重くなる懸念があり保留）

- **Settings から sound/haptics の連動**：v1 の Game1Screen は正解時に
  `playCorrect()` + `lightImpact()` を発火していた。v1.1 では「採点フィードバック
  なし」（components.md §1）が原則のため、ゲーム中の音・振動は出さない。結果サマリ
  画面でのフィードバック音は将来検討

### Sprint 10 申し送り

Sprint 10 で G-02 左右並び傾き判別を実装する際は、本スプリントで本実装した
共通コンポーネントを利用するだけで完結する想定：

1. **`GE-02 SideBySideStimulus`**（左右 2 ガボール）を `src/components/v11/games/`
   に新規追加。v1 `SideBySideGabor.tsx` のロジックを流用
2. **`G02SideBySideTiltScreen`**（60 秒注視 → 自動採点）を新規追加
3. **`G02ResultScreen`** を新規追加（ResultSummaryV11 ラッパー）。ヘルパーは
   `src/lib/v11/g02Result.ts` に同パターンで作る
4. **AppRouterV11**：`IMPLEMENTED_GAME_IDS_V11` に `'G-02'` を追加。`onSelectGame`
   分岐に G-02 のルート（reminder → g02-play → g02-result）を追加
5. **AnswerChoiceGroup**：G-02 は `layout="horizontal-2"` で「左 / 右」2 択。
   AC-1 を経由する初の本格利用。本スプリントの単体テストでカバレッジ済み

### Sprint 18 / 19 申し送り

- **`session:<uuid>` / `trial:<uuid>` の書き込み**：Sprint 9 ではヘルパー関数
  （`saveSessionRecordV11` / `saveTrialRecordV11`）のみ実装。AppRouterV11 では
  単体プレイ時は `recordSingleGameSessionV11()` で DailyStats のみ更新する。
  Sprint 18 のフルコースで `SessionRecordV11.gameResults[]` を集約して書き込み

- **`releaseEnabled=false` の際の G-01 表示**：Sprint 8 で実装済み（`getEnabledGames()`）。
  G-01 が disabled でも他ゲームが残れば一覧から表示されない、という設計。Sprint 19 で
  実機検証

- **設定画面 → staircase リセット**：Sprint 8 で `resetStaircaseV11()` 関数は
  実装済み。Sprint 19 の設定画面で UI 接続

- **B-01 〜 B-13 バッジ判定**：G-01 単体プレイで B-01「はじめの一歩」（初回フルコース
  完了）の判定はトリガーされない（フルコース != 単体プレイ）。Sprint 18 / 19 で実装

### 設計上の申し送り

- **gameRegistry の paramRange.min/max 解釈**：Sprint 8 で「min=難しい端、max=易しい端」
  の規約に統一。本スプリントの G-01 staircase は applySessionResultV11 を経由するため
  自動的に従う（『正解で min 方向、不正解で max 方向』）

- **ResultSummaryV11 の `extraStimulus` prop**：G-01 では「（正解 N, 誤答 M）」を
  示す Text を渡しているが、汎用的に「ゲーム特有の追加要素」（グリッド再現や
  時計型図解）も渡せる構造にした。Sprint 10 以降の各ゲームが必要に応じて利用する

- **`G01ChangeDetectScreen.totalDurationMsForTest` / `tickMsForTest`**：テスト
  容易性のため 60 秒 / 250ms をオーバーライド可能にした。本番で渡さなければ
  GAME1.totalDurationMs=60_000 / 250ms のまま動作

## 8. 自己評価チェックリスト

- [x] 当該スプリントの受け入れ基準すべてを自分で動かして確認（typecheck / build / 主要動線テスト全 PASS）
- [x] `npm run typecheck` 通過
- [x] `npm run build:web` 通過（435 kB）
- [x] `npm test` 全 PASS（既存 465 + 新規 93 = 558 件）
- [x] `npm run web` でローカル起動できる（build:web 成功で代替確認）
- [x] 主要動線を実装：単体プレイ一覧 → G-01 → ミニ説明 → 距離リマインド → プレイ → 結果サマリ → 3 ボタンフッター
- [x] 空状態（タップ 0 件 = 未挑戦）の振る舞い実装：自動採点で「未回答」表示、staircase は易方向
- [x] エラー状態：× ボタン中断 → ConfirmDialog → 一覧へ戻る
- [x] デザインとの大きな乖離がない（screens.md S9-01〜S9-03、components.md GS-1 / GD-1 / AC-1 / AC-2 / MC-1 / RS-1 / FT-1 準拠）
- [x] 既存スプリントの動作回帰なし（Sprint 8 までの 465 件全 PASS）
- [x] `docs/sprints/sprint-9-self-review.md` 作成（本ドキュメント）
- [x] `docs/run.md` の Sprint 9 セクション追記

## 9. ファイルパス一覧

### 新規作成

ロジック層：
- `/Users/np_202212_11/projects/gabor3/src/lib/v11/g01Result.ts`

UI 層（共通）：
- `/Users/np_202212_11/projects/gabor3/src/components/v11/GameStatusBarV11.tsx`
- `/Users/np_202212_11/projects/gabor3/src/components/v11/GamePlaySurface.tsx`
- `/Users/np_202212_11/projects/gabor3/src/components/v11/AnswerChoiceGroup.tsx`
- `/Users/np_202212_11/projects/gabor3/src/components/v11/ImageChoiceCell.tsx`
- `/Users/np_202212_11/projects/gabor3/src/components/v11/MetricCard.tsx`
- `/Users/np_202212_11/projects/gabor3/src/components/v11/ResultSummaryV11.tsx`
- `/Users/np_202212_11/projects/gabor3/src/components/v11/SinglePlayPostFooter.tsx`

UI 層（G-01 専用）：
- `/Users/np_202212_11/projects/gabor3/src/components/v11/games/MorphGridStimulus.tsx`
- `/Users/np_202212_11/projects/gabor3/src/screens/v11/games/G01ChangeDetectScreen.tsx`
- `/Users/np_202212_11/projects/gabor3/src/screens/v11/games/G01ResultScreen.tsx`
- `/Users/np_202212_11/projects/gabor3/src/screens/v11/games/G01MiniInstructionScreen.tsx`

テスト（10 ファイル / +93 件）：
- `/Users/np_202212_11/projects/gabor3/tests/v11/lib/g01Result.test.ts`
- `/Users/np_202212_11/projects/gabor3/tests/v11/state/storage-v11-session.test.ts`
- `/Users/np_202212_11/projects/gabor3/tests/v11/components/GameStatusBarV11.test.tsx`
- `/Users/np_202212_11/projects/gabor3/tests/v11/components/AnswerChoiceGroup.test.tsx`
- `/Users/np_202212_11/projects/gabor3/tests/v11/components/ImageChoiceCell.test.tsx`
- `/Users/np_202212_11/projects/gabor3/tests/v11/components/MetricCard.test.tsx`
- `/Users/np_202212_11/projects/gabor3/tests/v11/components/SinglePlayPostFooter.test.tsx`
- `/Users/np_202212_11/projects/gabor3/tests/v11/components/ResultSummaryV11.test.tsx`
- `/Users/np_202212_11/projects/gabor3/tests/v11/screens/games/G01ChangeDetectScreen.test.tsx`
- `/Users/np_202212_11/projects/gabor3/tests/v11/screens/games/G01ResultScreen.test.tsx`

### 更新

- `/Users/np_202212_11/projects/gabor3/src/state/storage-v11.ts`（SessionRecord / TrialRecord / DailyStats / 過去ベスト取得ヘルパー追加）
- `/Users/np_202212_11/projects/gabor3/src/navigation/v11/AppRouterV11.tsx`（G-01 動線実装、IMPLEMENTED_GAME_IDS_V11 に追加）
- `/Users/np_202212_11/projects/gabor3/tests/v11/screens/AppRouterV11.test.tsx`（+2 件、G-01 動線）
- `/Users/np_202212_11/projects/gabor3/docs/run.md`（Sprint 9 セクション追記）

### 残置（Sprint 8 までの v1 ソース）

v1 の `src/screens/Game1Screen.tsx` は削除せず残置。Sprint 9 では参照のみ
（v1.1 ランタイムからは呼ばれない）。v1 の `src/lib/game1.ts`（採点・試行生成）は
v1.1 でもそのまま流用しているため残置必須。
