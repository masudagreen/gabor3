# Sprint S7（v3.0）自己評価 — ホームタブ・起動フロー・免責（F-08 / F-06 / F-10 / F-11 通知 / §4.4 本結線）

> 対象：spec.md（v3.0）F-08（ホーム：ゲーム+結果+もう一度）・F-06（起動フロー）・F-10（免責）・
> F-11（リセット通知 UI）・§4.4（レベル増減本結線）・§7.4-7.7（記録永続化）。
> デザイン：docs/design/sprints/sprint-7/screens.md、components.md（RC-1/LD-1/DR-1/DC-1/RZ-1）。

## 1. やったこと

### データ/結線層（§4.4 / F-04 / §7.4-7.7 本結線）
- `src/state/v3/homeFlow.ts`（新規）：`resolveCompletedGame` — 1 ゲーム完了の本結線。
  `applyResult`（S2 純ロジック）で次レベル/連続失敗/最高レベルを算出 → `saveLevelState` で**永続化** →
  `recordCompletedGame`（S3）で GameRecord 追記・DailyStats(max クリア基準)・Streak・PlayStats.totalGames+1。
  中断は呼ばない（F-07）。`levelDelta` を戻り値で返し RC-1/LD-1 に渡す。
- `src/state/v3/index.ts`：homeFlow を公開バレルに追加。

### コンポーネント（components.md 準拠）
- `src/components/v3/LevelDeltaIndicator.tsx`（LD-1 新規）：+1/±0/−1 を**色+矢印形+テキスト**の 3 重で提示（NF-12）。
  −1 は暗橙（責めない、エラー赤不使用）。クリアで上がらない=「最高レベルです」。aria-live=polite。
- `src/components/v3/HomeResultCard.tsx`（RC-1 新規）：総合クリア/失敗・LD-1・現在のレベル(LB-1 large 64px)・
  ストリーク(🔥)・「もう一度」(64px ≧ 56pt、回数無制限)。role=region で結果全体を 1 まとめ読み上げ。
- `src/components/v3/DataResetNotice.tsx`（RZ-1 新規・i18n 化）：F-11 通知を `dataResetV3.*` キーで（v2 ハードコード版を置換）。

### 画面（v3 化）
- `src/screens/v3/OnboardingScreen.tsx`（ON-1 新規）：4 ステップ・合計タップ 5（≤6）。免責同意ゲート（未チェックで disabled）・
  年齢層(70 代警告)・視聴距離・概要（**回転のみ**＝空間周波数の言及削除、spec §0）。`onboardingV3.*` キー。
- `src/screens/v3/DistanceReminderScreen.tsx`（DR-1 新規）：「画面から {n}cm 離れてください」36px・v3 CountdownTimer large・
  3 秒自動進行・片眼ガイダンス補助文・X 中断。`distanceV3.*` キー。

### 起動フロー・ホームフロー統括（F-06 / F-08）
- `src/screens/v3/AppRoot.tsx`（改訂）：ホームタブに 3 サブフェーズ（distance → playing → result）を導入。
  起動直後（距離リマインド後）に現在レベルで自動開始 → 1 ゲーム完了 → 結果カード →「もう一度」で距離リマインド経由次ゲーム。
  ゲーム結果は `onResolveGame`（App が homeFlow.resolveCompletedGame を注入）で本結線。中断ダイアログ（F-07）は維持。
- `App.tsx`（改訂）：F-11 マイグレーション → Settings/UserProfile/LevelState ロード →
  初回のみ v3 オンボーディング（完了で UserProfile 保存）→ AdManager → AppRoot（initialHomePhase='distance'、onResolveGame 注入）。
  RZ-1 を v3 DataResetNotice に差し替え。

### トークン・i18n
- `src/theme/tokens.ts`：`levelDeltaV3`（up/same/down、system §1.4 の色）追加。
- `src/i18n/ja.ts`：`homeV3` / `levelDeltaV3` / `onboardingV3` / `distanceV3` / `dataResetV3` キー追加。

## 2. 受け入れ基準マッピング（自分で動かして確認）

### F-06 起動フロー
- [x] 初回のみオンボ・2 回目以降なし（UserProfile.onboardingCompleted ゲート）。
- [x] オンボ完了タップ 5（≤6）。OnboardingScreen テスト。
- [x] 免責未チェックで進めない（「同意する」disabled）。OnboardingScreen テスト。
- [x] オンボ後/2 回目以降は距離リマインド経由でホーム自動開始（Playwright 05→06、AppRoot テスト）。
- [x] 初回/全削除後 L1 開始 / 2 回目以降は前回 currentLevel（loadLevelState）。
- [x] 距離リマインド 36px・自動進行・操作不要（DistanceReminder テスト・Playwright 05）。
- [x] クールダウン画面なし。

### F-08 ホームタブ
- [x] ホームでプレイ・1 ゲーム後にクリア/失敗・レベル変化・現在レベル・今日のストリーク（RC-1、AppRoot テスト・Playwright 09）。
- [x] 「もう一度」56pt 以上（実 64px）・回数無制限・距離リマインド経由で次ゲーム（AppRoot テスト・Playwright 10）。
- [x] 結果表示中はゲーム非進行 → タブ移動自由（AppRoot「非進行中は自由遷移」テスト）。

### F-04 / §4.4 レベル増減・記録・連続失敗永続
- [x] クリアで +1（AppRoot：▲ レベル 7→8）。
- [x] 失敗 1 回目はレベル変化なし（AppRoot：― レベル 7）。
- [x] 2 連続失敗で −1（AppRoot：▼ レベル 7→6）。
- [x] クリアで連続失敗リセット（homeFlow：失敗→クリア→失敗では下がらない）。
- [x] **連続失敗が再起動で保持**（homeFlow：失敗→再 load→さらに失敗で 2 連続成立→−1。saveLevelState 永続化）。
- [x] 中断はレベル・記録に影響しない（AppRoot OK 中断テスト：レベル不変・距離リマインドから再開）。
- [x] レベル変化が観察可能（LD-1 告知 + 次ゲームの GB-1 レベル表示変化）。
- [x] GameRecord/DailyStats(max)/Streak/PlayStats.totalGames+1 を永続化（homeFlow テスト）。

### F-10 免責
- [x] 18pt 以上・同意必須・同意日時保存（OnboardingResult.disclaimerAgreedAt → UserProfile）。
- [x] 70 代警告（OnboardingScreen テスト）。
- [x] DisclaimerPanel（DC-1）は設定から呼べる土台として存在（設定 UI 本体は S7 範囲外）。

### F-11 リセット通知 UI
- [x] 旧データ消去時に通知 1 度だけ（RZ-1 v3、App の shouldShowNotice）。OK 64px。

## 3. 検証結果
- `npm run typecheck`：**エラー 0（PASS）**。
- `npm test`：**59/59 スイート・614/614 件 全 PASS**（赤 0 維持）。
- `npm run build:web`（既定 v3）：**成功（Exported: dist）**、AppEntry ≈ 1.1 MB。`serve -s dist` HTTP 200。
- Playwright（375/360/1280、isolated chromium）：起動→オンボ→距離→ゲーム→結果カード→もう一度→距離 を目視。
  ページコンソールエラー 0。スクショ `temp-images/s7/*.png`（gitignore）。
- 追加テスト：homeFlow(5)・homeComponents LD-1/RC-1(6)・OnboardingScreen v3(7)・DistanceReminderScreen v3(5)・
  AppRoot S7 追加(5)。撤去 v2 テストを差し引き 626 → 614。

## 4. v2 撤去（v3 が代替する範囲で一括）
- 削除（screens v2）：OnboardingScreen / DistanceReminderScreen / IdleHomeScreen。
- 削除（components v2 描画オーファン群、§V3-S6.4 推奨）：GaborGrid / GaborPatchCell / GameTopBar / CountdownTimer /
  ResultMark / ResultOverlayLayer / AggregateResultBadge / DataResetNotice。
- 削除（v2 テスト）：tests/screens/v2/{OnboardingScreen,DistanceReminderScreen}.test.tsx、
  tests/components/v2/{gameComponents,ResultOverlayLayer}.test.tsx。
- 移行：tests/a11y/webAriaComponents.test.tsx の GaborPatchCell/PatchDef を v2 → v3 に差し替え（緑維持）。

## 5. 既知の懸念・申し送り
- **設定タブ未実装**：F-13（範囲設定/変化順/継承項目/免責再閲覧の設定 UI）は本 S7 範囲外。DisclaimerPanel（DC-1）は稼働中・
  設定から呼べる土台あり。設定 UI 本体・「閲覧のみ（同意ボタンなし）」モードは後続。
- **温存した v2**：screens/v2/{HistoryScreen,SettingsScreen}（S8 履歴・設定本実装まで）、lib/v2/{scoring,gameMachine,roundGen,
  patch,gameView}・state/{statsRecorder,badgeRecorder,sessionRecorder,schema,keys,repository,migration,settings,dataReset}（v2、
  HistoryScreen/SettingsScreen が依存）、components/v2/{Toggle,SegmentedControl,SettingRow,StatTile,BadgeCell,BadgeGrid,
  BadgeAwardToast,LineChart,EmptyState,NumberSpinner,SkipLink,ConfirmDialog,DisclaimerPanel,AdManager*}。
  v3 再利用中：DisclaimerPanel/SegmentedControl（v3 オンボ）、lib/v2/rng・hooks/v2/useGameTimer（v3 ゲーム）、AdManager*（広告 native）。
- **AdManager（広告）native 実装は不変**（native/web 分割維持）。
- native 懸念監査：新規 v3 ファイルに document/window/localStorage/navigator 直接参照なし。aria は Platform.OS==='web' ガード。
  makeGameId は globalThis.crypto?.randomUUID + フォールバック（native 安全）。Image transform メモ化問題は該当なし。
- セーフエリア：オンボ/距離/結果カードは SafeAreaView edges=all（NF-30）。ゲームのみフルスクリーン許容（NF-29）。
