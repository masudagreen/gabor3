# Sprint 14 Self-Review — G-06 ガウス窓サイズ弁別 + G-07 ガボールエッジ検出 実装

実装期間：2026-04-30
担当：Generator（v1.1 Sprint 14）

## 1. 概要

Sprint 14 は **2 ゲーム複合スプリント**：
- **G-06 ガウス窓サイズ弁別**：G-05 構造のほぼ流用（左右 2 ガボール、SD 比 staircase）
- **G-07 ガボールエッジ検出**：4×4 グリッド型、新規 GE-07 GaborGridStimulus コンポーネント実装

Sprint 13 self-review §7「Sprint 14 申し送り」が示した通り、G-06 は楽な実装、G-07
は新規 stimulus 必要で負荷が高い構成だった。両ゲームとも v1.1 OPT-12 統一フォーマット
（1 試行 60 秒、確定ボタンなし、自由回答変更可、自動採点）に従って実装。

実装規模 16 ファイル新規 + 2 ファイル更新（AppRouterV11 / 既存テスト 1 件）。
データ層 → ロジック層 → UI 層 の 3 段で分割せずに一気通貫で完了。

## 2. 実装ファイル

### 2.1 新規（13 ファイル）

#### G-06 ガウス窓サイズ弁別（5 ファイル）

| ファイル | 役割 |
|---|---|
| `src/lib/v11/g06Trial.ts` | trial 生成（左右 SD 比分配）/ 採点 / SD クランプ / レイアウト計算（純関数） |
| `src/lib/v11/g06Result.ts` | 結果サマリ用ラベル + diff ヘルパー（digits=1 / step=0.1） |
| `src/screens/v11/games/G06WindowSizeScreen.tsx` | S14-02 プレイ画面 |
| `src/screens/v11/games/G06ResultScreen.tsx` | S14-03 結果サマリ |
| `src/screens/v11/games/G06MiniInstructionScreen.tsx` | S14-01 ミニ説明 |

#### G-07 ガボールエッジ検出（5 ファイル）

| ファイル | 役割 |
|---|---|
| `src/lib/v11/g07Trial.ts` | trial 生成（10 直線 × C(4,3)=4 = 40 線パターン、ジッタ allotted）/ 採点（集合一致）/ レイアウト |
| `src/lib/v11/g07Result.ts` | 結果サマリ用ラベル（「2 行 2 列・3 行 3 列・4 行 4 列」連結 + 「N/3 個正解（M 過剰/不足）」）+ diff（digits=0 / step=1）|
| `src/components/v11/games/GaborGridStimulus.tsx` | GE-07 4×4 ガボール盤面、ImageChoiceCell ベース、checkbox role、複数選択可、highlight アニメ |
| `src/screens/v11/games/G07EdgeHuntScreen.tsx` | S14-05 プレイ画面 |
| `src/screens/v11/games/G07ResultScreen.tsx` | S14-06 結果サマリ（正解 3 セル拡大ハイライト） |
| `src/screens/v11/games/G07MiniInstructionScreen.tsx` | S14-04 ミニ説明 |

### 2.2 テスト（11 ファイル、+196 件）

| ファイル | 件数 |
|---|---|
| `tests/v11/lib/g06Trial.test.ts` | 36 |
| `tests/v11/lib/g06Result.test.ts` | 19 |
| `tests/v11/lib/g07Trial.test.ts` | 47 |
| `tests/v11/lib/g07Result.test.ts` | 14 |
| `tests/v11/components/games/GaborGridStimulus.test.tsx` | 13 |
| `tests/v11/screens/games/G06MiniInstructionScreen.test.tsx` | 5 |
| `tests/v11/screens/games/G06WindowSizeScreen.test.tsx` | 13 |
| `tests/v11/screens/games/G06ResultScreen.test.tsx` | 15 |
| `tests/v11/screens/games/G07MiniInstructionScreen.test.tsx` | 5 |
| `tests/v11/screens/games/G07EdgeHuntScreen.test.tsx` | 11 |
| `tests/v11/screens/games/G07ResultScreen.test.tsx` | 18 |
| **合計** | **196** |

### 2.3 更新（2 ファイル）

| ファイル | 変更内容 |
|---|---|
| `src/navigation/v11/AppRouterV11.tsx` | G-06 / G-07 ルート（instruction / play / result）追加、`IMPLEMENTED_GAME_IDS_V11` に `'G-06'` / `'G-07'` 追加、PlaceholderScreen 文言「Sprint 14 以降」→「Sprint 15 以降」「Sprint 8〜13」→「Sprint 8〜14」更新 |
| `tests/v11/screens/AppRouterV11.test.tsx` | 「準備中ゲーム」テストを G-06 → G-08 に差し替え（G-06 は本スプリントで実装済み） |

合計：13 ファイル新規 + 2 ファイル更新 = 15 ファイル（事前見積 12〜16 内）。

新規共通要素（components/v11 配下）：**GaborGridStimulus 1 個**（GE-07 のみ）。
G-06 は SideBySideStimulus を流用したので新規ゼロ。

## 3. 受け入れ基準カバー

### 3.1 spec-v11.md §13 Sprint 14 行

> 「G-06 と G-07 が単体プレイで動く」
> 「テスト +30 件以上」

| 仕様 | 担当 | 状態 |
|---|---|---|
| G-06 が単体プレイで動く | AppRouterV11 → G06MiniInstructionScreen → DistanceReminderV11 → G06WindowSizeScreen → G06ResultScreen | ◯ |
| G-07 が単体プレイで動く | AppRouterV11 → G07MiniInstructionScreen → DistanceReminderV11 → G07EdgeHuntScreen → G07ResultScreen | ◯ |
| テスト +30 件以上 | 新規 196 件（後述 §4） | ◯（+196） |

### 3.2 spec-v11.md §7.6 G-06 ガウス窓サイズ弁別

| 仕様 | 担当 | 状態 |
|---|---|---|
| 左右 2 ガボール（cpd・コントラスト・向き同一）でガウス窓 SD のみ異なる | `g06Trial.buildG06Trial`：左右 cpd / contrast / orientation は同値、sigmaDeg のみ `× √r` / `÷ √r` で分割 | ◯ |
| 60 秒同時提示（マスクなし、点滅なし、フェードなし） | `G06WindowSizeScreen`：`GAME6_V11.totalDurationMs=60_000`、setInterval で残り時間管理、phase 制御で同時表示維持 | ◯ |
| 「左が大きい」/「右が大きい」の 2 択 | `AnswerChoiceGroup` `layout="horizontal-2"`、`{ id: 'left', label: '左が大きい' }`, `{ id: 'right', label: '右が大きい' }` | ◯ |
| 採点：選択が大きい SD 側と一致なら正解 | `gradeG06`（大 SD 側を `correctSide` と定義） | ◯ |
| staircase: SD 比（易 2.0→難 1.1）、初期 1.5、step 0.1 | `gameRegistry.ts` G-06 entry：`paramRange={ min:1.1, max:2.0, initial:1.5, step:0.1 }`（既登録） | ◯ |
| 結果指標：閾値 = 最小 SD 比、digits=1（例 1.5）、unit「SD 比」 | `G06ResultScreen`：`thresholdRatio.toFixed(1)`、unit「SD 比」 | ◯ |
| 正解開示：正解側のパッチを 1.5 秒拡大ハイライト | `SideBySideStimulus` の `highlightSide=correctSide` + Animated scale(1→1.18→1)（既存実装、Sprint 12〜13 で確立） | ◯ |
| OPT-12 統一：1 試行 60 秒、画像切替なし、自由回答変更可、確定ボタンなし、自動採点 | `GamePlaySurface` 経由で骨格強制、`AnswerChoiceGroup` の onSelect 規約で切替 / 解除 | ◯ |

### 3.3 spec-v11.md §7.7 G-07 ガボールエッジ検出

| 仕様 | 担当 | 状態 |
|---|---|---|
| 4×4 = 16 個のガボールパッチを 60 秒間表示 | `g07Trial.buildG07Trial`：16 パッチ生成（行優先 4×4）、`G07_GRID_ROWS=4 / G07_GRID_COLS=4` 定数 | ◯ |
| うち 3 個が同じ向き・同一線上に並ぶ「線」を構成 | `enumerateG07Lines()`：行 4 + 列 4 + 対角 2 = **10 直線**、`chooseThreeFromFour`：4 セルから 3 セルの **C(4,3)=4 通り** = 計 40 線パターン | ◯ |
| 残り 13 個はランダム向き（基準向きから少なくとも paramValueDeg 離れる） | `pickNoiseOrientation()`：基準向き ± paramValueDeg を避けた周期空間からランダム選択 | ◯ |
| グリッド内の各パッチを直接タップ（最大 16 選択候補、複数選択可、3 個が正解） | `GaborGridStimulus` + `ImageChoiceCell role="checkbox"`（components.md §4 規約）、`G07EdgeHuntScreen.handleToggleCell` で集合管理 | ◯ |
| 採点：正解 3 個をすべて選択 = 正解、1 個でも誤りや欠落で不正解 | `gradeG07`：`tp.length === 3 && fp.length === 0 && fn.length === 0` で判定 | ◯ |
| 確定ボタンなし、60 秒経過で自動採点（OPT-12） | `GamePlaySurface` + 60 秒タイマー、`finalizedRef` で 1 度だけ発火 | ◯ |
| staircase: 向きズレ許容角（°、易 ±10°→難 ±2°）、初期 ±5°、step 1° | `gameRegistry.ts` G-07 entry：`paramRange={ min:2, max:10, initial:5, step:1 }`（既登録） | ◯ |
| 結果指標：閾値 = 向きズレ許容角、digits=0、unit「向きズレ°」 | `G07ResultScreen`：`String(Math.round(thresholdDeg))`、unit「向きズレ°」 | ◯ |
| 結果開示：3 個の正解パッチを 1.5 秒拡大ハイライト | `GaborGridStimulus.highlightIds=correctIds` + Animated scale(1→1.18→1) を 3 セル独立 | ◯ |

### 3.4 components.md §15 GE-06 / GE-07

| 仕様 | 状態 |
|---|---|
| GE-06：左右 2 ガボール、cpd・コントラスト・向き同一、ガウス窓 SD のみ異なる | ◯ `buildG06Trial` / `SideBySideStimulus` 流用 |
| GE-06：レイアウトは GE-02 と同じ | ◯ `SideBySideStimulus` を再利用、G-06 専用コンポーネント作成せず |
| GE-07：4×4 = 16 ガボールを `ImageChoiceCell` グリッドで配置 | ◯ `GaborGridStimulus` 新規実装 |
| GE-07：うち 3 個が同一線上に同向き、他はランダム向き | ◯ `buildG07Trial` で実装（10 直線 × 4 通り = 40 パターン） |
| GE-07：全体辺長 スマホ 320px、PC 480px | ◯ `computeG07GridLayout`：360→288 / 375→320 / 768→400 / 1280→480 |

### 3.5 design-v11/sprints/sprint-14/screens.md S14-01〜S14-06

| 画面 | 状態 |
|---|---|
| S14-01 G-06 ミニ説明 | ◯ G06MiniInstructionScreen（タイトル + 4 リスト + 「はじめる」） |
| S14-02 G-06 プレイ画面 | ◯ GamePlaySurface + SideBySideStimulus + ガイド文「どちらが大きい範囲？」+ 2 択 |
| S14-03 G-06 結果サマリ | ◯ ResultSummaryV11 + extraStimulus に SideBySideStimulus + highlightSide 拡大演出 |
| S14-04 G-07 ミニ説明 | ◯ G07MiniInstructionScreen（タイトル + 4 リスト + 「はじめる」） |
| S14-05 G-07 プレイ画面 | ◯ GamePlaySurface + GaborGridStimulus（4×4）+ ガイド文「3 個の『線』を構成するパッチを全部選んでください」 |
| S14-06 G-07 結果サマリ | ◯ ResultSummaryV11 + extraStimulus に GaborGridStimulus + highlightIds 3 セル拡大演出 |

レスポンシブ表（screens.md §4）：

| viewport | G-06 パッチ | G-07 グリッド辺 | G-07 セル | G-07 ギャップ |
|---|---|---|---|---|
| 360 | 100 ◯ | 288 ◯ | 60 ◯ | 12 ◯ |
| 375 | 120 ◯ | 320 ◯ | 64 ◯ | 12 ◯ |
| 768 | 140 ◯ | 400 ◯ | 88 ◯ | 16 ◯ |
| 1280 | 160 ◯ | 480 ◯ | 104 ◯ | 16 ◯ |

`computeG06StimulusLayout` / `computeG07GridLayout` で全件カバー、テスト済み。

### 3.6 OPT-1〜OPT-12 横断

| 原則 | 状態 |
|---|---|
| OPT-1 大きい文字（本文 18pt+ / ボタン 18pt+） | ◯ G-06 ボタン 26pt、G-07 セル aria-label / リスト本文 24pt |
| OPT-2 大きいタップ領域（48pt+ 推奨 56pt） | ◯ G-06 ボタン 64pt、G-07 セル 60〜104px（OPT-2 床 56pt は全 viewport で確保、テスト済み） |
| OPT-3 短い操作シーケンス | ◯ ホーム → 単体プレイ → G-06 / G-07 で 3 タップ |
| OPT-7 急かさない | ◯ 結果画面はユーザー操作で進む |
| OPT-11 強制 60 秒視聴 | ◯ `totalDurationMs=60_000` 固定、× ボタンは確認ダイアログ経由 |
| OPT-12 全ゲーム共通の注視フォーマット | ◯（上記 3.2 / 3.3 の通り全項目満たす） |

## 4. テスト結果

### 4.1 件数

```
Sprint 13 完了時：950 件 / 90 suites
Sprint 14 完了時：1146 件 / 101 suites
差分：+196 件 / +11 suites（既存に追記なし、すべて新規ファイル）
```

### 4.2 重点カバレッジ

#### G-06（70 件）

- **g06Trial（36 件）**：trial spec 生成（左右 sigmaDeg ペア、cpd と向きとコントラスト同一）、staircase 全レンジ（1.1 / 1.5 / 2.0）での SD 比、左右 sigmaDeg が §6.1 範囲（0.3〜1.0）内に収まること、採点正解 / 不正解 / 未回答、レスポンシブレイアウト 360 / 375 / 768 / 1280px、phaseRad の左右独立性、rng 呼び出し回数、paramValueRatio < 1 のクランプ動作
- **g06Result（19 件）**：日本語ラベル「左が大きい / 右が大きい」、null/未回答処理、step=0.1 / digits=1 での flat / improved / worsened 判定、桁数フォーマット
- **G06WindowSizeScreen（13 件）**：60 秒タイマー、確定ボタンなし、staircase 連動（playedParam=1.5 → 不正解時 1.6 推移、AsyncStorage 永続化確認、max=2.0 でのクランプ確認）、ガイド文「どちらが大きい範囲？」、左右ボタン押下、選択切替 / 解除、未回答自動採点、閾値の小数 1 桁丸め
- **G06ResultScreen（15 件）**：正解 / 不正解 / 未回答ラベル、閾値「1.5 SD 比」、「初回測定」、SinglePlayPostFooter 3 ボタン、改善 diff 表示、SideBySideStimulus 埋め込み（g06-result-stimulus）、highlightSide で正解側セル checked、閾値 1.1 最難値の桁落ちなし、閾値 2.0 末尾ゼロ保持
- **G06MiniInstructionScreen（5 件）**：描画 / 「はじめる」 / 戻る / 4 項箇条書き / タイトル

#### G-07（126 件）

- **g07Trial（47 件）**：spec 検証（GAME7_V11 / G07_GABOR_PARAMS / GRID_ROWS=4 / LINE_LENGTH=3 / gameRegistry G-07 paramRange）、makeG07CellId、enumerateG07Lines（10 直線：行 4 / 列 4 / 対角 2、各 4 セル、行 0 / 列 2 / 対角 0 / 対角 1 の正確な座標）、chooseThreeFromFour（C(4,3)=4 通り）、buildG07Trial（16 パッチ、3 ライン member、correctIds と一致、10 直線のいずれかから抜粋、line 3 メンバーの向きが基準 ± half 内、ノイズ 13 メンバーの向きが基準から minDistance 以上、paramValueDeg=2 / 5 / 10 全レンジ、< 0 クランプ、共通 cpd/contrast/sigma、phaseRad 範囲、rng 呼び出し回数）、gradeG07（全正解 / 1 過剰 / 1 欠落 / 過剰+欠落混在 / 未回答 / 重複選択 = 集合化）、buildG07ResultDetailText（null / 未回答 / 全正解 / N過剰 / M不足）、describeG07CellPos / buildG07CorrectAnswerLabel（「2 行 3 列」1-index 表示、不正な ID は元の文字列）、computeG07GridLayout（4 viewport、cellSize×4 + gap×3 ≤ gridSize、cellSize ≥ 56 OPT-2）
- **g07Result（14 件）**：buildG07CorrectLabel（null / 3 個連結）、buildG07UserAnswerLabel（null / 未回答 / 3/3 / 2/3 + 1 過剰）、computeG07DiffFromBest（null / improved / worsened / flat / step=1 step/2=0.5 境界 / digits=0 整数表示）
- **GaborGridStimulus（13 件）**：16 セル全描画、checkbox role / aria-checked=false 初期、selectedIds 反映、セルタップで onToggleCell、複数 3 セルタップ、再タップ通知（解除は親側）、disabled、highlightIds 反映（黄 4px 枠）、selectedIds + highlightIds 同時、groupAriaLabel 上書き / 既定文面、aria-label「縞模様 N 行 M 列」、disabled 中は onToggleCell 呼ばれない
- **G07EdgeHuntScreen（11 件）**：60 秒タイマー、確定ボタンなし、ガイド文、未回答 / unattempted+isCorrect=false、staircase 連動（playedParam=5 → 不正解時 6° = +1 step、max=10° クランプ、min=2° クランプ）、閾値が整数。**16 セル個別タップ動作は GaborGridStimulus 単体テストで担保（GamePlaySurface 内部の testID は accessibilityElementsHidden 配下で findByTestId 不可、Sprint 13 self-review §6.1 と同方針）**
- **G07ResultScreen（18 件）**：正解時「正解は『N 行 M 列・…』」「あなたの回答『3/3 個正解』」、不正解時「2/3 個正解（1 過剰）」、未回答「未回答」、閾値「5 向きズレ°」、初回測定、SinglePlayPostFooter 3 ボタン、改善 diff、GaborGridStimulus 埋め込み、3 セル highlight 黄枠、g07-result-detail（未回答時のみ）、閾値 2 最難 / 10 最易、閾値カードに「初回測定」非含

#### 既存テスト

- **既存 950 件全 PASS**：AppRouterV11 テストの「準備中ゲーム」を G-06 → G-08 に差し替え以外は無変更で全件継続合格

### 4.3 typecheck / build

```
npm run typecheck → PASS（0 errors）
npm run build:web → PASS（695 kB bundle、約 3 秒）
```

## 5. 動作確認

### 5.1 手動検証（想定動線）

`npm run web` で起動し、以下を確認：

1. ホーム → 単体プレイ → 「G-06 ガウス窓サイズ弁別」 → ミニ説明 → 「はじめる」
2. 距離リマインド 3 秒カウントダウン → プレイ画面遷移
3. 左右 2 ガボール（cpd・コントラスト・向き同一、SD 比 1.5 で初期表示）+ 中央固視点
4. 残り 60 秒カウントダウン
5. 左右パッチ直接タップ or 「左が大きい」「右が大きい」ボタンで回答
6. 再タップで解除、別を押すと切替
7. 60 秒経過で自動採点 → 結果画面：「正解は『右が大きい』」+ 拡大ハイライト + 「閾値 1.5 SD 比」+ 「初回測定」
8. 「同じゲームをもう一度」/「一覧へ戻る」/「ホームへ」フッター
9. 中断 × ボタン → ConfirmDialog → 「中断する」で一覧へ戻る
10. 同じゲームをもう一度 → ミニ説明スキップ → 距離リマインド → プレイ（2 回目以降は staircase が 1 step 動いた状態）

G-07 も同様の動線で：
1. 「G-07 ガボールエッジ検出」 → ミニ説明 → はじめる
2. 距離リマインド → プレイ画面（4×4 = 16 ガボール盤面、向きは基準 ± 5° 範囲のライン 3 個 + ノイズ 13 個）
3. 60 秒間自由にタップ / 再タップ → 自動採点
4. 結果：「正解は『2 行 2 列・3 行 3 列・4 行 4 列』」（正解 3 セル拡大ハイライト + 黄枠）+ 「あなたの回答『2/3 個正解（1 過剰）』」+ 「閾値 5 向きズレ°」

### 5.2 a11y / レスポンシブ

- スマホ縦（375×667）：G-06 パッチ 120×120 + ギャップ 32px、G-07 セル 64×64 + ギャップ 12px、上下スクロールなし
- PC（1280×800）：G-06 パッチ 160×160 + ギャップ 64px、G-07 セル 104×104 + ギャップ 16px
- Tab ナビゲーション：
  - G-06：左パッチ → 右パッチ → 左ボタン → 右ボタン
  - G-07：4×4 のセルを行優先で全 16 個 Tab で巡回（ImageChoiceCell の Pressable 既定）
- 各セル / ボタン：focus 時 3px 青 outline + 選択時 4px 黄枠（両立可能）
- SR：
  - G-06：`accessibilityRole="radiogroup"`、各ボタン `accessibilityRole="radio"`、aria-label「左の縞模様（タップで「左が大きい」と回答）」
  - G-07：各セル `role="checkbox"` + `aria-checked` 動的更新、Space / Enter でトグル、aria-label「縞模様 N 行 M 列」

## 6. 既知の懸念

### 6.1 GamePlaySurface 内部の testID 不可視（既存問題、Sprint 9 / 11 / 12 / 13 / 14 で連続）

`GamePlaySurface` の `stimulusFrame` は `accessibilityElementsHidden=true` を持つため、
内部に置いた `testID`（`g07-cell-rNcM` など）は `@testing-library/react-native` の
`findByTestId` から到達できない。Sprint 14 でも同制約を受け入れ、stimulus 内部の
動作テストは `GaborGridStimulus` 単体テスト（13 件）で担保し、G07EdgeHuntScreen 画面
テストは「画面骨格 + タイマー + staircase 連動」のみカバーする方針で統一した
（Sprint 13 §6.1 と同じ方針）。

### 6.2 G-07 結果サマリの GaborGrid 描画は 16 個分の BMP 計算を行う

`GaborPatch` は内部で `computeGaborPixels` + `pixelsToBmpDataUrl` を使う。プレイ画面
で 16 パッチ、結果画面でさらに 16 パッチを再描画するため、瞬間的にメインスレッドで
ピクセル計算が走る。`GaborPatch` 自体は `React.memo` 化されており、props 変化なしなら
再計算は走らないが、結果画面マウント時の初回ピクセル計算が 16 回分走る。
プレイ画面 → 結果画面の遷移で UI スレッドが 100ms 程度ブロックされる可能性がある
（パッチ 1 個あたり 50〜80px / 4096 ピクセルで数 ms）。実機で気になるレベルなら
Sprint 15 以降で `Skia.Canvas` への移行を検討（components.md §14 が予告）。

### 6.3 G-07 trial 生成のジッタ理論と「線として見える」の関係

`paramValueDeg`（=向きズレ許容角）は spec §7.7 で「易 ±10° → 難 ±2°」と定義される。
本実装では：
- ライン 3 メンバーの向きを「基準向き ± paramValueDeg/2」範囲内でジッタ
- ノイズ 13 メンバーの向きを「基準向きから少なくとも paramValueDeg 離す」

paramValueDeg が **小さいほど**、ライン 3 メンバーが揃って見え、かつノイズ 13 個が
基準向きと近い向きを取れない（明確に異なる）→ ライン検出が**易しい**方向にも見える。
一方、paramValueDeg が **大きい**と、ライン 3 メンバーの向きジッタが大きく、ノイズ
との見分けがつきづらくなる方向にも見える。

しかし、staircase は spec.§F-09 と整合的：
- min=2°（**難**）：ライン 3 メンバーがほぼ完全に揃わないと検出できない
- max=10°（**易**）：ライン 3 メンバーの向きジッタが大きくても許容しやすい

→ 本実装は spec 通り `min=2°` を「難」、`max=10°` を「易」として staircase が
動作（テスト済み：不正解で 6° → 7° → ... 易方向、正解で 4° → 3° → ... 難方向）。

実際の知覚学習では「向きズレ許容角」をジッタとして与えるパラダイムは複数解釈可能
（例：3 個間の向き差そのもの、3 個と「真の線」からの偏差など）。本実装は spec の
表現「線を構成するパッチ間の向きズレ許容角」を「3 個の向きが基準から ± deg/2 範囲
内に収まる場合のみライン認識される」と解釈し、視覚的に成立する範囲とした。

### 6.4 G-07 採点の「3 個全部一致 = 正解」の厳しさ

spec §7.7：「正解 3 個をすべて選択 = 正解 / 1 個でも誤りや欠落で不正解」。
これは 16 パッチから 3 個を完全に正解する必要があり、ランダム選択での正答率は
C(13, 0) / C(16, 3) ≈ 0.18% と極めて低い。staircase の 3-down/1-up は連続 3 回
正解で初めて難化するため、ほとんどのセッションで易化方向（max=10°）にしか動かない
可能性がある。

これは**仕様通り**（OPT-12 + 全選択一致型 = G-01 と同じ）であり、本スプリントでは
仕様を変更しない。リリース後のユーザーレビューで「難しすぎる」という声が出れば、
Sprint 18+ で「N/3 達成」のような部分評価採点に変更する可能性を残す（A-11 / F-18）。

### 6.5 OB-06 体験画面のプレースホルダ未差し替え

Sprint 8〜13 self-review で予告された通り、`src/screens/v11/Onboarding/OB06Experience.tsx`
は G-04 体験プレースホルダのまま。Sprint 14 でも単体プレイ動線で G-06 / G-07 が動く
ことが受け入れ基準であり、OB-06 への組込みは含まれていないため未対応。
Sprint 18 / 19 のオンボーディング仕上げタイミングで差し替え予定。

### 6.6 GaborGridStimulus のアニメ警告（act 警告）

`GaborGridStimulus` の `useEffect` で 3 セル分の `Animated.timing` を起動する。Jest
の useFakeTimers + advanceTimersByTime でタイマーが進むと、一部のフレームで `set
state inside test was not wrapped in act(...)` 警告が出るが、テスト結果は PASS。
これは Sprint 9〜13 で SideBySideStimulus / MorphGridStimulus でも発生していた
既知の現象で、テスト結果に影響しない。reduced-motion 環境（jest 既定）では
即時 setValue(1) のみで、warnings は実害なし。

## 7. Sprint 15 申し送り（G-08 残像方位弁別 + G-09 側方マスキング）

### 7.1 G-08 残像方位弁別

- spec §7.8：上下 2 ガボール（adapter 上 + テストパッチ下）、60 秒同時提示
- 注視ポイント：「下のパッチは時計回り」「下のパッチは反時計回り」の 2 択
- staircase：テストパッチの絶対角度（°、易 10° → 難 1°）、初期 5°、step 1°
- 新規共通要素：**GE-08 TiltAftereffectStimulus**（components.md §15）
  - 上下並び（GE-02 と異なり縦並び）
  - 上：adapter（傾き 20° 固定、高コントラスト 0.6）
  - 下：テストパッチ（staircase 値）
  - 各パッチ 140×140px（スマホ）、180×180px（PC）
  - ギャップ space.6（32px）
- 結果指標：閾値 = テスト絶対角度、digits=0、unit「°」

### 7.2 G-09 側方マスキング

- spec §7.9：横一列 3 ガボール「flanker | target | flanker」、60 秒同時提示
- 選択肢：「縦寄り」「横寄り」の 2 択
- staircase：target コントラスト + flanker 距離の合成（実装上はどちらか主、もう一方は連動）
- 新規共通要素：**GE-09 LateralMaskingStimulus**
  - 各パッチ 80×80px（スマホ）、120×120px（PC）
  - 横一列で center=target、両側 flanker（target 直径の N 倍距離）

両ゲームとも左右 2 ガボール（GE-02 系）からの拡張で、新規 stimulus 2 個と
2 ゲーム分の screen 6 個（mini / play / result × 2）が必要。Sprint 14 規模感
（13 ファイル新規）と同等の負荷を想定。

### 7.3 共通基盤の安定性

Sprint 9〜14 で確立した以下は Sprint 15 以降も基本変更なしで使い回す：
- GamePlaySurface / ResultSummaryV11 / SinglePlayPostFooter / ImageChoiceCell（**checkbox / radio 切替済**、Sprint 14 で確認）/ MetricCard / AnswerChoiceGroup（horizontal-2, grid-4, vertical-list, clock-8）/ SideBySideStimulus（aria-label 改修済、cpd: number 受け付け）/ **GaborGridStimulus（GE-07、Sprint 14 新規）**
- `GaborPatchProps.cpd` の `number` 型緩和（Sprint 13）

新規追加が必要なのは：
- AC-4 keypad-10（G-13、Sprint 17）
- GE-08 TiltAftereffectStimulus（G-08、Sprint 15）
- GE-09 LateralMaskingStimulus（G-09、Sprint 15）
- GE-10 TextureSegmentationStimulus（8×8 grid、G-10、Sprint 16）— 注：Sprint 14 の
  GaborGridStimulus（4×4 固定）を 8×8 にスケールできるなら流用検討
- GE-11 VernierStimulus（G-11、Sprint 16）
- GE-12 CrowdingStimulus（G-12、Sprint 17）
- GE-13 EmbeddedNumeralStimulus（G-13、Sprint 17）

### 7.4 GaborGridStimulus を G-10（8×8）に流用するかの判断

Sprint 14 の `GaborGridStimulus` は 4×4 固定で書かれている（`Array.from({ length: 4 }, ...)`）。
G-10 テクスチャ分離（spec §7.10）は 8×8 = 64 パッチで、選択肢は「4 象限」（grid-4 ボタン）
であり、パッチ自体はタップ対象ではない。**したがって GaborGridStimulus（タップ可能 grid）
とは性質が異なる**。Sprint 16 で G-10 用に別の `TextureSegmentationStimulus` を新規実装
する方針で問題なし。

ただし、Sprint 14 の `GaborGridStimulus` で確立した「行 / 列 を Array.from で書き、
各セルに ImageChoiceCell をラップ」のパターンは G-10 にも流用できる。共通化すべきかは
Sprint 16 着手時に判断。

### 7.5 OB-06 オンボーディング体験差し替え

依然未対応。Sprint 18 / 19 のオンボーディング仕上げで対応予定。
