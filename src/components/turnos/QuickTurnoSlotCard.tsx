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
    <div className={`rounded-xl border transition ${open ? "border-[#8cff59]/25 bg-zinc-900" : "border-dashed border-zinc-800 bg-transparent hover:border-zinc-700"}`}>
      <button
        type="button"
        onClick={() => setOpen((c) => !c)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 px-3 py-1.5 text-center"
      >
        {open ? (
          <span className="text-xs font-semibold text-[#8cff59]">– {time} · {durationMinutos} min · {barberName}</span>
        ) : (
          <>
            <span className="text-base font-semibold text-zinc-600">+</span>
            <span className="text-[11px] text-zinc-600">{durationMinutos} min · {barberName}</span>
          </>
        )}
      </button>

      {open ? (
        <form id={panelId} action={formAction} className="space-y-3 border-t border-zinc-800 px-3 pb-3 pt-2.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="clienteNombre"
              autoComplete="name"
              autoFocus
              placeholder="Nombre del cliente"
              required
              aria-invalid={hasError}
              className={`h-11 rounded-xl border bg-zinc-950 px-3 text-sm text-white placeholder-zinc-600 outline-none ${
                fieldError ? "border-red-500/40 focus:border-red-400" : "border-zinc-700 focus:border-[#8cff59]"
              }`}
            />
            <input
              name="clienteTelefonoRaw"
              autoComplete="tel"
              inputMode="tel"
              placeholder="Telefono (opcional)"
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Crear turno confirmado"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-sm font-medium text-zinc-300"
            >
              Cancelar
            </button>
          </div>

          {state.error ? (
            <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {state.error}
            </p>
          ) : null}
          {fieldError ? (
            <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {fieldError}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
