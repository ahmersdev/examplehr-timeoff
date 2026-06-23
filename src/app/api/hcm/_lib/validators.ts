import type { HCMError } from "@/types";

import {
  employeeExists,
  isValidDimension,
  locationExists,
} from "./state";

export interface BalanceRequestBody {
  employeeId: string;
  locationId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
}

export function validateBalanceQueryParams(
  employeeId: string | null,
  locationId: string | null,
  leaveType: string | null,
): HCMError | null {
  if (!employeeId || !locationId || !leaveType) {
    return {
      code: "MISSING_PARAMS",
      message: "employeeId, locationId, and leaveType are required",
    };
  }
  return null;
}

export function validateDimension(
  locationId: string,
  leaveType: string,
): HCMError | null {
  if (!locationExists(locationId)) {
    return {
      code: "INVALID_DIMENSION",
      message: `Unknown location: ${locationId}`,
    };
  }
  if (!isValidDimension(locationId, leaveType)) {
    return {
      code: "INVALID_DIMENSION",
      message: `Leave type "${leaveType}" is not valid for location "${locationId}"`,
    };
  }
  return null;
}

export function parseBalanceRequestBody(
  body: unknown,
): { data: BalanceRequestBody } | { error: HCMError } {
  if (!body || typeof body !== "object") {
    return {
      error: { code: "INVALID_BODY", message: "Request body must be a JSON object" },
    };
  }

  const record = body as Record<string, unknown>;
  const { employeeId, locationId, leaveType, startDate, endDate, days } = record;

  if (
    typeof employeeId !== "string" ||
    typeof locationId !== "string" ||
    typeof leaveType !== "string" ||
    typeof startDate !== "string" ||
    typeof endDate !== "string" ||
    typeof days !== "number" ||
    days <= 0
  ) {
    return {
      error: {
        code: "INVALID_BODY",
        message:
          "employeeId, locationId, leaveType, startDate, endDate (strings) and days (positive number) are required",
      },
    };
  }

  if (!employeeExists(employeeId)) {
    return {
      error: { code: "NOT_FOUND", message: `Unknown employee: ${employeeId}` },
    };
  }

  return {
    data: { employeeId, locationId, leaveType, startDate, endDate, days },
  };
}

export function parseAnniversaryBody(
  body: unknown,
): { employeeId: string } | { error: HCMError } {
  if (!body || typeof body !== "object") {
    return {
      error: { code: "INVALID_BODY", message: "Request body must be a JSON object" },
    };
  }

  const { employeeId } = body as Record<string, unknown>;
  if (typeof employeeId !== "string" || !employeeId) {
    return {
      error: { code: "INVALID_BODY", message: "employeeId is required" },
    };
  }

  if (!employeeExists(employeeId)) {
    return {
      error: { code: "NOT_FOUND", message: `Unknown employee: ${employeeId}` },
    };
  }

  return { employeeId };
}
