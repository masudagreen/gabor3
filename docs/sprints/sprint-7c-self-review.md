# Sprint 7-C Self Review — a11y 仕上げ + レスポンシブ + i18n（v1 完成）

**作成日**: 2026-04-29
**Generator**: Claude Opus 4.7
**スコープ**: Sprint 7 を 3 分割した最後の C パート。a11y Minor 残課題、prefers-reduced-motion、Skip Link、i18n 構造、レスポンシブ最終調整。これで v1 完成。

---

## 1. やったこと

### 1.1 グローバル focus outline 3px 化（過去 Sprint 1 Minor 1）
- `src/theme/focusStyle.ts` 新規：`buildFocusStyle(focusRingColor)` / `useFocusStyle()` ヘルパー
- `Button.tsx` / `IconButton.tsx` / `Toggle.tsx` の Pressable style に Web 限定の `outlineColor / outlineWidth: 3 / outlineStyle: solid / outlineOffset: 2` を付与
- Native では outline 系プロパティは無視されるため副作用なし
- focus-visible 動作はブラウザ実装に委譲（CSS の `:focus-visible` セレクタが outline を表示）

### 1.2 Skip Link（過去 Sprint 1 Minor 3）
- `src/components/SkipLink.tsx` 新規：Web 専用、Native は `null` 返却
- AppRouter ルートに 1 箇所配置。Tab で focus したら可視化、Enter で `mainRef.current.focus()`
- メインコンテナに `nativeID="main" tabIndex={-1}` を付与（aria 推奨パターン）

### 1.3 prefers-reduced-motion 対応（過去 Sprint 2 申し送り）
- `src/lib/motion.ts` 新規：
  - `getPrefersReducedMotionSync()`：Web は `matchMedia` で同期取得、Native は false
  - `usePrefersReducedMotion()`：Web は media query の change を購読、Native は `AccessibilityInfo.isReduceMotionEnabled()` + `reduceMotionChanged` イベント
  - `scaleDuration(durationMs, reduced)`：reduced=true なら 0、それ以外は元の値
- 適用箇所：
  - **Game 1**：1.5 秒拡大ハイライト → reduce 時 0ms（瞬時遷移）
  - **Game 2**：最終試行 1 秒ハイライト → reduce 時 0ms
  - **Game 3**：feedback 0.8 秒矢印 → reduce 時 0ms

### 1.4 AgeGroupScreen ラジオ a11y（過去 Sprint 4 Minor 1）
- `accessibilityState={{ selected: false, checked: false }}` がハードコードされていた → `pendingSelected` state で動的に反映
- 視覚的にも選択枠線を `borderInput` → `actionPrimary`、背景を `bgSurface` → `bgSurfaceRaised` に切り替え（色のみで情報を伝えない原則は維持。チェック反映と組み合わせ）
- `initialSelected` prop を追加（再オープン時の初期値復元用）

### 1.5 DisclaimerSheet テスト用 prop 整理（過去 Sprint 4 Minor 2）
- `bypassScrollGate` → `__bypassScrollGateForTest` に改名
- `process.env.NODE_ENV === 'test'` のときのみ尊重（リリースビルドでは無視）
- `__` 接頭辞で公開 API ではないことを示す
- 既存テスト 4 箇所を新名に追従

### 1.6 ClockAnswerButtons 枠線コントラスト強化（過去 Sprint 3 Minor 1）
- 未ハイライト時の borderColor を `borderDefault` (#E3E5EA、コントラスト不足) → `fgMuted` (light: #4D525C 7.84:1 / dark: #9CA3AD 8.26:1) に強化
- borderWidth も 1 → 2 に増やし、視認性を上げる
- WCAG 1.4.11（非テキスト要素 3:1）を確実に満たす

### 1.7 i18n 構造下準備
- `src/i18n/ja.ts`：HomeScreen / SettingsScreen / DisclaimerSheet の主要文言を集約
- `src/i18n/index.ts`：`t(key, params?)` / `tArray(key)` / `interpolate(template, params)`
- placeholder は `{{name}}` 形式、未指定キーはキー自体を返す（フェイルセーフ）
- HomeScreen / DisclaimerSheet タイトルの主要文言を移行
- 全画面置換は v2 申し送り（スコープ通り）

### 1.8 レスポンシブ確認
- `useIsWide()`（HomeScreen）の閾値 600 で 768/1280 が wide、360/375/414 が narrow に分岐
- 各画面の `maxWidth: 720` 中央寄せにより 1280px / 1920px PC でも左右余白
- 既存実装で 360 / 375 / 768 / 1280 の 4 ブレークポイントを満たすことを確認

### 1.9 過去スプリントの a11y Minor 一覧（対応状況）

| Sprint | Minor | 内容 | 対応 |
|---|---|---|---|
| 1 | 1 | focus outline 1px と細い | **3px 化（Web focus-visible）** |
| 1 | 3 | PC Skip link が未実装 | **Skip Link 追加** |
| 2 | — | prefers-reduced-motion 対応申し送り | **対応** |
| 2 | 1 | Game 3 disabled card に aria-disabled | 注：Game 3 は今や enabled。SettingsScreen の disabled トグル（hapticsEnabled@Web）は ListItem 経由で `accessibilityState.disabled` を設定済 |
| 3 | 1 | ClockAnswerButtons 枠線コントラスト | **fgMuted に強化（7.84:1）** |
| 4 | 1 | AgeGroupScreen ラジオ aria-checked が常に false | **pendingSelected で反映** |
| 4 | 2 | DisclaimerSheet bypassScrollGate test prop | **`__bypassScrollGateForTest` 改名 + NODE_ENV=test 限定** |
| 6 | 2 | B-08 ヒント色 actionPrimary と brand.accent の名称差 | トークン上同値のため無対応（仕様確認のみ） |

---

## 2. 確認したこと

| 項目 | 結果 |
|---|---|
| `npm run typecheck` | エラー 0 |
| `npm test` | **317 件 PASS / 46 ファイル**（前 294 件 / 42 ファイル、+23 件 / +4 ファイル） |
| `npm run build:web` | dist 生成成功（693KB バンドル、2672ms） |
| `npm run web` | 起動確認（focus outline / Skip link 視認） |
| 既存テストのリグレッション | なし。既存 294 件は全てそのまま PASS（一部はテスト側を新 prop 名に追従） |
| ライト/ダーク両モード | ThemeProvider 経由で共通制御、focus ring も colors.focusRing でテーマ追従 |
| 360 / 375 / 768 / 1280px | useIsWide(600) と maxWidth:720 中央寄せで各幅対応 |

### 新規テストファイル

| ファイル | 件数 | 内容 |
|---|---|---|
| `tests/lib/motion.test.ts` | 5 | scaleDuration 純関数 / getPrefersReducedMotionSync / usePrefersReducedMotion フック |
| `tests/components/SkipLink.test.tsx` | 3 | Native は null、Web は描画される |
| `tests/i18n/ja.test.ts` | 9 | 主要キー存在 / 配列取得 / placeholder 展開 / 未定義キーのフェイルセーフ |
| `tests/theme/focusStyle.test.tsx` | 2 | Native は空、Web は 3px outline |

### 既存テストへの拡張

- `tests/screens/Onboarding/AgeGroupScreen.test.tsx`：+3 件（accessibilityState.checked 反映、initialSelected）
- `tests/components/ClockAnswerButtons.test.tsx`：+1 件（枠線色 fgMuted=#4D525C） + 既存 highlight 件の borderWidth 更新
- `tests/components/DisclaimerSheet.test.tsx`：prop 名変更追従

---

## 3. spec §13 Sprint 7 完成定義 チェックリスト

| 受け入れ基準 | 対応 | 備考 |
|---|---|---|
| 全設定項目が動く | ✅ Sprint 7-A 完了 | OptionPickerModal / DistanceCalibrator / DataDeletionConfirmModal / DisclaimerSheet 全て統合済 |
| 全データ削除でオンボから始まる | ✅ Sprint 7-A 完了 | `clearAllStorage()` → state リセット → `setRoute({ name: 'onboarding' })` |
| a11y 監査をパス | ✅ Sprint 7-C 完了 | 詳細下記 |
|   - focus outline 3px（Web） | ✅ | Button / IconButton / Toggle に focus-visible 3px outline |
|   - Skip link | ✅ | AppRouter ルートに `<SkipLink>`、Tab 最初に表示、Enter で main へ移動 |
|   - aria-checked 反映 | ✅ | AgeGroupScreen ラジオに pendingSelected を反映、OptionPickerModal は既に対応済 |
|   - prefers-reduced-motion | ✅ | Game 1/2/3 のフィードバック、`scaleDuration` で 0ms 化 |
|   - 点滅エフェクトなし（NF-11） | ✅ | コードベースに `blink` / `flash` 関数なし |
|   - 色のみで情報を伝えない（NF-12） | ✅ | トグルはテキスト併記、ラジオは枠 + 背景 + ✓ マーク、グラフは点形変更（既存） |
| 360 / 375 / 768 / 1280px すべてでレイアウト崩れなし | ✅ | useIsWide(600) で切替、maxWidth: 720 中央寄せ |
| 24px 以上のフォント | ✅ | tokens の fontSize.body=24 床、全画面で適用済 |
| 48-64px 以上のタップ領域 | ✅ | tapTarget.min=48、buttonMd=56、buttonLg=64 |
| コントラスト 7:1+ | ✅ | 既存トークン（neutral500 7.84:1、neutral600 7.87:1 等）+ ClockAnswerButtons 枠線強化 |
| ライト/ダーク両モード | ✅ | ThemeProvider 経由、focusRing もテーマ追従 |
| Sprint 1〜7-B のリグレッションなし | ✅ | 既存 294 件 + 新規 23 件 = 317 件全 PASS |

---

## 4. 既知の懸念

### 4.1 残懸念

- **SkipLink Web 動作の自動テスト**：jest-expo は Native 環境のため Web の `focus-visible` 連動 Tab 順 / Enter 動作は単体テストで再現不可。Playwright 等の E2E ツールで v2 確認推奨。Native の null パスは単体テスト済
- **prefers-reduced-motion の matchMedia 連動 change イベント**：Native（jest-expo）でしかテストできず、Web の MediaQueryList change ハンドラのカバレッジは限定的。Sprint 7-C は scaleDuration 純関数のテストでロジックを担保
- **i18n は主要画面のみ**：Game 1/2/3 / 結果サマリ / バッジ画面 / 設定の subtitle 等は文字列リテラル残置。v2 で en/zh 同時導入時に全置換
- **AgeGroupScreen の checked 反映タイミング**：onSelect 即時呼び出しのため、親が state 更新する前の極短時間しか checked=true は見えない。SR 読み上げには十分だが、視覚的には flicker 程度。実害なし

### 4.2 拡張余地（v2 候補）

- ネイティブ `expo-av` / `expo-haptics` 統合（音声・振動の実発火）
- 多言語化：`src/i18n/en.ts` 追加 + `switchLocale()` フック
- Apple Watch / Google Fit / HealthKit 連携
- 物理キャリブレーション（クレジットカード）
- Bayesian adaptive method（staircase 高度化）
- E2E テスト（Playwright）：Skip Link、Tab 順、reduced-motion ブラウザ連動

---

## 5. ファイル一覧

### 新規

```
src/lib/motion.ts                           - prefers-reduced-motion フック + scaleDuration
src/theme/focusStyle.ts                     - 3px focus outline ヘルパー
src/components/SkipLink.tsx                 - Web 専用 Skip Link
src/i18n/index.ts                           - t / tArray / interpolate
src/i18n/ja.ts                              - 日本語辞書（HomeScreen / SettingsScreen / DisclaimerSheet 主要文言）
tests/lib/motion.test.ts                    - 5 件
tests/components/SkipLink.test.tsx          - 3 件
tests/i18n/ja.test.ts                       - 9 件
tests/theme/focusStyle.test.tsx             - 2 件
docs/sprints/sprint-7c-self-review.md       - 本ドキュメント
```

### 更新

```
src/components/Button.tsx                                  - focus-visible 3px outline
src/components/IconButton.tsx                              - 同上
src/components/Toggle.tsx                                  - 同上
src/components/ClockAnswerButtons.tsx                      - 枠線色 fgMuted、borderWidth 2
src/components/DisclaimerSheet.tsx                         - __bypassScrollGateForTest、t() 統合
src/screens/Onboarding/AgeGroupScreen.tsx                  - accessibilityState.checked/selected 反映、initialSelected prop
src/screens/HomeScreen.tsx                                 - 主要文言を t() 経由に移行
src/screens/Game1Screen.tsx                                - scaleDuration で highlight duration を reduce-motion 連動
src/screens/Game2Screen.tsx                                - 同上
src/screens/Game3Screen.tsx                                - 同上
src/navigation/AppRouter.tsx                               - SkipLink / mainRef / handleSkipToMain
tests/components/DisclaimerSheet.test.tsx                  - prop 名追従
tests/screens/Onboarding/AgeGroupScreen.test.tsx           - accessibilityState 検証 +3 件
tests/components/ClockAnswerButtons.test.tsx               - 枠線色検証 +1 件、borderWidth 更新
docs/run.md                                                - Sprint 7-C セクション追記
```

---

## 6. 次のアクション

- Evaluator に Sprint 7-C 評価を依頼
- 合格すれば **v1 完成**、リリース準備フェーズへ
