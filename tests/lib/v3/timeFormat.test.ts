/**
 * timeFormat.test.ts — v3.1 プレイ時間整形（セッション時間 / 累計ゲーム時間）。
 */

import {
  splitDuration,
  formatSessionDuration,
  formatCumulativeDuration,
} from '../../../src/lib/v3/timeFormat';

describe('splitDuration', () => {
  it('時/分/秒に分解する', () => {
    expect(splitDuration(0)).toEqual({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
    expect(splitDuration(59)).toEqual({ hours: 0, minutes: 0, seconds: 59, totalSeconds: 59 });
    expect(splitDuration(272)).toEqual({ hours: 0, minutes: 4, seconds: 32, totalSeconds: 272 });
    expect(splitDuration(3661)).toEqual({ hours: 1, minutes: 1, seconds: 1, totalSeconds: 3661 });
  });
  it('負値・小数・NaN は 0 方向に丸める', () => {
    expect(splitDuration(-10).totalSeconds).toBe(0);
    expect(splitDuration(90.9).seconds).toBe(30);
    expect(splitDuration(NaN).totalSeconds).toBe(0);
  });
});

describe('formatSessionDuration（セッション時間）', () => {
  it('1 分未満は「S秒」', () => {
    expect(formatSessionDuration(40)).toBe('40秒');
    expect(formatSessionDuration(0)).toBe('0秒');
  });
  it('1 分以上は「M分S秒」', () => {
    expect(formatSessionDuration(272)).toBe('4分32秒');
    expect(formatSessionDuration(60)).toBe('1分0秒');
  });
  it('1 時間以上は「H時間M分」', () => {
    expect(formatSessionDuration(3720)).toBe('1時間2分');
  });
});

describe('formatCumulativeDuration（累計ゲーム時間）', () => {
  it('1 分未満は「S秒」、1 分以上は「M分」、1 時間以上は「H時間M分」', () => {
    expect(formatCumulativeDuration(0)).toBe('0秒');
    expect(formatCumulativeDuration(45)).toBe('45秒');
    expect(formatCumulativeDuration(272)).toBe('4分');
    expect(formatCumulativeDuration(7320)).toBe('2時間2分');
  });
});
