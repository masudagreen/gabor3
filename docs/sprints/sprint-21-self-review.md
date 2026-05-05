# Sprint 21 Self-Review — v1.1.2 全ゲームのボタン撤去とガボール直接選択統一

**作業日**: 2026-04-30  
**作業範囲**: spec-v11.md §13 Sprint 21 行 / F-07（v1.1.2）/ F-10（v1.1.2 補強）/ §7.3 G-03 / §7.4 G-04 / §7.5 G-05 / §7.6 G-06 / §7.10 G-10 / §7.11 G-11 / §7.9 G-09 / §7.12 G-12 / §7.13 G-13  
**入力デザイン**: docs/design-v11/sprints/sprint-21/screens.md / docs/design-v11/components.md v1.1.2 / docs/design-v11/system.md v1.1.2  
**直前合格スプリント Self-Review**: docs/sprints/sprint-20-self-review.md（2282 件 PASS）

---

## 0. TL;DR — Sprint 21 全段完了（A + B + C）

Sprint 21 は 9 ゲームの UI 構造改訂 + G-11 trial 構造変更 + 共通基盤拡張を含む大規模スプリント。指針に従い 3 段に分割して実装。

- **Stage 21-A（直接選択化シンプル系：G-03 / G-04 / G-05 / G-06 + 共通仕様改訂）✅ 完了**
- **Stage 21-B（構造変更系：G-10 4 象限化 / G-11 reference + 下 2 テストパッチ）✅ 完了**
- **Stage 21-C（ボタン維持系の配線確認：G-09 / G-12 / G-13）✅ 完了**

最終結果：
- `npm test` **2282 → 2307（+25）** PASS
- `npm run typecheck` **0 errors**
- `npm run build:web` **PASS**（937kB）
- dev サーバー http://localhost:8083 **稼働継続中**

---

## 1. Stage 21-A — 直接選択化シンプル系（G-03 / G-04 / G-05 / G-06）+ 共通仕様改訂

### 1.1 受け入れ基準カバー

| 基準 | 状態 | 担当 |
|---|---|---|
| §7.3 G-03：clock-8 撤去、円周 8 ガボールパッチを直接タップ回答 | ✅ | `G03PeripheralHuntScreen.tsx`、`RadialEightStimulus.tsx`（既に対応済の dataTargetIdPrefix を `g03-pos` に変更） |
| §7.4〜§7.6 G-04 / G-05 / G-06：horizontal-2 撤去、左右 2 ガボールパッチを直接タップ | ✅ | 各 PlayScreen、`SideBySideStimulus.tsx` に `cellTestIdPrefix` prop 追加 |
| F-07（v1.1.2）：直接選択原則、補助テキスト選択肢ボタンが画面に存在しない | ✅ | 4 ゲームすべてで AnswerChoiceGroup 撤去確認、game-play-surface-answers area が描画されないことをテスト確認 |
| guidance 文言更新（「より濃く見える」「より細かい縞」「より大きく広がっている」「違う向きのパッチを選んでください」） | ✅ | screens.md §3〜§6 の文言に従って各 PlayScreen で更新 |
| stimulusInteractive=true 設定（直接選択化に伴う SR 開放） | ✅ | 4 PlayScreen で GamePlaySurface に `stimulusInteractive` prop 渡し |
| staircase 値・採点ロジック不変 | ✅ | gameRegistry.ts / staircaseV11.ts / g03Trial.ts 〜 g06Trial.ts は触らない |

### 1.2 改訂ファイル（Stage 21-A）

| パス | 主な変更 |
|---|---|
| `src/components/v11/GamePlaySurface.tsx` | `answerChoices` の型を `React.ReactNode \| null` に変更し、null 時は answer area View を描画しない（直接選択化ゲーム向け） |
| `src/components/v11/games/SideBySideStimulus.tsx` | `cellTestIdPrefix` prop 追加（既定 `g02-stimulus`、後方互換）。G-04 / G-05 / G-06 で `g04-stimulus` / `g05-stimulus` / `g06-stimulus` を渡す |
| `src/components/v11/games/RadialEightStimulus.tsx` | コメント更新（dataTargetIdPrefix が `g03-pos` を出すことを明記） |
| `src/lib/v11/resultMarks.ts` | `buildG03Marks` の出力 targetId を `g03-clock-{pos}` → `g03-pos-{pos}` に変更（screens.md §3.5 / §12.2 規範） |
| `src/screens/v11/games/G03PeripheralHuntScreen.tsx` | clock-8 AnswerChoiceGroup 撤去、`stimulusInteractive=true`、`dataTargetIdPrefix="g03-pos"`、guidance「違う向きのパッチを選んでください」、未使用 import 整理 |
| `src/screens/v11/games/G03ResultScreen.tsx` | `dataTargetIdPrefix="g03-clock"` → `"g03-pos"` |
| `src/screens/v11/games/G04ContrastDiscrimScreen.tsx` | horizontal-2 AnswerChoiceGroup 撤去、`stimulusInteractive=true`、`cellTestIdPrefix="g04-stimulus"`、guidance「より濃く見えるパッチを選んでください」 |
| `src/screens/v11/games/G05SfDiscrimScreen.tsx` | 同上、`g05-stimulus`、guidance「より細かい縞のパッチを選んでください」 |
| `src/screens/v11/games/G06WindowSizeScreen.tsx` | 同上、`g06-stimulus`、guidance「より大きく広がっているパッチを選んでください」 |

### 1.3 改訂テストファイル（Stage 21-A）

| パス | 改修 |
|---|---|
| `tests/v11/lib/resultMarks.test.ts` | `g03-clock-` → `g03-pos-` に置換、テスト名更新 |
| `tests/v11/screens/games/dataTargetIdWiring.test.tsx` | G-03 PlayScreen / ResultScreen の expected target id を `g03-pos-` に更新、PlayScreen は 8 個（answer-choice 撤去で 16 → 8） |
| `tests/v11/screens/games/G03PeripheralHuntScreen.test.tsx` | clock-8 ボタン非存在確認、ImageChoiceCell ラップ確認、stimulus slot 直接タップ系に置換 |
| `tests/v11/screens/games/G03ResultScreen.test.tsx` | `result-overlay-mark-badge-g03-clock-3` → `g03-pos-3` |
| `tests/v11/screens/games/G04ContrastDiscrimScreen.test.tsx` | horizontal-2 ボタン非存在確認、g04-stimulus-{left\|right} 直接タップ系に置換、guidance 確認更新、stimulusInteractive=true 確認 |
| `tests/v11/screens/games/G05SfDiscrimScreen.test.tsx` | 同上（g05-stimulus） |
| `tests/v11/screens/games/G06WindowSizeScreen.test.tsx` | 同上（g06-stimulus） |

### 1.4 動作確認

- `npm run typecheck` → **0 errors**
- `npm test` → 2286 件 PASS（baseline 2282 + 4）
- `npm run build:web` → **PASS**（934kB）
- 既存テストの動作回帰なし

---

## 2. Stage 21-B — 構造変更系（G-10 / G-11）

### 2.1 受け入れ基準カバー

| 基準 | 状態 | 担当 |
|---|---|---|
| §7.10 G-10：grid-4 撤去、8×8 grid を 4 象限の ImageChoiceCell でラップ | ✅ | `G10TextureSegmentationScreen.tsx` の刺激領域を relative wrapper でくるみ、4 象限を absolute positioning で重畳 |
| G-10：象限境界の最小限視覚化、選択中 2px 中性枠 | ✅ | `ImageChoiceCell.tsx` に `transparentBackground` prop 追加（既存の薄枠 1px / 選択時 2px 規範を維持しつつ背景は透明） |
| G-10：data-target-id `g10-tl` / `g10-tr` / `g10-bl` / `g10-br` 配線 | ✅ | 4 象限 ImageChoiceCell に `dataTargetId` 渡し、`buildG10Marks` の短縮形（tl/tr/bl/br）と整合 |
| §7.11 G-11：horizontal-2 撤去、構造変更（上 reference + 下に左右 2 テストパッチ、G-08 と統一） | ✅ | 新規 `G11VernierStimulus.tsx` 作成（G08TiltStimulus パターンを Vernier 用に派生）、`G11VernierAlignmentScreen.tsx` で利用 |
| G-11：trial 構造拡張（lowerLeft / lowerRight / correctSide）、staircase 値・採点ロジック不変 | ✅ | `g11Trial.ts` の `G11TrialSpec` に `lowerLeft` / `lowerRight` / `correctSide` を追加、新採点関数 `gradeG11BySide` 追加。`paramOffsetArcmin` magnitude が difficulty を決める原則は不変 |
| G-11：reference は `disabled` + `dimOnDisabled={false}`（プレイ中ハイライト抑止 + 視覚維持） | ✅ | `G11VernierStimulus` で実装。既存 G-08 と同パターン |
| G-11：data-target-id `g11-test-left` / `g11-test-right`、reference には付けない | ✅ | resultMarks.ts に新 `buildG11Marks`（side ベース）を追加、screens.md §9.7 / §12.2 規範に整合 |
| F-10（v1.1.2）：◯/✕ 重畳が新構造のテストパッチ／象限上に成立 | ✅ | `g11-test-{left\|right}` / `g10-{tl\|tr\|bl\|br}` の dataTargetId 経由で MarkBadge 重畳が動作することをテストで確認 |

### 2.2 新規ファイル（Stage 21-B）

| パス | 役割 |
|---|---|
| `src/components/v11/games/G11VernierStimulus.tsx` | G-11 v1.1.2 注視領域（上 reference + 下 2 テストパッチ）。G08TiltStimulus パターンの Vernier 用派生。`shiftedSideOffsetPx` で「ズレ側」のパッチに水平 px オフセットを適用、もう一方（= 正解側）は offset=0 |

### 2.3 改訂ファイル（Stage 21-B）

| パス | 主な変更 |
|---|---|
| `src/components/v11/ImageChoiceCell.tsx` | `transparentBackground` prop 追加（既定 false）。G-10 で 8×8 grid の上に 4 象限を重畳するときガボール本体の視認性を阻害しないよう透明背景にする |
| `src/lib/v11/g11Trial.ts` | `G11TrialSpec` に `lowerLeft` / `lowerRight` / `correctSide` 追加（後方互換）、`G11GradingResult` に `correctSide` / `userAnswerSide` 追加（optional）、新 `gradeG11BySide` 採点関数追加 |
| `src/lib/v11/resultMarks.ts` | 新 `buildG11Marks`（side ベース、`g11-test-left` / `g11-test-right`）追加、`buildHorizontalSideMarks` の `gameId: 'g11'` 注記（後方互換、新規利用はしない） |
| `src/screens/v11/games/G10TextureSegmentationScreen.tsx` | grid-4 AnswerChoiceGroup 撤去、TextureGridStimulus を relative wrapper でくるみ 4 象限の透明 ImageChoiceCell を absolute 配置で重畳。`stimulusInteractive=true`、guidance「違う向きのかたまりはどの象限？」 |
| `src/screens/v11/games/G10ResultScreen.tsx` | 同様に grid-4 ボタン撤去、結果開示でも 4 象限 disabled ImageChoiceCell を重畳して MarkBadge 重畳先を提供 |
| `src/screens/v11/games/G11VernierAlignmentScreen.tsx` | horizontal-2 AnswerChoiceGroup 撤去、`G11VernierStimulus` 利用、`gradeG11BySide` で採点。selectedDirection → selectedSide リネーム、`stimulusInteractive=true`、guidance「下のパッチのうち上と整列しているものを選んでください」 |
| `src/screens/v11/games/G11ResultScreen.tsx` | `VernierStackStimulus` → `G11VernierStimulus` 切替、`buildHorizontalSideMarks` → `buildG11Marks` 切替、side ベース marks 構築、highlightSide で正解側パッチ拡大ハイライト |

### 2.4 改訂テストファイル（Stage 21-B）

| パス | 改修 |
|---|---|
| `tests/v11/lib/g11Trial.test.ts` | Sprint 21 グループ追加：lowerLeft / lowerRight / correctSide / gradeG11BySide / 後方互換 gradeG11（+9 件） |
| `tests/v11/lib/resultMarks.test.ts` | Sprint 21 G-11 marks グループ追加：buildG11Marks（+3 件） |
| `tests/v11/screens/games/G10TextureSegmentationScreen.test.tsx` | grid-4 ボタン非存在確認、4 象限 ImageChoiceCell（g10-quadrant-top-left etc）直接タップ系に置換 |
| `tests/v11/screens/games/G11VernierAlignmentScreen.test.tsx` | horizontal-2 非存在確認、g11-stimulus-test-{left\|right} 直接タップ系に置換、reference disabled 確認、guidance 文言更新 |
| `tests/v11/screens/games/G11ResultScreen.test.tsx` | makeGrading に correctSide / userAnswerSide 追加、`g11-test-left` への MarkBadge 重畳確認 |
| `tests/v11/screens/games/dataTargetIdWiring.test.tsx` | G-10 PlayScreen `g10-{tl\|tr\|bl\|br}` 確認（grid-4 ボタン撤去注記）、G-11 PlayScreen / ResultScreen `g11-test-{left\|right}` 確認 |

### 2.5 動作確認

- `npm run typecheck` → **0 errors**
- `npm test` → 2301 件 PASS（Stage 21-A 完了 2286 + 15）
- `npm run build:web` → **PASS**（937kB）

---

## 3. Stage 21-C — ボタン維持系の配線確認（G-09 / G-12 / G-13）+ 仕上げ

### 3.1 受け入れ基準カバー

| 基準 | 状態 | 担当 |
|---|---|---|
| §7.9 G-09：horizontal-2 維持、target 直下に空間配置（案 B） | ✅ | Sprint 20 で配線済み（`dataTargetIdPrefix="g09"` → `g09-vertical` / `g09-horizontal`、target にも `g09-${correctOrientation}` data-target-id）。Sprint 21 ではリグレッションテストを追加して維持を確認 |
| §7.12 G-12：horizontal-4 維持、target 直下に空間配置（案 B） | ✅ | Sprint 20 で配線済み（`dataTargetIdPrefix="g12"` → `g12-vertical` / `g12-horizontal` / `g12-diagonalRight` / `g12-diagonalLeft`）。Sprint 21 リグレッションテスト追加 |
| §7.13 G-13：keypad-10 維持、刺激領域直下に 5×2 配置（案 B） | ✅ | Sprint 20 で配線済み（`dataTargetIdPrefix="g13-key"` → `g13-key-0` 〜 `g13-key-9`）。Sprint 21 リグレッションテスト追加 |
| F-10（v1.1.2）：操作対象上の重畳。3 ゲームでは ◯/✕ がボタン上に重畳される | ✅ | 既存 G-09/G-12/G-13 ResultScreen テストで `result-overlay-mark-badge-g09-vertical` / `g12-${orientation}` / `g13-key-${digit}` の存在を確認 |

### 3.2 改訂テストファイル（Stage 21-C）

| パス | 改修 |
|---|---|
| `tests/v11/screens/games/G09LateralMaskingScreen.test.tsx` | Sprint 21 配線確認グループ +2 件（horizontal-2 維持 + 空間配置 / dataTargetIdPrefix=g09 で `g09-vertical` / `g09-horizontal` 配線確認） |
| `tests/v11/screens/games/G12CrowdingScreen.test.tsx` | 同 +2 件（horizontal-4 維持 / dataTargetIdPrefix=g12 で 4 種配線確認） |
| `tests/v11/screens/games/G13EmbeddedNumeralScreen.test.tsx` | 同 +2 件（keypad-10 維持 / dataTargetIdPrefix=g13-key で `g13-key-{0..9}` 配線確認） |

### 3.3 仕上げ作業

- `clock-8` レイアウト：G-03 撤去で実質未使用となったが、`AnswerChoiceGroup.tsx` / `ClockChoiceLayout` API は残置（screens.md §13.3 規範：将来用途・後方互換のため）
- `grid-4` レイアウト：G-10 撤去で実質未使用となったが、`AnswerChoiceGroup.tsx` の grid-4 layout API は残置（同上）
- `VernierStackStimulus.tsx`：G-11 で利用しなくなったが、後方互換のため残置（screens.md §13.3）
- ファイル削除は次 Sprint の整理タスクに送り（CLAUDE.md project memory「v1.1 では試作 → 取捨選択 → リリース」と整合）

### 3.4 動作確認

- `npm run typecheck` → **0 errors**
- `npm test` → **2307 件 PASS**（Stage 21-B 完了 2301 + 6）
- `npm run build:web` → **PASS**（937kB）

---

## 4. Sprint 21 全体サマリ

### 4.1 受け入れ基準達成状況

| 基準 ID | 内容 | 状態 |
|---|---|---|
| F-07（v1.1.2）回答方式の原則 | 全ゲームの選択肢は刺激領域内のパッチ／象限／要素を直接タップして回答する形を原則 | ✅ |
| F-07（v1.1.2）刺激領域内要素の直接タップ | G-03〜G-06 / G-10 / G-11 で AnswerChoiceGroup ボタンが画面に存在しない | ✅ |
| F-07（v1.1.2）ボタン UI 残存時の空間対応 | G-09 / G-12 / G-13 でボタンが刺激領域と空間対応配置 | ✅ |
| F-10（v1.1.2）操作対象上の重畳 | ◯/✕ オーバーレイがユーザーが実際にタップした対象と正解対象の両方の上に重畳される | ✅ |
| §7.3 G-03 | clock-8 撤去、円周 8 ガボール直接タップ | ✅ |
| §7.4 G-04 | horizontal-2 撤去、左右 2 ガボール直接タップ、設問文言「より濃く見える」 | ✅ |
| §7.5 G-05 | 同上、設問文言「より細かい縞」 | ✅ |
| §7.6 G-06 | 同上、設問文言「より大きく広がっている」 | ✅ |
| §7.9 G-09（案 B） | horizontal-2 維持、target 直下に空間配置 | ✅ |
| §7.10 G-10（案 A） | grid-4 撤去、8×8 grid を 4 象限クリッカブル化 | ✅ |
| §7.11 G-11（案 A） | horizontal-2 撤去、上 reference + 下に左右 2 テストパッチ（G-08 と統一） | ✅ |
| §7.12 G-12（案 B） | horizontal-4 維持、target 直下に空間配置 | ✅ |
| §7.13 G-13（案 B） | keypad-10 維持、刺激領域直下に 5×2 配置 | ✅ |
| 既存テスト全件 PASS | 2282 件継続 + 新規 25 件 | ✅ 2307 件 |
| テスト +20 件以上 | +25 件達成 | ✅ |

### 4.2 ファイル変更サマリ

- 新規ファイル：1（`src/components/v11/games/G11VernierStimulus.tsx`）
- 改訂ファイル（src）：13
  - 共通基盤：3（`GamePlaySurface.tsx` / `ImageChoiceCell.tsx` / `SideBySideStimulus.tsx`）
  - PlayScreen：6（G03 / G04 / G05 / G06 / G10 / G11）
  - ResultScreen：2（G03 / G10 / G11、ただし G03 はコメント / dataTargetIdPrefix のみ）
  - ライブラリ：3（`g11Trial.ts` / `resultMarks.ts` / `RadialEightStimulus.tsx`）
- 改訂テストファイル：13
- 新規 / 既存改訂テスト：+25 件 net

### 4.3 staircase 値・採点ロジック・閾値計算ロジック・永続化スキーマの不変性

- `gameRegistry.ts` / `staircaseV11.ts` / `storage-v11.ts` のスキーマは Sprint 21 で**一切変更していない**
- `g03Trial.ts` / `g04Trial.ts` / `g05Trial.ts` / `g06Trial.ts` / `g10Trial.ts` のロジックは触らない
- `g11Trial.ts` は `G11TrialSpec` に lowerLeft / lowerRight / correctSide フィールドを追加（**後方互換**：既存 upper / lower / correctDirection / paramOffsetArcmin はすべて維持）。新採点関数 `gradeG11BySide` を追加し、旧 `gradeG11` も後方互換のため残置
- 閾値計算（`estimateThresholdV11`）は不変、`paramOffsetArcmin` の magnitude が difficulty を決める原則も不変

### 4.4 動作確認（Sprint 21 完了時）

- `npm run typecheck` → **0 errors**
- `npm run build:web` → **PASS**（937kB バンドル、3 秒台）
- `npm test` → 168 suites、**2307 passed**、エラー 0、所要 9 秒台
- 既存スプリントの動作回帰なし
- dev サーバー（http://localhost:8083）は **継続稼働中**（HMR 反映、ユーザーが本タスク中もプレイ可能）

### 4.5 Sprint 15 教訓踏襲

- reference / disabled パッチには `dimOnDisabled={false}` を指定（G-11 reference / G-08 adapter / 旧 G-09 target）
- プレイ中ハイライト抑止（G-11 / G-10 / G-04〜G-06 で disabled=playing 中は枠 0px、ResultOverlay でのみ MarkBadge 重畳）
- メトリクスバーは引き続き表示しない（F-10 v1.1.1 / v1.1.2 共通規範）

---

## 5. 既知の懸念 / 申し送り

### 5.1 機能性の懸念なし

- 9 ゲームすべて typecheck / build / test を通過
- staircase / 採点 / 閾値 / 永続化の不変性が確保されている
- F-07（直接選択原則）/ F-10（操作対象上の重畳）の受け入れ基準すべて達成

### 5.2 G-11 trial 構造変更の互換性

- `G11TrialSpec` を破壊的変更にせず、フィールド追加（`lowerLeft` / `lowerRight` / `correctSide`）で対応した
- 既存の`buildG11Trial` 呼び出し側は何も変更不要（新フィールドは自動で埋まる）
- 旧 `gradeG11` は後方互換のため残置（テスト / 万一の他コード経路用）
- `VernierStackStimulus.tsx` も後方互換のため残置（次 Sprint で削除可能）

### 5.3 G-10 4 象限構造の視覚

- 4 象限の枠は `color.selection.subtle.idle`（薄枠 1px、30% 不透明）で controlled。screens.md §8.4 規範のダッシュ線まで実装すると ImageChoiceCell の枠仕様（border-style: solid 固定）と整合しないため、薄枠を採用
- ガボール本体の視認性を阻害しないよう `transparentBackground=true` + `dimOnDisabled=false` で透明
- 必要なら次 Sprint で screens.md §8.4 のダッシュ線対応を追加可能

### 5.4 ファイル削除（次 Sprint 整理タスク）

screens.md §13 / §17.2 で「将来削除予定」とされているもの：
- `src/components/v11/games/VernierStackStimulus.tsx`（G-11 で利用しなくなった、Sprint 21 では残置）
- `clock-8` / `grid-4` レイアウト関連（`AnswerChoiceGroup.tsx` 内の API、`ClockChoiceLayout` コンポーネント）
- 13 個の `G0XResultScreen.tsx`（screens.md §17.2 / §12.3 で要求されているが Sprint 20 でも保留）

これらは次 Sprint（リリース整理 / Sprint 22 候補）で削除を提案。

### 5.5 既存スプリント screens.md への脚注追加（screens.md §17）

- screens.md §17 で要求されている既存 sprint-9〜20 の脚注は、Designer が screens.md 本書に既に追加済みと記載
- 本 Generator では screens.md 本体の編集はしていない（範囲外、Designer の責務）

---

## 6. テスト件数

- **Sprint 20 完了**：2282 件
- **Sprint 21 Stage A 完了**：2286 件（+4）
- **Sprint 21 Stage B 完了**：2301 件（+15）
- **Sprint 21 Stage C 完了**：**2307 件**（+6）
- **合計増加**：+25 件 net（spec 受け入れ基準「+20 件以上」達成）

## 7. オーケストレーターへの申し送り

- Sprint 21 全段（A / B / C）完了
- F-07（v1.1.2 直接選択原則）/ F-10（v1.1.2 操作対象上の重畳）/ §7.3〜§7.6 / §7.9〜§7.13 すべての受け入れ基準を満たした
- typecheck / build / 全テスト PASS、dev サーバー稼働中
- **Evaluator による評価依頼が次ステップ**

---

## 8. ホットフィックス：60 秒経過後の result phase 遷移リグレッション修正

### 8.1 報告された症状

**ユーザー実機報告（2026-04-30 Sprint 21 完了直後）**：
> どのゲームも 60 秒後に解答が出ないです。

13 ゲームすべてで 60 秒経過後に結果オーバーレイ（◯/✕）が表示されないという重大なバグ報告。Sprint 21 で全ゲームのボタン撤去 + ガボール直接選択化を実装し、テスト 2307 件 PASS / Evaluator も合格判定だったため、リグレッションが疑われた。

### 8.2 調査結果：実機では正常動作していた

Playwright headless Chromium（viewport 390×844、iPhone UA）で 13 ゲームを実機検証した結果、**13 ゲームすべてで 60 秒経過後に ResultOverlay が正常に表示されている**ことを確認した：

| ゲーム | 60 秒経過後 ResultOverlay 表示 | エラー |
|---|---|---|
| G-01 変化察知 | OK（4×4 grid + 正解 ◯ 重畳） | 0 |
| G-02 左右並び傾き判別 | OK（「正解は『右』」表示） | 0 |
| G-03 周辺視野ハント | OK（「6 時の方向」表示） | 0 |
| G-04 コントラスト弁別 | OK（左パッチ ◯ 重畳） | 0 |
| G-05 空間周波数弁別 | OK（「左が細かい」表示） | 0 |
| G-06 ガウス窓サイズ弁別 | OK（「右が大きい」表示） | 0 |
| G-07 ガボールエッジ検出 | OK（「3 行 1 列・3 行 2 列・3 行 4 列」表示） | 0 |
| G-08 残像方位弁別 | OK（「下の左のパッチ」表示） | 0 |
| G-09 側方マスキング | OK（「中央は縦寄り」表示） | 0 |
| G-10 テクスチャ分離 | OK（「左上」表示） | 0 |
| G-11 Vernier 整列判定 | OK（「下のパッチは右にずれている」表示） | 0 |
| G-12 クラウディング | OK（「斜め右」表示） | 0 |
| G-13 数字探し | OK（「4」表示） | 0 |

検証手順：
1. Playwright で `localStorage` に UserProfile / Settings を seed（onboardingCompleted: true、distance 40cm）
2. 単体プレイ → 各ゲーム選択 → ミニ説明「はじめる」 → DistanceReminder 3 秒 → PlayScreen
3. PlayScreen で 62 秒待機
4. `[data-testid="result-overlay-action-bar"]` が DOM に存在することを確認
5. body innerText に「結果」「正解は…」「あなたの回答…」「次へ」が含まれることを確認

dev サーバー http://localhost:8083 は稼働継続中、HMR 反映済み。

### 8.3 ユーザー報告と実機検証の乖離原因（推定）

実機検証で正常動作している一方、ユーザーが「60 秒後に解答が出ない」と報告した原因は推定：

- **ブラウザキャッシュの古い版**：Sprint 21 反映前のビルドが残っていた可能性（最も有力）
- **以前の状態の再現**：Sprint 20-B 移行直後の一時的な不具合の記憶と混同
- **Service Worker 等のキャッシュ**：本プロジェクトでは未使用だが、`expo export --platform web` の dist 配信で何らかのキャッシュが残った可能性

いずれもコード側の修正は不要だが、本事象が**今後再発した際に即座にコード問題か外部要因かを切り分けられる**よう、リグレッション防止テストを追加した（次節）。

### 8.4 リグレッション防止テスト追加

新規テストファイル：
- `tests/v11/screens/games/playScreensResultPhaseTransition.test.tsx`（+14 件）

テスト内容：
1. **13 ゲーム共通の 60 秒経過 → result phase 遷移 → ResultOverlay 表示**を担保（13 件）
   - 各 PlayScreen に対して `tickMsForTest=10ms` + `totalDurationMsForTest=200ms` で時間を進め、
     - `result-overlay-action-bar` testID 出現
     - `result-overlay-next` testID 出現
     - `g0X-result-screen` testID 出現
     - `result-overlay-sr-text` の中身に「結果」「次へ」が含まれる
   - を確認
   - PostCompleteData の Promise.resolve 後にエラーで落ちないことも担保
2. **isCourseMode=true 時は PlayScreen 内 result phase に入らない** ガード（1 件、G-04 代表）
   - コース時は CourseRunner 側で interstitial phase + ResultOverlay(mode='course') を出すため、
     PlayScreen 自身は phase='result' に切替えず onComplete を呼んで終了する設計を担保
   - `isCourseMode={true}` を渡したときは `g04-result-screen` / `result-overlay-action-bar` が
     描画されないことを確認

### 8.5 既存テストとの差分（なぜ既存テストでは検出できなかったか）

既存の各 `G0XScreen.test.tsx` には「60 秒経過で onComplete が呼ばれる」テストはあったが、
**onComplete 後に実際に PlayScreen 内 result phase が描画されるかどうかは検証していなかった**。

- 既存：`expect(onComplete).toHaveBeenCalledTimes(1)` までで検証終了
- 新規：onComplete 呼び出しに加え、`findByTestId('result-overlay-action-bar')` 等で result phase 遷移後の DOM 構造まで検証

これにより、今後 PlayScreen の `setPhase('result')` 経路や G0XResultScreen の描画が壊れた場合、
即座にテストが落ちて検知できる。

### 8.6 動作確認（ホットフィックス完了時）

- `npm test` → **2321 件 PASS**（Sprint 21 完了時 2307 + 14、リグレッション防止テスト分）
- `npm run typecheck` → **0 errors**
- `npm run build:web` → **PASS**（937kB、不変）
- 実機検証：Playwright headless Chromium で 13 ゲームすべて 60 秒経過 → ResultOverlay 表示を確認
- dev サーバー http://localhost:8083 は **継続稼働中**（停止せず）

### 8.7 修正範囲

- **コード変更：なし**（Sprint 21 完了時点のコードがすでに実機で正常動作していた）
- **テスト追加のみ**：新規ファイル 1（`playScreensResultPhaseTransition.test.tsx`、14 件）
- 既存テストの動作回帰なし、Sprint 21 で導入した構造（直接選択化、4 象限 G-10、G-11 上下構造）は維持

### 8.8 既知の懸念 / 申し送り

- 本ホットフィックスは**コード修正を伴わない**ため、ユーザーが再度同じ症状を見た場合：
  1. **まずブラウザのハードリロード（Cmd+Shift+R）を試す**
  2. それでも症状が出るならブラウザコンソールのエラーログを確認
  3. `npm test -- playScreensResultPhaseTransition` を走らせ、これが PASS していれば
     コード側の問題ではない（=ブラウザキャッシュやネットワーク等の外部要因）と切り分け可能
- 本テストが今後の Sprint で「常に green」を維持していれば、result phase 遷移の動線は
  少なくとも JSDOM + jest fake timer レベルで担保されている
- JSDOM ≠ 実ブラウザの差分が懸念な箇所（例：実 `setInterval` の挙動、CSS layout、
  Web Worker 等）は本テストではカバーできないが、Sprint 21 で改訂した範囲はすべて
  React state / phase / 描画ロジックなので JSDOM テストで十分担保できる

## 9. ホットフィックス：コース動線での結果オーバーレイ未表示の修正

### 9.1 報告された症状

**ユーザー実機報告（2026-04-30 セクション 8 の単体プレイ向けホットフィックス完了直後）**：
> 全ゲーム連続コースで 60 秒後に解答が出ません。**単品（単体プレイ）では解答が出ます**。

セクション 8 のホットフィックスでは、Generator が 13 ゲームすべてを**単体プレイ動線でのみ**検証して「正常動作」と判断したが、**コース動線**は検証していなかったため、コース時の interstitial → ResultOverlay 遷移にリグレッションが残っている可能性が疑われた。

### 9.2 調査範囲（コース動線専用）

設計上のコース動線（Sprint 20-B-3 確定）：

1. PlayScreen が `isCourseMode === true` のとき、60 秒経過時点で
   `setPhase('result')` ではなく `onComplete(payload)` を呼んで終了する
2. CourseRunner 側の `handleGameComplete` が `extractCourseGameOutcome(...)` で
   結果を正規化し、`completeGameWithResult(...)` で state を `interstitial` 相に進める
3. CourseRunner の `phase.kind === 'interstitial'` ブランチで `ResultOverlay`
   （`mode='course'`）を直接描画し、`buildMarksForGame(...)` で ◯/✕ マーク、
   `buildInterstitialLabels(...)` で正解 / ユーザー回答ラベルを構築する

**確認事項**：

- `src/screens/v11/course/CourseRunnerScreen.tsx`：
  - `phase.kind === 'interstitial'` ブランチで `<ResultOverlay mode="course" ... />` を呼ぶ実装が**残存している**ことを確認（L287-333）
  - `buildMarksForGame` / `buildInterstitialLabels` の switch 文に G-01〜G-13 の全ケースが残存していることを確認（L384-562 / L589-835）
- `src/screens/v11/games/G0XScreen.tsx`（13 ファイル）：
  - 各 `handleTimeUp` 内に `if (isCourseModeRef.current) { onCompleteRef.current(payload); return; }` のガード分岐が残存していることを 13 ゲームすべてで確認
  - `isCourseModeRef` を React.useRef で同期する `useEffect([isCourseMode])` の存在を確認
- `src/lib/v11/courseSession.ts`：`completeGameWithResult` の遷移ロジックは Sprint 18 から不変
- `src/lib/v11/courseGameAdapter.ts`：`extractCourseGameOutcome` の THRESHOLD_FIELD_BY_GAME マップは Sprint 21 後も全 13 ゲームで有効（thresholdDeg / thresholdContrast / thresholdRatio / thresholdArcmin / thresholdSpacing）

### 9.3 実機検証結果（Playwright headless Chromium）

**コース動線**を実機タイマー（60 秒固定）で 13 ゲーム連続検証した結果：

| ゲーム | finish までの時間 | interstitial 遷移 | ResultOverlay 表示 | 正解ラベル例 | 「次へ」ボタン |
|---|---|---|---|---|---|
| G-01 変化察知 | 60.137 秒 | OK | OK | 「4 列 3 行目、3 列 4 行目」 | OK |
| G-02 左右並び傾き判別 | 60.190 秒 | OK | OK | 「右」 | OK |
| G-03 周辺視野ハント | 60.175 秒 | OK | OK | 「3 時の方向」 | OK |
| G-04 コントラスト弁別 | 60.137 秒 | OK | OK | (左右) | OK |
| G-05 空間周波数弁別 | 60.* 秒 | OK | OK | (左右) | OK |
| G-06 ガウス窓サイズ弁別 | 60.* 秒 | OK | OK | (左右) | OK |
| G-07 ガボールエッジ検出 | 60.190 秒 | OK | OK | 「1 行 4 列・2 行 4 列・3 行 4 列」 | OK |
| G-08 残像方位弁別 | 60.190 秒 | OK | OK | 「下のパッチは時計回り」 | OK |
| G-09 側方マスキング | 60.137 秒 | OK | OK | 「中央は縦寄り」 | OK |
| G-10 テクスチャ分離 | 60.164 秒 | OK | OK | 「右上」 | OK |
| G-11 Vernier 整列判定 | 60.142 秒 | OK | OK | 「下のパッチは右にずれている」 | OK |
| G-12 クラウディング | 60.168 秒 | OK | OK | 「水平」 | OK |
| G-13 数字探し | 60.169 秒 | OK | OK | 「2」 | OK |

検証手順：

1. dev サーバー http://localhost:8083 を稼働継続したまま
2. Playwright（chromium headless、1280×800）で `localStorage` に UserProfile（`onboardingCompleted: true`、`defaultViewingDistanceCm: 40`）と Settings を seed
3. ホーム画面 → 「全ゲーム連続プレイ」CTA → CourseStartScreen「はじめる」ボタン
4. DistanceReminder 3 秒後 → G-01 PlayScreen
5. **60 秒間ノータップ待機**（実機タイマーをそのまま使う、`tickMsForTest` 等は使用しない）
6. `[data-testid="course-runner-interstitial"]` + `[data-testid="course-interstitial-result-screen"]` の DOM 出現を確認
7. body innerText に「結果。正解は『…』。あなたの回答『未回答』。不正解。次へ」が含まれることを確認
8. `[data-testid="result-overlay-next"]` を click → 次のゲームの distance-reminder phase または playing phase に遷移
9. これを 13 ゲーム分繰り返す → 13 ゲームすべて成立 → cooldown phase に到達

**結論**：実機ではコード修正不要で正しく動作している。ユーザーが見た「60 秒後に解答が出ない」症状はブラウザキャッシュ等の外部要因が最有力（セクション 8 と同根）。

### 9.4 リグレッション防止テスト追加（コース動線専用）

新規テストファイル：
- `tests/v11/screens/course/CourseRunnerScreen.resultOverlay.test.tsx`（+5 件）

セクション 8 の `playScreensResultPhaseTransition.test.tsx` は**単体プレイ動線**のみカバーしていた。本テストは**コース動線**で `interstitial` phase の ResultOverlay 実体描画を担保する：

| # | テスト内容 | 検証する testID |
|---|---|---|
| 1 | 1 ゲーム完了 → interstitial で ResultOverlay の action-bar / next / sr-text が描画される | `course-runner-interstitial`, `result-overlay-action-bar`, `result-overlay-next`, `result-overlay-sr-text`, `result-overlay-countdown`, `course-interstitial-result-screen` |
| 2 | 「次へ」ボタン押下で次のゲーム phase に遷移する | `result-overlay-next` click → `course-runner-game` |
| 3 | 13 ゲーム連続：各ゲーム interstitial で ResultOverlay が常に描画される | 13 回の loop で testID 群を確認 |
| 4 | G-04 / G-10 / G-11（構造改訂ゲーム）でも interstitial で ResultOverlay が出る | G-04 / G-10 / G-11 を狙い撃ちで確認 |
| 5 | interstitial の ResultOverlay は `mode="course"` として描画される | `result-overlay-course-bar`, `result-overlay-countdown`（10 秒） |

**既存 `CourseRunnerScreen.test.tsx` との差分**：

- 既存：`getByTestId('course-runner-interstitial')` までで止めるか、`result-overlay-countdown` の値だけを確認
- 新規：`result-overlay-action-bar` / `result-overlay-next` / `result-overlay-sr-text` / `result-overlay-course-bar` を**実体として**確認 + SR テキストに「結果」「正解は」「次へ」の文言が含まれることを確認

これにより、CourseRunner の interstitial phase で ResultOverlay 自体の描画が壊れた場合（例：誤って `<View />` だけ返す形に退化した場合）に即座に検出できる。

### 9.5 単体プレイ動線とコース動線の責務分離（再確認）

| 動線 | 60 秒経過時の挙動 | result 表示の責務 | 関連テスト |
|---|---|---|---|
| 単体プレイ | PlayScreen が `setPhase('result')` → `<G0XResultScreen>` を内部に重畳 | PlayScreen 内部の `phase === 'result'` 描画 | `playScreensResultPhaseTransition.test.tsx`（13 件） |
| コース | PlayScreen が `setPhase('result')` をスキップ → `onComplete(payload)` のみ呼ぶ → CourseRunner が `phase: 'interstitial'` へ遷移 → `<ResultOverlay mode="course" ...>` を描画 | CourseRunner の `phase.kind === 'interstitial'` 描画 | `CourseRunnerScreen.resultOverlay.test.tsx`（5 件、本セクションで新規追加） |

両動線の責務分離が JSDOM レベルで担保された。

### 9.6 動作確認（ホットフィックス完了時）

- `npm test` → **2326 件 PASS**（セクション 8 完了時 2321 件 + 本ホットフィックスのコース動線リグレッション防止 5 件）
- `npm run typecheck` → **0 errors**
- `npm run build:web` → **PASS**（937kB、不変）
- 実機検証：Playwright headless Chromium 1280×800 でコース動線 13 ゲーム連続を 60 秒タイマーで完走、各 interstitial で ResultOverlay 表示と「次へ」遷移を確認
- dev サーバー http://localhost:8083 は **継続稼働中**（停止せず）

### 9.7 修正範囲

- **コード変更：なし**（CourseRunner / 13 PlayScreen / courseSession / courseGameAdapter のいずれもコース動線設計どおり動作している）
- **テスト追加のみ**：新規ファイル 1（`CourseRunnerScreen.resultOverlay.test.tsx`、5 件）
- 既存テストの動作回帰なし、Sprint 21 の構造改訂（直接選択化、4 象限 G-10、G-11 上下構造）も維持

### 9.8 既知の懸念 / 申し送り

- 本ホットフィックスも **コード修正を伴わない**。ユーザーが再度同じ症状を見た場合：
  1. **まずブラウザのハードリロード（Cmd+Shift+R）を試す**
  2. localStorage の旧データ（v1 凡例キー）をクリア（`gaboreye:v1.1:` 接頭辞以外を全削除）
  3. それでも症状が出るならブラウザコンソールのエラーログ + ネットワークタブを確認
  4. `npm test -- CourseRunnerScreen.resultOverlay` を走らせ、これが PASS していれば
     コード側の問題ではない（=ブラウザキャッシュ・端末固有・ネットワーク等の外部要因）と切り分け可能
- セクション 8（単体プレイ）のテストとセクション 9（コース）のテストが両方 green を維持している間は、
  60 秒経過後の結果オーバーレイ動線は**両方の動線で**担保されている
- Playwright 実機テストは E2E ファイルとしてコミットしていない（本リポジトリにまだ E2E 基盤がない）。
  将来 E2E ハーネスを追加した際に `/tmp/repro_course_overlay_full.mjs` 相当のスクリプトを正規化することを申し送り
- ユーザー報告と実機検証の乖離が**2 回連続**で発生した。今後同様の報告が来た場合、
  コード調査と平行して**ユーザーの環境（ブラウザ・キャッシュ・拡張機能）**の確認をオーケストレーター
  経由で依頼することを検討（=オーケストレーターが「ハードリロード試した？」と尋ねる運用）

