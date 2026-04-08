import { getPreferredActivePlayerId } from "@/lib/music-engine-helpers";
import type { MusicDashboardState } from "@/lib/music-types";

type ArrivalDashboardSnapshot = Pick<MusicDashboardState, "provider" | "runtime" | "players">;
type TurnoArrivalBaseInput = {
  turnoId: string;
  clienteNombre: string;
  cancion: string;
  spotifyTrackUri: string | null;
  barberoId: string | null;
};

export function getClienteLlegoReadiness(dashboard: ArrivalDashboardSnapshot) {
  const providerReady = dashboard.provider.connected;
  const runtimeReady = dashboard.runtime.state === "ready";
  const activePlayerId = getPreferredActivePlayerId(dashboard.players);
  const recoveryReason =
    dashboard.runtime.degradedReason ??
    (providerReady ? "No encontramos un player listo en el local." : "Spotify no esta conectado.");

  return {
    providerReady,
    runtimeReady,
    activePlayerId,
    recoveryReason,
  };
}

export function buildAutoResumeContext(input: {
  playbackContextUri: string | null;
  activeRule:
    | {
        providerPlaylistRef: string;
        label: string;
      }
    | null;
}) {
  const resumeContextRef = input.playbackContextUri ?? input.activeRule?.providerPlaylistRef ?? null;
  const resumeContextLabel = input.activeRule?.label ?? (resumeContextRef ? "AUTO" : null);

  return {
    resumeContextRef,
    resumeContextLabel,
  };
}

export function getTurnoArrivalBasePayload(input: TurnoArrivalBaseInput) {
  return {
    turnoId: input.turnoId,
    clienteNombre: input.clienteNombre,
    cancion: input.cancion,
    spotifyTrackUri: input.spotifyTrackUri,
    barberoId: input.barberoId,
  };
}

export function getQueuedInJamResult(eventId: string, queueSessionId: string | null) {
  return {
    kind: "queued_in_jam" as const,
    eventId,
    queueSessionId,
  };
}

export function getPlaybackStartedResult(eventId: string) {
  return {
    kind: "playback_started" as const,
    eventId,
    mode: "auto" as const,
  };
}

export function getWaitingForRecoveryResult(eventId: string, reason: string) {
  return {
    kind: "waiting_for_recovery" as const,
    eventId,
    reason,
  };
}

export function getBlockedByManualDjResult(eventId: string, reason: string) {
  return {
    kind: "blocked_by_manual_dj" as const,
    eventId,
    reason,
  };
}

export function getMissingTrackResult(eventId: string) {
  return {
    kind: "missing_track_uri" as const,
    eventId,
  };
}
