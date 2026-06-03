# Sprint 9 自己評価 — 音・ハプティクス（F-14 / NF-31〜33）

> v2.0 リブートの Sprint 9。旧 v1.1 Sprint 9 の内容は本ファイルで置き換えた。

## 1. やったこと（3 層分離）

1. **プラットフォーム抽象（副作用層）**
   - `src/platform/audio.ts`：`../rapidreading2/src/platform/audio.ts` の `AudioBackend` 抽象を流用し、
     本アプリの 5 音種（correct/wrong/tick/end/badge）に適合。`play(kind, volume)` の薄い API。
     - Web：Web Audio API（OscillatorNode）で音種ごとに短い合成音を生成（音源ファイル不要・バンドル増なし）。
     - Native (iOS/Android)：expo-audio で `assets/audio/<kind>.mp3` を 5 プレイヤーで再生。
   - `src/platform/haptics.ts`：rapidreading2 に haptics 抽象が無かったため、audio.ts と同型の
     `HapticsBackend` を新規定義。Native=expo-haptics `impactAsync`（badge は heavy→medium の 2 連）、Web=Noop。
2. **決定（純関数）** `src/lib/v2/feedback.ts`：`decideFeedback(event, settings, silent)` が
   イベント × soundEnabled × hapticsEnabled × サイレント → 鳴らす音種/音量/振動種を返す。副作用ゼロでテスト可能。
3. **配線コントローラ** `src/hooks/v2/useFeedback.ts`：決定と再生を橋渡しする `emit(event)`。
   AppRoot が 1 インスタンス保持し prime も 1 度だけ。GameScreen / 結果カードへ配る。

### 配線箇所
- `GameScreen`：開示 effect で `aggregateKind` から round-correct/round-wrong を 1 度発火。
  playing 中の `remainingSec` 監視で残り 3/2/1 秒の countdown-tick を各 1 度発火（試行中だが採点直前予告として system §10.2 で許容される唯一の例外）。
- `AppRoot`：`handleSessionComplete` で session-complete（完了音）。`handleBadgeShown`（`SessionResultCard.onBadgeShown` → `BadgeAwardToast.onShown` の既存経路）で badge-earned。

## 2. 確認したこと

- `npx tsc --noEmit`：エラー 0
- `npm test`：48 スイート / **439 件 PASS**（S8 後 402 → **+37 件**）
- `npm run build:web`：PASS（audio 5 件がアセットにバンドル）
- 新規テスト内訳：feedback 決定 16 / audio backend 6 / haptics backend 6 / GameScreen 配線 6 / AppRoot 配線 3
- 主要動線（テスト経由）：採点で正解/不正解音、残り 3/2/1 でティック、完了で end、初回完了の B-01 獲得で badge 音+振動。
  音 OFF→音は無・振動は発火、振動 OFF→振動は無・音は発火、サイレント→音抑止・ハプティクス継続（決定関数で検証）。

## 3. 受け入れ基準マッピング（F-14）

| 受け入れ基準 | 対応 | 検証 |
|---|---|---|
| 採点時に正解/不正解音（音 OFF 無音） | GameScreen 開示 effect → emit | GameScreenFeedback / feedback.test（SOUND_OFF） |
| 残り 3/2/1 秒ティック音 | GameScreen remainingSec 監視 | GameScreenFeedback（各 1 回・4 秒以上は無） |
| セッション完了音 | AppRoot.handleSessionComplete | AppRootFeedback（end 検証） |
| バッジ獲得音 | AppRoot.handleBadgeShown | AppRootFeedback（badge 検証） |
| 正解/不正解/バッジで振動（振動 OFF 無振動） | decideFeedback の haptic | feedback.test / AppRootFeedback（HAPTIC_OFF） |
| サイレント時 音なし・ハプティクスあり | decideFeedback silent=true + iOS playsInSilentMode:false | feedback.test（NF-33 ブロック） |
| 試行中は採点 FB 以外を出さない | 採点 FB は revealed のみ、ティックは残り 3/2/1 のみ | GameScreenFeedback（試行中ケース） |

## 4. 流用元の適合内容

rapidreading2 の `AudioBackend`（prime/click/stop/isAvailable + Web/Native/Noop の Platform 分岐 +
get/setDefault のキャッシュ差し替え）の設計をそのまま踏襲。差分は (a) 単一クリック音 → 5 音種の
`play(kind, volume)` 化、(b) Web を「合成 1 音」から音種ごとの周波数列合成へ、(c) Native を単一 WAV →
5 mp3 プレイヤーへ、(d) iOS の `playsInSilentMode` を **true→false** に変更（本アプリはサイレント尊重 NF-33
が要件のため）。Android の `interruptionMode` 1.1.x バグ回避（iOS のときだけ詳細フィールド送信）も踏襲。

## 5. Web/native 両対応の方法

- Platform 分岐：`getDefaultAudioBackend()` が `Platform.OS==='web'` で WebAudioBackend、それ以外で
  NativeAudioBackend を返す。haptics は Web=Noop。
- Web の AudioContext は `globalThis.AudioContext`（`document`/`window` 直叩きなし）。
- expo-audio / expo-haptics の `require` は Native バックエンド内で lazy 評価（Web では到達しない）。
- metro はビルド時に mp3 の require を静的解決するため web バンドルにも assets が含まれるが、実行時は
  WebAudioBackend が使うため無害。

## 6. サイレント尊重の実装

二重担保：(1) iOS は `setAudioModeAsync({ playsInSilentMode: false })` で OS が音を抑止（ハプティクスは継続）、
(2) 決定関数 `decideFeedback` が `silent` 引数で「音抑止・ハプティクス継続」を表現（テストで明示検証）。
実行時は確実な OS の audio session に委ね、`useFeedback` は `silent=false` を渡す（公開 API でリンガー状態を
信頼して取得する手段が無いため）。

## 7. アセットの扱い

`assets/audio/` に correct/wrong/tick/end/badge の 5 mp3 が既存。これを native で利用。各 require は個別 try/catch で
欠落耐性を持たせ、欠落・API 失敗でも silent fail（NoopAudioBackend / 個別プレイヤー null）でクラッシュしない。
Web は音源ファイルを使わず合成音（バンドル増回避）。

## 8. native 混入監査結果（CLAUDE.md §5）

- `document`/`window`/`navigator` の直アクセス：**なし**（grep 済み、コメント言及のみ）。
- Web 専用 API は `globalThis.AudioContext` を `Platform.OS==='web'` 分岐内に限定。
- `Image` transform 等のメモ化問題：本スプリントは描画変更なしのため無関係。
- expo-audio/expo-haptics は Native 分岐内 lazy require のため Web/テストに混入しない。

## 9. 既知の懸念・申し送り

- Web の音は合成音で native の mp3 と体感が微妙に異なる（機能要件は充足）。
- prime はマウント時。Web 自動再生制限は厳密にはジェスチャ内 prime が理想で、起動フロー上ゲーム到達時に
  タップ済みのため実用問題なしと判断。気になれば S10 で最初のタップ内 prime へ。
- 実音・実振動・NF-31 レイテンシ・iOS サイレントスイッチの体感は **実機 Expo Go でのみ最終確認可能**（run.md S9.5 に手順）。
