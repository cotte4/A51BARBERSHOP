import { and, eq, gte, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { pantallaEvents, turnos } from "@/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = false;

export async function GET() {
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
  if (nowUTC < startOfToday) {
    startOfToday.setUTCDate(startOfToday.getUTCDate() - 1);
  }

  // Fecha de hoy en formato "YYYY-MM-DD" para comparar con la columna `date`
  const todayStr = startOfToday.toISOString().slice(0, 10);

  const rows = await db
    .select({
      turnoId: turnos.id,
      clienteNombre: turnos.clienteNombre,
      cancion: turnos.sugerenciaCancion,
      hora: turnos.horaInicio,
    })
    .from(turnos)
    .leftJoin(pantallaEvents, eq(pantallaEvents.turnoId, turnos.id))
    .where(
      and(
        eq(turnos.estado, "confirmado"),
        isNotNull(turnos.sugerenciaCancion),
        gte(turnos.fecha, todayStr),
        isNull(pantallaEvents.id)
      )
    )
    .orderBy(turnos.fecha, turnos.horaInicio)
    .limit(5);

  const result = rows.map((r) => ({
    turnoId: r.turnoId,
    clienteNombre: r.clienteNombre,
    cancion: r.cancion as string,
    hora: r.hora,
  }));

  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
