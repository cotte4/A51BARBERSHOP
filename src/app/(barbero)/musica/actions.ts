"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSessionContext } from "@/lib/admin-action";
import {
  acceptMusicProposal,
  activateDjMode,
  activateJamMode,
  dismissMusicProposal,
  deleteScheduleRule,
  disconnectMusicProvider,
  getDefaultWeekdayMask,
  joinActiveJamSession,
  pauseMusic,
  playPlaylistNow,
  previousMusic,
  queueTrack,
  resumeMusic,
  saveScheduleRule,
  setAutoMode,
  setExpectedLocalPlayer,
  skipMusic,
  syncMusicEngine,
} from "@/lib/music-engine";
import type { WeekdayKey } from "@/lib/music-types";
import type { TurnosActorContext } from "@/lib/turnos-access";
import { getTurnosActorContext } from "@/lib/turnos-access";

type ActionResult = {
  ok?: boolean;
  error?: string;
};

function revalidateMusicSurfaces() {
  revalidatePath("/musica");
  revalidatePath("/configuracion/musica");
}

async function requireMusicActor() {
  const actor = await getTurnosActorContext();
  if (!actor) {
    throw new Error("Necesitas iniciar sesion para usar Musica.");
  }
  return actor;
}

async function requireMusicAdmin() {
  const admin = await getAdminSessionContext();
  if (!admin) {
    throw new Error("Solo el admin puede cambiar esta configuracion.");
  }
  return admin;
}

async function requireMusicBarberoActor(): Promise<TurnosActorContext & { barberoId: string }> {
  const actor = await requireMusicActor();
  if (!actor.barberoId) {
    throw new Error("Necesitas un perfil de barbero activo para unirte a Jam.");
  }
  return {
    ...actor,
    barberoId: actor.barberoId,
  };
}

const queueTrackSchema = z.object({
  mode: z.enum(["dj", "jam"]),
  trackUri: z.string().trim().min(1),
  trackName: z.string().trim().min(1).max(180),
  artistName: z.string().trim().max(180).optional(),
});

const playPlaylistSchema = z.object({
  playlistUri: z.string().trim().min(1),
  playlistName: z.string().trim().min(1).max(180),
});

const expectedPlayerSchema = z.object({
  providerPlayerId: z.string().trim().min(1),
});

const scheduleRuleSchema = z.object({
  label: z.string().trim().min(2).max(80),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  providerPlaylistRef: z.string().trim().min(1),
  dayMask: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).min(1),
});

const proposalSchema = z.object({
  eventId: z.string().trim().min(1),
});

export async function syncMusicDashboardAction(): Promise<ActionResult> {
  try {
    await requireMusicActor();
    await syncMusicEngine();
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude refrescar el sistema musical." };
  }
}

export async function setAutoModeAction(): Promise<ActionResult> {
  try {
    const actor = await requireMusicActor();
    await setAutoMode(actor.userId);
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude volver a Auto." };
  }
}

export async function activateDjModeAction(): Promise<ActionResult> {
  try {
    const actor = await requireMusicActor();
    await activateDjMode({
      userId: actor.userId,
      barberoId: actor.barberoId,
    });
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude activar Soy DJ." };
  }
}

export async function activateJamModeAction(): Promise<ActionResult> {
  try {
    const actor = await requireMusicActor();
    await activateJamMode({
      userId: actor.userId,
      barberoId: actor.barberoId,
    });
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude activar Jam." };
  }
}

export async function joinJamSessionAction(): Promise<ActionResult> {
  try {
    const actor = await requireMusicBarberoActor();
    await joinActiveJamSession({
      userId: actor.userId,
      barberoId: actor.barberoId,
    });
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude sumarte a la Jam." };
  }
}

export async function playPlaylistNowAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireMusicActor();
    const parsed = playPlaylistSchema.parse(input);
    await playPlaylistNow({
      userId: actor.userId,
      barberoId: actor.barberoId,
      playlistUri: parsed.playlistUri,
      playlistName: parsed.playlistName,
    });
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude reproducir la playlist." };
  }
}

export async function queueTrackAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireMusicActor();
    const parsed = queueTrackSchema.parse(input);
    await queueTrack({
      mode: parsed.mode,
      userId: actor.userId,
      barberoId: actor.barberoId,
      trackUri: parsed.trackUri,
      trackName: parsed.trackName,
      artistName: parsed.artistName ?? null,
    });
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude agregar el track a la cola." };
  }
}

export async function acceptMusicProposalAction(
  input: unknown,
  mode: "dj" | "jam",
): Promise<ActionResult> {
  try {
    const actor = await requireMusicActor();
    const parsed = proposalSchema.parse(input);
    await acceptMusicProposal({
      eventId: parsed.eventId,
      mode,
      userId: actor.userId,
      barberoId: actor.barberoId,
    });
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude aceptar la propuesta." };
  }
}

export async function dismissMusicProposalAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireMusicActor();
    const parsed = proposalSchema.parse(input);
    await dismissMusicProposal({
      eventId: parsed.eventId,
      userId: actor.userId,
    });
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude ocultar la propuesta." };
  }
}

export async function pauseMusicAction(): Promise<ActionResult> {
  try {
    await requireMusicActor();
    await pauseMusic();
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude pausar la musica." };
  }
}

export async function resumeMusicAction(): Promise<ActionResult> {
  try {
    await requireMusicActor();
    await resumeMusic();
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude reanudar la musica." };
  }
}

export async function previousMusicAction(): Promise<ActionResult> {
  try {
    await requireMusicActor();
    await previousMusic();
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude volver al track anterior." };
  }
}

export async function skipMusicAction(): Promise<ActionResult> {
  try {
    await requireMusicActor();
    await skipMusic();
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude saltar el track." };
  }
}

export async function setExpectedLocalPlayerAction(input: unknown): Promise<ActionResult> {
  try {
    await requireMusicAdmin();
    const parsed = expectedPlayerSchema.parse(input);
    await setExpectedLocalPlayer(parsed.providerPlayerId);
    await syncMusicEngine();
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude elegir el player del local." };
  }
}

export async function disconnectMusicProviderAction(): Promise<ActionResult> {
  try {
    await requireMusicAdmin();
    await disconnectMusicProvider();
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude desconectar Spotify." };
  }
}

export async function createScheduleRuleAction(input: unknown): Promise<ActionResult> {
  try {
    await requireMusicAdmin();
    const parsed = scheduleRuleSchema.parse(input);

    if (parsed.endTime <= parsed.startTime) {
      return { error: "La franja debe terminar despues de la hora de inicio." };
    }

    await saveScheduleRule({
      label: parsed.label,
      dayMask: parsed.dayMask as WeekdayKey[],
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      providerPlaylistRef: parsed.providerPlaylistRef,
    });

    await syncMusicEngine();
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude guardar la franja automatica." };
  }
}

export async function deleteScheduleRuleAction(ruleId: string): Promise<ActionResult> {
  try {
    await requireMusicAdmin();
    await deleteScheduleRule(ruleId);
    await syncMusicEngine();
    revalidateMusicSurfaces();
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No pude borrar la franja." };
  }
}
