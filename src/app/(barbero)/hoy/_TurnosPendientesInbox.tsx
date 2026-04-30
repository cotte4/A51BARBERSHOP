"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import type { TurnoActionState } from "@/app/(admin)/turnos/actions";
import type { TurnoSummary } from "@/lib/types";

export type TurnoConAcciones = {
  turno: TurnoSummary;
  confirmarAction: (prevState: TurnoActionState) => Promise<TurnoActionState>;
  rechazarAction: (prevState: TurnoActionState, formData: FormData) => Promise<TurnoActionState>;
};

type InboxProps = {
  items: TurnoConAcciones[];
};

type OptimisticAction =
  | { type: "confirm"; turnoId: string }
  | { type: "reject"; turnoId: string };

function dispatchToast(tone: "success" | "error", message: string) {
  window.dispatchEvent(
    new CustomEvent("a51:toast", { detail: { tone, message } })
  );
}

const initialState: TurnoActionState = {};

function PendienteTurnoRow({
  turno,
  confirmarAction,
  rechazarAction,
  onOptimisticConfirm,
  onOptimisticReject,
}: TurnoConAcciones & {
  onOptimisticConfirm: (turnoId: string) => void;
  onOptimisticReject: (turnoId: string) => void;
}) {
  const [showReject, setShowReject] = useState(false);
  const [isPendingConfirm, startConfirmTransition] = useTransition();
  const [isPendingReject, startRejectTransition] = useTransition();
  const [confirmState, confirmFormAction, confirmPending] = useActionState(confirmarAction, initialState);
  const [rejectState, rejectFormAction, rejectPending] = useActionState(rechazarAction, initialState);

  const isPending = isPendingConfirm || isPendingReject || confirmPending || rejectPending;
  const error = confirmState.error ?? rejectState.error;

  function handleConfirmSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startConfirmTransition(async () => {
      onOptimisticConfirm(turno.id);
      const result = await confirmarAction(initialState);
      if (result.error) {
        dispatchToast("error", "No se pudo actualizar el turno.");
      } else {
        dispatchToast("success", "Turno actualizado.");
      }
    });
  }

  function handleRejectSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startRejectTransition(async () => {
      onOptimisticReject(turno.id);
      const result = await rechazarAction(initialState, formData);
      if (result.error) {
        dispatchToast("error", "No se pudo actualizar el turno.");
      } else {
        dispatchToast("success", "Turno actualizado.");
      }
    });
  }

  return (
    <article
      className={`rounded-[22px] border border-amber-400/20 bg-amber-400/5 p-4 transition-opacity duration-150 ${isPending ? "opacity-60" : "opacity-100"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold text-white">{turno.clienteNombre}</p>
            {turno.esMarcianoSnapshot ? (
              <span className="rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-300">
                Marciano
              </span>
            ) : null}
            {turno.prioridadAbsoluta ? (
              <span className="rounded-full border border-amber-300/40 bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                !
              </span>
            ) : null}
            {isPending ? (
              <span className="text-[10px] text-zinc-500">guardando...</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {turno.horaInicio} · {turno.duracionMinutos} min
            {turno.servicioNombre ? ` · ${turno.servicioNombre}` : ""}
          </p>
          {turno.notaCliente ? (
            <p className="mt-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-2 py-1.5 text-xs text-zinc-300">
              {turno.notaCliente}
            </p>
          ) : null}
        </div>

        {!showReject ? (
          <div className="flex shrink-0 items-center gap-2">
            <form onSubmit={handleConfirmSubmit}>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#8cff59] px-3.5 text-xs font-semibold text-[#07130a] hover:bg-[#a8ff80] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPendingConfirm ? (
                  <>
                    <SpinnerIcon />
                    Confirmando
                  </>
                ) : (
                  "Confirmar"
                )}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setShowReject(true)}
              disabled={isPending}
              className="inline-flex min-h-[36px] items-center rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
            >
              Rechazar
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
          {error}
        </p>
      ) : null}

      {showReject ? (
        <form onSubmit={handleRejectSubmit} className="mt-3 space-y-2">
          <textarea
            name="motivoCancelacion"
            rows={2}
            required
            minLength={3}
            placeholder="Motivo del rechazo"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-red-400"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/15 px-3.5 text-xs font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-50"
            >
              {isPendingReject ? (
                <>
                  <SpinnerIcon />
                  Rechazando
                </>
              ) : (
                "Confirmar rechazo"
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowReject(false)}
              className="inline-flex min-h-[36px] items-center rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
            >
              Volver
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3 animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12M5.64 18.36l2.12-2.12m8.48-8.48 2.12-2.12"
      />
    </svg>
  );
}

export default function TurnosPendientesInbox({ items }: InboxProps) {
  const [optimisticItems, applyOptimistic] = useOptimistic<
    TurnoConAcciones[],
    OptimisticAction
  >(items, (current, action) => {
    if (action.type === "confirm") {
      return current.map((item) =>
        item.turno.id === action.turnoId
          ? {
              ...item,
              turno: { ...item.turno, estado: "confirmado" as const },
            }
          : item
      );
    }
    if (action.type === "reject") {
      return current.filter((item) => item.turno.id !== action.turnoId);
    }
    return current;
  });

  if (items.length === 0) return null;

  return (
    <section className="panel-card rounded-[32px] p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-[11px] font-semibold text-amber-400">Solicitudes pendientes</p>
          <h2 className="font-display mt-1 text-xl font-semibold text-white">
            Esperan tu respuesta
          </h2>
        </div>
        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold text-amber-300">
          {optimisticItems.length} {optimisticItems.length === 1 ? "solicitud" : "solicitudes"}
        </span>
      </div>

      <div className="space-y-3">
        {optimisticItems.map(({ turno, confirmarAction, rechazarAction }) => (
          <PendienteTurnoRow
            key={turno.id}
            turno={turno}
            confirmarAction={confirmarAction}
            rechazarAction={rechazarAction}
            onOptimisticConfirm={(id) =>
              applyOptimistic({ type: "confirm", turnoId: id })
            }
            onOptimisticReject={(id) =>
              applyOptimistic({ type: "reject", turnoId: id })
            }
          />
        ))}
      </div>
    </section>
  );
}
