"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchRequests } from "@/lib/api/hcm";

import { hcmKeys } from "./query-keys";

export function useRequests(employeeId: string) {
  const query = useQuery({
    queryKey: hcmKeys.requests({ employeeId }),
    queryFn: () => fetchRequests({ employeeId }),
    enabled: !!employeeId,
  });

  return {
    requests: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function usePendingRequests() {
  const query = useQuery({
    queryKey: hcmKeys.requests({ status: "pending" }),
    queryFn: () => fetchRequests({ status: "pending" }),
    refetchInterval: 10_000,
  });

  return {
    requests: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
