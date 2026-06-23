"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { denyRequest } from "@/lib/api/hcm";

import {
  patchBalanceInCache,
  restoreBalanceCacheSnapshot,
  restoreBalanceInCache,
  snapshotBalanceCache,
} from "./balance-cache";
import { hcmKeys, hcmMutations } from "./query-keys";

export interface DenyRequestInput {
  requestId: string;
  employeeId: string;
  locationId: string;
  leaveType: string;
  days: number;
  rejectionReason?: string;
}

export function useDenyRequest() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: hcmMutations.deny,
    mutationFn: ({ requestId, rejectionReason }: DenyRequestInput) =>
      denyRequest(requestId, rejectionReason),
    onMutate: async (input: DenyRequestInput) => {
      const { employeeId, locationId, leaveType, days } = input;

      await queryClient.cancelQueries({ queryKey: hcmMutations.all });

      const snapshot = snapshotBalanceCache(
        queryClient,
        employeeId,
        locationId,
        leaveType,
      );

      restoreBalanceInCache(
        queryClient,
        employeeId,
        locationId,
        leaveType,
        days,
      );

      return { snapshot };
    },
    onSuccess: async (result, input) => {
      if (result.balance) {
        patchBalanceInCache(
          queryClient,
          input.employeeId,
          input.locationId,
          input.leaveType,
          result.balance,
        );
      }
      await queryClient.invalidateQueries({
        queryKey: hcmKeys.requests({ status: "pending" }),
      });
      await queryClient.invalidateQueries({
        queryKey: hcmKeys.requests({ employeeId: input.employeeId }),
      });
    },
    onError: (_error, input, context) => {
      if (!context) return;

      restoreBalanceCacheSnapshot(
        queryClient,
        input.employeeId,
        input.locationId,
        input.leaveType,
        context.snapshot,
      );
    },
  });

  return {
    deny: mutation.mutate,
    denyAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
