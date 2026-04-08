import { musicEvents, musicScheduleRules } from "@/db/schema";
import type {
  MusicDashboardState,
  MusicProposalSummary,
  MusicScheduleRuleSummary,
  WeekdayKey,
} from "@/lib/music-types";
import { WEEKDAY_OPTIONS } from "@/lib/music-types";

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

export type TurnoProposalPayload = {
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

export type JamJoinPayload = {
  sessionId: string;
  barberoId: string;
  barberoNombre: string;
  userId: string | null;
};

function getNowInArgentina() {
  return new Date();
}

export function getWeekdayKey(date = getNowInArgentina()): WeekdayKey {
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

export function getTimeInArgentina(date = getNowInArgentina()) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(date);
}

export function toMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export function isoOrNull(date: Date | null | undefined) {
  return date ? date.toISOString() : null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseTurnoProposalPayload(payload: unknown): TurnoProposalPayload | null {
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

export function parseJamJoinPayload(payload: unknown): JamJoinPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
  const barberoId = typeof payload.barberoId === "string" ? payload.barberoId.trim() : "";
  const barberoNombre = typeof payload.barberoNombre === "string" ? payload.barberoNombre.trim() : "";

  if (!sessionId || !barberoId || !barberoNombre) {
    return null;
  }

  return {
    sessionId,
    barberoId,
    barberoNombre,
    userId: typeof payload.userId === "string" ? payload.userId : null,
  };
}

export function formatProposal(
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

export function formatScheduleRule(
  rule: typeof musicScheduleRules.$inferSelect,
): MusicScheduleRuleSummary {
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

export function getPreferredActivePlayerId(players: MusicDashboardState["players"]) {
  return (
    players.find((player) => player.isExpectedLocalPlayer && player.status === "ready")
      ?.providerPlayerId ??
    players.find((player) => player.isDefault && player.status === "ready")?.providerPlayerId ??
    players.find((player) => player.status === "ready")?.providerPlayerId ??
    null
  );
}

export function getDefaultWeekdayKeys() {
  return WEEKDAY_OPTIONS.map((option) => option.key);
}
