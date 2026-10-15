"use server";

import { revalidatePath } from "next/cache";
import { getAdminSessionContext } from "@/lib/admin-action";
import {
  approveJukeboxProposal,
  dismissJukeboxProposal,
  removeJukeboxQueued,
  setJukeboxAutoApprove,
  skipJukeboxCurrent,
} from "@/lib/jukebox-admin";
import { getTurnosActorContext } from "@/lib/turnos-access";

type ActionResult = {
  ok?: boolean;
  error?: string;
};

async function requireJukeboxActor() {
  const actor = await getTurnosActorContext();
  if (!actor) {
    throw new Error("Necesitas iniciar sesion para usar el Jukebox.");
  }
  return actor;
}

function revalidateJukebox() {
  revalidatePath("/musica/jukebox");
}

export async function approveJukeboxProposalAction(proposalId: string): Promise<ActionResult> {
  try {
    await requireJukeboxActor();
    await approveJukeboxProposal(proposalId);
    revalidateJukebox();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude aprobar la propuesta." };
  }
}

export async function dismissJukeboxProposalAction(proposalId: string): Promise<ActionResult> {
  try {
    await requireJukeboxActor();
    await dismissJukeboxProposal(proposalId);
    revalidateJukebox();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude rechazar la propuesta." };
  }
}

export async function removeJukeboxQueuedAction(queueItemId: string): Promise<ActionResult> {
  try {
    await requireJukeboxActor();
    await removeJukeboxQueued(queueItemId);
    revalidateJukebox();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude quitar el tema." };
  }
}

export async function skipJukeboxAction(): Promise<ActionResult> {
  try {
    await requireJukeboxActor();
    await skipJukeboxCurrent();
    revalidateJukebox();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude saltar el tema." };
  }
}

export async function toggleJukeboxAutoApproveAction(enabled: boolean): Promise<ActionResult> {
  try {
    const admin = await getAdminSessionContext();
    if (!admin) {
      throw new Error("Solo el admin puede cambiar esta configuracion.");
    }
    await setJukeboxAutoApprove(enabled);
    revalidateJukebox();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude cambiar el modo auto-aprobar." };
  }
}
