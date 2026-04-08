"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useState, useTransition } from "react";
import {
  acceptMusicProposalAction,
  activateDjModeAction,
  activateJamModeAction,
  dismissMusicProposalAction,
  joinJamSessionAction,
  pauseMusicAction,
  playPlaylistNowAction,
  previousMusicAction,
  queueTrackAction,
  resumeMusicAction,
  setAutoModeAction,
  skipMusicAction,
  syncMusicDashboardAction,
} from "@/app/(barbero)/musica/actions";
import BeatsStudio from "@/components/musica/BeatsStudio";
import {
  MusicOverviewSection,
  MusicPlaylistsSection,
  MusicProposalsSection,
  MusicQueueSection,
} from "@/components/musica/MusicOperationConsoleSections";
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
  viewerBarberoId: string | null;
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

function ActionButton({
  children,
  className,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  className: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export default function MusicOperationConsole({
  state,
  viewerBarberoId,
}: OperationConsoleProps) {
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
        throw new Error(data.error ?? "No pudimos buscar canciones.");
      }

      setSearchResults(data.tracks ?? []);
      if ((data.tracks ?? []).length === 0) {
        setSearchError("No encontramos resultados con esa busqueda.");
      }
    } catch (error) {
      setSearchResults([]);
      setSearchError(error instanceof Error ? error.message : "No pudimos buscar canciones.");
    } finally {
      setSearching(false);
    }
  }

  const queueSummary =
    state.queue.items.length === 0
      ? "Sin temas cargados todavia."
      : `${state.queue.items.length} temas en la cola activa.`;
  const autoResumeLabel = state.autoResume.resumeContextLabel ?? "la playlist automatica";
  const activePlayer =
    state.players.find((player) => player.isExpectedLocalPlayer) ??
    state.players.find((player) => player.isDefault) ??
    null;
  const nowPlayingArtist = state.nowPlaying?.artists.join(", ") ?? "Esperando ordenes";
  const jamHostName = state.jam.hostBarberoNombre ?? "otro operador";
  const viewerIsJamHost = Boolean(viewerBarberoId && viewerBarberoId === state.jam.hostBarberoId);
  const viewerJoinedJam = Boolean(
    viewerBarberoId &&
      state.jam.participants.some((participant) => participant.barberoId === viewerBarberoId),
  );
  const viewerCanJoinJam = state.jam.active && Boolean(viewerBarberoId) && !viewerJoinedJam;
  const jamNeedsJoinBeforeAdding = viewerCanJoinJam;
  const jamStatusLabel = state.jam.active
    ? `${state.jam.participants.length} ${
        state.jam.participants.length === 1 ? "barbero" : "barberos"
      } en la sesion`
    : "Sin sesion activa";
  const jamHelpText = !state.jam.active
    ? "Activa Jam para que cualquier barbero arranque la sesion compartida del local."
    : viewerIsJamHost
      ? "Estas hosteando la Jam. Los demas pueden sumarse sin sacarte el lugar."
      : viewerJoinedJam
        ? `Ya estas dentro de la Jam de ${jamHostName}. Lo que agregues queda como aporte tuyo.`
        : `Pinky u otro barbero ya iniciaron la Jam. Puedes unirte sin reemplazar al host.`;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-2">
        <button
          type="button"
          onClick={() => setActiveTab("spotify")}
          className={`flex-1 rounded-[20px] px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "spotify" ? "bg-[#8cff59] text-[#07130a]" : "text-zinc-400 hover:text-white"
          }`}
        >
          Spotify
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("beats")}
          className={`flex-1 rounded-[20px] px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "beats" ? "bg-[#8cff59] text-[#07130a]" : "text-zinc-400 hover:text-white"
          }`}
        >
          Beats
        </button>
      </div>

      {activeTab === "beats" ? <BeatsStudio /> : null}

      {activeTab === "spotify" ? (
        <div className="space-y-6">
          <MusicOverviewSection
            state={state}
            modeLabel={modeLabel(state.mode.activeMode)}
            queueSummary={queueSummary}
            autoResumeLabel={autoResumeLabel}
            activePlayerName={activePlayer?.name ?? "Sin player definido"}
            nowPlayingArtist={nowPlayingArtist}
            nowPlayingTrackName={state.nowPlaying?.trackName ?? "Nada reproduciendose"}
            lastProviderExpiryLabel={formatDateTime(state.provider.expiresAt)}
            lastPlaybackSuccessLabel={formatDateTime(state.runtime.lastPlaybackSuccessAt)}
            lastPlaybackAttemptLabel={formatDateTime(state.runtime.lastPlaybackAttemptAt)}
            resumedAtLabel={formatDateTime(state.autoResume.resumedAt)}
            feedback={feedback}
            formatDateTime={formatDateTime}
          />

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="space-y-6">
              <section className="rounded-[30px] border border-cyan-400/20 bg-cyan-500/8 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Sesion Jam</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      {state.jam.active
                        ? `Jam compartida de ${jamHostName}`
                        : "Jam compartida lista para arrancar"}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm text-cyan-50/80">{jamHelpText}</p>
                  </div>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                    {jamStatusLabel}
                  </span>
                </div>

                {state.jam.active ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {state.jam.participants.map((participant) => (
                      <span
                        key={participant.barberoId}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          participant.isHost
                            ? "border-[#8cff59]/30 bg-[#8cff59]/10 text-[#d8ffc7]"
                            : "border-white/10 bg-white/5 text-zinc-200"
                        }`}
                      >
                        {participant.nombre}
                        {participant.isHost ? " host" : ""}
                        {participant.trackCount > 0 ? ` · ${participant.trackCount} temas` : ""}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  {!state.jam.active || state.mode.activeMode !== "jam" ? (
                    <ActionButton
                      disabled={isPending}
                      onClick={() =>
                        runMutation(
                          () => activateJamModeAction(),
                          "Jam activa. Esta sesion queda lista para que otros se sumen.",
                        )
                      }
                      className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-60"
                    >
                      Iniciar Jam
                    </ActionButton>
                  ) : null}

                  {viewerCanJoinJam ? (
                    <ActionButton
                      disabled={isPending}
                      onClick={() =>
                        runMutation(
                          () => joinJamSessionAction(),
                          `Te sumaste a la Jam de ${jamHostName}.`,
                        )
                      }
                      className="rounded-2xl border border-[#8cff59]/30 bg-[#8cff59]/10 px-4 py-3 text-sm font-semibold text-[#d8ffc7] hover:bg-[#8cff59]/20 disabled:opacity-60"
                    >
                      Unirme a la Jam
                    </ActionButton>
                  ) : null}

                  {viewerIsJamHost ? (
                    <span className="rounded-2xl border border-[#8cff59]/20 bg-[#8cff59]/8 px-4 py-3 text-sm font-semibold text-[#d8ffc7]">
                      Sos el host de esta sesion
                    </span>
                  ) : null}

                  {!viewerIsJamHost && viewerJoinedJam ? (
                    <span className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100">
                      Ya estas unido a la Jam
                    </span>
                  ) : null}

                  {state.jam.active && !viewerBarberoId ? (
                    <span className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                      Esta sesion admite participantes con perfil de barbero activo.
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-sm text-cyan-50/75">
                  Para sumar temas: unite a la Jam y despues usa <span className="font-semibold text-white">Cola Jam</span> en el buscador de Spotify.
                </p>
              </section>

              <section className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Control en vivo</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Modo y playback</h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                    {state.runtime.state === "ready" ? "Acciones habilitadas" : "Esperando estado ready"}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <ActionButton
                    disabled={isPending}
                    onClick={() => runMutation(() => syncMusicDashboardAction(), "Estado actualizado.")}
                    className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
                  >
                    Refrescar
                  </ActionButton>
                  <ActionButton
                    disabled={isPending}
                    onClick={() => runMutation(() => setAutoModeAction(), "Volvimos a Auto.")}
                    className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
                  >
                    Auto
                  </ActionButton>
                  <ActionButton
                    disabled={isPending}
                    onClick={() => runMutation(() => activateDjModeAction(), "Soy DJ activo.")}
                    className="rounded-2xl bg-[#8cff59] px-4 py-3 text-sm font-semibold text-[#07130a] hover:bg-[#b6ff84] disabled:opacity-60"
                  >
                    Soy DJ
                  </ActionButton>
                  <ActionButton
                    disabled={isPending}
                    onClick={() =>
                      runMutation(
                        () => activateJamModeAction(),
                        state.jam.active
                          ? "Jam sigue activa. Puedes seguir sumando gente y temas."
                          : "Jam activa.",
                      )
                    }
                    className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-60"
                  >
                    {state.mode.activeMode === "jam" ? "Jam activa" : "Jam"}
                  </ActionButton>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <ActionButton
                    disabled={isPending || state.runtime.state !== "ready"}
                    onClick={() => runMutation(() => previousMusicAction(), "Volvimos al track anterior.")}
                    className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Anterior
                  </ActionButton>
                  <ActionButton
                    disabled={isPending || state.runtime.state !== "ready"}
                    onClick={() => runMutation(() => pauseMusicAction(), "Playback pausado.")}
                    className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Pausar
                  </ActionButton>
                  <ActionButton
                    disabled={isPending || state.runtime.state !== "ready"}
                    onClick={() => runMutation(() => resumeMusicAction(), "Playback reanudado.")}
                    className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Reanudar
                  </ActionButton>
                  <ActionButton
                    disabled={isPending || state.runtime.state !== "ready"}
                    onClick={() => runMutation(() => skipMusicAction(), "Saltamos al siguiente track.")}
                    className="rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Siguiente
                  </ActionButton>
                </div>
              </section>

              <section className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Buscar tracks</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Mandar temas al local</h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                    Spotify search
                  </span>
                </div>

                <form onSubmit={handleSearch} className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscá un tema, artista o remix"
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
                  {jamNeedsJoinBeforeAdding ? (
                    <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/8 p-4 text-sm text-cyan-50/85">
                      Primero unite a la Jam actual y despues se habilita <span className="font-semibold text-white">Cola Jam</span>.
                    </div>
                  ) : null}
                  {searchResults.length === 0 && !searchError ? (
                    <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
                      Buscá un tema para mandarlo a DJ o a Jam.
                    </div>
                  ) : null}

                  {searchResults.map((track) => (
                    <div
                      key={track.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-white">{track.name}</p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {track.artistNames.join(", ")} - {track.albumName}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
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
                        </ActionButton>
                        <ActionButton
                          disabled={isPending || jamNeedsJoinBeforeAdding}
                          onClick={() =>
                            runMutation(
                              () =>
                                queueTrackAction({
                                  mode: "jam",
                                  trackUri: track.uri,
                                  trackName: track.name,
                                  artistName: track.artistNames.join(", "),
                                }),
                              state.jam.active
                                ? `Tema ${track.name} agregado a la Jam compartida.`
                                : `Tema ${track.name} agregado a Jam.`,
                            )
                          }
                          className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-60"
                        >
                          {jamNeedsJoinBeforeAdding ? "Unite primero" : "Cola Jam"}
                        </ActionButton>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <MusicProposalsSection
                proposals={state.proposals}
                isPending={isPending}
                jamNeedsJoinBeforeAdding={jamNeedsJoinBeforeAdding}
                onAcceptProposal={(proposalId, mode, clientName) =>
                  runMutation(
                    () => acceptMusicProposalAction({ eventId: proposalId }, mode),
                    `Propuesta de ${clientName} enviada a ${mode === "dj" ? "DJ" : "Jam"}.`,
                  )
                }
                onDismissProposal={(proposalId) =>
                  runMutation(
                    () => dismissMusicProposalAction({ eventId: proposalId }),
                    "Propuesta ocultada.",
                  )
                }
                formatDateTime={formatDateTime}
              />

              <MusicPlaylistsSection
                playlists={state.playlists}
                isPending={isPending}
                onPlayPlaylist={(playlistUri, playlistName) =>
                  runMutation(
                    () =>
                      playPlaylistNowAction({
                        playlistUri,
                        playlistName,
                      }),
                    `Playlist ${playlistName} enviada al modo DJ.`,
                  )
                }
              />

              <MusicQueueSection
                queueItems={state.queue.items}
                jamActive={state.jam.active}
                jamHostName={jamHostName}
                jamHostBarberoId={state.jam.hostBarberoId}
              />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
