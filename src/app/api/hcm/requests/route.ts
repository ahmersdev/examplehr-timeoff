import { NextRequest, NextResponse } from "next/server";

import {
  getPendingRequests,
  getRequestsByEmployee,
} from "../_lib/state";
import { serializeRequest } from "../_lib/serializers";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");

  if (employeeId) {
    const requests = getRequestsByEmployee(employeeId);
    return NextResponse.json({
      requests: requests.map(serializeRequest),
    });
  }

  if (status === "pending") {
    const requests = getPendingRequests();
    return NextResponse.json({
      requests: requests.map(serializeRequest),
    });
  }

  return NextResponse.json(
    {
      code: "INVALID_QUERY",
      message: "Provide employeeId or status=pending",
    },
    { status: 400 },
  );
}
