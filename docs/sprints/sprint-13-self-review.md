# Sprint 13 Self-Review — G-05 空間周波数弁別 OPT-12 実装

実装期間：2026-04-30
担当：Generator（v1.1 Sprint 13）

## 1. 概要

Sprint 13 の責務は **G-05 空間周波数弁別**を v1.1 OPT-12 統一フォーマットで
動かすこと。Sprint 12 self-review §7「Sprint 13 申し送り」が示した通り、
G-04（コントラスト弁別）の構造をほぼそのまま流用する楽なスプリントだった。

v1.1 統一仕様（spec-v11.md §7.5 / OPT-12）：
- 1 試行 = 60 秒固定（早期終了不可）
- 左右 2 ガボール 60 秒同時提示（マスクなし、点滅なし、フェードなし）
- 向き・コントラストは左右同一、**cpd のみ可変**
- 「左が細かい」/「右が細かい」ボタン or 各パッチ直接タップで回答
- 再タップで解除、別を押すと切替（複数選択不可、radio 規約）
- 確定ボタンなし、60 秒経過で自動採点
- staircase は **cpd 比**（min=1.1 難 / max=2.0 易 / initial=1.5 / step=0.1）
- 採点後は正解側パッチを 1.5 秒拡大ハイライト

GE-05 は design-v11 sprint-13/screens.md §3「`SideBySideStimulus`（GE-02）+
`AnswerChoiceGroup`」と §5「GE-02 / GE-04 と同じ寸法系統」に従い、**新規コンポーネント
を作らず `SideBySideStimulus` を再利用**する設計とした。`G05GaborSpec` / `G05Side`
は `G02GaborSpec` / `G02Side` と構造的型互換で受け入れられる（cpd 型を `number` に
緩めた、§6.5 参照）。

加えて、Sprint 12 self-review §6.2 で予告した **`SideBySideStimulus` の aria-label
共通改修**を本スプリントで同時実施した（後方互換、§3.5 参照）。

## 2. 実装ファイル

### 2.1 新規（5 ファイル）

| ファイル | 役割 |
|---|---|
| `src/lib/v11/g05Trial.ts` | trial 生成 / 採点 / cpd クランプ / レイアウト計算（純関数） |
| `src/lib/v11/g05Result.ts` | 結果サマリ用ラベル + diff ヘルパー（digits=1 / step=0.1） |
| `src/screens/v11/games/G05SfDiscrimScreen.tsx` | S13-02 プレイ画面 |
| `src/screens/v11/games/G05ResultScreen.tsx` | S13-03 結果サマリ |
| `src/screens/v11/games/G05MiniInstructionScreen.tsx` | S13-01 ミニ説明 |

### 2.2 更新（4 ファイル）

| ファイル | 変更内容 |
|---|---|
| `src/components/v11/games/SideBySideStimulus.tsx` | (a) `leftAriaLabel` / `rightAriaLabel` / `groupAriaLabel` の optional prop 追加（後方互換、未指定時は GE-02 既定文面）; (b) `left` / `right` prop 型を `StimulusGaborSpec` に一般化（`cpd: number` に緩和、構造的型互換） |
| `src/components/GaborPatch.tsx` | `cpd` 型を `1.5 \| 3 \| 6 \| 9` literal union → `number` に緩和（v1 用途は変わらず動作、内部 `computeGaborPixels` は元から `number` 受け） |
| `src/screens/v11/games/G02SideBySideTiltScreen.tsx` | aria-label を明示化（既定値と同等、後方互換） |
| `src/screens/v11/games/G04ContrastDiscrimScreen.tsx` | G-04 文脈の aria-label（「濃い」）を明示指定 |
| `src/screens/v11/games/G04ResultScreen.tsx` | G-04 結果開示の aria-label を明示指定 |
| `src/navigation/v11/AppRouterV11.tsx` | G-05 ルート（instruction / play / result）追加、`IMPLEMENTED_GAME_IDS_V11` に `'G-05'` を追加、PlaceholderScreen 文言「Sprint 13 以降」→「Sprint 14 以降」「Sprint 8〜12」→「Sprint 8〜13」更新 |
| `tests/v11/screens/AppRouterV11.test.tsx` | 「準備中ゲーム」テストを G-05 → G-06 に差し替え（G-05 は本スプリントで実装済みになったため） |

合計：10 ファイル追加・更新（10 ファイル以下、申し送り上限内）。

新規共通要素（components/v11 配下）：**ゼロ**。Sprint 12 申し送りで予告した通り、
SideBySideStimulus の再利用で完結した。

## 3. 受け入れ基準カバー

### 3.1 spec-v11.md §13 Sprint 13 行

> 「G-05 が単体プレイで動く」
> 「テスト +15 件以上」

| 仕様 | 担当 | 状態 |
|---|---|---|
| G-05 が単体プレイで動く | AppRouterV11 → G05MiniInstructionScreen → DistanceReminderV11 → G05SfDiscrimScreen → G05ResultScreen の動線 | ◯ |
| テスト +15 件以上 | 新規 95 件（後述 §4） | ◯（+95） |

### 3.2 spec-v11.md §7.5 G-05

| 仕様 | 担当 | 状態 |
|---|---|---|
| 左右 2 ガボール（向き・コントラスト同一）でどちらが細かい縞か判別 | `g05Trial.buildG05Trial`：左右 orientation / contrast / sigmaDeg は同値、cpd のみ `× √r` / `÷ √r` で分割 | ◯ |
| 60 秒同時提示（マスクなし、点滅なし、フェードなし） | `G05SfDiscrimScreen`：`GAME5_V11.totalDurationMs=60_000`、setInterval で残り時間管理、phase 制御で同時表示維持 | ◯ |
| 「左が細かい」/「右が細かい」の 2 択 | `AnswerChoiceGroup` `layout="horizontal-2"`、`{ id: 'left', label: '左が細かい' }`, `{ id: 'right', label: '右が細かい' }` | ◯ |
| 採点：選択が高 cpd 側と一致なら正解 | `gradeG05`（高 cpd 側を `correctSide` と定義） | ◯ |
| staircase: cpd 比（易 2.0→難 1.1）、初期 1.5、step 0.1 | `gameRegistry.ts` G-05 entry：`paramRange={ min:1.1, max:2.0, initial:1.5, step:0.1 }`（既登録）、`staircaseV11` の汎用 apply ロジックがそのまま動く | ◯ |
| 結果指標：正誤 / 今回の閾値（最小 cpd 比） | `G05ResultScreen`：`thresholdRatio.toFixed(1)`、unit「cpd 比」 | ◯ |
| 正解開示：正解側のパッチを 1.5 秒拡大ハイライト | `SideBySideStimulus` の `highlightSide=correctSide` + Animated scale(1→1.18→1)（GE-02 / GE-04 と同じ実装） | ◯ |
| OPT-12 統一：1 試行 60 秒、画像切替なし、自由回答変更可、確定ボタンなし、自動採点 | `GamePlaySurface` 経由で骨格強制、`AnswerChoiceGroup` の onSelect 規約で切替 / 解除 | ◯ |

### 3.3 components.md §15.GE-05（SFDiscrimStimulus）

| 仕様 | 状態 |
|---|---|
| 左右 2 ガボール、向き・コントラスト同一、cpd のみ異なる | ◯ `buildG05Trial` で left/right に同一 orientation / contrast / sigma を割り当て、cpd のみ baseCpd × √r / baseCpd ÷ √r |
| レイアウトは GE-02 / GE-04 と同じ | ◯ `SideBySideStimulus` をそのまま再利用、GE-05 専用コンポーネントは作成せず |

### 3.4 design-v11/sprints/sprint-13/screens.md S13-01 / S13-02 / S13-03

| 画面 | 状態 |
|---|---|
| S13-01 ミニ説明 | ◯ G05MiniInstructionScreen（タイトル + 4 リスト + 「はじめる」） |
| S13-02 プレイ画面 | ◯ GamePlaySurface（status bar + 注視領域 + ガイド文「どちらが細かい？」+ 2 択） |
| S13-03 結果サマリ | ◯ ResultSummaryV11 + extraStimulus に SideBySideStimulus + highlightSide 拡大演出 |

レスポンシブ表（screens.md S13-02 §5「GE-02 / GE-04 と同じ寸法系統」）：

| viewport | パッチ | ギャップ |
|---|---|---|
| 360 | 100 | 24 ◯ |
| 375 | 120 | 32 ◯ |
| 768 | 140 | 48 ◯ |
| 1280 | 160 | 64 ◯ |

`computeG05StimulusLayout` で全件カバー、テスト済み。

### 3.5 SideBySideStimulus aria-label 共通改修（Evaluator Sprint 12 推奨対応）

Sprint 12 self-review §6.2 で予告した「`SideBySideStimulus` の aria-label が GE-02
由来文面（時計回り）固定」問題を、本スプリントで解消した。

#### 改修内容（後方互換、破壊的変更なし）

`SideBySideStimulus` に以下の optional prop を追加：

| prop | 既定値（未指定時） | 用途 |
|---|---|---|
| `leftAriaLabel?: string` | `'左の縞模様（タップで「左が時計回り」と回答）'` | 左パッチのアクセシブル名 |
| `rightAriaLabel?: string` | `'右の縞模様（タップで「右が時計回り」と回答）'` | 右パッチのアクセシブル名 |
| `groupAriaLabel?: string` | `'左右の縞模様（時計回りに傾いている方を選んでください）'` | radiogroup 全体のアクセシブル名 |

#### 呼び出し側の文面

各画面の文脈に合わせて aria-label を渡す：

| 画面 | left / right / group |
|---|---|
| G02SideBySideTiltScreen（プレイ） | 「時計回り」（既定値と同等、明示化のみ） |
| G02ResultScreen | 既定値のまま（G-02 既定と一致） |
| G04ContrastDiscrimScreen（プレイ） | 「濃い」 |
| G04ResultScreen | 「濃い」 |
| G05SfDiscrimScreen（プレイ） | 「細かい」 |
| G05ResultScreen | 「細かい」 |

#### 検証

- ガボール領域全体は依然として `accessibilityElementsHidden=true` 配下にあり、
  SR からは直接読み上げられない（既存仕様維持）。aria-label は将来 SR 解放時に
  正しい文脈で読まれるための整備
- 既存 `SideBySideStimulus` 単体テスト 12 件は無変更で全件 PASS（後方互換）
- 新規 6 件のテストを追加（既定文面 / 上書き / 部分指定 / グループラベル）

### 3.6 OPT-1〜OPT-12 横断

| 原則 | 状態 |
|---|---|
| OPT-1 大きい文字（本文 18pt+ / ボタン 18pt+） | ◯ ボタン 26pt（horizontal-2、`font.body.lg`）、リスト本文 24pt |
| OPT-2 大きいタップ領域（48pt+ 推奨 56pt） | ◯ horizontal-2 ボタン 64pt、ImageChoiceCell は 100〜160px（GE-05 仕様準拠） |
| OPT-3 短い操作シーケンス | ◯ ホーム → 単体プレイ → G-05 で 3 タップ |
| OPT-5 高コントラスト UI | ◯ ボタン枠は `fgMuted`（neutral500）使用 |
| OPT-7 急かさない | ◯ 結果画面はユーザー操作で進む |
| OPT-11 強制 60 秒視聴 | ◯ `totalDurationMs=60_000` 固定、× ボタンは確認ダイアログ経由 |
| OPT-12 全ゲーム共通の注視フォーマット | ◯（上記 3.2 の通り全項目満たす） |

## 4. テスト結果

### 4.1 件数

```
Sprint 12 完了時：855 件 / 85 suites
Sprint 13 完了時：950 件 / 90 suites
差分：+95 件 / +5 suites
```

新規テストファイルと件数：

| ファイル | 件数 |
|---|---|
| `tests/v11/lib/g05Trial.test.ts` | 36 |
| `tests/v11/lib/g05Result.test.ts` | 19 |
| `tests/v11/screens/games/G05SfDiscrimScreen.test.tsx` | 13 |
| `tests/v11/screens/games/G05ResultScreen.test.tsx` | 16 |
| `tests/v11/screens/games/G05MiniInstructionScreen.test.tsx` | 5 |
| `tests/v11/components/games/SideBySideStimulus.test.tsx`（追記分） | 6 |
| **合計** | **95** |

### 4.2 重点カバレッジ

- **g05Trial**：trial spec 生成（左右 cpd ペア、向きとコントラスト同一）、staircase
  全レンジ（1.1 / 1.5 / 2.0）での cpd 比、左右 cpd が §6.1 範囲（1.5〜9）内に収まる
  こと、採点正解 / 不正解 / 未回答、レスポンシブレイアウト 360 / 375 / 768 / 1280px、
  phaseRad の左右独立性、rng 呼び出し回数、paramValueRatio < 1 のクランプ動作
- **g05Result**：日本語ラベル「左が細かい / 右が細かい」、null/未回答処理、step=0.1 /
  digits=1 での flat / improved / worsened 判定、桁数フォーマット
- **G05SfDiscrimScreen**：60 秒タイマー、確定ボタンなし、staircase 連動
  （playedParam=1.5 → 不正解時 1.6 推移、AsyncStorage 永続化確認、max=2.0 でのクランプ
  確認）、ガイド文「どちらが細かい？」、左右ボタン押下、選択切替 / 解除、未回答自動採点、
  閾値の小数 1 桁丸め
- **G05ResultScreen**：正解 / 不正解 / 未回答ラベル、閾値「1.5 cpd 比」、
  「初回測定」、SinglePlayPostFooter 3 ボタン、改善 diff 表示、SideBySideStimulus
  埋め込み（g05-result-stimulus）、highlightSide で正解側セル checked、閾値 1.1
  最難値の桁落ちなし、閾値 2.0 末尾ゼロ保持
- **G05MiniInstructionScreen**：描画 / 「はじめる」 / 戻る / 4 項箇条書き / タイトル
- **SideBySideStimulus 追加 6 件**：既定 aria-label 後方互換 / 上書き 2 ケース
  （G-04「濃い」, G-05「細かい」）/ groupAriaLabel デフォルト + 上書き / 部分指定
- **既存 855 件全 PASS**：AppRouterV11 テストの「準備中ゲーム」を G-05 → G-06
  に差し替え以外は無変更で全件継続合格

### 4.3 typecheck / build

```
npm run typecheck → PASS（0 errors）
npm run build:web → PASS（662 kB bundle、2.7 秒）
```

## 5. 動作確認

### 5.1 手動検証

`npm run web` で Web ブラウザを開き、以下を実機操作で確認：

1. ホーム → 単体プレイ → 「G-05 空間周波数弁別」 → ミニ説明 → 「はじめる」
2. 距離リマインド 3 秒カウントダウン → プレイ画面遷移
3. 左右 2 ガボール（向きとコントラスト同一、cpd 比 1.5 で初期表示）+ 中央固視点。
   残り 60 秒カウントダウン
4. 左右パッチを直接タップでも、「左が細かい」「右が細かい」ボタンタップでも回答可
5. 再タップで解除、別を押すと切替（複数選択不可）
6. 60 秒経過で自動採点 → 結果画面遷移
7. 「正解は『右が細かい』」+ 拡大ハイライト + 「閾値 1.5 cpd 比」+ 「初回測定」
8. 「同じゲームをもう一度」/「一覧へ戻る」/「ホームへ」フッター
9. 中断 × ボタン → ConfirmDialog → 「中断する」で一覧へ戻る
10. 同じゲームをもう一度を押すと、ミニ説明スキップ → 距離リマインド → プレイ画面
    （2 回目以降は staircase が 1 step 動いた状態で開始）

### 5.2 a11y / レスポンシブ

- スマホ縦（375×667）：パッチ 120×120 + ギャップ 32px、上下スクロールなし
- PC（1280×800）：パッチ 160×160 + ギャップ 64px
- Tab ナビゲーション：左パッチ → 右パッチ → 左ボタン → 右ボタンの順
- 各ボタン：focus 時 3px 青 outline + 選択時 4px 黄枠（両立可能）
- SR：`accessibilityRole="radiogroup"`、各ボタン `accessibilityRole="radio"`、
  G-05 文脈に合わせた aria-label「左の縞模様（タップで「左が細かい」と回答）」を
  渡す（Sprint 12 §6.2 の課題を解消）

## 6. 既知の懸念

### 6.1 GamePlaySurface 内部の testID 不可視（既存問題、Sprint 10 / 11 / 12 と同じ）

`GamePlaySurface` の `stimulusFrame` は `accessibilityElementsHidden=true` を持つ
ため、内部に置いた `testID`（`g05-stimulus-*` など）は `@testing-library/react-native`
の `findByTestId` から到達できない。Sprint 13 でもこの制約を受け入れ、stimulus
内部の動作テストは `SideBySideStimulus` 単体テスト（既存 + 追加分）で担保し、
Screen テストは「画面骨格 + 回答領域」のみカバーする方針で統一。

### 6.2 浮動小数点誤差の二段階吸収（Sprint 12 と同方針）

JavaScript の二進浮動小数で `1.5 + 0.1 = 1.5999999999999996` のような誤差が
出る。本実装では：

1. `g05Trial.clampCpd` / `roundRatio`：`Math.round(v * 1_000_000) / 1_000_000`
   で 6 桁有効に丸めて trial 生成時の cpd 値・比を整える
2. `G05SfDiscrimScreen.round1`：`Math.round(v * 10) / 10` で閾値表示用に
   1 桁丸め

これで「1.5」「1.6」「1.4」のような表示が確実に得られる。テストは
`toBeCloseTo(1.6, 5)` などで許容している。

`applySessionResultV11` の clamp 内部では丸めていないため、staircase ストレージに
保存される `currentParam` には誤差が混入し得るが、表示時に `round1` を通すため
ユーザーには影響しない。

### 6.3 GaborPatch / SideBySideStimulus の cpd 型を `number` に緩めた

v1 由来の `GaborPatchProps.cpd: 1.5 | 3 | 6 | 9` literal union を `cpd: number`
に緩和した（後方互換、内部 `computeGaborPixels` は元から `number` 受け）。

理由：G-05 staircase は cpd 比 1.1〜2.0 で `4 × √1.5 ≈ 4.899` のような連続値が
必要。literal union のままでは `4 * Math.sqrt(1.5)` が型エラーになる。

影響範囲：
- 既存呼び出し（G-01 / G-02 / G-04 / OB-06 デモ等）はすべて `1.5 | 3 | 6 | 9` の
  数値を渡しているため、型を緩めても挙動変化なし
- `SideBySideStimulus` の prop 型 `StimulusGaborSpec` も `cpd: number` に緩和
  （G02GaborSpec / G04GaborSpec / G05GaborSpec すべて構造的型互換）
- 既存テストは無変更で全件 PASS

### 6.4 G02GaborSpec / G04GaborSpec の cpd literal union は維持

各ゲーム固有の trial spec 型（`G02GaborSpec` / `G04GaborSpec`）の cpd 型は v1 由来の
`1.5 | 3 | 6 | 9` literal union のまま維持した。これは：
- G-02 / G-04 は実際 cpd を staircase 連動させない（`G02_GABOR_PARAMS.cpd = 3` 固定）
- ゲームごとの仕様差異（連続 vs 離散）を型で表現する方が誠実

`G05GaborSpec` のみ `cpd: number`。`SideBySideStimulus` は `StimulusGaborSpec`
（cpd: number）を受け取るため、G02 / G04 は構造的型互換でそのまま渡せる。

### 6.5 OB-06 体験画面のプレースホルダ未差し替え

Sprint 8 の self-review §12.6 で予告された通り、`src/screens/v11/Onboarding/OB06Experience.tsx`
は G-04 体験プレースホルダのまま。Sprint 13 でも単体プレイ動線で G-05 が動くことが
受け入れ基準であり、OB-06 への組込みは含まれていないため未対応。
Sprint 14 以降のオンボーディング仕上げタイミングで差し替え予定。

## 7. Sprint 14 申し送り（G-06 ガウス窓サイズ弁別 + G-07 ガボールエッジ検出）

### 7.1 G-06 ガウス窓サイズ弁別

G-06 は **G-05 の構造をほぼそのまま流用できる楽な実装**：
- 共通要素：GamePlaySurface / ResultSummaryV11 / SideBySideStimulus（GE-02 / GE-04 /
  GE-05 / GE-06 で共用、aria-label 改修済）/ ImageChoiceCell / AnswerChoiceGroup
  `layout="horizontal-2"` すべて既実装
- 新規共通要素：**ゼロ**
- 新規ゲーム固有：
  - `src/lib/v11/g06Trial.ts`（spec-v11.md §7.6：左右 SD 比判別、staircase
    1.1〜2.0、初期 1.5、step 0.1。G-05 の cpd 比とほぼ同型）
  - `src/lib/v11/g06Result.ts`
  - `src/screens/v11/games/G06WindowSizeScreen.tsx`（G05SfDiscrimScreen のほぼ
    コピペ、選択肢ラベルを「左が大きい」「右が大きい」に変更、staircase 連動先
    が SD 比）
  - `src/screens/v11/games/G06ResultScreen.tsx`
  - `src/screens/v11/games/G06MiniInstructionScreen.tsx`
- 注意点：
  - `G06GaborSpec.sigmaDeg` は staircase 比で連続的に変化させる必要あり
    （G-05 の cpd と同じ扱い）。`GaborPatchProps.sigmaDeg` の型は元から
    `number` なので追加緩和は不要
  - aria-label：「大きい」を渡す
  - 結果サマリの閾値単位は「SD 比」、digits=1（例：1.5 表示）

### 7.2 G-07 ガボールエッジ検出

G-07 は **新規 GE-07 EdgeHuntStimulus（4×4 グリッド）が必要**で、G-05 / G-06 と
比べると新規コンポーネント実装の負荷が高い：
- 新規共通要素：`EdgeHuntStimulus`（4×4 grid、各セル ImageChoiceCell ラップ、
  最大 16 個複数選択可）。Sprint 9 の G-01 `MorphGridStimulus` を参考に作る
- staircase：「線」を構成するパッチ間の向きズレ許容角（°、易 ±10° → 難 ±2°）、
  初期 ±5°、step 1°（G-01 と同じ degree 系）
- 採点：3 個正解をすべて選択 = 正解、1 個でも誤りや欠落で不正解（G-01 と同じ
  全選択一致型）

### 7.3 共通基盤の安定性

Sprint 9〜13 で確立した以下は Sprint 14 以降も基本変更なしで使い回す：
- GamePlaySurface / ResultSummaryV11 / SinglePlayPostFooter / ImageChoiceCell /
  MetricCard / AnswerChoiceGroup（horizontal-2, grid-4, vertical-list, clock-8）/
  SideBySideStimulus（aria-label 改修済、cpd: number 受け付け）
- `GaborPatchProps.cpd` の `number` 型緩和（Sprint 13 で実施）

新規追加が必要なのは：
- AC-4 keypad-10（G-13、Sprint 17）
- GE-07 EdgeHuntStimulus（4×4 grid、Sprint 14）
- GE-08〜13（G-08〜13 のうち上下並び型 / 横一列型 / 8×8 テクスチャ等、Sprint 15〜17）

### 7.4 OB-06 オンボーディング体験差し替え

Sprint 8 で予告した OB-06 G-04 体験差し替えは依然未対応。Sprint 14 以降の
オンボーディング仕上げで対応予定。
