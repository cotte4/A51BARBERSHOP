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
