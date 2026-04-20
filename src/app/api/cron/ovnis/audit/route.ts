import { NextRequest, NextResponse } from "next/server";
import { totalOvnisInCirculation } from "@/lib/ovnis-server";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await totalOvnisInCirculation();

  if (stats.driftAlert) {
    console.error("[OVNIS DRIFT] Inconsistencia detectada en circulación de OVNIS:", stats);
  }

  return NextResponse.json({ ok: true, ...stats });
}
