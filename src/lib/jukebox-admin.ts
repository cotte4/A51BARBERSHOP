import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jukeboxProposals } from "@/db/schema";
import { enqueueApproved, skipCurrent, setAutoApprove } from "@/lib/jukebox";

export async function approveJukeboxProposal(proposalId: string): Promise<void> {
  const [row] = await db
    .update(jukeboxProposals)
    .set({ status: "approved", resolvedAt: new Date() })
    .where(eq(jukeboxProposals.id, proposalId))
    .returning({ id: jukeboxProposals.id });

  if (!row) throw new Error("Propuesta no encontrada.");
  await enqueueApproved(proposalId);
}

export async function dismissJukeboxProposal(proposalId: string): Promise<void> {
  await db
    .update(jukeboxProposals)
    .set({ status: "rejected", resolvedAt: new Date() })
    .where(eq(jukeboxProposals.id, proposalId));
}

export async function skipJukeboxCurrent(): Promise<void> {
  await skipCurrent();
}

export { setAutoApprove as setJukeboxAutoApprove };
