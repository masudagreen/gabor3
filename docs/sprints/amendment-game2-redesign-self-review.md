# Amendment: Game 2 再設計（左右並び 5 秒同時提示型 2AFC） — Self Review

実装日: 2026-04-29
変更タイプ: amendment（既存スプリントの仕様変更）
担当: Generator

## 背景・要望
ユーザー報告：
> ゲーム 2 がガボールが点滅するみたいになっていて、本来の目的の注視させることからずれている。60 秒経っても次に進まずに左右の選択を待っている。不正解にして次に進むべき。

## 採用方針（ユーザー選択）
**「左右並び・5 秒同時提示」型**。Planner が並行で spec.md §7.2 を更新中。

## やったこと

### ロジック層
- `src/lib/game2.ts` を全面書き換え
  - `Game2TrialSpec` を `{ left, right, correctSide, paramValue, baseOrientationDeg }` に変更
  - `Side = 'left' | 'right'`、`buildTrialSpec(paramValue, rng?)` で左右ペアと correctSide を生成
  - `gradeAnswer(spec, side)` は `correctSide === side` で判定
  - `GAME2` 定数：`sessionDurationMs=60000` / `presentationDurationMs=5000` / `responseTimeLimitMs=3000` / `fixationDurationMs=500` / `feedbackDurationMs=1000`、`maxTrials=30`
  - 旧来の `RotationDirection` / `orientationADeg` / `orientationBDeg` / `patchADurationMs` / `maskDurationMs` は削除

### UI 層
- 新規 `src/components/SideBySideGabor.tsx`：左右に GaborPatch を 2 つ並べる純表示コンポーネント
- 既存 `src/components/GaborWithMask.tsx` を **完全削除**（マスク・点滅型は不要に）
- 既存 `tests/components/GaborWithMask.test.tsx` も完全削除

### 画面
- `src/screens/Game2Screen.tsx` を全面書き換え
  - フェーズ：`'fixation' | 'presentation' | 'answer' | 'feedback'`
  - 1 useEffect で phase に応じて setTimeout を貼る state machine
  - finalizeTrial は次遷移を `pendingAfterFeedbackRef` に積み、useEffect の feedback 分岐が 1 秒後に実行
    - ※finalizeTrial 内で setTimeout を直接貼ると、useEffect cleanup の clearPhaseTimer に消されてしまう問題を回避
  - 60 秒タイマー：`remainingMs <= 0` 検知で `finalizeSession` を呼ぶ
  - 30 試行達成判定は finalizeTrial 内
  - 回答ボタンは「左」「右」、`disabled={phase !== 'answer'}`
  - 設問テキスト「どちらが時計回りに傾いていますか？」を `aria-live="polite"`
  - 最終試行のみ正解側ボタン枠ハイライト 1 秒
  - キーボードは ← / → で左 / 右

### キーボード
- `src/lib/keyboardShortcuts.ts`：`Game2Direction` を `Game2Side = 'left' | 'right'` に変更
- `mapKeyToGame2`：ArrowLeft → 'left'、ArrowRight → 'right'

### デザインドキュメント（amendment 反映）
- `docs/design/sprints/sprint-1/screens.md` S1-03 を新挙動に書き換え
- `docs/design/sprints/sprint-1/mockups/game2-play.html` を左右並び 5 秒提示の 1 ショットモックに置き換え

### テスト

**新規**：
- `tests/lib/game2.test.ts`（新規、6 テスト）：定数、buildTrialSpec の左右ペア生成、correctSide ランダム性、gradeAnswer など
- `tests/screens/Game2Screen.test.tsx`（新規、7 テスト）：
  - 描画クラッシュなし + 設問・ボタン表示
  - fixation 500ms → presentation 遷移
  - 提示 5 秒中ボタン disabled、5 秒後 enabled
  - 3 秒未回答（タイムアウト）で次試行へ進む（onComplete 未呼び出し）
  - 60 秒経過で onComplete
  - 左ボタン押下で次試行 fixation
  - 中断 × ボタンで onAbort

**書き換え**：
- `tests/lib/keyboardShortcuts.test.ts`：← → の意味を 'left' / 'right' に更新

**削除**：
- `tests/components/GaborWithMask.test.tsx`
- `tests/components/Game2Screen.test.tsx`（最小レンダリング 1 件のみ → tests/screens/Game2Screen.test.tsx に統合）

## 確認したこと

- `npm test` 全 332 件 PASS（before: 327 件 / after: 332 件、+13 = 新規 13、削除 8）
- `npm run typecheck` PASS（エラー 0）
- `npm run build:web` PASS（dist/ 出力）
- 仕様：左右並び 5 秒静止表示、3 秒回答受付、3 秒以内未回答 = 不正解（noResponse）として記録 + staircase up
- 60 秒経過で強制終了（残り試行スキップ → onComplete）

## 既知の懸念・申し送り

1. **テストでの fakeTimer + state 遷移の取り扱い**：
   - `act` ブロックを 1 つで全フェーズを進めると、複数の setState が batched され、useEffect が次フェーズの setTimeout を貼り損ねる。
   - フェーズごとに `await act` + microtask flush で進めることで安定した。
   - 本番動作（実時間）には影響なし（時間が連続的に流れるので React も都度 re-render する）。

2. **finalizeTrial の useCallback 依存配列**：
   - 新試行に遷移するたび `currentSpec`（と `staircase`、`history`）が変わるため、`finalizeTrial` も再生成される。
   - 既に `useEffect` 経由で参照しているため一貫性は保たれる。
   - 残課題：必要があれば ref パターンで安定化可能だが、現時点では必要性なし。

3. **prefers-reduced-motion**：
   - feedback 1 秒は `scaleDuration` で 0ms に縮める（reduced motion 時）。
   - 提示 5 秒は仕様（注視に必要な時間）なので reduce motion で短縮しない。

4. **ガボールサイズの計算**：
   - 画面幅 / 2 - パディング、最大 240px、最小 96px、推奨パッチサイズと min を取る。
   - スマホ縦（375px）では 1 枚あたり ~140px、タブレット以上では ~200px。
   - 視聴距離 40cm × dpi 既定値で算出。

## 受け入れ基準マッピング

| 受け入れ基準（spec/screens.md） | 実装場所 | 確認 |
|---|---|---|
| 左右並び 5 秒同時提示（点滅なし） | Game2Screen presentation phase + SideBySideGabor | `tests/screens/Game2Screen.test.tsx` |
| 設問「どちらが時計回りに傾いていますか？」 | Game2Screen answerBlock | テストで文字列検索 |
| 左 / 右 2AFC | answer-left / answer-right Button | テスト |
| 3 秒以内未回答 = 不正解（タイムアウト） | useEffect answer phase setTimeout(finalizeTrial('noResponse')) | テスト |
| 60 秒経過で強制終了 | remainingMs ticker + finalizeSession | テスト |
| 30 試行達成で終了 | finalizeTrial 内の reachedTrialLimit | （ロジック上担保） |
| 正解時のみ音 + ハプティクス、不正解は無音 | finalizeTrial 内 if outcome === 'correct' | コードレビュー |
| 最終試行のみ正解側ハイライト 1 秒 | feedbackSide state | コードレビュー |
| ← / → キーで左右回答 | useGame2Keyboard / mapKeyToGame2 | tests/lib/keyboardShortcuts.test.ts |
| staircase 連動（角度差） | applyTrialResult, paramValue → buildTrialSpec | 既存 staircase テスト |
