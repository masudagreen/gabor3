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
    // S8 バッジセル（BG-1）・獲得演出（BG-2）
    earned_label: '獲得済み',
    earned_at: '{{date}} 獲得',
    locked_label: '未獲得',
    // SR 用 aria-label：獲得 / 未獲得 + ヒント
    cell_earned_label: '{{name}}、獲得済み（{{date}}）',
    cell_locked_label: '{{name}}、未獲得：{{hint}}',
    // 獲得演出（BadgeAwardToast）。aria-live で読み上げ
    award_announce: 'バッジ獲得：{{name}}',
    award_title: 'バッジ獲得',
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
