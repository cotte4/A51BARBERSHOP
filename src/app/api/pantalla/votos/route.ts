import { z } from "zod";
import { db } from "@/db";
import { pantallaVotes } from "@/db/schema";
import {
  countPantallaVotes,
  getPantallaEventById,
  hashDeviceKey,
  isPantallaEventVotable,
} from "@/lib/pantalla-votos";

export const dynamic = "force-dynamic";
export const revalidate = false;
export const runtime = "nodejs";

const voteBodySchema = z.object({
  eventId: z.string().uuid(),
  deviceKey: z.string().trim().min(16).max(256),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = voteBodySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Datos de voto invalidos." }, { status: 400 });
  }

  const { eventId, deviceKey } = parsed.data;
  const event = await getPantallaEventById(eventId);

  if (!event) {
    return Response.json({ error: "Evento no encontrado." }, { status: 404 });
  }

  if (!isPantallaEventVotable(event.createdAt)) {
    return Response.json({ error: "Este link ya no es valido." }, { status: 410 });
  }

  const deviceKeyHash = hashDeviceKey(deviceKey);

  const inserted = await db
    .insert(pantallaVotes)
    .values({
      eventId,
      deviceKeyHash,
    })
    .onConflictDoNothing({
      target: [pantallaVotes.eventId, pantallaVotes.deviceKeyHash],
    })
    .returning({ id: pantallaVotes.id });

  const voteCount = await countPantallaVotes(eventId);

  return Response.json({
    ok: true,
    duplicate: inserted.length === 0,
    count: voteCount,
  });
}
