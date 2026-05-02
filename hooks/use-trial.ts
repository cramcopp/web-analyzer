'use client';

import { useMemo } from 'react';
import { useAuth } from '../components/auth-provider';
import { normalizePlan } from '../lib/plans';

export function useTrial() {
  const { userData } = useAuth();

  return useMemo(() => {
    const trialUntil = userData?.trialUntil;
    const plan = userData?.plan;
    
    const isInTrial = trialUntil && new Date(trialUntil) > new Date();
    const trialDaysLeft = trialUntil 
      ? Math.max(0, Math.ceil((new Date(trialUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const isFreeAccount = !plan || plan === 'free';
    const showTrialBadge = isInTrial && isFreeAccount;
    const effectivePlan = showTrialBadge ? 'pro' : normalizePlan(plan);

    return {
      isInTrial,
      trialDaysLeft,
      isFreeAccount,
      showTrialBadge,
      effectivePlan,
      trialUntil
    };
  }, [userData?.trialUntil, userData?.plan]);
}
