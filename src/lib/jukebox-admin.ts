import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jukeboxProposals } from "@/db/schema";
import { enqueueApproved, removeQueued, setAutoApprove } from "@/lib/jukebox";

export async function approveJukeboxProposal(proposalId: string): Promise<void> {
  const [row] = await db
    .update(jukeboxProposals)
    .set({ status: "approved", resolvedAt: new Date() })
    .where(and(eq(jukeboxProposals.id, proposalId), eq(jukeboxProposals.status, "pending")))
    .returning({ id: jukeboxProposals.id });

  if (!row) throw new Error("La propuesta ya fue resuelta o no existe.");
  await enqueueApproved(proposalId);
}

export async function dismissJukeboxProposal(proposalId: string): Promise<void> {
  if (!z.string().uuid().safeParse(proposalId).success) {
    throw new Error("Propuesta inválida.");
  }
  await db
    .update(jukeboxProposals)
    .set({ status: "rejected", resolvedAt: new Date() })
    .where(and(eq(jukeboxProposals.id, proposalId), eq(jukeboxProposals.status, "pending")));
}

/** false = ya estaba en Spotify (o ya no esperaba) y no se pudo quitar. */
export async function removeJukeboxQueued(queueItemId: string): Promise<boolean> {
  if (!z.string().uuid().safeParse(queueItemId).success) {
    throw new Error("Tema inválido.");
  }
  return removeQueued(queueItemId);
}

export { setAutoApprove as setJukeboxAutoApprove };
