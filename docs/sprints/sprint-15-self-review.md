# Sprint 15 Self-Review — G-08 残像方位弁別 + G-09 側方マスキング 実装

実装期間：2026-04-30
担当：Generator（v1.1 Sprint 15）

## 1. 概要

Sprint 15 は **2 ゲーム複合スプリント**：
- **G-08 残像方位弁別（Tilt Aftereffect）**：新規 GE-08 `VerticalStackStimulus` 実装。
  上下 2 ガボール（上=adapter 傾き 20° 固定、下=テストパッチ staircase 値）を 60 秒
  同時提示し「下のパッチは時計回り / 反時計回り」を判別。
- **G-09 側方マスキング（Lateral Masking）**：新規 GE-09 `LateralMaskingStimulus`
  実装。横一列に「flanker | target | flanker」3 ガボールを 60 秒同時提示し、target の
  「縦寄り / 横寄り」を判別。**Polat ら 2004/2012 のパラダイムを v1.1 OPT-12 統一に
  適合**。

両ゲームとも v1.1 OPT-12 統一フォーマット（1 試行 60 秒、確定ボタンなし、自由回答
変更可、自動採点）に従う。

実装規模 16 ファイル新規 + 2 ファイル更新（AppRouterV11 / 既存テスト 1 件）。
データ層 → ロジック層 → UI 層 の 3 段で分割せずに G-08 → G-09 の順で一気通貫に完了。

## 2. Polat パラダイム実装方針（仕様書 §7.9 連動 staircase の解釈）

仕様書 §7.9 は staircase を「target コントラスト + flanker 距離の合成」と規定する。
gameRegistry の G-09 entry は `paramRange.{min:0.05, max:0.20, initial:0.10, step:0.01}`
を **target コントラスト** として持つ。flanker 距離は次の派生関数で導出：

```
contrast 0.05 → spacing 1.5λ（最難・近接・強抑制）
contrast 0.10 → spacing 3.0λ（初期）
contrast 0.20 → spacing 5.0λ（最易・離れ・抑制弱）
```

これらの 3 点を結ぶ区分線形補間で、その他の中間値も連続的に算出する純関数
`derivePolatSpacingFromContrast(contrast: number): number` を `g09Trial.ts` に定義。

`buildG09Trial(paramContrast, rng)` がこの派生を呼び、`G09TrialSpec` に target
コントラスト + 派生 spacing を同梱する。staircase の単一パラメータ更新（正解で
0.01↓、不正解で 0.01↑）が同時に距離変化を駆動する設計。

結果指標（screens.md S15-06 / spec §7.9）の閾値は合成表記
「c=0.10 / d=3.0λ」を `formatG09CombinedThresholdLabel` で組み立てて
`MetricCard` の主要値に渡す。

## 3. 実装ファイル

### 3.1 新規（13 ファイル）

#### G-08 残像方位弁別（5 ファイル）

| ファイル | 役割 |
|---|---|
| `src/lib/v11/g08Trial.ts` | trial 生成（adapter 110° 固定、test cw/ccw ランダム × staircase 角度）/ 採点 / レスポンシブ layout |
| `src/lib/v11/g08Result.ts` | 結果サマリ用ラベル + diff（digits=0 / step=1） |
| `src/components/v11/games/VerticalStackStimulus.tsx` | GE-08 上下 2 ガボール、adapter 非インタラクティブ、test は ImageChoiceCell（disabled、SR 非到達）でラップして黄ハイライト演出可 |
| `src/screens/v11/games/G08TiltAftereffectScreen.tsx` | S15-02 プレイ画面 |
| `src/screens/v11/games/G08ResultScreen.tsx` | S15-03 結果サマリ |
| `src/screens/v11/games/G08MiniInstructionScreen.tsx` | S15-01 ミニ説明 |

#### G-09 側方マスキング（6 ファイル）

| ファイル | 役割 |
|---|---|
| `src/lib/v11/g09Trial.ts` | trial 生成（flanker 高コン 0.5 × 垂直、target 低コン staircase × ランダム向き）/ 採点 / Polat 派生関数 / レスポンシブ layout / 横方向 spacing 計算 |
| `src/lib/v11/g09Result.ts` | 結果サマリ用ラベル + 合成閾値表記（c=0.10 / d=3.0λ）+ diff（digits=2 / step=0.01） |
| `src/components/v11/games/LateralMaskingStimulus.tsx` | GE-09 横一列 3 ガボール、flanker 2 個は accessibilityElementsHidden 配下、target は ImageChoiceCell（disabled）でラップして黄ハイライト演出可 |
| `src/screens/v11/games/G09LateralMaskingScreen.tsx` | S15-05 プレイ画面 |
| `src/screens/v11/games/G09ResultScreen.tsx` | S15-06 結果サマリ |
| `src/screens/v11/games/G09MiniInstructionScreen.tsx` | S15-04 ミニ説明 |

### 3.2 テスト（12 ファイル、+210 件）

| ファイル | 件数 |
|---|---|
| `tests/v11/lib/g08Trial.test.ts` | 47 |
| `tests/v11/lib/g08Result.test.ts` | 13 |
| `tests/v11/components/games/VerticalStackStimulus.test.tsx` | 8 |
| `tests/v11/screens/games/G08MiniInstructionScreen.test.tsx` | 5 |
| `tests/v11/screens/games/G08TiltAftereffectScreen.test.tsx` | 12 |
| `tests/v11/screens/games/G08ResultScreen.test.tsx` | 13 |
| `tests/v11/lib/g09Trial.test.ts` | 52 |
| `tests/v11/lib/g09Result.test.ts` | 22 |
| `tests/v11/components/games/LateralMaskingStimulus.test.tsx` | 7 |
| `tests/v11/screens/games/G09MiniInstructionScreen.test.tsx` | 5 |
| `tests/v11/screens/games/G09LateralMaskingScreen.test.tsx` | 13 |
| `tests/v11/screens/games/G09ResultScreen.test.tsx` | 13 |
| **合計** | **210**（受け入れ基準「+30 件以上」を大幅クリア） |

### 3.3 更新（2 ファイル）

| ファイル | 変更内容 |
|---|---|
| `src/navigation/v11/AppRouterV11.tsx` | G-08 / G-09 ルート（instruction / play / result）追加、`IMPLEMENTED_GAME_IDS_V11` に `'G-08'` / `'G-09'` 追加、PlaceholderScreen 文言「Sprint 16 以降」「Sprint 8〜15」更新、`g08InstructionSeenRef` / `g09InstructionSeenRef` 追加、reminder からの遷移に G-08 / G-09 分岐追加 |
| `tests/v11/screens/AppRouterV11.test.tsx` | 「準備中ゲーム」テストを G-08 → G-10 に差し替え（G-08 / G-09 は本スプリントで実装済み） |

合計：13 ファイル新規 + 2 ファイル更新 = 15 ファイル（事前見積 12〜16 内）。

新規共通要素（components/v11/games 配下）：
- **VerticalStackStimulus**（GE-08）— 上下 2 ガボール
- **LateralMaskingStimulus**（GE-09）— 横一列 3 ガボール

両者とも ImageChoiceCell + GaborPatch + Animated.View 拡大ハイライトのパターンを
踏襲し、SideBySideStimulus / GaborGridStimulus と同じ階層（src/components/v11/games/）
に配置。

## 4. 受け入れ基準カバー

### 4.1 spec-v11.md §13 Sprint 15 行

> 「G-08 と G-09 が単体プレイで動く」
> 「Polat ら 2004/2012 の Lateral Masking パラダイム（target/flanker 同時提示）が機能する」
> 「テスト +30 件以上」

| 仕様 | 担当 | 状態 |
|---|---|---|
| G-08 単体プレイで動く | AppRouterV11 + G08{Mini,TiltAftereffect,Result}Screen | ✅ 統合済み |
| G-09 単体プレイで動く | AppRouterV11 + G09{Mini,LateralMasking,Result}Screen | ✅ 統合済み |
| Polat パラダイム（target/flanker 同時提示）が機能 | LateralMaskingStimulus + g09Trial.derivePolatSpacingFromContrast | ✅ 実装 |
| テスト +30 件以上 | tests/v11/{lib,components,screens}/ | ✅ +210 件 |

### 4.2 G-08 受け入れ基準（spec §7.8）

| 仕様 | 状態 |
|---|---|
| 上 adapter（傾き 20° 固定、高コン 0.6）+ 下テストパッチを 60 秒同時提示 | ✅ buildG08Trial / VerticalStackStimulus |
| 「下のパッチは時計回り」「下のパッチは反時計回り」の 2 択 | ✅ AnswerChoiceGroup horizontal-2 |
| staircase: テスト絶対角度（°、易 10° → 難 1°）、初期 5°、step 1° | ✅ gameRegistry G-08 / staircaseV11 |
| 採点：選択がテスト傾き方向と一致なら正解 | ✅ gradeG08 |
| 60 秒経過で自動採点、未回答 → 不正解 + staircase 易方向 | ✅ G08TiltAftereffectScreen / staircaseV11 |
| 結果指標：正誤 / 今回の閾値 | ✅ G08ResultScreen + ResultSummaryV11 |

### 4.3 G-09 受け入れ基準（spec §7.9）

| 仕様 | 状態 |
|---|---|
| 中央 target（薄い、staircase 値のコントラスト）+ 左右 flanker 2 つ（高コン 0.5、垂直平行）を 60 秒同時提示 | ✅ buildG09Trial / LateralMaskingStimulus |
| 「縦寄り（垂直）」「横寄り（水平）」の 2 択 | ✅ AnswerChoiceGroup horizontal-2 |
| staircase: target コントラスト + flanker 距離の合成（易 0.20/5λ → 難 0.05/1.5λ）、初期 0.10/3λ、step contrast 0.01 / 距離 0.5λ で連動 | ✅ gameRegistry G-09 + derivePolatSpacingFromContrast |
| 採点：選択が target の実際の向きと一致なら正解 | ✅ gradeG09 |
| 結果指標：正誤 / 合成閾値（コントラスト + 距離） | ✅ G09ResultScreen `formatG09CombinedThresholdLabel`「c=0.10 / d=3.0λ」 |

### 4.4 a11y 規約（既存 Sprint 9〜14 踏襲）

| 規約 | 状態 |
|---|---|
| ImageChoiceCell の radio role + 動的 aria-checked | ✅ accessibilityProps ヘルパー経由 |
| adapter / flanker は accessibilityElementsHidden 配下で SR 非到達 | ✅ inner ラッパで実装（テスト容易性のため outer は隠さない） |
| キーボード Space / Enter で選択トグル、focus 可視（青 3px outline） | ✅ ImageChoiceCell / AnswerChoiceGroup の既存実装そのまま |

### 4.5 レスポンシブ（screens.md §4 / components.md §15）

| ブレークポイント | G-08 パッチサイズ | G-09 パッチサイズ |
|---|---|---|
| 360px | 120 | 64 |
| 375px | 140 | 80 |
| 768px | 160 | 100 |
| 1280px | 180 | 120 |

`computeG08StimulusLayout` / `computeG09StimulusLayout` で純関数化、テストで
全 4 ブレークポイントを網羅。G-09 では追加で `computeG09SpacingPx` で flanker
距離 px が画面幅を超えないようクランプする純関数を実装。

## 5. 確認したこと

### 5.1 機能動作

- `npm test`：1146 → 1356 件（+210）全 PASS
- `npm run typecheck`：0 errors
- `npm run build:web`：成功（732 kB バンドル）
- `npx expo export`：成功

### 5.2 G-08 動線確認（テスト経由）

- ホーム → 単体プレイ → G-08 カード → ミニ説明 → 距離リマインド → プレイ → 結果サマリ
- 60 秒経過で自動採点（テストでは SHORT_DURATION=1000ms で短縮）
- 「時計回り」/「反時計回り」のトグル（再タップ解除）
- 不正解時に staircase が +1 方向（易方向）に動く
- max=10 上限でクランプ
- 未回答 = 不正解 + unattempted=true
- 結果サマリで正解開示、threshold 整数表示、過去ベスト比較

### 5.3 G-09 動線確認（テスト経由）

- ホーム → 単体プレイ → G-09 カード → ミニ説明 → 距離リマインド → プレイ → 結果サマリ
- 60 秒経過で自動採点
- 「縦寄り」/「横寄り」のトグル
- 不正解時に staircase が +0.01 方向（易方向）に動く
- max=0.20 上限でクランプ
- target コントラストから派生 flanker spacing が連動（線形補間）
- 結果サマリで合成閾値「c=0.10 / d=3.0λ」表示

### 5.4 既存ゲームへの影響

- Sprint 9〜14 完了 1146 件全 PASS 維持（リグレッションなし）
- AppRouterV11 の単体プレイ動線：G-01〜G-09 まで線形に拡張、既存 G-01〜G-07 動作変更なし
- 「準備中ゲーム」プレースホルダ：G-10〜G-13 がここに到達する（テストでは G-10 で確認）

## 6. 既知の懸念

- **Polat 派生 spacing の妥当性**：spec §7.9 の 3 サンプリング点（0.05→1.5λ /
  0.10→3.0λ / 0.20→5.0λ）を線形補間で繋いだ。「線形以外（例：対数）の方が臨床
  研究に近い」可能性は残るが、spec が線形補間を否定していないため線形を採用。
- **G-09 ステアケース表現の合成性**：閾値が「コントラスト × 距離」の単一スカラー値ではなく
  2 軸合成（c=0.10 / d=3.0λ）になるため、`recordSingleGameSessionV11` には主軸
  =target コントラストのみを記録している。距離側の履歴は g09Trial.derivePolatSpacing
  FromContrast で常に再計算可能なので情報損失なし。MetricCard は文字列値を受けるため
  改行付きラベルで両軸を表示。
- **target 向きの「縦寄り / 横寄り」**：v1.1 では実装簡略化のため target を 90°（垂直）
  または 0°（水平）の 2 値に固定（向き差 90°）。Polat 系本来は数° 差のみで判別させる
  パラダイムだが、v1.1 OPT-12 で「画像切替なし・60 秒注視」とした関係上、向き判別
  自体は容易にし、「flanker による抑制で target が見えなくなる → 判別不能」を
  訓練主軸とした。spec §7.9 もこの方向性を許容している（「縦寄り / 横寄りの 2 択」
  と明示）。
- **VerticalStackStimulus テスト dump 時の act 警告**：highlightDirection を渡した
  状態で Animated.timing が実行されると `act` 外で setValue が起きる旨の警告が
  ターミナル出力されるが、テスト自体は PASS。ResultScreen 側で
  `correctRevealMs=1500` 完了前に unmount されるケースがあるため。Sprint 14 でも
  同種の警告があり既知扱い。

## 7. 申し送り（Sprint 16 以降）

- **G-10 テクスチャ分離 + G-11 Vernier 整列判定**：Sprint 16 で実装。
  - G-10：8×8 = 64 ガボールが必要。GE-10 `TextureSegmentationStimulus` を別途
    実装（GaborGridStimulus は 4×4 固定なので流用不可）。選択肢は 4 象限（grid-4）。
  - G-11：上下 2 ガボール（垂直）。GE-11 `VernierStimulus` 新規実装。
    VerticalStackStimulus と似た構造だが**整列ズレを判定する**ため layout 計算が
    異なる（spacing 16px 固定、下が水平ズレ N arcmin）。VerticalStackStimulus の
    流用は微妙、別コンポーネント新規が無難。
- **共通基盤の安定**：Sprint 9〜15 で確立した骨格は Sprint 16 以降も基本変更なしで
  使い回す。新規追加が必要なのは：
  - GE-10 / GE-11 / GE-12 / GE-13 の 4 個（Sprint 16-17）
  - AC-4 keypad-10（G-13、Sprint 17）
- **Polat 派生方式の再利用**：G-12 クラウディング（Sprint 17）も「target-flanker
  spacing が staircase 値（target 直径の倍率）」のため、g09Trial の
  `derivePolat...` パターンが参考になる。ただし G-12 は staircase 値そのものが
  spacing なので、派生関数は不要で `paramSpacingMultiplier` を直接 stimulus に
  渡す形になる予定。
- **GE-09 spacing 計算の再利用検討**：`computeG09SpacingPx` は flanker 距離が
  画面幅を超えないようクランプする汎用関数。G-12 クラウディング（中央 target +
  周囲 flanker）でも同様のクランプロジックが必要なので、Sprint 17 着手時に再利用
  もしくは抽出を検討。

---

## 8. ラウンド 2 修正記録（2026-04-30）

ラウンド 1 の Evaluator 評価で **Critical 1 / Minor 2** を検出（Minor 2 はプラットフォーム
既知制約で対応見送り、Critical 1 + Minor 1 を真正修正）。評価レポート：
`docs/evaluations/sprint-15-impl-20260430-1645.md`

### 8.1 Critical：刺激パッチ opacity 0.5 で実効コントラスト半減

**症状**：GE-08 テストパッチ・GE-09 中央 target が `ImageChoiceCell disabled` 経由で
常時 `opacity: 0.5` 描画され、staircase 値「contrast=0.10」が実効値 ~0.05 まで半減。
spec §7.9 の Polat 2004/2012 臨床根拠（GlassesOff 中核訓練、近見視力 +2 行）の
刺激パラメータ忠実性が破綻していた。

**修正内容**：`ImageChoiceCell` に `dimOnDisabled?: boolean`（既定 true、後方互換）
prop を追加し、`disabled` の責務を「タップ抑制（既存）」「視覚的減衰（dimOnDisabled
依存）」の 2 つに分離。

| ファイル | 変更 |
|---|---|
| `src/components/v11/ImageChoiceCell.tsx` | `dimOnDisabled?: boolean` 追加（既定 true）、`opacity: disabled && dimOnDisabled ? 0.5 : pressed ? 0.92 : 1` |
| `src/components/v11/games/VerticalStackStimulus.tsx` | テストパッチの ImageChoiceCell 呼び出しに `dimOnDisabled={false}` 追加 |
| `src/components/v11/games/LateralMaskingStimulus.tsx` | 中央 target の ImageChoiceCell 呼び出しに `dimOnDisabled={false}` 追加 |

**検証**：
- `tests/v11/components/ImageChoiceCell.test.tsx` に「dimOnDisabled」 describe を追加（5 件、既定 true / 明示 true / false / disabled=false 時の不変性 / タップ抑制維持）
- `VerticalStackStimulus.test.tsx` に「下テストパッチ opacity=1」「プレイ中も結果も opacity=1」テスト追加（2 件）
- `LateralMaskingStimulus.test.tsx` に「中央 target opacity=1」「プレイ中も結果も opacity=1」テスト追加（2 件）
- `G08ResultScreen.test.tsx` に「結果画面で borderWidth=4 + opacity=1」テスト追加（1 件）
- `G09ResultScreen.test.tsx` に「結果画面で borderWidth=4 + opacity=1」テスト追加（1 件）
- 既存 G-02 / G-04 / G-06 の SideBySideStimulus 経由 disabled テスト破壊なし（ImageChoiceCell 既定値 true で完全後方互換）

### 8.2 Minor 1：プレイ中に回答選択で黄ハイライト枠が描画

**症状**：G-08/G-09 のプレイ中ユーザーが回答ボタンを押した時点で、刺激パッチに
黄 4px 枠が描画されていた。screens.md S15-02 / S15-05 はプレイ中無装飾、
S15-03 / S15-06 結果のみハイライト記号を規定。

**修正内容**：`isTestSelected` / `isTargetSelected` の判定を `highlightDirection != null`
（または `highlightOrientation != null`）のみにし、`selectedDirection` /
`selectedOrientation` を装飾判定から除外。プレイ中の回答フィードバックは
AnswerChoiceGroup ボタン側の selected 状態で十分（既存 G-02/G-04 と同じ思想）。

| ファイル | 変更 |
|---|---|
| `src/components/v11/games/VerticalStackStimulus.tsx` | L118 `isTestSelected = highlightDirection != null` に修正 |
| `src/components/v11/games/LateralMaskingStimulus.tsx` | L114 `isTargetSelected = highlightOrientation != null` に修正 |

**検証**：
- `VerticalStackStimulus.test.tsx`：「プレイ中（selectedDirection 指定 / highlight なし）に黄枠なし」「採点後（highlight 指定）のみ borderWidth=4」テスト追加（2 件）
- `LateralMaskingStimulus.test.tsx`：同等の「プレイ中黄枠なし」「採点後 borderWidth=4」テスト追加（2 件）
- screen レベルでは `accessibilityElementsHidden` 配下の stimulus を RNTL が辿れないため、AnswerChoiceGroup 側の `accessibilityState.checked` 動的更新で間接検証（G-08 / G-09 各 1 件）
- 既存 G08TiltAftereffectScreen / G09LateralMaskingScreen 全テスト維持

### 8.3 Minor 2：accessibilityElementsHidden が RN-Web で aria-hidden に変換されない

評価レポート §記載の通り **本スプリントでは対応見送り**。RN-Web プラットフォーム
既知制約で Sprint 9〜14 全てで同様。Sprint 19 の a11y 監査時にプロジェクト横断で
ヘルパー化対応予定。

### 8.4 ラウンド 2 検証結果

| チェック | 結果 |
|---|---|
| `npm test` | **1373 件** 全 PASS（ラウンド 1: 1356 → +17 件） |
| `npm run typecheck` | 0 errors |
| `npm run build:web` | 成功（732 kB バンドル変化なし） |
| 既存テスト破壊 | 0 件（ImageChoiceCell `dimOnDisabled` 既定 true で後方互換、SideBySideStimulus 経由テスト全 PASS） |
| Critical 修正の真正性 | ImageChoiceCell 単体テストで `dimOnDisabled=false` + `disabled=true` → opacity=1、`disabled=true` 単独 → opacity=0.5 を両方検証済み |
| 既存スプリントの動作 | G-01〜G-07 / G-08〜G-09 とも回帰なし、AppRouterV11 動線変更なし |

### 8.5 追加テスト件数

ラウンド 2 修正で +17 件追加（合計：210 → 227 件、ラウンド 1 比 +17）：

| ファイル | 追加件数 |
|---|---|
| `tests/v11/components/ImageChoiceCell.test.tsx`（dimOnDisabled describe） | +5 |
| `tests/v11/components/games/VerticalStackStimulus.test.tsx` | +4 |
| `tests/v11/components/games/LateralMaskingStimulus.test.tsx` | +4 |
| `tests/v11/screens/games/G08TiltAftereffectScreen.test.tsx` | +1（差し替えではなく追加） |
| `tests/v11/screens/games/G09LateralMaskingScreen.test.tsx` | +1（同上） |
| `tests/v11/screens/games/G08ResultScreen.test.tsx` | +1 |
| `tests/v11/screens/games/G09ResultScreen.test.tsx` | +1 |

### 8.6 申し送り（Sprint 16 以降）

`ImageChoiceCell.dimOnDisabled` パターンは GE-11 Vernier / GE-12 クラウディングなど
**「タップ不可だが視覚的にはフルコントラスト維持」**を要する刺激ラッパで再利用予定。
disabled = タップ抑制、dimOnDisabled = 視覚減衰、の 2 軸を Sprint 16〜17 で踏襲する。
