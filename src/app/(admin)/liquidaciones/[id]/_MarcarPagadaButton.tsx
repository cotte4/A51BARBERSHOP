"use client";

import { useActionState, useEffect, useState } from "react";
import type { MarcarPagadaState } from "../actions";

interface Props {
  marcarAction: (prevState: MarcarPagadaState, formData: FormData) => Promise<MarcarPagadaState>;
}

export default function MarcarPagadaButton({ marcarAction }: Props) {
  const [state, formAction, isPending] = useActionState(marcarAction, {});
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isPending && !state.error) {
      setConfirming(false);
    }
  }, [isPending, state.error]);

  return (
    <form action={formAction} className="space-y-3">
      {state.error ? (
        <p className="rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="neon-button inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold"
        >
          Marcar como pagada
        </button>
      ) : (
        <div className="rounded-[22px] border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-300">Confirmar pago</p>
          <p className="mt-1 text-sm leading-6 text-zinc-200">
            Esta accion cierra la liquidacion y la manda al historial con fecha de pago.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="ghost-button inline-flex min-h-[44px] flex-1 items-center justify-center rounded-2xl px-4 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="neon-button inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-[#07130a] disabled:opacity-50"
            >
              {isPending && (
                <svg
                  style={{ animation: "a51-spin 0.65s linear infinite" }}
                  width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
                  className="shrink-0"
                >
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.8" />
                  <path d="M 7 1.5 A 5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
              <span>{isPending ? "Guardando..." : "Confirmar pago"}</span>
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
