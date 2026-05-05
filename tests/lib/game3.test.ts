/**
 * Game 3（周辺視野ハント）の純関数ロジックテスト。
 *
 * 受け入れ基準（spec.md §7.3 / screens.md S3-01）：
 *   - パッチが 8 個、円周等間隔
 *   - odd one がランダムな位置に出る（位置のばらつき）
 *   - odd one の向きは base ± paramValue
 *   - 提示時間が staircase に応じ 300〜800ms
 *   - 採点：odd の時計位置と一致で正解
 *   - 未回答判定（noResponse）
 */

import {
  CLOCK_POSITIONS,
  GAME3,
  Game3TrialSpec,
  angleRadForIndex,
  buildGame3Trial,
  clockPositionForIndex,
  eccentricityForParam,
  gradeGame3,
  indexForClockPosition,
  isNoResponse,
  presentationDurationFor,
} from '../../src/lib/game3';

describe('Game 3 logic', () => {
  it('buildGame3Trial：8 個のパッチ、odd one 1 個、残り 7 個は base 向き', () => {
    let rng = makeSeededRng(1);
    const spec = buildGame3Trial(20, rng);
    expect(spec.orientations).toHaveLength(8);

    const oddCount = spec.orientations.filter(
      (o) => o === spec.oddOrientationDeg,
    ).length;
    const baseCount = spec.orientations.filter(
      (o) => o === spec.baseOrientationDeg,
    ).length;

    // base != odd の場合に oddCount=1 / baseCount=7
    if (spec.baseOrientationDeg !== spec.oddOrientationDeg) {
      expect(oddCount).toBe(1);
      expect(baseCount).toBe(7);
    }
    // odd position index は 0..7
    expect(spec.oddPositionIndex).toBeGreaterThanOrEqual(0);
    expect(spec.oddPositionIndex).toBeLessThanOrEqual(7);
    expect(spec.oddClockPosition).toBe(CLOCK_POSITIONS[spec.oddPositionIndex]);
  });

  it('odd one 位置のばらつき：100 試行で 8 位置すべてに少なくとも 1 度出現する', () => {
    const positions = new Set<number>();
    let rngState = 1;
    const rng = () => {
      rngState = (rngState * 9301 + 49297) % 233280;
      return rngState / 233280;
    };
    for (let i = 0; i < 200; i += 1) {
      const spec = buildGame3Trial(20, rng);
      positions.add(spec.oddPositionIndex);
    }
    expect(positions.size).toBe(8);
  });

  it('提示時間が staircase 連動で 300/500/800ms', () => {
    expect(presentationDurationFor(45)).toBe(800);
    expect(presentationDurationFor(30)).toBe(800);
    expect(presentationDurationFor(25)).toBe(800);
    expect(presentationDurationFor(20)).toBe(500);
    expect(presentationDurationFor(15)).toBe(500);
    expect(presentationDurationFor(10)).toBe(300);
    expect(presentationDurationFor(5)).toBe(300);
  });

  it('離心角が staircase 連動：易 6° / 中 8° / 難 10°（角度差が小さいほど離心角を大きく）', () => {
    expect(eccentricityForParam(45)).toBe(6); // 易
    expect(eccentricityForParam(25)).toBe(6);
    expect(eccentricityForParam(20)).toBe(8); // 中
    expect(eccentricityForParam(15)).toBe(8);
    expect(eccentricityForParam(10)).toBe(10); // 難
    expect(eccentricityForParam(5)).toBe(10);
  });

  it('採点：odd の時計位置と一致したら正解', () => {
    const rng = makeSeededRng(3);
    const spec = buildGame3Trial(20, rng);
    expect(gradeGame3(spec, spec.oddClockPosition)).toBe(true);
    // 別位置を選んだら不正解
    const wrongIdx = (spec.oddPositionIndex + 3) % 8;
    expect(gradeGame3(spec, CLOCK_POSITIONS[wrongIdx])).toBe(false);
  });

  it('未回答判定：answer=null かつ timedOut=true で noResponse', () => {
    expect(isNoResponse(null, true)).toBe(true);
    expect(isNoResponse(null, false)).toBe(false);
    expect(isNoResponse('12', true)).toBe(false);
    expect(isNoResponse('3', false)).toBe(false);
  });

  it('clock position と index の相互変換', () => {
    for (let i = 0; i < 8; i += 1) {
      const pos = CLOCK_POSITIONS[i];
      expect(clockPositionForIndex(i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7)).toBe(pos);
      expect(indexForClockPosition(pos)).toBe(i);
    }
  });

  it('angleRadForIndex：0=12時(-π/2)、2=3時(0)、4=6時(π/2)、6=9時(π)', () => {
    expect(angleRadForIndex(0)).toBeCloseTo(-Math.PI / 2);
    expect(angleRadForIndex(2)).toBeCloseTo(0);
    expect(angleRadForIndex(4)).toBeCloseTo(Math.PI / 2);
    expect(angleRadForIndex(6)).toBeCloseTo(Math.PI);
  });

  it('GAME3 定数が spec.md §7.3 と一致', () => {
    expect(GAME3.totalDurationMs).toBe(60_000);
    expect(GAME3.maxTrials).toBe(40);
    expect(GAME3.answerTimeoutMs).toBe(2000);
    expect(GAME3.maskDurationMs).toBe(200);
    expect(GAME3.feedbackDurationMs).toBe(800);
  });

  it('odd one の向きが base ± paramValue（mod 180）', () => {
    const rng = makeSeededRng(5);
    const spec: Game3TrialSpec = buildGame3Trial(20, rng);
    const diff = ((spec.oddOrientationDeg - spec.baseOrientationDeg) + 180) % 180;
    // diff は paramValue または 180 - paramValue（向きは mod 180）
    const isMatch = Math.abs(diff - 20) < 0.001 || Math.abs(diff - 160) < 0.001;
    expect(isMatch).toBe(true);
  });
});

// テスト用の決定論的乱数（線形合同法）
function makeSeededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}
