import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { addAnnualBonus } from "@/app/api/hcm/_lib/state";
import { fetchBalance } from "@/lib/api/hcm";
import { handlers as anniversaryBonusHandlers } from "@/mocks/handlers/anniversary-bonus";
import { handlers as pendingSubmitHandlers } from "@/mocks/handlers/pending-submit";
import { server } from "@/mocks/server";
import { useAppStore } from "@/store/useAppStore";
import { createTestQueryClient, createWrapper } from "@/tests/test-utils";

import { hcmKeys } from "../query-keys";
import { reconcileEmployeeBalances } from "../use-reconciliation";
import { useBalances } from "../use-balances";
import { useReconciliation } from "../use-reconciliation";
import { useSubmitRequest } from "../use-submit-request";

describe("useReconciliation", () => {
  it("does NOT apply background update if a mutation is in flight", async () => {
    server.use(...pendingSubmitHandlers);
    const queryClient = createTestQueryClient();

    const { result: balancesResult } = renderHook(
      () => useBalances("emp-alice"),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => expect(balancesResult.current.isLoading).toBe(false));

    const annualBefore = balancesResult.current.balances.find(
      (b) => b.leaveType === "annual",
    );
    expect(annualBefore?.available).toBe(12);

    const { result: submitResult } = renderHook(() => useSubmitRequest(), {
      wrapper: createWrapper(queryClient),
    });

    void submitResult.current.submitAsync({
      employeeId: "emp-alice",
      locationId: "loc-nyc",
      leaveType: "annual",
      startDate: "2026-07-01",
      endDate: "2026-07-01",
      days: 1,
    });

    await waitFor(() => expect(submitResult.current.isOptimistic).toBe(true));

    addAnnualBonus("emp-alice", 2);

    const ran = await reconcileEmployeeBalances(queryClient, "emp-alice", {
      addNotification: useAppStore.getState().addNotification,
      setReconciledAt: useAppStore.getState().setReconciledAt,
    });

    expect(ran).toBe(false);

    const notifications = useAppStore.getState().notifications;
    expect(notifications.some((n) => n.type === "info")).toBe(false);

    const cached = queryClient.getQueryData(hcmKeys.balances("emp-alice")) as
      | typeof balancesResult.current.balances
      | undefined;
    const annualAfter = cached?.find((b) => b.leaveType === "annual");
    expect(annualAfter?.available).toBe(11);
  });

  it("applies update and emits notification when balances drift", async () => {
    server.use(...anniversaryBonusHandlers);
    const queryClient = createTestQueryClient();

    const { result: balancesResult } = renderHook(
      () => useBalances("emp-alice"),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => expect(balancesResult.current.isLoading).toBe(false));

    const annualBefore = balancesResult.current.balances.find(
      (b) => b.leaveType === "annual",
    );
    expect(annualBefore?.available).toBe(12);

    await fetchBalance("emp-alice", "loc-nyc", "annual");
    await fetchBalance("emp-alice", "loc-nyc", "annual");

    renderHook(() => useReconciliation("emp-alice"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      const notifications = useAppStore.getState().notifications;
      expect(
        notifications.some(
          (n) =>
            n.type === "info" && n.message === "Your leave balance was updated",
        ),
      ).toBe(true);
    });

    const cached = queryClient.getQueryData(hcmKeys.balances("emp-alice")) as
      | typeof balancesResult.current.balances
      | undefined;
    const annualAfter = cached?.find((b) => b.leaveType === "annual");
    expect(annualAfter?.available).toBe(14);
  });
});
