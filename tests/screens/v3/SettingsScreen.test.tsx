/**
 * SettingsScreen.test.tsx — v3.0 設定タブ（S10.5、F-13 / screens.md S3-1）。
 *
 * 範囲設定（RG-1、総レベル数プレビュー・最低 1 値）・変化順（OR-1）・継承トグル・
 * 免責再閲覧・全データ削除 2 段階確認、および範囲/変化順変更時の §4.5 クランプ
 * （現在レベルクランプ + 連続失敗 0 リセット）を検証する。
 *
 * AsyncStorage はインメモリモック（jest.setup.ts）。
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { SettingsScreen } from '../../../src/screens/v3/SettingsScreen';
import {
  loadSettings,
  loadLevelState,
  loadUserProfile,
  saveLevelState,
  saveBadgeStatus,
  loadBadgeStatus,
} from '../../../src/state/v3/repository';

function renderSettings(props: Partial<React.ComponentProps<typeof SettingsScreen>> = {}) {
  return render(
    <ThemeProvider preference="light" systemScheme="light">
      <SettingsScreen testId="s" {...props} />
    </ThemeProvider>,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('SettingsScreen 範囲設定・総レベル数プレビュー（F-13）', () => {
  it('初期はフル範囲で総レベル数 720 を表示する', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    expect(screen.getByTestId('s-total').props.children).toContain('720');
  });

  it('繰り返し回数ステッパーを増やすと総レベル数が増え、梯子に反映される（n×180）', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    expect(screen.getByTestId('s-repeat-count-value').props.children).toBe('4回');
    // n=4→5 → 5×180 = 900
    fireEvent.press(screen.getByTestId('s-repeat-count-inc'));
    await waitFor(() =>
      expect(screen.getByTestId('s-total').props.children).toContain('900'),
    );
    const settings = await loadSettings();
    expect(settings.repeatCount).toBe(5);
    expect(settings.variableRanges.repeat).toEqual([1, 2, 3, 4, 5]);
  });

  it('繰り返し回数を減らすと総レベル数が減る（梯子に反映・updateLevelSettings）', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    // n=4→3 → 3×180 = 540
    fireEvent.press(screen.getByTestId('s-repeat-count-dec'));
    await waitFor(() =>
      expect(screen.getByTestId('s-total').props.children).toContain('540'),
    );
    const settings = await loadSettings();
    expect(settings.repeatCount).toBe(3);
    expect(settings.variableRanges.repeat).toEqual([1, 2, 3]);
  });

  it('個数の範囲プリセット（count-range）を変更しても総レベル数は不変（梯子非干渉・§4.9）', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    expect(screen.getByTestId('s-total').props.children).toContain('720');
    // 「広い（最大まで）」= cells_minus_1 を選択。
    fireEvent.press(screen.getByLabelText('広い（最大まで）'));
    await waitFor(async () =>
      expect((await loadSettings()).countRange).toBe('cells_minus_1'),
    );
    // 梯子（総レベル数）は不変。
    expect(screen.getByTestId('s-total').props.children).toContain('720');
  });

  it('各変数は最低 1 値必須：最後の 1 チップは外せず案内が出る', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    // サイズ 4x4 を外す → [3]
    fireEvent.press(screen.getByTestId('s-range-gridSize-chip-4'));
    await waitFor(() =>
      expect(screen.getByTestId('s-total').props.children).toContain('360'),
    );
    // 残った 3x3 を外そうとする → ブロック + 案内
    fireEvent.press(screen.getByTestId('s-range-gridSize-chip-3'));
    await waitFor(() =>
      expect(screen.getByText('少なくとも 1 つ選んでください')).toBeTruthy(),
    );
    const settings = await loadSettings();
    expect(settings.variableRanges.gridSize).toEqual([3]);
  });
});

describe('SettingsScreen セッション時間ステッパー（SR-1a / F-13・AS-23・v3.1）', () => {
  it('既定 5 分を表示し、[+] で 6 分に、[−] で 4 分に即保存する', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-session-minutes')).toBeTruthy());
    expect(screen.getByTestId('s-session-minutes-value').props.children).toBe('5分');

    fireEvent.press(screen.getByTestId('s-session-minutes-inc'));
    await waitFor(() =>
      expect(screen.getByTestId('s-session-minutes-value').props.children).toBe('6分'),
    );
    expect((await loadSettings()).sessionMinutes).toBe(6);

    // 6→5→4（各押下後に再レンダリングを待つ：値は表示プロップ由来のため）。
    fireEvent.press(screen.getByTestId('s-session-minutes-dec'));
    await waitFor(() =>
      expect(screen.getByTestId('s-session-minutes-value').props.children).toBe('5分'),
    );
    fireEvent.press(screen.getByTestId('s-session-minutes-dec'));
    await waitFor(() =>
      expect(screen.getByTestId('s-session-minutes-value').props.children).toBe('4分'),
    );
    expect((await loadSettings()).sessionMinutes).toBe(4);
  });

  it('セッション時間変更は総レベル数（梯子）に影響しない（AS-23）', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    expect(screen.getByTestId('s-total').props.children).toContain('720');
    fireEvent.press(screen.getByTestId('s-session-minutes-inc'));
    await waitFor(() =>
      expect(screen.getByTestId('s-session-minutes-value').props.children).toBe('6分'),
    );
    // 総レベル数は 720 のまま（sessionMinutes はレベル変数ではない）。
    expect(screen.getByTestId('s-total').props.children).toContain('720');
  });

  it('下限 1 分で [−] が disabled（押下無効）', async () => {
    await saveLevelState({ currentLevel: 1, consecutiveFailures: 0, highestLevel: 0 });
    // sessionMinutes を 1 に下げる（5→1）。
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-session-minutes')).toBeTruthy());
    // 5→1 まで 1 つずつ減らす（各押下後に再レンダリングを待ってから次を押す）。
    for (const expected of ['4分', '3分', '2分', '1分']) {
      fireEvent.press(screen.getByTestId('s-session-minutes-dec'));
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() =>
        expect(screen.getByTestId('s-session-minutes-value').props.children).toBe(
          expected,
        ),
      );
    }
    // 1 分でさらに [−] を押しても 1 のまま（disabled）。
    fireEvent.press(screen.getByTestId('s-session-minutes-dec'));
    await waitFor(() =>
      expect(screen.getByTestId('s-session-minutes-value').props.children).toBe('1分'),
    );
    expect((await loadSettings()).sessionMinutes).toBe(1);
  });
});

describe('SettingsScreen 拡張レンジチップ（RG-1 / §4.1 拡張・v3.1）', () => {
  it('サイズに 5x5/6x6 チップが追加され、既定 OFF・ON で総レベル数が増える', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    // 5x5/6x6 のチップが存在する（既定 OFF）。
    expect(screen.getByTestId('s-range-gridSize-chip-5')).toBeTruthy();
    expect(screen.getByTestId('s-range-gridSize-chip-6')).toBeTruthy();
    expect(screen.getByTestId('s-total').props.children).toContain('720');
    // 5x5 を ON → gridSize 3 値 → 4×5×2×3×9 = 1080。
    fireEvent.press(screen.getByTestId('s-range-gridSize-chip-5'));
    await waitFor(() =>
      expect(screen.getByTestId('s-total').props.children).toContain('1080'),
    );
    expect((await loadSettings()).variableRanges.gridSize).toEqual([3, 4, 5]);
  });

  it('時間に 60/10、回転速度に 7/1 チップが追加されている（拡張全集合・v3.2 で個数チップは廃止）', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    // v3.2：個数は難易度軸でなくなり、範囲チップ（s-range-count-*）は存在しない。
    expect(screen.queryByTestId('s-range-count-chip-1')).toBeNull();
    expect(screen.queryByTestId('s-range-count-chip-5')).toBeNull();
    expect(screen.getByTestId('s-range-seconds-chip-60')).toBeTruthy();
    expect(screen.getByTestId('s-range-seconds-chip-10')).toBeTruthy();
    expect(screen.getByTestId('s-range-rotationSpeed-chip-7')).toBeTruthy();
    expect(screen.getByTestId('s-range-rotationSpeed-chip-1')).toBeTruthy();
  });

  it('繰り返し回数ステッパーと個数範囲セグメントが表示される（v3.2 新 UI）', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    expect(screen.getByTestId('s-repeat-count')).toBeTruthy();
    expect(screen.getByTestId('s-repeat-count-inc')).toBeTruthy();
    expect(screen.getByTestId('s-repeat-count-dec')).toBeTruthy();
    expect(screen.getByTestId('s-count-range')).toBeTruthy();
    // 3 プリセットの選択肢が読み上げ可能。
    expect(screen.getByLabelText('広い（最大まで）')).toBeTruthy();
    expect(screen.getByLabelText('ひかえめ（半分まで）')).toBeTruthy();
    expect(screen.getByLabelText('少なめ（1〜4）')).toBeTruthy();
  });
});

describe('SettingsScreen 範囲変更でのクランプ（§4.5 / F-13）', () => {
  it('範囲を絞ると現在レベルが新上限にクランプされ連続失敗が 0 リセットされる', async () => {
    // 現在レベルを高め（700）に設定し、連続失敗 1 を残す。
    await saveLevelState({ currentLevel: 700, consecutiveFailures: 1, highestLevel: 700 });
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());

    // 回転速度を 1 値（6 だけ）に絞る → 他フル：4×5×2×2×1 = 80。700 は 80 にクランプ。
    // チップは 1 つずつ外す（各反映を待ってから次へ：UI は逐次更新が前提）。
    const speeds = [
      { v: 5.5, total: 640 },
      { v: 5, total: 560 },
      { v: 4.5, total: 480 },
      { v: 4, total: 400 },
      { v: 3.5, total: 320 },
      { v: 3, total: 240 },
      { v: 2.5, total: 160 },
      { v: 2, total: 80 },
    ];
    for (const { v, total } of speeds) {
      fireEvent.press(screen.getByTestId(`s-range-rotationSpeed-chip-${v}`));
      await waitFor(() =>
        expect(screen.getByTestId('s-total').props.children).toContain(`${total}`),
      );
    }
    const ls = await loadLevelState();
    expect(ls.currentLevel).toBe(80);
    expect(ls.consecutiveFailures).toBe(0);
    expect(ls.highestLevel).toBeLessThanOrEqual(80);
    // クランプ通知が表示される
    expect(screen.getByTestId('s-notice')).toBeTruthy();
  });

  it('範囲が縮んでも現在レベルが収まる場合はクランプ告知を出さない', async () => {
    await saveLevelState({ currentLevel: 3, consecutiveFailures: 1, highestLevel: 3 });
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    // 回転速度 2 を外す（8 値）→ total 640。currentLevel 3 はそのまま。
    fireEvent.press(screen.getByTestId('s-range-rotationSpeed-chip-2'));
    await waitFor(() =>
      expect(screen.getByTestId('s-total').props.children).toContain('640'),
    );
    const ls = await loadLevelState();
    expect(ls.currentLevel).toBe(3);
    // 梯子変更で連続失敗は常に 0 リセット（§4.5）。
    expect(ls.consecutiveFailures).toBe(0);
  });
});

describe('SettingsScreen 変化順（OR-1、F-13・v3.2：repeat 最内側固定で外側 4 のみ並べ替え）', () => {
  it('repeat は変化順 UI に出ない（最内側固定・§4.2）', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    expect(screen.queryByTestId('s-order-down-repeat')).toBeNull();
    expect(screen.queryByTestId('s-order-up-repeat')).toBeNull();
    // 外側 4 変数の行は存在する。
    expect(screen.getByTestId('s-order-row-seconds')).toBeTruthy();
  });

  it('先頭の外側変数（seconds）を下へ動かすと variableOrder が組み替わる（repeat は index0 保持）', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    // 外側の先頭 seconds を 1 つ下へ → 外側 [direction, seconds, gridSize, rotationSpeed]
    fireEvent.press(screen.getByTestId('s-order-down-seconds'));
    await waitFor(async () => {
      const settings = await loadSettings();
      expect(settings.variableOrder).toEqual([
        'repeat',
        'direction',
        'seconds',
        'gridSize',
        'rotationSpeed',
      ]);
    });
  });

  it('デフォルトに戻すで variableOrder が既定へ戻る', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    fireEvent.press(screen.getByTestId('s-order-down-seconds'));
    fireEvent.press(screen.getByTestId('s-order-reset'));
    await waitFor(async () => {
      const settings = await loadSettings();
      expect(settings.variableOrder).toEqual([
        'repeat',
        'seconds',
        'direction',
        'gridSize',
        'rotationSpeed',
      ]);
    });
  });
});

describe('SettingsScreen 継承トグル即保存（F-13）', () => {
  it('効果音トグルで soundEnabled が保存される', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    // 既定 ON → タップで OFF
    fireEvent.press(screen.getByLabelText('効果音 ON'));
    await waitFor(async () => {
      const settings = await loadSettings();
      expect(settings.soundEnabled).toBe(false);
    });
  });

  it('ダークモードを暗に変更すると darkMode が保存され親へ通知される', async () => {
    const onChange = jest.fn();
    renderSettings({ onSettingsChange: onChange });
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('暗'));
    await waitFor(async () => {
      const settings = await loadSettings();
      expect(settings.darkMode).toBe('dark');
    });
    expect(onChange).toHaveBeenCalled();
  });

  it('視聴距離を 50 に変更すると UserProfile に即保存される', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('50'));
    await waitFor(async () => {
      const p = await loadUserProfile();
      expect(p.viewingDistanceCm).toBe(50);
    });
  });
});

describe('SettingsScreen 免責再閲覧（F-10）', () => {
  it('「免責事項を読む」でモーダルが開き、閉じるで閉じる', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    expect(screen.queryByTestId('s-disclaimer')).toBeNull();
    fireEvent.press(screen.getByLabelText('免責事項を読む'));
    expect(screen.getByTestId('s-disclaimer')).toBeTruthy();
    fireEvent.press(screen.getByTestId('s-disclaimer-close'));
    await waitFor(() => expect(screen.queryByTestId('s-disclaimer')).toBeNull());
  });
});

describe('SettingsScreen 全データ削除 2 段階確認（F-13 / §7.9）', () => {
  it('タップ → 確認 → 削除で LevelState が L1/0/0 に初期化される', async () => {
    await saveLevelState({ currentLevel: 50, consecutiveFailures: 1, highestLevel: 60 });
    await saveBadgeStatus({ badgeId: 'B-01', earned: true, earnedAt: '2026-06-10T00:00:00.000Z' });
    const onDeleted = jest.fn();
    renderSettings({ onDataDeleted: onDeleted });
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());

    // 1 段階目：全データ削除タップ → 確認ダイアログ
    fireEvent.press(screen.getByLabelText('全データ削除'));
    expect(screen.getByTestId('s-delete-dialog')).toBeTruthy();

    // 2 段階目：削除する
    fireEvent.press(screen.getByTestId('s-delete-dialog-confirm'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());

    const ls = await loadLevelState();
    expect(ls).toEqual({ currentLevel: 1, consecutiveFailures: 0, highestLevel: 0 });
    const badge = await loadBadgeStatus('B-01');
    expect(badge.earned).toBe(false);
  });

  it('確認ダイアログでキャンセルすると削除されない', async () => {
    await saveLevelState({ currentLevel: 50, consecutiveFailures: 0, highestLevel: 60 });
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('全データ削除'));
    fireEvent.press(screen.getByTestId('s-delete-dialog-cancel'));
    await waitFor(() =>
      expect(screen.queryByText('全データを削除しますか？')).toBeNull(),
    );
    const ls = await loadLevelState();
    expect(ls.currentLevel).toBe(50);
  });
});

describe('SettingsScreen 旧設定 UI 不在（F-13 受け入れ基準）', () => {
  it('採点方式・手動スライダー（n/m/r/a/b）の UI が存在しない', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    // 採点方式（旧 group）はない
    expect(screen.queryByText('採点方式')).toBeNull();
    expect(screen.queryByText('全問正解で次へ')).toBeNull();
    // 旧手動スライダーラベル
    expect(screen.queryByText('ラウンド数')).toBeNull();
    expect(screen.queryByText('1 ラウンドの秒数')).toBeNull();
    expect(screen.queryByText('周波数変化速度')).toBeNull();
    expect(screen.queryByText('格子サイズ（n×n）')).toBeNull();
  });

  it('バージョン情報に v3.2.x と免責同意状態が表示される', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByTestId('s-total')).toBeTruthy());
    expect(screen.getByText(/v3\.2\.0/)).toBeTruthy();
  });
});
