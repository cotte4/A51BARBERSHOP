export type MusicProvider = "spotify";

export type MusicRuntimeState = "ready" | "degraded" | "offline";
export type MusicProviderStatus = "connected" | "disconnected" | "error";
export type MusicPlayerStatus = "ready" | "missing" | "error";
export type MusicMode = "auto" | "dj" | "jam";
export type MusicQueueSourceType = "dj" | "jam" | "system";
export type MusicQueueItemState = "queued" | "dispatched" | "played" | "skipped";

export type WeekdayKey =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

export const WEEKDAY_OPTIONS: Array<{ key: WeekdayKey; label: string }> = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mie" },
  { key: "thu", label: "Jue" },
  { key: "fri", label: "Vie" },
  { key: "sat", label: "Sab" },
  { key: "sun", label: "Dom" },
];

export type MusicPlayerSummary = {
  id: string;
  providerPlayerId: string;
  name: string;
  kind: string;
  status: MusicPlayerStatus;
  isDefault: boolean;
  isExpectedLocalPlayer: boolean;
  lastSeenAt: string | null;
  lastError: string | null;
};

export type MusicScheduleRuleSummary = {
  id: string;
  label: string;
  dayMask: WeekdayKey[];
  startTime: string;
  endTime: string;
  providerPlaylistRef: string;
  enabled: boolean;
  priority: number;
};

export type MusicQueueItemSummary = {
  id: string;
  sessionId: string;
  sourceType: MusicQueueSourceType;
  ownerBarberoId: string | null;
  ownerBarberoNombre: string | null;
  providerTrackRef: string;
  displayTitle: string;
  displayArtist: string | null;
  state: MusicQueueItemState;
  positionHint: number;
  requiresPlayer: boolean;
  createdAt: string;
  dispatchedAt: string | null;
};

export type MusicNowPlaying = {
  trackName: string;
  artists: string[];
  albumName: string;
  albumImageUrl: string | null;
  deviceName: string | null;
  isPlaying: boolean;
  contextUri: string | null;
  contextType: string | null;
};

export type MusicProposalSummary = {
  id: string;
  turnoId: string | null;
  clienteNombre: string;
  cancion: string;
  spotifyTrackUri: string | null;
  barberoId: string | null;
  createdAt: string;
  status: "pending" | "accepted" | "dismissed";
};

export type MusicDashboardState = {
  provider: {
    provider: MusicProvider;
    status: MusicProviderStatus;
    connected: boolean;
    expiresAt: string | null;
    lastError: string | null;
  };
  runtime: {
    state: MusicRuntimeState;
    playerStatus: MusicPlayerStatus;
    degradedReason: string | null;
    lastPlaybackSuccessAt: string | null;
    lastPlaybackAttemptAt: string | null;
    lastError: string | null;
  };
  mode: {
    activeMode: MusicMode;
    autoEnabled: boolean;
    jamEnabled: boolean;
    manualOwnerBarberoId: string | null;
    manualOwnerUserId: string | null;
    pendingContextLabel: string | null;
  };
  players: MusicPlayerSummary[];
  schedules: MusicScheduleRuleSummary[];
  queue: {
    activeSessionId: string | null;
    items: MusicQueueItemSummary[];
  };
  proposals: MusicProposalSummary[];
  nowPlaying: MusicNowPlaying | null;
  playlists: Array<{
    id: string;
    uri: string;
    name: string;
    imageUrl: string | null;
    trackCount: number;
    ownerName: string | null;
  }>;
};
