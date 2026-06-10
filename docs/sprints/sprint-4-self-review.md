# Sprint 4 セルフレビュー — v3.0 ゲームコア（生成・選択・クリア判定・振動回転）

> 対象：spec §8 S4 / F-01（ロジック）・F-03（クリア判定）・§4.3（クリア/失敗）・§4.1（5 変数）。
> **ロジック層中心**（描画 UI は S5）。`src/lib/v3/` に新設。App.tsx からは未配線（S5 で接続）。
> v2.0 / v1.x の同名 self-review は git 履歴に保存（本ファイルは v3.0 で上書き）。

## 1. やったこと（追加ファイル）

| ファイル | 役割 |
|---|---|
| `src/lib/v3/patch.ts`（新規） | v3 パッチモデル。回転のみ（cpd 時間変化は廃止）。`patchOrientationAt`（一方向=単調 / 振動=三角波）・`oscillationOffsetDeg`（往復関数）・`normalizeDeg180`・`isChanging`。`OSCILLATION_AMPLITUDE_DEG=30`（体感調整定数） |
| `src/lib/v3/roundGen.ts`（新規） | v3 ラウンド生成。**個数はレベルで確定**（ランダム抽選を廃止）。`generateRound`/`generateRoundFromLevel`/`levelParamsToRoundGen`/`generateSpacedAngles`。回転パッチは全て同じ speed/direction、一方向時 CW/CCW はパッチ独立。静止は離散初期角度で固定 |
| `src/lib/v3/gameMachine.ts`（新規） | v3 ゲーム機械。1 ゲーム=1 ラウンド=1 レベル挑戦。`initGame`/`gameReducer`（TOGGLE/TIMEOUT のみ）・`isAllCorrect`・`deriveReveal`（✅/❌ 分類）。結果は clear/fail の 2 値 |
| `tests/lib/v3/patch.test.ts`（新規） | 振動往復性・振幅・周期・折り返し瞬間停止・角速度保存・一方向/振動/静止の弁別・正規化 |
| `tests/lib/v3/roundGen.test.ts`（新規） | 個数固定・n×n セル数・速度/方向の共通性・静止分散・rng 決定論・levelParams 連携 |
| `tests/lib/v3/gameMachine.test.ts`（新規） | 即時締め切り clear・TIMEOUT fail・revealed 入力無効・終端性・deriveReveal 分類 |

依存：v2 の `rng.ts`（`mulberry32`/`sampleWithoutReplacement`/`randFloat`）を再利用（汎用 PRNG でスコア依存なし）。S2 の `level.ts`（`levelToParams`/`LevelParams`/`Direction`/`GameResult`）を入力にする。

## 2. 振動（往復回転）の実装根拠（NF-28c / system §4.1 / AS-11）

- **三角波**を採用：位相 `sign×speed×t` を周期 `4A`（A=振幅）の三角波に写像。1 往復周期 = `4A/speed` 秒。
- **振幅 A=30°**：system §4.1 の狙い値 ±20°〜±40° の中央。折り返しが明確に観察でき（一方向との弁別）、180° 周期の一巡を跨がない。定数化し体感調整余地を残した（コメントに根拠記載）。
- **狙い 1（一方向との弁別）**：振動は 1 周期で初期角度に戻る／一方向は単調に離れ続ける。テストで往復性・周期復帰を担保。
- **狙い 2（静止との弁別）**：折り返し点で瞬間角速度 0（「一瞬止まって見える」＝振動が難しい根拠）をテストで確認。
- **狙い 3（角速度保存）**：折り返し点以外では瞬間角速度の大きさ ≈ speed（数値微分でテスト）。「方向だけが独立した難易度軸」となる。
- **静止弁別（NF-28b）**：静止パッチは離散初期角度で固定（slot=180/セル数 等分）、少数なら 12° 以上を満たす。遅い速度（2deg/sec）でも t に応じて角度が動くことをテストで確認。

## 3. 受け入れ基準マッピング

### F-01（コア・ロジック）
- [x] レベルの 5 変数から n×n 格子 → `generateRoundFromLevel`（gridSize で 9/16 セル）
- [x] レベルの個数ぶん回転・残り静止 → `generateRound`（count 個ちょうど、テスト済み）
- [x] 回転は speed・direction（一方向/振動）で行う → patch.direction/rotationSpeed、`patchOrientationAt`
- [x] 静止はランダム初期角度で固定（時間変化なし）→ changeKind=null、`patchOrientationAt` が t 非依存
- [x] タップ選択トグル → `gameReducer` TOGGLE
- [x] 振動は CW↔CCW の往復として観察できる → `oscillationOffsetDeg` 三角波（テスト済み）
- [x] 1 ゲーム = 1 レベル挑戦（複数ラウンドなし）→ revealed が終端、NEXT/advance なし

### F-03 / §4.3（クリア/失敗判定）
- [x] クリア = 回転を過不足なく全選択（FP0 ∧ FN0）→ `isAllCorrect`
- [x] 全問正解で即時締め切り → TOGGLE 内で `isAllCorrect` 成立時に close（closedByAllCorrect=true）
- [x] 時間切れ締め切り → TIMEOUT で正誤判定し clear/fail
- [x] 失敗 = 誤選択 or 選び逃し or 時間切れ → テストで 3 経路確認
- [x] 開示用に各パッチの正誤導出（correct/missed/wrong/none）→ `deriveReveal`（S5 の ✅/❌ 用）
- [x] 結果開示中はタップ無効 → revealed 中の TOGGLE/TIMEOUT は no-op
- [x] 部分点・0〜100 スコアなし → result: 'clear'|'fail' のみ

### レベル増減の配線（設計判断）
- `applyResult`（S2）と `recordCompletedGame`（S3）の呼び出しは**機械の外**でオーケストレーションする方針。`gameReducer` は純粋に「ゲーム 1 回の結果（clear/fail）」だけを確定し、レベル増減・永続化・記録は S7 のゲーム終了処理（ホームフロー）が `result` を受けて `applyResult`→`recordCompletedGame` を呼ぶ。理由：reducer に永続化副作用を持ち込まない（テスト純度を保つ）／中断時は呼ばない分岐を上位で扱える（F-07）。

## 4. 確認したこと（自己評価チェックリスト）

- [x] `npm run typecheck`：エラー 0（PASS）
- [x] `npm test`：**640/641 PASS**（S3=586 → **+55 件**＝v3 新規 3 スイート 55 件）。残り 1 赤は既知 authored-broken（§V3.4 `SessionResultCard.test.tsx`、スコア依存・S4 と無関係・S5 で UI 差し替え時に自然解消）
- [x] `npm run build:web`：成功（Exported: dist、AppEntry ≈ 1.87 MB・S3 から不変＝v3 ロジックは未配線）
- [x] 振動/一方向/静止の弁別を角度系列の単体テストで担保（往復性・振幅・周期・折り返し停止・角速度保存）
- [x] rng 注入で決定論（同シードで同格子）
- 注：ロジック層スプリントのため dev 起動・手動操作・描画状態確認は S5（描画 UI 実装）で実施。本層は App から未到達。

## 5. 死にコード撤去：未着手（App/UI が壊れるため）— S5 へ申し送り

v3 ゲームコアは揃ったが、**v2 のスコア系ロジック（A/B/D：scoring.ts・gameMachine.ts の採点 3 方式/r ラウンド・roundGen.ts の個数ランダム・patch.ts の cpd）は今回撤去しなかった**。理由：

- 撤去対象の v2 game logic は**今も live な v2 UI チェーンに依存されている**：`App.tsx → AppRoot → GameScreen → {gameMachine, scoring, roundGen, patch, ConfirmButton, GaborGrid, GaborPatchCell, gameView}`。`grep` で確認済み。
- これらを今消すと `npm run build:web`（および typecheck）が壊れる（task 制約「App/UI が壊れない範囲で撤去」「迷うものは残して申し送り」に従い全件残置）。
- run.md §V3.5 の削除順指針も「S4 ゲームコア → A/B/D を、該当機能の v3 実装 **↔ 旧コード撤去を同時に**」としており、UI 差し替え（S5）と同時撤去が正しい。

**S5 への撤去申し送り（v3 UI 実装 ↔ 旧撤去をセットで）**：
- `src/screens/v2/GameScreen.tsx` を v3 ゲーム画面（`src/lib/v3/gameMachine` + `patch` + `roundGen` 消費）に差し替え。
- 差し替え後に撤去可能：`src/lib/v2/{scoring.ts, gameMachine.ts, roundGen.ts, patch.ts, gameView.ts}`、`src/components/v2/{ConfirmButton.tsx, GaborGrid.tsx, GaborPatchCell.tsx, ResultOverlayLayer.tsx}`、`src/state/{sessionRecorder.ts, statsRecorder.ts}`（v2 採点記録）。
- 連動テスト撤去（仕様廃止）：`tests/lib/v2/{scoring, gameMachine, roundGen, patch, gameView}.test.ts`・`tests/state/sessionRecorder.test.ts`・`tests/components/v2/{gameComponents, ResultOverlayLayer}.test.tsx`・`tests/screens/v2/GameScreen.test.tsx`・`tests/components/v2/SessionResultCard.test.tsx`（§V3.4 の authored-broken もここで解消）。
- なお `src/lib/v2/rng.ts` は v3 が再利用中（汎用 PRNG・スコア非依存）のため**撤去しない**。将来 `src/lib/v3/` 配下へ移設するか共有 util 化するかは S5 以降の判断（今は YAGNI で据置）。

## 6. 既知の懸念

- **振幅・周期は仮置き**（A=30°）。実機で「一方向と振動の体感差」「最遅 2deg/sec での静止との弁別」を確認して調整余地（AS-21）。S5 描画後に実機検証推奨。
- **TIMEOUT 時 clear の経路はテスト未到達**：実プレイでは全問正解は TOGGLE 内で即時締め切りされるため、TIMEOUT が clear を返すのは「初期状態で既に全問正解」という起こり得ないケースのみ。ロジックは正しい（isAllCorrect で判定）が、主経路は即時締め切り。
- レベル増減・記録の配線は本層に持たせていない（§3 設計判断）。S7 で `result` → `applyResult` → `recordCompletedGame` を結線する。
