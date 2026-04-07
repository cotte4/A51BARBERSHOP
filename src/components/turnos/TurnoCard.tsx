"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { TurnoActionState } from "@/app/(admin)/turnos/actions";
import type { TurnoSummary } from "@/lib/types";

type TurnoCardProps = {
  turno: TurnoSummary;
  confirmarAction: (prevState: TurnoActionState) => Promise<TurnoActionState>;
  completarAction: (prevState: TurnoActionState) => Promise<TurnoActionState>;
  rechazarAction: (prevState: TurnoActionState, formData: FormData) => Promise<TurnoActionState>;
  clienteLlegoAction?: (prevState: TurnoActionState) => Promise<TurnoActionState>;
  compact?: boolean;
};

const initialState: TurnoActionState = {};

async function noopTurnoAction(_prevState: TurnoActionState): Promise<TurnoActionState> {
  return {};
}

function statusLabel(estado: TurnoSummary["estado"]) {
  if (estado === "pendiente") return "Pendiente";
  if (estado === "confirmado") return "Confirmado";
  if (estado === "completado") return "Completado";
  return "Cancelado";
}

function statusClasses(estado: TurnoSummary["estado"]) {
  if (estado === "pendiente") return "bg-amber-500/15 text-amber-300 border-amber-500/20";
  if (estado === "confirmado") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
  if (estado === "completado") return "bg-zinc-700/60 text-zinc-300 border-zinc-700";
  return "bg-red-500/15 text-red-300 border-red-500/20";
}

function statusHint(estado: TurnoSummary["estado"]) {
  if (estado === "pendiente") return "Todavia no fue confirmado";
  if (estado === "confirmado") return "Listo para atender o cerrar";
  if (estado === "completado") return "Ya quedo cerrado";
  return "Turno cancelado";
}

function actionToneClasses(estado: TurnoSummary["estado"]) {
  if (estado === "pendiente") return "border-amber-400/20 bg-amber-400/8";
  if (estado === "confirmado") return "border-emerald-400/20 bg-emerald-400/8";
  if (estado === "completado") return "border-zinc-700/80 bg-zinc-900/80";
  return "border-red-500/20 bg-red-500/8";
}

function statusBorderL(estado: TurnoSummary["estado"]) {
  if (estado === "pendiente") return "border-l-amber-400";
  if (estado === "confirmado") return "border-l-[#8cff59]";
  if (estado === "completado") return "border-l-zinc-600";
  return "border-l-red-500";
}

function compactActionSummary(estado: TurnoSummary["estado"]) {
  if (estado === "pendiente") return "Primero confirmar o rechazar.";
  if (estado === "confirmado") return "Listo para atender o marcar llegada.";
  if (estado === "completado") return "Turno ya cerrado.";
  return "Turno cancelado.";
}

function buildSpotifySearchUrl(song: string) {
  return `https://open.spotify.com/search/${encodeURIComponent(song)}`;
}

function buildSpotifyTrackUrl(uri: string | null) {
  if (!uri?.startsWith("spotify:track:")) return null;
  const [, , trackId] = uri.split(":");
  return trackId ? `https://open.spotify.com/track/${trackId}` : null;
}

function formatExpectedPrice(value: string | null) {
  if (!value) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
}

function buildTurnoLlegoPayload(turno: TurnoSummary, successMessage: string) {
  return {
    turnoId: turno.id,
    clienteNombre: turno.clienteNombre,
    cancion: turno.sugerenciaCancion ?? null,
    spotifyTrackUri: turno.spotifyTrackUri ?? null,
    barberoNombre: turno.barberoNombre,
    estado: turno.estado,
    successMessage,
  };
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TurnoCard({
  turno,
  confirmarAction,
  completarAction,
  rechazarAction,
  clienteLlegoAction,
  compact = false,
}: TurnoCardProps) {
  const detailId = `turno-card-detail-${turno.id}`;
  const [showReject, setShowReject] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldRenderDetails, setShouldRenderDetails] = useState(false);
  const [confirmState, confirmFormAction, confirmPending] = useActionState(
    confirmarAction,
    initialState
  );
  const [completeState, completeFormAction, completePending] = useActionState(
    completarAction,
    initialState
  );
  const [rejectState, rejectFormAction, rejectPending] = useActionState(
    rechazarAction,
    initialState
  );
  const [llegoState, llegoFormAction, llegoPending] = useActionState(
    clienteLlegoAction ?? noopTurnoAction,
    initialState
  );
  const dispatchedSuccessRef = useRef<string | null>(null);

  const actionError =
    confirmState.error ?? completeState.error ?? rejectState.error ?? llegoState.error;
  const actionSuccess = llegoState.success;
  const actionPending = confirmPending || completePending || rejectPending || llegoPending;
  const cancionUrl =
    buildSpotifyTrackUrl(turno.spotifyTrackUri) ??
    (turno.sugerenciaCancion ? buildSpotifySearchUrl(turno.sugerenciaCancion) : null);
  const formattedPrecioEsperado = formatExpectedPrice(turno.precioEsperado);

  useEffect(() => {
    if (!actionSuccess) {
      dispatchedSuccessRef.current = null;
      return;
    }

    const eventKey = `${turno.id}:${actionSuccess}`;
    if (dispatchedSuccessRef.current === eventKey) {
      return;
    }

    dispatchedSuccessRef.current = eventKey;
    window.dispatchEvent(
      new CustomEvent("a51:turno-llego", {
        detail: buildTurnoLlegoPayload(turno, actionSuccess),
      })
    );
  }, [
    actionSuccess,
    turno.barberoNombre,
    turno.clienteNombre,
    turno.estado,
    turno.id,
    turno.spotifyTrackUri,
    turno.sugerenciaCancion,
  ]);

  useEffect(() => {
    if (turno.estado !== "pendiente") {
      setShowReject(false);
    }
  }, [turno.estado]);

  useEffect(() => {
    if (isExpanded) {
      setShouldRenderDetails(true);
      return;
    }

    if (!shouldRenderDetails) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRenderDetails(false);
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isExpanded, shouldRenderDetails]);

  useEffect(() => {
    if (showReject || actionError || actionSuccess) {
      setIsExpanded(true);
    }
  }, [actionError, actionSuccess, showReject]);

  return (
    <article
      aria-busy={actionPending}
      className={`transition ${
        compact
          ? `overflow-hidden rounded-xl border border-zinc-800/60 border-l-4 ${statusBorderL(turno.estado)} ${isExpanded ? "ring-1 ring-[#8cff59]/12" : ""}`
          : `rounded-[22px] border px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] ${
              turno.prioridadAbsoluta
                ? "border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-fuchsia-500/5 to-zinc-950"
                : "border-zinc-800 bg-zinc-950/95"
            } ${isExpanded ? "ring-1 ring-[#8cff59]/12" : ""}`
      }`}
    >
      <div className="flex flex-col gap-3">
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={detailId}
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`group text-left outline-none ${compact ? "w-full px-3 py-2.5" : "-m-1 rounded-[20px] p-1"}`}
        >
          {compact ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h3 className="truncate text-sm font-semibold text-white">
                    {turno.clienteNombre}
                  </h3>
                  {turno.prioridadAbsoluta ? (
                    <span className="shrink-0 rounded-full border border-amber-300/40 bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">!</span>
                  ) : null}
                  {turno.esMarcianoSnapshot ? (
                    <span className="shrink-0 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-400">M</span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                  {[turno.duracionMinutos + " min", turno.servicioNombre, turno.barberoNombre].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClasses(turno.estado)}`}>
                  {statusLabel(turno.estado)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 p-1 text-zinc-400">
                  <ChevronIcon expanded={isExpanded} />
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-semibold tracking-wide text-white sm:text-lg">
                      {turno.clienteNombre}
                    </h3>
                    {turno.prioridadAbsoluta ? (
                      <span className="rounded-full border border-amber-300/40 bg-amber-300/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                        Prioridad
                      </span>
                    ) : null}
                    {turno.esMarcianoSnapshot ? (
                      <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-fuchsia-400">
                        Marciano
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    {turno.horaInicio} - {turno.duracionMinutos} min - {turno.barberoNombre}
                  </p>
                  {turno.servicioNombre || formattedPrecioEsperado ? (
                    <p className="mt-1 text-sm text-zinc-300">
                      {[turno.servicioNombre, formattedPrecioEsperado].filter(Boolean).join(" - ")}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-start gap-2">
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(turno.estado)}`}>
                      {statusLabel(turno.estado)}
                    </span>
                    <p className="max-w-[10rem] text-right text-[11px] leading-4 text-zinc-500">
                      {statusHint(turno.estado)}
                    </p>
                  </div>
                  <span className="mt-0.5 rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 transition group-hover:border-[#8cff59]/25 group-hover:text-[#8cff59]">
                    <ChevronIcon expanded={isExpanded} />
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {turno.clienteTelefonoRaw ? (
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-medium text-zinc-300">
                    {turno.clienteTelefonoRaw}
                  </span>
                ) : null}
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${actionToneClasses(turno.estado)}`}>
                  {compactActionSummary(turno.estado)}
                </span>
                {turno.sugerenciaCancion ? (
                  <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
                    Musica cargada
                  </span>
                ) : null}
                {turno.extras.length > 0 ? (
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-medium text-zinc-300">
                    {turno.extras.length} extra{turno.extras.length === 1 ? "" : "s"}
                  </span>
                ) : null}
                {turno.notaCliente ? (
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-medium text-zinc-300">
                    Con nota
                  </span>
                ) : null}
              </div>
            </>
          )}
        </button>

        {shouldRenderDetails ? (
          <div
            id={detailId}
            className={`grid overflow-hidden transition-all duration-300 ease-out ${
              isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0">
              <div className={`space-y-3 ${compact ? "border-t border-zinc-800/60 px-3 pb-3 pt-2" : "pt-1"}`}>
                {(turno.esMarcianoSnapshot || turno.sugerenciaCancion) ? (
                  <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(140,255,89,0.08),rgba(217,70,239,0.08))] px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                        Info del turno
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {turno.esMarcianoSnapshot ? (
                          <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-fuchsia-200">
                            cliente marciano
                          </span>
                        ) : null}
                        {turno.sugerenciaCancion ? (
                          <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">
                            pista recibida
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">
                      {turno.esMarcianoSnapshot
                        ? "Entro por la nave cliente y merece lectura rapida del flujo."
                        : "Este turno ya dejo una senal para musicalizar la llegada."}
                    </p>
                  </div>
                ) : null}

                {turno.notaCliente ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Nota del cliente
                    </p>
                    <p className="mt-1 text-sm leading-5 text-zinc-300">{turno.notaCliente}</p>
                  </div>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2">
                  {turno.sugerenciaCancion ? (
                    <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-300">
                        Musica sugerida
                      </p>
                      <p className="mt-1 text-sm text-fuchsia-100/90">{turno.sugerenciaCancion}</p>
                    </div>
                  ) : null}

                  {turno.extras.length > 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        Extras
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {turno.extras.map((extra) => (
                          <span
                            key={extra.id}
                            className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
                          >
                            {extra.nombre} x{extra.cantidad}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {turno.motivoCancelacion ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-300">
                      Motivo de cancelacion
                    </p>
                    <p className="mt-1 text-sm text-red-200">{turno.motivoCancelacion}</p>
                  </div>
                ) : null}

                {actionError ? (
                  <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-300">
                      No se pudo aplicar
                    </p>
                    <p className="mt-1 text-sm text-red-200">{actionError}</p>
                  </div>
                ) : null}

                {actionSuccess ? (
                  <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                      Movimiento registrado
                    </p>
                    <p className="mt-1 text-sm font-medium text-sky-100">{actionSuccess}</p>
                    <p className="mt-1 text-sm text-sky-100/75">
                      La pantalla ya puede reaccionar y Musica recibio el resultado real de la llegada.
                    </p>
                  </div>
                ) : null}

                <div className="rounded-[20px] border border-zinc-800 bg-zinc-900/80 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        Acciones
                      </p>
                      <p className="mt-1 text-sm text-zinc-300">
                        {turno.estado === "pendiente"
                          ? "Elegi una decision."
                          : turno.estado === "confirmado"
                            ? "Cierra el flujo o avisale a pantalla."
                            : "Sin acciones disponibles."}
                      </p>
                    </div>
                    {actionPending ? (
                      <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                        Procesando
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {turno.estado === "pendiente" ? (
                      <>
                        <form action={confirmFormAction}>
                          <button
                            type="submit"
                            disabled={confirmPending || actionPending}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] hover:bg-[#a8ff80] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {confirmPending ? "Confirmando..." : "Confirmar turno"}
                          </button>
                        </form>
                        <button
                          type="button"
                          onClick={() => setShowReject((current) => !current)}
                          disabled={actionPending}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 px-4 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {showReject ? "Ocultar rechazo" : "Rechazar / cancelar"}
                        </button>
                      </>
                    ) : null}

                    {turno.estado === "confirmado" ? (
                      <>
                        {turno.sugerenciaCancion && clienteLlegoAction ? (
                          <form action={llegoFormAction}>
                            <button
                              type="submit"
                              disabled={llegoPending || actionPending}
                              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/15 px-4 text-sm font-semibold text-sky-200 hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {llegoPending ? "Enviando..." : "Avisar llegada"}
                            </button>
                          </form>
                        ) : null}
                        {cancionUrl ? (
                          <a
                            href={cancionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 text-sm font-medium text-fuchsia-200 hover:bg-fuchsia-500/20"
                          >
                            Abrir cancion
                          </a>
                        ) : null}
                        <form action={completeFormAction}>
                          <button
                            type="submit"
                            disabled={completePending || actionPending}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/20 px-4 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {completePending ? "Completando..." : "Marcar completado"}
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>

                {showReject ? (
                  <form
                    action={rejectFormAction}
                    className="space-y-3 rounded-[20px] border border-red-500/20 bg-red-500/8 p-3"
                  >
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-300">
                        Confirmar cancelacion
                      </p>
                      <p className="mt-1 text-sm text-red-100/80">
                        Deja un motivo claro. Esto cancela el turno y ayuda a mantener trazabilidad.
                      </p>
                    </div>
                    <textarea
                      name="motivoCancelacion"
                      rows={3}
                      required
                      minLength={3}
                      placeholder="Motivo del rechazo o cancelacion"
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-red-400"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={rejectPending || actionPending}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/20 px-4 text-sm font-semibold text-red-200 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {rejectPending ? "Guardando..." : "Cancelar turno"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReject(false)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
                      >
                        Volver
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
