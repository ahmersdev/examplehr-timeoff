import { NextRequest, NextResponse } from "next/server";

import { addAnnualBonus } from "../_lib/state";
import { serializeBalance } from "../_lib/serializers";
import { parseAnniversaryBody } from "../_lib/validators";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "trigger-anniversary is only available in development",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_BODY", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = parseAnniversaryBody(body);
  if ("error" in parsed) {
    const status = parsed.error.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(parsed.error, { status });
  }

  const balance = addAnnualBonus(parsed.employeeId, 2);
  if (!balance) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Annual balance not found for employee" },
      { status: 404 },
    );
  }

  return NextResponse.json({ balance: serializeBalance(balance) });
}
