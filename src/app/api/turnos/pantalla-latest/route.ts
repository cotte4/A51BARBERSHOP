import { count, desc, gte, gt } from "drizzle-orm";
import { db } from "@/db";
import { pantallaEvents } from "@/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = false;

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const after = url.searchParams.get("after");

  let afterDate: Date | null = null;
  if (after) {
    const parsed = new Date(after);
    if (Number.isNaN(parsed.getTime())) {
      return badRequest("Parametro 'after' invalido.");
    }
    afterDate = parsed;
  }

  // Medianoche de hoy en Argentina (UTC-3)
  const nowUTC = new Date();
  const startOfToday = new Date(
    Date.UTC(
      nowUTC.getUTCFullYear(),
      nowUTC.getUTCMonth(),
      nowUTC.getUTCDate(),
      3, // 00:00 ART = 03:00 UTC
      0,
      0,
      0
    )
  );
  // Si ya pasamos medianoche ART de hoy, la fecha de corte es correcta.
  // Si aún no llegamos a las 03:00 UTC, retrocedemos un día.
  if (nowUTC < startOfToday) {
    startOfToday.setUTCDate(startOfToday.getUTCDate() - 1);
  }

  const [[event], [countRow]] = await Promise.all([
    db
      .select({
        id: pantallaEvents.id,
        turnoId: pantallaEvents.turnoId,
        cancion: pantallaEvents.cancion,
        clienteNombre: pantallaEvents.clienteNombre,
        createdAt: pantallaEvents.createdAt,
      })
      .from(pantallaEvents)
      .where(afterDate ? gt(pantallaEvents.createdAt, afterDate) : undefined)
      .orderBy(desc(pantallaEvents.createdAt))
      .limit(1),
    db
      .select({ count: count() })
      .from(pantallaEvents)
      .where(gte(pantallaEvents.createdAt, startOfToday)),
  ]);

  return Response.json(
    {
      event: event
        ? {
            ...event,
            createdAt: event.createdAt.toISOString(),
          }
        : null,
      todayCount: countRow?.count ?? 0,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
