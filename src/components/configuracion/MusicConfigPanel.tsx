"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createScheduleRuleAction,
  deleteScheduleRuleAction,
  disconnectMusicProviderAction,
  setExpectedLocalPlayerAction,
  syncMusicDashboardAction,
} from "@/app/(barbero)/musica/actions";
import MusicStateBadge from "@/components/musica/MusicStateBadge";
import SpotifyConnectButton from "@/components/musica/SpotifyConnectButton";
import { WEEKDAY_OPTIONS, type MusicDashboardState, type WeekdayKey } from "@/lib/music-types";

type MusicConfigPanelProps = {
  state: MusicDashboardState;
  callbackMessage?: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDays(dayMask: WeekdayKey[]) {
  if (dayMask.length === WEEKDAY_OPTIONS.length) return "Todos los dias";
  if (dayMask.length === 0) return "Sin dias";
  return dayMask.join(", ");
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-zinc-400">{detail}</p>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-zinc-800 bg-zinc-950/60 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export default function MusicConfigPanel({ state, callbackMessage }: MusicConfigPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [providerPlaylistRef, setProviderPlaylistRef] = useState(state.playlists[0]?.uri ?? "");
  const [dayMask, setDayMask] = useState<WeekdayKey[]>(WEEKDAY_OPTIONS.map((option) => option.key));
  const [disconnectArmed, setDisconnectArmed] = useState(false);

  const playlistCount = state.playlists.length;
  const scheduleCount = state.schedules.length;
  const expectedPlayer = state.players.find((player) => player.isExpectedLocalPlayer) ?? null;
  const selectedPlaylist =
    state.playlists.find((playlist) => playlist.uri === providerPlaylistRef) ?? null;
  const autoResumeLabel = state.autoResume.resumeContextLabel ?? "la playlist automatica";

  function runMutation(task: () => Promise<{ error?: string }>, successMessage: string) {
    setDisconnectArmed(false);
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

  function toggleDay(day: WeekdayKey) {
    setDayMask((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
    );
  }

  function handleCreateRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    runMutation(
      () =>
        createScheduleRuleAction({
          label,
          startTime,
          endTime,
          providerPlaylistRef,
          dayMask,
        }),
      "Franja automatica guardada.",
    );
  }

  function handleDisconnect() {
    if (!disconnectArmed) {
      setFeedback("Pulsa de nuevo para desconectar Spotify.");
      setDisconnectArmed(true);
      return;
    }

    runMutation(() => disconnectMusicProviderAction(), "Spotify desconectado del negocio.");
  }

  return (
    <div className="space-y-6">
      <section className="panel-card rounded-[30px] p-6 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <MusicStateBadge state={state.runtime.state} />
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">
                Spotify {state.provider.connected ? "conectado" : "desconectado"}
              </span>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                {playlistCount} playlists
              </span>
            </div>

            <div>
              <p className="eyebrow">Configuracion / Musica</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Musica del local
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Definimos proveedor, player esperado y franjas automaticas para que la musica
                acompañe el ritmo del local sin dejar huecos raros ni estados confusos.
              </p>
            </div>

            {feedback ? (
              <p className="rounded-2xl border border-[#8cff59]/20 bg-[#8cff59]/10 px-4 py-3 text-sm text-[#d8ffc7]">
                {feedback}
              </p>
            ) : null}
            {!feedback && callbackMessage ? (
              <p className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                {callbackMessage}
              </p>
            ) : null}
            {state.autoResume.pending ? (
              <p className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                Auto esta interrumpido por una llegada y espera volver a{" "}
                <span className="font-semibold text-white">{autoResumeLabel}</span>.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <SpotifyConnectButton
              returnTo="/configuracion/musica"
              label="Conectar Spotify"
              className="rounded-2xl bg-[#8cff59] px-4 py-3 text-sm font-semibold text-[#07130a] hover:bg-[#b6ff84] disabled:opacity-60"
            />
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
              disabled={isPending || !state.provider.connected}
              onClick={handleDisconnect}
              className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-50"
            >
              {disconnectArmed ? "Confirmar desconexion" : "Desconectar"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Modo activo"
            value={state.mode.activeMode}
            detail={`Auto ${state.mode.autoEnabled ? "habilitado" : "deshabilitado"}.`}
          />
          <StatCard
            label="Player esperado"
            value={expectedPlayer?.name ?? "Sin player elegido"}
            detail={expectedPlayer ? `Visto ${formatDateTime(expectedPlayer.lastSeenAt)}` : "Elegilo para evitar desfasajes."}
          />
          <StatCard
            label="Ultimo playback"
            value={formatDateTime(state.runtime.lastPlaybackSuccessAt)}
            detail={`Intento ${formatDateTime(state.runtime.lastPlaybackAttemptAt)}`}
          />
          <StatCard
            label="Estado"
            value={state.runtime.lastError ?? state.provider.lastError ?? "Sin errores"}
            detail={
              state.autoResume.pending
                ? `Reanudacion pendiente hacia ${autoResumeLabel}.`
                : state.runtime.degradedReason ?? "Sistema estable"
            }
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Player del local</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Elegir dispositivo esperado</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Este es el device que el sistema va a considerar como player principal. Si no aparece
            ninguno, abrí Spotify en el celu o dispositivo del local y refrescá.
          </p>

          <div className="mt-5 space-y-3">
            {state.players.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
                No encontramos devices. Abrí Spotify en el celu del local y refresca.
              </div>
            ) : null}

            {state.players.map((player) => (
              <div
                key={player.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold text-white">{player.name}</p>
                    {player.isExpectedLocalPlayer ? (
                      <span className="rounded-full border border-[#8cff59]/30 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#d8ffc7]">
                        Player del local
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    {player.kind} · {player.status} · visto {formatDateTime(player.lastSeenAt)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runMutation(
                      () =>
                        setExpectedLocalPlayerAction({
                          providerPlayerId: player.providerPlayerId,
                        }),
                      `${player.name} marcado como player esperado.`,
                    )
                  }
                  className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 disabled:opacity-60"
                >
                  Usar este
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Modo Auto</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Franja automatica</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Armamos una regla por dias y horario, usando una playlist concreta para que el
            cambio de clima sea predecible.
          </p>

          <form onSubmit={handleCreateRule} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Nombre</span>
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-white outline-none focus:border-[#8cff59]"
                  placeholder="Manana tranqui"
                />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Playlist</span>
                <select
                  value={providerPlaylistRef}
                  onChange={(event) => setProviderPlaylistRef(event.target.value)}
                  className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-white outline-none focus:border-[#8cff59]"
                >
                  <option value="">Elegir playlist</option>
                  {state.playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.uri}>
                      {playlist.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Desde</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-white outline-none focus:border-[#8cff59]"
                />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Hasta</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-white outline-none focus:border-[#8cff59]"
                />
              </label>
            </div>

            <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-zinc-300">Dias</p>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  {dayMask.length} seleccionados
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((option) => {
                  const active = dayMask.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => toggleDay(option.key)}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "border-[#8cff59]/30 bg-[#8cff59]/10 text-[#d8ffc7]"
                          : "border-zinc-700 bg-zinc-950 text-zinc-400"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Preview</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <SummaryItem label="Playlist" value={selectedPlaylist?.name ?? "Elegir una playlist"} />
                <SummaryItem label="Dias" value={formatShortDays(dayMask)} />
                <SummaryItem label="Horario" value={`${startTime} a ${endTime}`} />
                <SummaryItem label="Estado" value={playlistCount > 0 ? "Listo para guardar" : "Sin playlists"} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || state.playlists.length === 0}
              className="rounded-2xl bg-[#8cff59] px-5 py-3 text-sm font-semibold text-[#07130a] hover:bg-[#b6ff84] disabled:opacity-60"
            >
              Guardar franja
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Programacion</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Franjas cargadas</h3>
        <p className="mt-2 text-sm text-zinc-400">
          {scheduleCount} reglas activas para el modo automatico del local.
        </p>

        <div className="mt-5 space-y-3">
          {state.schedules.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
              Todavia no hay reglas para Auto.
            </div>
          ) : null}

          {state.schedules.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-col gap-3 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-white">{rule.label}</p>
                  <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                    {rule.startTime.slice(0, 5)}-{rule.endTime.slice(0, 5)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">{formatShortDays(rule.dayMask)}</p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => runMutation(() => deleteScheduleRuleAction(rule.id), "Franja eliminada.")}
                className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-50"
              >
                Borrar
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
