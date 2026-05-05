# Sprint 17 Self-Review — G-12 クラウディング + G-13 数字探し（13 ゲーム全実装完了）

**作業日**: 2026-04-30
**作業範囲**: spec-v11.md §13 Sprint 17 行 / §7.12 G-12 / §7.13 G-13 / §6.3 staircase / §11 永続化
**入力デザイン**: docs/design-v11/sprints/sprint-17/screens.md / docs/design-v11/components.md §15 GE-12 / GE-13、§6 NumericKeypadChoice（AC-4）

---

## 0. TL;DR

- G-12（クラウディング、新規ヘキサゴン配置 = 中央 target + 周囲 6 flanker）+ G-13
  （数字探し、新規ノイズ + 数字オーバーレイ）の **2 ゲームを単体プレイで完成**
- **13 ゲーム全実装完了**（G-01〜G-13、Sprint 9〜17 で順次実装）
- 新規 stimulus 2 種：`CrowdingStimulus`（GE-12）/ `EmbeddedNumeralStimulus`（GE-13）
- AnswerChoiceGroup に **`layout="keypad-10"`** を追加（AC-4、5×2 グリッド、Web 0〜9 数字キー連動）
- 新規 lib：`g12Trial.ts` / `g12Result.ts` / `g13Trial.ts` / `g13Result.ts`（純関数、AsyncStorage / RN 触らない）
- 新規 6 screens：G-12 / G-13 それぞれの mini-instruction / play / result
- AppRouterV11 を G-12 / G-13 ルートに対応、`IMPLEMENTED_GAME_IDS_V11` に `'G-12'` / `'G-13'` 追加（**13 件、全実装完了**）
- Placeholder 文言を「Sprint 18: 全ゲーム連続コース実装予定」に更新
- `npm test`：**1598 → 1817（+219）**、`npm run typecheck` 0 errors、`npm run build:web` PASS
- Sprint 15 ラウンド 2 教訓を踏襲（`dimOnDisabled={false}` / プレイ中ハイライト枠抑止）

---

## 1. 受け入れ基準カバー（spec-v11.md §13 Sprint 17 行）

| 基準 | 状態 | 担当 |
|---|---|---|
| 「G-12 と G-13 が単体プレイで動く」 | ✅ | 6 screens（mini-instruction / play / result × 2 ゲーム）+ AppRouterV11 ルーティング |
| 「target-flanker spacing の staircase が機能する」 | ✅ G-12 | `computeG12FlankerSpacingPx` で spacing 倍率 × target 直径を px 換算、画面幅にクランプ。staircase 値が `flankerPlacements[].distanceMultiplier` に反映 |
| 「13 ゲーム全実装完了」 | ✅ | `IMPLEMENTED_GAME_IDS_V11` に G-01〜G-13 全 13 件、Placeholder からは到達不可 |
| テスト +30 件以上 | ✅ | **+219 件**（lib 127 + components 19 + screens 60 + AnswerChoiceGroup keypad-10 11 + AppRouterV11 +2 = 219） |

### F-07 共通フォーマットの遵守（spec §F-07）

| 基準 | G-12 | G-13 |
|---|---|---|
| 1 試行 60 秒で自動終了 | ✅ `GAME12_V11.totalDurationMs=60_000` | ✅ `GAME13_V11.totalDurationMs=60_000` |
| 60 秒タイマーは早期終了不可（OPT-11） | ✅ | ✅ |
| 残り N 秒カウントダウン常時表示 | ✅ `GamePlaySurface` 経由 | ✅ |
| 注視中、タップ／再タップで回答変更可 | ✅ AnswerChoiceGroup radio horizontal-4 | ✅ AnswerChoiceGroup radio keypad-10 |
| 確定ボタンなし | ✅ | ✅ |
| 60 秒経過時点の選択 = 回答 | ✅ | ✅ |
| 未回答 = 不正解、staircase 易方向 | ✅ `applySessionResultV11(s, 'incorrect')` | ✅ |
| 試行中の正誤フィードバック出さない | ✅ | ✅ |
| × ボタン緊急脱出のみ | ✅ ConfirmDialog | ✅ |
| 黄 4px 枠で選択明示 | ✅ AnswerChoiceGroup horizontal-4 | ✅ AnswerChoiceGroup keypad-10 |

### G-12 個別仕様（spec §7.12）

| 基準 | 状態 |
|---|---|
| 中央 target + 周囲 4〜6 個の flanker を 60 秒同時提示 | ✅ ヘキサゴン配置（6 個、`G12_FLANKER_COUNT=6`、components.md §15 GE-12） |
| target は 4 つの向きのうちランダム（垂直 / 水平 / 斜め右 / 斜め左） | ✅ `pickRandomOrientation` |
| 「垂直 / 水平 / 斜め右 / 斜め左」4 択（horizontal-4） | ✅ `AnswerChoiceGroup layout="horizontal-4"` |
| staircase: spacing（target 直径倍率） 易 4×→難 1.2× | ✅ gameRegistry G-12 entry 既登録（min:1.2, max:4, initial:2, step:0.2） |
| 採点：選択が target 向きと一致なら正解 | ✅ `gradeG12` |
| 結果：target を 1.5 秒拡大ハイライト | ✅ `highlightOrientation` + Animated.scale |

### G-13 個別仕様（spec §7.13）

| 基準 | 状態 |
|---|---|
| ノイズ + 微小コントラスト数字を 60 秒間表示 | ✅ `EmbeddedNumeralStimulus`（8×8 ノイズグリッド + 数字 Text オーバーレイ） |
| 0〜9 のいずれか 1 つランダム | ✅ `pickRandomDigit` |
| 「0」〜「9」の 10 択ボタン | ✅ `AnswerChoiceGroup layout="keypad-10"`（AC-4、5×2 グリッド） |
| staircase: コントラスト 易 0.30→難 0.03 | ✅ gameRegistry G-13 entry 既登録（min:0.03, max:0.30, initial:0.10, step:0.01） |
| 採点：選択が埋め込まれた数字と一致なら正解 | ✅ `gradeG13` |
| 結果：数字を本来コントラストで描画 | ✅ `highlightDigit` + Text opacity 1 + 黄 textShadow |

---

## 2. 実装ファイル一覧

### 新規追加（14 ファイル）

| ファイル | 役割 |
|---|---|
| `src/lib/v11/g12Trial.ts` | G-12 trial 生成 / 採点 / 6 flanker ヘキサゴン配置 / spacing → px 換算 / レイアウト純関数 |
| `src/lib/v11/g12Result.ts` | G-12 結果サマリラベル / 前回比 diff / 閾値整形（"2.0×"） |
| `src/lib/v11/g13Trial.ts` | G-13 trial 生成 / 採点 / コントラスト → alpha / レイアウト純関数 + 決定論ノイズ rng |
| `src/lib/v11/g13Result.ts` | G-13 結果サマリラベル / 前回比 diff / 閾値整形（"0.10"） |
| `src/components/v11/games/CrowdingStimulus.tsx` | GE-12 中央 target + 周囲 6 flanker stimulus（ヘキサゴン position: absolute 配置） |
| `src/components/v11/games/EmbeddedNumeralStimulus.tsx` | GE-13 ノイズ + 数字オーバーレイ stimulus（8×8 ノイズ View + 中央 Text） |
| `src/screens/v11/games/G12CrowdingScreen.tsx` | G-12 プレイ画面（60 秒タイマー / staircase 連携 / 4 択） |
| `src/screens/v11/games/G12ResultScreen.tsx` | G-12 結果サマリ画面（target 拡大ハイライト） |
| `src/screens/v11/games/G12MiniInstructionScreen.tsx` | G-12 ミニ説明画面（4 行リスト） |
| `src/screens/v11/games/G13EmbeddedNumeralScreen.tsx` | G-13 プレイ画面（60 秒タイマー / staircase 連携 / 10 択） |
| `src/screens/v11/games/G13ResultScreen.tsx` | G-13 結果サマリ画面（数字を本来コントラストで開示） |
| `src/screens/v11/games/G13MiniInstructionScreen.tsx` | G-13 ミニ説明画面（3 行リスト） |
| **テスト** | 12 ファイル（後述） |

### 更新（3 ファイル）

| ファイル | 内容 |
|---|---|
| `src/components/v11/AnswerChoiceGroup.tsx` | `layout="keypad-10"` を追加（AC-4）。内部に `KeypadTenLayout` + `KeypadButton` を新設。`enableNumericKeyboard` を keypad-10 にも対応（Web 0〜9 数字キー連動）。既存 horizontal-2 / horizontal-4 / clock-8 / grid-4 は不変 |
| `src/navigation/v11/AppRouterV11.tsx` | G-12 / G-13 ルート追加（instruction/play/result 計 6 ルート）、`IMPLEMENTED_GAME_IDS_V11` に `'G-12'` / `'G-13'` 追加（**13 件、全実装完了**）、Placeholder 文言を「Sprint 18」に更新 |
| `tests/v11/screens/AppRouterV11.test.tsx` | 「準備中ゲーム」テストを「Sprint 17：G-12 / G-13 もミニ説明画面へ進む」に書き換え + Sprint 18 プレースホルダ確認 |

### テストファイル（12 ファイル、+219 件）

| ファイル | 件数 |
|---|---|
| `tests/v11/lib/g12Trial.test.ts` | 47 件（spec / 4 向き / pickRandom / hexagon 配置 / spacing クランプ / offset 計算 / レイアウト） |
| `tests/v11/lib/g12Result.test.ts` | 18 件（ラベル / 前回比 diff / 閾値整形 "2.0×"） |
| `tests/v11/lib/g13Trial.test.ts` | 41 件（spec / 0〜9 / pickRandom / contrast→alpha / noise rng 決定論 / レイアウト） |
| `tests/v11/lib/g13Result.test.ts` | 21 件（ラベル / 前回比 diff / 閾値整形 "0.10"） |
| `tests/v11/components/games/CrowdingStimulus.test.tsx` | 9 件（target + 6 flanker 描画 / SR 非到達 / dimOnDisabled / プレイ中枠抑止 / 採点後枠 / 配置） |
| `tests/v11/components/games/EmbeddedNumeralStimulus.test.tsx` | 10 件（描画 / SR 非到達 / 8×8 ノイズ / digit-base / digit-highlight / 決定論 / 0〜9 全描画） |
| `tests/v11/screens/games/G12MiniInstructionScreen.test.tsx` | 5 件 |
| `tests/v11/screens/games/G12CrowdingScreen.test.tsx` | 14 件（OPT-12 / 4 択 radio / staircase 易方向 +0.2 / max=4 上限） |
| `tests/v11/screens/games/G12ResultScreen.test.tsx` | 11 件（正解 / 不正解 / 未回答 / 閾値 / 前回比 / 単体・コース） |
| `tests/v11/screens/games/G13MiniInstructionScreen.test.tsx` | 5 件 |
| `tests/v11/screens/games/G13EmbeddedNumeralScreen.test.tsx` | 14 件（OPT-12 / 10 択 radio / staircase 易方向 +0.01 / max=0.30 上限） |
| `tests/v11/screens/games/G13ResultScreen.test.tsx` | 11 件 |
| AnswerChoiceGroup keypad-10 追加 in `tests/v11/components/AnswerChoiceGroup.test.tsx` | 11 件（10 ボタン / aria-label / 切替 / disabled / button size / カスタム ariaLabel） |
| AppRouterV11 G-12/G-13 ルート in `tests/v11/screens/AppRouterV11.test.tsx` | 2 件 差し替え + 1 件追加 = +2 |
| **新規合計** | **219 件** |

### テスト件数

- 全体：**1598（Sprint 16 完了）→ 1817（Sprint 17 完了）= +219 件**
- Sprint 17 行受け入れ基準「+30 件以上」を **大幅クリア**

---

## 3. 設計判断

### 3.1 ヘキサゴン配置（GE-12）の選定

仕様書（spec §7.12）は「周囲 4〜6 個の flanker」と幅を持たせた表記。components.md §15
GE-12 でも具体的個数の指定はないため、Generator として 6 個（ヘキサゴン頂点配置）を選定：

- Levi & Li 2009 / Pelli 2008 のクラウディング paradigm では正六角形配置が標準
- 30°/90°/150°/210°/270°/330° の対称配置で target を均等に「のませる」
- 4 個（正方形）よりも crowding 効果が強い（参考：Pelli 2008 review）
- 8 個以上だと spacing が狭まり画面に収まりにくい

### 3.2 EmbeddedNumeralStimulus の描画方法（GE-13）

spec §7.13 の「ノイズ + 微小コントラストの数字」を Web/RN 共通で描画する方法として
3 案検討：

| 方式 | メリット | デメリット |
|---|---|---|
| **Canvas / WebGL** | 高品質ノイズ / アンチエイリアス | RN ネイティブで Canvas API 不在 |
| **SVG** | スケーラブル | 数字 + ノイズ patternFill は重い |
| **View + Text 重ね（採用）** | RN/Web 両対応、依存追加なし | ノイズ粒度が粗い（8×8） |

採用：**View + Text 重ね**。8×8 = 64 個のグレー濃度ランダム矩形 View で背景を作り、
中央に Text で数字を半透明（contrast → alpha）で重ねる。決定論的 PRNG（Mulberry32）
で seed → 同パターン再現を保証（テスト容易性 + 結果画面で同じノイズを再描画できる）。

ノイズ粒度 8×8 は粗いが、コントラスト感度訓練の本質は「数字の輪郭が背景に紛れる」状態
を作ることであり、ノイズパターンの精細さは二次的要素。30fps 維持の方が NF-1 観点で重要。

### 3.3 keypad-10 の AnswerChoiceGroup 統合（AC-4）

components.md §6 NumericKeypadChoice は当初「独立コンポーネント」設計だったが、
G-13 のみで使う 1 ヶ所のため、AnswerChoiceGroup の `layout="keypad-10"` として統合：

- 既存 `clock-8` と同じパターン（`KeypadTenLayout` 内部に `KeypadButton`）
- 共通 a11y 規約（radiogroup / radio + aria-checked）と統一
- `enableNumericKeyboard` を再利用：keypad-10 では 0〜9 → choices id "0".."9" を
  ルックアップ。clock-8 は既存通り 1〜8 → choices[index]。両モードで `OPT-12` トグル動作
  （同じキーを再度押すと解除）を踏襲

### 3.4 Sprint 15 教訓の踏襲（GE-12 / GE-13）

- **dimOnDisabled={false}**：CrowdingStimulus の中央 target を `ImageChoiceCell`（disabled）
  でラップする際に明示。disabled でも opacity=1 を維持。Levi & Li 2009 の crowding
  パラダイムでは target が flanker と同じ高コントラストである必要があるため、
  opacity 0.5 で半減すると spec §7.12 の趣旨が崩れる。テスト：
  `tests/v11/components/games/CrowdingStimulus.test.tsx` 「中央 target は dimOnDisabled=false」
- **プレイ中ハイライト枠抑止**：`isTargetSelected = highlightOrientation != null`（`selectedOrientation`
  には依存しない）。プレイ中の選択中ボタンは AnswerChoiceGroup 側のボタン aria-checked
  + 黄枠で表現。EmbeddedNumeralStimulus は ImageChoiceCell を使わないため対象外
  だが、`highlightDigit` プロパティの有無で「採点後 vs プレイ中」を分離する設計を
  明示（採点後のみ digit-highlight オーバーレイが描画）

### 3.5 13 ゲーム全実装完了に伴う Placeholder 文言更新

Sprint 17 完了で `IMPLEMENTED_GAME_IDS_V11` が全 13 件になったため、単体プレイ一覧から
Placeholder Screen には到達しなくなった（理論上）。残るのは「全ゲーム連続プレイ」
CTA のみ。文言を「Sprint 16 以降」「Sprint 17 以降」から「Sprint 18」に更新し、
「13 ゲーム全実装完了」を明記。

`tests/v11/screens/AppRouterV11.test.tsx` の「準備中ゲーム」テストは目的を更新：
G-12 / G-13 が「ミニ説明画面に進む」テストに差し替え。Sprint 18 プレースホルダの
確認は別テストで保持。

---

## 4. 動作確認手順

### 開発サーバー起動

```sh
npm run web
# → http://localhost:8081
```

### 単体プレイ動作確認

#### G-12

1. ホーム画面 → 「単体プレイ」タップ
2. 一覧で「G-12 クラウディング」カード選択 → ミニ説明 →「はじめる」→ 距離リマインダー（3 秒）→ プレイ画面
3. 60 秒間、中央 target + 周囲 6 flanker（ヘキサゴン配置）が表示される
4. 「垂直 / 水平 / 斜め右 / 斜め左」のいずれかをタップ（再タップ可、別タップで切替）
5. 60 秒経過 → 結果サマリ：「正解は『斜め右』」「あなたの回答『◯◯』」+ 閾値 2.0×（初回）+ 中央 target 拡大ハイライト
6. 「同じゲームをもう一度」「一覧に戻る」「ホームへ」のいずれか選択

#### G-13

1. ホーム → 単体プレイ → 「G-13 数字探し」カード選択 → ミニ説明 → 距離リマインダー → プレイ
2. 60 秒間、ノイズ背景 + 微小コントラスト数字が表示される
3. 0〜9 のキーパッドから当てる（再タップで解除、別を押すと切替）
4. 60 秒経過 → 結果：「正解は『3』」+ 閾値 0.10（初回）+ 数字を本来コントラストで開示
5. 後続フッターは G-12 と同じ 3 択

### staircase 動作確認

```sh
# DevTools の AsyncStorage 直接確認（Web）
# storage key: gaboreye:v1.1:staircase:G-12 / G-13
# 初期：currentParam=2.0（G-12）/ 0.10（G-13）
# 不正解 1 回：currentParam += step（G-12: 2.2、G-13: 0.11）
# 連続正解 3 回：currentParam -= step（G-12: 1.8、G-13: 0.09）
```

### a11y 確認

- Tab で AnswerChoiceGroup ボタンを順に辿れる（focus 可視 3px 青）
- Space / Enter で選択トグル
- G-12：1〜4 数字キー対応なし（horizontal-4 は数字キー連動なし、enableNumericKeyboard は
  渡していない。仕様外を増やさないため）
- **G-13：0〜9 数字キーで keypad ボタン操作可**（`enableNumericKeyboard={true}`）
- VoiceOver / TalkBack：「垂直、ラジオボタン、選択中」「数字 3、ラジオボタン、選択中」
- stimulus 内部は SR 非到達（`accessibilityElementsHidden`）

### レスポンシブ確認

| ブレイクポイント | G-12 patch | G-12 spacing 例（4×） | G-13 stimulus | G-13 keypad |
|---|---|---|---|---|
| 360px | 50 | 200px → 画面に収まらないので auto クランプ | 240×240 | 56×56 |
| 375px | 60 | 240px | 240×240 | 64×64 |
| 768px | 72 | 288px | 280×280 | 64×64 |
| 1280px | 80 | 320px | 320×320 | 72×72 |

`Dimensions.get('window').width` で動的に分岐。G-12 の spacing は `computeG12FlankerSpacingPx`
で画面幅にクランプされるため、必ず描画領域に収まる。

---

## 5. テストカバレッジ詳細

### G-12 lib（65 件）

- **spec**：定数、gameRegistry 整合性、4 向き列挙、`G12_FLANKER_COUNT=6`
- **orientationToOrientationDeg / orientationToJaLabel / userAnswerOrientationToLabel**
- **pickRandomOrientation**：rng 0/0.3/0.6/0.9/0.999999 の各端値
- **buildG12Trial**：6 flanker / 4 向き範囲 / hexagon 配置 / 共通 GaborParams /
  spacing クランプ / phaseRad 範囲 / 決定論性 / correctOrientation 整合
- **gradeG12**：一致 / 不一致 / null（未回答）/ correctOrientation 透過
- **computeG12StimulusLayout**：4 ブレイクポイント / オブジェクト引数
- **computeG12FlankerSpacingPx**：標準 / 画面幅クランプ / spacing min=1.0 / 余裕あり
- **computeG12FlankerOffsetPx**：0°/π/2/π/30°/distance=0 の各角度

### G-12 Result（18 件）

- **buildG12CorrectAnswerLabel** / **buildG12UserAnswerLabel** / **buildG12ResultDetailText**
- **formatG12ThresholdLabel**：2.0 / 1.2 / 4.0 / 1.94（"1.9×"）/ 1.96（"2.0×" 四捨五入）
- **computeG12DiffFromBest**：improved / flat / worsened / null（初回）/ digits=1

### G-13 lib（62 件）

- **spec**：定数、gameRegistry、`G13_ALL_DIGITS=[0..9]`
- **digitToJaLabel / userAnswerDigitToLabel**
- **pickRandomDigit**：rng 0/0.05/0.15/0.5/0.999999 の各端値
- **contrastToDigitAlpha**：標準 / クランプ 0/1 / minVisibleAlpha
- **createNoiseRng**：決定論性 / 異 seed / 0〜1 範囲
- **buildG13Trial**：digit 0〜9 範囲 / contrast クランプ / noiseSeed 32bit / 決定論性
- **gradeG13**：一致 / 不一致 / null（未回答）/ embeddedDigit 透過
- **computeG13StimulusLayout**：4 ブレイクポイント / オブジェクト引数

### G-13 Result（21 件）

- **buildG13CorrectAnswerLabel** / **buildG13UserAnswerLabel** / **buildG13ResultDetailText**
- **formatG13ThresholdLabel**：0.10 / 0.03 / 0.30 / 0.094（"0.09"）/ 0.096（"0.10" 四捨五入）
- **computeG13DiffFromBest**：improved / flat / worsened / null（初回）/ digits=2

### CrowdingStimulus（9 件）

- 中央 target + 6 flanker 描画 / カスタム testId / flanker inner accessibilityElementsHidden /
  プレイ中ハイライト枠抑止 / 採点後黄ハイライト / target disabled / dimOnDisabled=false /
  highlight duration / scale カスタム / flanker 配置（angle 30° vs 90° の位置差）

### EmbeddedNumeralStimulus（10 件）

- 描画 / カスタム testId / ノイズ accessibilityElementsHidden / 8×8 = 64 セル /
  highlightDigit オーバーレイ描画 / 通常時オーバーレイ非描画 / 正方形 container /
  決定論的ノイズ（同 seed → 同 backgroundColor）/ contrast → opacity / 0〜9 全 digit

### AnswerChoiceGroup keypad-10（11 件）

- 10 ボタン表示 / 「数字 N」aria-label / aria-checked / 押下 onSelect / 再タップ解除 /
  切替 / disabled / keypadButtonSizePx カスタム / 既定 64px / カスタム ariaLabel 上書き

### G-12 / G-13 screens（60 件）

- ミニ説明（5+5）：マウント / start / back / リスト 4 or 3 項目 / ヘッダー
- プレイ（14+14）：マウント / 確定ボタンなし / GameStatusBar / ガイド文 / 4 or 10 ボタン /
  60 秒経過で onComplete / 正解 / 切替 radio / 解除 / staircase 易方向 +step /
  閾値小数 1〜2 桁 / max 上限 / aria-checked 切替 / 画面全体描画
- 結果（11+11）：マウント / 正解 / 不正解 / 未回答 / 閾値 / 単位 / 前回比なし /
  前回比 - / stimulus testId / 単体プレイ Footer / コースモード「次へ」

---

## 6. 既知の懸念 / 申し送り（Sprint 18 以降）

1. **G-13 ノイズパターンの粗さ**：8×8 = 64 個の View を背景に並べる方式。実機（iPhone
   12 / Pixel 5）で 60 秒間 30fps 維持を NF-1 観点で目視確認推奨。粗すぎる場合は
   16×16 への増強を検討（256 View で重くなる可能性、計測で判断）。
2. **G-13 数字フォントの表現**：現状は React Native `Text` の `fontWeight: '900'` で
   描画。実機やフォント環境によっては期待と異なる字形になる可能性。Pelli-Robson
   chart の標準 Sloan font を採用するなら別途フォント追加が必要だが、Sprint 17 では
   仕様を増やさず標準フォントで実装。
3. **G-12 spacing が極端に狭い場合の overlap**：`computeG12FlankerSpacingPx` で
   spacing 1.0 が下限（target と flanker が接する距離）。staircase 1.2 が下限なので
   通常は問題ないが、画面幅が狭く auto クランプが 1.0 まで落ちると flanker と
   target が接する可能性あり。実機検証推奨。
4. **Sprint 18 で全ゲーム連続コース**：F-05 / F-11（ワイドスコア）/ F-12（進捗グラフ）。
   13 ゲームすべての play / result screen が揃ったので、Course Runner は順次レンダ
   リングするだけ。`gameRegistry.getEnabledGames()` の順序付きリストを反復するパターン。
5. **Sprint 19 でバッジ・設定・F-18**：13 種バッジ / 設定 / リリース選定（releaseEnabled
   フラグでゲーム動的除外）。
6. **共通基盤の安定**：Sprint 9〜17 で確立した骨格（GamePlaySurface / ResultSummaryV11 /
   SinglePlayPostFooter / ImageChoiceCell / AnswerChoiceGroup（horizontal-2 / horizontal-4 /
   clock-8 / grid-4 / **keypad-10 完備**）/ MetricCard / staircaseV11 / storage-v11）は
   Sprint 18 以降も変更なしで使い回す方針。

---

## 7. 検証結果（数値）

| 検証 | Sprint 16 完了 | Sprint 17 完了 | 差分 |
|---|---|---|---|
| `npm test` 通過件数 | 1598 件 | **1817 件** | **+219** |
| `npm run typecheck` errors | 0 | 0 | 0 |
| `npm run build:web` | PASS | PASS | - |
| 実装済 gameId 数 | 11（G-01〜G-11）| **13（G-01〜G-13）** | **+2 = 全実装完了** |
| screens/v11/games ファイル数 | 33 | **39** | **+6** |
| components/v11/games ファイル数 | 8 | **10** | **+2** |
| lib/v11 ファイル数 | 22 | **26** | **+4** |

### 13 ゲーム全実装完了の集計

| ゲーム | 実装スプリント | 主要 stimulus / staircase 値 |
|---|---|---|
| G-01 変化察知 | Sprint 9 | GaborGrid / 角度差（°）|
| G-02 左右並び傾き | Sprint 10 | SideBySideStimulus / 角度差（°）|
| G-03 周辺視野ハント | Sprint 11 | RadialEightStimulus / odd one 向き差（°）|
| G-04 コントラスト弁別 | Sprint 12 | （G-02 流用）/ コントラスト差 |
| G-05 空間周波数弁別 | Sprint 13 | （G-02 流用）/ cpd 比 |
| G-06 ガウス窓サイズ弁別 | Sprint 14 | （G-02 流用）/ SD 比 |
| G-07 ガボールエッジ検出 | Sprint 14 | MorphGridStimulus / 向きズレ許容（°）|
| G-08 残像方位弁別 | Sprint 15 | VerticalStackStimulus / テスト絶対角度（°）|
| G-09 側方マスキング | Sprint 15 | LateralMaskingStimulus / target コントラスト |
| G-10 テクスチャ分離 | Sprint 16 | TextureGridStimulus / 向き差（°）|
| G-11 Vernier 整列判定 | Sprint 16 | VernierStackStimulus / ズレ量（arcmin）|
| **G-12 クラウディング** | **Sprint 17** | **CrowdingStimulus / spacing 倍率** |
| **G-13 数字探し** | **Sprint 17** | **EmbeddedNumeralStimulus / コントラスト** |

---

## 8. ラウンド 0 完了。Evaluator 評価依頼。

オーケストレーターは `subagent_type: "evaluator"` を `mode: "impl"` で呼び、
起動方法 `docs/run.md §21` / 自己評価 本ファイルを渡してください。

**Sprint 17 = 13 ゲーム全実装完了**。Sprint 18 以降は全ゲーム連続コース・ワイドスコア・
進捗グラフ・ストリーク・バッジ・設定・F-18 リリース選定の実装に移行する。
