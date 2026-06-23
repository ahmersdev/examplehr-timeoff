import { NextRequest, NextResponse } from "next/server";

import { getBalance } from "../_lib/state";
import { serializeBalance } from "../_lib/serializers";
import {
  validateBalanceQueryParams,
  validateDimension,
} from "../_lib/validators";
import { roll, sleep, staleAvailable } from "../_lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const employeeId = searchParams.get("employeeId");
  const locationId = searchParams.get("locationId");
  const leaveType = searchParams.get("leaveType");

  const paramError = validateBalanceQueryParams(
    employeeId,
    locationId,
    leaveType,
  );
  if (paramError) {
    return NextResponse.json(paramError, { status: 400 });
  }

  const dimensionError = validateDimension(locationId!, leaveType!);
  if (dimensionError) {
    return NextResponse.json(dimensionError, { status: 422 });
  }

  const balance = getBalance(employeeId!, locationId!, leaveType!);
  if (!balance) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Balance not found" },
      { status: 404 },
    );
  }

  await sleep(100, 300);

  if (roll(0.05)) {
    const staleDate = new Date(balance.lastSyncedAt);
    staleDate.setMinutes(staleDate.getMinutes() - 30);

    return NextResponse.json(
      serializeBalance({
        ...balance,
        available: staleAvailable(balance.available),
        lastSyncedAt: staleDate.toISOString(),
      }),
    );
  }

  return NextResponse.json(serializeBalance(balance));
}
