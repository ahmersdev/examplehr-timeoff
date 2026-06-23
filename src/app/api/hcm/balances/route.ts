import { NextResponse } from "next/server";

import { getAllBalances } from "../_lib/state";
import { serializeBalance } from "../_lib/serializers";
import { roll, sleep } from "../_lib/utils";

export async function GET() {
  await sleep(300, 800);

  if (roll(0.1)) {
    return NextResponse.json(
      {
        code: "SERVICE_UNAVAILABLE",
        message: "HCM batch sync unavailable",
      },
      { status: 503 },
    );
  }

  const balances = getAllBalances().map(serializeBalance);
  return NextResponse.json({ balances });
}
