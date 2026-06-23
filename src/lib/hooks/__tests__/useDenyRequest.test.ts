import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { resetHcmState } from '@/app/api/hcm/_lib/state';
import { handlers as defaultHandlers } from '@/mocks/handlers/default';
import { server } from '@/mocks/server';
import {
  createTestQueryClient,
  createWrapper,
  seedPendingRequest,
} from '@/tests/test-utils';

import { useDenyRequest } from '../use-deny-request';

describe('useDenyRequest', () => {
  it('denies a pending request and restores balance', async () => {
    server.use(...defaultHandlers);
    resetHcmState();

    const request = seedPendingRequest({
      employeeId: 'emp-bob',
      locationId: 'loc-london',
      leaveType: 'annual',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      days: 3,
    });

    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useDenyRequest(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.denyAsync({
      requestId: request.id,
      employeeId: 'emp-bob',
      locationId: 'loc-london',
      leaveType: 'annual',
      days: 3,
      rejectionReason: 'Team coverage needed',
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.error).toBeNull();
  });
});
