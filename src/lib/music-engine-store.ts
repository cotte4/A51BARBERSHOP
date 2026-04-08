import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  barberos,
  musicAutoResumeState,
  musicEvents,
  musicModeState,
  musicProviderConnections,
  musicQueueItems,
  musicQueueSessions,
  musicRuntimeStatus,
} from "@/db/schema";
import { parseJamJoinPayload } from "@/lib/music-engine-helpers";
import type { MusicMode, MusicPlayerStatus, MusicProviderStatus } from "@/lib/music-types";

const MODE_SINGLETON_ID = "singleton";
const RUNTIME_SINGLETON_ID = "singleton";
const AUTO_RESUME_SINGLETON_ID = "singleton";
const PROVIDER_CONNECTION_ID = "spotify";

export async function ensureBootstrap() {
  const now = new Date();

  await db
    .insert(musicProviderConnections)
    .values({
      id: PROVIDER_CONNECTION_ID,
      provider: "spotify",
      status: "disconnected",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  await db
    .insert(musicModeState)
    .values({
      id: MODE_SINGLETON_ID,
      activeMode: "auto",
      jamEnabled: false,
      autoEnabled: true,
      runtimeState: "offline",
      updatedAt: now,
    })
    .onConflictDoNothing();

  await db
    .insert(musicRuntimeStatus)
    .values({
      id: RUNTIME_SINGLETON_ID,
      providerStatus: "disconnected",
      playerStatus: "missing",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  await db
    .insert(musicAutoResumeState)
    .values({
      id: AUTO_RESUME_SINGLETON_ID,
      resumeMode: "auto",
      resumePending: false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

export async function getModeRow() {
  await ensureBootstrap();
  const [row] = await db
    .select()
    .from(musicModeState)
    .where(eq(musicModeState.id, MODE_SINGLETON_ID))
    .limit(1);
  return row!;
}

export async function getRuntimeRow() {
  await ensureBootstrap();
  const [row] = await db
    .select()
    .from(musicRuntimeStatus)
    .where(eq(musicRuntimeStatus.id, RUNTIME_SINGLETON_ID))
    .limit(1);
  return row!;
}

export async function getAutoResumeRow() {
  await ensureBootstrap();
  const [row] = await db
    .select()
    .from(musicAutoResumeState)
    .where(eq(musicAutoResumeState.id, AUTO_RESUME_SINGLETON_ID))
    .limit(1);
  return row!;
}

export async function updateRuntimeStatus(input: {
  providerStatus: MusicProviderStatus;
  playerStatus: MusicPlayerStatus;
  degradedReason?: string | null;
  lastError?: string | null;
  lastPlaybackAttemptAt?: Date | null;
  lastPlaybackSuccessAt?: Date | null;
  activePlayerId?: string | null;
  lastPlayerSeenAt?: Date | null;
}) {
  await db
    .update(musicRuntimeStatus)
    .set({
      providerStatus: input.providerStatus,
      playerStatus: input.playerStatus,
      degradedReason: input.degradedReason ?? null,
      lastError: input.lastError ?? null,
      lastPlaybackAttemptAt: input.lastPlaybackAttemptAt ?? undefined,
      lastPlaybackSuccessAt: input.lastPlaybackSuccessAt ?? undefined,
      activePlayerId: input.activePlayerId ?? undefined,
      lastPlayerSeenAt: input.lastPlayerSeenAt ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(musicRuntimeStatus.id, RUNTIME_SINGLETON_ID));
}

export async function setModeState(input: Partial<typeof musicModeState.$inferInsert>) {
  await db
    .update(musicModeState)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(musicModeState.id, MODE_SINGLETON_ID));
}

export async function setAutoResumeState(
  input: Partial<typeof musicAutoResumeState.$inferInsert>,
) {
  await db
    .update(musicAutoResumeState)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(musicAutoResumeState.id, AUTO_RESUME_SINGLETON_ID));
}

export async function clearAutoResumeState() {
  await setAutoResumeState({
    resumeContextRef: null,
    resumeContextLabel: null,
    interruptionSource: null,
    interruptionTrackRef: null,
    resumePending: false,
    interruptedAt: null,
    resumedAt: new Date(),
    resumeAttempts: 0,
    lastError: null,
  });
}

export async function getActiveQueueSession(mode: MusicMode) {
  if (mode === "auto") return null;

  const [session] = await db
    .select()
    .from(musicQueueSessions)
    .where(and(eq(musicQueueSessions.mode, mode), eq(musicQueueSessions.status, "active")))
    .orderBy(desc(musicQueueSessions.startedAt))
    .limit(1);

  return session ?? null;
}

export async function getActiveJamSessionSummary() {
  const [session] = await db
    .select({
      id: musicQueueSessions.id,
      startedAt: musicQueueSessions.startedAt,
      createdByUserId: musicQueueSessions.createdByUserId,
      hostBarberoId: barberos.id,
      hostBarberoNombre: barberos.nombre,
    })
    .from(musicQueueSessions)
    .leftJoin(
      barberos,
      and(eq(barberos.userId, musicQueueSessions.createdByUserId), eq(barberos.activo, true)),
    )
    .where(and(eq(musicQueueSessions.mode, "jam"), eq(musicQueueSessions.status, "active")))
    .orderBy(desc(musicQueueSessions.startedAt))
    .limit(1);

  return session ?? null;
}

export async function ensureQueueSession(
  mode: Extract<MusicMode, "dj" | "jam">,
  createdByUserId: string,
) {
  const existing = await getActiveQueueSession(mode);
  if (existing) return existing;

  const [created] = await db
    .insert(musicQueueSessions)
    .values({
      mode,
      status: "active",
      createdByUserId,
    })
    .returning();

  return created;
}

export async function getSessionQueueRows(sessionId: string) {
  return db
    .select()
    .from(musicQueueItems)
    .where(eq(musicQueueItems.sessionId, sessionId))
    .orderBy(asc(musicQueueItems.positionHint), asc(musicQueueItems.createdAt));
}

export async function getSessionQueueSummaryRows(sessionId: string) {
  return db
    .select({
      id: musicQueueItems.id,
      sessionId: musicQueueItems.sessionId,
      sourceType: musicQueueItems.sourceType,
      ownerBarberoId: musicQueueItems.ownerBarberoId,
      ownerBarberoNombre: barberos.nombre,
      providerTrackRef: musicQueueItems.providerTrackRef,
      displayTitle: musicQueueItems.displayTitle,
      displayArtist: musicQueueItems.displayArtist,
      state: musicQueueItems.state,
      positionHint: musicQueueItems.positionHint,
      requiresPlayer: musicQueueItems.requiresPlayer,
      createdAt: musicQueueItems.createdAt,
      dispatchedAt: musicQueueItems.dispatchedAt,
    })
    .from(musicQueueItems)
    .leftJoin(barberos, eq(barberos.id, musicQueueItems.ownerBarberoId))
    .where(eq(musicQueueItems.sessionId, sessionId))
    .orderBy(asc(musicQueueItems.positionHint), asc(musicQueueItems.createdAt));
}

export async function hasJamParticipation(sessionId: string, barberoId: string) {
  const [existingTrack] = await db
    .select({
      id: musicQueueItems.id,
    })
    .from(musicQueueItems)
    .where(and(eq(musicQueueItems.sessionId, sessionId), eq(musicQueueItems.ownerBarberoId, barberoId)))
    .limit(1);

  if (existingTrack) {
    return true;
  }

  const joinEvents = await db
    .select()
    .from(musicEvents)
    .where(eq(musicEvents.eventType, "music.jam.joined"))
    .orderBy(desc(musicEvents.createdAt))
    .limit(80);

  return joinEvents.some((event) => {
    const payload = parseJamJoinPayload(event.payload);
    return payload?.sessionId === sessionId && payload.barberoId === barberoId;
  });
}

export async function markCompletedDispatchedItems(
  sessionId: string,
  playbackTrackUri: string | null,
) {
  const dispatchedItems = await db
    .select()
    .from(musicQueueItems)
    .where(and(eq(musicQueueItems.sessionId, sessionId), eq(musicQueueItems.state, "dispatched")))
    .orderBy(
      asc(musicQueueItems.dispatchedAt),
      asc(musicQueueItems.positionHint),
      asc(musicQueueItems.createdAt),
    );

  if (dispatchedItems.length === 0) {
    return;
  }

  const itemsToMarkPlayed: typeof dispatchedItems = [];

  if (playbackTrackUri) {
    const activeIndex = dispatchedItems.findIndex((item) => item.providerTrackRef === playbackTrackUri);
    if (activeIndex === -1) {
      itemsToMarkPlayed.push(...dispatchedItems);
    } else if (activeIndex > 0) {
      itemsToMarkPlayed.push(...dispatchedItems.slice(0, activeIndex));
    }
  }

  for (const item of itemsToMarkPlayed) {
    await db
      .update(musicQueueItems)
      .set({
        state: "played",
        playedAt: new Date(),
      })
      .where(eq(musicQueueItems.id, item.id));
  }
}

export async function closeQueueSession(sessionId: string) {
  await db
    .update(musicQueueSessions)
    .set({
      status: "ended",
      endedAt: new Date(),
    })
    .where(eq(musicQueueSessions.id, sessionId));
}
