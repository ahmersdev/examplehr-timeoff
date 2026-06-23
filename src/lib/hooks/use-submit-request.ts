"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import {
  fetchBalance,
  HcmApiError,
  submitRequest,
  VerificationError,
  type SubmitRequestInput,
} from "@/lib/api/hcm";
import { useAppStore } from "@/store/useAppStore";

import {
  deductBalanceInCache,
  restoreBalanceCacheSnapshot,
  snapshotBalanceCache,
} from "./balance-cache";
import { hcmKeys, hcmMutations } from "./query-keys";

interface SubmitMutationContext {
  snapshot: ReturnType<typeof snapshotBalanceCache>;
  expectedAvailable: number;
}

export function useSubmitRequest() {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const [isRolledBack, setIsRolledBack] = useState(false);

  const mutation = useMutation({
    mutationKey: hcmMutations.submit,
    mutationFn: submitRequest,
    onMutate: async (input: SubmitRequestInput) => {
      setIsRolledBack(false);

      const { employeeId, locationId, leaveType, days } = input;

      await queryClient.cancelQueries({ queryKey: hcmKeys.all });

      const snapshot = snapshotBalanceCache(
        queryClient,
        employeeId,
        locationId,
        leaveType,
      );

      const current =
        snapshot.cell ??
        snapshot.balances?.find(
          (b) => b.locationId === locationId && b.leaveType === leaveType,
        );

      const expectedAvailable = (current?.available ?? 0) - days;

      deductBalanceInCache(
        queryClient,
        employeeId,
        locationId,
        leaveType,
        days,
      );

      return { snapshot, expectedAvailable } satisfies SubmitMutationContext;
    },
    onSuccess: async (request, input, context) => {
      if (!context) return;

      const { employeeId, locationId, leaveType } = input;
      const fetched = await fetchBalance(employeeId, locationId, leaveType);

      if (fetched.available !== context.expectedAvailable) {
        restoreBalanceCacheSnapshot(
          queryClient,
          employeeId,
          locationId,
          leaveType,
          context.snapshot,
        );
        setIsRolledBack(true);
        throw new VerificationError(
          "Balance verification failed after submission. Your balance has been restored.",
          fetched,
        );
      }

      await queryClient.invalidateQueries({
        queryKey: hcmKeys.balances(employeeId),
      });
      await queryClient.invalidateQueries({
        queryKey: hcmKeys.balance(employeeId, locationId, leaveType),
      });
      await queryClient.invalidateQueries({
        queryKey: hcmKeys.requests({ employeeId }),
      });
      await queryClient.invalidateQueries({
        queryKey: hcmKeys.requests({ status: "pending" }),
      });

      return request;
    },
    onError: (error, input, context) => {
      if (!context) return;

      restoreBalanceCacheSnapshot(
        queryClient,
        input.employeeId,
        input.locationId,
        input.leaveType,
        context.snapshot,
      );
      setIsRolledBack(true);

      const message =
        error instanceof HcmApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Request submission failed.";

      addNotification({ type: "error", message });
    },
  });

  const reset = useCallback(() => {
    setIsRolledBack(false);
    mutation.reset();
  }, [mutation]);

  return {
    submit: mutation.mutate,
    submitAsync: mutation.mutateAsync,
    isOptimistic: mutation.isPending,
    isRolledBack,
    error: mutation.error,
    reset,
  };
}
