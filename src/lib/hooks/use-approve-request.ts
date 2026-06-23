"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  approveRequest,
  BalanceChangedError,
  fetchBalance,
} from "@/lib/api/hcm";
import { useAppStore } from "@/store/useAppStore";

import { patchBalanceInCache } from "./balance-cache";
import { hcmKeys, hcmMutations } from "./query-keys";

export interface ApproveRequestInput {
  requestId: string;
  employeeId: string;
  locationId: string;
  leaveType: string;
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const [conflictError, setConflictError] =
    useState<BalanceChangedError | null>(null);

  const mutation = useMutation({
    mutationKey: hcmMutations.approve,
    mutationFn: async (input: ApproveRequestInput) => {
      const { requestId, employeeId, locationId, leaveType } = input;

      await fetchBalance(employeeId, locationId, leaveType);

      const result = await approveRequest(requestId);

      if (result.conflict) {
        throw new BalanceChangedError(
          result.message ??
            "Balance changed externally while request was pending (e.g. anniversary bonus applied)",
          result.balance,
        );
      }

      return result;
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
      setConflictError(null);
      await queryClient.invalidateQueries({
        queryKey: hcmKeys.requests({ status: "pending" }),
      });
      await queryClient.invalidateQueries({
        queryKey: hcmKeys.requests({ employeeId: input.employeeId }),
      });
    },
    onError: (error, input) => {
      if (error instanceof BalanceChangedError) {
        setConflictError(error);
        if (error.balance) {
          patchBalanceInCache(
            queryClient,
            input.employeeId,
            input.locationId,
            input.leaveType,
            error.balance,
          );
        }
        addNotification({
          type: "warning",
          message: error.message,
        });
      }
    },
  });

  const reset = useCallback(() => {
    setConflictError(null);
    mutation.reset();
  }, [mutation]);

  return {
    approve: mutation.mutate,
    approveAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    conflictError,
    reset,
  };
}
