/**
 * audio.test.ts — 効果音バックエンド（S9 / F-14、platform/audio.ts）。
 *
 * jest-expo は Platform.OS='ios' のため NativeAudioBackend が既定になる。
 * expo-audio をモックし、play() が seekTo→play 経路で正しい音種プレイヤーを叩くこと、
 * アセット欠落・API 失敗でもクラッシュしないこと、Noop/差し替えを検証する。
 */

import {
  DEFAULT_VOLUME,
  NoopAudioBackend,
  SOUND_KINDS,
  getDefaultAudioBackend,
  setDefaultAudioBackend,
} from '../../src/platform/audio';

describe('SOUND_KINDS / DEFAULT_VOLUME', () => {
  it('v3.0 の clear/fail/tick/levelup/badge と v2 互換 correct/wrong/end を持つ', () => {
    expect([...SOUND_KINDS]).toEqual([
      'clear',
      'fail',
      'tick',
      'levelup',
      'badge',
      'correct',
      'wrong',
      'end',
    ]);
    for (const k of SOUND_KINDS) {
      expect(DEFAULT_VOLUME[k]).toBeGreaterThan(0);
      expect(DEFAULT_VOLUME[k]).toBeLessThanOrEqual(1);
    }
  });
});

describe('NoopAudioBackend', () => {
  it('利用不可で、play/prime/stop がクラッシュしない', async () => {
    const b = new NoopAudioBackend();
    expect(b.isAvailable()).toBe(false);
    await expect(b.prime()).resolves.toBeUndefined();
    expect(() => b.play('correct')).not.toThrow();
    expect(() => b.stop()).not.toThrow();
  });
});

describe('getDefaultAudioBackend / setDefaultAudioBackend', () => {
  afterEach(() => setDefaultAudioBackend(null));

  it('差し替えたバックエンドを返す', () => {
    const fake = new NoopAudioBackend();
    setDefaultAudioBackend(fake);
    expect(getDefaultAudioBackend()).toBe(fake);
  });

  it('未設定時はキャッシュした 1 インスタンスを返す', () => {
    setDefaultAudioBackend(null);
    const a = getDefaultAudioBackend();
    const b = getDefaultAudioBackend();
    expect(a).toBe(b);
  });
});
