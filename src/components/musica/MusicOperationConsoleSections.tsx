"use client";

import MusicStateBadge from "@/components/musica/MusicStateBadge";
import type { MusicDashboardState } from "@/lib/music-types";

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

type ActionButtonProps = {
  children: React.ReactNode;
  className: string;
  disabled?: boolean;
  onClick: () => void;
  actionId?: string;
  pendingAction?: string | null;
};

export function ActionButton({
  children,
  className,
  disabled,
  onClick,
  actionId,
  pendingAction,
}: ActionButtonProps) {
  const isThisPending = Boolean(actionId && pendingAction === actionId);
  return (
    <button
      type="button"
      disabled={disabled || isThisPending}
      onClick={onClick}
      className={className}
    >
      {isThisPending ? (
        <span className="flex items-center justify-center">
          <Spinner />
        </span>
      ) : children}
    </button>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-zinc-400">{detail}</p>
    </div>
  );
}

type MusicOverviewSectionProps = {
  state: MusicDashboardState;
  modeLabel: string;
  queueSummary: string;
  autoResumeLabel: string;
  activePlayerName: string;
  nowPlayingArtist: string;
  nowPlayingTrackName: string;
  lastProviderExpiryLabel: string;
  lastPlaybackSuccessLabel: string;
  lastPlaybackAttemptLabel: string;
  resumedAtLabel: string;
  formatDateTime: (value: string | null) => string;
};

export function MusicOverviewSection({
  state,
  modeLabel,
  queueSummary,
  autoResumeLabel,
  activePlayerName,
  nowPlayingArtist,
  nowPlayingTrackName,
  lastProviderExpiryLabel,
  lastPlaybackSuccessLabel,
  lastPlaybackAttemptLabel,
  resumedAtLabel,
}: MusicOverviewSectionProps) {
  return (
    <section className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <MusicStateBadge state={state.runtime.state} />
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">
              Modo {modeLabel}
            </span>
            <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#d8ffc7]">
              {state.queue.items.length} en cola
            </span>
          </div>
          <div>
            <p className="eyebrow text-zinc-500">Operacion</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
              Musica
            </h2>
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
          {state.autoResume.pending ? (
            <p className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              Auto quedo interrumpido por una llegada y esta esperando retomar{" "}
              <span className="font-semibold text-white">{autoResumeLabel}</span>.
            </p>
          ) : null}
          {!state.autoResume.pending && state.autoResume.resumedAt ? (
            <p className="rounded-2xl border border-[#8cff59]/15 bg-[#8cff59]/5 px-4 py-3 text-sm text-zinc-300">
              Auto ya recupero su contexto. Ultima reanudacion:{" "}
              <span className="font-semibold text-white">{resumedAtLabel}</span>.
            </p>
          ) : null}
        </div>

        <div className="grid min-w-[230px] gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <MetricCard
            label="Provider"
            value={state.provider.connected ? "Spotify conectado" : "Spotify desconectado"}
            detail={`Expira: ${lastProviderExpiryLabel}`}
          />
          <MetricCard
            label="Player"
            value={activePlayerName}
            detail={`Ultimo playback: ${lastPlaybackSuccessLabel}`}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Ahora suena"
          value={nowPlayingTrackName}
          detail={nowPlayingArtist}
        />
        <MetricCard
          label="Cola activa"
          value={queueSummary}
          detail={`Ultimo intento: ${lastPlaybackAttemptLabel}`}
        />
        <MetricCard
          label="Estado"
          value={state.runtime.state === "ready" ? "Listo para operar" : "Requiere atencion"}
          detail={state.runtime.lastError ?? state.provider.lastError ?? "Sistema estable"}
        />
        <MetricCard
          label="Auto resume"
          value={state.autoResume.pending ? "Esperando retomar" : "Sin espera"}
          detail={state.autoResume.pending ? autoResumeLabel : "Listo para seguir"}
        />
      </div>
    </section>
  );
}

type MusicProposalsSectionProps = {
  proposals: MusicDashboardState["proposals"];
  pendingAction: string | null;
  jamNeedsJoinBeforeAdding: boolean;
  formatDateTime: (value: string | null) => string;
  onAcceptProposal: (proposalId: string, mode: "dj" | "jam", clientName: string) => void;
  onDismissProposal: (proposalId: string) => void;
};

export function MusicProposalsSection({
  proposals,
  pendingAction,
  jamNeedsJoinBeforeAdding,
  formatDateTime,
  onAcceptProposal,
  onDismissProposal,
}: MusicProposalsSectionProps) {
  return (
    <section className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Propuestas</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Cliente llego</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          {proposals.length} pendientes
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {proposals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
            No hay propuestas nuevas desde Turnos.
          </div>
        ) : null}

        {proposals.map((proposal) => (
          <div
            key={proposal.id}
            className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-white">{proposal.cancion}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {proposal.clienteNombre} - {formatDateTime(proposal.createdAt)}
                </p>
                {!proposal.spotifyTrackUri ? (
                  <p className="mt-2 text-xs text-amber-300">
                    Falta track vinculada en Spotify. Si queres usarla, buscalo manualmente abajo.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  disabled={!proposal.spotifyTrackUri}
                  actionId={`accept-dj-${proposal.id}`}
                  pendingAction={pendingAction}
                  onClick={() => onAcceptProposal(proposal.id, "dj", proposal.clienteNombre)}
                  className="rounded-2xl border border-[#8cff59]/30 bg-[#8cff59]/10 px-4 py-3 text-sm font-semibold text-[#d8ffc7] hover:bg-[#8cff59]/20 disabled:opacity-50"
                >
                  A DJ
                </ActionButton>
                <ActionButton
                  disabled={!proposal.spotifyTrackUri || jamNeedsJoinBeforeAdding}
                  actionId={`accept-jam-${proposal.id}`}
                  pendingAction={pendingAction}
                  onClick={() => onAcceptProposal(proposal.id, "jam", proposal.clienteNombre)}
                  className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {jamNeedsJoinBeforeAdding ? "Unite primero" : "A Jam"}
                </ActionButton>
                <ActionButton
                  actionId={`dismiss-${proposal.id}`}
                  pendingAction={pendingAction}
                  onClick={() => onDismissProposal(proposal.id)}
                  className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Ocultar
                </ActionButton>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

type MusicPlaylistsSectionProps = {
  playlists: MusicDashboardState["playlists"];
  pendingAction: string | null;
  onPlayPlaylist: (playlistUri: string, playlistName: string) => void;
};

export function MusicPlaylistsSection({
  playlists,
  pendingAction,
  onPlayPlaylist,
}: MusicPlaylistsSectionProps) {
  return (
    <section className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Playlists</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Modo Auto y Soy DJ</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          {playlists.length} playlists
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        {playlists.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
            Conecta Spotify y refresca para traer playlists del negocio.
          </div>
        ) : null}

        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-white">{playlist.name}</p>
              <p className="mt-1 text-sm text-zinc-400">
                {playlist.ownerName ?? "Spotify"} - {playlist.trackCount} tracks
              </p>
            </div>
            <ActionButton
              actionId={`playlist-${playlist.id}`}
              pendingAction={pendingAction}
              onClick={() => onPlayPlaylist(playlist.uri, playlist.name)}
              className="rounded-2xl bg-[#8cff59] px-4 py-3 text-sm font-semibold text-[#07130a] hover:bg-[#b6ff84] disabled:opacity-60"
            >
              Poner ahora
            </ActionButton>
          </div>
        ))}
      </div>
    </section>
  );
}

type MusicQueueSectionProps = {
  queueItems: MusicDashboardState["queue"]["items"];
  jamActive: boolean;
  jamHostName: string;
  jamHostBarberoId: string | null;
};

export function MusicQueueSection({
  queueItems,
  jamActive,
  jamHostName,
  jamHostBarberoId,
}: MusicQueueSectionProps) {
  return (
    <section className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Cola</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Jam y cola manual</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          {queueItems.length} items
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {jamActive ? (
          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/8 p-4 text-sm text-cyan-50/85">
            Host: <span className="font-semibold text-white">{jamHostName}</span>. La cola reparte
            turnos entre los barberos que aportan temas.
          </div>
        ) : null}

        {queueItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
            Todavia no hay temas en la cola activa.
          </div>
        ) : null}

        {queueItems.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{item.displayTitle}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {item.displayArtist ?? "Artista desconocido"} - {item.ownerBarberoNombre ?? "Sistema"}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {jamActive && item.ownerBarberoId === jamHostBarberoId ? (
                  <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/8 px-3 py-1 text-xs font-semibold text-[#d8ffc7]">
                    Host
                  </span>
                ) : null}
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  {item.state}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
