import '@/tests/mocks/next-navigation';

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { resetHcmState } from '@/app/api/hcm/_lib/state';
import Manager from '@/features/manager';
import { handlers as conflictApproveHandlers } from '@/mocks/handlers/conflict-approve';
import { handlers as defaultHandlers } from '@/mocks/handlers/default';
import { server } from '@/mocks/server';
import { DEMO_MANAGER } from '@/lib/demo-users';
import { useAppStore } from '@/store/useAppStore';
import {
  renderWithProviders,
  seedBalanceSnapshot,
  seedPendingRequest,
} from '@/tests/test-utils';

describe('manager approve flow', () => {
  afterEach(() => cleanup());

  it('manager sees request → fetches live balance → approves → confirmed', async () => {
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

    renderWithProviders(<Manager />, {
      currentUser: DEMO_MANAGER,
      resetStore: false,
    });

    await waitFor(() => {
      expect(screen.getByText(/Annual Leave/i)).toBeInTheDocument();
      expect(screen.getByText(/Available: \d+ days/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(screen.queryByText(/Annual Leave/i)).not.toBeInTheDocument();
    });

    expect(request.id).toBeDefined();
  });

  it('manager approves → conflict detected → rollback → warning shown', async () => {
    server.use(...conflictApproveHandlers);
    resetHcmState();

    const request = seedPendingRequest({
      employeeId: 'emp-bob',
      locationId: 'loc-london',
      leaveType: 'annual',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      days: 3,
    });

    renderWithProviders(<Manager />, {
      currentUser: DEMO_MANAGER,
      resetStore: false,
    });

    seedBalanceSnapshot(request.id, 5);

    await waitFor(() => {
      expect(
        screen.getByText(/Balance changed since one or more requests were submitted/i),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(screen.getAllByText(/Balance changed externally while request was pending/i).length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    });

    const notifications = useAppStore.getState().notifications;
    expect(
      notifications.some((n) => n.type === 'warning' && !n.dismissedAt),
    ).toBe(true);
  });
});
