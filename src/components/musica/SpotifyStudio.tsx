"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Disc3,
  Loader2,
  Music2,
  Pause,
  Play,
  RefreshCw,
  Search,
  SkipBack,
  SkipForward,
  Speaker,
  SquareArrowOutUpRight,
} from "lucide-react";
import {
  getCurrentPlayback,
  listDevices,
  listPlaylistTracks,
  listPlaylists,
  pausePlayback,
  playPlaylist,
  playTrack,
  resumePlayback,
  searchTracks,
  skipToNext,
  skipToPrevious,
  SpotifyApiError,
  transferPlayback,
  type SpotifyDevice,
  type SpotifyPlaybackState,
  type SpotifyPlaylist,
  type SpotifyPlaylistTrack,
  type SpotifyTrack,
} from "@/lib/spotify-api";
import { buildAuthUrlAsync } from "@/lib/spotify-sdk";
import {
  clearSpotifyAuthTokens,
  getSpotifySelectedDeviceId,
  getSpotifySessionSnapshot,
  setSpotifySelectedDeviceId,
  setSpotifyTokens,
} from "@/lib/spotify-session";

type StudioTrack = SpotifyTrack & { imageUrl: string };

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function mapSpotifyError(error: unknown, fallback: string) {
  if (error instanceof SpotifyApiError) {
    if (error.status === 403) return "Spotify Premium es obligatorio para usar esta pantalla.";
    if (error.status === 404) return "No encontramos un device activo de Spotify.";
    if (error.status === 429) return "Spotify pidio esperar un poco antes de reintentar.";
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export default function SpotifyStudio() {
  const [ready, setReady] = useState(false);
  const [statusKind, setStatusKind] = useState<"idle" | "ready" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [playlistTracks, setPlaylistTracks] = useState<Record<string, SpotifyPlaylistTrack[]>>({});
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<StudioTrack[]>([]);
  const [nowPlaying, setNowPlaying] = useState<SpotifyPlaybackState | null>(null);
  const [selectedDeviceId, setSelectedDeviceIdState] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [loadingPlaylistTracks, setLoadingPlaylistTracks] = useState<string | null>(null);
  const [loadingMorePlaylistId, setLoadingMorePlaylistId] = useState<string | null>(null);
  const [loadingNowPlaying, setLoadingNowPlaying] = useState(false);
  const [searching, setSearching] = useState(false);

  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const refreshingRef = useRef<Promise<string | null> | null>(null);

  function saveSession(
    accessToken: string | null,
    refreshToken: string | null,
    deviceId?: string | null,
    expiresInSeconds?: number | null
  ) {
    accessTokenRef.current = accessToken;
    refreshTokenRef.current = refreshToken;
    if (accessToken && refreshToken) {
      setSpotifyTokens({ accessToken, refreshToken, expiresInSeconds });
    } else if (!accessToken && !refreshToken) {
      clearSpotifyAuthTokens();
    }
    if (deviceId !== undefined) {
      setSelectedDeviceIdState(deviceId ?? "");
      setSpotifySelectedDeviceId(deviceId);
    }
  }

  async function refreshAccessToken() {
    if (!refreshTokenRef.current) return null;
    if (refreshingRef.current) return refreshingRef.current;
    const task = (async () => {
      const response = await fetch("/api/spotify/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshTokenRef.current }),
      });
      if (!response.ok) {
        saveSession(null, null, null);
        setStatusKind("error");
        setStatusMessage("No pude renovar la sesion de Spotify.");
        return null;
      }
      const data = (await response.json()) as {
        accessToken: string;
        expiresIn: number;
        refreshToken?: string;
      };
      saveSession(
        data.accessToken,
        data.refreshToken ?? refreshTokenRef.current,
        selectedDeviceId || null,
        data.expiresIn
      );
      return data.accessToken;
    })();
    refreshingRef.current = task;
    try {
      return await task;
    } finally {
      refreshingRef.current = null;
    }
  }

  async function resolveToken() {
    return accessTokenRef.current || (await refreshAccessToken());
  }

  async function loadDevices() {
    setLoadingDevices(true);
    try {
      const token = await resolveToken();
      if (!token) throw new Error("Conecta Spotify primero.");
      const next = await listDevices(token);
      setDevices(next);
      const stored = getSpotifySelectedDeviceId();
      const selected =
        stored && next.some((device) => device.id === stored)
          ? stored
          : next.find((device) => device.isActive)?.id ?? next[0]?.id ?? "";
      if (selected) saveSession(accessTokenRef.current, refreshTokenRef.current, selected);
      if (next.length > 0) setStatusKind("ready");
    } catch (error) {
      setStatusKind("error");
      setStatusMessage(mapSpotifyError(error, "No pude cargar devices."));
    } finally {
      setLoadingDevices(false);
    }
  }

  async function loadPlaylists() {
    setLoadingPlaylists(true);
    try {
      const token = await resolveToken();
      if (!token) throw new Error("Conecta Spotify primero.");
      setPlaylists(await listPlaylists(token));
    } catch (error) {
      setStatusKind("error");
      setStatusMessage(mapSpotifyError(error, "No pude cargar playlists."));
    } finally {
      setLoadingPlaylists(false);
    }
  }

  async function loadNowPlaying() {
    setLoadingNowPlaying(true);
    try {
      const token = await resolveToken();
      if (!token) throw new Error("Conecta Spotify primero.");
      setNowPlaying(await getCurrentPlayback(token));
    } catch (error) {
      setStatusKind("error");
      setStatusMessage(mapSpotifyError(error, "No pude leer el estado actual."));
    } finally {
      setLoadingNowPlaying(false);
    }
  }

  async function loadAll() {
    await Promise.all([loadDevices(), loadPlaylists(), loadNowPlaying()]);
  }

  async function connectSpotify() {
    try {
      window.location.href = await buildAuthUrlAsync("/musica");
    } catch (error) {
      setStatusKind("error");
      setStatusMessage(error instanceof Error ? error.message : "No pude iniciar Spotify.");
    }
  }

  async function pickDevice(deviceId: string) {
    setBusy(`device:${deviceId}`);
    try {
      const token = await resolveToken();
      if (!token) throw new Error("Conecta Spotify primero.");
      await transferPlayback(token, deviceId, false);
      saveSession(accessTokenRef.current, refreshTokenRef.current, deviceId);
      await loadNowPlaying();
      setStatusKind("ready");
      setStatusMessage("Device compartido configurado.");
    } catch (error) {
      setStatusKind("error");
      setStatusMessage(mapSpotifyError(error, "No pude cambiar el device."));
    } finally {
      setBusy(null);
    }
  }

  async function searchTracksAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      setStatusKind("error");
      setStatusMessage("Escribi una busqueda primero.");
      return;
    }
    setSearching(true);
    try {
      const token = await resolveToken();
      if (!token) throw new Error("Conecta Spotify primero.");
      const results = await searchTracks(value, token, { limit: 8 });
      setTracks(results.map((track) => ({ ...track, imageUrl: track.albumImageUrl ?? "" })));
      setStatusKind("ready");
      setStatusMessage("Resultados listos.");
    } catch (error) {
      setStatusKind("error");
      setStatusMessage(mapSpotifyError(error, "No pude buscar canciones."));
    } finally {
      setSearching(false);
    }
  }

  async function playTrackAction(track: StudioTrack) {
    const deviceId = selectedDeviceId || devices.find((device) => device.isActive)?.id || "";
    if (!deviceId) {
      setStatusKind("error");
      setStatusMessage("Primero elegi un device.");
      return;
    }
    setBusy(`track:${track.id}`);
    try {
      const token = await resolveToken();
      if (!token) throw new Error("Conecta Spotify primero.");
      await playTrack(token, { deviceId, trackUri: track.uri });
      await loadNowPlaying();
      setStatusKind("ready");
      setStatusMessage("Track enviado al parlante.");
    } catch (error) {
      setStatusKind("error");
      setStatusMessage(mapSpotifyError(error, "No pude reproducir el track."));
    } finally {
      setBusy(null);
    }
  }

  async function playPlaylistAction(playlist: SpotifyPlaylist) {
    const deviceId = selectedDeviceId || devices.find((device) => device.isActive)?.id || "";
    if (!deviceId) {
      setStatusKind("error");
      setStatusMessage("Primero elegi un device.");
      return;
    }
    setBusy(`playlist:${playlist.id}`);
    try {
      const token = await resolveToken();
      if (!token) throw new Error("Conecta Spotify primero.");
      await playPlaylist(token, { deviceId, playlistUri: playlist.uri });
      await loadNowPlaying();
      setStatusKind("ready");
      setStatusMessage("Playlist enviada al parlante.");
    } catch (error) {
      setStatusKind("error");
      setStatusMessage(mapSpotifyError(error, "No pude reproducir la playlist."));
    } finally {
      setBusy(null);
    }
  }

  async function togglePlaylist(playlist: SpotifyPlaylist) {
    if (openPlaylistId === playlist.id) {
      setOpenPlaylistId(null);
      return;
    }
    setOpenPlaylistId(playlist.id);
    if (playlistTracks[playlist.id]) return;
    setLoadingPlaylistTracks(playlist.id);
    try {
      const token = await resolveToken();
      if (!token) throw new Error("Conecta Spotify primero.");
      const nextTracks = await listPlaylistTracks(token, playlist.id, { limit: 25 });
      setPlaylistTracks((current) => ({ ...current, [playlist.id]: nextTracks }));
      setStatusKind("ready");
      setStatusMessage(`Playlist ${playlist.name} lista para elegir temas.`);
    } catch (error) {
      setStatusKind("error");
      setStatusMessage(mapSpotifyError(error, "No pude cargar los temas de la playlist."));
    } finally {
      setLoadingPlaylistTracks(null);
    }
  }

  async function loadMorePlaylistTracks(playlist: SpotifyPlaylist) {
    const existing = playlistTracks[playlist.id] ?? [];
    if (existing.length >= playlist.trackCount) return;

    setLoadingMorePlaylistId(playlist.id);
    try {
      const token = await resolveToken();
      if (!token) throw new Error("Conecta Spotify primero.");
      const nextTracks = await listPlaylistTracks(token, playlist.id, {
        limit: 25,
        offset: existing.length,
      });
      setPlaylistTracks((current) => ({
        ...current,
        [playlist.id]: [...(current[playlist.id] ?? []), ...nextTracks],
      }));
      setStatusKind("ready");
      setStatusMessage(`Cargados ${existing.length + nextTracks.length} temas de ${playlist.name}.`);
    } catch (error) {
      setStatusKind("error");
      setStatusMessage(mapSpotifyError(error, "No pude cargar mas temas de la playlist."));
    } finally {
      setLoadingMorePlaylistId(null);
    }
  }

  async function transport(action: "pause" | "resume" | "next" | "previous") {
    setBusy(action);
    try {
      const token = await resolveToken();
      if (!token) throw new Error("Conecta Spotify primero.");
      if (action === "pause") await pausePlayback(token, selectedDeviceId || null);
      else if (action === "resume") await resumePlayback(token, selectedDeviceId || null);
      else if (action === "next") await skipToNext(token, selectedDeviceId || null);
      else await skipToPrevious(token, selectedDeviceId || null);
      await loadNowPlaying();
      setStatusKind("ready");
      setStatusMessage(action === "pause" ? "Reproduccion pausada." : action === "resume" ? "Reproduccion reanudada." : "Control ejecutado.");
    } catch (error) {
      setStatusKind("error");
      setStatusMessage(mapSpotifyError(error, "No pude ejecutar el control."));
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const accessToken = url.searchParams.get("access_token");
    const refreshToken = url.searchParams.get("refresh_token");
    const expiresIn = Number(url.searchParams.get("expires_in") ?? 0);
    if (accessToken && refreshToken) {
      saveSession(
        accessToken,
        refreshToken,
        getSpotifySelectedDeviceId(),
        Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : null
      );
      url.searchParams.delete("access_token");
      url.searchParams.delete("refresh_token");
      url.searchParams.delete("expires_in");
      url.searchParams.delete("spotify_error");
      window.history.replaceState({}, "", url.pathname);
    } else {
      const session = getSpotifySessionSnapshot();
      saveSession(session.accessToken, session.refreshToken, session.selectedDeviceId);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !refreshTokenRef.current) return;
    void loadAll();
  }, [ready]);

  useEffect(() => {
    if (!ready || !refreshTokenRef.current) return;
    const interval = window.setInterval(() => {
      void loadNowPlaying();
    }, 20_000);
    return () => window.clearInterval(interval);
  }, [ready, selectedDeviceId]);

  const currentDevice =
    devices.find((device) => device.id === selectedDeviceId) ??
    devices.find((device) => device.isActive) ??
    null;

  const statusTone =
    statusKind === "ready"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : statusKind === "error"
        ? "border-red-400/30 bg-red-500/10 text-red-100"
        : "border-zinc-700 bg-zinc-900 text-zinc-300";

  return (
    <section className="space-y-4">
      {statusMessage ? <div className={`rounded-[24px] border px-4 py-3 text-sm ${statusTone}`}>{statusMessage}</div> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`rounded-full border px-4 py-2 text-sm font-medium ${statusTone}`}>
          Spotify {refreshTokenRef.current ? "conectado" : "desconectado"}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void connectSpotify()} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] hover:bg-[#b6ff84]">
            <SquareArrowOutUpRight className="h-4 w-4" />
            Conectar Spotify
          </button>
          <button onClick={() => void loadAll()} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card title="Parlante" icon={<Speaker className="h-4 w-4" />} subtitle="El parlante del local. Compartido con el flujo de turnos.">
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
              <span>{devices.length} devices</span>
              <span>-</span>
              <span>{currentDevice ? currentDevice.name : "sin seleccion"}</span>
            </div>
            {loadingDevices ? <Empty label="Cargando devices..." /> : null}
            {!loadingDevices && devices.length === 0 ? <Empty label="Sin parlantes activos" description="Abrí Spotify en el dispositivo del local y volvé a refrescar." /> : null}
            <div className="mt-4 grid gap-3">
              {devices.map((device) => {
                const active = device.id === selectedDeviceId;
                return (
                  <button
                    key={device.id}
                    onClick={() => void pickDevice(device.id)}
                    disabled={busy === `device:${device.id}`}
                    className={`rounded-[24px] border p-4 text-left transition ${active ? "border-[#8cff59]/40 bg-[#8cff59]/10" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{device.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">{device.type} - {device.volumePercent ?? "-"}%</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-[#8cff59] text-[#07130a]" : "bg-zinc-800 text-zinc-400"}`}>
                        {active ? "Seleccionado" : "Usar"}
                      </span>
                    </div>
                    {device.isRestricted ? <p className="mt-2 text-xs text-amber-300">Device con restricciones.</p> : null}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Ahora suena" icon={<Music2 className="h-4 w-4" />} subtitle="Lo que está sonando en el local.">
            {loadingNowPlaying ? <Empty label="Leyendo estado..." /> : null}
            {!loadingNowPlaying && nowPlaying?.item ? (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
                    {nowPlaying.item.albumImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={nowPlaying.item.albumImageUrl} alt={nowPlaying.item.albumName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-700">
                        <Disc3 className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">{nowPlaying.isPlaying ? "Reproduciendo" : "Pausado"}</p>
                    <h3 className="mt-2 truncate text-2xl font-semibold text-white">{nowPlaying.item.name}</h3>
                    <p className="mt-2 text-sm text-zinc-400">{nowPlaying.item.artists.join(" - ")}</p>
                    <p className="mt-2 text-xs text-zinc-500">{nowPlaying.contextType ? `${nowPlaying.contextType} - ` : ""}{formatMs(nowPlaying.progressMs)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void transport("previous")} className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
                    <SkipBack className="h-4 w-4" />
                    Anterior
                  </button>
                  <button onClick={() => void transport(nowPlaying.isPlaying ? "pause" : "resume")} className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] hover:bg-[#b6ff84]">
                    {nowPlaying.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {nowPlaying.isPlaying ? "Pausar" : "Reanudar"}
                  </button>
                  <button onClick={() => void transport("next")} className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
                    <SkipForward className="h-4 w-4" />
                    Siguiente
                  </button>
                </div>
              </div>
            ) : (
              <Empty label="Nada sonando" description="Elegí una canción o playlist para empezar." />
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Buscar" icon={<Search className="h-4 w-4" />} subtitle="Buscá cualquier canción y ponela directamente.">
            <form onSubmit={(event) => void searchTracksAction(event)} className="space-y-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ej: Daft Punk, lofi, Bad Bunny..."
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#8cff59]"
              />
              <button type="submit" disabled={searching} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] hover:bg-[#b6ff84] disabled:opacity-60">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {searching ? "Buscando..." : "Buscar"}
              </button>
            </form>
            <div className="mt-4 space-y-3">
              {tracks.map((track) => (
                <article
                  key={track.id}
                  onClick={() => void playTrackAction(track)}
                  className={`rounded-[22px] border border-zinc-800 bg-zinc-950 p-3 cursor-pointer hover:border-zinc-600 hover:bg-zinc-900 active:scale-[0.98] transition-all ${busy === `track:${track.id}` ? "opacity-60 pointer-events-none" : ""}`}
                >
                  <div className="flex gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                      {track.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={track.imageUrl} alt={track.albumName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-700">
                          <Music2 className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{track.name}</p>
                      <p className="mt-1 truncate text-xs text-zinc-400">{track.artists.join(" - ")}</p>
                      <p className="mt-1 truncate text-xs text-zinc-600">{track.albumName}</p>
                    </div>
                    <div className="inline-flex h-10 shrink-0 items-center justify-center w-10 rounded-2xl bg-[#8cff59] text-[#07130a]">
                      {busy === `track:${track.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </div>
                  </div>
                </article>
              ))}
              {!tracks.length ? <Empty label="Sin resultados" description="Escribí el nombre de una canción o artista." /> : null}
            </div>
          </Card>

          <Card title="Playlists" icon={<Disc3 className="h-4 w-4" />} subtitle="Tus playlists de Spotify.">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-zinc-400">{playlists.length} playlists</p>
              <button onClick={() => void loadPlaylists()} className="inline-flex min-h-[36px] items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-medium text-zinc-300 hover:bg-zinc-800">
                <RefreshCw className="h-3.5 w-3.5" />
                Recargar
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {loadingPlaylists ? <Empty label="Cargando playlists..." /> : null}
              {playlists.map((playlist) => {
                const isOpen = openPlaylistId === playlist.id;
                const isLoadingTracks = loadingPlaylistTracks === playlist.id;
                const currentTracks = playlistTracks[playlist.id] ?? [];
                const hasMoreTracks = currentTracks.length < playlist.trackCount;
                return (
                  <article key={playlist.id} className="rounded-[22px] border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                        {playlist.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={playlist.imageUrl} alt={playlist.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-700">
                            <Disc3 className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{playlist.name}</p>
                        <p className="mt-1 text-xs text-zinc-400">{playlist.ownerName ?? "Spotify"} - {playlist.trackCount} tracks</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button onClick={() => void togglePlaylist(playlist)} disabled={isLoadingTracks} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-60">
                          {isLoadingTracks ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-180" : ""}`} />}
                          Temas
                        </button>
                        <button onClick={() => void playPlaylistAction(playlist)} disabled={busy === `playlist:${playlist.id}`} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#8cff59] px-3 text-xs font-semibold text-[#07130a] hover:bg-[#b6ff84]">
                          <Play className="h-3.5 w-3.5" />
                          Play
                        </button>
                      </div>
                    </div>
                    {isOpen ? (
                      <div className="mt-3 border-t border-zinc-800 pt-3">
                        {isLoadingTracks ? <Empty label="Cargando temas..." /> : null}
                        {!isLoadingTracks && currentTracks.length > 0 ? (
                          <div className="space-y-2">
                            {currentTracks.map((track) => (
                              <div
                                key={`${playlist.id}:${track.id}`}
                                onClick={() => void playTrackAction({ ...track, imageUrl: track.albumImageUrl ?? "" })}
                                className={`flex items-center gap-3 rounded-2xl border p-3 cursor-pointer active:scale-[0.98] transition-all ${
                                  busy === `track:${track.id}` ? "opacity-60 pointer-events-none" : ""
                                } ${
                                  nowPlaying?.item?.uri === track.uri
                                    ? "border-[#8cff59]/40 bg-[#8cff59]/10"
                                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600 hover:bg-zinc-900"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-medium text-white">{track.name}</p>
                                    {nowPlaying?.item?.uri === track.uri ? (
                                      <span className="rounded-full bg-[#8cff59] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#07130a]">
                                        Sonando
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 truncate text-xs text-zinc-400">{track.artists.join(" - ")}</p>
                                </div>
                                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#8cff59] text-[#07130a]">
                                  {busy === `track:${track.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                                </div>
                              </div>
                            ))}
                            {hasMoreTracks ? (
                              <button
                                onClick={() => void loadMorePlaylistTracks(playlist)}
                                disabled={loadingMorePlaylistId === playlist.id}
                                className="inline-flex min-h-[40px] items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
                              >
                                {loadingMorePlaylistId === playlist.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                )}
                                Ver más
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        {!isLoadingTracks && currentTracks.length === 0 ? <Empty label="Sin canciones" description="Esta playlist no tiene canciones disponibles para esta cuenta." /> : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
              {!playlists.length && !loadingPlaylists ? <Empty label="Sin playlists" description="Conectá Spotify para ver tus playlists acá." /> : null}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Card({ title, icon, subtitle, children }: { title: string; icon: ReactNode; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#8cff59]/10 text-[#8cff59]">{icon}</span>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Empty({ label, description }: { label: string; description?: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-zinc-700 bg-zinc-950/60 px-4 py-5 text-sm text-zinc-400">
      <p className="font-medium text-zinc-200">{label}</p>
      {description ? <p className="mt-1 text-zinc-500">{description}</p> : null}
    </div>
  );
}
