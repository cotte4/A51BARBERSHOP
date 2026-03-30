"use client";

import { useActionState, useState } from "react";
import type { AtencionFormState } from "@/app/(barbero)/caja/actions";

interface AnularButtonProps {
  atencionId: string;
  anularAction: (
    id: string,
    prevState: AtencionFormState,
    formData: FormData
  ) => Promise<AtencionFormState>;
}

export default function AnularButton({
  atencionId,
  anularAction,
}: AnularButtonProps) {
  const [open, setOpen] = useState(false);

  const boundAction = anularAction.bind(null, atencionId);
  const [state, formAction, isPending] = useActionState(boundAction, {});

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-[44px] rounded-lg border border-rose-500/35 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-500/15"
        >
          Anular
        </button>
      ) : (
        <div className="mt-2 rounded-lg border border-rose-500/35 bg-zinc-950/80 p-3">
          {state.error && <p className="mb-2 text-xs text-rose-300">{state.error}</p>}
          <form action={formAction} className="flex flex-col gap-2">
            <label htmlFor={`motivo-${atencionId}`} className="text-sm font-medium text-zinc-200">
              Motivo de anulacion <span className="text-rose-300">*</span>
            </label>
            <input
              id={`motivo-${atencionId}`}
              name="motivoAnulacion"
              type="text"
              required
              placeholder="Ingresa el motivo..."
              className="min-h-[44px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
            {state.fieldErrors?.motivoAnulacion && (
              <p className="text-xs text-rose-300">{state.fieldErrors.motivoAnulacion}</p>
            )}
            <div className="mt-1 flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 min-h-[44px] rounded-lg bg-rose-600 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
              >
                {isPending ? "Anulando..." : "Confirmar anulacion"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[44px] rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
