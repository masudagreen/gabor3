/**
 * ja.ts — spec.md §4「日本語のみ」「将来対応可能な文言構造」（AS-20）。
 *
 * v2.0 リブートに伴い、v1.x の画面別辞書（home / settings / disclaimer 等）は
 * いったん撤去した。各文言は対応スプリント（S2 設定 / S6 オンボ・免責 など）で
 * v2.0 デザインに合わせて再投入する。本ファイルは i18n キー基盤（t / tArray /
 * interpolate）が動くための最小辞書のみを保持する。
 *
 * 多言語化する際は、同じキーで en.ts 等を増やすだけで済むよう命名を安定化させる。
 */

export const ja = {
  app: {
    title: 'GaborEye',
    version_label: 'v{{version}}',
  },
  common: {
    next: '次へ',
    back: '戻る',
    close: '閉じる',
    cancel: 'キャンセル',
    ok: 'OK',
    save: '保存',
    saved: '保存しました',
    loading: '読み込み中',
    load_error: 'データを読み込めませんでした',
    // 時間表示（セッション時間 / 累計ゲーム時間）の整形（timeFormat.ts）。
    duration_hm: '{{h}}時間{{m}}分',
    duration_ms: '{{m}}分{{s}}秒',
    duration_m: '{{m}}分',
    duration_s: '{{s}}秒',
    // ガボールパッチ画像の既定 a11y ラベル（GaborPatch）。
    patch_stimulus: '縞模様の刺激',
  },
  nav: {
    home: 'ホーム',
    history: '履歴',
    settings: '設定',
    home_tab: 'ホームタブ',
    history_tab: '履歴タブ',
    settings_tab: '設定タブ',
    skip_to_content: 'メインコンテンツへスキップ',
  },
  home: {
    // S5 ではホームはゲーム本体（プレイ中）か、待機/結果のプレースホルダ。
    // 本格的なセッション結果・自動開始フローは S6。
    placeholder_title: 'ホーム',
    placeholder_body: 'ここでゲームをプレイします。',
    start: 'プレイを始める',
    // S6 セッション結果カード（RC-1、F-08）
    result_label: '今回のスコア',
    score_unit: '／100',
    streak_label: '連続 {{n}} 日',
    streak_zero: '今日からスタート',
    replay: 'もう一度',
    result_region_label:
      'セッション結果。スコア {{score}} 点（100 点満点）。連続 {{streak}} 日',
  },
  onboarding: {
    // S6-1 オンボーディング（初回のみ、F-06/F-10）
    step_progress: 'ステップ {{current}}/{{total}}',
    welcome_title: 'GaborEye へようこそ',
    understand_check: '内容を理解しました',
    agree: '同意する',
    age_title: '年齢層を選んでください（任意）',
    age_40s: '40代',
    age_50s: '50代',
    age_60s: '60代',
    age_70s: '70代以上',
    age_unspecified: '未回答',
    age_70s_warning: '視覚に不安がある場合は医師にご相談ください。',
    distance_title: '視聴距離を選んでください',
    overview_title: 'ゲームの遊び方',
    overview_body: 'ゆっくり変化（回転・周波数）するパッチを見つけてタップ。',
    start_game: 'はじめる',
  },
  disclaimer: {
    title: '免責事項',
    // F-10：医療機器でない旨・対象外ユーザー（18pt 以上で表示）
    body_intro:
      '本アプリは医療機器ではありません。自助セルフケア目的のアプリです。',
    body_targets_label: '次の方は対象外です：',
    targets: [
      'お子さま（小学生以下）',
      '70 代以上の方',
      '重度の視覚障害がある方',
      '強度近視（-6D 以上）の方',
      '目に違和感のある方',
    ],
    body_note: '目に痛みや違和感を感じたら、ただちに使用を中止してください。',
  },
  distance: {
    // S6-2 距離リマインド（F-06/OPT-10/F-12）
    title: '画面から {{n}}cm',
    title_suffix: '離れてください',
    one_eye_left: '左目を覆ってください（任意）',
    one_eye_right: '右目を覆ってください（任意）',
    one_eye_cover: '片目を覆ってください（任意）',
    auto_start: '{{n}} 秒後に自動で始まります',
    abort_label: '中断',
  },
  history: {
    // S5 ではプレースホルダのみ（本実装は S7）。
    placeholder_title: '履歴',
    placeholder_body: 'プレイを続けると、ここに記録が表示されます。',
    // S7 履歴タブ・進捗グラフ（F-09 グラフ部）
    title: '履歴',
    chart_heading: '日次スコアの推移',
    // グラフ aria-label 要約（spec a11y）
    chart_summary: '過去 {{days}} 日の日次スコア。最新 {{date}} は {{score}} 点',
    chart_summary_empty: 'まだ日次スコアのデータがありません',
    // データ少時案内（F-09「目安 7 日未満」）
    trend_hint: 'もう少しデータが集まると傾向が見えます',
    // StatTile
    streak_label: '連続日数',
    streak_unit: '日',
    streak_value_label: '連続日数 {{n}} 日',
    total_label: '累計プレイ回数',
    total_unit: '回',
    total_value_label: '累計プレイ回数 {{n}} 回',
    // S8 バッジ一覧（F-09 バッジ部）
    badges_heading: 'バッジ',
    badges_placeholder: 'バッジは順次解放されます。',
    badges_empty: 'プレイを続けるとバッジが解放されます。',
    // 軸ラベル
    axis_y_max: '100',
    axis_y_mid: '50',
    axis_y_min: '0',
  },
  badge: {
    // S8/S9 バッジセル（BG-1）・獲得演出（BG-2）
    earned_label: '獲得済み',
    earned_at: '{{date}} 獲得',
    locked_label: '未獲得',
    // v3.0 軸見出し（sprint-9 screens.md S9-1、3 軸）
    axis_streak: '継続日数',
    axis_difficulty: '高難度到達',
    axis_level: '高レベル到達',
    // SR 用 aria-label：獲得 / 未獲得 + ヒント
    cell_earned_label: '{{name}}、獲得済み（{{date}}）',
    cell_locked_label: '{{name}}、未獲得：{{hint}}',
    // 獲得演出（BadgeAwardToast）。aria-live で読み上げ
    award_announce: 'バッジ獲得：{{name}}',
    award_title: 'バッジ獲得',
    // 複数同時獲得時の SR 読み上げ（先頭名称＋残り件数）。
    award_multi: '{{name}} ほか {{count}} 件',
    // バッジ定義の文言（旧 badgeDefinitions.ts のハードコードを i18n 化）。
    defs: {
      'B-01': {
        name: 'はじめの一歩',
        condition: '初めてゲームを完了する（クリア / 失敗いずれか）',
        hint: '初めてゲームを完了すると獲得',
      },
      'B-02': {
        name: '三日坊主突破',
        condition: '3 日連続でプレイする',
        hint: '3 日連続でプレイすると獲得',
      },
      'B-03': {
        name: '一週間の習慣',
        condition: '7 日連続でプレイする',
        hint: '7 日連続でプレイすると獲得',
      },
      'B-04': {
        name: '二週間マスター',
        condition: '14 日連続でプレイする',
        hint: '14 日連続でプレイすると獲得',
      },
      'B-05': {
        name: '一ヶ月の継続',
        condition: '30 日連続でプレイする',
        hint: '30 日連続でプレイすると獲得',
      },
      'B-06': {
        name: '振動を見抜く目',
        condition: '回転方向が「振動」のレベルをクリアする',
        hint: '振動するパッチのレベルをクリアすると獲得',
      },
      'B-07': {
        name: 'スロー回転ハンター',
        condition: '回転速度が遅い域（3°/秒以下）のレベルをクリアする',
        hint: '回転がゆっくりなレベルをクリアすると獲得',
      },
      'B-08': {
        name: '達人の眼',
        condition:
          '最難域（個数4・4x4・振動・速度 2.5°/秒以下が揃う）のレベルをクリアする',
        hint: '最も難しいレベルをクリアすると獲得',
      },
      'B-09': {
        name: '二桁の壁',
        condition: '最高到達レベルが 10 以上になる',
        hint: '最高到達レベルが 10 に達すると獲得',
      },
      'B-10': {
        name: '熟達者',
        condition: '最高到達レベルが中盤（全体の 50% 以上）に達する',
        hint: '最高到達レベルが中盤に達すると獲得',
      },
      'B-11': {
        name: '頂を目指して',
        condition: '最高到達レベルが終盤（全体の 85% 以上）に達する',
        hint: '最高到達レベルが終盤に達すると獲得',
      },
    },
  },
  abort: {
    title: 'プレイを中断しますか？',
    message: '中断するとこのセッションは記録されません。',
    confirm: '中断する',
    cancel: '続ける',
  },
  game: {
    grid_label: '変化しているパッチをすべて選んでください',
    patch_label: 'パッチ {{row}}-{{col}}',
    abort_label: 'ゲームを中断',
    countdown_remaining: '残り {{n}} 秒',
    confirm: '確定',
    confirm_label: '回答を確定する',
  },
  result: {
    correct: '正解',
    wrong: '不正解',
    tp_label: '正解（選択済み）',
    fn_label: '正解（選び逃し）',
    fp_label: '不正解（誤選択）',
    summary: '{{aggregate}}。正答 {{tp}} 件、誤選択 {{fp}} 件、選び逃し {{fn}} 件',
  },
  // v3.0 ゲーム（F-01/F-02/F-12、system §14）。レベル管理リブート用。
  gameV3: {
    level: 'レベル {{n}}',
    level_label: 'レベル {{n}}',
    count_find_n: '回転しているものを{{n}}つ探せ',
    count_label: '{{n}} 個の回転を探してください',
    // v3.2：本番の教示（個数非表示・全て探せ、§4.9/AS-36）。
    find_all: '回転しているものを全て探せ',
    find_all_label: '回転しているパッチをすべて探してください',
    grid_label: '回転しているパッチをすべて選んでください',
    patch_label: 'パッチ {{row}}-{{col}}',
    abort_label: 'ゲームを中断',
    countdown_remaining: '残り {{n}} 秒',
    // ゲーム開始時 aria-live（assertive）。レベル・個数を読み上げ（spec a11y）。
    start_announce: 'レベル {{level}}。{{count}} 個の回転を探してください',
    // v3.2：本番開始時の読み上げ（個数非表示）。
    start_announce_all: 'レベル {{level}}。回転しているパッチをすべて探してください',
    // v3.1：セッション残り時間（GB-1 左、控えめ・段階色なし、system §16.2）。
    session_remaining_label: 'セッション残り時間',
    // v3.1：「あと」表記は付けず mm:ss のみ（ユーザー要望）。
    session_remaining: '{{mm}}:{{ss}}',
    session_remaining_a11y: 'セッション残り時間 {{m}} 分 {{s}} 秒',
    // v3.1：締切後 3 秒開示カウントダウン（CD-1 disclosure、F-03/AS-25）。
    disclosure_countdown: '次のラウンドまで {{n}} 秒',
  },
  // v3.0 結果開示（F-03、system §14）。
  resultV3: {
    aggregate_clear: 'クリア',
    aggregate_fail: '失敗',
    check_correct_label: '回転（選択済み）',
    check_missed_label: '回転（選び逃し）',
    cross_wrong_label: '誤選択',
  },
  // v3.1 中断ダイアログ（F-07、system §14）。セッション制：未完の現ラウンドは記録されないが、
  // それまでに完了したラウンドの結果（レベル変化）は保持される（AS-30）。
  abortV3: {
    title: 'プレイを中断しますか？',
    message:
      '中断すると、いま挑戦中のラウンドは記録されません。それまでに完了したラウンドの結果は残ります。',
    confirm: '中断する',
    cancel: '続ける',
  },
  // v3.1 セッション要約（RC-1 → SessionSummaryCard、F-08/F-04、system §16.4）。
  sessionV3: {
    current_level_label: '現在のレベル',
    // v3.1：「このセッションの最高」を廃止し、セッション時間（パッチ視認時間）を表示。
    session_time_label: 'セッション時間',
    streak: '連続 {{n}} 日',
    streak_zero: '今日からスタート',
    replay: 'もう一度',
    // role=region の総合読み上げ（v3.1：見出し廃止・時間表示・✅/❌ 集計）。
    region:
      '現在のレベル {{level}}。セッション時間 {{minutes}} 分 {{seconds}} 秒。クリア {{clears}}、失敗 {{fails}}。連続 {{streak}} 日',
  },
  // v3.0 ホーム結果カード（RC-1、F-08/F-04、system §14）。
  homeV3: {
    result_clear: 'クリア！',
    result_fail: '失敗',
    current_level_label: '現在のレベル',
    streak: '連続 {{n}} 日',
    streak_zero: '今日からスタート',
    replay: 'もう一度',
    // role=region の総合読み上げ（screens.md S7-3 a11y）。
    region_clear:
      'ゲーム結果。クリア。レベル {{from}} から {{to}}。現在のレベル {{to}}。連続 {{streak}} 日',
    region_fail:
      'ゲーム結果。失敗。現在のレベル {{to}}。連続 {{streak}} 日',
  },
  // v3.0 レベル変化告知（LD-1、F-04、system §14）。
  levelDeltaV3: {
    // +1（クリアで上昇）
    up_change: 'レベル {{from}} → {{to}}',
    up_message: 'レベルが上がりました（+1）',
    up_announce: 'レベルが上がりました。レベル {{from}} から {{to}}',
    // ±0（失敗 1 回目 / 上限・下限クランプ）
    same_level: 'レベル {{n}}',
    same_message: 'レベルはそのままです',
    same_message_max: '最高レベルです',
    same_announce: 'レベルはそのままです。レベル {{n}}',
    // -1（2 連続失敗で下降）
    down_change: 'レベル {{from}} → {{to}}',
    down_message: '無理なく続けられるよう、レベルを 1 つ下げました',
    down_announce: 'レベルを 1 つ下げました。レベル {{from}} から {{to}}',
  },
  // v3.0 オンボーディング（ON-1、F-06/F-10、system §14）。
  onboardingV3: {
    disclaimer_title: '使用上の注意',
    disclaimer_body:
      '本アプリは医療機器ではありません。目に痛みや違和感を感じたら、ただちに使用を中止してください。',
    distance_preview_label: 'この距離で見えるパッチの例',
    tutorial_title: '遊び方',
    tutorial_body: '回転しているパッチを探してタップして下さい',
    tutorial_patch_label: '回転しているパッチ。タップして始めましょう',
    step_progress: 'ステップ {{current}}/{{total}}',
    welcome_title: 'GaborEye へようこそ',
    understand_check: '内容を理解しました',
    agree: '同意する',
    age_title: '年齢層を選んでください（任意）',
    age_40s: '40代',
    age_50s: '50代',
    age_60s: '60代',
    age_70s: '70代以上',
    age_unspecified: '未回答',
    age_70s_warning: '視覚に不安がある場合は医師にご相談ください。',
    distance_title: '視聴距離を選んでください',
    overview_title: 'ゲームの遊び方',
    // v3.0：回転のみ（空間周波数の言及を削除、spec §0/screens.md S7-1）。
    overview_body: 'ゆっくり回転するパッチを見つけてタップ。',
    start_game: 'はじめる',
  },
  // v3.0 距離リマインド（DR-1、F-06/F-12、system §14）。
  distanceV3: {
    title: '画面から {{n}}cm',
    title_suffix: '離れてください',
    one_eye_left: '左目を覆ってください（任意）',
    one_eye_right: '右目を覆ってください（任意）',
    one_eye_cover: '片目を覆ってください（任意）',
    abort_label: '中断',
  },
  // v3.0 データリセット通知（RZ-1、F-11、system §14）。
  dataResetV3: {
    title: '最新版へのアップデート',
    body: '最新版へのアップデートのため、過去データをリセットしました',
    cta: 'OK',
  },
  // v3.0 タブ画面のプレースホルダ（設定=後続で本実装。履歴は historyV3 で本実装済み）。
  tabPlaceholderV3: {
    history_title: '履歴',
    history_body: '準備中です。プレイを続けると、ここに到達レベルの記録が表示されます。',
    settings_title: '設定',
    settings_body: '準備中です。',
  },
  // v3.0 設定タブ（F-13、screens.md S3-1 / components.md RG-1・OR-1）。
  settingsV3: {
    title: '設定',
    // ── プレイ（v3.1：sessionMinutes、SR-1a、F-13/AS-23）──
    group_play: 'プレイ',
    session_minutes: '1 回のプレイ時間',
    session_minutes_value: '{{n}}分',
    session_minutes_hint: 'プレイ全体の長さです。難易度には影響しません',
    session_minutes_dec: '1 分減らす',
    session_minutes_inc: '1 分増やす',
    // ── 繰り返し回数（v3.2：repeatCount、SR-1b、F-13/AS-37）──
    repeat_count: '繰り返し回数',
    repeat_count_value: '{{n}}回',
    repeat_count_hint: '同じ難易度を何回くり返すか。総レベル数 = 回数×180',
    repeat_count_dec: '1 回減らす',
    repeat_count_inc: '1 回増やす',
    // ── 個数の範囲プリセット（v3.2：countRange、SR-1c、F-13/AS-36）──
    count_range: '個数の範囲',
    count_range_hint: '1 ラウンドで回転する数のランダム範囲です',
    count_range_cells_minus_1: '広い（最大まで）',
    count_range_half: 'ひかえめ（半分まで）',
    count_range_fixed_1_4: '少なめ（1〜4）',
    // ── 各変数の範囲（テスト用） ──
    group_ranges: '各変数の範囲（テスト用）',
    total_levels: '現在の設定：{{n}} レベル',
    total_levels_a11y: '現在の設定の総レベル数は {{n}} レベルです',
    range_count: '個数の範囲',
    range_seconds: '時間の範囲',
    range_direction: '回転方向の範囲',
    range_gridSize: 'サイズの範囲',
    range_rotationSpeed: '回転速度の範囲',
    range_min_one: '少なくとも 1 つ選んでください',
    chip_a11y: '{{group}} {{value}}',
    direction_one_way: '一方向',
    direction_oscillate: '振動',
    grid_3: '3x3',
    grid_4: '4x4',
    grid_5: '5x5',
    grid_6: '6x6',
    // ── 変化順（テスト用） ──
    group_order: '変化順（テスト用）',
    order_hint: '上ほど先に（頻繁に）変化します',
    order_move_up: '{{name}}を 1 つ上へ',
    order_move_down: '{{name}}を 1 つ下へ',
    order_moved: '{{name}}を {{pos}} 番目に移動しました',
    order_reset: 'デフォルトに戻す',
    var_count: '個数',
    var_repeat: '繰り返し',
    var_seconds: '時間',
    var_direction: '回転方向',
    var_gridSize: 'サイズ',
    var_rotationSpeed: '回転速度',
    // ── 表示・視聴 ──
    group_display: '表示・視聴',
    viewing_distance: '視聴距離',
    dark_mode: 'ダークモード',
    dark_system: 'OS連動',
    dark_light: '明',
    dark_dark: '暗',
    // ── フィードバック ──
    group_feedback: 'フィードバック',
    sound: '効果音',
    haptics: '振動',
    one_eye: '片眼ガイダンス',
    one_eye_off: 'なし',
    one_eye_left: '左',
    one_eye_right: '右',
    one_eye_alternate: '交互',
    // ── その他 ──
    group_other: 'その他',
    read_disclaimer: '免責事項を読む',
    delete_all: '全データ削除',
    // バージョン情報
    version: 'バージョン',
    disclaimer_agreed_at: '免責同意',
    disclaimer_not_agreed: '未同意',
    // クランプ通知トースト（§4.5）
    clamp_notice:
      'レベルの梯子が変わりました。現在レベルは {{level}} に調整されました',
    // 免責再閲覧モーダル
    disclaimer_modal_title: '免責事項',
    // 全データ削除（2 段階確認）
    delete_confirm_title: '全データを削除しますか？',
    delete_confirm_message:
      'すべての記録・設定・バッジが消えます。元に戻せません。',
    delete_confirm_ok: '削除する',
    unit_cm: 'cm',
  },
  // v3.0 履歴タブ・レベル進捗グラフ（CH-1 / ST-1 / EM-1、F-09、system §14）。
  historyV3: {
    title: '履歴',
    // セクション見出し（screens.md S8-1）
    chart_heading: '到達レベルの推移',
    // 軸ラベル（Y は動的スケール上端 / 中間、X は日付。chart 内で値展開）
    axis_highest_line: '最高 {{n}}',
    // グラフ aria-label 要約（spec a11y / screens.md S8-1）
    chart_summary:
      '過去 {{days}} 日の到達レベル。最新 {{date}} は レベル {{level}}。最高到達レベル {{highest}}',
    chart_summary_empty: 'まだ到達レベルのデータがありません。最高到達レベル {{highest}}',
    // データ少時案内（F-09「目安 7 日未満」）
    trend_hint: 'もう少しデータが集まると傾向が見えます',
    // StatTile：最高到達レベル / 累計プレイ回数 / 連続日数
    highest_label: '最高到達レベル',
    highest_value_label: '最高到達レベル {{n}}',
    total_label: '累計プレイ回数',
    total_unit: '回',
    total_value_label: '累計プレイ回数 {{n}} 回',
    // 【v3.1】累計ゲーム時間（パッチを見ている時間の合計）。
    total_play_time_label: '累計ゲーム時間',
    total_play_time_value_label: '累計ゲーム時間 {{text}}',
    streak_label: '連続日数',
    streak_unit: '日',
    streak_value_label: '連続日数 {{n}} 日',
    // バッジ部は S9 で本実装（本 S8 では見出し + 案内のみのプレースホルダ）
    badges_heading: 'バッジ',
    badges_placeholder: 'バッジは次のアップデートで解放されます。',
    // ロード / エラー（稀、ローカルのみ）
    load_error: 'データを読み込めませんでした',
    loading: '読み込み中',
  },
  settings: {
    title: '設定',
    group_game: 'ゲーム設定',
    group_scoring: '採点方式',
    group_display: '表示・視聴',
    group_feedback: 'フィードバック',
    group_other: 'その他',
    grid_size: '格子サイズ（n×n）',
    round_seconds: '1 ラウンドの秒数',
    round_count: 'ラウンド数',
    rotation_speed: '回転速度',
    sf_change_speed: '周波数変化速度',
    unit_seconds: '秒',
    unit_deg_per_sec: '°/秒',
    unit_hz_per_sec: 'hz/秒',
    scoring_auto_no_confirm: '自動採点（確定なし）',
    scoring_auto_no_confirm_desc: '時間切れで自動採点します',
    scoring_auto_confirm: '自動採点（確定ボタンあり）',
    scoring_auto_confirm_desc: '確定ボタンで早く締められます',
    scoring_all_correct: '全問正解で次へ',
    scoring_all_correct_desc: 'すべて正しく選ぶと進みます',
    viewing_distance: '視聴距離',
    unit_cm: 'cm',
    dark_mode: 'ダークモード',
    dark_system: 'OS連動',
    dark_light: '明',
    dark_dark: '暗',
    sound: '効果音',
    haptics: '振動',
    one_eye: '片眼ガイダンス',
    one_eye_off: 'なし',
    one_eye_left: '左',
    one_eye_right: '右',
    one_eye_alternate: '交互',
    read_disclaimer: '免責事項を読む',
    delete_all: '全データ削除',
    version: 'バージョン',
    disclaimer_agreed_at: '免責同意',
    disclaimer_not_agreed: '未同意',
    delete_confirm_title: '全データを削除しますか？',
    delete_confirm_message:
      'すべての記録・設定・バッジが消えます。元に戻せません。',
    delete_confirm_ok: '削除する',
  },
} as const;

export type LocaleDict = typeof ja;
