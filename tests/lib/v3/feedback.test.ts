/**
 * feedback.test.ts — v3.0 音・ハプティクス発火決定の純関数（spec F-14、system §10）。
 *
 * 各イベント × 音 ON/OFF × 振動 ON/OFF × サイレント の組合せで、鳴らす音種・音量・
 * 振動種が仕様どおりかを検証する。F-14 受け入れ基準：
 *  - clear/fail/levelup/badge で音 + ハプティクス（OFF 時は当該チャネル無発火）
 *  - 残り 3/2/1 秒で tick 音（音量 0.4/0.5/0.6、ハプティクスなし）
 *  - サイレント時は音なし・ハプティクスあり（振動 OFF でない限り）
 *  - レベルダウン専用音は存在しない（イベント型に leveldown がない）
 */

import {
  decideFeedbackV3,
  type FeedbackEventV3,
  type FeedbackSettingsV3,
} from '../../../src/lib/v3/feedback';

const ON: FeedbackSettingsV3 = { soundEnabled: true, hapticsEnabled: true };
const SOUND_OFF: FeedbackSettingsV3 = {
  soundEnabled: false,
  hapticsEnabled: true,
};
const HAPTIC_OFF: FeedbackSettingsV3 = {
  soundEnabled: true,
  hapticsEnabled: false,
};
const ALL_OFF: FeedbackSettingsV3 = {
  soundEnabled: false,
  hapticsEnabled: false,
};

describe('decideFeedbackV3 — イベント別の既定（音 ON / 振動 ON / 非サイレント）', () => {
  it('clear: clear 音(0.6) + light 振動', () => {
    const plan = decideFeedbackV3({ type: 'clear' }, ON);
    expect(plan.sound).toEqual({ kind: 'clear', volume: 0.6 });
    expect(plan.haptic).toBe('light');
  });

  it('fail: fail 音(0.5) + medium 振動（責めない柔らかさ）', () => {
    const plan = decideFeedbackV3({ type: 'fail' }, ON);
    expect(plan.sound).toEqual({ kind: 'fail', volume: 0.5 });
    expect(plan.haptic).toBe('medium');
  });

  it('levelup: levelup 音(0.65) + medium 振動', () => {
    const plan = decideFeedbackV3({ type: 'levelup' }, ON);
    expect(plan.sound).toEqual({ kind: 'levelup', volume: 0.65 });
    expect(plan.haptic).toBe('medium');
  });

  it('badge-earned: badge 音(0.7) + badge 振動（heavy+medium）', () => {
    const plan = decideFeedbackV3({ type: 'badge-earned' }, ON);
    expect(plan.sound).toEqual({ kind: 'badge', volume: 0.7 });
    expect(plan.haptic).toBe('badge');
  });

  it('countdown-tick: tick 音のみ（ハプティクスなし）。残り秒で音量が増す', () => {
    expect(decideFeedbackV3({ type: 'countdown-tick', remainingSec: 3 }, ON)).toEqual(
      { sound: { kind: 'tick', volume: 0.4 }, haptic: null },
    );
    expect(decideFeedbackV3({ type: 'countdown-tick', remainingSec: 2 }, ON)).toEqual(
      { sound: { kind: 'tick', volume: 0.5 }, haptic: null },
    );
    expect(decideFeedbackV3({ type: 'countdown-tick', remainingSec: 1 }, ON)).toEqual(
      { sound: { kind: 'tick', volume: 0.6 }, haptic: null },
    );
  });
});

describe('decideFeedbackV3 — 音 OFF（振動 ON）', () => {
  const events: FeedbackEventV3[] = [
    { type: 'clear' },
    { type: 'fail' },
    { type: 'countdown-tick', remainingSec: 1 },
    { type: 'levelup' },
    { type: 'badge-earned' },
  ];

  it.each(events)('音を一切鳴らさない: %o', (event) => {
    expect(decideFeedbackV3(event, SOUND_OFF).sound).toBeNull();
  });

  it('振動は ON のまま発火（clear=light, fail=medium, levelup=medium, badge=badge）', () => {
    expect(decideFeedbackV3({ type: 'clear' }, SOUND_OFF).haptic).toBe('light');
    expect(decideFeedbackV3({ type: 'fail' }, SOUND_OFF).haptic).toBe('medium');
    expect(decideFeedbackV3({ type: 'levelup' }, SOUND_OFF).haptic).toBe('medium');
    expect(decideFeedbackV3({ type: 'badge-earned' }, SOUND_OFF).haptic).toBe('badge');
  });
});

describe('decideFeedbackV3 — 振動 OFF（音 ON）', () => {
  it('ハプティクスを一切発火しない', () => {
    expect(decideFeedbackV3({ type: 'clear' }, HAPTIC_OFF).haptic).toBeNull();
    expect(decideFeedbackV3({ type: 'fail' }, HAPTIC_OFF).haptic).toBeNull();
    expect(decideFeedbackV3({ type: 'levelup' }, HAPTIC_OFF).haptic).toBeNull();
    expect(decideFeedbackV3({ type: 'badge-earned' }, HAPTIC_OFF).haptic).toBeNull();
  });

  it('音は ON のまま鳴る', () => {
    expect(decideFeedbackV3({ type: 'clear' }, HAPTIC_OFF).sound).toEqual({
      kind: 'clear',
      volume: 0.6,
    });
  });
});

describe('decideFeedbackV3 — 両 OFF', () => {
  it('音も振動も発火しない', () => {
    const plan = decideFeedbackV3({ type: 'clear' }, ALL_OFF);
    expect(plan.sound).toBeNull();
    expect(plan.haptic).toBeNull();
  });
});

describe('decideFeedbackV3 — サイレントモード尊重（NF-33）', () => {
  it('サイレント時は音を抑止しハプティクスは発火する（clear=light）', () => {
    const plan = decideFeedbackV3({ type: 'clear' }, ON, true);
    expect(plan.sound).toBeNull();
    expect(plan.haptic).toBe('light');
  });

  it('サイレント時でも fail/levelup/badge のハプティクスは発火する', () => {
    expect(decideFeedbackV3({ type: 'fail' }, ON, true)).toEqual({
      sound: null,
      haptic: 'medium',
    });
    expect(decideFeedbackV3({ type: 'levelup' }, ON, true)).toEqual({
      sound: null,
      haptic: 'medium',
    });
    expect(decideFeedbackV3({ type: 'badge-earned' }, ON, true)).toEqual({
      sound: null,
      haptic: 'badge',
    });
  });

  it('サイレント + 振動 OFF は音も振動も出さない', () => {
    const plan = decideFeedbackV3({ type: 'fail' }, HAPTIC_OFF, true);
    expect(plan.sound).toBeNull();
    expect(plan.haptic).toBeNull();
  });

  it('サイレントでもティックは完全無発火（元々音のみ）', () => {
    const plan = decideFeedbackV3(
      { type: 'countdown-tick', remainingSec: 2 },
      ON,
      true,
    );
    expect(plan.sound).toBeNull();
    expect(plan.haptic).toBeNull();
  });
});
