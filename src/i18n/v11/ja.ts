/**
 * v1.1 用日本語 i18n 文言（spec-v11.md §6 / system.md §6）。
 *
 * v1 の `src/i18n/ja.ts` は v1 用に保持し、v1.1 で新規・改訂される文言を
 * ここに集約する。キー命名規則は v1 と同一（ドット区切り、placeholder は
 * `{{name}}` 形式）。
 *
 * Sprint 8 では F-04 / F-17 / F-16 / F-01 / F-02 / F-03 周りの文言のみ
 * 定義。Sprint 9 以降で各ゲームの文言を追加する。
 */

export const jaV11 = {
  app: {
    title: 'GaborEye',
  },
  common: {
    next: '次へ',
    back: '戻る',
    close: '閉じる',
    cancel: 'キャンセル',
    ok: 'OK',
    skip_to_main: 'メインコンテンツへ移動',
  },
  // F-17 起動時データリセット
  dataReset: {
    title: '最新版へのアップデート',
    body:
      'より良いトレーニングのため、過去のデータをリセットしました。' +
      '新しい 13 ゲームをお楽しみください。',
    note: '※ 視聴距離・年齢層・免責同意は新たに設定し直していただきます',
    ok: 'OK',
    error_title: 'エラー',
    error_body: 'データの初期化に失敗しました。',
    error_hint: 'ブラウザを再起動してから、もう一度お試しください。',
    error_retry: '再試行',
  },
  // F-04 ホーム
  home: {
    title: 'GaborEye',
    open_settings: '設定を開く',
    cta_full_course: '全ゲーム連続プレイ（約 {{n}} 分）',
    cta_full_course_again: 'もう一度挑戦',
    cta_aria:
      '全ゲーム連続プレイを始める。約 {{n}} 分。本日のトレーニングを開始します',
    cta_start: 'はじめる',
    today_completed: '本日完了',
    today_completed_label: '完了済み',
    today_full_course_done: '今日のトレーニング完了',
    streak_zero_hint: 'コースを始めて、連続記録をスタート',
    single_play_link: '単体プレイ（{{n}} ゲームから）',
    single_play_aria: '単体プレイを開く。{{n}} 個のゲームから選べます',
    nav_progress: '進捗グラフ',
    nav_progress_sub: '直近 28 日推移',
    nav_badges: 'バッジ',
    nav_badges_sub: '{{earned}} / {{total}} 達成',
  },
  // F-16 距離リマインド改訂（3 秒）
  distanceReminder: {
    headline: '画面から {{n}}cm 離れて',
    headline_2: 'ください',
    one_eye: '片目を覆ってください（任意）',
    auto_start: '{{n}} 秒後に自動で開始',
    abort_aria: 'ゲームを中断',
  },
  // F-01 オンボーディング
  onboarding: {
    welcome_title: 'GaborEye へようこそ',
    welcome_body_1: '60 秒の注視で目を鍛える',
    welcome_body_2: '視覚トレーニング 13 種',
    welcome_body_3: '最初に 90 秒だけ初期設定をお願いします',
    step_label: 'ステップ {{current}} / {{total}}',
    age_title: 'あなたの年齢層は？',
    age_body: '訓練効果の参考として保存します（任意・後から変更可能）',
    age_40s: '40 代',
    age_50s: '50 代',
    age_60s: '60 代',
    age_70s: '70 代以上',
    age_unspecified: '指定しない',
    elder_warning_title: '70 代以上の方へのご注意',
    elder_warning_body_1:
      '本アプリは医療機器ではなく、視覚機能の診断や治療を目的としません。',
    elder_warning_body_2:
      '視力低下・見えにくさ・視野の変化を感じる場合は、まず眼科受診をご優先ください。',
    elder_warning_body_3:
      '60 秒間の注視がつらい場合は途中で × を押して中断できます。',
    elder_warning_ok: '了解しました',
    distance_title: '視聴距離の設定',
    distance_body: '端末から目までの距離を選んでください',
    distance_device_estimated: '推定：{{device}}（dpi {{dpi}}）',
    distance_current: '現在の設定',
    distance_preview: 'プレビュー',
    distance_preview_hint: 'この距離で見えるサイズの目安としてご確認ください',
    howto_title: '使い方',
    howto_block1_title: '13 種類のゲームがあります',
    howto_block1_body:
      'ガボールパッチ（縞模様）を使った視覚弁別トレーニングです',
    howto_block2_title: '各ゲームは 60 秒',
    howto_block2_body: '60 秒間ずっと注視して、選択肢をタップして回答します',
    howto_block3_title: '確定ボタンはありません',
    howto_block3_body:
      '時間切れまで何度でも回答を変更できます。' +
      '60 秒経過時点の選択が自動で採点されます',
    howto_next_intro: '次の画面で 1 試行体験します',
    experience_title: '1 試行体験',
    experience_placeholder_body:
      '実際のゲームは Sprint 9 以降で順次実装されます。' +
      '今回は体験省略で完了とします。',
    experience_done_button: 'ホームへ',
    completion_banner_title: 'オンボーディング完了',
    completion_banner_body:
      'お疲れさまでした。明日からはホームの「全ゲーム連続プレイ」' +
      'から 13 ゲームをご利用ください',
  },
  // F-04 全ゲーム一覧
  gameList: {
    title: '単体プレイ',
    intro: '好きなゲームを選んでください',
    intro_count: '（{{n}} 種類）',
    upcoming: '準備中',
    upcoming_toast: '{{nameJa}} は今後のスプリントで実装されます',
    back_aria: 'ホームに戻る',
  },
} as const;
