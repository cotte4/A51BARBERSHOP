import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  barberos,
  musicAutoResumeState,
  musicEvents,
  musicModeState,
  musicPlayers,
  musicProviderConnections,
  musicQueueItems,
  musicQueueSessions,
  musicRuntimeStatus,
  musicScheduleRules,
} from "@/db/schema";
import type {
  MusicDashboardState,
  MusicMode,
  MusicPlayerStatus,
  MusicProposalSummary,
  MusicProviderStatus,
  MusicRuntimeState,
  MusicScheduleRuleSummary,
  WeekdayKey,
} from "@/lib/music-types";
import { WEEKDAY_OPTIONS } from "@/lib/music-types";
import { spotifyAdapter } from "@/lib/spotify-server";

const MODE_SINGLETON_ID = "singleton";
const RUNTIME_SINGLETON_ID = "singleton";
const AUTO_RESUME_SINGLETON_ID = "singleton";
const PROVIDER_CONNECTION_ID = "spotify";
const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

function getNowInArgentina() {
  return new Date();
}

function getWeekdayKey(date = getNowInArgentina()): WeekdayKey {
  const weekday = date.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: ARGENTINA_TIME_ZONE,
  });

  switch (weekday.toLowerCase()) {
    case "mon":
      return "mon";
    case "tue":
      return "tue";
    case "wed":
      return "wed";
    case "thu":
      return "thu";
    case "fri":
      return "fri";
    case "sat":
      return "sat";
    default:
      return "sun";
  }
}

function getTimeInArgentina(date = getNowInArgentina()) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(date);
}

function toMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function isoOrNull(date: Date | null | undefined) {
  return date ? date.toISOString() : null;
}

type TurnoProposalPayload = {
  turnoId: string | null;
  clienteNombre: string;
  cancion: string;
  spotifyTrackUri: string | null;
  barberoId: string | null;
  outcome?:
    | "proposal_created"
    | "playback_started"
    | "queued_in_jam"
    | "waiting_for_recovery"
    | "blocked_by_manual_dj"
    | "missing_track_uri";
  outcomeReason?: string | null;
  proposalStatus?: "pending" | "accepted" | "dismissed";
};

export type ClienteLlegoResult =
  | { kind: "playback_started"; eventId: string; mode: "auto" }
  | { kind: "queued_in_jam"; eventId: string; queueSessionId: string | null }
  | { kind: "proposal_created"; eventId: string; reason: string }
  | { kind: "waiting_for_recovery"; eventId: string; reason: string }
  | { kind: "blocked_by_manual_dj"; eventId: string; reason: string }
  | { kind: "missing_track_uri"; eventId: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseTurnoProposalPayload(payload: unknown): TurnoProposalPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const clienteNombre = typeof payload.clienteNombre === "string" ? payload.clienteNombre.trim() : "";
  const cancion = typeof payload.cancion === "string" ? payload.cancion.trim() : "";
  if (!clienteNombre || !cancion) {
    return null;
  }

  const proposalStatus =
    payload.proposalStatus === "accepted" || payload.proposalStatus === "dismissed"
      ? payload.proposalStatus
      : "pending";

  return {
    turnoId: typeof payload.turnoId === "string" ? payload.turnoId : null,
    clienteNombre,
    cancion,
    spotifyTrackUri: typeof payload.spotifyTrackUri === "string" ? payload.spotifyTrackUri : null,
    barberoId: typeof payload.barberoId === "string" ? payload.barberoId : null,
    outcome:
      payload.outcome === "proposal_created" ||
      payload.outcome === "playback_started" ||
      payload.outcome === "queued_in_jam" ||
      payload.outcome === "waiting_for_recovery" ||
      payload.outcome === "blocked_by_manual_dj" ||
      payload.outcome === "missing_track_uri"
        ? payload.outcome
        : undefined,
    outcomeReason: typeof payload.outcomeReason === "string" ? payload.outcomeReason : null,
    proposalStatus,
  };
}

function formatProposal(
  event: typeof musicEvents.$inferSelect,
  payload: TurnoProposalPayload,
): MusicProposalSummary {
  return {
    id: event.id,
    turnoId: payload.turnoId,
    clienteNombre: payload.clienteNombre,
    cancion: payload.cancion,
    spotifyTrackUri: payload.spotifyTrackUri,
    barberoId: payload.barberoId,
    createdAt: event.createdAt.toISOString(),
    status: payload.proposalStatus ?? "pending",
  };
}

function formatScheduleRule(rule: typeof musicScheduleRules.$inferSelect): MusicScheduleRuleSummary {
  return {
    id: rule.id,
    label: rule.label,
    dayMask: (rule.dayMask ?? []) as WeekdayKey[],
    startTime: rule.startTime,
    endTime: rule.endTime,
    providerPlaylistRef: rule.providerPlaylistRef,
    enabled: rule.enabled ?? true,
    priority: rule.priority ?? 0,
  };
}

async function logMusicEvent(eventType: string, payload: Record<string, unknown>) {
  await db.insert(musicEvents).values({
    eventType,
    payload,
  });
}

async function getProposalEventRow(eventId: string) {
  const [event] = await db
    .select()
    .from(musicEvents)
    .where(eq(musicEvents.id, eventId))
    .limit(1);
  return event ?? null;
}

async function updateProposalStatus(
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

async function ensureBootstrap() {
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

async function getModeRow() {
  await ensureBootstrap();
  const [row] = await db
    .select()
    .from(musicModeState)
    .where(eq(musicModeState.id, MODE_SINGLETON_ID))
    .limit(1);
  return row!;
}

async function getRuntimeRow() {
  await ensureBootstrap();
  const [row] = await db
    .select()
    .from(musicRuntimeStatus)
    .where(eq(musicRuntimeStatus.id, RUNTIME_SINGLETON_ID))
    .limit(1);
  return row!;
}

async function getAutoResumeRow() {
  await ensureBootstrap();
  const [row] = await db
    .select()
    .from(musicAutoResumeState)
    .where(eq(musicAutoResumeState.id, AUTO_RESUME_SINGLETON_ID))
    .limit(1);
  return row!;
}

async function updateRuntimeStatus(input: {
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

async function setModeState(input: Partial<typeof musicModeState.$inferInsert>) {
  await db
    .update(musicModeState)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(musicModeState.id, MODE_SINGLETON_ID));
}

async function setAutoResumeState(
  input: Partial<typeof musicAutoResumeState.$inferInsert>
) {
  await db
    .update(musicAutoResumeState)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(musicAutoResumeState.id, AUTO_RESUME_SINGLETON_ID));
}

async function clearAutoResumeState() {
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

async function syncPlayersFromSpotify() {
  const provider = await spotifyAdapter.getConnection();

  if (provider.status !== "connected") {
    await updateRuntimeStatus({
      providerStatus: provider.status,
      playerStatus: "missing",
      degradedReason: provider.status === "disconnected" ? "Spotify no esta conectado." : null,
      lastError: provider.lastError,
      activePlayerId: null,
      lastPlayerSeenAt: null,
    });
    return {
      runtimeState: "offline" as MusicRuntimeState,
      activePlayerId: null as string | null,
      activePlayerProviderId: null as string | null,
    };
  }

  try {
    const remotePlayers = await spotifyAdapter.listPlayers();
    const existingPlayers = await db
      .select()
      .from(musicPlayers)
      .where(eq(musicPlayers.provider, "spotify"));

    const seenIds = new Set(remotePlayers.map((player) => player.providerPlayerId));

    for (const player of existingPlayers) {
      if (seenIds.has(player.providerPlayerId)) continue;
      await db
        .update(musicPlayers)
        .set({
          status: "missing",
          updatedAt: new Date(),
        })
        .where(eq(musicPlayers.id, player.id));
    }

    for (const player of remotePlayers) {
      await db
        .insert(musicPlayers)
        .values({
          provider: "spotify",
          providerPlayerId: player.providerPlayerId,
          name: player.name,
          kind: player.kind,
          status: player.status,
          isDefault: player.isDefault,
          lastSeenAt: player.lastSeenAt,
          lastError: player.lastError,
          updatedAt: new Date(),
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [musicPlayers.provider, musicPlayers.providerPlayerId],
          set: {
            name: player.name,
            kind: player.kind,
            status: player.status,
            isDefault: player.isDefault,
            lastSeenAt: player.lastSeenAt,
            lastError: player.lastError,
            updatedAt: new Date(),
          },
        });
    }

    const refreshedPlayers = await db
      .select()
      .from(musicPlayers)
      .where(eq(musicPlayers.provider, "spotify"));

    const expectedReadyPlayer =
      refreshedPlayers.find((player) => player.isExpectedLocalPlayer && player.status === "ready") ??
      null;
    const defaultReadyPlayer =
      refreshedPlayers.find((player) => player.isDefault && player.status === "ready") ?? null;
    const fallbackReadyPlayer =
      refreshedPlayers.find((player) => player.status === "ready") ?? null;
    const chosenPlayer = expectedReadyPlayer ?? defaultReadyPlayer ?? fallbackReadyPlayer;

    if (!chosenPlayer) {
      await updateRuntimeStatus({
        providerStatus: "connected",
        playerStatus: "missing",
        degradedReason:
          refreshedPlayers.find((player) => player.isExpectedLocalPlayer) != null
            ? "El player esperado del local no esta disponible."
            : "No encontramos un player activo de Spotify.",
        lastError: null,
        activePlayerId: null,
        lastPlayerSeenAt: null,
      });

      return {
        runtimeState: "degraded" as MusicRuntimeState,
        activePlayerId: null as string | null,
        activePlayerProviderId: null as string | null,
      };
    }

    await updateRuntimeStatus({
      providerStatus: "connected",
      playerStatus: chosenPlayer.status as MusicPlayerStatus,
      degradedReason: null,
      lastError: null,
      activePlayerId: chosenPlayer.id,
      lastPlayerSeenAt: chosenPlayer.lastSeenAt ?? new Date(),
    });

    return {
      runtimeState: "ready" as MusicRuntimeState,
      activePlayerId: chosenPlayer.id,
      activePlayerProviderId: chosenPlayer.providerPlayerId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pude sincronizar players.";
    await updateRuntimeStatus({
      providerStatus: "error",
      playerStatus: "error",
      degradedReason: "Spotify no pudo listar players en este momento.",
      lastError: message,
      activePlayerId: null,
      lastPlayerSeenAt: null,
    });

    return {
      runtimeState: "offline" as MusicRuntimeState,
      activePlayerId: null as string | null,
      activePlayerProviderId: null as string | null,
    };
  }
}

async function getCurrentScheduleRule() {
  const weekday = getWeekdayKey();
  const nowMinutes = toMinutes(getTimeInArgentina());
  const rules = await db
    .select()
    .from(musicScheduleRules)
    .where(eq(musicScheduleRules.enabled, true))
    .orderBy(asc(musicScheduleRules.priority), asc(musicScheduleRules.startTime));

  return (
    rules.find((rule) => {
      const dayMask = (rule.dayMask ?? []) as WeekdayKey[];
      if (dayMask.length > 0 && !dayMask.includes(weekday)) {
        return false;
      }

      const start = toMinutes(rule.startTime);
      const end = toMinutes(rule.endTime);
      return nowMinutes >= start && nowMinutes < end;
    }) ?? null
  );
}

async function ensureAutoPlayback(deviceId: string | null) {
  const mode = await getModeRow();
  if (!mode.autoEnabled || mode.activeMode !== "auto" || !deviceId) {
    return;
  }

  const rule = await getCurrentScheduleRule();
  if (!rule) return;

  const playback = await spotifyAdapter.getPlaybackState();
  if (playback?.contextUri === rule.providerPlaylistRef && playback.isPlaying) {
    return;
  }

  await updateRuntimeStatus({
    providerStatus: "connected",
    playerStatus: "ready",
    lastPlaybackAttemptAt: new Date(),
  });

  await spotifyAdapter.play({
    kind: "playlist",
    uri: rule.providerPlaylistRef,
    deviceId,
  });

  await updateRuntimeStatus({
    providerStatus: "connected",
    playerStatus: "ready",
    lastPlaybackAttemptAt: new Date(),
    lastPlaybackSuccessAt: new Date(),
    lastError: null,
  });

  await logMusicEvent("music.auto.playlist_started", {
    ruleId: rule.id,
    playlistRef: rule.providerPlaylistRef,
  });
}

async function attemptAutoResume(deviceId: string | null) {
  if (!deviceId) return;

  const resumeState = await getAutoResumeRow();
  if (!resumeState.resumePending) {
    return;
  }

  const playback = await spotifyAdapter.getPlaybackState().catch(() => null);
  if (
    resumeState.resumeContextRef &&
    playback?.contextUri === resumeState.resumeContextRef &&
    playback.isPlaying
  ) {
    await clearAutoResumeState();
    await logMusicEvent("music.auto.resumed_after_arrival", {
      resumeContextRef: resumeState.resumeContextRef,
      interruptionTrackRef: resumeState.interruptionTrackRef,
      completedWithoutCommand: true,
    });
    return;
  }

  if (
    resumeState.interruptionTrackRef &&
    playback?.item?.uri === resumeState.interruptionTrackRef &&
    playback.isPlaying
  ) {
    return;
  }

  if (!resumeState.resumeContextRef) {
    await clearAutoResumeState();
    await logMusicEvent("music.auto.resume_cleared", {
      reason: "missing_resume_context",
      interruptionTrackRef: resumeState.interruptionTrackRef,
    });
    return;
  }

  try {
    await updateRuntimeStatus({
      providerStatus: "connected",
      playerStatus: "ready",
      lastPlaybackAttemptAt: new Date(),
    });

    await spotifyAdapter.play({
      kind: "playlist",
      uri: resumeState.resumeContextRef,
      deviceId,
    });

    await updateRuntimeStatus({
      providerStatus: "connected",
      playerStatus: "ready",
      lastPlaybackAttemptAt: new Date(),
      lastPlaybackSuccessAt: new Date(),
      lastError: null,
    });

    await clearAutoResumeState();
    await logMusicEvent("music.auto.resumed_after_arrival", {
      resumeContextRef: resumeState.resumeContextRef,
      resumeContextLabel: resumeState.resumeContextLabel,
      interruptionTrackRef: resumeState.interruptionTrackRef,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pude reanudar AUTO.";
    await setAutoResumeState({
      resumeAttempts: (resumeState.resumeAttempts ?? 0) + 1,
      lastError: message,
    });

    await logMusicEvent("music.auto.resume_failed", {
      resumeContextRef: resumeState.resumeContextRef,
      interruptionTrackRef: resumeState.interruptionTrackRef,
      error: message,
    });
  }
}

async function getActiveQueueSession(mode: MusicMode) {
  if (mode === "auto") return null;

  const [session] = await db
    .select()
    .from(musicQueueSessions)
    .where(and(eq(musicQueueSessions.mode, mode), eq(musicQueueSessions.status, "active")))
    .orderBy(desc(musicQueueSessions.startedAt))
    .limit(1);

  return session ?? null;
}

async function ensureQueueSession(mode: Extract<MusicMode, "dj" | "jam">, createdByUserId: string) {
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

function getQueueOwnerKey(item: {
  ownerBarberoId: string | null;
  id: string;
}) {
  return item.ownerBarberoId ?? `anon:${item.id}`;
}

function buildJamDispatchOrder<
  T extends {
    id: string;
    ownerBarberoId: string | null;
    positionHint: number;
    createdAt: Date;
  },
>(items: T[], lastOwnerBarberoId: string | null): T[] {
  if (items.length <= 1) {
    return items;
  }

  const buckets = new Map<string, T[]>();
  const ownerOrder: string[] = [];

  for (const item of items) {
    const ownerKey = getQueueOwnerKey(item);
    const bucket = buckets.get(ownerKey);
    if (bucket) {
      bucket.push(item);
      continue;
    }

    buckets.set(ownerKey, [item]);
    ownerOrder.push(ownerKey);
  }

  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => {
      if (a.positionHint !== b.positionHint) {
        return a.positionHint - b.positionHint;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  const normalizedLastOwner = lastOwnerBarberoId
    ? ownerOrder.find((ownerKey) => ownerKey === lastOwnerBarberoId) ?? null
    : null;

  let ownerIndex =
    normalizedLastOwner == null ? 0 : (ownerOrder.indexOf(normalizedLastOwner) + 1) % ownerOrder.length;
  const ordered: T[] = [];

  while (ordered.length < items.length) {
    let appended = false;

    for (let offset = 0; offset < ownerOrder.length; offset += 1) {
      const currentIndex = (ownerIndex + offset) % ownerOrder.length;
      const ownerKey = ownerOrder[currentIndex];
      const bucket = buckets.get(ownerKey);
      const nextItem = bucket?.shift();

      if (!nextItem) {
        continue;
      }

      ordered.push(nextItem);
      ownerIndex = (currentIndex + 1) % ownerOrder.length;
      appended = true;
      break;
    }

    if (!appended) {
      break;
    }
  }

  return ordered;
}

async function getSessionQueueRows(sessionId: string) {
  return db
    .select()
    .from(musicQueueItems)
    .where(eq(musicQueueItems.sessionId, sessionId))
    .orderBy(asc(musicQueueItems.positionHint), asc(musicQueueItems.createdAt));
}

async function markCompletedDispatchedItems(
  sessionId: string,
  playbackTrackUri: string | null,
) {
  const dispatchedItems = await db
    .select()
    .from(musicQueueItems)
    .where(and(eq(musicQueueItems.sessionId, sessionId), eq(musicQueueItems.state, "dispatched")))
    .orderBy(asc(musicQueueItems.dispatchedAt), asc(musicQueueItems.positionHint), asc(musicQueueItems.createdAt));

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

async function closeQueueSession(sessionId: string) {
  await db
    .update(musicQueueSessions)
    .set({
      status: "ended",
      endedAt: new Date(),
    })
    .where(eq(musicQueueSessions.id, sessionId));
}

async function maybeReturnJamToAuto(userId: string | null | undefined) {
  const session = await getActiveQueueSession("jam");
  if (!session) {
    return;
  }

  const queueRows = await getSessionQueueRows(session.id);
  const hasPendingItems = queueRows.some((item) => item.state === "queued" || item.state === "dispatched");
  if (hasPendingItems) {
    return;
  }

  await closeQueueSession(session.id);
  await setModeState({
    activeMode: "auto",
    jamEnabled: false,
    autoEnabled: true,
    manualOwnerBarberoId: null,
    manualOwnerUserId: null,
    pendingContextRef: null,
    pendingContextLabel: null,
    updatedByUserId: userId ?? null,
  });

  await logMusicEvent("music.jam.returned_to_auto", {
    sessionId: session.id,
  });
}

async function dispatchQueuedItems(mode: Extract<MusicMode, "dj" | "jam">, deviceId: string | null) {
  if (!deviceId) return;
  const session = await getActiveQueueSession(mode);
  if (!session) return;

  const queuedItems = await db
    .select()
    .from(musicQueueItems)
    .where(and(eq(musicQueueItems.sessionId, session.id), eq(musicQueueItems.state, "queued")))
    .orderBy(asc(musicQueueItems.positionHint), asc(musicQueueItems.createdAt));

  if (queuedItems.length === 0) {
    return;
  }

  const playback = await spotifyAdapter.getPlaybackState();
  const [lastDispatchedItem] = await db
    .select({
      ownerBarberoId: musicQueueItems.ownerBarberoId,
    })
    .from(musicQueueItems)
    .where(and(eq(musicQueueItems.sessionId, session.id), eq(musicQueueItems.state, "dispatched")))
    .orderBy(desc(musicQueueItems.dispatchedAt), desc(musicQueueItems.createdAt))
    .limit(1);
  const orderedQueuedItems =
    mode === "jam"
      ? buildJamDispatchOrder(queuedItems, lastDispatchedItem?.ownerBarberoId ?? null)
      : queuedItems;
  let index = 0;

  if (!playback?.isPlaying) {
    const first = orderedQueuedItems[0];
    await updateRuntimeStatus({
      providerStatus: "connected",
      playerStatus: "ready",
      lastPlaybackAttemptAt: new Date(),
    });
    await spotifyAdapter.play({
      kind: "track",
      uri: first.providerTrackRef,
      deviceId,
    });
    await db
      .update(musicQueueItems)
      .set({
        state: "dispatched",
        dispatchedAt: new Date(),
      })
      .where(eq(musicQueueItems.id, first.id));
    await updateRuntimeStatus({
      providerStatus: "connected",
      playerStatus: "ready",
      lastPlaybackAttemptAt: new Date(),
      lastPlaybackSuccessAt: new Date(),
      lastError: null,
    });
    index = 1;
  }

  for (const item of orderedQueuedItems.slice(index)) {
    await spotifyAdapter.enqueue(item.providerTrackRef, deviceId);
    await db
      .update(musicQueueItems)
      .set({
        state: "dispatched",
        dispatchedAt: new Date(),
      })
      .where(eq(musicQueueItems.id, item.id));
  }

  if (orderedQueuedItems.length > 0) {
    await logMusicEvent("music.queue.dispatched", {
      mode,
      count: orderedQueuedItems.length,
    });
  }
}

async function processPendingDjContext(deviceId: string | null) {
  const mode = await getModeRow();
  if (mode.activeMode !== "dj" || !mode.pendingContextRef || !deviceId) {
    return;
  }

  await updateRuntimeStatus({
    providerStatus: "connected",
    playerStatus: "ready",
    lastPlaybackAttemptAt: new Date(),
  });

  await spotifyAdapter.play({
    kind: "playlist",
    uri: mode.pendingContextRef,
    deviceId,
  });

  await setModeState({
    pendingContextRef: null,
    pendingContextLabel: null,
  });

  await updateRuntimeStatus({
    providerStatus: "connected",
    playerStatus: "ready",
    lastPlaybackAttemptAt: new Date(),
    lastPlaybackSuccessAt: new Date(),
    lastError: null,
  });

  await logMusicEvent("music.dj.pending_playlist_started", {
    playlistRef: mode.pendingContextRef,
  });
}

export async function syncMusicEngine() {
  await ensureBootstrap();
  const runtime = await syncPlayersFromSpotify();
  let mode = await getModeRow();

  await setModeState({
    runtimeState: runtime.runtimeState,
  });

  if (runtime.runtimeState !== "ready") {
    return runtime.runtimeState;
  }

  const playback = await spotifyAdapter.getPlaybackState().catch(() => null);
  if (mode.activeMode === "jam") {
    const session = await getActiveQueueSession("jam");
    if (session) {
      await markCompletedDispatchedItems(session.id, playback?.item?.uri ?? null);
      await maybeReturnJamToAuto(mode.manualOwnerUserId);
      mode = await getModeRow();
    }
  }

  await processPendingDjContext(runtime.activePlayerProviderId);

  if (mode.activeMode === "auto") {
    await attemptAutoResume(runtime.activePlayerProviderId);
    await ensureAutoPlayback(runtime.activePlayerProviderId);
    return "ready";
  }

  if (mode.activeMode === "dj" || mode.activeMode === "jam") {
    await dispatchQueuedItems(mode.activeMode, runtime.activePlayerProviderId);
  }

  return "ready";
}

export async function getMusicDashboardState(options: { sync?: boolean } = {}): Promise<MusicDashboardState> {
  await ensureBootstrap();
  if (options.sync) {
    await syncMusicEngine();
  }

  const mode = await getModeRow();
  const [provider, runtime, players, schedules, autoResume, playback, queueSession, playlists, recentEvents] = await Promise.all([
    db
      .select()
      .from(musicProviderConnections)
      .where(eq(musicProviderConnections.id, PROVIDER_CONNECTION_ID))
      .limit(1)
      .then((rows) => rows[0]),
    getRuntimeRow(),
    db
      .select()
      .from(musicPlayers)
      .where(eq(musicPlayers.provider, "spotify"))
      .orderBy(
        desc(musicPlayers.isExpectedLocalPlayer),
        desc(musicPlayers.isDefault),
        asc(musicPlayers.name),
      ),
    db
      .select()
      .from(musicScheduleRules)
      .orderBy(asc(musicScheduleRules.priority), asc(musicScheduleRules.startTime)),
    getAutoResumeRow(),
    spotifyAdapter.getPlaybackState().catch(() => null),
    getActiveQueueSession(mode.activeMode as MusicMode),
    spotifyAdapter.listPlaylists().catch(() => []),
    db
      .select()
      .from(musicEvents)
      .where(eq(musicEvents.eventType, "turno.cliente_llego"))
      .orderBy(desc(musicEvents.createdAt))
      .limit(20),
  ]);

  const activeSessionId = queueSession?.id ?? null;
  const queueRows =
    activeSessionId == null
      ? []
      : await db
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
          .where(eq(musicQueueItems.sessionId, activeSessionId))
          .orderBy(asc(musicQueueItems.positionHint), asc(musicQueueItems.createdAt));

  const proposals = recentEvents
    .map((event) => {
      const payload = parseTurnoProposalPayload(event.payload);
      return payload ? formatProposal(event, payload) : null;
    })
    .filter((proposal): proposal is MusicProposalSummary => proposal !== null)
    .filter((proposal) => proposal.status === "pending");

  return {
    provider: {
      provider: "spotify",
      status: (provider?.status as MusicProviderStatus) ?? "disconnected",
      connected: provider?.status === "connected",
      expiresAt: isoOrNull(provider?.expiresAt),
      lastError: provider?.lastError ?? null,
    },
    runtime: {
      state:
        provider?.status !== "connected"
          ? "offline"
          : runtime.playerStatus === "ready"
            ? "ready"
            : runtime.playerStatus === "missing"
              ? "degraded"
              : "offline",
      playerStatus: runtime.playerStatus as MusicPlayerStatus,
      degradedReason: runtime.degradedReason,
      lastPlaybackSuccessAt: isoOrNull(runtime.lastPlaybackSuccessAt),
      lastPlaybackAttemptAt: isoOrNull(runtime.lastPlaybackAttemptAt),
      lastError: runtime.lastError,
    },
    mode: {
      activeMode: mode.activeMode as MusicMode,
      autoEnabled: mode.autoEnabled,
      jamEnabled: mode.jamEnabled,
      manualOwnerBarberoId: mode.manualOwnerBarberoId,
      manualOwnerUserId: mode.manualOwnerUserId,
      pendingContextLabel: mode.pendingContextLabel,
    },
    players: players.map((player) => ({
      id: player.id,
      providerPlayerId: player.providerPlayerId,
      name: player.name,
      kind: player.kind,
      status: player.status as MusicPlayerStatus,
      isDefault: player.isDefault,
      isExpectedLocalPlayer: player.isExpectedLocalPlayer,
      lastSeenAt: isoOrNull(player.lastSeenAt),
      lastError: player.lastError,
    })),
    schedules: schedules.map(formatScheduleRule),
    autoResume: {
      pending: autoResume.resumePending,
      resumeMode: "auto",
      resumeContextRef: autoResume.resumeContextRef,
      resumeContextLabel: autoResume.resumeContextLabel,
      interruptionSource: autoResume.interruptionSource,
      interruptionTrackRef: autoResume.interruptionTrackRef,
      interruptedAt: isoOrNull(autoResume.interruptedAt),
      resumedAt: isoOrNull(autoResume.resumedAt),
      resumeAttempts: autoResume.resumeAttempts,
      lastError: autoResume.lastError,
    },
    queue: {
      activeSessionId,
      items: queueRows.map((item) => ({
        id: item.id,
        sessionId: item.sessionId,
        sourceType: item.sourceType as "dj" | "jam" | "system",
        ownerBarberoId: item.ownerBarberoId,
        ownerBarberoNombre: item.ownerBarberoNombre,
        providerTrackRef: item.providerTrackRef,
        displayTitle: item.displayTitle,
        displayArtist: item.displayArtist,
        state: item.state as "queued" | "dispatched" | "played" | "skipped",
        positionHint: item.positionHint,
        requiresPlayer: item.requiresPlayer,
        createdAt: item.createdAt.toISOString(),
        dispatchedAt: isoOrNull(item.dispatchedAt),
      })),
    },
    proposals,
    nowPlaying: playback?.item
      ? {
          trackName: playback.item.name,
          artists: playback.item.artists,
          albumName: playback.item.albumName,
          albumImageUrl: playback.item.albumImageUrl,
          deviceName: playback.device?.name ?? null,
          isPlaying: playback.isPlaying,
          contextUri: playback.contextUri,
          contextType: playback.contextType,
        }
      : null,
    playlists: playlists.map((playlist) => ({
      id: playlist.id,
      uri: playlist.uri,
      name: playlist.name,
      imageUrl: playlist.imageUrl,
      trackCount: playlist.trackCount,
      ownerName: playlist.ownerName,
    })),
  };
}

export async function setExpectedLocalPlayer(providerPlayerId: string) {
  await ensureBootstrap();
  await syncMusicEngine();

  const players = await db
    .select()
    .from(musicPlayers)
    .where(eq(musicPlayers.provider, "spotify"));

  const target = players.find((player) => player.providerPlayerId === providerPlayerId);
  if (!target) {
    throw new Error("No encontramos ese player en Spotify.");
  }

  await db
    .update(musicPlayers)
    .set({
      isExpectedLocalPlayer: false,
      updatedAt: new Date(),
    })
    .where(eq(musicPlayers.provider, "spotify"));
  await db
    .update(musicPlayers)
    .set({
      isExpectedLocalPlayer: true,
      updatedAt: new Date(),
    })
    .where(eq(musicPlayers.id, target.id));

  await logMusicEvent("music.player.expected_updated", {
    providerPlayerId,
    playerName: target.name,
  });
}

export async function disconnectMusicProvider() {
  await spotifyAdapter.disconnect();
  await db.update(musicPlayers).set({
    status: "missing",
    updatedAt: new Date(),
  });
  await updateRuntimeStatus({
    providerStatus: "disconnected",
    playerStatus: "missing",
    degradedReason: "Spotify no esta conectado.",
    lastError: null,
    activePlayerId: null,
    lastPlayerSeenAt: null,
  });
}

export async function upsertSpotifyConnection(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}) {
  await spotifyAdapter.connect(tokens);
  await syncMusicEngine();
}

async function createTurnoArrivalEvent(input: {
  turnoId: string;
  clienteNombre: string;
  cancion: string;
  spotifyTrackUri: string | null;
  barberoId: string | null;
  proposalStatus: "pending" | "accepted" | "dismissed";
  outcome: NonNullable<TurnoProposalPayload["outcome"]>;
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

function getPreferredActivePlayerId(players: MusicDashboardState["players"]) {
  return (
    players.find((player) => player.isExpectedLocalPlayer && player.status === "ready")
      ?.providerPlayerId ??
    players.find((player) => player.isDefault && player.status === "ready")?.providerPlayerId ??
    players.find((player) => player.status === "ready")?.providerPlayerId ??
    null
  );
}

export async function handleClienteLlego(input: {
  turnoId: string;
  clienteNombre: string;
  cancion: string;
  spotifyTrackUri: string | null;
  barberoId: string | null;
  triggeredByUserId: string;
  triggeredByBarberoId: string | null;
}): Promise<ClienteLlegoResult> {
  await ensureBootstrap();
  await syncMusicEngine();

  const mode = await getModeRow();

  if (!input.spotifyTrackUri) {
    const event = await createTurnoArrivalEvent({
      turnoId: input.turnoId,
      clienteNombre: input.clienteNombre,
      cancion: input.cancion,
      spotifyTrackUri: null,
      barberoId: input.barberoId,
      proposalStatus: "pending",
      outcome: "missing_track_uri",
    });

    await logMusicEvent("turno.cliente_llego.missing_track_uri", {
      turnoId: input.turnoId,
      eventId: event.id,
      clienteNombre: input.clienteNombre,
    });

    return {
      kind: "missing_track_uri",
      eventId: event.id,
    };
  }

  const dashboard = await getMusicDashboardState();
  const providerReady = dashboard.provider.connected;
  const runtimeReady = dashboard.runtime.state === "ready";
  const activePlayerId = getPreferredActivePlayerId(dashboard.players);

  if (!providerReady || !runtimeReady || !activePlayerId) {
    const reason =
      dashboard.runtime.degradedReason ??
      (providerReady ? "No encontramos un player listo en el local." : "Spotify no esta conectado.");
    const event = await createTurnoArrivalEvent({
      turnoId: input.turnoId,
      clienteNombre: input.clienteNombre,
      cancion: input.cancion,
      spotifyTrackUri: input.spotifyTrackUri,
      barberoId: input.barberoId,
      proposalStatus: "pending",
      outcome: "waiting_for_recovery",
      outcomeReason: reason,
    });

    await logMusicEvent("turno.cliente_llego.waiting_for_recovery", {
      turnoId: input.turnoId,
      eventId: event.id,
      reason,
    });

    return {
      kind: "waiting_for_recovery",
      eventId: event.id,
      reason,
    };
  }

  if (mode.activeMode === "jam") {
    const beforeState = await getMusicDashboardState();
    await queueTrack({
      mode: "jam",
      userId: input.triggeredByUserId,
      barberoId: input.barberoId ?? input.triggeredByBarberoId,
      trackUri: input.spotifyTrackUri,
      trackName: input.cancion,
      artistName: null,
    });

    const afterState = await getMusicDashboardState();
    const event = await createTurnoArrivalEvent({
      turnoId: input.turnoId,
      clienteNombre: input.clienteNombre,
      cancion: input.cancion,
      spotifyTrackUri: input.spotifyTrackUri,
      barberoId: input.barberoId,
      proposalStatus: "accepted",
      outcome: "queued_in_jam",
    });

    await logMusicEvent("turno.cliente_llego.queued", {
      turnoId: input.turnoId,
      eventId: event.id,
      mode: "jam",
      queueBefore: beforeState.queue.items.length,
      queueAfter: afterState.queue.items.length,
      activeSessionId: afterState.queue.activeSessionId,
    });

    return {
      kind: "queued_in_jam",
      eventId: event.id,
      queueSessionId: afterState.queue.activeSessionId,
    };
  }

  if (mode.activeMode === "dj") {
    const reason = "DJ esta activo; dejamos la cancion como propuesta para no pisar al operador.";
    const event = await createTurnoArrivalEvent({
      turnoId: input.turnoId,
      clienteNombre: input.clienteNombre,
      cancion: input.cancion,
      spotifyTrackUri: input.spotifyTrackUri,
      barberoId: input.barberoId,
      proposalStatus: "pending",
      outcome: "blocked_by_manual_dj",
      outcomeReason: reason,
    });

    await logMusicEvent("turno.cliente_llego.blocked_by_manual_dj", {
      turnoId: input.turnoId,
      eventId: event.id,
    });

    return {
      kind: "blocked_by_manual_dj",
      eventId: event.id,
      reason,
    };
  }

  await updateRuntimeStatus({
    providerStatus: "connected",
    playerStatus: "ready",
    lastPlaybackAttemptAt: new Date(),
  });

  const playbackBeforeArrival = await spotifyAdapter.getPlaybackState().catch(() => null);
  const activeRule = await getCurrentScheduleRule();
  const resumeContextRef = playbackBeforeArrival?.contextUri ?? activeRule?.providerPlaylistRef ?? null;
  const resumeContextLabel = activeRule?.label ?? (resumeContextRef ? "AUTO" : null);

  await setAutoResumeState({
    resumeMode: "auto",
    resumeContextRef,
    resumeContextLabel,
    interruptionSource: "turno_llego",
    interruptionTrackRef: input.spotifyTrackUri,
    resumePending: Boolean(resumeContextRef),
    interruptedAt: new Date(),
    resumedAt: null,
    resumeAttempts: 0,
    lastError: null,
  });

  await spotifyAdapter.play({
    kind: "track",
    uri: input.spotifyTrackUri,
    deviceId: activePlayerId,
  });

  await updateRuntimeStatus({
    providerStatus: "connected",
    playerStatus: "ready",
    lastPlaybackAttemptAt: new Date(),
    lastPlaybackSuccessAt: new Date(),
    lastError: null,
  });

  const event = await createTurnoArrivalEvent({
    turnoId: input.turnoId,
    clienteNombre: input.clienteNombre,
    cancion: input.cancion,
    spotifyTrackUri: input.spotifyTrackUri,
    barberoId: input.barberoId,
    proposalStatus: "accepted",
    outcome: "playback_started",
  });

  await logMusicEvent("turno.cliente_llego.playback_started", {
    turnoId: input.turnoId,
    eventId: event.id,
    mode: "auto",
    playerId: activePlayerId,
    trackUri: input.spotifyTrackUri,
    resumeContextRef,
    resumeContextLabel,
  });

  if (resumeContextRef) {
    await logMusicEvent("music.auto.interrupted_for_arrival", {
      turnoId: input.turnoId,
      eventId: event.id,
      interruptionTrackRef: input.spotifyTrackUri,
      resumeContextRef,
      resumeContextLabel,
    });
  }

  return {
    kind: "playback_started",
    eventId: event.id,
    mode: "auto",
  };
}

export async function saveScheduleRule(input: {
  label: string;
  dayMask: WeekdayKey[];
  startTime: string;
  endTime: string;
  providerPlaylistRef: string;
}) {
  await db.insert(musicScheduleRules).values({
    label: input.label,
    dayMask: input.dayMask,
    startTime: input.startTime,
    endTime: input.endTime,
    providerPlaylistRef: input.providerPlaylistRef,
    priority: toMinutes(input.startTime),
    enabled: true,
  });

  await logMusicEvent("music.schedule.created", input);
}

export async function deleteScheduleRule(ruleId: string) {
  await db.delete(musicScheduleRules).where(eq(musicScheduleRules.id, ruleId));
}

export async function setAutoMode(userId: string) {
  const activeSessions = await db
    .select()
    .from(musicQueueSessions)
    .where(eq(musicQueueSessions.status, "active"));

  for (const session of activeSessions) {
    await db
      .update(musicQueueSessions)
      .set({
        status: "ended",
        endedAt: new Date(),
      })
      .where(eq(musicQueueSessions.id, session.id));
  }

  await setModeState({
    activeMode: "auto",
    jamEnabled: false,
    autoEnabled: true,
    manualOwnerBarberoId: null,
    manualOwnerUserId: null,
    pendingContextRef: null,
    pendingContextLabel: null,
    updatedByUserId: userId,
  });

  await clearAutoResumeState();

  await syncMusicEngine();
}

export async function activateDjMode(input: {
  userId: string;
  barberoId: string | null;
}) {
  const jamSession = await getActiveQueueSession("jam");
  if (jamSession) {
    await closeQueueSession(jamSession.id);
  }

  await setModeState({
    activeMode: "dj",
    jamEnabled: false,
    autoEnabled: false,
    manualOwnerBarberoId: input.barberoId,
    manualOwnerUserId: input.userId,
    updatedByUserId: input.userId,
  });

  await clearAutoResumeState();
}

export async function activateJamMode(input: {
  userId: string;
  barberoId: string | null;
}) {
  const djSession = await getActiveQueueSession("dj");
  if (djSession) {
    await closeQueueSession(djSession.id);
  }

  await ensureQueueSession("jam", input.userId);
  await setModeState({
    activeMode: "jam",
    jamEnabled: true,
    autoEnabled: false,
    manualOwnerBarberoId: input.barberoId,
    manualOwnerUserId: input.userId,
    updatedByUserId: input.userId,
  });

  await clearAutoResumeState();
}

export async function playPlaylistNow(input: {
  userId: string;
  barberoId: string | null;
  playlistUri: string;
  playlistName: string;
}) {
  await activateDjMode({
    userId: input.userId,
    barberoId: input.barberoId,
  });

  const dashboard = await getMusicDashboardState({ sync: true });

  if (dashboard.runtime.state === "ready") {
    const activePlayer = dashboard.players.find((player) => player.isExpectedLocalPlayer) ??
      dashboard.players.find((player) => player.isDefault) ??
      dashboard.players[0];

    await updateRuntimeStatus({
      providerStatus: "connected",
      playerStatus: "ready",
      lastPlaybackAttemptAt: new Date(),
    });

    await spotifyAdapter.play({
      kind: "playlist",
      uri: input.playlistUri,
      deviceId: activePlayer?.providerPlayerId ?? null,
    });

    await updateRuntimeStatus({
      providerStatus: "connected",
      playerStatus: "ready",
      lastPlaybackAttemptAt: new Date(),
      lastPlaybackSuccessAt: new Date(),
      lastError: null,
    });

    await logMusicEvent("music.dj.playlist_now", {
      playlistUri: input.playlistUri,
      playlistName: input.playlistName,
    });
    return;
  }

  await setModeState({
    pendingContextRef: input.playlistUri,
    pendingContextLabel: input.playlistName,
    updatedByUserId: input.userId,
  });
}

export async function queueTrack(input: {
  mode: "dj" | "jam";
  userId: string;
  barberoId: string | null;
  trackUri: string;
  trackName: string;
  artistName: string | null;
  front?: boolean;
}) {
  if (input.mode === "dj") {
    await activateDjMode({
      userId: input.userId,
      barberoId: input.barberoId,
    });
  } else {
    await activateJamMode({
      userId: input.userId,
      barberoId: input.barberoId,
    });
  }

  const session = await ensureQueueSession(input.mode, input.userId);
  const [lastItem] = await db
    .select()
    .from(musicQueueItems)
    .where(eq(musicQueueItems.sessionId, session.id))
    .orderBy(desc(musicQueueItems.positionHint))
    .limit(1);
  const [firstItem] = await db
    .select()
    .from(musicQueueItems)
    .where(eq(musicQueueItems.sessionId, session.id))
    .orderBy(asc(musicQueueItems.positionHint))
    .limit(1);

  const nextPosition = input.front
    ? (firstItem?.positionHint ?? 0) - 1
    : (lastItem?.positionHint ?? 0) + 1;

  await db.insert(musicQueueItems).values({
    sessionId: session.id,
    sourceType: input.mode,
    ownerBarberoId: input.barberoId,
    providerTrackRef: input.trackUri,
    displayTitle: input.trackName,
    displayArtist: input.artistName,
    state: "queued",
    positionHint: nextPosition,
    requiresPlayer: true,
  });

  await logMusicEvent("music.queue.track_added", {
    mode: input.mode,
    trackUri: input.trackUri,
    trackName: input.trackName,
    ownerBarberoId: input.barberoId,
  });

  await syncMusicEngine();
}

export async function acceptMusicProposal(input: {
  eventId: string;
  mode: "dj" | "jam";
  userId: string;
  barberoId: string | null;
}) {
  const event = await getProposalEventRow(input.eventId);
  if (!event) {
    throw new Error("No encontramos esa propuesta.");
  }

  const payload = parseTurnoProposalPayload(event.payload);
  if (!payload) {
    throw new Error("La propuesta no tiene datos validos.");
  }
  if (!payload.spotifyTrackUri) {
    throw new Error("Esta propuesta no tiene track de Spotify vinculada. Buscala manualmente.");
  }

  await queueTrack({
    mode: input.mode,
    userId: input.userId,
    barberoId: input.barberoId,
    trackUri: payload.spotifyTrackUri,
    trackName: payload.cancion,
    artistName: null,
  });

  await updateProposalStatus(input.eventId, "accepted", {
    acceptedMode: input.mode,
    acceptedByUserId: input.userId,
  });

  await logMusicEvent("music.proposal.accepted", {
    proposalEventId: input.eventId,
    acceptedMode: input.mode,
  });
}

export async function dismissMusicProposal(input: {
  eventId: string;
  userId: string;
}) {
  await updateProposalStatus(input.eventId, "dismissed", {
    dismissedByUserId: input.userId,
  });

  await logMusicEvent("music.proposal.dismissed", {
    proposalEventId: input.eventId,
    dismissedByUserId: input.userId,
  });
}

export async function pauseMusic() {
  const dashboard = await getMusicDashboardState({ sync: true });
  const activePlayer =
    dashboard.players.find((player) => player.isExpectedLocalPlayer) ??
    dashboard.players.find((player) => player.isDefault) ??
    dashboard.players[0];
  if (!activePlayer) {
    throw new Error("No encontramos un player activo.");
  }
  await spotifyAdapter.pause(activePlayer.providerPlayerId);
}

export async function resumeMusic() {
  const dashboard = await getMusicDashboardState({ sync: true });
  const activePlayer =
    dashboard.players.find((player) => player.isExpectedLocalPlayer) ??
    dashboard.players.find((player) => player.isDefault) ??
    dashboard.players[0];
  if (!activePlayer) {
    throw new Error("No encontramos un player activo.");
  }
  await spotifyAdapter.resume(activePlayer.providerPlayerId);
}

export async function previousMusic() {
  const dashboard = await getMusicDashboardState({ sync: true });
  const activePlayer =
    dashboard.players.find((player) => player.isExpectedLocalPlayer) ??
    dashboard.players.find((player) => player.isDefault) ??
    dashboard.players[0];
  if (!activePlayer) {
    throw new Error("No encontramos un player activo.");
  }
  await spotifyAdapter.skipPrevious(activePlayer.providerPlayerId);
}

export async function skipMusic() {
  const dashboard = await getMusicDashboardState({ sync: true });
  const activePlayer =
    dashboard.players.find((player) => player.isExpectedLocalPlayer) ??
    dashboard.players.find((player) => player.isDefault) ??
    dashboard.players[0];
  if (!activePlayer) {
    throw new Error("No encontramos un player activo.");
  }
  await spotifyAdapter.skipNext(activePlayer.providerPlayerId);
}

export async function getDefaultWeekdayMask() {
  return WEEKDAY_OPTIONS.map((option) => option.key);
}
