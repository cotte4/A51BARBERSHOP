type SpotifyApiRequestOptions = {
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  method?: string;
  headers?: HeadersInit;
};

type RawSpotifyDevice = {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  is_restricted: boolean;
  volume_percent: number | null;
};

type RawSpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
};

export type SpotifyDevice = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  isRestricted: boolean;
  volumePercent: number | null;
};

export type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumName: string;
  albumImageUrl: string | null;
  durationMs: number;
};

export type SpotifyPlaylist = {
  id: string;
  uri: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
  ownerName: string | null;
};

export type SpotifyPlaybackState = {
  isPlaying: boolean;
  progressMs: number;
  device: SpotifyDevice | null;
  item: SpotifyTrack | null;
  contextUri: string | null;
  contextType: string | null;
};

class SpotifyApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
    this.payload = payload;
  }
}

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

function buildSpotifyApiUrl(path: string, query?: SpotifyApiRequestOptions["query"]): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${SPOTIFY_API_BASE}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function requestSpotify<T>(
  path: string,
  accessToken: string,
  options: SpotifyApiRequestOptions = {}
): Promise<T | null> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    body =
      typeof options.body === "string" ||
      options.body instanceof FormData ||
      options.body instanceof URLSearchParams ||
      options.body instanceof Blob ||
      options.body instanceof ArrayBuffer ||
      ArrayBuffer.isView(options.body)
        ? (options.body as BodyInit)
        : JSON.stringify(options.body);

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const response = await fetch(buildSpotifyApiUrl(path, options.query), {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    body,
  });

  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? stringifyErrorMessage((payload as { error?: { message?: string } }).error)
        : `Spotify API error ${response.status}`;
    throw new SpotifyApiError(message, response.status, payload);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function parseErrorPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function stringifyErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Spotify API error";
  const message = (error as { message?: string }).message;
  return message ?? "Spotify API error";
}

function mapDevice(device: {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  is_restricted: boolean;
  volume_percent: number | null;
}): SpotifyDevice {
  return {
    id: device.id,
    name: device.name,
    type: device.type,
    isActive: device.is_active,
    isRestricted: device.is_restricted,
    volumePercent: device.volume_percent ?? null,
  };
}

function mapTrack(track: {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
}): SpotifyTrack {
  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: track.artists.map((artist) => artist.name),
    albumName: track.album.name,
    albumImageUrl: track.album.images[0]?.url ?? null,
    durationMs: track.duration_ms,
  };
}

export async function listDevices(accessToken: string): Promise<SpotifyDevice[]> {
  const response = await requestSpotify<{ devices: RawSpotifyDevice[] }>(
    `/me/player/devices`,
    accessToken
  );
  return (response?.devices ?? []).map(mapDevice);
}

export async function playTrack(
  accessToken: string,
  options: { deviceId?: string | null; trackUri: string }
): Promise<void> {
  await requestSpotify<void>("/me/player/play", accessToken, {
    method: "PUT",
    query: options.deviceId ? { device_id: options.deviceId } : undefined,
    body: {
      uris: [options.trackUri],
    },
  });
}

export async function listPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
  const response = await requestSpotify<{
    items: Array<{
      id: string;
      uri: string;
      name: string;
      images: { url: string }[];
      tracks: { total: number };
      owner: { display_name: string | null };
    }>;
  }>("/me/playlists", accessToken, {
    query: { limit: 20 },
  });

  return (response?.items ?? []).map((playlist) => ({
    id: playlist.id,
    uri: playlist.uri,
    name: playlist.name,
    imageUrl: playlist.images[0]?.url ?? null,
    trackCount: playlist.tracks?.total ?? 0,
    ownerName: playlist.owner.display_name ?? null,
  }));
}

export async function playPlaylist(
  accessToken: string,
  options: { deviceId?: string | null; playlistUri: string }
): Promise<void> {
  await requestSpotify<void>("/me/player/play", accessToken, {
    method: "PUT",
    query: options.deviceId ? { device_id: options.deviceId } : undefined,
    body: {
      context_uri: options.playlistUri,
    },
  });
}

export async function getCurrentPlayback(
  accessToken: string
): Promise<SpotifyPlaybackState | null> {
  const response = await requestSpotify<{
    is_playing: boolean;
    progress_ms: number;
    device: {
      id: string;
      name: string;
      type: string;
      is_active: boolean;
      is_restricted: boolean;
      volume_percent: number | null;
    };
    item:
      | {
          id: string;
          uri: string;
          name: string;
          artists: { name: string }[];
          album: { name: string; images: { url: string }[] };
          duration_ms: number;
        }
      | null;
    context: { uri: string; type: string } | null;
  }>("/me/player", accessToken);

  if (!response) return null;

  return {
    isPlaying: response.is_playing,
    progressMs: response.progress_ms,
    device: response.device ? mapDevice(response.device) : null,
    item: response.item ? mapTrack(response.item) : null,
    contextUri: response.context?.uri ?? null,
    contextType: response.context?.type ?? null,
  };
}

export async function pausePlayback(accessToken: string, deviceId?: string | null): Promise<void> {
  await requestSpotify<void>("/me/player/pause", accessToken, {
    method: "PUT",
    query: deviceId ? { device_id: deviceId } : undefined,
  });
}

export async function resumePlayback(accessToken: string, deviceId?: string | null): Promise<void> {
  await requestSpotify<void>("/me/player/play", accessToken, {
    method: "PUT",
    query: deviceId ? { device_id: deviceId } : undefined,
  });
}

export async function skipToNext(accessToken: string, deviceId?: string | null): Promise<void> {
  await requestSpotify<void>("/me/player/next", accessToken, {
    method: "POST",
    query: deviceId ? { device_id: deviceId } : undefined,
  });
}

export async function skipToPrevious(accessToken: string, deviceId?: string | null): Promise<void> {
  await requestSpotify<void>("/me/player/previous", accessToken, {
    method: "POST",
    query: deviceId ? { device_id: deviceId } : undefined,
  });
}

export async function addTrackToQueue(
  accessToken: string,
  trackUri: string,
  deviceId?: string | null
): Promise<void> {
  await requestSpotify<void>("/me/player/queue", accessToken, {
    method: "POST",
    query: {
      uri: trackUri,
      ...(deviceId ? { device_id: deviceId } : {}),
    },
  });
}
