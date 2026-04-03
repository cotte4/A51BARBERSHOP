import { createHash } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { pantallaEvents, pantallaVotes } from "@/db/schema";

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

function getArgentinaDayKey(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    timeZone: ARGENTINA_TIME_ZONE,
  });
}

export function hashDeviceKey(deviceKey: string): string {
  return createHash("sha256").update(deviceKey).digest("hex");
}

export function isPantallaEventVotable(createdAt: Date, now = new Date()): boolean {
  return getArgentinaDayKey(createdAt) === getArgentinaDayKey(now);
}

export async function getPantallaEventById(eventId: string) {
  const [event] = await db
    .select({
      id: pantallaEvents.id,
      turnoId: pantallaEvents.turnoId,
      cancion: pantallaEvents.cancion,
      clienteNombre: pantallaEvents.clienteNombre,
      createdAt: pantallaEvents.createdAt,
    })
    .from(pantallaEvents)
    .where(eq(pantallaEvents.id, eventId))
    .limit(1);

  return event ?? null;
}

export async function countPantallaVotes(eventId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(pantallaVotes)
    .where(eq(pantallaVotes.eventId, eventId));

  return row?.count ?? 0;
}
