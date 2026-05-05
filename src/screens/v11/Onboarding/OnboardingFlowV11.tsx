/**
 * OnboardingFlowV11 — F-01 オンボーディング状態機（onboarding.md §1）。
 *
 * 6〜7 画面の状態遷移：
 *   OB-01 ようこそ
 *   → OB-02 免責同意
 *   → OB-03 年齢層申告
 *     ├ 70s+ 選択時 → OB-03b 追加警告 → OB-04
 *     └ それ以外 → OB-04
 *   → OB-04 視聴距離設定
 *   → OB-05 ゲーム説明
 *   → OB-06 1 試行体験（Sprint 8 はプレースホルダ）
 *   → ホーム
 *
 * 各ステップで UserProfileV11 を部分更新する。最終 OB-06 完了で
 * onboardingCompleted=true を保存し、onCompleted コールバックを呼ぶ。
 */

import React from 'react';
import { OB01Welcome } from './OB01Welcome';
import { OB02Disclaimer } from './OB02Disclaimer';
import { OB03AgeGroup } from './OB03AgeGroup';
import { OB03bElderWarning } from './OB03bElderWarning';
import { OB04Distance } from './OB04Distance';
import { OB05HowTo } from './OB05HowTo';
import { OB06Experience } from './OB06Experience';
import {
  AgeGroupV11,
  UserProfileV11,
  loadUserProfileV11,
  updateUserProfileV11,
} from '../../../state/storage-v11';
import { ViewingDistanceCm } from '../../../lib/calibration';

type Step =
  | 'welcome'
  | 'disclaimer'
  | 'ageGroup'
  | 'elderWarning'
  | 'distance'
  | 'howto'
  | 'experience';

export type OnboardingFlowV11Props = {
  onCompleted: (profile: UserProfileV11) => void;
  /** テスト用：初期ステップ */
  initialStep?: Step;
};

export const OnboardingFlowV11: React.FC<OnboardingFlowV11Props> = ({
  onCompleted,
  initialStep = 'welcome',
}) => {
  const [step, setStep] = React.useState<Step>(initialStep);
  const [profile, setProfile] = React.useState<UserProfileV11 | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await loadUserProfileV11();
      if (!cancelled) setProfile(p);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = React.useCallback(
    async (patch: Partial<UserProfileV11>) => {
      const next = await updateUserProfileV11(patch);
      setProfile(next);
      return next;
    },
    [],
  );

  if (!profile) {
    // 初回ロード中（極短時間）。空表示で OK。
    return null;
  }

  switch (step) {
    case 'welcome':
      return <OB01Welcome onNext={() => setStep('disclaimer')} />;

    case 'disclaimer':
      return (
        <OB02Disclaimer
          onAgreed={async (iso) => {
            await persist({ disclaimerAgreedAt: iso });
            setStep('ageGroup');
          }}
        />
      );

    case 'ageGroup':
      return (
        <OB03AgeGroup
          onNext={async (group: AgeGroupV11) => {
            await persist({ ageGroup: group });
            if (group === '70s+') {
              setStep('elderWarning');
            } else {
              setStep('distance');
            }
          }}
        />
      );

    case 'elderWarning':
      return (
        <OB03bElderWarning
          onAcknowledge={() => setStep('distance')}
        />
      );

    case 'distance':
      return (
        <OB04Distance
          initialValue={profile.viewingDistanceCm}
          deviceTypeEstimated={profile.deviceTypeEstimated}
          onNext={async (value: ViewingDistanceCm) => {
            await persist({ viewingDistanceCm: value });
            setStep('howto');
          }}
        />
      );

    case 'howto':
      return <OB05HowTo onNext={() => setStep('experience')} />;

    case 'experience':
      return (
        <OB06Experience
          onComplete={async () => {
            const next = await persist({ onboardingCompleted: true });
            onCompleted(next);
          }}
        />
      );

    default:
      return null;
  }
};
