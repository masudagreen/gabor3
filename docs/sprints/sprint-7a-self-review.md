# Sprint 7-A 自己評価

## やったこと

### データ層
- `src/state/storage.ts`：Settings の load/save/update / clearAllStorage / resetAllStaircases は既に実装済（Sprint 6 に先行配置）。本タスクではテストのみ追加
  - 「Settings round-trip」5 件
  - 「resetAllStaircases」1 件
  - 「全データ削除 → User/Settings/Streak 全戻り」を 1 件追加
- 全データ削除フローを AppRouter に組み込み（onClearAllData → clearAllStorage → onboarding 再開）

### ロジック層
- `src/theme/ThemeProvider.tsx`：新規
  - `resolveThemeMode(preference, systemScheme)` 純関数（system/light/dark の解決）
  - `<ThemeProvider preference={...}>` Context Provider
  - `useTheme()` フック（Provider なしでも安全にデフォルト返却）

### UI 層
- `src/components/Toggle.tsx`：components.md §6 に準拠した Switch
- `src/components/ListItem.tsx`：components.md §4 に準拠（trailing="chevron"|"toggle"|"value"|"checkmark"|"none"）
- `src/components/OptionPickerModal.tsx`：ダークモード選択 / 片眼ガイダンス選択 / バージョン情報モーダルの汎用ピッカー（radiogroup）
- `src/components/DataDeletionConfirmModal.tsx`：screens.md S7-04 + S7-05 を 1 コンポーネントに統合（段階 1 → 段階 2 の内部 state 管理）
- `src/components/Snackbar.tsx`：軽い完了通知（4 秒自動消失）
- `src/screens/SettingsScreen.tsx`：screens.md S7-01 全 5 セクション
- `src/navigation/AppRouter.tsx`：
  - ThemeProvider をルートでラップ（settings.darkMode を購読）
  - settings ルート追加 + HomeScreen の onOpenSettings を有効化
  - clearAllStorage → setRoute({onboarding}) フロー実装
  - Settings の load を初期化フェーズに追加

### テスト追加
- `tests/storage.test.ts`：Settings 5 件 + resetAllStaircases 1 件 = **6 件追加**
- `tests/theme/ThemeProvider.test.tsx`：**7 件追加**（resolveThemeMode 純関数 3 + useTheme 4）
- `tests/screens/SettingsScreen.test.tsx`：**8 件追加**（全項目表示 / トグル動作 / 削除モーダル発火 / picker / 戻る）
- `tests/components/DataDeletionConfirmModal.test.tsx`：**7 件追加**（段階 1/2 / disabled / cancel / 再 open リセット）

合計 28 件追加。

## 確認したこと

| 項目 | 結果 |
|---|---|
| `npm test` | **271 件 PASS（before 242 → after 271、+29）** ※ 元 242 + 28 + 1 件は既存 storage テスト調整 |
| `npm run typecheck` | エラー 0 |
| `npm run build:web` | PASS（674 kB バンドル） |
| 既存テストの回帰 | なし（Sprint 1〜6 のテストはすべて維持） |
| Settings round-trip | テストで確認 |
| ダークモード切替 | resolveThemeMode 純関数 + useTheme フックで確認 |
| 全データ削除 | clearAllStorage テストで確認 |
| 設定画面の全項目表示 | SettingsScreen テストで確認 |
| 2 段階削除確認 | DataDeletionConfirmModal テストで確認 |

## 受け入れ基準マッピング

| 受け入れ基準 | カバレッジ |
|---|---|
| 設定画面の全項目編集可能 | `tests/screens/SettingsScreen.test.tsx`：全項目 testID 表示 + トグル / picker 動作 |
| 編集後の永続化 | `tests/storage.test.ts`：Settings save/load round-trip |
| ダークモード切替（system/light/dark） | `tests/theme/ThemeProvider.test.tsx`：resolveThemeMode + Provider 切替 |
| 即時反映 | AppRouter で `<ThemeProvider preference={settings.darkMode}>`、設定変更 → setSettings → re-render |
| 全データ削除 → オンボへ | `tests/storage.test.ts`：clearAllStorage → loadUserProfile.onboardingCompleted=false |
| 24px 以上のフォント | ListItem.title / SectionHeader / Snackbar 全て fontSize.body=24 / fontSize.h2=30 |
| 48-64px 以上のタップ領域 | Toggle hitbox 48×48、ListItem minHeight=72、Button minHeight=56-64 |
| 360/375/1280px 対応 | maxWidth=720 中央寄せ、ScrollView でオーバーフロー対応 |
| Sprint 1〜6 リグレッション無し | 全 271 件 PASS |

## 既知の懸念 / 申し送り

### Sprint 7-B で扱うもの（仕様）
- **音声・ハプティクスの実発火**：Settings.soundEnabled / hapticsEnabled は永続化されるが、実際にゲーム内で音／振動を出す処理は未実装
- **AppState 連携**：バックグラウンド復帰時の処理（Sprint 7-B）
- **キーボードショートカット**：Esc で戻る等
- **staircase リセット導線**：F-15 仕様の「難易度リセット」設定行は本タスクで追加せず（resetAllStaircases 関数は実装済、S7-06 モーダルだけ未配置）

### Sprint 7-C で扱うもの（仕様）
- **a11y 仕上げ**：focus outline 強化、skip link、prefers-reduced-motion、SR 動線監査
- **screens.md S7-09 ダークモード切替演出（200ms クロスフェード）**：本タスクは即時切替のみ
- **screens.md S7-08 設定経由のバッジ一覧導線**：未追加（ホーム経由のままで動く）

### 設計判断（debt 化しない）
- **ThemeProvider と既存 useColorScheme() の併存**：HomeScreen / Game 系画面はまだ `useColorScheme()` ベース。AppRouter で ThemeProvider をラップしているが、子コンポーネント側で `useTheme()` への移行は段階的に行う方針（一斉移行は危険）。Settings / DataDeletionConfirmModal / OptionPickerModal / Snackbar / ListItem / Toggle / SettingsScreen は useTheme() を使う
- **AppRouter 内部の effectiveScheme**：ThemeProvider と同じロジックを AppRouter 内部にも書いている（既存子コンポーネントが useColorScheme() ベースのため、当面は後方互換ロジックを残す）。Sprint 7-C で完全移行時に整理
- **DataDeletionConfirmModal は 1 コンポーネントで段階 1/2 を統合**：screens.md は S7-04 / S7-05 と分けているが、Modal 内 phase state で十分。テストも 1 ファイル

### スキーマ変更
- なし（Settings は spec.md §12.1 で凍結済の構造をそのまま使用）

## 成果物パス（絶対パス）

新規ファイル：
- `/Users/np_202212_11/projects/gabor3/src/theme/ThemeProvider.tsx`
- `/Users/np_202212_11/projects/gabor3/src/components/Toggle.tsx`
- `/Users/np_202212_11/projects/gabor3/src/components/ListItem.tsx`
- `/Users/np_202212_11/projects/gabor3/src/components/OptionPickerModal.tsx`
- `/Users/np_202212_11/projects/gabor3/src/components/DataDeletionConfirmModal.tsx`
- `/Users/np_202212_11/projects/gabor3/src/components/Snackbar.tsx`
- `/Users/np_202212_11/projects/gabor3/src/screens/SettingsScreen.tsx`
- `/Users/np_202212_11/projects/gabor3/tests/theme/ThemeProvider.test.tsx`
- `/Users/np_202212_11/projects/gabor3/tests/screens/SettingsScreen.test.tsx`
- `/Users/np_202212_11/projects/gabor3/tests/components/DataDeletionConfirmModal.test.tsx`

修正：
- `/Users/np_202212_11/projects/gabor3/src/navigation/AppRouter.tsx`：ThemeProvider ラップ、settings ルート追加、Settings load / clearAll / updateSettings 実装
- `/Users/np_202212_11/projects/gabor3/tests/storage.test.ts`：Settings round-trip テスト追加
- `/Users/np_202212_11/projects/gabor3/docs/run.md`：Sprint 7-A セクション追記

不変：
- `/Users/np_202212_11/projects/gabor3/src/state/storage.ts`：Settings 関連関数は Sprint 6 で配置済み、本タスクでは触らず
- `/Users/np_202212_11/projects/gabor3/src/screens/HomeScreen.tsx`：既存 onOpenSettings は呼び出し元（AppRouter）が変更されたのみ、HomeScreen 自体は不変
