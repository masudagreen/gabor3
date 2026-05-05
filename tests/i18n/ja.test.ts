/**
 * i18n / ja.ts と t() のテスト（Sprint 7-C / spec.md §4「日本語のみ・将来構造」）。
 *
 * 確認項目：
 *   - 主要キーがすべて存在する（HomeScreen / SettingsScreen / DisclaimerSheet で使うキー）
 *   - 文字列以外（配列）は tArray で取れる
 *   - placeholder が `{{name}}` 形式で展開される
 *   - 未定義キーはキー自体を返す（フェイルセーフ）
 */

import { t, tArray, ja, interpolate } from '../../src/i18n';

describe('i18n.ja 必須キー', () => {
  it('HomeScreen で使う主要キーがすべて文字列として存在する', () => {
    const required = [
      'home.title',
      'home.open_settings',
      'home.start_course',
      'home.start_course_again',
      'home.start_course_aria',
      'home.today_completed_title',
      'home.today_completed_body',
      'home.section_single_play',
      'home.section_pick_single',
      'home.today_v1_score',
      'home.today_v1_score_aria',
      'home.progress_button',
      'home.progress_button_aria',
      'home.badges_button',
      'home.badges_button_aria',
      'home.daily_best_button',
      'home.daily_best_button_aria',
    ];
    for (const key of required) {
      const v = t(key);
      expect(typeof v).toBe('string');
      // 未定義はキーがそのまま返る → 必ず元の key と異なる文字列であることを確認
      expect(v).not.toBe(key);
      expect(v.length).toBeGreaterThan(0);
    }
  });

  it('SettingsScreen / DisclaimerSheet の主要キーが存在する', () => {
    const required = [
      'settings.title',
      'settings.section_display',
      'settings.section_audio',
      'settings.item_dark_mode',
      'settings.item_sound',
      'settings.item_haptics',
      'settings.item_disclaimer',
      'settings.item_delete_all',
      'settings.item_version',
      'disclaimer.title',
      'disclaimer.body_intro',
      'disclaimer.warn_header',
      'disclaimer.body_outro',
      'disclaimer.agree_button',
      'common.next',
      'common.back',
      'common.close',
      'common.skip_to_main',
    ];
    for (const key of required) {
      const v = t(key);
      expect(typeof v).toBe('string');
      expect(v).not.toBe(key);
    }
  });

  it('ja.disclaimer.warn_lines は配列（tArray で取得）', () => {
    const lines = tArray('disclaimer.warn_lines');
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThanOrEqual(5);
    for (const line of lines) {
      expect(typeof line).toBe('string');
    }
  });
});

describe('i18n.t() の placeholder 展開', () => {
  it('{{score}} placeholder が params で展開される', () => {
    const out = t('home.today_v1_score_aria', { score: 78 });
    expect(out).toContain('78');
    expect(out).not.toContain('{{');
  });

  it('未指定の placeholder は {{key}} のまま残る（フェイルセーフ）', () => {
    expect(interpolate('{{a}} と {{b}}', { a: 'hello' })).toBe('hello と {{b}}');
  });

  it('params が undefined のときはそのまま返す', () => {
    expect(interpolate('hello {{a}}', undefined)).toBe('hello {{a}}');
  });

  it('未定義のキーはキー自体を返す（デバッグしやすさ）', () => {
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('数値 placeholder は文字列に変換される', () => {
    expect(t('app.version_label', { version: '1.0.0' })).toBe('V1.0.0');
  });

  it('ja は readonly な構造（型レベルのスナップショット確認）', () => {
    expect(typeof ja.app.title).toBe('string');
    expect(typeof ja.disclaimer.warn_lines[0]).toBe('string');
  });
});
