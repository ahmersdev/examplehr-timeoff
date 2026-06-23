import type { QueryClient } from '@tanstack/react-query';

import type { LeaveBalance } from '@/types';

import { hcmKeys } from './query-keys';

function balanceCellKey(balance: LeaveBalance): string {
  return `${balance.locationId}:${balance.leaveType}`;
}

export function balancesMatch(a: LeaveBalance, b: LeaveBalance): boolean {
  return (
    a.available === b.available &&
    a.used === b.used &&
    a.total === b.total
  );
}

export function detectDrift(
  cached: LeaveBalance[] | undefined,
  fresh: LeaveBalance[],
): boolean {
  if (!cached) return fresh.length > 0;

  const freshMap = new Map(fresh.map((b) => [balanceCellKey(b), b]));

  for (const cachedBalance of cached) {
    const freshBalance = freshMap.get(balanceCellKey(cachedBalance));
    if (!freshBalance || !balancesMatch(cachedBalance, freshBalance)) {
      return true;
    }
  }

  return false;
}

export function patchBalanceInCache(
  queryClient: QueryClient,
  employeeId: string,
  locationId: string,
  leaveType: string,
  patch: Partial<LeaveBalance>,
): void {
  const cellKey = hcmKeys.balance(employeeId, locationId, leaveType);
  const current = queryClient.getQueryData<LeaveBalance>(cellKey);
  if (current) {
    queryClient.setQueryData(cellKey, { ...current, ...patch });
  }

  const listKey = hcmKeys.balances(employeeId);
  const balances = queryClient.getQueryData<LeaveBalance[]>(listKey);
  if (balances) {
    queryClient.setQueryData(
      listKey,
      balances.map((b) =>
        b.locationId === locationId && b.leaveType === leaveType
          ? { ...b, ...patch }
          : b,
      ),
    );
  }
}

export function deductBalanceInCache(
  queryClient: QueryClient,
  employeeId: string,
  locationId: string,
  leaveType: string,
  days: number,
): void {
  const cellKey = hcmKeys.balance(employeeId, locationId, leaveType);
  const current =
    queryClient.getQueryData<LeaveBalance>(cellKey) ??
    queryClient
      .getQueryData<LeaveBalance[]>(hcmKeys.balances(employeeId))
      ?.find((b) => b.locationId === locationId && b.leaveType === leaveType);

  if (!current) return;

  patchBalanceInCache(queryClient, employeeId, locationId, leaveType, {
    available: current.available - days,
    used: current.used + days,
    lastSyncedAt: new Date().toISOString(),
  });
}

export function restoreBalanceInCache(
  queryClient: QueryClient,
  employeeId: string,
  locationId: string,
  leaveType: string,
  days: number,
): void {
  const cellKey = hcmKeys.balance(employeeId, locationId, leaveType);
  const current =
    queryClient.getQueryData<LeaveBalance>(cellKey) ??
    queryClient
      .getQueryData<LeaveBalance[]>(hcmKeys.balances(employeeId))
      ?.find((b) => b.locationId === locationId && b.leaveType === leaveType);

  if (!current) return;

  patchBalanceInCache(queryClient, employeeId, locationId, leaveType, {
    available: current.available + days,
    used: current.used - days,
    lastSyncedAt: new Date().toISOString(),
  });
}

export function setBalancesInCache(
  queryClient: QueryClient,
  employeeId: string,
  balances: LeaveBalance[],
): void {
  queryClient.setQueryData(hcmKeys.balances(employeeId), balances);

  for (const balance of balances) {
    queryClient.setQueryData(
      hcmKeys.balance(employeeId, balance.locationId, balance.leaveType),
      balance,
    );
  }
}

export interface BalanceCacheSnapshot {
  balances: LeaveBalance[] | undefined;
  cell: LeaveBalance | undefined;
}

export function snapshotBalanceCache(
  queryClient: QueryClient,
  employeeId: string,
  locationId: string,
  leaveType: string,
): BalanceCacheSnapshot {
  return {
    balances: queryClient.getQueryData<LeaveBalance[]>(hcmKeys.balances(employeeId)),
    cell: queryClient.getQueryData<LeaveBalance>(
      hcmKeys.balance(employeeId, locationId, leaveType),
    ),
  };
}

export function restoreBalanceCacheSnapshot(
  queryClient: QueryClient,
  employeeId: string,
  locationId: string,
  leaveType: string,
  snapshot: BalanceCacheSnapshot,
): void {
  if (snapshot.balances !== undefined) {
    queryClient.setQueryData(hcmKeys.balances(employeeId), snapshot.balances);
  }
  if (snapshot.cell !== undefined) {
    queryClient.setQueryData(
      hcmKeys.balance(employeeId, locationId, leaveType),
      snapshot.cell,
    );
  }
}
