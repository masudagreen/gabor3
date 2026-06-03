/**
 * HistoryScreen.test.tsx — 履歴タブ本実装（S7、F-09 グラフ部 / screens.md S7-1）。
 *
 * 検証する観察可能挙動：
 *  - 永続化済み DailyStats から折れ線グラフ要約・StatTile（連続日数 / 累計）を表示
 *  - 同日 max（DailyStats.bestSessionScore）が要約に反映
 *  - データ 7 日未満で傾向案内、7 日以上で非表示
 *  - 完全初期（0 セッション）は連続 0 日 / 累計 0 回 + 案内
 *  - バッジ領域はプレースホルダ（S8）
 * 日付は now 注入で決定論化。
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { HistoryScreen } from '../../../src/screens/v2/HistoryScreen';
import { ensureV2Initialized } from '../../../src/state/migration';
import {
  saveDailyStats,
  saveStreak,
  savePlayStats,
} from '../../../src/state/repository';
import type { DailyStats } from '../../../src/state/schema';

const TODAY = new Date(2026, 4, 30); // 2026-05-30 ローカル

function renderHistory(now: () => Date = () => TODAY) {
  render(
    <ThemeProvider preference="light" systemScheme="light">
      <HistoryScreen now={now} testId="h" />
    </ThemeProvider>,
  );
}

async function seedDaily(rows: DailyStats[]) {
  for (const r of rows) await saveDailyStats(r);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await ensureV2Initialized();
});

describe('HistoryScreen — グラフ・StatTile（F-09）', () => {
  it('DailyStats から折れ線要約と連続日数 / 累計を表示する', async () => {
    await seedDaily([
      { date: '2026-05-28', bestSessionScore: 70, sessionCount: 1 },
      { date: '2026-05-30', bestSessionScore: 86, sessionCount: 3 },
    ]);
    await saveStreak({ currentStreak: 5, longestStreak: 9, lastPlayedDate: '2026-05-30' });
    await savePlayStats({ totalSessions: 37 });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByTestId('h-streak-value')).toHaveTextContent('5');
    });
    expect(screen.getByTestId('h-total-value')).toHaveTextContent('37');
    // グラフ要約（最新 5/30 は 86 点）
    expect(
      screen.getByLabelText('過去 2 日の日次スコア。最新 5/30 は 86 点'),
    ).toBeTruthy();
    // StatTile の aria-label
    expect(screen.getByLabelText('連続日数 5 日')).toBeTruthy();
    expect(screen.getByLabelText('累計プレイ回数 37 回')).toBeTruthy();
  });

  it('同日複数セッションの代表値（max）がグラフ要約に反映される', async () => {
    // DailyStats.bestSessionScore は §6.5 で max 済み。履歴はそれを表示するだけ。
    await seedDaily([{ date: '2026-05-30', bestSessionScore: 92, sessionCount: 4 }]);
    await savePlayStats({ totalSessions: 4 });
    renderHistory();
    await waitFor(() => {
      expect(
        screen.getByLabelText('過去 1 日の日次スコア。最新 5/30 は 92 点'),
      ).toBeTruthy();
    });
  });

  it('データ 7 日未満で傾向案内を表示する', async () => {
    await seedDaily([
      { date: '2026-05-29', bestSessionScore: 60, sessionCount: 1 },
      { date: '2026-05-30', bestSessionScore: 80, sessionCount: 1 },
    ]);
    renderHistory();
    await waitFor(() => {
      expect(screen.getByTestId('h-trend-hint')).toBeTruthy();
    });
    expect(screen.getByText('もう少しデータが集まると傾向が見えます')).toBeTruthy();
  });

  it('データ 7 日以上では傾向案内を表示しない', async () => {
    const rows: DailyStats[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-05-${String(24 + i).padStart(2, '0')}`,
      bestSessionScore: 50 + i,
      sessionCount: 1,
    }));
    await seedDaily(rows);
    renderHistory();
    await waitFor(() => {
      expect(screen.getByTestId('h-streak')).toBeTruthy();
    });
    expect(screen.queryByTestId('h-trend-hint')).toBeNull();
  });

  it('完全初期（0 セッション）は連続 0 日 / 累計 0 回 + 案内', async () => {
    renderHistory();
    await waitFor(() => {
      expect(screen.getByTestId('h-streak-value')).toHaveTextContent('0');
    });
    expect(screen.getByTestId('h-total-value')).toHaveTextContent('0');
    expect(screen.getByTestId('h-trend-hint')).toBeTruthy();
    // 空グラフの代替テキスト
    expect(screen.getByLabelText('まだ日次スコアのデータがありません')).toBeTruthy();
  });
});

describe('HistoryScreen — バッジ一覧（S8、F-09 バッジ部）', () => {
  it('バッジ見出しと全 11 バッジセルを表示する', async () => {
    renderHistory();
    await waitFor(() => {
      expect(screen.getByText('バッジ')).toBeTruthy();
    });
    // グリッド本体
    expect(screen.getByTestId('h-badges')).toBeTruthy();
    // 全 11 バッジセル（B-01〜B-11）
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      const id = `B-${String(n).padStart(2, '0')}`;
      expect(screen.getByTestId(`h-badges-cell-${id}`)).toBeTruthy();
    }
  });

  it('初期は全バッジが未獲得（🔒 + ヒント）として表示される', async () => {
    renderHistory();
    await waitFor(() => {
      expect(screen.getByTestId('h-badges-cell-B-01')).toBeTruthy();
    });
    // 全 11 セルが未獲得＝鍵アイコン（形で区別、NF-12）
    expect(
      screen.getAllByText('🔒', { includeHiddenElements: true }),
    ).toHaveLength(11);
    // B-01 未獲得ヒント
    expect(screen.getByText('初めてのセッションを完了すると獲得')).toBeTruthy();
  });
});

describe('HistoryScreen — タイトル', () => {
  it('履歴タイトルを header ロールで表示する', async () => {
    renderHistory();
    await waitFor(() => {
      expect(screen.getByTestId('h-title')).toHaveTextContent('履歴');
    });
  });
});
