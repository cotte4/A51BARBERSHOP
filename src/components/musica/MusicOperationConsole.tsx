"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useState, useTransition } from "react";
import {
  acceptMusicProposalAction,
  activateDjModeAction,
  activateJamModeAction,
  dismissMusicProposalAction,
  pauseMusicAction,
  playPlaylistNowAction,
  queueTrackAction,
  resumeMusicAction,
  setAutoModeAction,
  skipMusicAction,
  syncMusicDashboardAction,
} from "@/app/(barbero)/musica/actions";
import BeatsStudio from "@/components/musica/BeatsStudio";
import MusicStateBadge from "@/components/musica/MusicStateBadge";
import type { MusicDashboardState } from "@/lib/music-types";

type MusicTab = "spotify" | "beats";

type SearchTrackResult = {
  id: string;
  uri: string;
  name: string;
  artistNames: string[];
  albumName: string;
  imageUrl: string;
};

type OperationConsoleProps = {
  state: MusicDashboardState;
};

function modeLabel(mode: MusicDashboardState["mode"]["activeMode"]) {
  if (mode === "dj") return "Soy DJ";
  if (mode === "jam") return "Jam";
  return "Auto";
}

function formatDateTime(value: string | null) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MusicOperationConsole({ state }: OperationConsoleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MusicTab>("spotify");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [searchResults, setSearchResults] = useState<SearchTrackResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  function runMutation(task: () => Promise<{ error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await task();
      if (result.error) {
        setFeedback(result.error);
        return;
      }

      setFeedback(successMessage);
      router.refresh();
    });
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = deferredQuery.trim();
    if (!nextQuery) {
      setSearchError("Escribi una busqueda primero.");
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(`/api/spotify/search-track?q=${encodeURIComponent(nextQuery)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        error?: string;
        tracks?: SearchTrackResult[];
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No pude buscar canciones.");
      }

      setSearchResults(data.tracks ?? []);
      if ((data.tracks ?? []).length === 0) {
        setSearchError("No encontramos resultados con esa busqueda.");
      }
    } catch (error) {
      setSearchResults([]);
      setSearchError(error instanceof Error ? error.message : "No pude buscar canciones.");
    } finally {
      setSearching(false);
    }
  }

  const queueSummary =
    state.queue.items.length === 0
      ? "Sin temas cargados todavia."
      : `${state.queue.items.length} temas en la cola activa.`;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-2">
        <button
          type="button"
          onClick={() => setActiveTab("spotify")}
          className={`flex-1 rounded-[20px] px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "spotify"
              ? "bg-[#8cff59] text-[#07130a]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Spotify
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("beats")}
          className={`flex-1 rounded-[20px] px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "beats"
              ? "bg-[#8cff59] text-[#07130a]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Beats
        </button>
      </div>

      {activeTab === "beats" ? <BeatsStudio /> : null}

      {activeTab === "spotify" ? (
      <>
      <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <MusicStateBadge state={state.runtime.state} />
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">
                Modo {modeLabel(state.mode.activeMode)}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">Cabina del local</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Auto resuelve playlists por horario, Soy DJ pisa el automatico y Jam alterna la
                cola entre barberos.
              </p>
            </div>
            {state.runtime.degradedReason ? (
              <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {state.runtime.degradedReason}
              </p>
            ) : null}
            {feedback ? (
              <p className="rounded-2xl border border-[#8cff59]/20 bg-[#8cff59]/10 px-4 py-3 text-sm text-[#d8ffc7]">
                {feedback}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => runMutation(() => syncMusicDashboardAction(), "Estado actualizado.")}
              className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
            >
              Refrescar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => runMutation(() => setAutoModeAction(), "Volvimos a Auto.")}
              className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
            >
              Auto
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => runMutation(() => activateDjModeAction(), "Soy DJ activo.")}
              className="rounded-2xl bg-[#8cff59] px-4 py-3 text-sm font-semibold text-[#07130a] hover:bg-[#b6ff84] disabled:opacity-60"
            >
              Soy DJ
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => runMutation(() => activateJamModeAction(), "Jam activo.")}
              className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-60"
            >
              Jam
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Provider</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {state.provider.connected ? "Spotify conectado" : "Spotify desconectado"}
            </p>
            <p className="mt-1 text-sm text-zinc-400">Expira: {formatDateTime(state.provider.expiresAt)}</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Player del local</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {state.players.find((player) => player.isExpectedLocalPlayer)?.name ??
                state.players.find((player) => player.isDefault)?.name ??
                "Sin player definido"}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Ultimo playback: {formatDateTime(state.runtime.lastPlaybackSuccessAt)}
            </p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Ahora suena</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {state.nowPlaying?.trackName ?? "Nada reproduciendose"}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {state.nowPlaying?.artists.join(", ") ?? "Esperando ordenes"}
            </p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Cola activa</p>
            <p className="mt-2 text-lg font-semibold text-white">{queueSummary}</p>
            <p className="mt-1 text-sm text-zinc-400">
              Ultimo intento: {formatDateTime(state.runtime.lastPlaybackAttemptAt)}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending || state.runtime.state !== "ready"}
            onClick={() => runMutation(() => pauseMusicAction(), "Playback pausado.")}
            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            Pausar
          </button>
          <button
            type="button"
            disabled={isPending || state.runtime.state !== "ready"}
            onClick={() => runMutation(() => resumeMusicAction(), "Playback reanudado.")}
            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            Reanudar
          </button>
          <button
            type="button"
            disabled={isPending || state.runtime.state !== "ready"}
            onClick={() => runMutation(() => skipMusicAction(), "Saltamos al siguiente track.")}
            className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Propuestas</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Cliente llego</h3>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
            {state.proposals.length} pendientes
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {state.proposals.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
              No hay propuestas nuevas desde Turnos.
            </div>
          ) : null}

          {state.proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-white">{proposal.cancion}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {proposal.clienteNombre} · {formatDateTime(proposal.createdAt)}
                  </p>
                  {!proposal.spotifyTrackUri ? (
                    <p className="mt-2 text-xs text-amber-300">
                      Falta track vinculada en Spotify. Si queres usarla, buscalo manualmente abajo.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending || !proposal.spotifyTrackUri}
                    onClick={() =>
                      runMutation(
                        () => acceptMusicProposalAction({ eventId: proposal.id }, "dj"),
                        `Propuesta de ${proposal.clienteNombre} enviada a DJ.`,
                      )
                    }
                    className="rounded-2xl border border-[#8cff59]/30 bg-[#8cff59]/10 px-4 py-3 text-sm font-semibold text-[#d8ffc7] hover:bg-[#8cff59]/20 disabled:opacity-50"
                  >
                    A DJ
                  </button>
                  <button
                    type="button"
                    disabled={isPending || !proposal.spotifyTrackUri}
                    onClick={() =>
                      runMutation(
                        () => acceptMusicProposalAction({ eventId: proposal.id }, "jam"),
                        `Propuesta de ${proposal.clienteNombre} enviada a Jam.`,
                      )
                    }
                    className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
                  >
                    A Jam
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runMutation(
                        () => dismissMusicProposalAction({ eventId: proposal.id }),
                        "Propuesta ocultada.",
                      )
                    }
                    className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Ocultar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Playlists</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Modo Auto y Soy DJ</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
              {state.playlists.length} playlists
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {state.playlists.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
                Conecta Spotify y refresca para traer playlists del negocio.
              </div>
            ) : null}

            {state.playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-white">{playlist.name}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {playlist.ownerName ?? "Spotify"} · {playlist.trackCount} tracks
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runMutation(
                      () =>
                        playPlaylistNowAction({
                          playlistUri: playlist.uri,
                          playlistName: playlist.name,
                        }),
                      `Playlist ${playlist.name} enviada al modo DJ.`,
                    )
                  }
                  className="rounded-2xl bg-[#8cff59] px-4 py-3 text-sm font-semibold text-[#07130a] hover:bg-[#b6ff84] disabled:opacity-60"
                >
                  Poner ahora
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Cola</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Jam y cola manual</h3>
          <div className="mt-5 space-y-3">
            {state.queue.items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
                Todavia no hay temas en la cola activa.
              </div>
            ) : null}

            {state.queue.items.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-white">{item.displayTitle}</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {item.displayArtist ?? "Artista desconocido"} · {item.ownerBarberoNombre ?? "Sistema"}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                    {item.state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Buscar tracks</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Mandar temas al local</h3>

        <form onSubmit={handleSearch} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca un tema, artista o remix"
            className="min-h-[52px] flex-1 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#8cff59]"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-2xl bg-[#8cff59] px-5 py-3 text-sm font-semibold text-[#07130a] hover:bg-[#b6ff84] disabled:opacity-60"
          >
            {searching ? "Buscando..." : "Buscar"}
          </button>
        </form>

        {searchError ? (
          <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {searchError}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3">
          {searchResults.map((track) => (
            <div
              key={track.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">{track.name}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {track.artistNames.join(", ")} · {track.albumName}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runMutation(
                      () =>
                        queueTrackAction({
                          mode: "dj",
                          trackUri: track.uri,
                          trackName: track.name,
                          artistName: track.artistNames.join(", "),
                        }),
                      `Tema ${track.name} agregado a tu cola DJ.`,
                    )
                  }
                  className="rounded-2xl border border-[#8cff59]/30 bg-[#8cff59]/10 px-4 py-3 text-sm font-semibold text-[#d8ffc7] hover:bg-[#8cff59]/20 disabled:opacity-60"
                >
                  Cola DJ
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runMutation(
                      () =>
                        queueTrackAction({
                          mode: "jam",
                          trackUri: track.uri,
                          trackName: track.name,
                          artistName: track.artistNames.join(", "),
                        }),
                      `Tema ${track.name} agregado a Jam.`,
                    )
                  }
                  className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-60"
                >
                  Cola Jam
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      </>
      ) : null}
    </div>
  );
}
