import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  barberos,
  musicEvents,
  musicPlayers,
  musicProviderConnections,
  musicQueueItems,
  musicQueueSessions,
  musicScheduleRules,
} from "@/db/schema";
import {
  formatScheduleRule,
  getDefaultWeekdayKeys,
  getPreferredActivePlayerId,
  getTimeInArgentina,
  getWeekdayKey,
  parseTurnoProposalPayload,
  toMinutes,
} from "@/lib/music-engine-helpers";
import {
  buildAutoResumeContext,
  getBlockedByManualDjResult,
  getClienteLlegoReadiness,
  getMissingTrackResult,
  getPlaybackStartedResult,
  getQueuedInJamResult,
  getTurnoArrivalBasePayload,
  getWaitingForRecoveryResult,
} from "@/lib/music-arrival-helpers";
import {
  buildDashboardAutoResume,
  buildDashboardMode,
  buildDashboardNowPlaying,
  buildDashboardPlayers,
  buildDashboardPlaylists,
  buildDashboardProvider,
  buildDashboardQueue,
  buildDashboardRuntime,
  buildPendingProposals,
  getPreferredDashboardPlayer,
} from "@/lib/music-dashboard-helpers";
import {
  createTurnoArrivalEvent,
  getProposalEventRow,
  logMusicEvent,
  updateProposalStatus,
} from "@/lib/music-engine-events";
import { buildJamDispatchOrder, buildJamSummary } from "@/lib/music-jam-helpers";
import {
  clearAutoResumeState,
  closeQueueSession,
  ensureBootstrap,
  ensureQueueSession,
  getActiveJamSessionSummary,
  getActiveQueueSession,
  getAutoResumeRow,
  getModeRow,
  getRuntimeRow,
  getSessionQueueRows,
  getSessionQueueSummaryRows,
  hasJamParticipation,
  markCompletedDispatchedItems,
  setAutoResumeState,
  setModeState,
  updateRuntimeStatus,
} from "@/lib/music-engine-store";
import type {
  MusicDashboardState,
  MusicMode,
  MusicPlayerStatus,
  MusicRuntimeState,
  WeekdayKey,
} from "@/lib/music-types";
import { spotifyAdapter } from "@/lib/spotify-server";

const PROVIDER_CONNECTION_ID = "spotify";

export type ClienteLlegoResult =
  | { kind: "playback_started"; eventId: string; mode: "auto" }
  | { kind: "queued_in_jam"; eventId: string; queueSessionId: string | null }
  | { kind: "proposal_created"; eventId: string; reason: string }
  | { kind: "waiting_for_recovery"; eventId: string; reason: string }
  | { kind: "blocked_by_manual_dj"; eventId: string; reason: string }
  | { kind: "missing_track_uri"; eventId: string };

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
  const [
    provider,
    runtime,
    players,
    schedules,
    autoResume,
    playback,
    queueSession,
    activeJamSession,
    playlists,
    recentEvents,
    jamJoinEvents,
  ] = await Promise.all([
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
    getActiveJamSessionSummary(),
    spotifyAdapter.listPlaylists().catch(() => []),
    db
      .select()
      .from(musicEvents)
      .where(eq(musicEvents.eventType, "turno.cliente_llego"))
      .orderBy(desc(musicEvents.createdAt))
      .limit(20),
    db
      .select()
      .from(musicEvents)
      .where(eq(musicEvents.eventType, "music.jam.joined"))
      .orderBy(desc(musicEvents.createdAt))
      .limit(80),
  ]);

  const activeSessionId = queueSession?.id ?? null;
  const queueRows =
    activeSessionId == null
      ? []
      : await getSessionQueueSummaryRows(activeSessionId);
  const jamQueueRows =
    activeJamSession == null
      ? []
      : activeSessionId === activeJamSession.id
        ? queueRows
        : await getSessionQueueSummaryRows(activeJamSession.id);

  const proposals = buildPendingProposals(recentEvents);
  const jam = buildJamSummary({
    session: activeJamSession,
    queueRows: jamQueueRows,
    joinEvents: jamJoinEvents,
  });
  const playerSummaries = buildDashboardPlayers(players);

  return {
    provider: buildDashboardProvider(provider),
    runtime: buildDashboardRuntime(provider, runtime),
    mode: buildDashboardMode(mode),
    players: playerSummaries,
    schedules: schedules.map(formatScheduleRule),
    autoResume: buildDashboardAutoResume(autoResume),
    jam,
    queue: buildDashboardQueue(activeSessionId, queueRows),
    proposals,
    nowPlaying: buildDashboardNowPlaying(playback),
    playlists: buildDashboardPlaylists(playlists),
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

type HandleClienteLlegoInput = {
  turnoId: string;
  clienteNombre: string;
  cancion: string;
  spotifyTrackUri: string | null;
  barberoId: string | null;
  triggeredByUserId: string;
  triggeredByBarberoId: string | null;
};

function getTurnoArrivalQueueBarberoId(input: HandleClienteLlegoInput) {
  return input.barberoId ?? input.triggeredByBarberoId;
}

async function handleClienteLlegoMissingTrack(
  input: HandleClienteLlegoInput,
): Promise<ClienteLlegoResult> {
  const event = await createTurnoArrivalEvent({
    ...getTurnoArrivalBasePayload(input),
    spotifyTrackUri: null,
    proposalStatus: "pending",
    outcome: "missing_track_uri",
  });

  await logMusicEvent("turno.cliente_llego.missing_track_uri", {
    turnoId: input.turnoId,
    eventId: event.id,
    clienteNombre: input.clienteNombre,
  });

  return getMissingTrackResult(event.id);
}

async function handleClienteLlegoWaitingForRecovery(
  input: HandleClienteLlegoInput,
  reason: string,
): Promise<ClienteLlegoResult> {
  const event = await createTurnoArrivalEvent({
    ...getTurnoArrivalBasePayload(input),
    proposalStatus: "pending",
    outcome: "waiting_for_recovery",
    outcomeReason: reason,
  });

  await logMusicEvent("turno.cliente_llego.waiting_for_recovery", {
    turnoId: input.turnoId,
    eventId: event.id,
    reason,
  });

  return getWaitingForRecoveryResult(event.id, reason);
}

async function handleClienteLlegoQueuedInJam(
  input: HandleClienteLlegoInput,
): Promise<ClienteLlegoResult> {
  const beforeState = await getMusicDashboardState();
  await queueTrack({
    mode: "jam",
    userId: input.triggeredByUserId,
    barberoId: getTurnoArrivalQueueBarberoId(input),
    trackUri: input.spotifyTrackUri!,
    trackName: input.cancion,
    artistName: null,
  });

  const afterState = await getMusicDashboardState();
  const event = await createTurnoArrivalEvent({
    ...getTurnoArrivalBasePayload(input),
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

  return getQueuedInJamResult(event.id, afterState.queue.activeSessionId);
}

async function handleClienteLlegoBlockedByManualDj(
  input: HandleClienteLlegoInput,
): Promise<ClienteLlegoResult> {
  const reason = "DJ esta activo; dejamos la cancion como propuesta para no pisar al operador.";
  const event = await createTurnoArrivalEvent({
    ...getTurnoArrivalBasePayload(input),
    proposalStatus: "pending",
    outcome: "blocked_by_manual_dj",
    outcomeReason: reason,
  });

  await logMusicEvent("turno.cliente_llego.blocked_by_manual_dj", {
    turnoId: input.turnoId,
    eventId: event.id,
  });

  return getBlockedByManualDjResult(event.id, reason);
}

async function handleClienteLlegoAutoPlayback(
  input: HandleClienteLlegoInput,
  activePlayerId: string,
): Promise<ClienteLlegoResult> {
  await updateRuntimeStatus({
    providerStatus: "connected",
    playerStatus: "ready",
    lastPlaybackAttemptAt: new Date(),
  });

  const playbackBeforeArrival = await spotifyAdapter.getPlaybackState().catch(() => null);
  const activeRule = await getCurrentScheduleRule();
  const { resumeContextRef, resumeContextLabel } = buildAutoResumeContext({
    playbackContextUri: playbackBeforeArrival?.contextUri ?? null,
    activeRule: activeRule
      ? {
          providerPlaylistRef: activeRule.providerPlaylistRef,
          label: activeRule.label,
        }
      : null,
  });

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
    uri: input.spotifyTrackUri!,
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
    ...getTurnoArrivalBasePayload(input),
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

  return getPlaybackStartedResult(event.id);
}

export async function handleClienteLlego(input: HandleClienteLlegoInput): Promise<ClienteLlegoResult> {
  await ensureBootstrap();
  await syncMusicEngine();

  const mode = await getModeRow();

  if (!input.spotifyTrackUri) {
    return handleClienteLlegoMissingTrack(input);
  }

  const dashboard = await getMusicDashboardState();
  const { providerReady, runtimeReady, activePlayerId, recoveryReason } =
    getClienteLlegoReadiness(dashboard);

  if (!providerReady || !runtimeReady || !activePlayerId) {
    return handleClienteLlegoWaitingForRecovery(input, recoveryReason);
  }

  if (mode.activeMode === "jam") {
    return handleClienteLlegoQueuedInJam(input);
  }

  if (mode.activeMode === "dj") {
    return handleClienteLlegoBlockedByManualDj(input);
  }

  return handleClienteLlegoAutoPlayback(input, activePlayerId);
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
    await closeQueueSession(session.id);
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

  const mode = await getModeRow();
  let jamSession = await getActiveQueueSession("jam");
  const isNewJamSession = !jamSession;
  if (!jamSession) {
    jamSession = await ensureQueueSession("jam", input.userId);
  }

  await setModeState({
    activeMode: "jam",
    jamEnabled: true,
    autoEnabled: false,
    manualOwnerBarberoId:
      mode.activeMode === "jam" && !isNewJamSession ? mode.manualOwnerBarberoId : input.barberoId,
    manualOwnerUserId:
      mode.activeMode === "jam" && !isNewJamSession ? mode.manualOwnerUserId : input.userId,
    updatedByUserId: input.userId,
  });

  await clearAutoResumeState();

  if (isNewJamSession) {
    await logMusicEvent("music.jam.started", {
      sessionId: jamSession.id,
      hostBarberoId: input.barberoId,
      userId: input.userId,
    });
  }
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
    const activePlayer = getPreferredDashboardPlayer(dashboard.players);

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
    const activeJamSession = await getActiveJamSessionSummary();
    if (
      activeJamSession &&
      input.barberoId &&
      activeJamSession.hostBarberoId !== input.barberoId &&
      !(await hasJamParticipation(activeJamSession.id, input.barberoId))
    ) {
      throw new Error("Unite a la Jam primero desde el panel para sumar temas.");
    }

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

export async function joinActiveJamSession(input: {
  userId: string;
  barberoId: string;
}) {
  await ensureBootstrap();

  const mode = await getModeRow();
  if (mode.activeMode !== "jam") {
    throw new Error("No hay una Jam activa para compartir ahora.");
  }

  const session = await getActiveJamSessionSummary();
  if (!session) {
    throw new Error("No encontramos una sesion de Jam activa.");
  }

  const [barbero] = await db
    .select({
      nombre: barberos.nombre,
    })
    .from(barberos)
    .where(and(eq(barberos.id, input.barberoId), eq(barberos.activo, true)))
    .limit(1);

  if (!barbero) {
    throw new Error("Tu perfil de barbero no esta activo.");
  }

  const dashboard = await getMusicDashboardState();
  const alreadyJoined = dashboard.jam.sessionId === session.id &&
    dashboard.jam.participants.some((participant) => participant.barberoId === input.barberoId);

  if (alreadyJoined) {
    return;
  }

  await logMusicEvent("music.jam.joined", {
    sessionId: session.id,
    barberoId: input.barberoId,
    barberoNombre: barbero.nombre,
    userId: input.userId,
  });
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

async function withActivePlaybackPlayer(
  callback: (providerPlayerId: string) => Promise<void>,
) {
  const dashboard = await getMusicDashboardState({ sync: true });
  const activePlayer = getPreferredDashboardPlayer(dashboard.players);
  if (!activePlayer) {
    throw new Error("No encontramos un player activo.");
  }

  await callback(activePlayer.providerPlayerId);
}

export async function pauseMusic() {
  await withActivePlaybackPlayer((providerPlayerId) => spotifyAdapter.pause(providerPlayerId));
}

export async function resumeMusic() {
  await withActivePlaybackPlayer((providerPlayerId) => spotifyAdapter.resume(providerPlayerId));
}

export async function previousMusic() {
  await withActivePlaybackPlayer((providerPlayerId) =>
    spotifyAdapter.skipPrevious(providerPlayerId),
  );
}

export async function skipMusic() {
  await withActivePlaybackPlayer((providerPlayerId) => spotifyAdapter.skipNext(providerPlayerId));
}

export async function getDefaultWeekdayMask() {
  return getDefaultWeekdayKeys();
}
