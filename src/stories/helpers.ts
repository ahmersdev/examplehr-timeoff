import {
  createRequest,
  deductBalance,
  resetHcmState,
} from '@/app/api/hcm/_lib/state';
import { fetchBalance, fetchBalances } from '@/lib/api/hcm';
import { detectDrift, setBalancesInCache } from '@/lib/hooks/balance-cache';
import { hcmKeys } from '@/lib/hooks/query-keys';
import { getQueryClient } from '@/lib/queryClient';
import { resetAppStore } from '@/store/reset-app-store';
import { useAppStore } from '@/store/useAppStore';
import type { TimeOffRequest } from '@/types';
import { http, HttpResponse } from 'msw';

import { handlers as defaultHandlers } from '@/mocks/handlers/default';

export function resetStoryEnvironment(): void {
  resetHcmState();
  resetAppStore();
  getQueryClient().clear();
}

export interface SeedPendingRequestInput {
  employeeId: string;
  locationId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
}

export function seedPendingRequest(input: SeedPendingRequestInput): TimeOffRequest {
  const request = createRequest({
    employeeId: input.employeeId,
    locationId: input.locationId,
    leaveType: input.leaveType,
    startDate: input.startDate,
    endDate: input.endDate,
    days: input.days,
  });
  deductBalance(input.employeeId, input.locationId, input.leaveType, input.days);
  return request;
}

export function seedBalanceSnapshot(requestId: string, availableAfterSubmit: number): void {
  useAppStore.getState().setRequestBalanceSnapshot(requestId, availableAfterSubmit);
}

export async function triggerAnniversaryDrift(
  employeeId: string,
  locationId: string,
  leaveType: string,
): Promise<void> {
  await fetchBalance(employeeId, locationId, leaveType);
  await fetchBalance(employeeId, locationId, leaveType);
  await triggerReconciliation(employeeId);
}

export async function triggerReconciliation(employeeId: string): Promise<void> {
  const queryClient = getQueryClient();
  const fresh = (await fetchBalances()).filter((b) => b.employeeId === employeeId);
  const cached = queryClient.getQueryData<typeof fresh>(hcmKeys.balances(employeeId));

  if (detectDrift(cached, fresh)) {
    setBalancesInCache(queryClient, employeeId, fresh);
    useAppStore.getState().addNotification({
      type: 'info',
      message: 'Your leave balance was updated',
    });
  }

  useAppStore.getState().setReconciledAt(new Date().toISOString());
  await queryClient.invalidateQueries({ queryKey: hcmKeys.balances(employeeId) });
}

export const approveErrorHandlers = [
  ...defaultHandlers.slice(0, 4),
  http.post('/api/hcm/request/:id/approve', () =>
    HttpResponse.json(
      { code: 'SERVICE_UNAVAILABLE', message: 'HCM approval unavailable' },
      { status: 503 },
    ),
  ),
  ...defaultHandlers.slice(5),
];
