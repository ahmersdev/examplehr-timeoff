import { NextRequest, NextResponse } from "next/server";

import { createRequest, deductBalance, getBalance } from "../../_lib/state";
import { serializeRequest } from "../../_lib/serializers";
import {
  parseBalanceRequestBody,
  validateDimension,
} from "../../_lib/validators";
import { sleep } from "../../_lib/utils";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_BODY", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = parseBalanceRequestBody(body);
  if ("error" in parsed) {
    const status = parsed.error.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(parsed.error, { status });
  }

  const { employeeId, locationId, leaveType, startDate, endDate, days } =
    parsed.data;

  const dimensionError = validateDimension(locationId, leaveType);
  if (dimensionError) {
    return NextResponse.json(dimensionError, { status: 422 });
  }

  const balance = getBalance(employeeId, locationId, leaveType);
  if (!balance) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Balance not found" },
      { status: 404 },
    );
  }

  if (days > balance.available) {
    return NextResponse.json(
      {
        code: "INSUFFICIENT_BALANCE",
        message: `Requested ${days} days but only ${balance.available} available`,
      },
      { status: 422 },
    );
  }

  await sleep(400, 900);

  const outcome = Math.random();
  if (outcome > 0.9) {
    return NextResponse.json(
      {
        code: "SERVICE_UNAVAILABLE",
        message: "HCM request submission unavailable",
      },
      { status: 503 },
    );
  }

  const timeOffRequest = createRequest({
    employeeId,
    locationId,
    leaveType,
    startDate,
    endDate,
    days,
  });

  const silentFailure = outcome <= 0.1;
  if (!silentFailure) {
    deductBalance(employeeId, locationId, leaveType, days);
  }

  return NextResponse.json(serializeRequest(timeOffRequest));
}
