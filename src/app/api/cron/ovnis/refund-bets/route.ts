import { NextRequest, NextResponse } from "next/server";
import { refundUnacceptedBets } from "@/lib/ovnis-bets";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await refundUnacceptedBets();
  return NextResponse.json({ ok: true, refunded: result.refunded });
}
