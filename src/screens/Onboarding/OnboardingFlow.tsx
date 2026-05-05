/**
 * OnboardingFlow — オンボーディング 7 画面の状態機（screens.md S4-01 〜 S4-07）。
 *
 * 7 ステップ：
 *   1. Welcome
 *   2. Disclaimer
 *   3. AgeGroup
 *   4. Calibration
 *   5. MiniTutorial
 *   6. Experience（Game 1 体験 1 試行、20 秒）
 *   7. Done
 *
 * 各ステップで UserProfile を部分更新し、最終 Done で onboardingCompleted=true を保存。
 *
 * 完了タップ数試算（screens.md §2）：
 *   1 ようこそ→始める = 1
 *   2 免責→チェック→同意 = 2
 *   3 年齢層→カード = 1
 *   4 距離→次へ = 1
 *   5 ミニ説明→やってみる = 1
 *   6 体験 = ゲーム内タップ（カウント外）
 *   7 完了→ホームへ = 1
 *   合計 6 タップ（F-01：6 タップ以下を達成）
 */

import React from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { DisclaimerScreen } from './DisclaimerScreen';
import { AgeGroupScreen } from './AgeGroupScreen';
import { CalibrationScreen } from './CalibrationScreen';
import { MiniTutorialScreen } from './MiniTutorialScreen';
import { ExperienceScreen } from './ExperienceScreen';
import { OnboardingDoneScreen } from './OnboardingDoneScreen';
import {
  AgeGroup,
  UserProfile,
  loadUserProfile,
  updateUserProfile,
} from '../../state/storage';
import {
  ViewingDistanceCm,
  dpiForDevice,
} from '../../lib/calibration';

type Step =
  | 'welcome'
  | 'disclaimer'
  | 'ageGroup'
  | 'calibration'
  | 'miniTutorial'
  | 'experience'
  | 'done';

export type OnboardingFlowProps = {
  /** 完了時に呼ばれる（ホームへ遷移） */
  onCompleted: (profile: UserProfile) => void;
  /** テスト用：初期ステップ */
  initialStep?: Step;
  /** テスト用：体験画面の試行時間 */
  experienceDurationMsOverride?: number;
};

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onCompleted,
  initialStep = 'welcome',
  experienceDurationMsOverride,
}) => {
  const [step, setStep] = React.useState<Step>(initialStep);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);

  // 起動時に最新プロファイルを読み出す（途中再開時に既存値を引き継ぐ）
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await loadUserProfile();
      if (!cancelled) setProfile(p);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = React.useCallback(async (patch: Partial<UserProfile>) => {
    const next = await updateUserProfile(patch);
    setProfile(next);
    return next;
  }, []);

  if (!profile) {
    return null; // ロード中。極短時間なので空表示で OK
  }

  const dpi = dpiForDevice(profile.deviceTypeEstimated);

  switch (step) {
    case 'welcome':
      return <WelcomeScreen onNext={() => setStep('disclaimer')} />;

    case 'disclaimer':
      return (
        <DisclaimerScreen
          onAgreed={async (agreedAtIso) => {
            await persist({ disclaimerAgreedAt: agreedAtIso });
            setStep('ageGroup');
          }}
          onBack={() => setStep('welcome')}
        />
      );

    case 'ageGroup':
      return (
        <AgeGroupScreen
          onSelect={async (group: AgeGroup) => {
            await persist({ ageGroup: group });
            setStep('calibration');
          }}
          onBack={() => setStep('disclaimer')}
        />
      );

    case 'calibration':
      return (
        <CalibrationScreen
          initialValue={profile.viewingDistanceCm}
          previewDpi={dpi}
          onNext={async (value: ViewingDistanceCm) => {
            await persist({ viewingDistanceCm: value });
            setStep('miniTutorial');
          }}
          onBack={() => setStep('ageGroup')}
        />
      );

    case 'miniTutorial':
      return (
        <MiniTutorialScreen
          onTry={() => setStep('experience')}
          onBack={() => setStep('calibration')}
        />
      );

    case 'experience':
      return (
        <ExperienceScreen
          distanceCm={profile.viewingDistanceCm}
          dpi={dpi}
          onDone={() => setStep('done')}
          onBack={() => setStep('miniTutorial')}
          durationMsOverride={experienceDurationMsOverride}
        />
      );

    case 'done':
      return (
        <OnboardingDoneScreen
          onHome={async () => {
            const next = await persist({ onboardingCompleted: true });
            onCompleted(next);
          }}
        />
      );

    default:
      return null;
  }
};
