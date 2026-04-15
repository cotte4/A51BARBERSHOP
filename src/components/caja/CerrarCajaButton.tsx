"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import type { CierreFormState } from "@/app/(barbero)/caja/actions";

interface CerrarCajaButtonProps {
  cerrarAction: (prevState: CierreFormState, formData: FormData) => Promise<CierreFormState>;
}

export default function CerrarCajaButton({ cerrarAction }: CerrarCajaButtonProps) {
  const [state, formAction, isPending] = useActionState(cerrarAction, {});
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (state.error) {
      setArmed(false);
    }
  }, [state.error]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!armed) {
          event.preventDefault();
          setArmed(true);
        }
      }}
      className="space-y-4"
    >
      {state.error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/12 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-amber-500/20 bg-amber-500/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
              Cierre final
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">Este paso deja la caja sellada</h3>
            <p className="mt-1 text-sm leading-6 text-amber-100/80">
              Guarda quien cerro, fija la hora y bloquea nuevos movimientos del dia.
            </p>
          </div>

          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
            Irreversible
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300">
          Primer click habilita la confirmacion. El segundo click ejecuta el cierre de verdad.
        </div>
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="neon-button inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[20px] px-5 text-sm font-semibold text-[#07130a] disabled:cursor-not-allowed disabled:opacity-60"
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
        <span>
          {isPending
            ? "Cerrando caja..."
            : armed
              ? "Confirmar cierre del dia"
              : "Revisar y habilitar cierre"}
        </span>
      </button>

      <p className="text-xs leading-5 text-zinc-500">
        {armed
          ? "Ahora ya podes confirmar sin perder el contexto."
          : "Si queres volver atras, toca otro lugar antes de confirmar."}
      </p>
    </form>
  );
}
