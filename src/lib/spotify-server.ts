import { eq } from "drizzle-orm";
import { db } from "@/db";
import { musicProviderConnections } from "@/db/schema";
import {
  addTrackToQueue,
  getCurrentPlayback,
  listDevices,
  listPlaylists,
  pausePlayback,
  playPlaylist,
  playTrack,
  resumePlayback,
  skipToPrevious,
  skipToNext,
  type SpotifyPlaybackState,
  type SpotifyPlaylist,
} from "@/lib/spotify-api";
import type {
  MusicProviderAdapter,
  ProviderConnectionState,
  ProviderPlaybackCommand,
  ProviderPlayer,
} from "@/lib/music-provider";

const PROVIDER_ID = "spotify";

type ProviderConnectionRow = typeof musicProviderConnections.$inferSelect;

function mapConnection(row: ProviderConnectionRow | undefined): ProviderConnectionState {
  return {
    provider: "spotify",
    status: (row?.status as ProviderConnectionState["status"]) ?? "disconnected",
    accessToken: row?.accessToken ?? null,
    refreshToken: row?.refreshToken ?? null,
    expiresAt: row?.expiresAt ?? null,
    lastError: row?.lastError ?? null,
  };
}

async function getConnectionRow(): Promise<ProviderConnectionRow | undefined> {
  const [connection] = await db
    .select()
    .from(musicProviderConnections)
    .where(eq(musicProviderConnections.id, PROVIDER_ID))
    .limit(1);
  return connection;
}

async function saveConnection(values: Partial<ProviderConnectionRow> & { id?: string } = {}) {
  const now = new Date();
  await db
    .insert(musicProviderConnections)
    .values({
      id: PROVIDER_ID,
      provider: PROVIDER_ID,
      status: "disconnected",
      updatedAt: now,
      createdAt: now,
      ...values,
    })
    .onConflictDoUpdate({
      target: musicProviderConnections.id,
      set: {
        ...values,
        updatedAt: now,
      },
    });
}

async function refreshSpotifyTokens(refreshToken: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Configuracion de Spotify incompleta.");
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error("No pude renovar la conexion de Spotify.");
  }

  const data = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

async function ensureValidConnection(): Promise<ProviderConnectionState | null> {
  const row = await getConnectionRow();
  const current = mapConnection(row);

  if (!current.refreshToken) {
    return current.status === "disconnected" ? null : current;
  }

  const shouldRefresh =
    !current.accessToken ||
    !current.expiresAt ||
    current.expiresAt.getTime() <= Date.now() + 60_000;

  if (!shouldRefresh) {
    return current;
  }

  try {
    const refreshed = await refreshSpotifyTokens(current.refreshToken);
    await saveConnection({
      provider: PROVIDER_ID,
      status: "connected",
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
      lastError: null,
      lastSyncedAt: new Date(),
    });

    return {
      provider: "spotify",
      status: "connected",
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
      lastError: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pude renovar Spotify.";
    await saveConnection({
      provider: PROVIDER_ID,
      status: "error",
      accessToken: null,
      lastError: message,
      lastSyncedAt: new Date(),
    });

    return {
      provider: "spotify",
      status: "error",
      accessToken: null,
      refreshToken: current.refreshToken,
      expiresAt: current.expiresAt,
      lastError: message,
    };
  }
}

function mapPlayer(device: Awaited<ReturnType<typeof listDevices>>[number]): ProviderPlayer {
  return {
    providerPlayerId: device.id,
    name: device.name,
    kind: device.type,
    status: device.isRestricted ? "error" : "ready",
    isDefault: device.isActive,
    lastSeenAt: new Date(),
    lastError: device.isRestricted ? "Spotify no acepta controles sobre este device." : null,
  };
}

async function requireAccessToken() {
  const connection = await ensureValidConnection();
  if (!connection?.accessToken) {
    throw new Error("Spotify no esta conectado.");
  }

  return connection;
}

export const spotifyAdapter: MusicProviderAdapter = {
  provider: "spotify",

  async connect(input) {
    await saveConnection({
      provider: PROVIDER_ID,
      status: "connected",
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      lastError: null,
      lastSyncedAt: new Date(),
    });

    return {
      provider: "spotify",
      status: "connected",
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      lastError: null,
    };
  },

  async disconnect() {
    await saveConnection({
      provider: PROVIDER_ID,
      status: "disconnected",
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      lastError: null,
      lastSyncedAt: new Date(),
    });
  },

  async refreshConnection() {
    return ensureValidConnection();
  },

  async getConnection() {
    return mapConnection(await getConnectionRow());
  },

  async listPlayers() {
    const connection = await requireAccessToken();
    const devices = await listDevices(connection.accessToken!);
    return devices.map(mapPlayer);
  },

  async getActivePlayer() {
    const players = await this.listPlayers();
    return players.find((player) => player.isDefault) ?? players[0] ?? null;
  },

  async getPlaybackState(): Promise<SpotifyPlaybackState | null> {
    const connection = await requireAccessToken();
    return getCurrentPlayback(connection.accessToken!);
  },

  async listPlaylists(): Promise<SpotifyPlaylist[]> {
    const connection = await requireAccessToken();
    return listPlaylists(connection.accessToken!);
  },

  async play(command: ProviderPlaybackCommand) {
    const connection = await requireAccessToken();
    if (command.kind === "track") {
      await playTrack(connection.accessToken!, {
        deviceId: command.deviceId ?? null,
        trackUri: command.uri,
      });
      return;
    }

    await playPlaylist(connection.accessToken!, {
      deviceId: command.deviceId ?? null,
      playlistUri: command.uri,
    });
  },

  async enqueue(trackUri: string, deviceId?: string | null) {
    const connection = await requireAccessToken();
    await addTrackToQueue(connection.accessToken!, trackUri, deviceId ?? null);
  },

  async pause(deviceId?: string | null) {
    const connection = await requireAccessToken();
    await pausePlayback(connection.accessToken!, deviceId ?? null);
  },

  async resume(deviceId?: string | null) {
    const connection = await requireAccessToken();
    await resumePlayback(connection.accessToken!, deviceId ?? null);
  },

  async skipPrevious(deviceId?: string | null) {
    const connection = await requireAccessToken();
    await skipToPrevious(connection.accessToken!, deviceId ?? null);
  },

  async skipNext(deviceId?: string | null) {
    const connection = await requireAccessToken();
    await skipToNext(connection.accessToken!, deviceId ?? null);
  },
};
