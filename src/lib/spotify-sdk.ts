const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-private",
  "user-read-email",
  "user-read-playback-state",
].join(" ");

function base64urlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function buildAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_SPOTIFY_CLIENT_ID no configurado.");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/spotify/callback`;

  // code_verifier: 64 bytes random, base64url
  const verifierBytes = new Uint8Array(64);
  crypto.getRandomValues(verifierBytes);
  const codeVerifier = base64urlEncode(verifierBytes.buffer);

  // Pasamos el verifier como state para que el callback server-side lo pueda leer
  const state = codeVerifier;

  // Construir la URL de autorización (challenge se calcula async, usamos el verifier directo via state)
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
    code_challenge_method: "S256",
    // El challenge se calculará en el callback usando el state
    code_challenge: "", // placeholder, se reemplaza abajo
  });

  // Calcular code_challenge síncronamente no es posible (SHA-256 es async)
  // Devolvemos una promesa, pero para mantener la firma simple usamos la versión async en buildAuthUrlAsync
  throw new Error("Usá buildAuthUrlAsync en su lugar.");
}

export async function buildAuthUrlAsync(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_SPOTIFY_CLIENT_ID no configurado.");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/spotify/callback`;

  // code_verifier: 64 bytes random, base64url
  const verifierBytes = new Uint8Array(64);
  crypto.getRandomValues(verifierBytes);
  const codeVerifier = base64urlEncode(verifierBytes.buffer);

  // code_challenge: SHA-256 del verifier, base64url
  const verifierEncoded = new TextEncoder().encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", verifierEncoded);
  const codeChallenge = base64urlEncode(hashBuffer);

  // Pasamos el verifier como state para que el callback server-side lo pueda leer
  const state = codeVerifier;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
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
        onError(`Error de inicialización: ${message}`);
      });

      player.addListener("authentication_error", ({ message }) => {
        onError(`Error de autenticación: ${message}`);
      });

      player.addListener("account_error", ({ message }) => {
        onError(`Cuenta no compatible: ${message}`);
      });

      player.connect();
    };
  }

  // Si el SDK ya está cargado, inicializar directamente
  if (window.Spotify) {
    setupPlayer();
    window.onSpotifyWebPlaybackSDKReady();
    return;
  }

  // Si ya está el script, solo configurar el callback
  if (document.getElementById(scriptId)) {
    setupPlayer();
    return;
  }

  // Cargar el script por primera vez
  setupPlayer();
  const script = document.createElement("script");
  script.id = scriptId;
  script.src = "https://sdk.scdn.co/spotify-player.js";
  script.async = true;
  document.body.appendChild(script);

  // Timeout de seguridad: 10s
  setTimeout(() => {
    if (!window.Spotify) {
      onError("El SDK de Spotify no cargó a tiempo. Revisá tu conexión.");
    }
  }, 10000);
}

export async function searchAndPlay(
  query: string,
  accessToken: string,
  deviceId: string
): Promise<void> {
  // Buscar el track
  const searchRes = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!searchRes.ok) {
    throw new Error(`Error buscando en Spotify: ${searchRes.status}`);
  }

  const searchData = (await searchRes.json()) as {
    tracks: { items: { uri: string; name: string }[] };
  };

  const track = searchData.tracks.items[0];
  if (!track) {
    throw new Error("Track no encontrado en Spotify.");
  }

  // Reproducir
  const playRes = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris: [track.uri] }),
  });

  if (!playRes.ok && playRes.status !== 204) {
    throw new Error(`Error reproduciendo en Spotify: ${playRes.status}`);
  }
}
