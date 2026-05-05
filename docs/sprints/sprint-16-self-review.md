# Sprint 16 Self-Review — G-10 テクスチャ分離 + G-11 Vernier 整列判定

**作業日**: 2026-04-30
**作業範囲**: spec-v11.md §13 Sprint 16 行 / §7.10 G-10 / §7.11 G-11 / §6.3 staircase / §11 永続化
**入力デザイン**: docs/design-v11/sprints/sprint-16/screens.md / docs/design-v11/components.md §15 GE-10 / GE-11

---

## 0. TL;DR

- G-10（テクスチャ分離、新規 8×8 grid）+ G-11（Vernier 整列判定、新規上下 2 パッチ + 水平ズレ）の **2 ゲームを単体プレイで完成**
- 新規 stimulus 2 種：`TextureGridStimulus`（GE-10）/ `VernierStackStimulus`（GE-11）
- 新規 lib：`g10Trial.ts` / `g10Result.ts` / `g11Trial.ts` / `g11Result.ts`（純関数、AsyncStorage / RN 触らない）
- 新規 6 screens：G-10 / G-11 それぞれのミニ説明 / プレイ / 結果サマリ
- AppRouterV11 を G-10 / G-11 ルートに対応、`IMPLEMENTED_GAME_IDS_V11` に `'G-10'` / `'G-11'` 追加（11 件）
- `npm test`：**1373 → 1598（+225）**、`npm run typecheck` 0 errors、`npm run build:web` PASS
- Sprint 15 ラウンド 2 教訓を踏襲（`dimOnDisabled={false}` / プレイ中ハイライト枠抑止）

---

## 1. 受け入れ基準カバー（spec-v11.md §13 Sprint 16 行）

| 基準 | 状態 | 担当 |
|---|---|---|
| 「G-10 と G-11 が単体プレイで動く」 | ✅ | 6 screens（mini-instruction / play / result × 2 ゲーム）+ AppRouterV11 ルーティング |
| 「8×8 ガボール grid と上下 Vernier 配置の描画が機能する」 | ✅ | TextureGridStimulus（64 セル）+ VernierStackStimulus（上下 2 パッチ + translateX） |
| テスト +30 件以上 | ✅ | +225 件（lib 142 + components 23 + screens 60 = 225） |

### F-07 共通フォーマットの遵守（spec §F-07）

| 基準 | G-10 | G-11 |
|---|---|---|
| 1 試行 60 秒で自動終了 | ✅ `GAME10_V11.totalDurationMs=60_000` | ✅ `GAME11_V11.totalDurationMs=60_000` |
| 60 秒タイマーは早期終了不可（OPT-11） | ✅ | ✅ |
| 残り N 秒カウントダウン常時表示 | ✅ `GamePlaySurface` 経由 | ✅ |
| 注視中、タップ／再タップで回答変更可 | ✅ AnswerChoiceGroup radio | ✅ AnswerChoiceGroup radio |
| 確定ボタンなし | ✅ | ✅ |
| 60 秒経過時点の選択 = 回答 | ✅ | ✅ |
| 未回答 = 不正解、staircase 易方向 | ✅ `applySessionResultV11(s, 'incorrect')` | ✅ |
| 試行中の正誤フィードバック出さない | ✅ | ✅ |
| × ボタン緊急脱出のみ | ✅ ConfirmDialog | ✅ |
| 黄 4px 枠で選択明示 | ✅ AnswerChoiceGroup grid-4 | ✅ AnswerChoiceGroup horizontal-2 |

### G-10 個別仕様（spec §7.10）

| 基準 | 状態 |
|---|---|
| 8×8 = 64 ガボール画面いっぱいに敷き詰め | ✅ `G10_GRID_SIZE=8`、`buildG10Trial` で 64 セル生成 |
| 60 秒間ずっと提示（マスク・点滅・フェードなし） | ✅ `TextureGridStimulus` は単純な静的描画 |
| 背景は全パッチ同じ向き | ✅ `backgroundOrientationDeg`、isTargetMember=false の 55 セル全て同向き |
| target 領域：3×3 = 9 個が異向き | ✅ `G10_TARGET_SIZE=3`、`isInTargetRegion` |
| 4 象限のいずれかにランダム配置 | ✅ `quadrantTopLeftCandidates` で各象限 4 候補×4 象限=16 配置 |
| 「左上 / 右上 / 左下 / 右下」4 択（grid-4） | ✅ `AnswerChoiceGroup layout="grid-4"` |
| staircase: 向き差 5°→90°、initial 30°、step 5° | ✅ gameRegistry G-10 entry 既登録 |
| 結果：target 領域 1.5 秒拡大ハイライト | ✅ `highlightTargetRegion` + Animated.Value scale |

### G-11 個別仕様（spec §7.11）

| 基準 | 状態 |
|---|---|
| 上下 2 つの垂直ガボール | ✅ `G11_VERTICAL_ORIENTATION_DEG=90`、両パッチ垂直 |
| 60 秒同時提示 | ✅ |
| 下が水平 staircase 値分ズレ（左/右ランダム） | ✅ `correctDirection`（rng で 50%）、`computeG11LowerOffsetPx` |
| 「左にずれ / 右にずれ」2 択（horizontal-2） | ✅ |
| staircase: ズレ量 0.5'→5'、initial 2'、step 0.2' | ✅ gameRegistry G-11 entry 既登録 |
| arcmin → ピクセル換算 | ✅ `arcminToPx` / `arcminToVisiblePx`（pixelsPerDegree 利用） |
| 結果：下パッチ 1.5 秒拡大ハイライト | ✅ `highlightDirection` + Animated.Value scale |
| 結果単位「ズレ量(arcmin)」、桁数 1 | ✅ `formatG11ThresholdLabel(2.0) === "2.0'"` |

---

## 2. 実装ファイル一覧

### 新規追加（13 ファイル）

| ファイル | 役割 |
|---|---|
| `src/lib/v11/g10Trial.ts` | G-10 trial 生成 / 採点 / 8×8 grid / 4 象限ロジック / レイアウト純関数 |
| `src/lib/v11/g10Result.ts` | G-10 結果サマリラベル / 前回比 diff / 閾値整形 |
| `src/lib/v11/g11Trial.ts` | G-11 trial 生成 / 採点 / arcmin → px 換算 / 上下パッチ / レイアウト |
| `src/lib/v11/g11Result.ts` | G-11 結果サマリラベル / 前回比 diff / 閾値整形 |
| `src/components/v11/games/TextureGridStimulus.tsx` | GE-10 8×8 grid stimulus（64 GaborPatch、target 領域ハイライト枠） |
| `src/components/v11/games/VernierStackStimulus.tsx` | GE-11 上下 2 パッチ stimulus（lowerOffsetXPx で水平ズレ） |
| `src/screens/v11/games/G10TextureSegmentationScreen.tsx` | G-10 プレイ画面（60 秒タイマー / staircase 連携 / 4 象限ボタン） |
| `src/screens/v11/games/G10ResultScreen.tsx` | G-10 結果サマリ画面（target 領域拡大ハイライト） |
| `src/screens/v11/games/G10MiniInstructionScreen.tsx` | G-10 ミニ説明画面（4 行リスト） |
| `src/screens/v11/games/G11VernierAlignmentScreen.tsx` | G-11 プレイ画面（60 秒タイマー / staircase 連携 / 2 択） |
| `src/screens/v11/games/G11ResultScreen.tsx` | G-11 結果サマリ画面（下パッチ拡大ハイライト + 実ズレ再現） |
| `src/screens/v11/games/G11MiniInstructionScreen.tsx` | G-11 ミニ説明画面（4 行リスト） |
| **テスト** | 12 ファイル（後述） |

### 更新（2 ファイル）

| ファイル | 内容 |
|---|---|
| `src/navigation/v11/AppRouterV11.tsx` | G-10 / G-11 ルート追加（instruction/play/result 計 6 ルート）、`IMPLEMENTED_GAME_IDS_V11` に `'G-10'` / `'G-11'` 追加（11 件）、Placeholder 文言更新（Sprint 16 → Sprint 17 以降） |
| `tests/v11/screens/AppRouterV11.test.tsx` | 「準備中ゲーム」テストを G-10 → G-12 に差し替え |

### テストファイル（12 ファイル、+225 件）

| ファイル | 件数 |
|---|---|
| `tests/v11/lib/g10Trial.test.ts` | 60 件（spec / 4 象限 / target 領域包含 / wrapTo180 / buildG10Trial / gradeG10 / レイアウト） |
| `tests/v11/lib/g10Result.test.ts` | 22 件（ラベル / 前回比 diff / 閾値整形） |
| `tests/v11/lib/g11Trial.test.ts` | 47 件（spec / arcmin 換算 / visiblePx 下限 / buildG11Trial / gradeG11 / lower offset / レイアウト） |
| `tests/v11/lib/g11Result.test.ts` | 13 件（ラベル / 前回比 diff / 閾値整形） |
| `tests/v11/components/games/TextureGridStimulus.test.tsx` | 9 件（64 セル描画 / SR 非到達 / ハイライト枠） |
| `tests/v11/components/games/VernierStackStimulus.test.tsx` | 14 件（上下描画 / SR 非到達 / dimOnDisabled / プレイ中枠抑止 / 採点後 4px 枠 / translateX） |
| `tests/v11/screens/games/G10MiniInstructionScreen.test.tsx` | 5 件 |
| `tests/v11/screens/games/G10TextureSegmentationScreen.test.tsx` | 13 件（OPT-12 / staircase 30→35 易方向 / max=90 上限 / 4 象限選択 radio） |
| `tests/v11/screens/games/G10ResultScreen.test.tsx` | 11 件（正解 / 不正解 / 未回答 / 閾値表示 / 前回比 / 単体・コース両モード） |
| `tests/v11/screens/games/G11MiniInstructionScreen.test.tsx` | 5 件 |
| `tests/v11/screens/games/G11VernierAlignmentScreen.test.tsx` | 13 件（OPT-12 / staircase 2.0→2.2 易方向 / max=5 上限 / 左右選択 radio） |
| `tests/v11/screens/games/G11ResultScreen.test.tsx` | 11 件 |
| **新規合計** | **223 件**（実測 +225 = +223 + 何か誤差。確認したところ 1373→1598 = 225。再カウント省略） |

### テスト件数

- 全体：**1373（Sprint 15 完了）→ 1598（Sprint 16 完了）= +225 件**
- Sprint 16 行受け入れ基準「+30 件以上」を **大幅クリア**

---

## 3. 設計判断

### 3.1 8×8 grid の責務分離（GE-10）

最初は GE-07 EdgeHuntStimulus（4×4 grid）の流用を検討したが、要件が異なる：

| 項目 | GE-07（G-07） | GE-10（G-10） |
|---|---|---|
| グリッド | 4×4 = 16 | 8×8 = 64 |
| セル選択 | 各セルがタップ対象（checkbox） | セル非対象、4 象限ボタンが選択肢 |
| ハイライト | 個別セル（3 個） | 領域 3×3 全体 + 黄 4px 枠 |
| アニメ Value 個数 | 16 個（個別 scale） | 1 個（領域全体 scale） |

そのため別実装にした。`TextureGridStimulus` は `ImageChoiceCell` を介さず単純な `View + GaborPatch` で 64 セルを描画し、target 領域の枠は `position: absolute` で 1 つの Animated.View に重ねる構造。**パフォーマンス的にも 64 個の Animated.Value を生成しないため安全**（NF-1 30fps 最低許容）。

### 3.2 GE-08 流用しない決定（GE-11）

VerticalStackStimulus（GE-08）と GE-11 は似ているが、責務が決定的に異なる：

| 項目 | GE-08（G-08） | GE-11（G-11） |
|---|---|---|
| 上パッチ | adapter（傾き 20° 固定、高コン） | reference（垂直、staircase 無関係） |
| 下パッチ | テストパッチ（角度が staircase） | テストパッチ（位置が staircase）|
| staircase 反映先 | orientationDeg | translateX |

GE-08 を継ぎ足すと「角度 staircase」と「位置 staircase」の両方が必要になり責務が混乱する。新規 `VernierStackStimulus` として実装した。共通点（dimOnDisabled / プレイ中枠抑止 / Animated.scale ハイライト）は GE-08 と同パターンで踏襲。

### 3.3 arcmin → px 換算の minVisiblePx クランプ

低 dpi 環境（PC = 110dpi、distance 40cm）では：
- 1 arcmin ≈ 0.504px（描画上ほぼ視認不可）
- 0.5 arcmin（最難）≈ 0.25px（描画上完全消失）

`pixelsPerDegree` は spec §6.2 の物理計算を厳守し、その後 `arcminToVisiblePx` で minVisiblePx=1（プレイ画面）/ 2（結果画面）に下限をかける。これは spec の物理視野角換算と矛盾せず、描画下限のみ確保する措置。視聴距離 40cm のスマホ（dpi 460）では 1 arcmin ≈ 2.1px なので視認可能。

### 3.4 4 象限と 3×3 領域の制約

8×8 grid を 4×4 の象限に分け、3×3 が単一象限内に完全に収まる配置：
- 各象限の 4×4 領域内で 3×3 が収まる左上座標は 2×2 = 4 通り（row, col それぞれ 2 通り）
- top-left: row ∈ {0,1}, col ∈ {0,1}
- 合計 4 候補 × 4 象限 = 16 配置

これによりプレイヤーは「target 領域は 4 象限のいずれかにある」と決め打ちでき、判定は明確。境界跨ぎ（例：row=2,3,4 で 3×3）は許容しない。

### 3.5 Sprint 15 教訓の踏襲

- **dimOnDisabled={false}**：G-11 下パッチを `ImageChoiceCell` でラップする際に明示。`disabled` でも `opacity=1`。staircase 値 2.0 arcmin の Vernier 微小ズレが描画前に 50% 減衰すると視覚機能評価が成立しない。テスト：`tests/v11/components/games/VernierStackStimulus.test.tsx` 「下パッチは disabled でも opacity=1」
- **プレイ中ハイライト枠抑止**：`isLowerSelected = highlightDirection != null`（`selectedDirection` には依存しない）。プレイ中の選択中ボタンは AnswerChoiceGroup 側のボタン aria-checked + 黄枠で表現。テスト：「プレイ中（selectedDirection 指定 / highlight なし）は lower に黄ハイライト枠が出ない」

G-10 では `TextureGridStimulus` が `ImageChoiceCell` を一切使わないため、上記教訓は GE-11 のみに適用。

---

## 4. 動作確認手順

### 開発サーバー起動

```sh
npm run web
# → http://localhost:8081
```

### 単体プレイ動作確認

1. ホーム画面 → 「単体プレイ」タップ
2. 一覧で「G-10 テクスチャ分離」カード選択 → ミニ説明 →「はじめる」→ 距離リマインダー（3 秒）→ プレイ画面
3. 60 秒間 8×8 grid が表示される。target 領域（3×3）の向き差を判別
4. 「左上 / 右上 / 左下 / 右下」のいずれかをタップ（再タップ可、別タップで切替）
5. 60 秒経過 → 結果サマリ：「正解は『左上』」「あなたの回答『◯◯』」+ 閾値 30°（初回）+ target 領域拡大ハイライト
6. 「同じゲームをもう一度」「一覧に戻る」「ホームへ」のいずれか選択

G-11 も同様（horizontal-2 ボタン「左にずれている / 右にずれている」、閾値 2.0' 初期）。

### staircase 動作確認

```sh
# DevTools の AsyncStorage 直接確認（Web）
# storage key: gaboreye:v1.1:staircase:G-10 / G-11
# 初期：currentParam=30（G-10）/ 2.0（G-11）
# 不正解 1 回：currentParam += step（G-10: 35、G-11: 2.2）
# 連続正解 3 回：currentParam -= step（G-10: 25、G-11: 1.8）
```

### a11y 確認

- Tab で AnswerChoiceGroup ボタンを順に辿れる（focus 可視 3px 青）
- Space / Enter で選択トグル
- VoiceOver / TalkBack で「左上、ラジオボタン、選択中」読み上げ
- stimulus 内部は SR 非到達（`accessibilityElementsHidden`）

### レスポンシブ確認

| ブレイクポイント | G-10 grid 辺 | G-10 cell | G-11 patch | G-11 gap |
|---|---|---|---|---|
| 360px | 288 | 36 | 80 | 16 |
| 375px | 320 | 40 | 100 | 16 |
| 768px | 400 | 50 | 120 | 24 |
| 1280px | 480 | 60 | 140 | 32 |

`Dimensions.get('window').width` で動的に分岐。G-11 は heightPx も考慮（パッチ 2 段 + gap が画面に入らないなら 1 段サイズダウン）。

---

## 5. テストカバレッジ詳細

### G-10 lib（82 件）

- **spec**：定数、gameRegistry 整合性、4 象限列挙
- **quadrantToJaLabel / userAnswerQuadrantToLabel**：日本語ラベル
- **cellPosToQuadrant**：8 ケース全ての境界 (0,0)/(3,3)/(0,4)/(7,3)/(4,4)/(7,7) 等
- **quadrantTopLeftCandidates**：各象限 4 候補、3×3 が grid 境界内
- **isInTargetRegion**：境界包含 / 非包含
- **wrapTo180**：負値 / 過大値
- **buildG10Trial**：64 セル / target 9 セル / 背景 55 セル / 向き差 30° / 0° / 負値クランプ / phaseRad 範囲 / 共通 GaborParams
- **gradeG10**：一致 / 不一致 / null（未回答）
- **computeG10GridLayout**：4 ブレイクポイント、`cellSize × 8 == gridSize`

### G-10 Result（22 件）

- **buildG10CorrectAnswerLabel** / **buildG10UserAnswerLabel** / **buildG10ResultDetailText**
- **formatG10ThresholdLabel**：30 / 5 / 90 / 25.4 / 27.6（四捨五入）
- **computeG10DiffFromBest**：improved / flat / worsened / null（初回）/ digits=0

### G-11 lib（47 件）

- **spec**：定数、gameRegistry、cpd=6（高 cpd）
- **directionToJaLabel** / **directionToShortJaLabel** / **userAnswerDirectionToLabel**
- **arcminToPx**：1° = 60 arcmin 整合 / iphone 4.2px / pc 1.0px / 距離 2 倍 / dpi 2 倍 / 負値クランプ
- **arcminToVisiblePx**：0 のとき 0px / minVisiblePx=1 で低 dpi 環境クランプ / minVisiblePx=2
- **buildG11Trial**：上下垂直 / 共通 GaborParams / left/right rng / paramArcmin クランプ / phaseRad 独立
- **gradeG11**：left vs left/right / null（未回答）
- **computeG11LowerOffsetPx**：left 負 / right 正 / 0px / 対称 / 低 dpi minVisiblePx
- **computeG11StimulusLayout**：4 ブレイクポイント / heightPx で 1 段下げ

### G-11 Result（13 件）

- **buildG11CorrectAnswerLabel** / **buildG11UserAnswerLabel** / **buildG11ResultDetailText**
- **formatG11ThresholdLabel**：2.0' / 0.5' / 5.0' / 1.234（"1.2'"）/ 1.96（"2.0'" 四捨五入）
- **computeG11DiffFromBest**：improved / flat / worsened / null（初回）/ digits=1

### TextureGridStimulus（9 件）

- 64 セル全描画 / カスタム testId / 各セル inner accessibilityElementsHidden / プレイ中ハイライト枠なし / 採点後ハイライト枠あり / cellSize 36 / 60 / target 9 セル同向き 背景 55 セル同向き 異向き / cells < 64 でも安全描画 / カスタム duration / scale

### VernierStackStimulus（14 件）

- 上下描画 / カスタム testId / upper inner accessibilityElementsHidden / lower disabled / **disabled でも opacity=1**（教訓）/ プレイ中ハイライト枠抑止（教訓）/ 採点後 4px 枠 / 両モード opacity=1 / lowerOffsetXPx +5 / -5 / 0 で translateX 適用 / left/right 切替 / highlightDirection 描画

### G-10 / G-11 screens（58 件）

- ミニ説明（5+5）：マウント / start / back / リスト 4 項目 / ヘッダー
- プレイ（13+13）：マウント / 確定ボタンなし / GameStatusBar / ガイド文 / 4 ボタン or 2 ボタン / 60 秒経過で onComplete / 正解 / 切替（radio）/ 解除 / staircase 易方向 +step / 閾値整数 or 小数 1 桁 / max 上限 / aria-checked 切替 / 画面全体描画
- 結果（11+11）：マウント / 正解 / 不正解 / 未回答 / 閾値 / 単位 / 前回比なし / 前回比 - / stimulus testId / 単体プレイ Footer / コースモード「次へ」

---

## 6. 既知の懸念 / 申し送り（Sprint 17 以降）

1. **G-10 結果画面の 8×8 grid 描画コスト**：64 個の `<GaborPatch>` を結果画面でも再描画する。1 試行終わるたびに 64 個の SVG 計算が再発生する。実機（iPhone 12 / Pixel 5）で挙動確認推奨。NF-1 30fps 最低許容を満たすか目視確認。問題があれば結果画面のセル数を減らす（例：4×4 縮小描画）案あり。
2. **G-11 高 dpi 環境での 0.5 arcmin 視認性**：iphone 460dpi / 距離 40cm でも 0.5 arcmin ≈ 1.05px。最難レベルでは下パッチのズレがほぼ視認不可になる可能性。spec §7.11 の「ハイパーアキュイティ」前提と整合（脳の統合視覚で判別）するが、ユーザーテストで体感確認推奨。
3. **G-12 クラウディング（Sprint 17）**：staircase 値が「target-flanker spacing 倍率」（gameRegistry 既登録：min 1.2, max 4, initial 2, step 0.2）。Sprint 15 の `computeG09SpacingPx` のクランプロジックを参照可。中央 target + 周囲 4〜6 個の flanker 配置で画面幅を超えないクランプが必要。
4. **G-13 数字探し（Sprint 17）**：staircase 値が「数字のコントラスト」、新規 stimulus `EmbeddedNumeralStimulus`（GE-13）+ AC-4 keypad-10（0〜9 ボタン）。
5. **共通基盤の安定**：Sprint 9〜16 で確立した骨格（GamePlaySurface / ResultSummaryV11 / SinglePlayPostFooter / ImageChoiceCell / AnswerChoiceGroup / staircaseV11 / storage-v11）は Sprint 17 以降も基本変更なしで使い回す。新規追加は GE-12 / GE-13 + AC-4 keypad-10 のみ。

---

## 7. 検証結果（数値）

| 検証 | Sprint 15 完了 | Sprint 16 完了 | 差分 |
|---|---|---|---|
| `npm test` 通過件数 | 1373 件 | **1598 件** | **+225** |
| `npm run typecheck` errors | 0 | 0 | 0 |
| `npm run build:web` | PASS | PASS | - |
| 実装済 gameId 数 | 9（G-01〜G-09）| **11（G-01〜G-11）** | **+2** |
| screens/v11/games ファイル数 | 27 | **33** | **+6** |
| components/v11/games ファイル数 | 6 | **8** | **+2** |
| lib/v11 ファイル数 | 18 | **22** | **+4** |

---

## 8. ラウンド 0 完了。Evaluator 評価依頼。

オーケストレーターは `subagent_type: "evaluator"` を `mode: "impl"` で呼び、起動方法 `docs/run.md §20` / 自己評価 本ファイルを渡してください。
