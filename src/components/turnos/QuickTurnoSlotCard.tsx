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
    <div className={`rounded-[20px] border transition ${open ? "border-[#8cff59]/30 bg-zinc-900" : "border-dashed border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900"}`}>
      <button
        type="button"
        onClick={() => setOpen((c) => !c)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-medium text-zinc-300">
            Hueco libre · {durationMinutos} min
          </p>
          <p className="mt-0.5 text-xs text-zinc-600">{barberName}</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-sm font-bold text-[#8cff59]">
          +
        </span>
      </button>

      {open ? (
        <form action={formAction} className="border-t border-zinc-800 px-4 pb-4 pt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="clienteNombre"
              placeholder="Nombre del cliente"
              required
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#8cff59]"
            />
            <input
              name="clienteTelefonoRaw"
              placeholder="Teléfono (opcional)"
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] hover:bg-[#a8ff80] disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Guardar turno"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-zinc-800 px-4 text-sm font-medium text-zinc-400 hover:bg-zinc-700"
            >
              Cancelar
            </button>
          </div>
          {state.error ? (
            <p className="text-xs text-red-400">{state.error}</p>
          ) : null}
          {state.fieldErrors?.clienteNombre ? (
            <p className="text-xs text-red-400">{state.fieldErrors.clienteNombre}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
