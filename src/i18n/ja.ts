/**
 * ja.ts — Sprint 7-C / spec.md §4「日本語のみ」「将来対応可能な文言構造」。
 *
 * v1 では日本語ロケールのみ。本モジュールは UI 文言を集約し、t() ヘルパー経由で
 * 参照する構造を整える。v2 で多言語化する際は、同じキーで en.ts / zh.ts を
 * 増やすだけで済むようにキー命名は安定化させる。
 *
 * 移行方針（Sprint 7-C スコープ）：
 *   - HomeScreen / SettingsScreen / DisclaimerSheet の主要文言のみキー化
 *   - 残りの画面は v2 で順次移行（今回は構造下準備のみ）
 */

export const ja = {
  app: {
    title: 'GaborEye',
    version_label: 'V{{version}}',
  },
  common: {
    next: '次へ',
    back: '戻る',
    close: '閉じる',
    cancel: 'キャンセル',
    save: '保存',
    saved: '保存しました',
    skip_to_main: 'メインコンテンツへ移動',
  },
  home: {
    title: 'GaborEye',
    open_settings: '設定を開く',
    start_course: '3 分コースを始める',
    start_course_again: 'もう一度 3 分コース',
    start_course_aria: '3 分コースを始める。本日のトレーニングを開始します',
    today_completed_title: '✅ 今日のトレーニング完了',
    today_completed_body: '3 分コースをまた明日',
    section_single_play: '単体ゲームで遊ぶ：',
    section_pick_single: 'または、ゲームだけ単体で：',
    today_v1_score: '今日の V1 スコア',
    today_v1_score_aria: '今日の V1 スコア {{score}} 点',
    progress_button: '📈 進捗グラフ',
    progress_button_aria: '進捗グラフを開く',
    badges_button: '🏅 バッジ一覧',
    badges_button_aria: 'バッジ一覧を開く',
    daily_best_button: '🏆 日次ベスト',
    daily_best_button_aria: '日次ベストを開く',
    debug_button: 'デバッグ表示',
  },
  settings: {
    title: '設定',
    back_aria: '設定を閉じてホームに戻る',
    section_display: '画面表示',
    section_audio: '音と振動',
    section_environment: '視聴環境',
    section_data: 'データと法的事項',
    section_app: 'アプリ情報',
    item_dark_mode: 'ダークモード',
    item_sound: '効果音',
    item_sound_sub: 'ボタン操作などの音',
    item_haptics: '振動(ハプティクス)',
    item_haptics_sub_native: '操作時に短い振動',
    item_haptics_sub_web: 'Web ブラウザでは無効',
    item_bgm: 'Game 3 リズム BGM',
    item_bgm_sub: '周辺視野ハント中の BGM',
    item_distance: '視聴距離',
    item_one_eye: '片眼ガイダンス',
    item_disclaimer: '免責事項を読む',
    item_delete_all: '全データを削除',
    item_delete_all_sub: '記録・設定をすべて消去',
    item_version: 'バージョン情報',
    saved_dark_mode: 'ダークモードを保存しました',
    saved_one_eye: '片眼ガイダンスを保存しました',
    saved_distance: '視聴距離を保存しました',
    saved_generic: '{{label}}を保存しました',
    distance_close_aria: '視聴距離設定を閉じる',
    distance_save_label: '保存して閉じる',
    agreed_date: '同意日時：{{date}}',
  },
  disclaimer: {
    title: 'ご利用前にお読みください',
    body_intro:
      'このアプリは医療機器ではありません。\n' +
      'ガボールパッチによる視覚トレーニングは、\n' +
      '脳の視覚処理を鍛えることを目的とした自助セルフケアです。\n' +
      '特定の視力回復・治療効果を保証するものではありません。',
    warn_header: '以下の方は本アプリのご利用を推奨しません：',
    warn_lines: [
      '・お子さま（小学生以下）',
      '・70 歳以上の方',
      '・白内障・緑内障・加齢黄斑変性などの診断歴がある方',
      '・強度近視（-6D 以上）の方',
      '・目に違和感、痛み、かすみ、急激な視力低下のある方',
    ],
    body_outro:
      '利用中に違和感を感じた場合はすぐ中断し、\n眼科医にご相談ください。',
    agree_label: '上記に同意します',
    agree_button: '同意する',
    read_to_end_hint: '※ 最後まで読んでチェックを入れてください',
  },
} as const;

export type LocaleDict = typeof ja;
