# Sprint 2 自己評価 — レベルシステム中核ロジック（§4 / F-04）（v3.0）

> v3.0 リブート S2。**純ロジック層のみ**（描画・永続化・UI は S3 以降）。
> 成果物：`src/lib/v3/level.ts`、`tests/lib/v3/level.test.ts`。
> 注：本ファイルは v2.0 の同名レビュー（データ層・設定）を v3.0 S2 内容で上書きしたもの。

## 1. やったこと

`src/lib/v3/level.ts`（新規・v3 名前空間）に以下の純関数群を実装した。v2 の roundGen/scoring/gameMachine は**未削除**（指示通り S4 で撤去）。`rng.ts` 等の流用も今回は不要だったため無改変。

### 1.1 5 変数の値集合とキー（§4.1 確定値）
- `VALUE_SETS`：count=[1,2,3,4] / seconds=[40,35,30,25,20] / direction=['one-way','oscillate'] / gridSize=[3,4] / rotationSpeed=[6,5.5,5,4.5,4,3.5,3,2.5,2]。**各配列はインデックス 0 が最易**（易→難順）。
- `DEFAULT_VARIABLE_ORDER`=['count','seconds','direction','gridSize','rotationSpeed']（最内側→最外側、AS-3）。
- `VariableRanges` 型と `defaultVariableRanges()`（フル範囲ファクトリ）。S2 ではデフォルト=フル範囲を受け取る純関数として構成。
- 型：`VariableKey` / `Direction`（'one-way'|'oscillate'）/ `GridSize`（3|4）/ `LevelParams`。

### 1.2 mixed-radix オドメータ（§4.2）
- `totalLevels(ranges, order?)`：各変数の有効段数の積。
- `levelToParams(level, order?, ranges?)`：L（1始まり）→ 5 変数実値。(L−1) を mixed-radix 展開（最内側=最下位桁、桁の値=易→難配列インデックス）。範囲外は `RangeError`。
- `paramsToLevel(params, order?, ranges?)`：逆変換（S4/バッジ判定の再利用を見越して併設）。

### 1.3 レベル昇降（§4.4 / F-04）
- `LevelState`（§7.3 の形：currentLevel/consecutiveFailures/highestLevel）。
- `initialLevelState()`：{1, 0, 0}（AS-15）。
- `applyResult(levelState, result, ranges?, order?)`：result='clear'|'fail'。`{ levelState, levelDelta }` を返す純関数（引数不変）。
  - clear → consecutiveFailures=0、currentLevel+1（上限 totalLevels クランプ）、highestLevel=max(既存, クリアレベル)。levelDelta=+1（クランプ時 0）。
  - fail 1 回目 → consecutiveFailures=1、レベル不変、levelDelta=0。
  - fail で consecutiveFailures が 2 到達 → currentLevel−1（下限1クランプ）、consecutiveFailures=0、levelDelta=−1（クランプ時 0）。

### 1.4 範囲変更時のクランプ（§4.5 / F-13）
- `clampLevelToRange(currentLevel, newTotalLevels)`：[1, newTotal] にクランプ（number→number）。
- `clampLevelState(levelState, ranges, order?)`：currentLevel を新範囲クランプ＋consecutiveFailures=0 リセット＋highestLevel も新上限クランプ。純関数（引数不変）。

## 2. 確認したこと（自己評価チェックリスト）

| 項目 | 結果 |
|---|---|
| `npm run typecheck`（tsc strict） | **エラー 0 PASS** |
| `npm test`（全体） | **52/53 スイート・517/518 件 PASS**（S2 前 469/470 → 新規 48 件追加） |
| 新規テスト（`tests/lib/v3/level.test.ts`） | **48 件 全 PASS** |
| 既存スプリント回帰 | なし（v2/v1 系・state 系すべて従前通り。唯一の赤は下記の既知 1 件で本 S2 と無関係） |

S2 は App.tsx 未配線の純ロジック追加のため既存 web バンドルへ未参照＝`build:web` 挙動不変。型・テストは緑。

### 既知の赤 1 件（本 S2 と無関係・run.md §V3.4 記載済み）
- `tests/components/v2/SessionResultCard.test.tsx`「セッションスコアを表示する」。コミット `0285ac5` で authored-broken（rAF カウントアップ vs 同期アサートの不整合）。一度も緑になっておらず、S5/S7 で SessionResultCard を v3 化する際に自然解消予定。S2 で導入したものではない。

## 3. 受け入れ基準マッピング（F-04 / §4）

| 受け入れ基準 | 実装 | テスト |
|---|---|---|
| クリアで +1（上限クランプ） | `applyResult` clear 分岐 + `Math.min(.., total)` | 「クリアで +1」「上限でクリアしても +1 されず levelDelta=0」「部分範囲上限クランプ」 |
| 失敗 1 回目はレベル不変 | failures<2 で levelDelta=0 | 「失敗 1 回目はレベル不変」 |
| 2 連続失敗で −1（下限 L1 クランプ）＋カウントリセット | failures>=2 分岐 + `Math.max(..,1)` | 「2 連続失敗で −1」「L1 で 2 連続失敗してもレベル不変 levelDelta=0」 |
| クリアで連続失敗リセット | clear 分岐 consecutiveFailures=0 | 「失敗→クリア→失敗で下がらない」 |
| 連続失敗カウント永続 | LevelState.consecutiveFailures に保持（永続化は S3） | 「連続失敗カウントは永続値」「4 連続失敗で 2 段下がる」 |
| 中断は影響しない | applyResult を呼ばない設計（'clear'\|'fail' のみ受理） | — （呼び出し側 S6 の責務） |
| レベル ⇄ 5 変数 mixed-radix 変換・デフォルト梯子 | `levelToParams` / `paramsToLevel` / `totalLevels` | L1/L2/L4→L5/L20→L21/L40→L41/L80→L81/L720・全 720 一意・往復恒等・部分範囲・代替変化順 |
| 範囲変更時のクランプ＋連続失敗リセット | `clampLevelState` / `clampLevelToRange` | clampLevelState/clampLevelToRange 全ケース |

## 4. テスト件数の増加
- S2 前：全体 470 件（うち 1 赤＝既知）。
- S2 後：全体 **518 件**（**+48**、うち赤は同じ既知 1 件のみ）。新規はすべて `tests/lib/v3/level.test.ts`。

## 5. 既知の制約・申し送り
- **永続化は未実装（S3 担当）**：`LevelState` の `gaboreye:v3:levelState` 読み書き、`Settings.variableRanges`/`variableOrder` の保存・読み込み、F-11 起動時 v3 初期化（currentLevel=1）。本 S2 は純関数のみで AsyncStorage に触れていない。
- **連続失敗の「永続」はデータ型として担保**：`applyResult` は state を読み次 state を返す純関数。アプリ再起動・日跨ぎでの実保持は S3 の永続化に委ねる（型・遷移は S2 で確定）。
- **paramsToLevel を併設**：指示に明記はないが `levelToParams` の逆として 1 関数で完結し、S4 ゲームコア／S8 バッジ判定（levelParams → 高難度判定）で再利用見込み。仕様（§4.2 相互変換）の範囲内であり仕様外機能の追加ではない。
- **VariableRanges の前提**：各配列は VALUE_SETS の部分集合かつ易→難順を保つ前提（S3 の設定 setter で担保）。S2 の純関数はこの前提下で正しく動く。各変数が最低 1 値を持つこと（F-13）の強制は設定 UI 側（S3）の責務。
- `applyResult`/`clampLevelState` のデフォルト引数はフル範囲・デフォルト変化順。S3 以降は実際の `Settings` 由来 ranges/order を渡す。

## 6. 成果物パス
- 実装：`/Users/np_202212_11/projects/gabor3/src/lib/v3/level.ts`
- テスト：`/Users/np_202212_11/projects/gabor3/tests/lib/v3/level.test.ts`
- 自己評価：`/Users/np_202212_11/projects/gabor3/docs/sprints/sprint-2-self-review.md`
