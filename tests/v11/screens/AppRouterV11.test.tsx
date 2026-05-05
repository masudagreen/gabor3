/**
 * AppRouterV11 — F-17 起動シーケンス受け入れテスト（spec-v11.md §F-17 / §8.1）。
 *
 * 重点：
 *   - 初回 v1.1 起動 + v1 データあり：消去 → DataResetNotice 表示 → OK で続行
 *   - 通知は 1 度だけ（dataResetNoticeShown フラグで永続化）
 *   - v1 データ無しのときは通知をスキップ
 *   - onboardingCompleted=false → オンボーディング、true → ホーム
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppRouterV11 } from '../../../src/navigation/v11/AppRouterV11';
import {
  KEY_DATA_RESET_NOTICE_SHOWN,
  KEY_USER_PROFILE_V11,
  V1_LEGACY_KEYS,
  detectV1LegacyData,
  isDataResetNoticeShown,
} from '../../../src/state/storage-v11';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('AppRouterV11: F-17 起動時データリセット', () => {
  it('v1 データあり + 通知未表示 → DataResetNotice 表示、消去後オンボーディングへ', async () => {
    // v1 旧キーを仕込む
    await AsyncStorage.setItem(
      'gaboreye:v1:staircase:game1',
      JSON.stringify({ x: 1 }),
    );
    await AsyncStorage.setItem('gaboreye:v1:userProfile', '{}');
    expect(await detectV1LegacyData()).toBe(true);

    const { findByTestId, queryByTestId } = render(<AppRouterV11 />);
    // データリセット通知が出ているはず
    expect(await findByTestId('data-reset-notice')).toBeTruthy();

    // OK タップ → onboarding 経由
    fireEvent.press(await findByTestId('data-reset-notice-ok'));

    // 通知が閉じてオンボーディングへ
    await waitFor(() => {
      expect(queryByTestId('data-reset-notice')).toBeNull();
    });

    // dataResetNoticeShown=true が永続化されている
    expect(await isDataResetNoticeShown()).toBe(true);
    // v1 旧データは消えている
    expect(await detectV1LegacyData()).toBe(false);
    for (const k of V1_LEGACY_KEYS) {
      expect(await AsyncStorage.getItem(k)).toBeNull();
    }
  });

  it('v1 データなし → DataResetNotice をスキップ、直接オンボーディングへ', async () => {
    const { findByTestId, queryByTestId } = render(<AppRouterV11 />);
    expect(await findByTestId('ob-welcome')).toBeTruthy();
    expect(queryByTestId('data-reset-notice')).toBeNull();
  });

  it('通知を 1 度表示済みなら 2 回目以降の起動では出さない', async () => {
    // 1 回目シナリオ：通知表示済みフラグだけ立てて、v1 データも残しておく
    await AsyncStorage.setItem(KEY_DATA_RESET_NOTICE_SHOWN, 'true');
    await AsyncStorage.setItem(
      'gaboreye:v1:staircase:game1',
      JSON.stringify({ x: 1 }),
    );

    const { findByTestId, queryByTestId } = render(<AppRouterV11 />);
    // 通知は出ない
    expect(queryByTestId('data-reset-notice')).toBeNull();
    // 直接オンボーディングへ進む
    expect(await findByTestId('ob-welcome')).toBeTruthy();
  });

  it('skipV1Detection でテスト用に検出をスキップできる', async () => {
    await AsyncStorage.setItem(
      'gaboreye:v1:staircase:game1',
      JSON.stringify({ x: 1 }),
    );
    const { findByTestId, queryByTestId } = render(
      <AppRouterV11 skipV1Detection />,
    );
    expect(queryByTestId('data-reset-notice')).toBeNull();
    expect(await findByTestId('ob-welcome')).toBeTruthy();
  });
});

describe('AppRouterV11: F-04 ホームと F-01 オンボ分岐', () => {
  it('onboardingCompleted=false → onboarding ルート', async () => {
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    expect(await findByTestId('ob-welcome')).toBeTruthy();
  });

  it('onboardingCompleted=true → home ルート', async () => {
    await AsyncStorage.setItem(
      KEY_USER_PROFILE_V11,
      JSON.stringify({
        onboardingCompleted: true,
        disclaimerAgreedAt: '2026-04-30T00:00:00.000Z',
        ageGroup: '50s',
        viewingDistanceCm: 40,
        deviceTypeEstimated: 'pc',
        createdAt: '2026-04-30T00:00:00.000Z',
        schemaVersion: '1.1.0',
      }),
    );
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    expect(await findByTestId('home-screen-v11')).toBeTruthy();
  });
});

describe('AppRouterV11: F-04 ホームから単体プレイへの導線', () => {
  beforeEach(async () => {
    await AsyncStorage.setItem(
      KEY_USER_PROFILE_V11,
      JSON.stringify({
        onboardingCompleted: true,
        disclaimerAgreedAt: '2026-04-30T00:00:00.000Z',
        ageGroup: '50s',
        viewingDistanceCm: 40,
        deviceTypeEstimated: 'pc',
        createdAt: '2026-04-30T00:00:00.000Z',
        schemaVersion: '1.1.0',
      }),
    );
  });

  it('「単体プレイ」リンクから AllGamesListScreen へ遷移', async () => {
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    fireEvent.press(await findByTestId('home-v11-single-play'));
    expect(await findByTestId('all-games-list-screen')).toBeTruthy();
  });

  it('Sprint 18：「全ゲーム連続プレイ」CTA から CourseStartScreen へ', async () => {
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    fireEvent.press(await findByTestId('home-hero-cta'));
    expect(await findByTestId('course-start-screen')).toBeTruthy();
  });

  it('v1.1.4：G-12 はリリース除外（単体プレイ一覧に表示されない）', async () => {
    // v1.1.4：G-09/10/11/12 は releaseEnabled=false で一覧から消える。
    const { findByTestId, queryByTestId } = render(
      <AppRouterV11 skipV1Detection />,
    );
    fireEvent.press(await findByTestId('home-v11-single-play'));
    expect(queryByTestId('game-card-G-12')).toBeNull();
  });

  it('Sprint 17：G-13 もタップでミニ説明画面へ進む', async () => {
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    fireEvent.press(await findByTestId('home-v11-single-play'));
    fireEvent.press(await findByTestId('game-card-G-13'));
    expect(await findByTestId('g13-mini-instruction-screen')).toBeTruthy();
  });

  it('Sprint 18：「全ゲーム連続プレイ」CTA は CourseStartScreen を開く（v1.1.4：9 ゲームリスト）', async () => {
    const { findByTestId, queryByTestId } = render(
      <AppRouterV11 skipV1Detection />,
    );
    fireEvent.press(await findByTestId('home-hero-cta'));
    expect(await findByTestId('course-start-screen')).toBeTruthy();
    // enabled なゲーム分のリスト行が描画される（F-18）
    expect(await findByTestId('course-start-row-G-01')).toBeTruthy();
    expect(await findByTestId('course-start-row-G-13')).toBeTruthy();
    // v1.1.4：G-09/10/11/12 は disabled なので course-start-row も無い
    expect(queryByTestId('course-start-row-G-09')).toBeNull();
    expect(queryByTestId('course-start-row-G-12')).toBeNull();
  });

  it('Sprint 18：「進捗グラフ」リンクから ProgressGraphScreen へ', async () => {
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    fireEvent.press(await findByTestId('home-v11-progress'));
    expect(await findByTestId('progress-graph-screen')).toBeTruthy();
  });

  it('Sprint 19：設定アイコンから SettingsScreen へ', async () => {
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    fireEvent.press(await findByTestId('home-v11-settings'));
    expect(await findByTestId('settings-screen-v11')).toBeTruthy();
  });

  it('Sprint 19：バッジ NavCard から BadgeListScreen へ', async () => {
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    fireEvent.press(await findByTestId('home-v11-badges'));
    expect(await findByTestId('badge-list-screen')).toBeTruthy();
  });

  it('Sprint 19：設定 → バッジ一覧 → 戻るで設定へ戻る', async () => {
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    fireEvent.press(await findByTestId('home-v11-settings'));
    fireEvent.press(await findByTestId('settings-badge-list'));
    expect(await findByTestId('badge-list-screen')).toBeTruthy();
    fireEvent.press(await findByTestId('badge-list-back'));
    expect(await findByTestId('settings-screen-v11')).toBeTruthy();
  });

  it('Sprint 9：G-01 カードはタップすると ミニ説明画面 → 距離リマインドへ進む', async () => {
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    fireEvent.press(await findByTestId('home-v11-single-play'));
    // G-01 は implemented なのでミニ説明 → reminder へ進める
    fireEvent.press(await findByTestId('game-card-G-01'));
    // ミニ説明画面が出る
    expect(await findByTestId('g01-mini-instruction-screen')).toBeTruthy();
    // 「はじめる」 → reminder
    fireEvent.press(await findByTestId('g01-mini-instruction-start'));
    expect(await findByTestId('distance-reminder-v11')).toBeTruthy();
  });

  it('G-01 距離リマインド × ボタンで一覧へ戻る', async () => {
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    fireEvent.press(await findByTestId('home-v11-single-play'));
    fireEvent.press(await findByTestId('game-card-G-01'));
    fireEvent.press(await findByTestId('g01-mini-instruction-start'));
    fireEvent.press(await findByTestId('distance-reminder-abort'));
    expect(await findByTestId('all-games-list-screen')).toBeTruthy();
  });

  it('Sprint 10：G-02 カードはタップすると ミニ説明画面 → 距離リマインドへ進む', async () => {
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    fireEvent.press(await findByTestId('home-v11-single-play'));
    fireEvent.press(await findByTestId('game-card-G-02'));
    expect(await findByTestId('g02-mini-instruction-screen')).toBeTruthy();
    fireEvent.press(await findByTestId('g02-mini-instruction-start'));
    expect(await findByTestId('distance-reminder-v11')).toBeTruthy();
  });

  it('G-02 距離リマインド × ボタンで一覧へ戻る', async () => {
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    fireEvent.press(await findByTestId('home-v11-single-play'));
    fireEvent.press(await findByTestId('game-card-G-02'));
    fireEvent.press(await findByTestId('g02-mini-instruction-start'));
    fireEvent.press(await findByTestId('distance-reminder-abort'));
    expect(await findByTestId('all-games-list-screen')).toBeTruthy();
  });

  it('G-02 ミニ説明 ← 戻るボタンで一覧へ戻る', async () => {
    const { findByTestId } = render(<AppRouterV11 skipV1Detection />);
    fireEvent.press(await findByTestId('home-v11-single-play'));
    fireEvent.press(await findByTestId('game-card-G-02'));
    fireEvent.press(await findByTestId('g02-mini-instruction-back'));
    expect(await findByTestId('all-games-list-screen')).toBeTruthy();
  });
});
