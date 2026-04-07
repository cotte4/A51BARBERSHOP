"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { TurnoSummary } from "@/lib/types";
import type { TurnoActionState } from "@/app/(admin)/turnos/actions";

type TurnoCardProps = {
  turno: TurnoSummary;
  confirmarAction: (prevState: TurnoActionState) => Promise<TurnoActionState>;
  completarAction: (prevState: TurnoActionState) => Promise<TurnoActionState>;
  rechazarAction: (prevState: TurnoActionState, formData: FormData) => Promise<TurnoActionState>;
  clienteLlegoAction?: (prevState: TurnoActionState) => Promise<TurnoActionState>;
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

export default function TurnoCard({
  turno,
  confirmarAction,
  completarAction,
  rechazarAction,
  clienteLlegoAction,
}: TurnoCardProps) {
  const [showReject, setShowReject] = useState(false);
  const [confirmState, confirmFormAction, confirmPending] = useActionState(
    confirmarAction,
    initialState
  );
  const [completeState, completeFormAction, completePending] = useActionState(
    completarAction,
    initialState
  );
  const [rejectState, rejectFormAction, rejectPending] = useActionState(rechazarAction, initialState);
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

  return (
    <article
      aria-busy={actionPending}
      className={`rounded-[22px] border px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] transition ${
        turno.prioridadAbsoluta
          ? "border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-fuchsia-500/5 to-zinc-950"
          : "border-zinc-800 bg-zinc-950/95"
      }`}
    >
      <div className="flex flex-col gap-3">
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
              {turno.horaInicio} · {turno.duracionMinutos} min · {turno.barberoNombre}
            </p>
            {turno.servicioNombre || formattedPrecioEsperado ? (
              <p className="mt-1 text-sm text-zinc-300">
                {[turno.servicioNombre, formattedPrecioEsperado].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(turno.estado)}`}>
              {statusLabel(turno.estado)}
            </span>
            <p className="max-w-[10rem] text-right text-[11px] leading-4 text-zinc-500">
              {statusHint(turno.estado)}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {turno.clienteTelefonoRaw ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Contacto
              </p>
              <p className="mt-1 text-sm text-zinc-200">{turno.clienteTelefonoRaw}</p>
            </div>
          ) : null}
          <div className={`rounded-2xl border px-3 py-2 ${actionToneClasses(turno.estado)}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Lectura rapida
            </p>
            <p className="mt-1 text-sm text-zinc-200">
              {turno.estado === "pendiente"
                ? "Primero confirmar o rechazar."
                : turno.estado === "confirmado"
                  ? "Podemos avisar llegada o cerrar el turno."
                  : turno.estado === "completado"
                    ? "Turno cerrado y listo."
                    : "Turno ya cancelado."}
            </p>
          </div>
        </div>

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
                  <span key={extra.id} className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
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
                  onClick={() => setShowReject((c) => !c)}
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
    </article>
  );
}
