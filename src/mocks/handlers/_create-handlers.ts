import { http, HttpResponse, type RequestHandler } from "msw";

import {
  addAnnualBonus,
  createRequest,
  deductBalance,
  getAllBalances,
  getBalance,
  getPendingRequests,
  getRequest,
  getRequestsByEmployee,
  restoreBalance,
  updateRequest,
} from "@/app/api/hcm/_lib/state";
import {
  serializeBalance,
  serializeRequest,
} from "@/app/api/hcm/_lib/serializers";
import {
  parseAnniversaryBody,
  parseBalanceRequestBody,
  validateBalanceQueryParams,
  validateDimension,
} from "@/app/api/hcm/_lib/validators";
import { sleep, staleAvailable } from "@/app/api/hcm/_lib/utils";

export type HcmHandlerMode =
  | "default"
  | "loading"
  | "errors"
  | "stale"
  | "silent-failure"
  | "insufficient-balance"
  | "anniversary-bonus";

const SERVICE_UNAVAILABLE = {
  code: "SERVICE_UNAVAILABLE",
  message: "HCM service unavailable",
} as const;

async function applyLatency(mode: HcmHandlerMode): Promise<void> {
  if (mode === "loading") {
    await new Promise(() => {});
  }
  if (mode === "default") {
    await sleep(10, 30);
  }
}

function staleBalance(balance: ReturnType<typeof getBalance>) {
  if (!balance) return null;
  const staleDate = new Date(balance.lastSyncedAt);
  staleDate.setMinutes(staleDate.getMinutes() - 30);
  return serializeBalance({
    ...balance,
    available: staleAvailable(balance.available),
    lastSyncedAt: staleDate.toISOString(),
  });
}

export function createHcmHandlers(mode: HcmHandlerMode): RequestHandler[] {
  const balanceReadCounts = new Map<string, number>();
  const anniversaryApplied = new Set<string>();

  function trackBalanceRead(employeeId: string): void {
    if (mode !== "anniversary-bonus") return;
    const count = (balanceReadCounts.get(employeeId) ?? 0) + 1;
    balanceReadCounts.set(employeeId, count);
    if (count >= 2 && !anniversaryApplied.has(employeeId)) {
      addAnnualBonus(employeeId, 2);
      anniversaryApplied.add(employeeId);
    }
  }

  return [
    http.get("/api/hcm/balance", async ({ request }) => {
      if (mode === "errors") {
        return HttpResponse.json(
          {
            code: "SERVICE_UNAVAILABLE",
            message: "HCM balance sync unavailable",
          },
          { status: 503 },
        );
      }

      const url = new URL(request.url);
      const employeeId = url.searchParams.get("employeeId");
      const locationId = url.searchParams.get("locationId");
      const leaveType = url.searchParams.get("leaveType");

      const paramError = validateBalanceQueryParams(
        employeeId,
        locationId,
        leaveType,
      );
      if (paramError) {
        return HttpResponse.json(paramError, { status: 400 });
      }

      const dimensionError = validateDimension(locationId!, leaveType!);
      if (dimensionError) {
        return HttpResponse.json(dimensionError, { status: 422 });
      }

      const balance = getBalance(employeeId!, locationId!, leaveType!);
      if (!balance) {
        return HttpResponse.json(
          { code: "NOT_FOUND", message: "Balance not found" },
          { status: 404 },
        );
      }

      trackBalanceRead(employeeId!);
      await applyLatency(mode);

      if (mode === "stale") {
        return HttpResponse.json(staleBalance(balance));
      }

      return HttpResponse.json(serializeBalance(balance));
    }),

    http.get("/api/hcm/balances", async () => {
      if (mode === "errors") {
        return HttpResponse.json(
          {
            code: "SERVICE_UNAVAILABLE",
            message: "HCM batch sync unavailable",
          },
          { status: 503 },
        );
      }

      await applyLatency(mode);

      if (mode === "stale") {
        const balances = getAllBalances().map((b) => staleBalance(b)!);
        return HttpResponse.json({ balances });
      }

      const balances = getAllBalances().map(serializeBalance);
      return HttpResponse.json({ balances });
    }),

    http.get("/api/hcm/requests", ({ request }) => {
      const url = new URL(request.url);
      const employeeId = url.searchParams.get("employeeId");
      const status = url.searchParams.get("status");

      if (employeeId) {
        const requests =
          getRequestsByEmployee(employeeId).map(serializeRequest);
        return HttpResponse.json({ requests });
      }

      if (status === "pending") {
        const requests = getPendingRequests().map(serializeRequest);
        return HttpResponse.json({ requests });
      }

      return HttpResponse.json(
        {
          code: "INVALID_QUERY",
          message: "Provide employeeId or status=pending",
        },
        { status: 400 },
      );
    }),

    http.post("/api/hcm/balance/request", async ({ request }) => {
      if (mode === "errors") {
        return HttpResponse.json(
          {
            code: "SERVICE_UNAVAILABLE",
            message: "HCM request submission unavailable",
          },
          { status: 503 },
        );
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return HttpResponse.json(
          { code: "INVALID_BODY", message: "Invalid JSON body" },
          { status: 400 },
        );
      }

      const parsed = parseBalanceRequestBody(body);
      if ("error" in parsed) {
        const status = parsed.error.code === "NOT_FOUND" ? 404 : 400;
        return HttpResponse.json(parsed.error, { status });
      }

      const { employeeId, locationId, leaveType, startDate, endDate, days } =
        parsed.data;

      const dimensionError = validateDimension(locationId, leaveType);
      if (dimensionError) {
        return HttpResponse.json(dimensionError, { status: 422 });
      }

      const balance = getBalance(employeeId, locationId, leaveType);
      if (!balance) {
        return HttpResponse.json(
          { code: "NOT_FOUND", message: "Balance not found" },
          { status: 404 },
        );
      }

      if (mode === "insufficient-balance" || days > balance.available) {
        return HttpResponse.json(
          {
            code: "INSUFFICIENT_BALANCE",
            message: `Requested ${days} days but only ${balance.available} available`,
          },
          { status: 422 },
        );
      }

      await applyLatency(mode);

      const timeOffRequest = createRequest({
        employeeId,
        locationId,
        leaveType,
        startDate,
        endDate,
        days,
      });

      if (mode !== "silent-failure") {
        deductBalance(employeeId, locationId, leaveType, days);
      }

      return HttpResponse.json(serializeRequest(timeOffRequest));
    }),

    http.post("/api/hcm/request/:id/approve", async ({ params }) => {
      if (mode === "errors") {
        return HttpResponse.json(SERVICE_UNAVAILABLE, { status: 503 });
      }

      const { id } = params;
      const timeOffRequest = getRequest(id as string);

      if (!timeOffRequest) {
        return HttpResponse.json(
          { code: "NOT_FOUND", message: `Request not found: ${id}` },
          { status: 404 },
        );
      }

      if (timeOffRequest.status !== "pending") {
        return HttpResponse.json(
          {
            code: "CONFLICT",
            message: `Request ${id} is already ${timeOffRequest.status}`,
          },
          { status: 409 },
        );
      }

      await applyLatency(mode);

      const approved = updateRequest(id as string, {
        status: "approved",
        resolvedAt: new Date().toISOString(),
      });

      const balance = getBalance(
        timeOffRequest.employeeId,
        timeOffRequest.locationId,
        timeOffRequest.leaveType,
      );

      return HttpResponse.json({
        conflict: false,
        request: serializeRequest(approved!),
        balance: balance ? serializeBalance(balance) : null,
      });
    }),

    http.post("/api/hcm/request/:id/deny", async ({ params, request }) => {
      if (mode === "errors") {
        return HttpResponse.json(SERVICE_UNAVAILABLE, { status: 503 });
      }

      const { id } = params;
      const timeOffRequest = getRequest(id as string);

      if (!timeOffRequest) {
        return HttpResponse.json(
          { code: "NOT_FOUND", message: `Request not found: ${id}` },
          { status: 404 },
        );
      }

      let rejectionReason: string | undefined;
      try {
        const body = await request.json();
        if (body && typeof body === "object" && "rejectionReason" in body) {
          const reason = (body as Record<string, unknown>).rejectionReason;
          if (typeof reason === "string") {
            rejectionReason = reason;
          }
        }
      } catch {
        // empty body is fine
      }

      if (timeOffRequest.status === "pending") {
        restoreBalance(
          timeOffRequest.employeeId,
          timeOffRequest.locationId,
          timeOffRequest.leaveType,
          timeOffRequest.days,
        );
      }

      const denied = updateRequest(id as string, {
        status: "denied",
        resolvedAt: new Date().toISOString(),
        rejectionReason,
      });

      await applyLatency(mode);

      const balance = getBalance(
        timeOffRequest.employeeId,
        timeOffRequest.locationId,
        timeOffRequest.leaveType,
      );

      return HttpResponse.json({
        request: serializeRequest(denied!),
        balance: balance ? serializeBalance(balance) : null,
      });
    }),

    http.post("/api/hcm/trigger-anniversary", async ({ request }) => {
      if (mode === "errors") {
        return HttpResponse.json(SERVICE_UNAVAILABLE, { status: 503 });
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return HttpResponse.json(
          { code: "INVALID_BODY", message: "Invalid JSON body" },
          { status: 400 },
        );
      }

      const parsed = parseAnniversaryBody(body);
      if ("error" in parsed) {
        const status = parsed.error.code === "NOT_FOUND" ? 404 : 400;
        return HttpResponse.json(parsed.error, { status });
      }

      const balance = addAnnualBonus(parsed.employeeId, 2);
      if (!balance) {
        return HttpResponse.json(
          {
            code: "NOT_FOUND",
            message: "Annual balance not found for employee",
          },
          { status: 404 },
        );
      }

      await applyLatency(mode);

      return HttpResponse.json({ balance: serializeBalance(balance) });
    }),
  ];
}
