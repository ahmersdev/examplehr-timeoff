import type { AppNotification } from '@/store/useAppStore';
import type { LeaveBalance, TimeOffRequest } from '@/types';

const now = new Date().toISOString();

export function staleTimestamp(minutesAgo = 30): string {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

export const bobAnnualBalance: LeaveBalance = {
  employeeId: 'emp-bob',
  locationId: 'loc-london',
  leaveType: 'annual',
  available: 10,
  used: 2,
  total: 12,
  lastSyncedAt: now,
};

export const bobSickBalance: LeaveBalance = {
  employeeId: 'emp-bob',
  locationId: 'loc-london',
  leaveType: 'sick',
  available: 4,
  used: 1,
  total: 5,
  lastSyncedAt: now,
};

export const aliceAnnualBalance: LeaveBalance = {
  employeeId: 'emp-alice',
  locationId: 'loc-nyc',
  leaveType: 'annual',
  available: 12,
  used: 3,
  total: 15,
  lastSyncedAt: now,
};

export const aliceSickBalance: LeaveBalance = {
  employeeId: 'emp-alice',
  locationId: 'loc-nyc',
  leaveType: 'sick',
  available: 5,
  used: 0,
  total: 5,
  lastSyncedAt: now,
};

export const alicePersonalBalance: LeaveBalance = {
  employeeId: 'emp-alice',
  locationId: 'loc-nyc',
  leaveType: 'personal',
  available: 3,
  used: 0,
  total: 3,
  lastSyncedAt: now,
};

export const aliceBalances: LeaveBalance[] = [
  aliceAnnualBalance,
  aliceSickBalance,
  alicePersonalBalance,
];

export const bobBalances: LeaveBalance[] = [bobAnnualBalance, bobSickBalance];

export const allBalances: LeaveBalance[] = [...aliceBalances, ...bobBalances];

export const pendingBobRequest: TimeOffRequest = {
  id: 'req-bob-pending-1',
  employeeId: 'emp-bob',
  locationId: 'loc-london',
  leaveType: 'annual',
  startDate: '2026-08-01',
  endDate: '2026-08-03',
  days: 3,
  status: 'pending',
  submittedAt: now,
};

export const pendingAliceRequest: TimeOffRequest = {
  id: 'req-alice-pending-1',
  employeeId: 'emp-alice',
  locationId: 'loc-nyc',
  leaveType: 'sick',
  startDate: '2026-07-10',
  endDate: '2026-07-11',
  days: 2,
  status: 'pending',
  submittedAt: now,
};

export const multiplePendingRequests: TimeOffRequest[] = [
  pendingBobRequest,
  {
    ...pendingAliceRequest,
    id: 'req-alice-pending-2',
    leaveType: 'personal',
    startDate: '2026-09-01',
    endDate: '2026-09-01',
    days: 1,
  },
];

export const balanceRefreshedNotification: AppNotification = {
  id: 'notif-balance-refreshed',
  type: 'info',
  message: 'Your leave balance was updated',
};

export const requestRolledBackNotification: AppNotification = {
  id: 'notif-rolled-back',
  type: 'error',
  message:
    'Balance verification failed after submission. Your balance has been restored.',
};

export const balanceChangedNotification: AppNotification = {
  id: 'notif-balance-changed',
  type: 'warning',
  message:
    'Balance changed externally while request was pending (e.g. anniversary bonus applied)',
};

export const stackedNotifications: AppNotification[] = [
  balanceRefreshedNotification,
  balanceChangedNotification,
  requestRolledBackNotification,
];
