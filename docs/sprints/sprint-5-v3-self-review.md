# Sprint 5（v3.0）自己評価 — ゲーム描画・レベル/個数表示・結果開示 UI（F-01 描画 / F-02 / F-03 / F-12）

> v3.0 リブート S5。S4 の v3 ゲームコア（gameMachine / patch / roundGen / level）を画面に配線し、
> ガボール格子描画・レベル/個数表示・カウントダウン・結果開示 UI を実装した。
> v3 を `src/components/v3/` 等の**並行モジュール**で新設し、v2 ゲーム UI チェーンは温存（撤去判断は §6）。
> （`docs/sprints/sprint-5-self-review.md` は v2.0 の S5＝タブ/中断の記録。本書は v3.0 の S5。上書きしない。）

## 1. 結論（検証結果）

| 項目 | 状態 |
|---|---|
| `npm run typecheck`（tsc strict） | **エラー 0（PASS）** |
| `npm test`（Jest） | **65/66 スイート・674/675 件 PASS**（S4 = 640/641 → **+34 件**）。残り 1 赤は §V3.4 の既知 authored-broken（`SessionResultCard.test.tsx`、スコア依存・本 S5 無関係） |
| `npm run build:web`（既定 = v2） | **成功（Exported: dist）**。AppEntry ≈ 1.9 MB |
| `npm run build:web`（`EXPO_PUBLIC_V3_GAME=1`） | **成功**。v3 ゲームハーネスを表示 |
| Playwright スクショ（375 / 1280 / 360 / L41 振動域） | **取得・目視確認済み**（`temp-images/v3-*.png`） |
| Expo SDK | 54 系維持・native 依存追加なし（Skia 等不使用、回転は transform） |

## 2. 受け入れ基準マッピング

### F-01 回転変化検出ゲーム（描画）
- [x] 現在レベルの n×n（3x3 / 4x4）格子描画：`GaborGrid`（GG-1）。L7=3x3・L41=4x4 をスクショ確認。
- [x] 現在レベルの個数のパッチが回転・残り静止：`generateRoundFromLevel`（S4）+ `GaborPatchCell` が `patchOrientationAt(patch, t)` を経過秒で評価。
- [x] 回転は現在レベルの速度・方向（一方向 / 振動）。振動は CW↔CCW 往復（NF-28c）：`patch.ts` の三角波 `oscillationOffsetDeg`（S4）を transform 回転で描画。L41 で 2 フレーム差分を確認。
- [x] 静止パッチはランダム初期角度で静止：`changeKind=null` は `patchOrientationAt` が `initialOrientationDeg` を返す（時間不変）。
- [x] 直接タップでトグル・選択中を控えめ枠で明示・縞の視認を阻害しない：`GaborPatchCell` の `selectionV2.subtle` 2px 枠。スクショ `v3-osc-L41-selected.png` で確認。
- [x] 回転種類/速度の指定 UI なし・「現在の回答」テキストなし：ゲーム画面に当該 UI を置いていない。
- [x] カウントダウン上部 22pt 以上常時表示：`GameTopBar` 中央の `CountdownTimer`（30px = `font.h2`）。
- [x] 回転は締め切りまで一定の速さで継続：`useGameTimer` の rAF 駆動 `elapsedSec` を連続供給。
- [x] 1 ゲーム = 1 レベル挑戦・複数ラウンドなし：`gameMachine`（S4）が r ラウンド廃止。

### F-02 レベル表示・個数表示
- [x] レベル番号表示「レベル {n}」：`LevelBadge inline`（LB-1）を `GameTopBar` 右に配置。
- [x] 個数明示「◯個探せ！」：`CountBanner`（CB-1）。`font.body.lg` 26px Bold（18pt 以上）。
- [x] レベル/個数はゲーム開始時点で確定・ゲーム中不変：`config.level` / `config.params.count` 由来で固定。
- [x] SR でレベル・個数を読み上げ：ゲーム開始時 `aria-live` で「レベル {n}。{count} 個の回転を探してください」（`a11yAnnounce`）。LevelBadge / CountBanner も各々 `accessibilityLabel`。

### F-03 クリア判定・結果開示
- [x] 締め切り後、独立画面に遷移せず格子はそのまま残る：`GameScreen` は revealed フェーズでも同じ格子を描画し `ResultOverlayLayer` を重畳。
- [x] 回転を正しく選択=✅実線 / 選び逃し=✅薄め（透過 50%）/ 誤選択=❌：`ResultMark`（OV-2）。`deriveReveal`（S4）が `correct/missed/wrong/none` を分類。
- [x] 正しく選んだ回転 vs 選び逃した回転の視覚区別：透明度（不透明 vs 0.5）。component テストで検証。
- [x] 刺激領域直下に総合クリア/失敗 1 個：`AggregateResultBadge`（OV-3）。**色 + アイコン + テキスト**（NF-12）。
- [x] 内部数値テキスト非表示：総合バッジはテキスト「クリア」「失敗」のみ。速度・角度・レベル変化数値を出さない（テストで `queryByText(/deg|°|cpd|速度|角度/)` が null を確認）。
- [x] ✅/❌ は縞を完全に覆わない：`resultV3.overlayBg` 半透明円（直径 = パッチ辺 55%）。
- [x] SR で「クリア」「失敗」読み上げ・開示中タップ無効：`ResultOverlayLayer` の `aria-live="assertive"` + `GaborGrid` `pointerEvents="none"`（revealed）+ セル `disabled`。
- [x] 即時クリア/時間切れの開示後、短インターバル（1.5 秒）→ 次へ：`revealIntervalMs`（即時クリア・時間切れとも 1500ms、system §9.4）後に `onResolved(result)`。

### F-12 カウントダウン
- [x] 数字のみ・白→≤5 秒黄→≤3 秒赤・太字補強（danger は Black 900）・点滅なし・22pt 以上：`CountdownTimer`（CD-1）+ `countdownTier`。ゲーム上部バーは常時暗い不透明バーで両テーマ AAA（7:1）。
- [x] 残り秒 = 現在レベルの `seconds`：`useGameTimer({ durationSec: config.params.seconds })`。

## 3. 振動視認の確認（NF-28c）
- L41（default 梯子で direction=oscillate 域は L21〜）を `?level=41` で起動し 2 フレーム（1.3 秒差）を撮影、回転が進んでいることを確認。
- 三角波ロジック自体は S4（`tests/lib/v3/patch.test.ts` 23 件）で「往復性・振幅・周期・折り返し角速度 0・角速度保存」を担保済み。S5 は描画配線（transform へ角度供給）が正しいことを GameScreen 統合テスト + スクショで確認。
- 振幅 `OSCILLATION_AMPLITUDE_DEG=30`（S4 定数、AS-21 体感調整余地）。実機（Expo Go）での最終体感確認はユーザー領域。

## 4. 追加/変更/削除ファイル

### 追加（実装 13 ファイル）
- `src/lib/v3/gameView.ts`（カウントダウン段階色・aria-live・開示インターバル）
- `src/lib/v3/a11yAnnounce.ts`（SR アナウンス薄ラッパ）
- `src/components/v3/LevelBadge.tsx`（LB-1）
- `src/components/v3/CountBanner.tsx`（CB-1）
- `src/components/v3/CountdownTimer.tsx`（CD-1）
- `src/components/v3/GameTopBar.tsx`（GB-1、レベル番号追加）
- `src/components/v3/GaborPatchCell.tsx`（GG-2）
- `src/components/v3/GaborGrid.tsx`（GG-1）
- `src/components/v3/ResultMark.tsx`（OV-2、correct/missed/wrong）
- `src/components/v3/AggregateResultBadge.tsx`（OV-3、クリア/失敗テキスト）
- `src/components/v3/ResultOverlayLayer.tsx`（OV-1）
- `src/screens/v3/GameScreen.tsx`（配線）
- `src/screens/v3/GameDevHarness.tsx`（評価用暫定エントリ）

### 変更
- `src/theme/tokens.ts`（`levelV3` / `resultV3` トークン追加。system §1.3・§1.4）
- `src/i18n/ja.ts`（`gameV3.*` / `resultV3.*` キー追加。v2 `game.*`/`result.*` は温存）
- `App.tsx`（`EXPO_PUBLIC_V3_GAME=1` で `GameDevHarness` を表示する分岐を冒頭に追加。既定は従来の v2 アプリ＝リグレッションなし）

### 追加（テスト 3 スイート・+34 件）
- `tests/lib/v3/gameView.test.ts`（9 件）
- `tests/components/v3/gameComponents.test.tsx`（19 件）
- `tests/screens/v3/GameScreen.test.tsx`（6 件）

### 削除
- なし（§6 参照）。

## 5. ハーネス再利用（既存 v3 ロジック / v2 hook）
- `useGameTimer`（`src/hooks/v2/useGameTimer.ts`）を**再利用**。スコア非依存の汎用タイマー（rAF + setInterval フォールバック + paused 対応）であり v3 でもそのまま使える。重複実装を避けるため複製しない（YAGNI）。
- `Rng`（`src/lib/v2/rng.ts`）も S4 同様に再利用（汎用 PRNG、スコア非依存）。

## 6. v2 撤去判断と申し送り（run.md §V3.5 / §V3-S4.4）

**今回は v2 ゲーム UI / スコア系ロジックを撤去しない**。理由：

- `App.tsx`（既定の live エントリ）→ `AppRoot`（v2）→ `GameScreen`(v2) / 履歴 / 設定 / タブ が**今も v2 に全面依存**している。S5 のスコープはゲーム画面の v3 化（単体評価可能）であり、**AppRoot への本配線は S6（タブ・中断）/ S7（起動フロー・ホーム結果・レベル増減/記録）の責務**。
- v2 ゲームチェーン（`screens/v2/GameScreen`・`components/v2/{GaborGrid,GaborPatchCell,GameTopBar,CountdownTimer,ResultMark,ResultOverlayLayer,AggregateResultBadge,ConfirmButton}`・`lib/v2/{scoring,gameMachine,roundGen,patch,gameView}`・`hooks/v2/useGameTimer`）は `AppRoot` / `sessionRecorder` / `statsRecorder` / 多数の v2 テストが依存しており、今撤去すると `build:web` と履歴/設定/タブのテストが連鎖崩壊する。
- 従って run.md §V3.5 の削除順どおり「v3 が AppRoot で v2 を代替した時点（S6/S7）で同時撤去」とする。**S6/S7 への申し送り**：
  - `App.tsx` の `AppRoot`（v2）を v3 ホームフローへ差し替えるタイミングで、上記 v2 ゲームチェーン + `ConfirmButton`（採点方式②、v3 に確定ボタンなし）+ `SessionResultCard`（→ HomeResultCard、§V3.4 の赤テストもここで自然解消）を撤去。
  - 撤去で壊れる v2 テスト（`tests/lib/v2/{scoring,gameMachine,roundGen,patch,gameView}.test.ts`・`tests/screens/v2/GameScreen*.test.tsx`・`tests/components/v2/{gameComponents,ResultOverlayLayer,SessionResultCard}.test.tsx`・`tests/hooks/v2/useGameTimer.test.tsx`・`sessionRecorder` 等）は仕様廃止のため削除/置換。
  - `useGameTimer` は v3 が再利用中のため**撤去せず** `src/hooks/v3/` へ移すか共有化する。
  - `App.tsx` の S5 暫定ハーネス分岐（`EXPO_PUBLIC_V3_GAME`）は S7 の本配線完了時に除去する。

## 7. native 懸念監査（CLAUDE.md §5）

- **Web 専用 API の native 混入**：実ゲームコンポーネント（`components/v3/*`・`screens/v3/GameScreen`）に `document`/`window`/DOM 操作なし。`window` 使用は `GameDevHarness.readQueryLevel` のみで `typeof window === 'undefined'` ガード済み・かつ `EXPO_PUBLIC_V3_GAME` フラグ配下（v2 / 本番非経路）。native では null を返し既定レベルにフォールバック。
- **`Image` transform メモ化**：回転は `GaborPatch` の**ラッパ View** に `transform: rotate` を当てる方式（v1.1.5 で確立、Android Fabric で View の transform 更新は確実に再レンダーされる）。`Image` 自体に transform を当てていないため「source memo 化で transform が反映されない」問題は起きない。BMP（dataUrl）は cpd 固定のためラウンド中 1 度だけ生成（再生成なし＝点滅なし）。
- **reduced-motion**：ゲーム刺激の回転は止めない（NF-13、課題上必須）。`ResultOverlayLayer` のフェードのみ reduced-motion で 0ms 化。
- **未検証（ユーザー実機確認推奨）**：Android Expo Go での 30〜60fps 体感・振動の往復視認・各回転速度（6〜2）での回転/静止弁別（NF-28b/28c の体感値確定）。

## 8. Playwright 検証結果（temp-images/）
- `v3-game-play-375.png`：L7（3 個探せ！・3x3・一方向）。上部バー（X・残り秒白・レベル 7 ピル）・CountBanner・格子。四隅の背景露出なし（NF-27/28）。
- `v3-game-play-1280.png`：1280 幅で格子中央寄せ・バー全幅。
- `v3-game-play-360.png`：360 幅で破綻なし。
- `v3-osc-L41-frameA/B.png`：L41（1 個探せ！・4x4・振動域）2 フレーム差分（回転進行）。
- `v3-osc-L41-selected.png`：選択枠（控えめ・縞の視認を阻害しない）。

## 9. v3 ゲーム画面への到達方法（評価用）
- **Web（推奨）**：
  1. `EXPO_PUBLIC_V3_GAME=1 npx expo export --platform web --clear`
  2. `npx serve -s dist -l 4613`
  3. `http://localhost:4613/`（既定 L7）。振動域は `http://localhost:4613/?level=41`、任意レベルは `?level=N`（N=1〜720）。
- **テスト**：`npx jest tests/screens/v3/GameScreen.test.tsx`（決定論 rng + fake timers で clear/fail/中断を検証）。
- 既定の `npm run build:web`（フラグなし）は従来の v2 アプリを出力する（リグレッションなし）。
