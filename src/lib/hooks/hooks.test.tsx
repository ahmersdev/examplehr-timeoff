import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { handlers as defaultHandlers } from '@/mocks/handlers/default';
import { server } from '@/mocks/server';
import {
  createTestQueryClient,
  createWrapper,
} from '@/tests/test-utils';

import { useBalances } from './use-balances';

describe('useBalances', () => {
  it('returns balances for emp-alice with synced status', async () => {
    server.use(...defaultHandlers);
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useBalances('emp-alice'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.balances).toHaveLength(3);
    expect(result.current.syncStatus).toBe('synced');
    expect(result.current.lastSyncedAt).not.toBeNull();
  });
});
