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

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <div className="rounded-[22px] border border-dashed border-stone-300 bg-stone-50 p-4 transition hover:border-stone-400 hover:bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-stone-900">
            {time} · Hueco libre
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {barberName} · {durationMinutos} min
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl text-stone-400 shadow-sm">
          +
        </span>
      </button>

      {open ? (
        <form action={formAction} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="clienteNombre"
              placeholder="Nombre del cliente"
              required
              className="h-12 rounded-2xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
            />
            <input
              name="clienteTelefonoRaw"
              placeholder="Teléfono (opcional)"
              className="h-12 rounded-2xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Guardar turno"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-white px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            >
              Cancelar
            </button>
          </div>
          {state.error ? (
            <p className="text-sm text-red-600">{state.error}</p>
          ) : null}
          {state.fieldErrors?.clienteNombre ? (
            <p className="text-sm text-red-600">{state.fieldErrors.clienteNombre}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
