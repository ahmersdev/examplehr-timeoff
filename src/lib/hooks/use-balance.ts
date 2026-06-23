'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchBalance } from '@/lib/api/hcm';

import { hcmKeys } from './query-keys';

export function useBalance(
  employeeId: string,
  locationId: string,
  leaveType: string,
) {
  const query = useQuery({
    queryKey: hcmKeys.balance(employeeId, locationId, leaveType),
    queryFn: () => fetchBalance(employeeId, locationId, leaveType),
    enabled: !!employeeId && !!locationId && !!leaveType,
  });

  return {
    balance: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
    error: query.error,
  };
}
