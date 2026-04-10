import {
  musicAutoResumeState,
  musicEvents,
  musicModeState,
  musicPlayers,
  musicProviderConnections,
  musicRuntimeStatus,
} from "@/db/schema";
import type { SpotifyPlaybackState, SpotifyPlaylist } from "@/lib/spotify-api";
import {
  formatProposal,
  isoOrNull,
  parseTurnoProposalPayload,
} from "@/lib/music-engine-helpers";
import type {
  MusicDashboardState,
  MusicPlayerStatus,
  MusicPlayerSummary,
  MusicProposalSummary,
  MusicProviderStatus,
  MusicRuntimeState,
} from "@/lib/music-types";

type QueueSummaryRow = {
  id: string;
  sessionId: string;
  sourceType: string;
  ownerBarberoId: string | null;
  ownerBarberoNombre: string | null;
  providerTrackRef: string;
  displayTitle: string;
  displayArtist: string | null;
  state: string;
  positionHint: number;
  requiresPlayer: boolean;
  createdAt: Date;
  dispatchedAt: Date | null;
};

type ProviderRow = typeof musicProviderConnections.$inferSelect | undefined;
type RuntimeRow = typeof musicRuntimeStatus.$inferSelect;
type ModeRow = typeof musicModeState.$inferSelect;
type AutoResumeRow = typeof musicAutoResumeState.$inferSelect;
type PlayerRow = typeof musicPlayers.$inferSelect;

function getDashboardRuntimeState(
  providerStatus: string | null | undefined,
  playerStatus: RuntimeRow["playerStatus"],
): MusicRuntimeState {
  if (providerStatus !== "connected") {
    return "offline";
  }

  if (playerStatus === "ready") {
    return "ready";
  }

  return playerStatus === "missing" ? "degraded" : "offline";
}

export function buildDashboardProvider(provider: ProviderRow): MusicDashboardState["provider"] {
  const status = (provider?.status as MusicProviderStatus) ?? "disconnected";

  return {
    provider: "spotify",
    status,
    connected: provider?.status === "connected",
    expiresAt: isoOrNull(provider?.expiresAt),
    lastError: provider?.lastError ?? null,
  };
}

export function buildDashboardRuntime(
  provider: ProviderRow,
  runtime: RuntimeRow,
): MusicDashboardState["runtime"] {
  return {
    state: getDashboardRuntimeState(provider?.status, runtime.playerStatus),
    playerStatus: runtime.playerStatus as MusicPlayerStatus,
    degradedReason: runtime.degradedReason,
    lastPlaybackSuccessAt: isoOrNull(runtime.lastPlaybackSuccessAt),
    lastPlaybackAttemptAt: isoOrNull(runtime.lastPlaybackAttemptAt),
    lastError: runtime.lastError,
  };
}

export function buildDashboardMode(mode: ModeRow): MusicDashboardState["mode"] {
  return {
    activeMode: mode.activeMode as MusicDashboardState["mode"]["activeMode"],
    autoEnabled: mode.autoEnabled,
    jamEnabled: mode.jamEnabled,
    manualOwnerBarberoId: mode.manualOwnerBarberoId,
    manualOwnerUserId: mode.manualOwnerUserId,
    pendingContextLabel: mode.pendingContextLabel,
  };
}

export function buildPendingProposals(
  events: Array<typeof musicEvents.$inferSelect>,
): MusicProposalSummary[] {
  return events
    .map((event) => {
      const payload = parseTurnoProposalPayload(event.payload);
      return payload ? formatProposal(event, payload) : null;
    })
    .filter((proposal): proposal is MusicProposalSummary => proposal !== null)
    .filter((proposal) => proposal.status === "pending");
}

export function buildDashboardPlayers(players: PlayerRow[]): MusicDashboardState["players"] {
  return players.map((player) => ({
    id: player.id,
    providerPlayerId: player.providerPlayerId,
    name: player.name,
    kind: player.kind,
    status: player.status as MusicPlayerStatus,
    isDefault: player.isDefault,
    isExpectedLocalPlayer: player.isExpectedLocalPlayer,
    lastSeenAt: isoOrNull(player.lastSeenAt),
    lastError: player.lastError,
  }));
}

export function buildDashboardAutoResume(
  autoResume: AutoResumeRow,
): MusicDashboardState["autoResume"] {
  return {
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
  };
}

export function buildDashboardQueue(
  activeSessionId: string | null,
  queueRows: QueueSummaryRow[],
): MusicDashboardState["queue"] {
  return {
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
  };
}

export function buildDashboardNowPlaying(
  playback: SpotifyPlaybackState | null,
): MusicDashboardState["nowPlaying"] {
  if (!playback?.item) {
    return null;
  }

  return {
    trackName: playback.item.name,
    artists: playback.item.artists,
    albumName: playback.item.albumName,
    albumImageUrl: playback.item.albumImageUrl,
    deviceName: playback.device?.name ?? null,
    isPlaying: playback.isPlaying,
    contextUri: playback.contextUri,
    contextType: playback.contextType,
  };
}

export function buildDashboardPlaylists(
  playlists: SpotifyPlaylist[],
): MusicDashboardState["playlists"] {
  return playlists.map((playlist) => ({
    id: playlist.id,
    uri: playlist.uri,
    name: playlist.name,
    imageUrl: playlist.imageUrl,
    trackCount: playlist.trackCount,
    ownerName: playlist.ownerName,
  }));
}

export function getPreferredDashboardPlayer(
  players: MusicPlayerSummary[],
): MusicPlayerSummary | null {
  return (
    players.find((player) => player.isExpectedLocalPlayer) ??
    players.find((player) => player.isDefault) ??
    players[0] ??
    null
  );
}
