# Sprint 3 自己評価（v2.0）— ゲームコア：変化検出ロジック（F-01 / F-02 / F-04）

> 本ファイルは v2.0 リブートの Sprint 3 自己評価。旧 v1.x の Sprint 3（Game 3／3 ゲームコース）記録は上書きした（v1.x は spec.md §10 で完全リタイア）。
>
> 範囲：**ロジック層＋状態管理に集中**。ガボール実描画・回転/周波数アニメーション・✅/❌ オーバーレイの見た目・カウントダウン UI は **S4** の領分。S3 は描画に依存しないテスト可能な純関数 + reducer のみを実装した。

## 1. やったこと（成果物）

| ファイル | 役割 | 対応機能 |
|---|---|---|
| `src/lib/v2/rng.ts` | 注入可能 PRNG（mulberry32）+ randInt/randFloat/sampleWithoutReplacement。テスト決定論のため `Rng = () => number` を外部注入 | テスト可能性（制約） |
| `src/lib/v2/patch.ts` | `PatchDef` 型 + `patchOrientationAt(t)` / `patchCpdAt(t)` 純関数（**S4 描画入力**）。CW/CCW 符号付き回転、増/減 cpd、0–180 正規化、cpd 物理下限クランプ | F-01 |
| `src/lib/v2/roundGen.ts` | n×n 格子生成。個数分布（1〜floor(n²/3)・調和減衰・0 個なし）、種類割当（回転40/周波数40/両方20）、回転方向・周波数方向独立ランダム、静止/変化の初期角度ばらつき・初期 cpd 2.0–4.0 | F-01 / §9.3 / §9.4 |
| `src/lib/v2/scoring.ts` | `scoreRound`（TP/FP/FN・roundScore=TP−FP）、`isAllCorrect`（方式③判定）、`computeSessionScore`（0〜100 正規化）、`toRoundRecord` | F-02 / F-04 |
| `src/lib/v2/gameMachine.ts` | 描画非依存の reducer。`initGame` / `gameReducer(state, event, rng)`。3 採点方式の状態機械（①TIMEOUT のみ / ②TIMEOUT or CONFIRM / ③全問正解で即 reveal or TIMEOUT）、ラウンド→セッション進行、セッションスコア確定 | F-01 / F-02 / F-04 |
| `src/state/sessionRecorder.ts` | 完了セッションを `SessionRecord`（§6.4）へ組み立て・永続化（S2 repository 利用）。`paramsSnapshot` 記録、中断は受け取らない（F-07） | F-04 / §6 |

新規テスト（`tests/lib/v2/*` + `tests/state/sessionRecorder.test.ts`、計 +80 件）：
- `rng.test.ts`（10）：決定論・範囲・重複なし抽出
- `patch.test.ts`（13）：時刻 t の角度/cpd、CW/CCW、増減、正規化、クランプ、種類別不変
- `roundGen.test.ts`（19）：個数範囲/0なし/少なめ寄り分布/全候補出現/種類分布/混在/静止固定 cpd・角度ばらつき/決定論/n=3,5
- `scoring.test.ts`（24）：TP/FP/FN/roundScore/負得点/未選択採点/種類非区別/方式③判定/正規化（満点100・下限0・中間・FP減点・クランプ・整数化・満点下限区別）
- `gameMachine.test.ts`（21）：トグル/開示中無効/方式①②③遷移/未選択採点/ラウンド進行/セッション完了/スコア確定/完了後不変
- `sessionRecorder.test.ts`（7）：ParamsSnapshot マップ/RoundRecord 組立/FP減点/永続化往復

## 2. 確認したこと（自己評価チェックリスト）

- [x] `npx tsc --noEmit`：**エラー 0**（strict）
- [x] `npm test`：**180 件 / 19 スイート 全 PASS**（S2=100 → **+80**）
- [x] `npm run build:web`：**PASS**（`AppEntry-*.js` ≈ 393 kB。S3 は純ロジックで App.tsx 未配線のためサイズ据置。配線は S4）
- [x] スキーマ変更なし（`RoundRecord`/`SessionRecord`/`ParamsSnapshot` は S2 で凍結済みの §6 を流用。**止めて報告すべき変更は発生せず**）
- [x] 乱数はテスト可能（`Rng` 注入。本番は `Math.random`、テストは `mulberry32(seed)`）
- [x] デザイン準拠：screens.md §1.3 の提案正規化式を採用、§9.3/§9.4 の分布・マージンを実装
- [x] 仕様外を増やしていない（描画・UI・音は S4/S9。本スプリントはロジックのみ）

> ロジック層のため「主要動線クリック」「空/エラー/ロード状態の見た目」「dev 起動の手動操作」は S4 の UI 配線時に実機確認する。S3 では reducer/純関数を多数テストで網羅して代替検証した。

## 3. 受け入れ基準マッピング

### F-01 変化検出ゲーム（コア）
- 回転変化と周波数変化が同一ラウンドで同時存在しうる → `roundGen.test.ts`「同時に存在しうる」
- 変化パッチ個数はランダム・0 個なし・state に保持し UI 非表示 → `pickChangingCount`（個数は `RoundScore.changingPatchCount`/`RoundRecord` に持つが描画用 API には個数表示なし）
- 静止パッチはランダム初期角度・初期周波数で静止 → `generateRound`（changeKind=null は時刻によらず不変：`patch.test.ts`）
- 回転方向 CW/CCW・周波数増減は独立ランダム → `pickRotationDir`/`pickSfDir`
- 変化は一定速度で継続 → `patchOrientationAt`/`patchCpdAt` が t に線形
- r ラウンドで 1 セッション → `gameMachine` の roundIndex 1..r 進行
- 種類区別 UI なし／「現在の回答」テキストなし → ロジックに種類回答の概念を持たせていない（選択は index 集合のみ）

### F-02 採点 3 方式
- 方式①：CONFIRM 無視・TIMEOUT で採点 → `gameMachine.test.ts`「方式①」
- 方式②：CONFIRM で即採点・なければ TIMEOUT → 同「方式②」
- 方式③：全問正解で即遷移（reveal, `advancedByAllCorrect=true`）・誤選択/選び逃しで遷移せず・TIMEOUT 強制採点 → 同「方式③」
- 全方式 TP+1/FP−1/FN0 → `scoreRound`
- 未選択でも採点（TP=0/FP=0） → `scoring.test.ts`/`gameMachine.test.ts`
- 試行中フィードバックなし → reducer は playing 中に lastScore を作らない（reveal は締切イベントでのみ）

### F-04 セッションスコア 0〜100
- 全正答・誤選択ゼロ → 100 ／ 何も選ばず誤選択なし → 0 ／ FP は下げる方向 ／ 整数 ／ クランプ → `scoring.test.ts` の `computeSessionScore` 群
- 中断は集計・記録対象外 → `sessionRecorder` は完了セッション（completedAt 必須）のみ受領

### §6 記録
- `RoundRecord`（roundIndex/changingPatchCount/tp/fp/fnCount/roundScore）→ `toRoundRecord`
- `SessionRecord`（completedAt・paramsSnapshot・rounds・sessionScore）→ `buildSessionRecord`/`persistCompletedSession`

## 4. 設計判断・既知の懸念（S4 への申し送り）

1. **静止パッチの 12° マージンは「達成可能な最大の最小ギャップ」で実装**：§9.4 は「静止同士 12° 以上」だが、n=4（16 セル）で slot=180/16=11.25°、n=5（25 セル）で 7.2° となり、**全ペア 12° 以上は幾何学的に不可能**。`generateSpacedAngles` は 0–180 を等分し共通ランダムオフセットで回転させ、**達成可能な最大の最小ギャップ（完全等分）** を採る。小グリッド（n=3、slot=20°）では 12° 以上を保証（テスト済み）。S4 の体感調整で弁別性が不足する場合は変化量（a/b）側の調整等を再検討する余地あり。
2. **方式③の reveal は reducer 内で同期発火**：TOGGLE で全問正解になった瞬間に `reveal(advancedByAllCorrect=true)`。S4 はこの状態を「総合 ✅ を 0.6 秒だけ表示 → NEXT 送出」として描く（screens.md §2 方式③）。方式①②は `advancedByAllCorrect=false` で短インターバル後に NEXT（具体秒数は S4/Designer）。
3. **タイマー（m 秒）と経過時刻 t の供給は S4**：reducer は時刻に依存せず `TIMEOUT` イベントを受けるだけ。経過秒 t（→`patchOrientationAt(t)`/`patchCpdAt(t)`）の駆動と m 秒カウントダウン（F-12）は S4 の責務。
4. **sessionId / startedAt / completedAt は呼び出し側が供給**：テスト決定論のため `sessionRecorder` は生成せず受け取る。S4/S6 の配線時に uuid と現在時刻を渡す。
5. **日次集計・ストリーク・バッジ・音/ハプティクスは未着手**（S7/S8/S9）。`sessionRecorder` は SessionRecord 永続化までで止め、DailyStats 更新等は呼ばない。
6. **App.tsx 未配線**：S3 はロジックのみで UI に繋いでいないためバンドルサイズ据置。S4 でゲーム画面が `initGame`/`gameReducer`/`patchOrientationAt`/`patchCpdAt` を消費する。
