import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { handlers as conflictApproveHandlers } from "@/mocks/handlers/conflict-approve";
import { handlers as defaultHandlers } from "@/mocks/handlers/default";
import { server } from "@/mocks/server";
import { resetHcmState } from "@/app/api/hcm/_lib/state";
import { useAppStore } from "@/store/useAppStore";
import {
  createTestQueryClient,
  createWrapper,
  seedPendingRequest,
} from "@/tests/test-utils";

import { useApproveRequest } from "../use-approve-request";
import { useBalance } from "../use-balance";

describe("useApproveRequest", () => {
  it("sets conflictError and emits warning notification on balance conflict", async () => {
    server.use(...conflictApproveHandlers);
    resetHcmState();

    const request = seedPendingRequest({
      employeeId: "emp-bob",
      locationId: "loc-london",
      leaveType: "annual",
      startDate: "2026-08-01",
      endDate: "2026-08-03",
      days: 3,
    });

    const queryClient = createTestQueryClient();

    const { result: balanceResult } = renderHook(
      () => useBalance("emp-bob", "loc-london", "annual"),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(balanceResult.current.isLoading).toBe(false));

    const { result: approveResult } = renderHook(() => useApproveRequest(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      approveResult.current.approveAsync({
        requestId: request.id,
        employeeId: "emp-bob",
        locationId: "loc-london",
        leaveType: "annual",
      }),
    ).rejects.toThrow();

    await waitFor(() => {
      expect(approveResult.current.conflictError).not.toBeNull();
    });

    const notifications = useAppStore.getState().notifications;
    expect(notifications.some((n) => n.type === "warning")).toBe(true);
  });

  it("approves successfully when no conflict", async () => {
    server.use(...defaultHandlers);
    resetHcmState();

    const request = seedPendingRequest({
      employeeId: "emp-bob",
      locationId: "loc-london",
      leaveType: "annual",
      startDate: "2026-08-01",
      endDate: "2026-08-03",
      days: 3,
    });

    const queryClient = createTestQueryClient();

    const { result: approveResult } = renderHook(() => useApproveRequest(), {
      wrapper: createWrapper(queryClient),
    });

    await approveResult.current.approveAsync({
      requestId: request.id,
      employeeId: "emp-bob",
      locationId: "loc-london",
      leaveType: "annual",
    });

    expect(approveResult.current.conflictError).toBeNull();
  });
});
