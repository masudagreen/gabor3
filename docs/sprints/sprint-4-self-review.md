# Sprint 4 自己評価 — ゲーム描画・結果開示 UI（F-01 描画 / F-03 / F-12）

> v2.0 リブートの S4。旧 v1.x の同名 self-review は git 履歴に保存（本ファイルは v2.0 で上書き）。

## 1. やったこと（成果物）

### ロジック層（純関数・React 非依存）
- `src/lib/v2/gameView.ts`
  - `countdownTier(remainingSec)`：白 / ≤5 秒 黄 / ≤3 秒 赤（F-12）。
  - `countdownAriaLive(remainingSec)`：≥6 秒 polite / ≤5 秒 assertive（CD-1 / §6）。
  - `classifyMark` / `classifyMarks`：選んだ変化=TP / 選び逃した変化=FN / 誤選択静止=FP /
    選ばなかった静止=none（F-03 / OV-2）。
  - `aggregateKind`：TP=変化全数 かつ FP=0 → success、それ以外 danger（OV-3）。
  - `quantizeCpd(cpd, step=0.25)`：cpd の BMP 再生成スロットリング（描画戦略）。

### UI 層（components.md 準拠）
- `src/components/v2/CountdownTimer.tsx`（CD-1 / F-12）：数字のみ・3 段階色・太字補強
  （normal/warn Bold 700、danger Black 900）・点滅なし・tabular-nums・不透明ピル背景。
- `src/components/v2/GameTopBar.tsx`（GB-1）：左 X（中断 48pt+）・中央カウントダウン。
  **バー全体を不透明 `countdownV2.bg` にし（A）＋ CountdownTimer も不透明ピル（B）**で
  7:1 を構造的に担保（system §1.4 改訂、縞混入を排除）。top セーフエリア分オフセット（NF-29）。
- `src/components/v2/GaborPatchCell.tsx`（GG-2）：既存 `GaborPatch` をラップし、経過秒 t から
  `patchOrientationAt(t)` / `quantizeCpd(patchCpdAt(t))` を導出して描画。直接タップでトグル、
  選択中は `selectionV2.subtle` 2px 枠。`role=checkbox` + `aria-checked` +「パッチ 行-列」。
  内部 GaborPatch 画像は SR から隠す（ラベル二重化・正解漏洩を防止）。
- `src/components/v2/GaborGrid.tsx`（GG-1）：n×n 配置、辺長 `min(short-32,360)`/PC 480、
  隙間 n=3:8px・n≥4:6px、`role=group`、開示中 `pointerEvents=none`。レイアウト算出は
  `computeGridEdge`/`computeGap`/`computePatchSize` で純関数化（テスト可能）。
- `src/components/v2/ResultMark.tsx`（OV-2）：TP 実線・FN 透過50%・FP ❌、半透明円
  （直径 = パッチ辺 55%、縞を完全には隠さない）、aria-label。
- `src/components/v2/AggregateResultBadge.tsx`（OV-3）：刺激領域直下の総合 ✅/❌ 1 個、
  数値なし、aria-label「正解」/「不正解」。
- `src/components/v2/ResultOverlayLayer.tsx`（OV-1）：総合バッジ + 200ms フェードイン
  （reduced-motion 0ms）+ `announceForAccessibility` で「正解/不正解」+TP/FP/FN 要約を
  1 度読み上げ（NF-10）。数値は視覚表示せず SR の隠しテキストのみ。
- `src/components/v2/ConfirmButton.tsx`（BN-1）：方式②のみ描画する「確定」lg(64px)。

### 配線
- `src/hooks/v2/useGameTimer.ts`：playing 中のみ rAF で経過秒を連続更新、残り秒を整数導出、
  満了で TIMEOUT を 1 度発火。rAF 無し環境は setInterval フォールバック。roundKey 変化で再開。
- `src/screens/v2/GameScreen.tsx`：`gameMachine` を `useReducer` で駆動し、タイマー・格子・
  確定ボタン（方式②）・結果開示を配線。開示は方式①② 1.5 秒 / 方式③全問正解 0.6 秒で NEXT。
  セッション完了を `onSessionComplete` へ委譲（中断は `onAbort`、S5/S6 で接続）。

### トークン / i18n
- `src/theme/tokens.ts`：`countdownV2` / `resultV2` / `selectionV2`（system §1.4、light/dark）追加。
- `src/i18n/ja.ts`：`game.*` / `result.*` キー追加。

### テスト（+60 件）
- `tests/lib/v2/gameView.test.ts`（色段階・aria-live・マーク分類・総合判定・cpd 量子化）
- `tests/hooks/v2/useGameTimer.test.tsx`（経過/残り・満了 1 度・停止・roundKey 再開）
- `tests/components/v2/gameComponents.test.tsx`（CD-1 色段階・OV-2/3・BN-1・GG-1 レイアウト・
  GG-2 トグル/a11y/ラベル非漏洩）
- `tests/components/v2/ResultOverlayLayer.test.tsx`（総合バッジ・SR 読み上げ・数値非表示）
- `tests/screens/v2/GameScreen.test.tsx`（共通描画・3 採点方式 UI 挙動・トグル・開示遷移・
  セッション完了委譲）

## 2. 確認したこと（自己評価チェックリスト）
- [x] `npx tsc --noEmit` エラー 0
- [x] `npm test`：**240 件 / 240 PASS**（S3=180 → +60）、24 スイート
- [x] `npm run build:web` PASS（web bundle 394 kB）
- [x] 受け入れ基準（F-01 描画 / F-03 / F-12）を各テストで網羅（§5 マッピング）
- [x] 空状態（未選択で m 秒満了→総合 ❌・TP=0/FP=0 採点）を GameScreen テストで確認
- [x] 開示状態（格子 pointer-events:none・タップ無効）・遷移（1.5/0.6 秒）を確認
- [x] デザイン（モックアップ game-play.html / game-result.html）との構造一致を確認

## 3. 描画戦略の選択理由とパフォーマンス所感（S1 申し送りへの回答）
- **回転（a deg/sec）**：既存 `GaborPatch` は BMP を orientation=0 で 1 度だけ生成し、
  表示時に内側 View の `transform: rotate` で角度を当てる方式（v1.1.3〜v1.2 で確立済）。
  本スプリントは経過秒 t から `patchOrientationAt(t)` を毎レンダー渡すだけで、BMP は再生成
  されず transform のみ更新される。**回転は BMP 再計算ゼロ**で滑らかに連続回転できる。
- **空間周波数（b hz/sec）**：BMP 再生成が必要。`quantizeCpd(step=0.25)` で cpd を量子化し、
  `GaborPatch` の `useMemo` キー（cpd）が刻みをまたいだときだけ再生成（**スロットリング**）。
  b=0.40hz/sec（最速）でも約 0.6 秒に 1 回の再生成で、視認上は滑らかに見える見込み。
  b=0.15（既定）では約 1.7 秒に 1 回で十分。
- **Expo Go 互換**：native 依存（Skia 等）は一切追加していない。既存 BMP→`<Image>` 方式 +
  transform 回転 + cpd スロットリングのみで、SDK 54 / Expo Go ワークフローを維持。
  NF-1（回転＋周波数アニメ 30fps 最低許容）はこの方式で中位スマホでも達成可能と判断
  （回転は transform で実質コストゼロ、cpd 再生成のみが負荷だがスロットルで頻度を抑制）。
  → **native 依存追加によるオーケストレーター報告は不要**と判断。

## 4. 既知の懸念 / 申し送り
- **視覚回帰（実機/ブラウザのピクセル確認）は未実施**：本スプリント時点で GameScreen は
  アプリシェル（App.tsx）から到達できない（タブナビ S5・起動フロー S6 で接続予定）。
  描画の正しさは (a) 既存 `GaborPatch` のクリッピング品質テスト（NF-27/28、既存）、
  (b) 本スプリントの構造テスト（レイアウト算出・色段階・マーク分類）、(c) Designer モック
  アップ（game-play.html / game-result.html）との構造一致、で担保。**実描画のスクリーンショット
  確認は S5/S6 で GameScreen が画面に乗った時点で実施することを推奨**。
- **cpd 量子化 step=0.25 は体感未調整**：実機で「滑らかさ vs 再生成負荷」を見て微調整余地あり
  （NF-28b 弁別性に影響しない範囲で）。可動範囲・初期値は schema 既定（n=4/m=20/r=5/a=6/b=0.15）。
- **jest-expo の rAF シム由来の act(...) 警告**：fake timers + rAF シム（setTimeout 実装）の
  既知の相互作用でテスト teardown 時に console 警告が出るが、**テストは全件 PASS**。タイマー満了
  フレームで state 更新を抑止する実装（`useGameTimer` の stop ガード）で余分な setState は排除済み。
  プロダクト動作・テスト結果には影響しない。
- **音/ハプティクス（ティック・正解/不正解音）は S9**：本スプリントは無音（試行中フィードバック
  なしの原則は満たす）。カウントダウンの色赤転換と同期するティック音は S9 で接続。
- **中断ダイアログ / タブバー**：GameTopBar の X は `onAbort` 委譲のみ（ダイアログ本体は S5）。

## 5. 受け入れ基準 ↔ テスト マッピング

| 受け入れ基準（screens.md S4 / spec F-01・F-03・F-12） | 検証 |
|---|---|
| n×n 格子描画・静止固定・回転/周波数変化が視認 | GameScreen「共通描画」/ GaborGrid 16 セル / patch.ts（S3）+ Cell が t を反映 |
| 直接タップ選択・控えめ枠・種類選択 UI なし・現在回答テキストなし | GameScreen「トグル」/ GaborPatchCell トグル・選択枠 |
| 変化種類を漏らさない中立ラベル（NF-10） | gameComponents「変化/静止でラベルが変わらない」 |
| m 秒カウントダウン 22pt+（30px）・段階色・点滅なし | CountdownTimer 色段階 3 件（normal/warn/danger）・fontSize.h2 |
| カウントダウン不透明背景 7:1（system §1.4） | CountdownTimer「背景は不透明 countdown.bg」 |
| 採点後遷移せず ✅/❌ 重畳・TP/FN 区別・総合 1 個・数値なし | GaborGrid marks / ResultMark TP/FN/FP / AggregateResultBadge / OverlayLayer 数値非表示 |
| アイコンは縞を完全に覆わない（半透明円・55%） | ResultMark「円径はパッチ辺の約 55%」 |
| SR で正解/不正解読み上げ・開示中タップ無効 | ResultOverlayLayer SR / GaborGrid revealed pointer-events:none |
| 方式①：確定なし・m 秒自動採点 | GameScreen 方式① 2 件 |
| 方式②：確定ボタンあり・押すと即採点 | GameScreen 方式② |
| 方式③：全問正解で即遷移・0.6 秒短フィードバック | GameScreen 方式③ 2 件 |
| 方式①②：1.5 秒インターバルで次へ | GameScreen「開示 1.5 秒後に次ラウンド」 |
| クリッピング品質（NF-27/28・四隅露出なし） | 既存 GaborPatch クリッピングテスト（CLIP_RATIO 1.5・矩形クリップ） |
| セッションスコア集計委譲（F-04） | GameScreen「全ラウンド完了で onSessionComplete」 |
