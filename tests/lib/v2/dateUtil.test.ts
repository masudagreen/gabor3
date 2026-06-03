/**
 * dateUtil.test.ts — 端末ローカル日付ユーティリティ（spec AS-20）。
 */

import {
  localDateString,
  parseLocalDate,
  dayDiff,
} from '../../../src/lib/v2/dateUtil';

describe('localDateString', () => {
  it('ローカル年月日を YYYY-MM-DD でゼロ埋めする', () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDateString(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('parseLocalDate', () => {
  it('YYYY-MM-DD をローカル 0 時の Date に戻す', () => {
    const d = parseLocalDate('2026-05-30');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4);
    expect(d.getDate()).toBe(30);
  });
});

describe('dayDiff', () => {
  it('同日は 0', () => {
    expect(dayDiff('2026-05-30', '2026-05-30')).toBe(0);
  });
  it('翌日は 1', () => {
    expect(dayDiff('2026-05-30', '2026-05-31')).toBe(1);
  });
  it('月をまたいでも正しい（5/31 → 6/2 は 2）', () => {
    expect(dayDiff('2026-05-31', '2026-06-02')).toBe(2);
  });
  it('過去日は負', () => {
    expect(dayDiff('2026-05-31', '2026-05-30')).toBe(-1);
  });
});
