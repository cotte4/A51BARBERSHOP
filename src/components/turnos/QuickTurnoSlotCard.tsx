"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { QuickTurnoCreateState } from "@/app/(admin)/turnos/actions";

type QuickTurnoSlotCardProps = {
  time: string;
  barberName: string;
  durationMinutos: number;
  action: (
    prevState: QuickTurnoCreateState,
    formData: FormData
  ) => Promise<QuickTurnoCreateState>;
};

const initialState: QuickTurnoCreateState = {};

export default function QuickTurnoSlotCard({
  time,
  barberName,
  durationMinutos,
  action,
}: QuickTurnoSlotCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, initialState);
  const fieldError = state.fieldErrors?.clienteNombre;
  const hasError = Boolean(state.error || fieldError);
  const panelId = `quick-slot-${barberName}-${time}-${durationMinutos}`.replace(/[^a-zA-Z0-9-]/g, "-");

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <div
      className={`rounded-[22px] border transition ${
        open
          ? "border-[#8cff59]/30 bg-zinc-900 shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
          : "border-dashed border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((c) => !c)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8cff59]">
              Hueco libre
            </p>
            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              {durationMinutos} min
            </span>
          </div>
          <p className="mt-1 text-base font-semibold text-white">{time}</p>
          <p className="mt-1 text-sm text-zinc-400">{barberName}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Abrilo para crear un turno confirmado en este bloque sin salir de la agenda.
          </p>
        </div>
        <span className="flex h-11 min-w-11 items-center justify-center rounded-2xl border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 text-sm font-bold text-[#8cff59]">
          {open ? "–" : "+"}
        </span>
      </button>

      {open ? (
        <form id={panelId} action={formAction} className="space-y-3 border-t border-zinc-800 px-4 pb-4 pt-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Nuevo turno en este hueco
            </p>
            <p className="mt-1 text-sm text-zinc-200">
              {time} · {durationMinutos} min · {barberName}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="clienteNombre"
              autoComplete="name"
              autoFocus
              placeholder="Nombre del cliente"
              required
              aria-invalid={hasError}
              className={`h-11 rounded-2xl border bg-zinc-950 px-3 text-sm text-white placeholder-zinc-600 outline-none ${
                fieldError ? "border-red-500/40 focus:border-red-400" : "border-zinc-700 focus:border-[#8cff59]"
              }`}
            />
            <input
              name="clienteTelefonoRaw"
              autoComplete="tel"
              inputMode="tel"
              placeholder="Telefono (opcional)"
              className="h-11 rounded-2xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] hover:bg-[#a8ff80] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Crear turno confirmado"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
            >
              Cerrar
            </button>
          </div>

          {state.error ? (
            <p role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {state.error}
            </p>
          ) : null}
          {fieldError ? (
            <p role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {fieldError}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
