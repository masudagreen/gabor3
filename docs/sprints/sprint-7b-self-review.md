# Sprint 7-B 自己評価

## やったこと

### ロジック層（純関数 + フック）

新規ファイル：

- `src/lib/audio.ts`
  - `playCorrect()` / `playIncorrect()` API（Web Audio API でシンセサイズ、外部音源不要）
  - `setSoundEnabled(enabled)` モジュール状態で Settings.soundEnabled を反映
  - 正解音は C5 (523.25Hz) → E5 (659.25Hz) の 2 音、合計約 250ms。各音は短い ADSR 風エンベロープ
  - AudioContext は lazy-init（autoplay 制限を考慮）
  - ネイティブは v1.1 申し送り、現状は Platform.OS !== 'web' で no-op

- `src/lib/haptics.ts`
  - `lightImpact()` API（`navigator.vibrate(50)`）
  - `setHapticsEnabled(enabled)` モジュール状態で Settings.hapticsEnabled を反映
  - vibrate 非対応 / ネイティブ環境では no-op
  - 例外（SafariView 等の TypeError）は catch して握り潰す

- `src/lib/appState.ts`
  - `getCurrentForegroundState()` 純関数（Web: visibilityState, ネイティブ: AppState.currentState）
  - `subscribeAppForeground(listener)` 低レベル API（解除関数を返す）
  - `useAppForeground({ onBackground, onForeground })` フック
  - active → background の遷移検知のみ、background → background の重複は無視
  - jest 環境（document 不在）に配慮した `getDocument()` shim

- `src/lib/keyboardShortcuts.ts`
  - 純関数：`mapKeyToGame2(key)` / `mapKeyToGame3(key)`
  - フック：`useGame2Keyboard` / `useGame3Keyboard` / `useEscapeKey`
  - Platform.OS === 'web' でガード、ネイティブでは no-op
  - `getKeydownTarget()` で window / globalThis をフォールバック解決（テスト環境互換）

### UI 層（ゲーム画面 / モーダルへの組込）

修正ファイル：

- `src/screens/Game1Screen.tsx`：
  - finalizeTrial 内で `result?.isCorrectForStaircase` 時に `playCorrect()` + `lightImpact()`
  - `useAppForeground({ onBackground: () => onAbort() })` をマウント中ずっと購読
- `src/screens/Game2Screen.tsx`：
  - handleAnswer で正解時に音声 + 振動
  - `useGame2Keyboard({ onAnswer: handleAnswer, enabled: isAnswering })` を購読
  - `useAppForeground` で onBackground → onAbort
- `src/screens/Game3Screen.tsx`：
  - handleAnswer で正解時に音声 + 振動
  - `useGame3Keyboard({ onAnswer: handleAnswer, enabled: phase === 'answer' })` を購読
  - `useAppForeground` で onBackground → onAbort
- `src/components/DataDeletionConfirmModal.tsx`：`useEscapeKey({ onEscape: handleCancel, enabled: isOpen })`
- `src/navigation/AppRouter.tsx`：
  - 初期 Settings ロード時に `setSoundEnabled` / `setHapticsEnabled` を呼ぶ
  - `handleUpdateSettings` 内で patch 適用後にモジュール状態を即時反映
  - `handleClearAllData` でデフォルト復帰

### テスト追加

- `tests/lib/audio.test.ts`：4 件
  - soundEnabled=true で playCorrect が createOscillator を 2 回呼ぶ（2 音）
  - soundEnabled=false で playCorrect / playIncorrect 共に no-op
  - AudioContext 不在環境で例外を投げない
- `tests/lib/haptics.test.ts`：4 件
  - hapticsEnabled=true + vibrate あり で `vibrate(50)` 呼出
  - hapticsEnabled=false で no-op
  - vibrate 不在で no-op
  - vibrate 例外を catch して握り潰す
- `tests/lib/appState.test.ts`：4 件
  - getCurrentForegroundState（visible / hidden）
  - subscribeAppForeground 経由の listener 通知
  - useAppForeground：active → background → active 遷移
- `tests/lib/keyboardShortcuts.test.ts`：11 件
  - mapKeyToGame2（←/→/その他）
  - mapKeyToGame3（1-8 / 範囲外 / 文字）
  - useGame2Keyboard（enabled / disabled / →）
  - useGame3Keyboard（5 単独 / 1-8 全て）
  - useEscapeKey（Escape）

合計 23 件追加。

## 確認したこと

| 項目 | 結果 |
|---|---|
| `npm test` | **294 件 PASS（before 271 → after 294、+23）** |
| `npm run typecheck` | エラー 0 |
| `npm run build:web` | PASS（681 kB バンドル） |
| 既存テストの回帰 | なし（Sprint 1〜7-A 271 件すべて維持） |
| 音声 ON 時の正解音 | audio.test.ts で createOscillator 2 回発火確認 |
| 音声 OFF で完全 mute | audio.test.ts で no-op 確認 |
| 振動 ON で navigator.vibrate(50) | haptics.test.ts で確認 |
| Web 非対応で no-op | haptics.test.ts で確認 |
| visibilitychange で onBackground 発火 | appState.test.ts で確認 |
| Game 2 ←/→ ショートカット | keyboardShortcuts.test.ts で確認 |
| Game 3 1-8 ショートカット | keyboardShortcuts.test.ts で確認 |
| Game 1/2/3 リグレッション | tests/screens/Game1Screen.test.tsx / tests/components/Game2Screen.test.tsx / tests/screens/Game3Screen.test.tsx 全 PASS |

## 受け入れ基準マッピング

| 受け入れ基準 | カバレッジ |
|---|---|
| 音声 ON 時に正解で短い効果音 | `audio.test.ts` createOscillator 2 回 + Game1/2/3 統合 |
| 音声 OFF で音が出ない | `audio.test.ts` createOscillator 0 回 |
| 振動 ON + 対応端末で軽い振動 | `haptics.test.ts` vibrate(50) 呼出 |
| 振動 OFF で振動なし | `haptics.test.ts` 0 回 |
| Web 非対応で no-op | `haptics.test.ts` 例外なし |
| ゲーム中タブ切替で未完了試行記録 | `appState.test.ts` onBackground 発火 + Game 1/2/3 で onAbort |
| Web Game 2 ←/→ で回答 | `keyboardShortcuts.test.ts` |
| Web Game 3 1-8 で回答 | `keyboardShortcuts.test.ts` |
| ネイティブには影響なし | Platform.OS !== 'web' ガード |
| Sprint 1〜7-A リグレッション無し | 全 271 + 23 件 PASS |

## 既知の懸念 / 申し送り

### Sprint 7-C で扱うもの（仕様）
- **a11y 仕上げ**：focus outline、Skip link、prefers-reduced-motion、aria-checked 反映、SR 動線監査
- **staircase リセット導線**：F-15 「難易度をリセット」設定行 + S7-06 確認モーダルの配置
- **Skip link / Tab 順序**：全画面共通

### v1.1 申し送り（仕様凍結後の追加検討）
- **ネイティブ音声**：`expo-av` を導入して iOS / Android で playCorrect を本実装
- **ネイティブハプティクス**：`expo-haptics` を導入して `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`
- **Game 3 リズム BGM**：設定 `game3BgmEnabled` は永続化のみ。実際の BGM ループ再生は未着手

### 設計判断（debt 化しない）
- **モジュール状態 vs Context**：sound / haptics 設定はゲーム画面から「呼ぶたびに Settings を購読する」のはコストが高いため、モジュールスコープ変数 `_soundEnabled` / `_hapticsEnabled` で保持。AppRouter が Settings の load / update で `setSoundEnabled` / `setHapticsEnabled` を呼ぶ責務を持つ。
- **AudioContext の lazy-init**：autoplay 制限を考慮して、初回 `playCorrect()` 時に作成。失敗時は `_ctxFailed` フラグでリトライ抑制。
- **キーボード getKeydownTarget の globalThis フォールバック**：jest の node 環境（react-native test env）で `window` が undefined のため、`globalThis` を試して購読対象を確保。本番 Web では `window` を優先する。
- **DataDeletionConfirmModal の Esc 対応**：Modal 自体は React Native の `onRequestClose` ハンドラがあるが、Web では `Escape` キーで発火しない。`useEscapeKey` フックで補完。

### スキーマ変更
- なし（Settings 構造は既存）

## 成果物パス（絶対パス）

新規ファイル：
- `/Users/np_202212_11/projects/gabor3/src/lib/audio.ts`
- `/Users/np_202212_11/projects/gabor3/src/lib/haptics.ts`
- `/Users/np_202212_11/projects/gabor3/src/lib/appState.ts`
- `/Users/np_202212_11/projects/gabor3/src/lib/keyboardShortcuts.ts`
- `/Users/np_202212_11/projects/gabor3/tests/lib/audio.test.ts`
- `/Users/np_202212_11/projects/gabor3/tests/lib/haptics.test.ts`
- `/Users/np_202212_11/projects/gabor3/tests/lib/appState.test.ts`
- `/Users/np_202212_11/projects/gabor3/tests/lib/keyboardShortcuts.test.ts`

修正：
- `/Users/np_202212_11/projects/gabor3/src/screens/Game1Screen.tsx`
- `/Users/np_202212_11/projects/gabor3/src/screens/Game2Screen.tsx`
- `/Users/np_202212_11/projects/gabor3/src/screens/Game3Screen.tsx`
- `/Users/np_202212_11/projects/gabor3/src/components/DataDeletionConfirmModal.tsx`
- `/Users/np_202212_11/projects/gabor3/src/navigation/AppRouter.tsx`
- `/Users/np_202212_11/projects/gabor3/docs/run.md`

不変：
- 仕様書、デザイン、Sprint 1〜7-A の永続化・スキーマすべて
