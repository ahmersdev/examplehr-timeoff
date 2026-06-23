import { beforeEach, describe, expect, it } from 'vitest';

import type { Employee, TimeOffRequest } from '@/types';

import { useAppStore } from './useAppStore';

const alice: Employee = {
  id: 'emp-alice',
  name: 'Alice Chen',
  email: 'alice@example.com',
  locationId: 'loc-nyc',
  role: 'manager',
  anniversaryDate: '2020-03-15',
};

const pendingRequest: TimeOffRequest = {
  id: 'req_test',
  employeeId: 'emp-alice',
  locationId: 'loc-nyc',
  leaveType: 'annual',
  startDate: '2026-07-01',
  endDate: '2026-07-02',
  days: 2,
  status: 'pending',
  submittedAt: '2026-06-01T00:00:00.000Z',
};

function resetAppStore() {
  useAppStore.setState({
    currentUser: null,
    notifications: [],
    pendingRequests: [],
    requestBalanceSnapshots: {},
    reconciledAt: null,
  });
}

describe('useAppStore', () => {
  beforeEach(() => {
    resetAppStore();
  });

  it('setCurrentUser updates currentUser', () => {
    useAppStore.getState().setCurrentUser(alice);
    expect(useAppStore.getState().currentUser).toEqual(alice);
  });

  it('addNotification and dismissNotification soft-dismiss', () => {
    useAppStore.getState().addNotification({
      type: 'info',
      message: 'Balance updated',
    });

    const notification = useAppStore.getState().notifications[0];
    expect(notification.type).toBe('info');
    expect(notification.dismissedAt).toBeUndefined();

    useAppStore.getState().dismissNotification(notification.id);

    const dismissed = useAppStore.getState().notifications[0];
    expect(dismissed.dismissedAt).toBeDefined();
    expect(useAppStore.getState().notifications).toHaveLength(1);
  });

  it('addPendingRequest and resolvePendingRequest', () => {
    useAppStore.getState().addPendingRequest(pendingRequest);
    expect(useAppStore.getState().pendingRequests).toHaveLength(1);

    useAppStore.getState().resolvePendingRequest('req_test', 'approved');
    expect(useAppStore.getState().pendingRequests).toHaveLength(0);
  });

  it('setReconciledAt updates timestamp', () => {
    const timestamp = '2026-06-23T12:00:00.000Z';
    useAppStore.getState().setReconciledAt(timestamp);
    expect(useAppStore.getState().reconciledAt).toBe(timestamp);
  });
});
