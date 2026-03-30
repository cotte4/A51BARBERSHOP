"use client";

import { useActionState, useState } from "react";
import type { TurnoSummary } from "@/lib/types";
import type { TurnoActionState } from "@/app/(admin)/turnos/actions";

type TurnoCardProps = {
  turno: TurnoSummary;
  confirmarAction: (prevState: TurnoActionState) => Promise<TurnoActionState>;
  completarAction: (prevState: TurnoActionState) => Promise<TurnoActionState>;
  rechazarAction: (prevState: TurnoActionState, formData: FormData) => Promise<TurnoActionState>;
};

const initialState: TurnoActionState = {};

function statusLabel(estado: TurnoSummary["estado"]) {
  if (estado === "pendiente") return "Pendiente";
  if (estado === "confirmado") return "Confirmado";
  if (estado === "completado") return "Completado";
  return "Cancelado";
}

function statusClasses(estado: TurnoSummary["estado"]) {
  if (estado === "pendiente") return "bg-amber-50 text-amber-700";
  if (estado === "confirmado") return "bg-emerald-50 text-emerald-700";
  if (estado === "completado") return "bg-sky-50 text-sky-700";
  return "bg-red-50 text-red-700";
}

export default function TurnoCard({
  turno,
  confirmarAction,
  completarAction,
  rechazarAction,
}: TurnoCardProps) {
  const [showReject, setShowReject] = useState(false);
  const [confirmState, confirmFormAction, confirmPending] = useActionState(confirmarAction, initialState);
  const [completeState, completeFormAction, completePending] = useActionState(completarAction, initialState);
  const [rejectState, rejectFormAction, rejectPending] = useActionState(rechazarAction, initialState);
  const actionError = confirmState.error ?? completeState.error ?? rejectState.error;

  return (
    <article className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-stone-900">{turno.clienteNombre}</h3>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClasses(turno.estado)}`}>
              {statusLabel(turno.estado)}
            </span>
            {turno.esMarcianoSnapshot ? (
              <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-xs font-medium text-fuchsia-700">
                Marciano
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-stone-600">
            {turno.horaInicio} · {turno.duracionMinutos} min · {turno.barberoNombre}
          </p>
          {turno.clienteTelefonoRaw ? (
            <p className="mt-1 text-sm text-stone-500">{turno.clienteTelefonoRaw}</p>
          ) : null}
        </div>
      </div>

      {turno.notaCliente ? (
        <p className="mt-4 rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-700">{turno.notaCliente}</p>
      ) : null}

      {turno.sugerenciaCancion ? (
        <p className="mt-3 text-sm text-stone-600">Canción sugerida: {turno.sugerenciaCancion}</p>
      ) : null}

      {turno.extras.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {turno.extras.map((extra) => (
            <span key={extra.id} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">
              {extra.nombre} x{extra.cantidad}
            </span>
          ))}
        </div>
      ) : null}

      {turno.motivoCancelacion ? (
        <p className="mt-3 text-sm text-red-600">Motivo: {turno.motivoCancelacion}</p>
      ) : null}

      {actionError ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {turno.estado === "pendiente" ? (
          <>
            <form action={confirmFormAction}>
              <button
                type="submit"
                disabled={confirmPending}
                className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
              >
                {confirmPending ? "Confirmando..." : "Confirmar"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setShowReject((current) => !current)}
              className="rounded-xl bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200"
            >
              Rechazar
            </button>
          </>
        ) : null}

        {turno.estado === "confirmado" ? (
          <form action={completeFormAction}>
            <button
              type="submit"
              disabled={completePending}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {completePending ? "Completando..." : "Completar"}
            </button>
          </form>
        ) : null}
      </div>

      {showReject ? (
        <form action={rejectFormAction} className="mt-4 space-y-3">
          <textarea
            name="motivoCancelacion"
            rows={2}
            placeholder="Motivo del rechazo o cancelación"
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-900"
          />
          <button
            type="submit"
            disabled={rejectPending}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            {rejectPending ? "Guardando..." : "Confirmar rechazo"}
          </button>
        </form>
      ) : null}
    </article>
  );
}
