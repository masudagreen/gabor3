# Sprint S10（v3.0）セルフレビュー — 音・ハプティクスフィードバック（F-14）

> 対象：spec §8 S10 / F-14（音・ハプティクス、クリア/失敗・レベルアップ・バッジに適合）、NF-31/32/33、system §10。
> このスプリントは新規画面を作らず、既存 v3 画面（GameScreen / AppRoot / HomeResultCard / BadgeAwardToast）に音・ハプティクスを結線した。
> v2.0 リブート S10（a11y 仕上げ）の自己評価は `sprint-10-self-review.md`（別物）。本書は v3.0 の S10。

## 1. 結論

| 項目 | 状態 |
|---|---|
| `npm run typecheck` | PASS（エラー 0） |
| `npm test`（Jest） | 58 スイート / 618 件 PASS（赤 0）。S9 後 585 件より +33 件純増 |
| `npm run build:web` | PASS（dist 出力、AppEntry ≈ 1.15 MB） |

## 2. やったこと

### データ/決定層（純関数）
- `src/lib/v3/feedback.ts`（新規）：`decideFeedbackV3(event, settings, silent)`。v3 イベント `clear` / `fail` / `countdown-tick` / `levelup` / `badge-earned` に対し、鳴らす音種・音量・ハプティクス種を返す純関数。v2 の `lib/v2/feedback` を v3 用語へ読み替え（round-correct→clear、round-wrong→fail、session-complete 廃止、levelup 新設）。
- `src/platform/audio.ts`（更新）：`SoundKind` に v3 の `clear` / `fail` / `levelup` を追加（v2 互換 `correct` / `wrong` / `end` は残置）。`DEFAULT_VOLUME` / Web 合成音 / native mp3 ソースを v3 音種へ拡張。**新規アセットは追加せず**既存 mp3 を流用（clear=correct.mp3 / fail=wrong.mp3 / levelup=end.mp3）。

### 配線層（フック）
- `src/hooks/v3/useFeedback.ts`（新規）：決定（純関数）と再生（platform/audio・haptics）を橋渡し。初回マウントで audio.prime、設定は emit 時点の最新値を参照、テスト用にバックエンド差し替え可。

### UI 結線
- `src/screens/v3/GameScreen.tsx`：`onFeedback` プロップを追加。締め切り（revealed）時に結果に応じて `clear`/`fail` を 1 度 emit。カウントダウン残り 3/2/1 秒で `countdown-tick` を毎秒 1 度ずつ emit（lastTickRef で重複抑止）。
- `src/screens/v3/AppRoot.tsx`：`useFeedback` を 1 箇所で保持。`soundEnabled`/`hapticsEnabled`/`audioBackend`/`hapticsBackend` プロップを追加。レベルアップ（`levelDelta > 0`）時に `levelup` emit。`HomeResultCard.onBadgeShown` → `badge-earned` emit。`emit` を GameScreen へ供給。
- `App.tsx`：`AppRoot` に `settings.soundEnabled`/`settings.hapticsEnabled`（S3 永続化済み）を伝搬。

## 3. F-14 受け入れ基準マッピング

| 受け入れ基準 | 対応 | 確認テスト |
|---|---|---|
| 締め切り時にクリア/失敗音（音OFF無音） | GameScreen reveal で clear/fail emit。decideFeedbackV3 が音OFFで null | feedback.test / GameScreen.test / AppRoot.test |
| 残り 3/2/1 秒ティック音 | GameScreen の remainingSec 監視で tick emit（音量 0.4/0.5/0.6） | feedback.test / GameScreen.test |
| レベルアップ時に専用音 | AppRoot で delta>0 → levelup emit | AppRoot.test |
| バッジ獲得音 | HomeResultCard onBadgeShown → badge-earned emit | AppRoot.test |
| クリア/失敗/レベルアップ/バッジでハプティクス（振動OFF無振動） | light/medium/medium/badge。振動OFFで null | feedback.test / useFeedback.test / AppRoot.test |
| サイレントで音なし・ハプティクスあり（振動OFFでない限り） | decideFeedbackV3 の silent 引数。native は playsInSilentMode:false で二重担保 | feedback.test |
| 試行中は結果フィードバック以外を発火しない | clear/fail は revealed でのみ emit。playing 中は tick（残り3秒以下）のみ | GameScreen.test（試行中 clear/fail 非発火） |

## 4. 各イベントの発火マトリクス（system §10.1）

| イベント | 発火点 | 音種(音量) | ハプティクス |
|---|---|---|---|
| clear | GameScreen reveal | clear(0.6) | light |
| fail | GameScreen reveal | fail(0.5) | medium |
| countdown-tick | GameScreen 残り3/2/1秒 | tick(0.4/0.5/0.6) | なし |
| levelup(+1) | AppRoot delta>0 | levelup(0.65) | medium |
| badge-earned | HomeResultCard onBadgeShown | badge(0.7) | badge(heavy+medium) |

発火順序（ホーム結果で重なる場合）：clear（開示時）→ levelup（結果カード表示時）→ badge（トースト表示時）。時間的にずれるため重複しない（system §10.2）。

## 5. サイレント / OFF の扱い

- **音 OFF / 振動 OFF**：チャネル個別。OFF のチャネルは emit しても decideFeedbackV3 が null を返し無発火。
- **サイレントモード（NF-33）**：音抑止・ハプティクス継続（振動 OFF でない限り）。決定段階は OS 委譲のため silent=false 固定だが、決定関数自体は silent をサポートしテストで明示検証。実機 iOS は audio backend が `playsInSilentMode:false` で OS が無音化（二重担保）。

## 6. −1 専用音を付けない（明記）

spec F-14・system §10.2・S5 Evaluator 申し送り・Planner 申し送り2 に従い、**レベルダウン（−1）には専用音/専用ハプティクスを足さない**。失敗音（fail）で足りるため。`FeedbackEventV3` に leveldown 型は存在せず、AppRoot は delta>0 のときのみ levelup を emit する（delta<0 は無発火＝失敗音のみ）。AppRoot.test で「失敗1回目は fail のみ・levelup なし・clear/badge なし」を検証。

## 7. native 懸念（CLAUDE.md §5/§6）

- audio/haptics の native/web 分岐は既存 platform 層を流用（Web=Web Audio 合成音・haptics no-op、native=expo-audio/expo-haptics）。本 S10 で触れたファイルに `document`/`window`/DOM 直接アクセスの混入なし（`globalThis` 経由のみ）。
- 新規アセットなし（既存 5 mp3 を require エイリアス）→ app.json 変更不要。
- `Image` の transform 等メモ化懸念は本スプリントで該当なし（描画は触っていない）。
- 実機未検証（ユーザー Android/iOS 確認推奨）：(1) 音レイテンシ 100ms 以内（NF-31、初回 prime 後）、(2) iOS サイレントスイッチで音なし・振動あり（NF-33）、(3) badge ハプティクス heavy→medium 2 連の体感、(4) Android システム音量 0 時の挙動（OS 任せ）。

## 8. 追加テスト件数

S9 後 585 件 → S10 後 618 件（**+33 件**、新規スイート 2 件）。
- `tests/lib/v3/feedback.test.ts`（新規）
- `tests/hooks/v3/useFeedback.test.tsx`（新規）
- `tests/screens/v3/GameScreen.test.tsx`（+3）
- `tests/screens/v3/AppRoot.test.tsx`（+5）
- `tests/platform/audio.test.ts`（更新：SOUND_KINDS を v3+互換 8 種へ）

## 9. 既知の懸念

- カウントダウンの「毎秒 1 度ずつ厳密に 3/2/1」は fake-timer のバッチング下で中間秒が観測されにくいため、GameScreen.test では「残り 3/2/1 の範囲のみ・同秒重複なし・4 秒以上は出さない」で検証（厳密な 3/2/1 完全性は feedback.test / useFeedback.test の決定論テストでカバー）。実機の rAF 毎フレームコミットでは各秒境界が観測されるため production 挙動は正しい。
- 距離リマインド（DR-1）のティック音は本 S10 では未配線（spec F-14 はゲームのカウントダウンが主対象）。必要なら S11 で DistanceReminderScreen に同様の emit を追加可能。
