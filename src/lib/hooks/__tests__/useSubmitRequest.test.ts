import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { handlers as defaultHandlers } from '@/mocks/handlers/default';
import { handlers as errorsHandlers } from '@/mocks/handlers/errors';
import { handlers as silentFailureHandlers } from '@/mocks/handlers/silent-failure';
import { server } from '@/mocks/server';
import { VerificationError } from '@/lib/api/hcm';
import { useAppStore } from '@/store/useAppStore';
import {
  createTestQueryClient,
  createWrapper,
} from '@/tests/test-utils';

import { hcmKeys } from '../query-keys';
import { useBalances } from '../use-balances';
import { useSubmitRequest } from '../use-submit-request';

const submitInput = {
  employeeId: 'emp-alice',
  locationId: 'loc-nyc',
  leaveType: 'annual',
  startDate: '2026-07-01',
  endDate: '2026-07-01',
  days: 1,
} as const;

describe('useSubmitRequest', () => {
  it('optimistically deducts balance on submit', async () => {
    server.use(...defaultHandlers);
    const queryClient = createTestQueryClient();

    const { result: balancesResult } = renderHook(() => useBalances('emp-alice'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(balancesResult.current.isLoading).toBe(false));

    const annualBefore = balancesResult.current.balances.find(
      (b) => b.leaveType === 'annual',
    );
    expect(annualBefore).toBeDefined();

    const { result: submitResult } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient),
    });

    const submitPromise = submitResult.current.submitAsync(submitInput);

    await waitFor(() => {
      const cached = queryClient.getQueryData(hcmKeys.balances('emp-alice')) as
        | typeof balancesResult.current.balances
        | undefined;
      const optimistic = cached?.find((b) => b.leaveType === 'annual');
      expect(optimistic?.available).toBe((annualBefore?.available ?? 0) - 1);
    });

    await submitPromise;

    expect(submitResult.current.isRolledBack).toBe(false);
  });

  it('rolls back if HCM returns error', async () => {
    server.use(...errorsHandlers);
    const queryClient = createTestQueryClient();

    const { result: balancesResult } = renderHook(() => useBalances('emp-alice'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(balancesResult.current.isLoading).toBe(false));

    const annualBefore = balancesResult.current.balances.find(
      (b) => b.leaveType === 'annual',
    );

    const { result: submitResult } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(submitResult.current.submitAsync(submitInput)).rejects.toThrow();

    await waitFor(() => expect(submitResult.current.isRolledBack).toBe(true));

    const cached = queryClient.getQueryData(hcmKeys.balances('emp-alice')) as
      | typeof balancesResult.current.balances
      | undefined;
    const annualAfter = cached?.find((b) => b.leaveType === 'annual');
    expect(annualAfter?.available).toBe(annualBefore?.available);
  });

  it('rolls back if HCM returns 200 but balance verification fails', async () => {
    server.use(...silentFailureHandlers);
    const queryClient = createTestQueryClient();

    const { result: balancesResult } = renderHook(() => useBalances('emp-alice'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(balancesResult.current.isLoading).toBe(false));

    const annualBefore = balancesResult.current.balances.find(
      (b) => b.leaveType === 'annual',
    );

    const { result: submitResult } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(submitResult.current.submitAsync(submitInput)).rejects.toThrow(
      VerificationError,
    );

    await waitFor(() => expect(submitResult.current.isRolledBack).toBe(true));

    const cached = queryClient.getQueryData(hcmKeys.balances('emp-alice')) as
      | typeof balancesResult.current.balances
      | undefined;
    const annualAfter = cached?.find((b) => b.leaveType === 'annual');
    expect(annualAfter?.available).toBe(annualBefore?.available);
  });

  it('emits notification to Zustand store on rollback', async () => {
    server.use(...silentFailureHandlers);
    const queryClient = createTestQueryClient();

    const { result: balancesResult } = renderHook(() => useBalances('emp-alice'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(balancesResult.current.isLoading).toBe(false));

    const { result: submitResult } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(submitResult.current.submitAsync(submitInput)).rejects.toThrow();

    await waitFor(() => {
      const notifications = useAppStore.getState().notifications;
      expect(
        notifications.some(
          (n) =>
            n.type === 'error' &&
            n.message.includes('Balance verification failed after submission'),
        ),
      ).toBe(true);
    });
  });

  it('emits notification when HCM returns an error', async () => {
    server.use(...errorsHandlers);
    const queryClient = createTestQueryClient();

    const { result: balancesResult } = renderHook(() => useBalances('emp-alice'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(balancesResult.current.isLoading).toBe(false));

    const { result: submitResult } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(submitResult.current.submitAsync(submitInput)).rejects.toThrow();

    await waitFor(() => {
      const notifications = useAppStore.getState().notifications;
      expect(notifications.some((n) => n.type === 'error')).toBe(true);
    });
  });
});
