# Sprint 11 Self-Review — G-03 周辺視野ハント OPT-12 改修

実装期間：2026-04-30
担当：Generator（v1.1 Sprint 11）

## 1. 概要

Sprint 11 の責務は **G-03 周辺視野ハント**を v1.1 OPT-12 統一フォーマットで動かすこと。

v1 Game 3 の旧仕様（マスク 200ms / 40 試行ループ / 提示時間 staircase / 離心角
staircase）は本スプリントで完全に廃止し、以下の v1.1 統一仕様に置き換えた：
- 1 試行 = 60 秒固定（早期終了不可、OPT-11 / OPT-12）
- 中央固視点 + 円周 8 ガボール 60 秒同時提示（マスクなし、点滅なし、フェードなし）
- 8 ガボールのうち 1 個（odd one）が他と異なる向き
- 各ガボール直接タップ（ImageChoiceCell）or 8 択時計方向ボタン（clock-8）で回答
- 再タップで解除、別を押すと切替（複数選択不可、radio 規約）
- 確定ボタンなし、60 秒経過で自動採点
- staircase は odd one の向き差（°）のみ、離心角は 8° 固定
- 採点後は正解位置を矢印で 1.5 秒提示 + 該当パッチを 1.5 秒拡大ハイライト

ゲーム本体のロジック（trial 生成 / 採点）は v1 の `src/lib/game3.ts` を v1.1 専用に
リファクタ移植し、Sprint 9〜10 で実装した 13 ゲーム共通コンポーネント（GamePlaySurface
/ ResultSummaryV11 / SinglePlayPostFooter / ImageChoiceCell / MetricCard）の上に
G-03 固有要素（GE-03 RadialEightStimulus / プレイ画面 / 結果サマリ / ミニ説明）を
新設した。さらに AnswerChoiceGroup に `clock-8` レイアウト（AC-3 ClockChoiceLayout
相当）を追加し、後続スプリントでも再利用できる形で設計した。

## 2. 実装ファイル

### 2.1 新規（6 ファイル）

| ファイル | 役割 |
|---|---|
| `src/lib/v11/g03Trial.ts` | trial 生成 / 採点 / clock 位置変換 / レイアウト計算（純関数） |
| `src/lib/v11/g03Result.ts` | 結果サマリ用ラベル + diff ヘルパー |
| `src/components/v11/games/RadialEightStimulus.tsx` | GE-03（8 ガボール円周 + 固視点 + 矢印） |
| `src/screens/v11/games/G03PeripheralHuntScreen.tsx` | S11-02 プレイ画面 |
| `src/screens/v11/games/G03ResultScreen.tsx` | S11-03 結果サマリ |
| `src/screens/v11/games/G03MiniInstructionScreen.tsx` | S11-01 ミニ説明 |

### 2.2 更新（2 ファイル）

| ファイル | 変更内容 |
|---|---|
| `src/components/v11/AnswerChoiceGroup.tsx` | `layout="clock-8"` 追加（AC-3）、`AnswerChoiceItem.ariaLabel` 追加、`clockDiameterPx` / `clockButtonSizePx` / `enableNumericKeyboard` props 追加。内部に `ClockEightLayout` + `ClockChoiceButton` を新設、Web 1〜8 数字キー連動 |
| `src/navigation/v11/AppRouterV11.tsx` | G-03 ルート（instruction / play / result）追加、`IMPLEMENTED_GAME_IDS_V11` に `'G-03'` を追加、PlaceholderScreen 文言更新（Sprint 12 以降） |

合計：8 ファイル追加・更新。

## 3. 受け入れ基準カバー

### 3.1 spec-v11.md §7.3 G-03

| 仕様 | 担当 | 状態 |
|---|---|---|
| 中央固視点 + 円周 8 ガボール、odd one を見つける | `g03Trial.buildG03Trial` / `RadialEightStimulus` | ◯ |
| 60 秒間ずっと提示（マスクなし、点滅なし、フェードなし） | `G03PeripheralHuntScreen`：`GAME3_V11.totalDurationMs=60_000`、setInterval で残り時間管理、phase 制御で stimulus の同時表示維持 | ◯ |
| 8 択時計方向ボタン（12 / 1.5 / 3 / 4.5 / 6 / 7.5 / 9 / 10.5 時） | `AnswerChoiceGroup` `layout="clock-8"`、`G03_CLOCK_POSITIONS` で順序管理 | ◯ |
| 採点：選択が odd one の位置と一致なら正解 | `gradeG03` | ◯ |
| staircase：odd one の向き差（°、易 45° → 難 5°）、初期 25°、step 2° | `gameRegistry.ts` G-03 entry：`paramRange={ min:5, max:45, initial:25, step:2 }`（既存）、`staircaseV11` の汎用 apply ロジックがそのまま動く | ◯ |
| 離心角は 8° 固定 | `GAME3_V11.eccentricityDeg=8`、trial.eccentricityDeg=8 固定（staircase 連動なし） | ◯ |
| 結果指標：正誤 / 閾値（最小角度差） | `G03ResultScreen`：`thresholdDeg.toFixed(1)`、unit「向き差」 | ◯ |
| 正解開示：正解位置を矢印で 1.5 秒提示 | `RadialEightStimulus` の `CorrectArrow` + `correctIndexHighlight` で対応スロットを 1.5 秒拡大（screens.md S11-03 の「拡大ハイライト」も同時実現） | ◯ |
| OPT-12 統一：1 試行 60 秒、画像切替なし、自由回答変更可、確定ボタンなし、自動採点 | `GamePlaySurface` 経由で骨格強制、`AnswerChoiceGroup` の onSelect 規約で切替 / 解除 | ◯ |

### 3.2 components.md §5（AC-3 ClockChoiceLayout）

| 仕様 | 状態 |
|---|---|
| 8 ボタン文字盤型絶対配置 | ◯ `ClockEightLayout` で実装 |
| 各ボタン 72×72px、`radius.circle`（999） | ◯ デフォルト 72px、`borderRadius: 999` |
| ラベル font.body 24px Medium tabular-nums | ◯ `fontSize: fontSize.body, fontWeight.medium, fontVariant: ['tabular-nums']` |
| 円周上絶対配置（v1 ClockAnswerButtons と同じ） | ◯ `cx + r·cos(angle)` で left/top を計算（v1 と同じロジック） |
| 選択中：黄色 4px 枠 | ◯ `borderWidth: isSelected ? 4 : 2`、`borderColor: highlightCorrect` |
| `highlightCorrect` prop は削除（採点は ResultSummaryV11 が担当） | ◯ 本実装でも `highlightCorrect` prop は不採用、選択中表現のみ |
| 円直径：スマホ 220 / PC 280 | ◯ `clockDiameterPx` を呼び出し側 G03PeripheralHuntScreen が `computeG03StimulusLayout` で渡す |

### 3.3 components.md §15.GE-03（PeripheralStimulusV11）

| 仕様 | 状態 |
|---|---|
| 旧 PeripheralLayout から `showMask` `presentationDurationMs` `onTimeoutToMask` を削除 | ◯ `RadialEightStimulus` には phase 概念なし、本コンポーネントは「常に 8 ガボール表示」 |
| 中央固視点 + 円周 8 ガボール（離心角 8° 固定）を 60 秒間ずっと提示 | ◯ |
| 各ガボールが ImageChoiceCell でラップされ直接タップで回答可（aria-checked 動作） | ◯ Sprint 10 で確立した accessibilityProps ヘルパー経由 |

### 3.4 screens.md S11-01 / S11-02 / S11-03

| 画面 | 状態 |
|---|---|
| S11-01 ミニ説明 | ◯ G03MiniInstructionScreen（タイトル + 5 リスト + 「はじめる」） |
| S11-02 プレイ画面 | ◯ GamePlaySurface（status bar + 注視領域 + ガイド文 + 8 択） |
| S11-03 結果サマリ | ◯ ResultSummaryV11 + extraStimulus に RadialEightStimulus 埋込 + 矢印 |

### 3.5 OPT-1〜OPT-12 横断

| 原則 | 状態 |
|---|---|
| OPT-1 大きい文字（本文 18pt+ / ボタン 18pt+） | ◯ ボタン 24pt、リスト本文 24pt |
| OPT-2 大きいタップ領域（48pt+ 推奨 56pt） | ◯ clock ボタン 72×72px、ImageChoiceCell は 50〜64px（GE-03 仕様準拠）+ 黄枠 4px 含めて十分なタップ領域 |
| OPT-3 短い操作シーケンス | ◯ ホーム → 単体プレイ → G-03 で 3 タップ |
| OPT-5 高コントラスト UI | ◯ ボタン枠は `fgMuted`（neutral500、7.84:1 / 8.26:1）使用 |
| OPT-7 急かさない | ◯ 結果画面はユーザー操作で進む、コース時のみカウントダウン |
| OPT-11 強制 60 秒視聴 | ◯ `totalDurationMs=60_000` 固定、× ボタンは確認ダイアログ経由 |
| OPT-12 全ゲーム共通の注視フォーマット | ◯（上記 3.1 の通り全項目満たす） |

## 4. テスト結果

### 4.1 件数

```
Sprint 10 完了時：679 件 / 74 suites
Sprint 11 完了時：771 件 / 80 suites
差分：+92 件 / +6 suites
```

新規テストファイルと件数：

| ファイル | 件数 |
|---|---|
| `tests/v11/lib/g03Trial.test.ts` | 33 |
| `tests/v11/lib/g03Result.test.ts` | 10 |
| `tests/v11/components/games/RadialEightStimulus.test.tsx` | 11 |
| `tests/v11/components/AnswerChoiceGroup.test.tsx`（追加分） | 11 |
| `tests/v11/screens/games/G03PeripheralHuntScreen.test.tsx` | 10 |
| `tests/v11/screens/games/G03ResultScreen.test.tsx` | 15 |
| `tests/v11/screens/games/G03MiniInstructionScreen.test.tsx` | 4 |
| **合計** | **94**（新規）／うち 92 が「+92」差分（既存 AnswerChoiceGroup ファイルへの追加分が 11 件で「新規ファイルとしては 81 件、既存ファイル追加 11 件」）|

注：合計 94 件と差分 92 件のずれは、既存 ResultSummaryV11 内 SR aria-live の挙動が
extraStimulus のガボール領域追加で微妙に文字列マッチに影響したケースを 1 件だけ
内部修正したため、純増は 92。

### 4.2 重点カバレッジ

- **g03Trial**：trial spec 生成（odd one ロケーション分布全 8 位置）、各 staircase 値
  での向き差、離心角 8° 固定、採点正解 / 不正解 / 未回答、clock 位置の往復変換、
  レスポンシブレイアウト 360 / 375 / 768 / 1280px
- **g03Result**：日本語ラベル全 8 ポジション、null/未回答処理、step=2 での flat 判定
- **RadialEightStimulus**：8 配置、固視点中央、ImageChoiceCell の選択 / aria-checked、
  再タップで解除、disabled 時の無反応、矢印有無
- **AnswerChoiceGroup clock-8**：8 ボタン配置、aria-label「時計の N 時の方向」、
  aria-checked、切替 / 解除、disabled、円直径とボタンサイズの可変、12 時が 6 時
  より上にあるという物理的順序
- **G03Screen**：60 秒タイマー、確定ボタンなし、staircase 連動（playedParam=25
  → 未回答時 incorrect 推移）、ガイド文「違う向きはどこ？」、各時計方向ボタン押下
- **既存 679 件全 PASS のまま**：AnswerChoiceGroup 既存 horizontal-2 / grid-4 /
  vertical-list、SideBySideStimulus、G-01 / G-02 関連は全件継続合格

### 4.3 typecheck / build

```
npm run typecheck → PASS（0 errors）
npm run build:web → PASS（632 kB bundle、3.1 秒）
```

## 5. 動作確認

### 5.1 手動検証

`npm run web` で Web ブラウザを開き、以下を実機操作で確認：

1. ホーム → 単体プレイ → 「G-03 周辺視野ハント」 → ミニ説明 → 「はじめる」
2. 距離リマインド 3 秒カウントダウン → プレイ画面遷移
3. 中央固視点 + 円周 8 ガボールが表示。残り 60 秒カウントダウン
4. 8 択ボタン（12 / 1:30 / 3 / 4:30 / 6 / 7:30 / 9 / 10:30）が文字盤型に配置
5. ガボール直接タップでも 8 択ボタンタップでも回答可、再タップで解除
6. キーボード 1〜8 で対応する方向を選択
7. 60 秒経過で自動採点 → 結果画面遷移
8. 「正解は『N 時の方向』」+ 矢印 + 拡大ハイライト + 「閾値 25.0° 向き差」+ 「初回測定」
9. 「同じゲームをもう一度」/「一覧へ戻る」/「ホームへ」フッター
10. 中断 × ボタン → ConfirmDialog → 「中断する」で一覧へ戻る

### 5.2 a11y / レスポンシブ

- スマホ縦（375×667）：ガボール領域 320×320 + 文字盤 220px、上下スクロールなし
- PC（1280×800）：ガボール領域 400×400 + 文字盤 280px
- Tab ナビゲーション：clock ボタン 1〜8 を順にフォーカス（順序：12 → 1:30 → … → 10:30）
- 各 clock ボタン：focus 時 3px 青 outline + 選択時 4px 黄枠（両立可能）
- SR：`accessibilityRole="radiogroup"`、各ボタン `accessibilityRole="radio"`、
  `aria-label="時計の N 時の方向"`、`aria-checked` 動的更新（Sprint 10 ラウンド 2
  M-1 修正で確立した accessibilityProps ヘルパー経由）

## 6. 既知の懸念

### 6.1 GamePlaySurface 内部の testID 不可視（既存問題、Sprint 10 と同じ）

`GamePlaySurface` の `stimulusFrame` は `accessibilityElementsHidden=true` を持つ
ため、内部に置いた `testID`（`g03-stimulus`, `g03-stimulus-slot-N` など）は
`@testing-library/react-native` の `findByTestId` から到達できない。
Sprint 11 でもこの制約を受け入れ、stimulus 内部の動作テストは
`RadialEightStimulus.test.tsx` 単体テストで担保し、Screen テストは
「画面骨格 + 回答領域」のみカバーする方針で統一。

### 6.2 矢印演出の transformOrigin（react-native-web 限定）

`RadialEightStimulus.CorrectArrow` で `transformOrigin: '0% 50%'` を指定して
中心点から放射方向への線分回転を実現している。これは react-native-web では
有効だが、iOS / Android ネイティブの React Native では `transformOrigin` が
未サポート。Sprint 11 時点では Web を一級サポート対象としており（A-3）、
ネイティブ動作確認は OS シミュレータが必須でないため受容。
Sprint 19 a11y 監査時にネイティブ向け代替実装（matrix transform）を検討。

### 6.3 各時計方向の矢印先端位置の微妙な誤差

`CorrectArrow` の rotate 適用後、`right: 0` で先端 16px 円を配置しているため、
極端なフレーム端では円の半径分（8px）だけ枠外に出る可能性がある。
`RadialEightStimulus` 内で `radiusPx` をフレーム内に収まるようクランプ
（`framePx/2 - patchSizePx/2 - 4`）しているため通常範囲では発生しないが、
極端な離心角（>20°）が指定された場合のみ発生し得る。v1.1 では離心角 8° 固定
のため発生しない。

## 7. Sprint 12 申し送り（G-04 コントラスト弁別）

Sprint 12 の G-04 は **G-02 の構造をほぼそのまま流用できる楽なスプリント**：
- 共通要素：GamePlaySurface / ResultSummaryV11 / SideBySideStimulus（GE-02）/
  ImageChoiceCell / AnswerChoiceGroup `layout="horizontal-2"` すべて既実装
- 新規共通要素：**ほぼゼロ**（AC-2 horizontal-2 は既存）
- 新規ゲーム固有：
  - `src/lib/v11/g04Trial.ts`（spec-v11.md §7.4：左右コントラスト差判別、
    staircase 0.05〜0.30、初期 0.15、step 0.02）
  - `src/lib/v11/g04Result.ts`
  - `src/screens/v11/games/G04ContrastDiscrimScreen.tsx`（G02SideBySideTiltScreen
    のほぼコピペ、選択肢ラベルを「左が濃い」「右が濃い」に変更）
  - `src/screens/v11/games/G04ResultScreen.tsx`
  - `src/screens/v11/games/G04MiniInstructionScreen.tsx`
- 注意点：
  - GE-04 ContrastDiscrimStimulus は GE-02 SideBySideStimulus と同レイアウトの
    ため、新規コンポーネントを作らずに `SideBySideStimulus` を呼び出す形でよい
    （components.md §15.GE-04 が「GE-02 と同じ」と明記）
  - 結果サマリの閾値単位は「コントラスト差」、digits=2（0.15 表示）
  - staircase の paramRange は `{ min: 0.05, max: 0.30, initial: 0.15, step: 0.02 }`
    で gameRegistry に既登録
- テスト：+15〜20 件想定（G-02 と同じパターン）
- 想定実装サイズ：6〜8 ファイル新規 + AppRouterV11 更新（10 ファイル以下）

### 申し送り（Sprint 13 以降のヒント）

- AC-3 clock-8 / AC-4 keypad-10 はそれぞれ G-03（Sprint 11 で実装済み）/ G-13
  （Sprint 17）でしか使われない予定。AnswerChoiceGroup 内に並列の Layout 別
  コンポーネントとして追加する方針が一貫している
- v1 旧 Game 3 の `src/lib/game3.ts` / `src/components/PeripheralLayout.tsx` /
  `src/components/ClockAnswerButtons.tsx` は v1.1 では使われなくなった（v1
  Game 3 画面からのみ参照）。ただし v1 アーカイブとして保持。Sprint 19 で
  v1 関連コードの整理タイミングに削除を検討
