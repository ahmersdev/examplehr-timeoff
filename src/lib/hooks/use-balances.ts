'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchBalances } from '@/lib/api/hcm';
import type { LeaveBalance, SyncStatus } from '@/types';

import { hcmKeys } from './query-keys';

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

function deriveSyncStatus(
  isError: boolean,
  isFetching: boolean,
  isLoading: boolean,
  balances: LeaveBalance[] | undefined,
  isStale: boolean,
): SyncStatus {
  if (isError) return 'error';
  if (isFetching && !isLoading) return 'syncing';

  const hasOldSync =
    balances?.some((b) => Date.now() - new Date(b.lastSyncedAt).getTime() > STALE_THRESHOLD_MS) ??
    false;

  if (isStale || hasOldSync) return 'stale';
  return 'synced';
}

function deriveLastSyncedAt(balances: LeaveBalance[] | undefined): string | null {
  if (!balances?.length) return null;
  return balances.reduce((latest, b) =>
    b.lastSyncedAt > latest ? b.lastSyncedAt : latest,
  balances[0].lastSyncedAt);
}

export function useBalances(employeeId: string) {
  const query = useQuery({
    queryKey: hcmKeys.balances(employeeId),
    queryFn: async () => {
      const all = await fetchBalances();
      return all.filter((b) => b.employeeId === employeeId);
    },
    enabled: !!employeeId,
    refetchInterval: 30_000,
  });

  const syncStatus = useMemo(
    () =>
      deriveSyncStatus(
        query.isError,
        query.isFetching,
        query.isLoading,
        query.data,
        query.isStale,
      ),
    [query.isError, query.isFetching, query.isLoading, query.data, query.isStale],
  );

  const lastSyncedAt = useMemo(
    () => deriveLastSyncedAt(query.data),
    [query.data],
  );

  return {
    balances: query.data ?? [],
    syncStatus,
    lastSyncedAt,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
