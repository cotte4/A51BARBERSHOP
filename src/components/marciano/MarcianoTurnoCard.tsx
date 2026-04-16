"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { cancelMarcianoTurnoAction, type MarcianoReservaState } from "@/app/marciano/actions";
import type { MarcianoTurnoItem } from "@/lib/marciano-turnos";
import { formatARS } from "@/lib/format";

type MarcianoTurnoCardProps = {
  turno: MarcianoTurnoItem;
};

const initialState: MarcianoReservaState = {};

function formatDateTime(turno: MarcianoTurnoItem) {
  const date = new Date(`${turno.fecha}T12:00:00Z`);
  return `${date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  })} · ${turno.horaInicio}`;
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

function compactSummary(turno: MarcianoTurnoItem) {
  if (turno.estado === "pendiente") return "Todavia requiere decision.";
  if (turno.estado === "confirmado") return "Listo para seguir el flujo.";
  if (turno.estado === "completado") return "Turno ya cerrado.";
  return "Turno cancelado.";
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

export default function MarcianoTurnoCard({ turno }: MarcianoTurnoCardProps) {
  const detailId = `marciano-turno-${turno.id}`;
  const [state, cancelAction, pending] = useActionState(
    cancelMarcianoTurnoAction.bind(null, turno.id),
    initialState
  );
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldRenderDetails, setShouldRenderDetails] = useState(false);
  const price = formatARS(turno.precioEsperado);
  const canExpand = Boolean(
    turno.notaCliente || turno.motivoCancelacion || state.message || turno.manageMessage || turno.canManage
  );

  useEffect(() => {
    if (!turno.canManage) {
      setConfirmingCancel(false);
    }
  }, [turno.canManage]);

  useEffect(() => {
    if (confirmingCancel || state.message) {
      setIsExpanded(true);
    }
  }, [confirmingCancel, state.message]);

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

  return (
    <article
      className={`rounded-[28px] border bg-black/20 p-5 transition ${
        isExpanded ? "border-[#8cff59]/20 ring-1 ring-[#8cff59]/10" : "border-white/10"
      }`}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={detailId}
        onClick={() => {
          if (!canExpand) return;
          setIsExpanded((current) => !current);
        }}
        className="group -m-1 w-full rounded-[24px] p-1 text-left outline-none"
      >
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

          <div className="flex items-start gap-2">
            <div className="flex flex-col items-end gap-2">
              <p className="max-w-[14rem] text-right text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                {compactSummary(turno)}
              </p>
              <p className="max-w-[14rem] text-right text-[11px] leading-4 text-zinc-500">
                {canExpand
                  ? turno.canManage
                    ? "Desplegá para ver nota, motivo y confirmación de cancelación."
                    : "Desplegá para ver la lectura completa."
                  : "Lectura completa en la vista compacta."}
              </p>
            </div>
            {canExpand ? (
              <span className="mt-0.5 rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 transition group-hover:border-[#8cff59]/25 group-hover:text-[#8cff59]">
                <ChevronIcon expanded={isExpanded} />
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {turno.notaCliente ? (
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300">
              Tiene nota
            </span>
          ) : null}
          {turno.motivoCancelacion ? (
            <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
              Cancelado con motivo
            </span>
          ) : null}
          {state.message ? (
            <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-xs text-[#d8ffc7]">
              Estado actualizado
            </span>
          ) : null}
        </div>
      </button>

      {turno.canManage ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/marciano/turnos/nuevo?reprogramar=${turno.id}`}
            className="ghost-button inline-flex min-h-[44px] items-center justify-center rounded-[20px] px-4 text-sm font-semibold"
          >
            Reprogramar
          </Link>
          <button
            type="button"
            onClick={() => {
              setConfirmingCancel(true);
              setIsExpanded(true);
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[20px] border border-rose-500/25 bg-rose-500/10 px-4 text-sm font-semibold text-rose-200"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {canExpand && shouldRenderDetails ? (
        <div
          id={detailId}
          className={`grid overflow-hidden transition-all duration-300 ease-out ${
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0">
            <div className="space-y-3 pt-4">
              {turno.notaCliente ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                  {turno.notaCliente}
                </p>
              ) : null}

              {turno.motivoCancelacion ? (
                <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  Motivo: {turno.motivoCancelacion}
                </p>
              ) : null}

              {!turno.canManage && turno.manageMessage ? (
                <p className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-500">
                  {turno.manageMessage}
                </p>
              ) : null}

              {state.message ? (
                <p className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {state.message}
                </p>
              ) : null}

              {turno.canManage ? (
                <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex flex-wrap gap-2">
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
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
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
