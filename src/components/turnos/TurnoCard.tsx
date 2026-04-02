"use client";

import { useActionState, useState } from "react";
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
  if (estado === "pendiente") return "bg-amber-500/15 text-amber-400 border-amber-500/20";
  if (estado === "confirmado") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  if (estado === "completado") return "bg-zinc-700/60 text-zinc-400 border-zinc-700";
  return "bg-red-500/15 text-red-400 border-red-500/20";
}

function buildSpotifySearchUrl(song: string) {
  return `https://open.spotify.com/search/${encodeURIComponent(song)}`;
}

function formatExpectedPrice(value: string | null) {
  if (!value) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
}

export default function TurnoCard({
  turno,
  confirmarAction,
  completarAction,
  rechazarAction,
  clienteLlegoAction,
}: TurnoCardProps) {
  const [showReject, setShowReject] = useState(false);
  const [confirmState, confirmFormAction, confirmPending] = useActionState(confirmarAction, initialState);
  const [completeState, completeFormAction, completePending] = useActionState(completarAction, initialState);
  const [rejectState, rejectFormAction, rejectPending] = useActionState(rechazarAction, initialState);
  const [llegoState, llegoFormAction, llegoPending] = useActionState(
    clienteLlegoAction ?? noopTurnoAction,
    initialState
  );
  const actionError =
    confirmState.error ?? completeState.error ?? rejectState.error ?? llegoState.error;
  const actionSuccess = llegoState.success;
  const cancionUrl = turno.sugerenciaCancion ? buildSpotifySearchUrl(turno.sugerenciaCancion) : null;
  const formattedPrecioEsperado = formatExpectedPrice(turno.precioEsperado);

  return (
    <article
      className={`rounded-[20px] border px-4 py-3 ${
        turno.prioridadAbsoluta
          ? "border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-fuchsia-500/5 to-zinc-950"
          : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{turno.clienteNombre}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(turno.estado)}`}>
              {statusLabel(turno.estado)}
            </span>
            {turno.prioridadAbsoluta ? (
              <span className="rounded-full border border-amber-300/40 bg-amber-300/15 px-2 py-0.5 text-xs font-semibold text-amber-200">
                PRIORIDAD
              </span>
            ) : null}
            {turno.esMarcianoSnapshot ? (
              <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-2 py-0.5 text-xs font-medium text-fuchsia-400">
                Marciano
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {turno.horaInicio} · {turno.duracionMinutos} min · {turno.barberoNombre}
          </p>
          {turno.servicioNombre || formattedPrecioEsperado ? (
            <p className="mt-1 text-xs text-zinc-400">
              {[turno.servicioNombre, formattedPrecioEsperado].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {turno.prioridadAbsoluta ? (
            <p className="mt-1 text-xs font-medium text-amber-200/90">
              Prioridad operativa para atender primero.
            </p>
          ) : null}
          {turno.clienteTelefonoRaw ? (
            <p className="mt-0.5 text-xs text-zinc-600">{turno.clienteTelefonoRaw}</p>
          ) : null}
        </div>
      </div>

      {turno.notaCliente ? (
        <p className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
          {turno.notaCliente}
        </p>
      ) : null}

      {turno.sugerenciaCancion ? (
        <p className="mt-2 text-xs text-zinc-500">♪ {turno.sugerenciaCancion}</p>
      ) : null}

      {turno.extras.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {turno.extras.map((extra) => (
            <span key={extra.id} className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
              {extra.nombre} ×{extra.cantidad}
            </span>
          ))}
        </div>
      ) : null}

      {turno.motivoCancelacion ? (
        <p className="mt-2 text-xs text-red-400">Motivo: {turno.motivoCancelacion}</p>
      ) : null}

      {actionError ? (
        <p className="mt-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {actionError}
        </p>
      ) : null}

      {actionSuccess ? (
        <p className="mt-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-300">
          {actionSuccess}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {turno.estado === "pendiente" ? (
          <>
            <form action={confirmFormAction}>
              <button
                type="submit"
                disabled={confirmPending}
                className="rounded-xl bg-[#8cff59] px-4 py-2 text-xs font-semibold text-[#07130a] hover:bg-[#a8ff80] disabled:opacity-50"
              >
                {confirmPending ? "Confirmando..." : "Confirmar"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setShowReject((c) => !c)}
              className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-700"
            >
              Rechazar
            </button>
          </>
        ) : null}

        {turno.estado === "confirmado" ? (
          <>
            {turno.sugerenciaCancion && clienteLlegoAction ? (
              <form action={llegoFormAction}>
                <button
                  type="submit"
                  disabled={llegoPending}
                  className="rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/25 disabled:opacity-50"
                >
                  {llegoPending ? "Enviando..." : "Llegó"}
                </button>
              </form>
            ) : null}
            {cancionUrl ? (
              <a
                href={cancionUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-2 text-xs font-medium text-fuchsia-300 hover:bg-fuchsia-500/20"
              >
                Poner canción
              </a>
            ) : null}
            <form action={completeFormAction}>
              <button
                type="submit"
                disabled={completePending}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
              >
                {completePending ? "Completando..." : "Completar"}
              </button>
            </form>
          </>
        ) : null}
      </div>

      {showReject ? (
        <form action={rejectFormAction} className="mt-3 space-y-2">
          <textarea
            name="motivoCancelacion"
            rows={2}
            placeholder="Motivo del rechazo o cancelación"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={rejectPending}
              className="rounded-xl border border-red-500/30 bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/30 disabled:opacity-50"
            >
              {rejectPending ? "Guardando..." : "Confirmar rechazo"}
            </button>
            <button
              type="button"
              onClick={() => setShowReject(false)}
              className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
