"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { cancelMarcianoTurnoAction, type MarcianoReservaState } from "@/app/marciano/actions";
import type { MarcianoTurnoItem } from "@/lib/marciano-turnos";

type MarcianoTurnoCardProps = {
  turno: MarcianoTurnoItem;
};

const initialState: MarcianoReservaState = {};

function formatDateTime(turno: MarcianoTurnoItem) {
  const [year, month, day] = turno.fecha.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return `${date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  })} · ${turno.horaInicio}`;
}

function formatARS(value: string | null) {
  if (!value) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
}

function statusClasses(status: MarcianoTurnoItem["estado"]) {
  if (status === "pendiente") return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  if (status === "confirmado") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (status === "completado") return "border-white/10 bg-white/5 text-zinc-300";
  return "border-rose-500/25 bg-rose-500/10 text-rose-200";
}

function statusLabel(status: MarcianoTurnoItem["estado"]) {
  if (status === "pendiente") return "Pendiente";
  if (status === "confirmado") return "Confirmado";
  if (status === "completado") return "Completado";
  return "Cancelado";
}

export default function MarcianoTurnoCard({ turno }: MarcianoTurnoCardProps) {
  const [state, cancelAction, pending] = useActionState(
    cancelMarcianoTurnoAction.bind(null, turno.id),
    initialState
  );
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const price = formatARS(turno.precioEsperado);

  return (
    <article className="rounded-[28px] border border-white/10 bg-black/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{turno.servicioNombre ?? "Turno A51"}</h3>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(turno.estado)}`}>
              {statusLabel(turno.estado)}
            </span>
            {turno.canManage ? (
              <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#d8ffc7]">
                Autogestion abierta
              </span>
            ) : null}
          </div>

          <div className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
            <TurnoMeta label="Fecha" value={formatDateTime(turno)} />
            <TurnoMeta label="Barbero" value={turno.barberoNombre} />
            <TurnoMeta label="Duracion" value={`${turno.duracionMinutos} min`} />
            <TurnoMeta label="Precio" value={price ?? "Precio a confirmar"} />
          </div>
        </div>
      </div>

      {turno.notaCliente ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
          {turno.notaCliente}
        </p>
      ) : null}

      {turno.motivoCancelacion ? (
        <p className="mt-3 text-sm text-rose-200">Motivo: {turno.motivoCancelacion}</p>
      ) : null}

      {!turno.canManage && turno.manageMessage ? (
        <p className="mt-3 text-sm text-zinc-500">{turno.manageMessage}</p>
      ) : null}

      {state.message ? (
        <p className="mt-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {state.message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {turno.canManage ? (
          <>
            <Link
              href={`/marciano/turnos/nuevo?reprogramar=${turno.id}`}
              className="ghost-button inline-flex min-h-[44px] items-center justify-center rounded-[20px] px-4 text-sm font-semibold"
            >
              Reprogramar
            </Link>

            {confirmingCancel ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmingCancel(false)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[20px] border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-300 disabled:opacity-50"
                >
                  Volver
                </button>
                <form action={cancelAction}>
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-[20px] border border-rose-500/25 bg-rose-500/10 px-4 text-sm font-semibold text-rose-200 disabled:opacity-50"
                  >
                    {pending ? "Cancelando..." : "Confirmar cancelacion"}
                  </button>
                </form>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-[20px] border border-rose-500/25 bg-rose-500/10 px-4 text-sm font-semibold text-rose-200"
              >
                Cancelar
              </button>
            )}
          </>
        ) : null}
      </div>
    </article>
  );
}

function TurnoMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
