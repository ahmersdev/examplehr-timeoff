"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { fetchBalances } from "@/lib/api/hcm";
import { useAppStore } from "@/store/useAppStore";
import type { AppNotification } from "@/store/useAppStore";

import { detectDrift, setBalancesInCache } from "./balance-cache";
import { hcmKeys, hcmMutations } from "./query-keys";

export const RECONCILE_INTERVAL_MS = 60_000;

interface ReconcileCallbacks {
  addNotification: (
    notification: Omit<AppNotification, "id" | "dismissedAt">,
  ) => void;
  setReconciledAt: (timestamp: string) => void;
}

export async function reconcileEmployeeBalances(
  queryClient: QueryClient,
  employeeId: string,
  { addNotification, setReconciledAt }: ReconcileCallbacks,
): Promise<boolean> {
  if (queryClient.isMutating({ mutationKey: hcmMutations.all }) > 0) {
    return false;
  }

  const fresh = (await fetchBalances()).filter(
    (b) => b.employeeId === employeeId,
  );
  const cached = queryClient.getQueryData<typeof fresh>(
    hcmKeys.balances(employeeId),
  );

  if (detectDrift(cached, fresh)) {
    setBalancesInCache(queryClient, employeeId, fresh);
    addNotification({
      type: "info",
      message: "Your leave balance was updated",
    });
  }

  setReconciledAt(new Date().toISOString());
  return true;
}

export function useReconciliation(employeeId: string) {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((s) => s.addNotification);
  const setReconciledAt = useAppStore((s) => s.setReconciledAt);
  const reconciledAt = useAppStore((s) => s.reconciledAt);
  const employeeIdRef = useRef(employeeId);
  employeeIdRef.current = employeeId;

  useEffect(() => {
    if (!employeeId) return;

    async function reconcile() {
      await reconcileEmployeeBalances(queryClient, employeeIdRef.current, {
        addNotification,
        setReconciledAt,
      });
    }

    void reconcile();

    const intervalId = setInterval(() => {
      void reconcile();
    }, RECONCILE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [employeeId, queryClient, addNotification, setReconciledAt]);

  return { lastReconciledAt: reconciledAt };
}
