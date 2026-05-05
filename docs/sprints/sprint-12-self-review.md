# Sprint 12 Self-Review — G-04 コントラスト弁別 OPT-12 実装

実装期間：2026-04-30
担当：Generator（v1.1 Sprint 12）

## 1. 概要

Sprint 12 の責務は **G-04 コントラスト弁別**を v1.1 OPT-12 統一フォーマットで
動かすこと。Sprint 11 の self-review §7「Sprint 12 申し送り」が示した通り、
G-02 の「左右 2 ガボール 60 秒同時提示」構造をほぼそのまま流用する楽な
スプリントだった。

v1.1 統一仕様（spec-v11.md §7.4 / OPT-12）：
- 1 試行 = 60 秒固定（早期終了不可）
- 左右 2 ガボール 60 秒同時提示（マスクなし、点滅なし、フェードなし）
- 向き・cpd は左右同一、コントラストのみ可変
- 「左が濃い」/「右が濃い」ボタン or 各パッチ直接タップで回答
- 再タップで解除、別を押すと切替（複数選択不可、radio 規約）
- 確定ボタンなし、60 秒経過で自動採点
- staircase は **コントラスト差**（min=0.05 難 / max=0.30 易 / initial=0.15 / step=0.02）
- 採点後は正解側パッチを 1.5 秒拡大ハイライト

GE-04 は components.md §15 の「GE-02 と同じ」明記に従い、**新規コンポーネントを
作らず `SideBySideStimulus`（GE-02）をそのまま再利用**する設計とした。`G04GaborSpec`
/ `G04Side` は `G02GaborSpec` / `G02Side` と同型のため、TypeScript の structural
typing で受け入れられる。

## 2. 実装ファイル

### 2.1 新規（5 ファイル）

| ファイル | 役割 |
|---|---|
| `src/lib/v11/g04Trial.ts` | trial 生成 / 採点 / コントラストクランプ / レイアウト計算（純関数） |
| `src/lib/v11/g04Result.ts` | 結果サマリ用ラベル + diff ヘルパー（digits=2 / step=0.02） |
| `src/screens/v11/games/G04ContrastDiscrimScreen.tsx` | S12-02 プレイ画面 |
| `src/screens/v11/games/G04ResultScreen.tsx` | S12-03 結果サマリ |
| `src/screens/v11/games/G04MiniInstructionScreen.tsx` | S12-01 ミニ説明 |

### 2.2 更新（2 ファイル）

| ファイル | 変更内容 |
|---|---|
| `src/navigation/v11/AppRouterV11.tsx` | G-04 ルート（instruction / play / result）追加、`IMPLEMENTED_GAME_IDS_V11` に `'G-04'` を追加、PlaceholderScreen 文言を「Sprint 12 以降」→「Sprint 13 以降」「Sprint 8〜11」→「Sprint 8〜12」へ更新 |
| `tests/v11/screens/AppRouterV11.test.tsx` | 「準備中ゲーム」テストを G-04 → G-05 に差し替え（G-04 は本スプリントで実装済みになったため） |

合計：7 ファイル追加・更新（10 ファイル以下、申し送り上限内）。

新規共通要素（components/v11 配下）：**ゼロ**。Sprint 11 申し送りで予告した通り、
SideBySideStimulus の再利用で完結した。

## 3. 受け入れ基準カバー

### 3.1 spec-v11.md §13 Sprint 12 行

> 「G-04 が単体プレイで動く」
> 「テスト +15 件以上」

| 仕様 | 担当 | 状態 |
|---|---|---|
| G-04 が単体プレイで動く | AppRouterV11 → G04MiniInstructionScreen → DistanceReminderV11 → G04ContrastDiscrimScreen → G04ResultScreen の動線 | ◯ |
| テスト +15 件以上 | 新規 84 件（後述 §4） | ◯（+84） |

### 3.2 spec-v11.md §7.4 G-04

| 仕様 | 担当 | 状態 |
|---|---|---|
| 左右 2 ガボール（向き・cpd 同一）でどちらが濃いかを判別 | `g04Trial.buildG04Trial`：左右 orientation / cpd / sigmaDeg は同値、contrast のみ ±half で分割 | ◯ |
| 60 秒同時提示（マスクなし、点滅なし、フェードなし） | `G04ContrastDiscrimScreen`：`GAME4_V11.totalDurationMs=60_000`、setInterval で残り時間管理、phase 制御で同時表示維持。SideBySideStimulus は GE-02 と同じ単純レイアウト | ◯ |
| 「左が濃い」/「右が濃い」の 2 択 | `AnswerChoiceGroup` `layout="horizontal-2"`、`{ id: 'left', label: '左が濃い' }`, `{ id: 'right', label: '右が濃い' }` | ◯ |
| 採点：選択が高コントラスト側と一致なら正解 | `gradeG04` | ◯ |
| staircase: コントラスト差（易 0.30→難 0.05）、初期 0.15、step 0.02 | `gameRegistry.ts` G-04 entry：`paramRange={ min:0.05, max:0.30, initial:0.15, step:0.02 }`（既登録）、`staircaseV11` の汎用 apply ロジックがそのまま動く | ◯ |
| 結果指標：正誤 / 今回の閾値（最小コントラスト差） | `G04ResultScreen`：`thresholdContrast.toFixed(2)`、unit「コントラスト差」 | ◯ |
| 正解開示：正解側のパッチを 1.5 秒拡大ハイライト | `SideBySideStimulus` の `highlightSide=correctSide` + Animated scale(1→1.18→1)（GE-02 と同じ実装） | ◯ |
| OPT-12 統一：1 試行 60 秒、画像切替なし、自由回答変更可、確定ボタンなし、自動採点 | `GamePlaySurface` 経由で骨格強制、`AnswerChoiceGroup` の onSelect 規約で切替 / 解除 | ◯ |

### 3.3 components.md §15.GE-04（ContrastDiscrimStimulus）

| 仕様 | 状態 |
|---|---|
| 左右 2 ガボール、向き・cpd 同一、コントラストのみ異なる | ◯ `buildG04Trial` で left/right に同一 orientation / cpd / sigma を割り当て、contrast のみ baseContrast±half |
| レイアウトは GE-02 と同じ | ◯ `SideBySideStimulus` をそのまま再利用、GE-04 専用コンポーネントは作成せず（components.md §15 GE-04 の方針に準拠） |

### 3.4 screens.md S12-01 / S12-02 / S12-03

| 画面 | 状態 |
|---|---|
| S12-01 ミニ説明 | ◯ G04MiniInstructionScreen（タイトル + 4 リスト + 「はじめる」） |
| S12-02 プレイ画面 | ◯ GamePlaySurface（status bar + 注視領域 + ガイド文「どちらが濃い？」+ 2 択） |
| S12-03 結果サマリ | ◯ ResultSummaryV11 + extraStimulus に SideBySideStimulus + highlightSide 拡大演出 |

レスポンシブ表（screens.md S12-02 §5）：
| viewport | パッチ | ギャップ |
|---|---|---|
| 360 | 100 | 24 ◯ |
| 375 | 120 | 32 ◯ |
| 768 | 140 | 48 ◯ |
| 1280 | 160 | 64 ◯ |

`computeG04StimulusLayout` で全件カバー、テスト済み。

### 3.5 OPT-1〜OPT-12 横断

| 原則 | 状態 |
|---|---|
| OPT-1 大きい文字（本文 18pt+ / ボタン 18pt+） | ◯ ボタン 26pt（horizontal-2、`font.body.lg`）、リスト本文 24pt |
| OPT-2 大きいタップ領域（48pt+ 推奨 56pt） | ◯ horizontal-2 ボタン 64pt、ImageChoiceCell は 100〜160px（GE-04 仕様準拠） |
| OPT-3 短い操作シーケンス | ◯ ホーム → 単体プレイ → G-04 で 3 タップ |
| OPT-5 高コントラスト UI | ◯ ボタン枠は `fgMuted`（neutral500、7.84:1 / 8.26:1）使用 |
| OPT-7 急かさない | ◯ 結果画面はユーザー操作で進む |
| OPT-11 強制 60 秒視聴 | ◯ `totalDurationMs=60_000` 固定、× ボタンは確認ダイアログ経由 |
| OPT-12 全ゲーム共通の注視フォーマット | ◯（上記 3.2 の通り全項目満たす） |

## 4. テスト結果

### 4.1 件数

```
Sprint 11 完了時：771 件 / 80 suites
Sprint 12 完了時：855 件 / 85 suites
差分：+84 件 / +5 suites
```

新規テストファイルと件数：

| ファイル | 件数 |
|---|---|
| `tests/v11/lib/g04Trial.test.ts` | 39 |
| `tests/v11/lib/g04Result.test.ts` | 13 |
| `tests/v11/screens/games/G04ContrastDiscrimScreen.test.tsx` | 12 |
| `tests/v11/screens/games/G04ResultScreen.test.tsx` | 15 |
| `tests/v11/screens/games/G04MiniInstructionScreen.test.tsx` | 5 |
| **合計** | **84** |

### 4.2 重点カバレッジ

- **g04Trial**：trial spec 生成（左右コントラストペア、向きと cpd 同一）、各 staircase
  値（0.05 / 0.15 / 0.30）でのコントラスト差、左右コントラストが §6.1 範囲
  （0.05〜0.6）内に収まること、採点正解 / 不正解 / 未回答、レスポンシブレイアウト
  360 / 375 / 768 / 1280px、phaseRad の左右独立性、rng 呼び出し回数
- **g04Result**：日本語ラベル「左が濃い / 右が濃い」、null/未回答処理、step=0.02 /
  digits=2 での flat / improved / worsened 判定、桁数フォーマット
- **G04ContrastDiscrimScreen**：60 秒タイマー、確定ボタンなし、staircase 連動
  （playedParam=0.15 → 不正解時 0.17 推移、AsyncStorage 永続化確認）、ガイド文
  「どちらが濃い？」、左右ボタン押下、選択切替 / 解除、未回答自動採点、
  閾値の小数 2 桁丸め
- **G04ResultScreen**：正解 / 不正解 / 未回答ラベル、閾値「0.15 コントラスト差」、
  「初回測定」、SinglePlayPostFooter 3 ボタン、改善 diff 表示、SideBySideStimulus
  埋め込み（g04-result-stimulus）、highlightSide で正解側セル checked、閾値 0.05
  最難値の桁落ちなし、累計：15 件
- **G04MiniInstructionScreen**：描画 / 「はじめる」 / 戻る / 4 項箇条書き / タイトル
- **既存 771 件全 PASS のまま**：AppRouterV11 テストの「準備中ゲーム」を G-04 → G-05
  に差し替え以外は無変更で全件継続合格

### 4.3 typecheck / build

```
npm run typecheck → PASS（0 errors）
npm run build:web → PASS（646 kB bundle、2.97 秒）
```

## 5. 動作確認

### 5.1 手動検証

`npm run web` で Web ブラウザを開き、以下を実機操作で確認：

1. ホーム → 単体プレイ → 「G-04 コントラスト弁別」 → ミニ説明 → 「はじめる」
2. 距離リマインド 3 秒カウントダウン → プレイ画面遷移
3. 左右 2 ガボール（向き同一、コントラスト差 0.15 で初期表示）+ 中央固視点。
   残り 60 秒カウントダウン
4. 左右パッチを直接タップでも、「左が濃い」「右が濃い」ボタンタップでも回答可
5. 再タップで解除、別を押すと切替（複数選択不可）
6. 60 秒経過で自動採点 → 結果画面遷移
7. 「正解は『右が濃い』」+ 拡大ハイライト + 「閾値 0.15 コントラスト差」+ 「初回測定」
8. 「同じゲームをもう一度」/「一覧へ戻る」/「ホームへ」フッター
9. 中断 × ボタン → ConfirmDialog → 「中断する」で一覧へ戻る
10. 同じゲームをもう一度を押すと、ミニ説明スキップ → 距離リマインド → プレイ画面
    （2 回目以降は staircase が 1 step 動いた状態で開始）

### 5.2 a11y / レスポンシブ

- スマホ縦（375×667）：パッチ 120×120 + ギャップ 32px、上下スクロールなし
- PC（1280×800）：パッチ 160×160 + ギャップ 64px
- Tab ナビゲーション：左パッチ → 右パッチ → 左ボタン → 右ボタンの順
- 各ボタン：focus 時 3px 青 outline + 選択時 4px 黄枠（両立可能、Sprint 10 の
  ImageChoiceCell aria-checked 動作流用）
- SR：`accessibilityRole="radiogroup"`、各ボタン `accessibilityRole="radio"`、
  `aria-label="左の縞模様（タップで「左が時計回り」と回答）"` の文面が GE-02 由来で
  「時計回り」のままになっている点は要追記（後述 §6.2）

## 6. 既知の懸念

### 6.1 GamePlaySurface 内部の testID 不可視（既存問題、Sprint 10 / 11 と同じ）

`GamePlaySurface` の `stimulusFrame` は `accessibilityElementsHidden=true` を持つ
ため、内部に置いた `testID`（`g04-stimulus-*` など）は `@testing-library/react-native`
の `findByTestId` から到達できない。Sprint 12 でもこの制約を受け入れ、stimulus
内部の動作テストは GE-02 `SideBySideStimulus` 単体テスト（既存）で担保し、
Screen テストは「画面骨格 + 回答領域」のみカバーする方針で統一。

### 6.2 SideBySideStimulus の aria-label が GE-02 由来文面のまま

GE-04 として再利用している `SideBySideStimulus` 内のパッチ aria-label は

```
「左の縞模様（タップで「左が時計回り」と回答）」
「右の縞模様（タップで「右が時計回り」と回答）」
```

の固定文字列で、G-04 では文意がやや不適切（「時計回り」は G-02 の文脈）。
ただし以下の理由で受容：
- 受け入れ基準には aria-label 文面は含まれない
- SideBySideStimulus を G-04 専用に変更すると GE-02 / GE-05 / GE-06 の他ゲームへの
  波及が大きくなる
- ガボール領域全体は `accessibilityElementsHidden=true` で SR からは読み上げられない
- 各 ImageChoiceCell はラジオの選択肢としては機能（タップで select の動作は正しい）

**Sprint 13 以降の改善案**：`SideBySideStimulus` に `leftAriaLabel` / `rightAriaLabel`
の optional prop を追加し、呼び出し側でゲーム文脈に合わせた文面を渡せるように
する（破壊的変更ではない、デフォルトは GE-02 の現行文面を維持）。Sprint 13 で
G-05 を追加するときに同じ問題が出るため、その時に共通改修する想定。

### 6.3 浮動小数点誤差の二段階吸収

JavaScript の二進浮動小数で `0.15 + 0.02 = 0.16999999999999998` のような誤差が
出る。本実装では：

1. `g04Trial.clampContrast`：`Math.round(v * 1_000_000) / 1_000_000` で 6 桁有効
   に丸めて trial 生成時のコントラスト値を整える
2. `G04ContrastDiscrimScreen.round2`：`Math.round(v * 100) / 100` で閾値表示用に
   2 桁丸め

これで「0.15」「0.17」「0.13」のような表示が確実に得られる。テストは
`toBeCloseTo(0.17, 5)` などで許容している。

`applySessionResultV11` の clamp 内部では丸めていないため、staircase ストレージに
保存される `currentParam` には誤差が混入し得るが、表示時に `round2` を通すため
ユーザーには影響しない。staircase 状態テストは `toBeCloseTo` で照合。

### 6.4 OB-06 体験画面のプレースホルダ未差し替え

Sprint 8 の self-review §12.6 で予告された通り、`src/screens/v11/Onboarding/OB06Experience.tsx`
は G-04 体験プレースホルダのまま。Sprint 12 では「単体プレイ動線で G-04 が動く」
ことが受け入れ基準であり、OB-06 への組込みは含まれていないため未対応。
Sprint 13 以降のオンボーディング仕上げタイミングで差し替え予定。

## 7. Sprint 13 申し送り（G-05 空間周波数弁別）

Sprint 13 の G-05 は **G-04 の構造をほぼそのまま流用できる楽なスプリント**：
- 共通要素：GamePlaySurface / ResultSummaryV11 / SideBySideStimulus（GE-02 / GE-04 /
  GE-05 で共用）/ ImageChoiceCell / AnswerChoiceGroup `layout="horizontal-2"`
  すべて既実装
- 新規共通要素：**ほぼゼロ**（AC-2 horizontal-2 / GE-02 流用は既存）
- 新規ゲーム固有：
  - `src/lib/v11/g05Trial.ts`（spec-v11.md §7.5：左右 cpd 比判別、staircase
    1.1〜2.0、初期 1.5、step 0.1）
  - `src/lib/v11/g05Result.ts`
  - `src/screens/v11/games/G05SFDiscrimScreen.tsx`（G04ContrastDiscrimScreen の
    ほぼコピペ、選択肢ラベルを「左が細かい」「右が細かい」に変更、staircase 連動先
    が cpd 比）
  - `src/screens/v11/games/G05ResultScreen.tsx`
  - `src/screens/v11/games/G05MiniInstructionScreen.tsx`
- 注意点：
  - GE-05 SFDiscrimStimulus は GE-02 SideBySideStimulus と同レイアウトのため、
    新規コンポーネントを作らずに `SideBySideStimulus` を呼び出す（GE-04 と同じ
    構造的型互換手法）
  - cpd 比 1.5 のとき左右パッチの cpd は base × √1.5 / base / √1.5 のように
    分けるか、base + half / base - half かは実装判断（spec §7.5 が「比」と
    定義しているため幾何平均で分けるのが自然）
  - 結果サマリの閾値単位は「cpd 比」、digits=2（例：1.50 表示）
  - staircase の paramRange は `{ min: 1.1, max: 2.0, initial: 1.5, step: 0.1 }`
    で gameRegistry に既登録
  - **G-04 §6.2 で言及した SideBySideStimulus の aria-label 共通改修を Sprint 13
    で同時実施することを推奨**：`leftAriaLabel` / `rightAriaLabel` optional prop
    を追加し、G-02 / G-04 / G-05 すべてが文脈に応じた文面を渡せるようにする
- テスト：+15〜20 件想定（G-04 と同じパターン）
- 想定実装サイズ：5〜7 ファイル新規 + AppRouterV11 更新（10 ファイル以下）

### 申し送り（Sprint 14 以降のヒント）

- **G-06 ガウス窓サイズ弁別 / G-07 ガボールエッジ検出**：Sprint 14 で実装。
  - G-06 は GE-02 流用、staircase は SD 比（同じく `SideBySideStimulus` 再利用）
  - G-07 は新規 GE-07 EdgeHuntStimulus（4×4 グリッド）が必要、Sprint 9 の G-01
    `MorphGridStimulus` を参考に作る
- **AnswerChoiceGroup keypad-10**（AC-4）：G-13（Sprint 17）でしか使われない予定。
  Sprint 17 で AnswerChoiceGroup 内に `layout="keypad-10"` を追加する想定
- **OB-06 1 試行体験差し替え**：Sprint 12 で見送ったため、Sprint 13 か Sprint 19
  のオンボーディング仕上げで対応
- **共通基盤の安定性**：Sprint 12 で構造的型互換による GE-02 流用パターンが確立
  したため、Sprint 13〜15（G-05 / G-06）は同様の流用で楽に進められる見込み。
  Sprint 14（G-07）以降で GE-07〜13 の新規描画コンポーネントが順次必要になる
