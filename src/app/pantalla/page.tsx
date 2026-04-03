"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { buildAuthUrlAsync, initSpotifyPlayer, searchAndPlay, type TrackMeta } from "@/lib/spotify-sdk";

type PantallaEvent = {
  id: string;
  turnoId: string;
  cancion: string;
  clienteNombre: string;
  createdAt: string;
};

type ProximaCancion = {
  turnoId: string;
  clienteNombre: string;
  cancion: string;
  hora: string;
};

type RankingCancion = {
  cancion: string;
  count: number;
};

type VoteCountResponse = {
  eventId?: string;
  count?: number;
};

const LAST_SEEN_STORAGE_KEY = "a51-pantalla-last-seen";
const SPOTIFY_ACCESS_TOKEN_KEY = "spotify_access_token";
const SPOTIFY_REFRESH_TOKEN_KEY = "spotify_refresh_token";
const POLL_INTERVAL_MS = 3000;
const PROXIMAS_INTERVAL_MS = 30_000;
const RANKING_INTERVAL_MS = 5 * 60_000;
const VOTE_POLL_INTERVAL_MS = 5000;
const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

function buildSpotifySearchUrl(song: string) {
  return `https://open.spotify.com/search/${encodeURIComponent(song)}`;
}

function getArgentinaDayKey(dateLike: string | Date) {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return date.toLocaleDateString("en-CA", {
    timeZone: ARGENTINA_TIME_ZONE,
  });
}

function isTodayInArgentina(dateLike: string | Date) {
  return getArgentinaDayKey(dateLike) === getArgentinaDayKey(new Date());
}

export default function PantallaPage() {
  const [lastEvent, setLastEvent] = useState<PantallaEvent | null>(null);
  const [connectionState, setConnectionState] = useState<"connecting" | "online" | "offline">(
    "connecting"
  );
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const [trackMeta, setTrackMeta] = useState<TrackMeta | null>(null);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [proximasCanciones, setProximasCanciones] = useState<ProximaCancion[]>([]);
  const [rankingCanciones, setRankingCanciones] = useState<RankingCancion[]>([]);
  const [voteCount, setVoteCount] = useState<number>(0);
  const [voteLoading, setVoteLoading] = useState(false);
  const [pageOrigin, setPageOrigin] = useState<string | null>(null);

  // Spotify state
  const [spotifyReady, setSpotifyReady] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

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
        localStorage.removeItem(SPOTIFY_ACCESS_TOKEN_KEY);
        localStorage.removeItem(SPOTIFY_REFRESH_TOKEN_KEY);
        refreshTokenRef.current = null;
        accessTokenRef.current = null;
        setSpotifyConnected(false);
        setSpotifyReady(false);
        setSpotifyError("La sesion de Spotify expiro. Reconecta.");
        return null;
      }

      const data = (await res.json()) as {
        accessToken: string;
        expiresIn: number;
        refreshToken?: string;
      };

      accessTokenRef.current = data.accessToken;
      localStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, data.accessToken);

      if (data.refreshToken) {
        refreshTokenRef.current = data.refreshToken;
        localStorage.setItem(SPOTIFY_REFRESH_TOKEN_KEY, data.refreshToken);
      }

      return data.accessToken;
    } catch {
      return null;
    }
  }, []);

  const setupPlayer = useCallback(() => {
    initSpotifyPlayer(
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
      (deviceId) => {
        deviceIdRef.current = deviceId;
        setSpotifyReady(true);
        setSpotifyError(null);
      },
      (message) => {
        setSpotifyError(message);
        setSpotifyReady(false);
      }
    );
  }, [refreshAccessToken]);

  useEffect(() => {
    const url = new URL(window.location.href);
    setPageOrigin(window.location.origin);

    const spotifyErr = url.searchParams.get("spotify_error");
    if (spotifyErr) {
      const mensajes: Record<string, string> = {
        auth_failed: "No se pudo autenticar con Spotify.",
        token_failed: "Error al obtener el token de Spotify.",
        config_missing: "Configuracion de Spotify incompleta en el servidor.",
        unexpected: "Error inesperado con Spotify.",
      };
      setSpotifyError(mensajes[spotifyErr] ?? "Error con Spotify.");
    }

    const accessToken = url.searchParams.get("access_token");
    const refreshToken = url.searchParams.get("refresh_token");

    if (accessToken && refreshToken) {
      localStorage.setItem(SPOTIFY_ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(SPOTIFY_REFRESH_TOKEN_KEY, refreshToken);
      accessTokenRef.current = accessToken;
      refreshTokenRef.current = refreshToken;

      url.searchParams.delete("access_token");
      url.searchParams.delete("refresh_token");
      url.searchParams.delete("expires_in");
      url.searchParams.delete("spotify_error");
      window.history.replaceState({}, "", url.pathname);

      setSpotifyConnected(true);
      setupPlayer();
      return;
    }

    const storedAccess = localStorage.getItem(SPOTIFY_ACCESS_TOKEN_KEY);
    const storedRefresh = localStorage.getItem(SPOTIFY_REFRESH_TOKEN_KEY);

    if (storedRefresh) {
      accessTokenRef.current = storedAccess;
      refreshTokenRef.current = storedRefresh;
      setSpotifyConnected(true);
      setupPlayer();
    }

    const stored = localStorage.getItem(LAST_SEEN_STORAGE_KEY);
    if (stored && isTodayInArgentina(stored)) {
      lastSeenRef.current = stored;
    } else if (stored) {
      localStorage.removeItem(LAST_SEEN_STORAGE_KEY);
    }
  }, [setupPlayer]);

  const lastSeenRef = useRef<string>("");

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
        const data = (await response.json()) as {
          event?: PantallaEvent | null;
          todayCount?: number;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "No pude consultar la pantalla.");
        }

        if (cancelled) return;

        setConnectionState("online");

        if (typeof data.todayCount === "number") {
          setTodayCount(data.todayCount);
        }

        if (!data.event && lastEvent && !isTodayInArgentina(lastEvent.createdAt)) {
          localStorage.removeItem(LAST_SEEN_STORAGE_KEY);
          lastSeenRef.current = "";
          setLastEvent(null);
          setManualUrl(null);
          setTrackMeta(null);
        }

        if (data.event) {
          const event = data.event;
          lastSeenRef.current = event.createdAt;
          localStorage.setItem(LAST_SEEN_STORAGE_KEY, event.createdAt);
          setLastEvent(event);
          setManualUrl(null);
          setTrackMeta(null);

          if (spotifyReady && deviceIdRef.current && accessTokenRef.current) {
            try {
              const meta = await searchAndPlay(
                event.cancion,
                accessTokenRef.current,
                deviceIdRef.current
              );
              if (meta) setTrackMeta(meta);
            } catch {
              const newToken = await refreshAccessToken();
              if (newToken && deviceIdRef.current) {
                try {
                  const meta = await searchAndPlay(event.cancion, newToken, deviceIdRef.current);
                  if (meta) setTrackMeta(meta);
                } catch {
                  setManualUrl(buildSpotifySearchUrl(event.cancion));
                }
              } else {
                setManualUrl(buildSpotifySearchUrl(event.cancion));
              }
            }
          } else {
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

    const stored = localStorage.getItem(LAST_SEEN_STORAGE_KEY);
    if (stored) lastSeenRef.current = stored;

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [lastEvent, spotifyReady, refreshAccessToken]);

  useEffect(() => {
    async function fetchProximas() {
      try {
        const res = await fetch("/api/turnos/proximas-canciones", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as ProximaCancion[];
        setProximasCanciones(data);
      } catch {
        // silencioso
      }
    }

    fetchProximas();
    const interval = window.setInterval(fetchProximas, PROXIMAS_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchRanking() {
      try {
        const res = await fetch("/api/turnos/ranking-canciones", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as RankingCancion[];
        setRankingCanciones(data);
      } catch {
        // silencioso
      }
    }

    fetchRanking();
    const interval = window.setInterval(fetchRanking, RANKING_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lastEvent?.id) {
      setVoteCount(0);
      setVoteLoading(false);
      return;
    }

    const eventId = lastEvent.id;
    let cancelled = false;

    async function fetchVotes() {
      try {
        setVoteLoading(true);
        const response = await fetch(`/api/pantalla/votos/${eventId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("No pude consultar los votos.");
        }

        const data = (await response.json()) as VoteCountResponse;
        if (!cancelled) {
          setVoteCount(typeof data.count === "number" ? data.count : 0);
        }
      } catch {
        if (!cancelled) {
          setVoteCount(0);
        }
      } finally {
        if (!cancelled) {
          setVoteLoading(false);
        }
      }
    }

    setVoteCount(0);
    fetchVotes();
    const interval = window.setInterval(fetchVotes, VOTE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [lastEvent?.id]);

  async function handleConectarSpotify() {
    try {
      const authUrl = await buildAuthUrlAsync();
      window.location.href = authUrl;
    } catch (err) {
      setSpotifyError("No se pudo iniciar la conexion con Spotify.");
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

  const voteUrl = lastEvent
    ? `${pageOrigin ?? process.env.NEXT_PUBLIC_APP_URL ?? ""}/pantalla/votar/${lastEvent.id}`
    : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(217,70,239,0.16),_transparent_35%),#020617] px-6 py-8 text-white">
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-between">
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

        <section className="mt-10 rounded-[36px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          {lastEvent ? (
            <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-10">
              <div className="flex flex-1 flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                {trackMeta?.albumImageUrl && (
                  <div className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={trackMeta.albumImageUrl}
                      alt={`Cover de ${trackMeta.trackName}`}
                      width={400}
                      height={400}
                      className="h-[200px] w-[200px] rounded-3xl object-cover shadow-[0_8px_40px_rgba(0,0,0,0.5)] sm:h-[260px] sm:w-[260px]"
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col justify-center space-y-5">
                  <p className="text-sm font-medium uppercase tracking-[0.25em] text-fuchsia-200/80">
                    Ultima llegada
                  </p>
                  <h2 className="text-4xl font-semibold text-white sm:text-6xl">
                    {lastEvent.clienteNombre}
                  </h2>
                  <p className="text-xl text-sky-100 sm:text-3xl">♪ {lastEvent.cancion}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-sm font-medium text-fuchsia-100">
                      {voteLoading
                        ? "Cargando votos..."
                        : voteCount > 0
                          ? `${voteCount} ${voteCount === 1 ? "voto" : "votos"}`
                          : "Se el primero en votar"}
                    </span>
                  </div>
                  {trackMeta?.artistName && (
                    <p className="text-base font-medium text-fuchsia-300 sm:text-lg">
                      {trackMeta.artistName}
                    </p>
                  )}
                  <p className="text-sm text-zinc-300">
                    {new Date(lastEvent.createdAt).toLocaleString("es-AR", {
                      timeZone: "America/Argentina/Buenos_Aires",
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </p>

                  <div className="flex items-end gap-[3px] pt-2" aria-hidden="true">
                    {[0, 0.15, 0.3, 0.45, 0.6].map((delay, i) => (
                      <div
                        key={i}
                        className="w-[5px] rounded-full bg-sky-400/80"
                        style={{
                          height: `${20 + (i % 3) * 8}px`,
                          animation: `wave 1.2s ease-in-out ${delay}s infinite`,
                          transformOrigin: "bottom",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {voteUrl && (
                <div className="rounded-[28px] border border-white/10 bg-white/6 p-4 text-center xl:w-[220px] xl:shrink-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">
                    Vota esta cancion
                  </p>
                  <div className="mt-4 flex justify-center rounded-[22px] bg-white p-3 shadow-[0_18px_60px_rgba(255,255,255,0.08)]">
                    <QRCodeSVG value={voteUrl} size={160} includeMargin />
                  </div>
                  <p className="mt-3 text-sm text-zinc-300">Escanea con tu celu y deja tu 👍</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-zinc-400">
                Esperando turno...
              </p>
              <h2 className="text-4xl font-semibold text-white sm:text-6xl">Listos para sonar</h2>
              <p className="mx-auto max-w-2xl text-base text-zinc-300 sm:text-lg">
                Cuando Pinky toque &quot;Llego&quot; en un turno confirmado con sugerencia de
                cancion, esta pantalla va a reproducir la cancion en Spotify.
              </p>
            </div>
          )}
        </section>

        {proximasCanciones.length > 0 && (
          <section className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Proximas canciones
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {proximasCanciones.map((item) => (
                <div
                  key={item.turnoId}
                  className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
                  style={{ minWidth: "160px" }}
                >
                  <p className="text-xs font-semibold text-sky-300">{item.hora.slice(0, 5)}</p>
                  <p className="mt-1 text-sm font-medium leading-tight text-white">
                    {item.clienteNombre}
                  </p>
                  <p
                    className="mt-0.5 truncate text-xs leading-tight text-fuchsia-200/80"
                    title={item.cancion}
                  >
                    ♪ {item.cancion}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {rankingCanciones.length > 0 && (
          <section className="mt-6 rounded-[28px] border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Top canciones del mes
            </p>
            <ol className="flex flex-col gap-2">
              {rankingCanciones.map((item, idx) => (
                <li key={item.cancion} className="flex items-center gap-3">
                  <span
                    className={`w-6 text-center text-sm font-bold tabular-nums ${
                      idx === 0
                        ? "text-amber-300"
                        : idx === 1
                          ? "text-zinc-300"
                          : idx === 2
                            ? "text-orange-400"
                            : "text-zinc-500"
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="flex-1 truncate text-sm text-white/90" title={item.cancion}>
                    {item.cancion}
                  </span>
                  <span className="shrink-0 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-semibold text-sky-300">
                    {item.count}×
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

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
                ? "Reproduccion automatica activa"
                : `Polling cada ${POLL_INTERVAL_MS / 1000}s`}
            </p>
            <p className="text-sm font-medium text-zinc-400">
              {todayCount} {todayCount === 1 ? "cancion" : "canciones"} hoy
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
