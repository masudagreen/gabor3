# Sprint 23 — expo-audio 導入で Native 音 (mp3) 対応 自己レビュー

## 概要

Sprint 22 Stage 3 で残っていた唯一の Warn（Native 音再生未対応 = no-op）を解消。
これで spec **F-19 音・ハプティクスフィードバック** が Web / iOS / Android
すべてで完全実装になる（音もハプティクスも、設定で個別 ON/OFF、サイレント尊重）。

- **対象スプリント**：Sprint 23（spec-v11.md v1.2 §F-19、§NF-31〜NF-33）
- **完了範囲**：F-19 Native 音再生（5 種 mp3 を expo-audio で配線）
- **ベースライン**：Sprint 22 Stage 3 後 129 suites / 1570 tests passing
- **本ステージ完了時**：**129 suites / 1585 tests passing**（typecheck / build:web PASS）

---

## A. 実装範囲

### A-1. expo-audio 依存追加（package.json / app.json）

- `package.json` dependencies に **`expo-audio: ~1.1.1`** を追加（rapidreading2
  と同じバージョン、Expo SDK 54 互換実績あり、SDK 54.0.34 にてビルド成功）
- `app.json` plugins に `"expo-audio"` を追加（plugin 自体は無くても動作するが、
  rapidreading2 の運用と揃え、将来の Config Plugin 拡張に備える）
- `npm install` で 1 package 追加（peer 解決問題なし）

### A-2. 音源 mp3 5 種を生成（assets/audio/）

ffmpeg で sine 波合成（Web の OscillatorNode と**同じ周波数・長さ**で揃え、
プラットフォーム間で体感を統一）：

| ファイル | 周波数（Hz） | 長さ | 音量 | 用途 | サイズ |
|---|---|---|---|---|---|
| `correct.mp3` | 523.25 (C5) → 659.25 (E5) | 110ms + 130ms | 0.18 | 正解 | 3.7 KB |
| `wrong.mp3` | 220 (A3) | 200ms | 0.16 | 不正解 | 3.7 KB |
| `tick.mp3` | 1200 | 70ms | 0.20 | カウントダウン残り 3-2-1 秒（共通、音量は EVENT_CONFIG 側で漸増制御） | 1.6 KB |
| `end.mp3` | 440 (A4) → 523.25 (C5) | 180ms + 240ms | 0.18 | 60 秒ゲーム終了 | 5.9 KB |
| `badge.mp3` | 523.25 → 659.25 → 783.99 (G5) | 130 + 130 + 200ms | 0.22 | バッジ獲得 | 6.2 KB |

**生成コマンド例**（再生成スクリプト無し、手動生成のため履歴目的で記録）：

```bash
cd assets/audio
ffmpeg -y -f lavfi -i "sine=frequency=523.25:duration=0.11" \
       -f lavfi -i "sine=frequency=659.25:duration=0.13" \
       -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1,volume=0.18" \
       -ar 44100 -ac 1 -b:a 96k correct.mp3
```

合計約 21 KB。Web ビルドには含まれない（require は Native 経路でのみ評価）。
Web bundle サイズは Sprint 22 Stage 3 と同一（796 kB）。

### A-3. src/platform/audio.ts 改修（Native 配線）

**追加した内部 API**：

- `loadNativeSource(key: NativeSourceKey)` — 静的文字列 require の switch dispatch
  （Metro バンドラはアセット解決に静的解析を要求するため、動的 key からの
  require はできない。switch で 5 ケース手書き）
- `getExpoAudio()` — Native でのみ動的 require、Web / jest 既定環境では null
- `configureAudioMode(api)` — 1 度だけ `setAudioModeAsync` を呼ぶ。
  - **`playsInSilentMode: false`**（iOS のミュートスイッチ尊重 = NF-33 達成）
  - `interruptionMode: 'mixWithOthers'`（他アプリ並走）
  - Android では interruptionMode の Enum 解決が不安定な expo-audio 1.1.x の
    既知問題に対応し、iOS のときだけ送る（rapidreading2 教訓を踏襲）
- `getNativePlayer(key)` — lazy 生成 + キャッシュ（同一 key 再利用、tick3/2/1 で
  プレイヤーは 1 個に集約）
- `playNativeSound(key, volume)` — `seekTo(0)` → `play()`、いずれの段階でも
  失敗時は silent fail

**EVENT_CONFIG 拡張**：各イベントに `nativeSourceKey` を追加。
tick3/tick2/tick1 は同じ `'tick'` を共有し、tick の音量漸増は EVENT_CONFIG の
`volume` フィールド（0.12 → 0.16 → 0.20）で実現（Native では player.volume に反映）。

**playEvent の分岐**：
- Web：従来通り OscillatorNode 合成（バンドルに mp3 を載せない）
- Native：playNativeSound() に委譲

**`_resetPlatformAudioForTest`** に追加：`_audioModule` / `_audioLoadFailed` /
`_audioModeConfigured` / `_nativePlayers` をすべてクリア。テストの隔離性を維持。

### A-4. テスト追加（+15 件）

**`tests/v11/platform/audio.test.ts`**（既定 Web 環境、+5 件）：
- 全 7 イベントに `nativeSourceKey` が紐付くことを検証
- tick3/tick2/tick1 が同じ `'tick'` を共有することを検証
- correct/wrong/gameEnd/badge が専用キー（'correct' / 'wrong' / 'end' / 'badge'）
  を持つことを検証

**`tests/v11/platform/audioNativeHaptics.test.ts`**（Platform.OS=ios、+10 件）：
- `expo-audio` モジュールを丸ごとモック（createAudioPlayer / setAudioModeAsync /
  setIsAudioActiveAsync）。`__mockPlayers` でプレイヤー履歴を捕捉
- `correct → createAudioPlayer / seekTo(0) / play()` 一連の呼び出し確認
- `音 OFF → createAudioPlayer も呼ばれない`（早期 return）
- 全 7 イベント発火 → プレイヤーは最大 5 個（tick 集約検証）
- 同じイベント 3 連発 → プレイヤーは 1 個、seekTo は 3 回
- iOS で `setAudioModeAsync` が `playsInSilentMode: false` で呼ばれる（NF-33）
- `setAudioModeAsync` は複数 playEvent でも 1 度だけ
- `setIsAudioActiveAsync(true)` 呼び出し確認
- `player.volume` がイベント設定値（badge: 0.22）を反映
- `_resetPlatformAudioForTest` 後にプレイヤーキャッシュが破棄され、再生成される

### A-5. docs/run.md 追記

Sprint 23 セクションを追加し、Native audio・haptics 対応表を更新（音 = no-op
→ expo-audio 配線済み）、実機確認の申し送りを追記。

---

## B. spec 受け入れ基準マッピング

| spec F-19 受け入れ基準 | 達成手段（本スプリント分のみ） | 確認 |
|---|---|---|
| 正解判定時に「正解音」が再生される | Native: correct.mp3 / Web: 既存 | Web ✅ / Native: 自動テストで配線確認、実機検証は申し送り |
| 不正解判定時に「不正解音」が再生される | Native: wrong.mp3 / Web: 既存 | 同上 |
| カウントダウン残り 3 / 2 / 1 秒のティック | Native: tick.mp3（音量漸増）/ Web: 既存 | 同上 |
| 60 秒ゲームタイマー終了時にゲーム終了音 | Native: end.mp3 / Web: 既存 | 同上 |
| バッジ獲得時にバッジ獲得音 | Native: badge.mp3 / Web: 既存 | 同上 |
| サイレントモード時の挙動 | iOS: `playsInSilentMode: false` で OS が音を抑制、ハプティクスは expo-haptics で継続 | NF-33 達成、自動テストで mode 引数検証 |
| 音 OFF / 振動 OFF の独立トグル | 既存（Sprint 22 Stage 3 で完了） | 既存テストで保証 |

---

## C. 自己評価チェックリスト

- [x] **typecheck PASS**（`npm run typecheck` 0 エラー）
- [x] **build:web PASS**（`npm run build:web` 成功、bundle 796 kB で Sprint 22 と同サイズ）
- [x] **全テスト PASS**（129 suites / 1585 tests / 0 fail）
  - Sprint 22 Stage 3 後：1570 件
  - Sprint 23 後：1585 件（**+15 件**：audio.test.ts +5、audioNativeHaptics.test.ts +10）
- [x] Web 動作のリグレッション無し（OscillatorNode 経路は変更なし、Native 分岐のみ追加）
- [x] mp3 5 種が `assets/audio/` に存在し、各 1.6〜6.2 KB の小ファイル
- [x] expo-audio が package.json / app.json plugins に追加済み
- [x] `_resetPlatformAudioForTest` がプレイヤーキャッシュも破棄する（テスト隔離）

---

## D. 既知の制約 / 申し送り（Native 実機確認）

### 自動テストでカバーしていない領域

実機 / Expo Go でのみ確認可能な項目（Evaluator または手動 QA で確認推奨）：

1. **音再生の体感品質**：
   - iOS Expo Go：correct.mp3 / wrong.mp3 / tick.mp3 / end.mp3 / badge.mp3 が
     実際に鳴るか。音量バランス（badge が一番大きく聞こえるか）。
   - Android Expo Go：同上。`setAudioModeAsync` の Android 互換性
     （interruptionMode を送らない構成にしてあるため、rapidreading2 と同じ動作）。

2. **NF-33 サイレントモード尊重**：
   - iOS 物理デバイスのサイレントスイッチを ON にして G-01 をプレイ。
     - 音は鳴らない、ハプティクスは継続発火することを確認。
   - Android：システム音量 0 でも音が鳴らないことを確認（OS 任せ）。

3. **NF-31 音再生レイテンシ（100ms 以内）**：
   - 実機でユーザータップ → 音再生開始までを目視 / イヤホン経由で確認。
     `seekTo(0)` → `play()` のシーケンスが原因で初回 1 発目だけ遅延する可能性
     あり（プレイヤー lazy 生成のため）。これが問題なら起動時に prime する
     （PostSession などで先読み）の追加実装を検討。

4. **連続再生の安定性**：
   - tick.mp3 が 3 連続（残り 3-2-1 秒）で正しく毎回再生されるか。
     プレイヤー再利用なので GC 負荷は無いはずだが、実機で目視確認推奨。

### 既知のリスク

- **expo-audio 1.1.1 の Android 既知問題**：rapidreading2 で報告された
  `interruptionMode` の Android Enum 解決問題は、**iOS のときだけ送る** 実装で
  回避済み。Android では `shouldPlayInBackground: false` のみ送る。
- **ハプティクスは Sprint 22 Stage 3 で実装済み**（変更なし）：iOS の
  UIImpactFeedbackGenerator（Light / Medium / Heavy）+ Android の VibratorManager
  に expo-haptics 経由でブリッジ済み。Web は navigator.vibrate。

### 音源生成スクリプトの永続化

mp3 は手動 ffmpeg コマンドで生成（履歴は本ドキュメント A-2 に記録）。今後も
生成パラメータを変更したい場合に備え、もし将来の Sprint で再生成スクリプトの
チェックインが望ましければ別 PR で `scripts/generate-audio.sh` を追加する余地あり
（本スプリントのスコープ外、YAGNI）。

---

## E. 変更ファイル一覧

### 追加（5）
- `assets/audio/correct.mp3`（3.7 KB）
- `assets/audio/wrong.mp3`（3.7 KB）
- `assets/audio/tick.mp3`（1.6 KB）
- `assets/audio/end.mp3`（5.9 KB）
- `assets/audio/badge.mp3`（6.2 KB）

### 更新（4）
- `package.json`（expo-audio 追加）
- `app.json`（plugins に "expo-audio" 追加）
- `src/platform/audio.ts`（Native 音再生配線、+150 行）
- `tests/v11/platform/audio.test.ts`（+5 件、Native ソースキー検証）
- `tests/v11/platform/audioNativeHaptics.test.ts`（+10 件、expo-audio 配線検証）
- `docs/run.md`（Sprint 23 セクション追記、Native audio 状態更新）

### ドキュメント
- `docs/sprints/sprint-23-self-review.md`（本ファイル）
