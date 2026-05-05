# Amendment: Game 1 強制 60 秒視聴 — Self-Review

## 背景
ユーザー仕様変更要望：「アプリの目的はガボールアイを見せることなので、所定の時間は必ず見なければいけない仕様にしてほしい。完了ボタンで終わってしまうのが問題」。

旧仕様では「完了ボタン押下 or 60 秒経過」で採点完了だったが、新仕様では「60 秒経過のみ」で自動採点する。緊急脱出のみ × 中断モーダルから可能。

## やったこと
- `src/screens/Game1Screen.tsx`：完了ボタン UI（`<Button label="完了" />`）と関連処理を削除。`finalizeTrial(byButton: boolean)` を `finalizeTrial()` に簡略化。`completedByButtonRef` 廃止。`isUnattempted(selectedIds, false)` 固定で呼ぶ。冒頭 JSDoc / 仕様変更履歴を追記
- `src/screens/Game1Screen.tsx`：先頭 3 秒のガイドに副ガイド「60 秒のあいだ、何度でも選び直せます」を追加（OPT-6 優しい言い回し、20pt = `fontSize.caption`）。未使用となった `bottom` スタイルを削除
- `src/lib/game1.ts` の `isUnattempted` API は変更せず（純関数として `completedByButton` 引数を残し、Game1Screen からは常に `false` で呼ぶ運用）
- `tests/screens/Game1Screen.test.tsx`：完了ボタン非存在 / 60 秒未満は自動採点されない / 60 秒経過で自動採点 + 未挑戦扱い / × 中断 → onAbort、の 4 件を追加。`Date.now` ベースの ticker を fake timer 環境で動かすため `jest.setSystemTime` で経過時間を制御
- `tests/lib/game1Unattempted.test.ts`：仕様改訂注釈を追加。`completedByButton=true` ケースは「Game1Screen からはトリガーされない、純関数 API の回帰テスト」として残す
- `docs/design/sprints/sprint-2/screens.md` S2-03：「完了ボタン」記述をすべて「60 秒経過で自動採点」に書き換え。ASCII 図・状態遷移・a11y セクションも整合的に修正。最小差分原則（モックアップ全体は再描画せず該当行だけ更新）

## 確認したこと
- `npm test`：**321 / 321 PASS**（修正前 317 件 → +4 件）
  - 新規 4 件はすべて Game1Screen.test.tsx の追加分
  - 既存 317 件はリグレッションなし
- `npm run typecheck`：エラー 0
- `npm run build:web`：成功（dist/ に出力、bundle 693 kB）
- 主要動線確認：
  - 完了ボタンが DOM に存在しない（`queryByTestId('game1-complete')` が null、`queryByText('完了')` が null）
  - 30 秒経過時点で `onComplete` 未呼び出し
  - 60 秒経過 + ハイライト 1.5 秒で `onComplete` が 1 回呼ばれ、`unattempted: true / grading: null` で渡る
  - × 中断モーダルから「中断する」で `onAbort` が呼ばれる

## ユーザーがリロード後に観察できる挙動
- ホーム → 単体プレイ「Game 1」または 3 分コース → 距離リマインド → Game 1 プレイ画面
- 上部に「残り 60 秒」→「残り 47 秒」→…とカウントダウン（30px Bold tabular-nums、`aria-live="polite"` は残り 5 秒以下）
- ガイド「変化したパッチをタップ／60 秒のあいだ、何度でも選び直せます」（先頭 3 秒のみ）
- 画面下部に**完了ボタンは無い**。タップ → 黄色枠で選択、再タップで解除
- 残り 0 秒で自動的に「採点しました。正解箇所を表示します」（タップしていれば）／「時間切れです。変化していたパッチを表示します」（タップ無しなら）→ 1.5 秒拡大ハイライト → 結果サマリ
- 緊急時に左上 × → 「ゲームを中断しますか？」モーダル → 「中断する」でホーム

## 修正ファイル一覧
- `src/screens/Game1Screen.tsx`
- `tests/screens/Game1Screen.test.tsx`
- `tests/lib/game1Unattempted.test.ts`（コメント / テスト名のみ更新）
- `docs/design/sprints/sprint-2/screens.md`（S2-03 周辺、最小差分）

## 完了ボタン削除前後の差分（要点）
- import から `Button` を削除
- `finalizeTrial(byButton)` → `finalizeTrial()`、`completedByButtonRef` 削除
- `isUnattempted(selectedIds, byButton)` → `isUnattempted(selectedIds, false)`（タップ 0 件で 60 秒経過 = 未挑戦扱い、staircase up）
- JSX から `<View style={styles.bottom}><Button label="完了" .../></View>` ブロックを丸ごと削除
- `styles.bottom` を削除、`styles.subGuide` を追加

## テスト件数 before / after
- before: 46 suites / 317 tests
- after: 46 suites / 321 tests（+4 件、リグレッション 0）
- 修正したテスト：`tests/screens/Game1Screen.test.tsx`（既存 1 件保持 + 新規 4 件）、`tests/lib/game1Unattempted.test.ts`（コメント / it 名のみ）

## 残課題 / 既知の懸念
- `src/lib/game1.ts` の `isUnattempted` の `completedByButton` 引数は API 上は残っている（内部的には常に `false` 渡し）。Sprint 単位の API 後方互換のため意図的に維持。将来この API を使う他経路が現れない確証が取れた段階で簡略化してよい
- 旧 `screens.md` の「Sprint 内では時間切れで自動採点に進める（完了ボタン押下が主、時間切れは保険）」というニュアンスは廃止。新仕様では時間切れが正規経路
- `docs/spec.md` §7.1 は本タスクの範囲外（並行 Planner 担当）。Generator 側は src + tests + screens.md S2-03 のみ更新

## 制約遵守
- Game 2 / Game 3 は触っていない（confirm: `Game2Screen.tsx` / `Game3Screen.tsx` 無変更）
- 1 機能 1 スプリント原則：Game 1 の挙動変更のみ。他機能変更なし
- screens.md S2-03 は最小差分（ASCII 図全体ではなく該当行のみ修正）
