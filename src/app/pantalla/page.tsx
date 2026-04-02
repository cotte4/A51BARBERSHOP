"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildAuthUrlAsync, initSpotifyPlayer, searchAndPlay } from "@/lib/spotify-sdk";

type PantallaEvent = {
  id: string;
  turnoId: string;
  cancion: string;
  clienteNombre: string;
  createdAt: string;
};

const LAST_SEEN_STORAGE_KEY = "a51-pantalla-last-seen";
const SPOTIFY_ACCESS_TOKEN_KEY = "spotify_access_token";
const SPOTIFY_REFRESH_TOKEN_KEY = "spotify_refresh_token";
const POLL_INTERVAL_MS = 3000;

function buildSpotifySearchUrl(song: string) {
  return `https://open.spotify.com/search/${encodeURIComponent(song)}`;
}

export default function PantallaPage() {
  const [lastEvent, setLastEvent] = useState<PantallaEvent | null>(null);
  const [connectionState, setConnectionState] = useState<"connecting" | "online" | "offline">(
    "connecting"
  );
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  // Spotify state
  const [spotifyReady, setSpotifyReady] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false); // tiene refresh token
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

  // Refresca el access token via el endpoint interno
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const rt = refreshTokenRef.current;
    if (!rt) return null;

    try {
      const res = await fetch("/api/spotify/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) {
        // Refresh token inválido — hay que reconectar
        localStorage.removeItem(SPOTIFY_ACCESS_TOKEN_KEY);
        localStorage.removeItem(SPOTIFY_REFRESH_TOKEN_KEY);
        refreshTokenRef.current = null;
        accessTokenRef.current = null;
        setSpotifyConnected(false);
        setSpotifyReady(false);
        setSpotifyError("La sesión de Spotify expiró. Reconectá.");
        return null;
      }

      const data = (await res.json()) as {
        accessToken: string;
        expiresIn: number;
        refreshToken?: string;
      };

      accessTokenRef.current = data.accessToken;
      localStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, data.accessToken);

      // Si Spotify rotó el refresh token, guardamos el nuevo
      if (data.refreshToken) {
        refreshTokenRef.current = data.refreshToken;
        localStorage.setItem(SPOTIFY_REFRESH_TOKEN_KEY, data.refreshToken);
      }

      return data.accessToken;
    } catch {
      return null;
    }
  }, []);

  // Inicializa el Web Playback SDK
  const setupPlayer = useCallback(() => {
    initSpotifyPlayer(
      // getOAuthToken: el SDK llama esto cuando necesita un token válido
      (callback) => {
        const token = accessTokenRef.current;
        if (token) {
          callback(token);
        } else {
          refreshAccessToken().then((newToken) => {
            if (newToken) callback(newToken);
          });
        }
      },
      // onReady
      (deviceId) => {
        deviceIdRef.current = deviceId;
        setSpotifyReady(true);
        setSpotifyError(null);
      },
      // onError
      (message) => {
        setSpotifyError(message);
        setSpotifyReady(false);
      }
    );
  }, [refreshAccessToken]);

  // Montar: leer tokens de URL o localStorage, inicializar SDK
  useEffect(() => {
    const url = new URL(window.location.href);

    // Leer error de Spotify si lo hay
    const spotifyErr = url.searchParams.get("spotify_error");
    if (spotifyErr) {
      const mensajes: Record<string, string> = {
        auth_failed: "No se pudo autenticar con Spotify.",
        token_failed: "Error al obtener el token de Spotify.",
        config_missing: "Configuración de Spotify incompleta en el servidor.",
        unexpected: "Error inesperado con Spotify.",
      };
      setSpotifyError(mensajes[spotifyErr] ?? "Error con Spotify.");
    }

    // Leer tokens desde la URL (post-callback de OAuth)
    const accessToken = url.searchParams.get("access_token");
    const refreshToken = url.searchParams.get("refresh_token");

    if (accessToken && refreshToken) {
      localStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(SPOTIFY_REFRESH_TOKEN_KEY, refreshToken);
      accessTokenRef.current = accessToken;
      refreshTokenRef.current = refreshToken;

      // Limpiar tokens de la URL
      url.searchParams.delete("access_token");
      url.searchParams.delete("refresh_token");
      url.searchParams.delete("expires_in");
      url.searchParams.delete("spotify_error");
      window.history.replaceState({}, "", url.pathname);

      setSpotifyConnected(true);
      setupPlayer();
      return;
    }

    // Leer tokens desde localStorage
    const storedAccess = localStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY);
    const storedRefresh = localStorage.getItem(SPOTIFY_REFRESH_TOKEN_KEY);

    if (storedRefresh) {
      accessTokenRef.current = storedAccess;
      refreshTokenRef.current = storedRefresh;
      setSpotifyConnected(true);
      setupPlayer();
    }

    // Leer lastSeen del polling
    const stored = localStorage.getItem(LAST_SEEN_STORAGE_KEY);
    if (stored) {
      lastSeenRef.current = stored;
    }
  }, [setupPlayer]);

  const lastSeenRef = useRef<string>("");

  // Polling
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const after = lastSeenRef.current
          ? `?after=${encodeURIComponent(lastSeenRef.current)}`
          : "";
        const response = await fetch(`/api/turnos/pantalla-latest${after}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as { event?: PantallaEvent | null; error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "No pude consultar la pantalla.");
        }

        if (cancelled) return;

        setConnectionState("online");

        if (data.event) {
          const event = data.event;
          lastSeenRef.current = event.createdAt;
          localStorage.setItem(LAST_SEEN_STORAGE_KEY, event.createdAt);
          setLastEvent(event);
          setManualUrl(null);

          // Intentar reproducir con Spotify SDK
          if (spotifyReady && deviceIdRef.current && accessTokenRef.current) {
            try {
              await searchAndPlay(event.cancion, accessTokenRef.current, deviceIdRef.current);
            } catch {
              // Si falla la reproducción, refrescar token y reintentar una vez
              const newToken = await refreshAccessToken();
              if (newToken && deviceIdRef.current) {
                try {
                  await searchAndPlay(event.cancion, newToken, deviceIdRef.current);
                } catch {
                  setManualUrl(buildSpotifySearchUrl(event.cancion));
                }
              } else {
                setManualUrl(buildSpotifySearchUrl(event.cancion));
              }
            }
          } else {
            // Fallback: link manual o window.open
            const url = buildSpotifySearchUrl(event.cancion);
            const popup = window.open(url, "_blank", "noopener,noreferrer");
            setManualUrl(popup ? null : url);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Pantalla polling error:", error);
          setConnectionState("offline");
        }
      }
    }

    // Leer lastSeen inicial del localStorage
    const stored = localStorage.getItem(LAST_SEEN_STORAGE_KEY);
    if (stored) lastSeenRef.current = stored;

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [spotifyReady, refreshAccessToken]);

  async function handleConectarSpotify() {
    try {
      const authUrl = await buildAuthUrlAsync();
      window.location.href = authUrl;
    } catch (err) {
      setSpotifyError("No se pudo iniciar la conexión con Spotify.");
      console.error(err);
    }
  }

  function handleDesconectarSpotify() {
    localStorage.removeItem(SPOTIFY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(SPOTIFY_REFRESH_TOKEN_KEY);
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    setSpotifyConnected(false);
    setSpotifyReady(false);
    setSpotifyError(null);
  }

  // Badge de estado de conexión
  const connectionLabel = spotifyReady
    ? "Spotify conectado"
    : connectionState === "online"
      ? "Conectada"
      : connectionState === "offline"
        ? "Reconectando..."
        : "Conectando...";

  const connectionClass = spotifyReady
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
    : connectionState === "online"
      ? "border-sky-400/30 bg-sky-500/10 text-sky-200"
      : connectionState === "offline"
        ? "border-red-400/30 bg-red-500/10 text-red-200"
        : "border-zinc-500/30 bg-zinc-500/10 text-zinc-200";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(217,70,239,0.16),_transparent_35%),#020617] px-6 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/80">
              A51 Barber
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Pantalla musical
            </h1>
          </div>
          <div className={`rounded-full border px-4 py-2 text-sm font-medium ${connectionClass}`}>
            {connectionLabel}
          </div>
        </div>

        {/* Error de Spotify */}
        {spotifyError && (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4">
            <p className="text-sm text-red-200">{spotifyError}</p>
            <button
              onClick={handleConectarSpotify}
              className="mt-3 rounded-xl border border-red-400/40 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/30"
            >
              Reconectar Spotify
            </button>
          </div>
        )}

        {/* Panel principal */}
        <section className="mt-10 rounded-[36px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          {lastEvent ? (
            <div className="space-y-5">
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-fuchsia-200/80">
                Última llegada
              </p>
              <h2 className="text-4xl font-semibold text-white sm:text-6xl">
                {lastEvent.clienteNombre}
              </h2>
              <p className="text-xl text-sky-100 sm:text-3xl">♪ {lastEvent.cancion}</p>
              <p className="text-sm text-zinc-300">
                {new Date(lastEvent.createdAt).toLocaleString("es-AR", {
                  timeZone: "America/Argentina/Buenos_Aires",
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                })}
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-zinc-400">
                Esperando turno...
              </p>
              <h2 className="text-4xl font-semibold text-white sm:text-6xl">Listos para sonar</h2>
              <p className="mx-auto max-w-2xl text-base text-zinc-300 sm:text-lg">
                Cuando Pinky toque &quot;Llegó&quot; en un turno confirmado con sugerencia de
                canción, esta pantalla va a reproducir la canción en Spotify.
              </p>
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {!spotifyConnected && !spotifyError && (
              <button
                onClick={handleConectarSpotify}
                className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20"
              >
                Conectar Spotify
              </button>
            )}
            {spotifyConnected && (
              <button
                onClick={handleDesconectarSpotify}
                className="rounded-2xl border border-zinc-500/30 bg-zinc-500/10 px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-500/20"
              >
                Desconectar
              </button>
            )}
            <p className="text-sm text-zinc-500">
              {spotifyReady
                ? "Reproducción automática activa"
                : `Polling cada ${POLL_INTERVAL_MS / 1000}s`}
            </p>
          </div>

          {manualUrl && (
            <a
              href={manualUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-3 text-sm font-semibold text-fuchsia-100 hover:bg-fuchsia-500/20"
            >
              Abrir Spotify manualmente
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
