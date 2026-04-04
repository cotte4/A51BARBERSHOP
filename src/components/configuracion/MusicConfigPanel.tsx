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

export default function MusicConfigPanel({ state, callbackMessage }: MusicConfigPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [providerPlaylistRef, setProviderPlaylistRef] = useState(state.playlists[0]?.uri ?? "");
  const [dayMask, setDayMask] = useState<WeekdayKey[]>(WEEKDAY_OPTIONS.map((option) => option.key));

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

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <MusicStateBadge state={state.runtime.state} />
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">
                Spotify {state.provider.connected ? "conectado" : "desconectado"}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">Configuracion de Musica</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Acá definis el provider del local, el player esperado y las playlists que alimentan
                el modo Auto.
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
              onClick={() =>
                runMutation(
                  () => disconnectMusicProviderAction(),
                  "Spotify desconectado del negocio.",
                )
              }
              className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-50"
            >
              Desconectar
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Modo activo</p>
            <p className="mt-2 text-lg font-semibold text-white">{state.mode.activeMode}</p>
            <p className="mt-1 text-sm text-zinc-400">Auto: {state.mode.autoEnabled ? "si" : "no"}</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Player esperado</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {state.players.find((player) => player.isExpectedLocalPlayer)?.name ??
                "Sin player elegido"}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Ultimo seen: {formatDateTime(state.players.find((player) => player.isExpectedLocalPlayer)?.lastSeenAt ?? null)}
            </p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Ultimo playback</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {formatDateTime(state.runtime.lastPlaybackSuccessAt)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">Intento: {formatDateTime(state.runtime.lastPlaybackAttemptAt)}</p>
          </div>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Ultimo error</p>
            <p className="mt-2 text-sm font-medium text-white">
              {state.runtime.lastError ?? state.provider.lastError ?? "Sin errores"}
            </p>
            <p className="mt-1 text-sm text-zinc-400">{state.runtime.degradedReason ?? "Sistema estable"}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Player del local</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Elegir dispositivo esperado</h3>
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

            <div className="space-y-3">
              <p className="text-sm text-zinc-300">Dias</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((option) => {
                  const active = dayMask.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => toggleDay(option.key)}
                      className={`rounded-full border px-3 py-2 text-sm font-semibold ${
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
        <h3 className="mt-2 text-xl font-semibold text-white">Franja cargadas</h3>
        <div className="mt-5 space-y-3">
          {state.schedules.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
              Todavia no hay reglas para Auto.
            </div>
          ) : null}

          {state.schedules.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-white">{rule.label}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {rule.startTime.slice(0, 5)}-{rule.endTime.slice(0, 5)} · {rule.dayMask.join(", ")}
                </p>
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
