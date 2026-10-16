"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { barberos } from "@/db/schema";
import { getAdminSessionContext } from "@/lib/admin-action";
import {
  approveJukeboxProposal,
  dismissJukeboxProposal,
  removeJukeboxQueued,
  setJukeboxAutoApprove,
} from "@/lib/jukebox-admin";
import {
  cambiarFuenteJukebox,
  latidoJukebox,
  pausaOPlayJukebox,
  saltarJukebox,
  sumarTemaDelStaff,
} from "@/lib/jukebox-spotify";
import { buscarEnCatalogo, esIdDeSpotify, type TemaCatalogo } from "@/lib/spotify-catalogo";
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
  if (!actor.isAdmin && !actor.barberoId) {
    throw new Error("Solo el staff puede manejar el Jukebox.");
  }
  return actor;
}

function revalidateJukebox() {
  revalidatePath("/musica/jukebox");
}

async function correr(tarea: () => Promise<unknown>, fallo: string): Promise<ActionResult> {
  try {
    await requireJukeboxActor();
    await tarea();
    revalidateJukebox();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : fallo };
  }
}

export async function approveJukeboxProposalAction(proposalId: string): Promise<ActionResult> {
  return correr(async () => {
    await approveJukeboxProposal(proposalId);
    await latidoJukebox({ apurado: true });
  }, "No pude aprobar la propuesta.");
}

export async function dismissJukeboxProposalAction(proposalId: string): Promise<ActionResult> {
  return correr(() => dismissJukeboxProposal(proposalId), "No pude rechazar la propuesta.");
}

export async function removeJukeboxQueuedAction(queueItemId: string): Promise<ActionResult> {
  return correr(async () => {
    const quitado = await removeJukeboxQueued(queueItemId);
    if (!quitado) throw new Error("Ese tema ya está en Spotify: suena sí o sí. Podés saltarlo cuando arranque.");
  }, "No pude quitar el tema.");
}

export async function skipJukeboxAction(): Promise<ActionResult> {
  return correr(saltarJukebox, "No pude saltar el tema.");
}

export async function pausaOPlayJukeboxAction(): Promise<ActionResult> {
  return correr(pausaOPlayJukebox, "No pude pausar ni darle play.");
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

/** La salida de emergencia: pasar la música a YouTube en este celu, o volver a Spotify. */
export async function cambiarFuenteJukeboxAction(
  fuente: "spotify" | "youtube",
): Promise<ActionResult & { aviso?: string }> {
  if (fuente !== "spotify" && fuente !== "youtube") return { error: "Fuente inválida." };
  try {
    await requireJukeboxActor();
    const aviso = await cambiarFuenteJukebox(fuente);
    revalidateJukebox();
    return aviso ? { ok: true, aviso } : { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude cambiar por dónde suena." };
  }
}

export async function buscarTemasStaffAction(q: string): Promise<{ temas?: TemaCatalogo[]; error?: string }> {
  const parsed = z.string().trim().min(2).max(120).safeParse(q);
  if (!parsed.success) return { error: "Escribí al menos 2 letras." };
  try {
    await requireJukeboxActor();
    return { temas: await buscarEnCatalogo(parsed.data) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude buscar." };
  }
}

/** Pinky como DJ: suma directo a la cola. `alFrente` = que suene a continuación. */
export async function sumarTemaStaffAction(trackId: string, alFrente: boolean): Promise<ActionResult> {
  if (!esIdDeSpotify(trackId)) return { error: "Tema inválido." };
  try {
    const actor = await requireJukeboxActor();
    const [barbero] = actor.barberoId
      ? await db.select({ nombre: barberos.nombre }).from(barberos).where(eq(barberos.id, actor.barberoId)).limit(1)
      : [];
    await sumarTemaDelStaff({ trackId, alFrente, nombre: barbero?.nombre ?? "El local" });
    revalidateJukebox();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude sumar el tema." };
  }
}
