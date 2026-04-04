import { playTrack, searchTracks } from "@/lib/spotify-api";

export const SPOTIFY_AUTH_SCOPES = [
  "streaming",
  "user-read-private",
  "user-read-email",
  "user-read-playback-state",
  "user-read-currently-playing",
  "user-modify-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

type SpotifyAuthStatePayload = {
  codeVerifier: string;
  returnTo: string;
};

function base64urlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generatePkcePair() {
  const verifierBytes = new Uint8Array(64);
  crypto.getRandomValues(verifierBytes);
  const codeVerifier = base64urlEncode(verifierBytes.buffer);
  const verifierEncoded = new TextEncoder().encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", verifierEncoded);
  const codeChallenge = base64urlEncode(hashBuffer);

  return { codeVerifier, codeChallenge };
}

function encodeAuthState(payload: SpotifyAuthStatePayload): string {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeAuthState(state: string): SpotifyAuthStatePayload | null {
  try {
    const normalized = state.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as Partial<SpotifyAuthStatePayload>;

    if (!parsed.codeVerifier || !parsed.returnTo || !parsed.returnTo.startsWith("/")) {
      return null;
    }

    return {
      codeVerifier: parsed.codeVerifier,
      returnTo: parsed.returnTo,
    };
  } catch {
    return null;
  }
}

export function buildAuthUrl(): string {
  throw new Error("Usa buildAuthUrlAsync en su lugar.");
}

export async function buildAuthUrlAsync(returnTo = "/configuracion/musica"): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_SPOTIFY_CLIENT_ID no configurado.");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/spotify/callback`;
  const { codeVerifier, codeChallenge } = await generatePkcePair();
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/configuracion/musica";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_AUTH_SCOPES,
    redirect_uri: redirectUri,
    state: encodeAuthState({
      codeVerifier,
      returnTo: safeReturnTo,
    }),
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export function initSpotifyPlayer(
  getToken: (callback: (token: string) => void) => void,
  onReady: (deviceId: string) => void,
  onError: (message: string) => void
): void {
  const scriptId = "spotify-sdk-script";

  function setupPlayer() {
    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: "A51 Barber Pantalla",
        getOAuthToken: getToken,
        volume: 0.8,
      });

      player.addListener("ready", ({ device_id }) => {
        onReady(device_id);
      });

      player.addListener("initialization_error", ({ message }) => {
        onError(`Error de inicializacion: ${message}`);
      });

      player.addListener("authentication_error", ({ message }) => {
        onError(`Error de autenticacion: ${message}`);
      });

      player.addListener("account_error", ({ message }) => {
        onError(`Cuenta no compatible: ${message}`);
      });

      player.connect();
    };
  }

  if (window.Spotify) {
    setupPlayer();
    window.onSpotifyWebPlaybackSDKReady();
    return;
  }

  if (document.getElementById(scriptId)) {
    setupPlayer();
    return;
  }

  setupPlayer();
  const script = document.createElement("script");
  script.id = scriptId;
  script.src = "https://sdk.scdn.co/spotify-player.js";
  script.async = true;
  document.body.appendChild(script);

  setTimeout(() => {
    if (!window.Spotify) {
      onError("El SDK de Spotify no cargo a tiempo. Revisa tu conexion.");
    }
  }, 10000);
}

export type TrackMeta = {
  albumImageUrl: string;
  artistName: string;
  trackName: string;
};

export async function searchAndPlay(
  query: string,
  accessToken: string,
  deviceId: string
): Promise<TrackMeta | null> {
  const tracks = await searchTracks(query, accessToken, { limit: 1 });
  const track = tracks[0];

  if (!track) {
    throw new Error("Track no encontrado en Spotify.");
  }

  await playTrack(accessToken, {
    deviceId,
    trackUri: track.uri,
  });

  return {
    albumImageUrl: track.albumImageUrl ?? "",
    artistName: track.artists[0] ?? "",
    trackName: track.name,
  };
}

export type { SpotifyTrack } from "@/lib/spotify-api";
