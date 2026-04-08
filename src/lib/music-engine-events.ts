import { eq } from "drizzle-orm";
import { db } from "@/db";
import { musicEvents } from "@/db/schema";
import { isRecord } from "@/lib/music-engine-helpers";

export async function logMusicEvent(eventType: string, payload: Record<string, unknown>) {
  await db.insert(musicEvents).values({
    eventType,
    payload,
  });
}

export async function getProposalEventRow(eventId: string) {
  const [event] = await db
    .select()
    .from(musicEvents)
    .where(eq(musicEvents.id, eventId))
    .limit(1);
  return event ?? null;
}

export async function updateProposalStatus(
  eventId: string,
  status: "pending" | "accepted" | "dismissed",
  extraPayload: Record<string, unknown> = {},
) {
  const event = await getProposalEventRow(eventId);
  if (!event) {
    throw new Error("No encontramos esa propuesta.");
  }

  const basePayload = isRecord(event.payload) ? event.payload : {};
  await db
    .update(musicEvents)
    .set({
      payload: {
        ...basePayload,
        ...extraPayload,
        proposalStatus: status,
        handledAt: new Date().toISOString(),
      },
    })
    .where(eq(musicEvents.id, eventId));
}

export async function createTurnoArrivalEvent(input: {
  turnoId: string;
  clienteNombre: string;
  cancion: string;
  spotifyTrackUri: string | null;
  barberoId: string | null;
  proposalStatus: "pending" | "accepted" | "dismissed";
  outcome:
    | "proposal_created"
    | "playback_started"
    | "queued_in_jam"
    | "waiting_for_recovery"
    | "blocked_by_manual_dj"
    | "missing_track_uri";
  outcomeReason?: string | null;
}) {
  const [event] = await db
    .insert(musicEvents)
    .values({
      eventType: "turno.cliente_llego",
      payload: {
        turnoId: input.turnoId,
        clienteNombre: input.clienteNombre,
        cancion: input.cancion,
        spotifyTrackUri: input.spotifyTrackUri,
        barberoId: input.barberoId,
        proposalStatus: input.proposalStatus,
        outcome: input.outcome,
        outcomeReason: input.outcomeReason ?? null,
      },
    })
    .returning();

  return event;
}
