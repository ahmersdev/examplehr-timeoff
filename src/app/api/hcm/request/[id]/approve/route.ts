import { NextRequest, NextResponse } from "next/server";

import {
  addAnnualBonus,
  getBalance,
  getRequest,
  updateRequest,
} from "../../../_lib/state";
import { serializeBalance, serializeRequest } from "../../../_lib/serializers";
import { roll, sleep } from "../../../_lib/utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const timeOffRequest = getRequest(id);

  if (!timeOffRequest) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: `Request not found: ${id}` },
      { status: 404 },
    );
  }

  if (timeOffRequest.status !== "pending") {
    return NextResponse.json(
      {
        code: "CONFLICT",
        message: `Request ${id} is already ${timeOffRequest.status}`,
      },
      { status: 409 },
    );
  }

  await sleep(200, 500);

  if (roll(0.05)) {
    addAnnualBonus(timeOffRequest.employeeId, 2);

    const balance = getBalance(
      timeOffRequest.employeeId,
      timeOffRequest.locationId,
      timeOffRequest.leaveType,
    );

    return NextResponse.json({
      conflict: true,
      message:
        "Balance changed externally while request was pending (e.g. anniversary bonus applied)",
      request: serializeRequest(timeOffRequest),
      balance: balance ? serializeBalance(balance) : null,
    });
  }

  const approved = updateRequest(id, {
    status: "approved",
    resolvedAt: new Date().toISOString(),
  });

  const balance = getBalance(
    timeOffRequest.employeeId,
    timeOffRequest.locationId,
    timeOffRequest.leaveType,
  );

  return NextResponse.json({
    conflict: false,
    request: serializeRequest(approved!),
    balance: balance ? serializeBalance(balance) : null,
  });
}
