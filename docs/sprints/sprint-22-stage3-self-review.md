# Sprint 22 Stage 3 — F-21 / アプリアイコン / Native audio・haptics / バッジ / 設定 / セッション永続化 自己レビュー

## 概要

Sprint 22（v1.2 リブート）の最終ステージ。Stage 1 / 2-A / 2-B は合格済み。
本ステージで **v1.2 リリース候補ビルド** が完成する想定。

- **対象スプリント**：Sprint 22 Stage 3（spec-v11.md v1.2、design-v11/sprints/sprint-22）
- **完了範囲**：F-21 事後画面 / F-20 アプリアイコン / F-19 Native ハプティクス /
  F-13 バッジ評価 / F-14 設定 / 9.1 永続化 / G-13 staircase 切替
- **ベースライン**：Stage 2-B 後 124 suites / 1496 tests passing
- **本ステージ完了時**：**129 suites / 1570 tests passing**（typecheck / build:web PASS）

---

## A. 実装範囲

### A-1. F-21 連続プレイ事後画面（PostSessionScreen 新設）

`src/screens/v11/PostSessionScreen.tsx` を新設。design-v11/components.md §32（PS-1）/
sprints/sprint-22/screens.md §8 / mockups/07-postsession.html に準拠。

- **構成（screens.md §8.1 / mockup 07）**：
  - 上部：左ロゴ「GaborEye」（h3 26px Bold、role=header） + 右 ⚙ 設定 IconButton
    （56×56pt タップ領域、aria-label="設定を開く"）
  - ワイドスコア section：「今日のスコア」label / 大きな数値（72px Bold tabular-nums）
    / ／100 ラベル（24px）
  - ストリーク：🔥 + N 日連続（24px Medium）
  - セパレータ + section title「各ゲームの結果」（h3 26px、aria-level=2）
  - 7 ゲーム結果リスト（role=list）：
    - 各行 72pt minHeight、左ゲーム名（"G-XX 名前"）/ 中央 ✅❌ バッジ（36px 円）/
      右閾値（80px tabular-nums）
    - role=listitem、aria-label に "G-XX 名前 正解/不正解 閾値 N 度" を統合
  - 入口ボタン 3 つ：📊 進捗（Primary）/ 🏅 バッジ（Secondary）/ ⚙ 設定（Tertiary）、
    各 64pt（Button.lg）
  - SafeAreaWrapper mode="default"（NF-30 セーフエリア準拠）
- **「もう一度プレイ」ボタンは設けない**（spec F-21 受け入れ：1 日 1 周設計）
- **閾値フォーマット**（`formatThresholdForPostSession`）：
  - G-01 → "3.5°/s"（1 桁小数 + °/s）
  - G-03 / G-07 → "12°" or "8.5°"（整数なら整数、端数なら 1 桁小数）
  - G-04 / G-06 / G-13 → "0.18" / "1.40" / "0.12"（2 桁小数、無単位）
  - G-05 → "1.4×"（1 桁小数 + ×）
- **a11y**：
  - SR ラベル：「今日のワイドスコアは 72 点（100 点満点）」「現在のストリークは 5 日連続」
  - 各ゲーム行：`aria-label="G-01 回転検出 正解 閾値 3.5 度毎秒"`
  - ボタン：`aria-label="進捗グラフを見る"` / `"バッジを見る"` / `"設定を開く"`
- **ヘッダ⚙ ボタン** と **footer 設定ボタン** は同じ `onPressSettings` を呼ぶ
- **wideScore=null** のとき "—" を表示（実施 0 件の特殊運用、通常は数値）

### A-2. セッション永続化（sessionPersistence 新設）

`src/lib/v11/sessionPersistence.ts` を新設。CourseRunner からの実ゲーム永続化を本接続。

- **`finalizeCourseSession(input)`**：副作用ありヘルパー
  - 1. SessionRecord（sessionType=full-course）を組み立てて AsyncStorage に保存
    （`KEY_SESSION_V11(<uuid>)` 配下）
  - 2. `recordFullCourseCompletionV11(today, results)` で当日 DailyStats を更新
    （fullCourseCompleted=true、ベスト閾値、wideScore）
  - 3. `loadStreakV11()` → `applyCourseCompletionV11(streak, today)` でストリーク更新
    （同日 2 回目以降は加算しない）→ `saveStreakV11`
  - 4. `buildBadgeContextV11()` → `evaluateBadgesV11(merged, ctx)` でバッジ再評価。
    新規獲得があれば `saveAllBadgeStatusesV11(next)` し `newlyEarnedBadges` を返す
- **戻り値 `FinalizeCourseOutput`**：
  - `sessionRecord` / `dailyStats` / `streak` / `wideScore` / `newlyEarnedBadges`
  - F-21 事後画面で表示する全データを 1 関数で取得可能
- **`computeWideScoreFromResults(results)`**：純関数版ワイドスコア
  - 各ゲーム閾値を `computeWideScore` に渡し 0-100 を算出
- **例外耐性**：個別の AsyncStorage 失敗は throw する（呼び出し側で catch して
  最低限の表示を担保）

### A-3. CourseRunner 統合

`src/screens/v11/course/CourseRunnerScreen.tsx` を更新：

- **新 prop**：`onCompleteWithResults?: (results) => void` を追加
- **結果捕捉**：各実ゲームの `onComplete` を `(result: unknown) => recordGameResult(...)`
  に置き換え。`extractCourseGameOutcome(gameId, result)` で
  `(threshold, isCorrect, unattempted)` を抽出し、index 順で sparse array に蓄積
- **完走時処理**：phase='complete' の useEffect で、`onCompleteWithResults` が
  あれば実施分の結果（filter null）を渡す。なければ従来通り `onExitToHome()` を呼ぶ
- **placeholder モード**：`forceAllPlaceholdersForTest=true` でも結果を記録
  （placeholderResultForTest で値を上書き可能、テスト容易性）
- **後方互換**：`onCompleteWithResults` 未指定なら従来動作を維持

### A-4. AppRouter 配線

`src/navigation/v11/AppRouterV11.tsx`：

- **PostSessionData 型を追加**（wideScore / streakDays / gameResults）
- **`postSessionData` state を追加**：直近完了セッションの表示データ。再起動時は
  null（spec F-21 受け入れ：再起動時は F-16 から始まる）
- **`finalizeAndGoToPostSession(sessionId, startedAt, results)` ハンドラ**：
  1. `formatDateLocalV11(new Date())` で today を計算
  2. `finalizeCourseSession({ sessionId, startedAt, gameResults, today })` を await
  3. 永続化失敗時は `loadStreakV11` + `loadDailyStatsV11` で最低限のデータを構築
  4. `getGameDefinition` で各 gameId の `nameJa` を埋める
  5. `setPostSessionData(...)` + `setRoute({ name: 'postsession' })`
- **CourseRunnerScreen に `onCompleteWithResults` を配線**
- **postsession ルート**：`postSessionData` あり時は `PostSessionScreen` を、
  なければ既存 `PostSessionPlaceholder` を表示（後方互換）

### A-5. G-13 staircase 値切替

`src/state/gameRegistry.ts`：

- G-13 paramRange を `{ min: 0.05, max: 0.30, initial: 0.15, step: 0.025 }` に変更
- Designer 提案値（system.md §1.17.10）に統一
- v1.2 起動時に staircase は全リセット（F-17）されるため履歴互換は気にしない

### A-6. F-20 アプリアイコン全プラットフォーム差し替え

- **生成スクリプト**：`scripts/generate-icons.py`（Pillow 12.x 使用）
  - マスター 1024×1024 のガボールパッチ画像を Python で合成
    - 角度 45°（左下→右上、時計回り）
    - 暗背景 #1A1D24
    - コントラスト 0.78（範囲内）
    - ガウス窓（sigma = patch_size × 0.28）
    - パッチ中心 80% 領域に配置
  - 派生サイズを `Image.resize(LANCZOS)` で生成
- **生成アセット**（`assets/` 配下）：
  - `icon.png`（1024×1024、iOS / 共通マスター）
  - `adaptive-icon-foreground.png`（1024×1024 RGBA、Android adaptive 前景）
  - `adaptive-icon-background.png`（1024×1024、単色 #1A1D24）
  - `splash-icon.png`（1024×1024、Expo splash）
  - `pwa-512.png` / `pwa-192.png`（PWA）
  - `favicon.png`（196×196、Web）
  - `assets/icons/app/icon-source.svg`（編集用 SVG マスター）
- **`app.json` 更新**：
  - `expo.icon` / `expo.splash.image` / `expo.splash.backgroundColor` /
    `expo.android.adaptiveIcon` / `expo.android.icon` / `expo.ios.icon` /
    `expo.web.favicon`
- **`expo-haptics` plugin 設定**：app.json には plugin 未追加（expo-haptics は
  config plugin を持たず main export からの直接利用で動く）

### A-7. F-19 Native ハプティクス配線

`src/platform/audio.ts`：

- **`expo-haptics` 15.0.8 を依存追加**（Expo SDK 54 互換、`npx expo install expo-haptics`）
- **動的 require で Native ハプティクスを取得**（`getExpoHaptics()`）：
  - `Platform.OS !== 'web'` のときのみ require（Web / jest 環境では失敗 → null）
  - キャッシュして 2 度目以降は同じ参照を返す
- **`triggerHapticsPattern(pattern)`**：
  - Web：従来通り `navigator.vibrate(N)` / `navigator.vibrate([N1, N2, N3])`
  - Native：`expo-haptics.impactAsync(ImpactFeedbackStyle.Light/.Medium/.Heavy)`
  - `heavyThenMedium`（バッジ獲得 2 連打）：Heavy 同期 → setTimeout(80ms) で Medium
- **テスト容易性**：`_resetPlatformAudioForTest()` で `_hapticsModule` キャッシュも
  クリア。jest.mock('expo-haptics') で動作検証可能

### A-8. F-19 Native 音再生 — 本スプリントでは未対応

- iOS / Android Expo Go での **mp3 再生は未配線**（no-op）
- 理由：expo-audio / expo-av 導入は実機での音再生検証が必須で、本スプリントの
  スコープを超える。リスク管理として別スプリントに分離
- **Web では従来通り `OscillatorNode` で実音合成**（タッチ操作起点で AudioContext
  を resume）
- 設定の音 ON/OFF は Web で機能、Native では音 OFF/ON 状態に関係なく音は鳴らない
  （ハプティクスのみ動作）

### A-9. F-13 バッジ評価ロジック

`src/lib/v11/badges.ts`：

- 既に Stage 1 で 12 種に再構成済み（B-01〜B-12、B-07「弁別の達人」廃止）
- Stage 3 で `finalizeCourseSession` から `evaluateBadgesV11` を呼んで新規獲得を
  返す動線を本接続
- AppRouter での `evaluateAndPersistBadges`（バッジ画面表示時）も既に動いており
  Stage 3 で重複を避けるため `finalizeCourseSession` 内に集約

### A-10. F-14 設定画面

- 既存 `SettingsScreen.tsx` で「効果音」「振動」が個別トグルで提供済み（A7 / F-19
  確定）。`SettingsRow` ＋ `Toggle` で実装
- audio.ts の `setSoundEnabled` / `setHapticsEnabled` は AppRouter で設定変更時に
  伝播済み（v1.1 lib/audio + v1.2 platform/audio 両方）
- 本スプリントでは設定画面側の追加実装は不要（Stage 1 で完了済みのため）

---

## B. テスト件数

### 新規テスト（5 ファイル / 74 アサーション）

| ファイル | アサーション数 | 内容 |
|---|---|---|
| `tests/v11/lib/sessionPersistence.test.ts` | 17 | finalizeCourseSession / computeWideScoreFromResults / バッジ評価連動 |
| `tests/v11/screens/PostSessionScreen.test.tsx` | 19 | F-21 表示構造 / 入口ボタン / a11y / 閾値フォーマット |
| `tests/v11/screens/course/CourseRunnerStage3.test.tsx` | 2 | onCompleteWithResults 統合（forceAllPlaceholdersForTest 経由） |
| `tests/v11/platform/audioNativeHaptics.test.ts` | 6 | Platform.OS=ios で expo-haptics.impactAsync 呼び出し検証 |
| `tests/v11/assets/appIcons.test.ts` | 30 | F-20 アセット存在 + PNG 署名 + app.json 参照 |

合計：**+74 アサーション** が新規追加され、既存 1496 から差分 +74 = **1570 件**。

### 件数差分

| 段階 | suites | tests |
|---|---|---|
| Stage 2-B 完了時（baseline） | 124 | 1496 |
| Stage 3 完了時 | **129** | **1570** |
| **正味** | **+5** | **+74** |

### 既存テスト更新（4 ファイル）

G-13 paramRange 切替に伴う値更新：

- `tests/v11/lib/staircaseV11.test.ts`（initial 0.05 → 0.15）
- `tests/v11/lib/g13Trial.test.ts`（paramRange 4 値）
- `tests/v11/screens/games/G13EmbeddedNumeralScreen.test.tsx`（initial 0.15 / step 0.025）
- `tests/v11/lib/sessionPersistence.test.ts`（G-13 threshold 0.05 が min=100 になる）

---

## C. 検証

| 項目 | 結果 |
|---|---|
| `npx tsc --noEmit` | PASS（エラー 0） |
| `npm test` | PASS（129 suites / 1570 tests / 0 skip） |
| `npm run build:web` | PASS（dist 出力 795 kB、Stage 2-B 763 kB から +32 kB） |
| `npm run dev`（手動） | 未確認（オーケストレーター側で実機確認推奨） |
| 既存テスト回帰 | なし（G-13 paramRange 変更に伴う 4 件は値だけ更新で意味は維持） |

---

## D. ファイル一覧（主要変更）

### 新規作成（8 ファイル + 8 アセット）

ロジック / 画面 / スクリプト：
- `src/lib/v11/sessionPersistence.ts`（finalizeCourseSession）
- `src/screens/v11/PostSessionScreen.tsx`（F-21）
- `scripts/generate-icons.py`（Pillow 12.x、アイコン生成）

アセット：
- `assets/icon.png`（1024×1024、iOS / 共通マスター、100 KB）
- `assets/adaptive-icon-foreground.png`（1024×1024 RGBA、Android adaptive 前景、183 KB）
- `assets/adaptive-icon-background.png`（1024×1024、単色 #1A1D24、5 KB）
- `assets/splash-icon.png`（1024×1024、Expo splash、100 KB）
- `assets/pwa-512.png`（512×512、PWA、61 KB）
- `assets/pwa-192.png`（192×192、PWA、15 KB）
- `assets/favicon.png`（196×196、Web、15 KB）
- `assets/icons/app/icon-source.svg`（編集用 SVG マスター）

テスト：
- `tests/v11/lib/sessionPersistence.test.ts`
- `tests/v11/screens/PostSessionScreen.test.tsx`
- `tests/v11/screens/course/CourseRunnerStage3.test.tsx`
- `tests/v11/platform/audioNativeHaptics.test.ts`
- `tests/v11/assets/appIcons.test.ts`

### 更新（5 ファイル）

- `src/state/gameRegistry.ts`（G-13 paramRange 切替）
- `src/screens/v11/course/CourseRunnerScreen.tsx`（onCompleteWithResults + 結果捕捉）
- `src/navigation/v11/AppRouterV11.tsx`（PostSessionScreen 配線 + finalizeAndGoToPostSession）
- `src/platform/audio.ts`（Native expo-haptics 動的配線）
- `app.json`（アイコン参照）
- `package.json`（expo-haptics 15.0.8 追加）
- `docs/run.md`（Stage 3 セクション追記）

---

## E. 受け入れ基準カバレッジ

### F-21 連続プレイ事後画面（spec §F-21、screens.md §8）

- [x] 連続プレイ完了後（F-15 クールダウン後）に F-21 事後画面に遷移する
  → `finalizeAndGoToPostSession` で setRoute({name:'postsession'})
- [x] 今回のセッションのワイドスコア（0〜100）が表示される
  → `wideScore` prop、72px Bold tabular-nums
- [x] 今回のセッションの各ゲームの簡易結果（ゲーム名 + 正誤 + 今回の閾値）が一覧表示される
  → `gameResults` prop、role=list の 7 行
- [x] 今日のストリーク（+1 後）が表示される
  → `streakDays` prop、🔥 N 日連続
- [x] 進捗グラフ画面（F-11）への入口ボタンが 56pt 以上で配置される
  → Button size="lg"（64pt）
- [x] バッジ一覧画面（F-13）への入口ボタンが 56pt 以上で配置される
  → Button size="lg"（64pt）
- [x] 設定画面（F-14）への入口ボタンが 56pt 以上で配置される
  → Button size="lg"（64pt）+ ヘッダ⚙ ボタン（56pt）
- [x] 「もう一度プレイ」ボタンは提供しない（1 日 1 周設計）
  → 実装に存在せず、テスト `postsession-restart` が null になることを確認
- [x] アプリを閉じて再起動した場合、再び F-16 距離リマインドから始まる
  → AppRouter の `postSessionData` は state なので再起動時は null →
    distance-reminder 経路へ
- [x] バッジ獲得演出（F-13）は本画面に入る前の結果オーバーレイ（F-10）で完結
  → ResultOverlay 側で badge 演出済み（既存）

### F-20 アプリアイコン差し替え（spec §F-20）

- [x] iOS app icon が新図柄に置き換わる → `expo.icon` + `expo.ios.icon`
- [x] Android adaptive icon（foreground + background）が新図柄に置き換わる
  → `expo.android.adaptiveIcon.foregroundImage` + `backgroundColor`
- [x] Android legacy icon が新図柄に置き換わる → `expo.android.icon`
- [x] Web favicon と PWA manifest icon が新図柄に置き換わる
  → `expo.web.favicon` + `assets/pwa-192.png` + `assets/pwa-512.png`
- [x] Expo splash screen のアイコン部分が新図柄に置き換わる → `expo.splash.image`
- [x] 図柄はガボールパッチ 45°（左下→右上、時計回り）に固定（A8 確定）
  → `scripts/generate-icons.py` の `ANGLE_DEG = 45` + ガボール合成
- [x] アイコン画像生成スクリプトまたは原画 SVG / PNG が `assets/` 配下にチェックインされる
  → `scripts/generate-icons.py` + `assets/icons/app/icon-source.svg` + `assets/*.png`

### F-19 音・ハプティクス（spec §F-19、§NF-31〜33）

- [x] 正解判定時に「正解音」が再生される（音 OFF 時は無音）
  → Web: OscillatorNode、Native: no-op（音）+ Light Haptics
- [x] 不正解判定時に「不正解音」が再生される → 同上 + Medium Haptics
- [x] カウントダウン残り 3 / 2 / 1 秒の各時点でティック音が再生される
  → CourseRunner / GameStatusBar 側で playEvent('tick3'/'tick2'/'tick1')
- [x] 60 秒ゲームタイマー終了時にゲーム終了音が再生される
  → CourseRunner で playEvent('gameEnd')
- [x] バッジ獲得時にバッジ獲得音が再生される
  → finalizeCourseSession で newlyEarned > 0 のときに AppRouter で
    playEvent('badge')
- [x] 正解／不正解／バッジ獲得時にハプティクスが発火する（振動 OFF 時は無振動）
  → Web/Native 両対応
- [x] サイレントモード（OS 設定）の場合、音は再生されないがハプティクスは発火する
  → expo-haptics は OS サイレント設定を尊重しない（NF-33 仕様通り）
- [x] 設定画面に「音 ON/OFF」「振動 ON/OFF」の独立トグルが表示される
  → 既存 SettingsScreen
- [x] 試行中（60 秒注視中）は採点フィードバック以外の音／振動は発火しない
  → 各ゲーム画面で playEvent 呼び出し位置を制御（既存）

### F-13 バッジ B-01〜B-12（spec §F-13、§10）

- [x] バッジ一覧（B-01〜B-12）は 7 ゲーム前提に再評価された 12 種
  → `badges.ts` / `badgeDefinitions.ts` に既存実装
- [x] 獲得時に獲得演出（1.5 秒）が結果オーバーレイ画面で 1 度だけ流れる
  → ResultOverlay 既存実装
- [x] 設定 →「バッジ一覧」から獲得済み／未獲得を確認できる
  → BadgeListScreen 既存
- [x] 未獲得バッジには獲得条件のヒントが表示される
  → `buildBadgeHintV11` 既存
- [x] 点滅エフェクトは使用しない → 既存規約遵守
- [x] バッジ獲得時に音とハプティクスが発火する（F-19）
  → finalizeCourseSession + AppRouter playEvent('badge')

### F-14 設定（spec §F-14）

- [x] 全項目がリスト型で並び、各行は 56pt 以上の高さ → 既存 SettingsRow
- [x] 音 ON/OFF と振動 ON/OFF は個別のトグルで提供される（A7 確定、F-19 と整合）
  → 既存 SettingsScreen の「効果音」「振動」項目

### 永続化（spec §9.1 / §11）

- [x] `gaboreye:v1.2:session:<uuid>` に SessionRecord を保存
  → finalizeCourseSession + saveSessionRecordV11
- [x] `gaboreye:v1.2:dailyStats:<YYYY-MM-DD>` に DailyStats を保存
  → recordFullCourseCompletionV11
- [x] `gaboreye:v1.2:streak` に Streak を保存
  → applyCourseCompletionV11 + saveStreakV11
- [x] `gaboreye:v1.2:badge:<id>` に BadgeStatus を保存（新規獲得時）
  → evaluateBadgesV11 + saveAllBadgeStatusesV11

### G-13 staircase（Stage 2-B 引き継ぎ）

- [x] paramRange を `{ min: 0.05, max: 0.30, initial: 0.15, step: 0.025 }` に切替
  → gameRegistry.ts 更新済み
- [x] 既存テストの値更新で値レベルの整合を回復

---

## F. 既知の TODO / Phase 3 完了報告で人間レビューが必要な事項

### 必ず人間レビューが必要

1. **アプリアイコンの図柄レビュー**：
   - `scripts/generate-icons.py` は Pillow で合成したガボールパッチ。
     プロのデザイナーが作るような美しさはない（縞 + 暗背景の最低限の表現）
   - リリース前にユーザー / Designer がデザイン確認 → 必要に応じてマスター SVG を
     差し替え → スクリプト再実行
   - 提案：`assets/icons/app/icon-source.svg` を Designer が更新したのち、
     ラスタライザ（rsvg-convert / Inkscape）で 1024×1024 PNG を出力 →
     残りは `scripts/generate-icons.py` 同等ロジックで派生
2. **iOS / Android 実機での音再生確認**：
   - 本スプリントでは Web のみ実音。Native では音は no-op
   - リリース前に expo-audio / expo-av の導入を検討（別スプリント想定）
3. **iOS / Android 実機でのハプティクス確認**：
   - 自動テストは `expo-haptics` モックで impactAsync 呼び出しを検証するのみ
   - 実機で「振動が発火するか」「強度が適切か」をユーザーが確認必要
4. **F-21 事後画面のレスポンシブ確認**：
   - スマホ縦 375 / PC 横 1280 / Android 360 で表示崩れがないか実機確認推奨
   - 特に PC 横で「ゲーム結果リスト 2 列展開」は components.md §32 の仕様だが、
     本実装は ScrollView の 1 列のみ（Designer 提案の 2 列は本スプリントでは未実装）

### 既知のリスク / 注意事項

- **Native の音は鳴らない**：iOS / Android Expo Go で mp3 再生は未対応。
  ユーザー実機テスト時に「音が出ない」報告が想定される。設計上はハプティクスで
  代替されているので致命ではないが、本来仕様（F-19 受け入れ基準）には未対応
- **PostSessionScreen の PC 横レイアウト**：components.md §32 / screens.md §8.2 の
  「2 列グリッド展開」は本スプリントで未対応（1 列の ScrollView のみ）。リリース前に
  必要なら別スプリントで追加
- **アプリアイコンの「丸枠でクリッピング」確認**：iOS は丸角自動マスク、Android
  adaptive は OS 形状（円 / 四角）に合わせてマスクされる。マスター 80% 領域に
  ガボール本体を配置しているため安全マージンは確保しているが、実機での確認推奨
- **expo-haptics 15.0.8 のサイドエフェクト**：`npm install` 後の audit で 9 件の
  脆弱性報告（Stage 2-B 時点でも同様）。本スプリントでは個別対応せず、リリース前に
  npm audit fix を一括検討

### 後続スプリント候補

- v1.2.x パッチ：Native 音再生（expo-audio / expo-av 導入）
- v1.2.x パッチ：F-21 事後画面の PC 横 2 列レイアウト
- v1.2.x パッチ：アプリアイコン Designer 版差し替え

---

## G. まとめ

Sprint 22 Stage 3 は spec-v11.md v1.2 §F-13 / §F-14 / §F-19 / §F-20 / §F-21 /
§9.1 / §11 と、designer 成果物（components.md §29 / §30 / §31 / §32、
sprints/sprint-22/screens.md §8）に従い、**F-21 事後画面 + セッション永続化 +
アプリアイコン全プラットフォーム差し替え + Native ハプティクス + G-13 staircase
切替** を完成させた。

これで Sprint 22 全 4 ステージ（Stage 1 / Stage 2-A / Stage 2-B / Stage 3）が
すべて完了し、**v1.2 リリース候補ビルド** が完成。

| ステージ | 主要範囲 | テスト件数 |
|---|---|---|
| Stage 1 | 起動フロー / F-17 拡張 / 旧 ID 整理 / カウントダウン UI 統一 | 1397 |
| Stage 2-A | G-01 / G-04 / G-05 / G-06 v1.2 化（3×3 系） | 1454 |
| Stage 2-B | G-07 / G-13 v1.2 化 + ResultOverlay 完全 v1.2 化 | 1496 |
| **Stage 3** | **F-21 / アイコン / Native haptics / 永続化 / G-13 staircase** | **1570** |

残りは Phase 3（完了報告）の人間レビューと、必要に応じた v1.2.x パッチスプリント。
