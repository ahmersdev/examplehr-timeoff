import { NextRequest, NextResponse } from "next/server";

import {
  getBalance,
  getRequest,
  restoreBalance,
  updateRequest,
} from "../../../_lib/state";
import { serializeBalance, serializeRequest } from "../../../_lib/serializers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const timeOffRequest = getRequest(id);

  if (!timeOffRequest) {
    return NextResponse.json(
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

  const denied = updateRequest(id, {
    status: "denied",
    resolvedAt: new Date().toISOString(),
    rejectionReason,
  });

  const balance = getBalance(
    timeOffRequest.employeeId,
    timeOffRequest.locationId,
    timeOffRequest.leaveType,
  );

  return NextResponse.json({
    request: serializeRequest(denied!),
    balance: balance ? serializeBalance(balance) : null,
  });
}
