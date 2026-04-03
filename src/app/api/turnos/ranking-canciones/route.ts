import { and, count, desc, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { pantallaEvents } from "@/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = false;

export async function GET() {
  const nowUTC = new Date();

  // Calcular mes actual en ART (UTC-3)
  const artOffsetMs = -3 * 60 * 60 * 1000;
  const nowART = new Date(nowUTC.getTime() + artOffsetMs);
  const year = nowART.getUTCFullYear();
  const month = nowART.getUTCMonth(); // 0-indexed

  // Límites del mes en UTC: 00:00 ART = 03:00 UTC
  const startOfMonth = new Date(Date.UTC(year, month, 1, 3, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month + 1, 1, 3, 0, 0, 0));

  const rows = await db
    .select({
      cancion: pantallaEvents.cancion,
      count: count(),
    })
    .from(pantallaEvents)
    .where(
      and(
        gte(pantallaEvents.createdAt, startOfMonth),
        lt(pantallaEvents.createdAt, endOfMonth)
      )
    )
    .groupBy(pantallaEvents.cancion)
    .orderBy(desc(count()))
    .limit(5);

  return Response.json(rows, {
    headers: { "Cache-Control": "no-store" },
  });
}
