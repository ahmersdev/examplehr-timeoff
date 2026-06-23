import type { Decorator } from '@storybook/nextjs-vite';
import { useEffect } from 'react';

import { DEMO_EMPLOYEE, DEMO_MANAGER } from '@/lib/demo-users';
import { setBalancesInCache } from '@/lib/hooks/balance-cache';
import { getQueryClient } from '@/lib/queryClient';
import { useAppStore } from '@/store/useAppStore';

import { bobBalances } from './fixtures';
import { resetStoryEnvironment, seedBalanceSnapshot, seedPendingRequest } from './helpers';

export const withStoryReset: Decorator = (Story) => {
  resetStoryEnvironment();
  return <Story />;
};

export const withDemoEmployee: Decorator = (Story) => {
  useAppStore.getState().setCurrentUser(DEMO_EMPLOYEE);
  return <Story />;
};

export const withDemoManager: Decorator = (Story) => {
  useAppStore.getState().setCurrentUser(DEMO_MANAGER);
  return <Story />;
};

export const withSeededBobBalances: Decorator = (Story) => {
  setBalancesInCache(getQueryClient(), DEMO_EMPLOYEE.id, bobBalances);
  return <Story />;
};

export function withSeededManagerQueue(
  options?: { snapshotAvailable?: number },
): Decorator {
  function SeededManagerQueueDecorator(Story: Parameters<Decorator>[0]) {
    const request = seedPendingRequest({
      employeeId: 'emp-bob',
      locationId: 'loc-london',
      leaveType: 'annual',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      days: 3,
    });

    if (options?.snapshotAvailable != null) {
      seedBalanceSnapshot(request.id, options.snapshotAvailable);
    }

    return <Story />;
  }

  return SeededManagerQueueDecorator;
}

export function withSeededManagerQueueEffect(
  options?: { snapshotAvailable?: number },
): Decorator {
  function SeededManagerQueueEffectDecorator(Story: Parameters<Decorator>[0]) {
    useEffect(() => {
      const request = seedPendingRequest({
        employeeId: 'emp-bob',
        locationId: 'loc-london',
        leaveType: 'annual',
        startDate: '2026-08-01',
        endDate: '2026-08-03',
        days: 3,
      });

      if (options?.snapshotAvailable != null) {
        seedBalanceSnapshot(request.id, options.snapshotAvailable);
      }
    }, []);

    return <Story />;
  }

  return SeededManagerQueueEffectDecorator;
}
