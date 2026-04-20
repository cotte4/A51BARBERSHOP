import { NextRequest, NextResponse } from "next/server";
import { burnStaleBets } from "@/lib/ovnis-bets";

async function handleCron(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await burnStaleBets();
  return NextResponse.json({ ok: true, burned: result.burned });
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
