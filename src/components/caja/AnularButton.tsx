"use client";

import { useActionState, useEffect, useState } from "react";
import type { AtencionFormState } from "@/app/(barbero)/caja/actions";

interface AnularButtonProps {
  atencionId: string;
  anularAction: (
    id: string,
    prevState: AtencionFormState,
    formData: FormData
  ) => Promise<AtencionFormState>;
}

export default function AnularButton({ atencionId, anularAction }: AnularButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const boundAction = anularAction.bind(null, atencionId);
  const [state, formAction, isPending] = useActionState(boundAction, {});

  useEffect(() => {
    if (!open) {
      setConfirmed(false);
      setSubmitted(false);
    }
  }, [open]);

  useEffect(() => {
    if (submitted && !isPending && !state.error) {
      setOpen(false);
      setConfirmed(false);
      setSubmitted(false);
    }
  }, [isPending, state.error, submitted]);

  const canSubmit = confirmed && !isPending;

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setConfirmed(false);
            setOpen(true);
          }}
          className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition-colors hover:border-rose-400/50 hover:bg-rose-500/15"
          title="Marca la atención como anulada y pide un motivo"
        >
          Anular movimiento
        </button>
      ) : (
        <div className="mt-2 rounded-[22px] border border-rose-500/35 bg-zinc-950/90 p-4 shadow-[0_20px_50px_rgba(127,29,29,0.16)]">
          <div className="rounded-[18px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <p className="font-semibold text-rose-200">Acción sensible</p>
            <p className="mt-1 text-rose-100/85">
              La anulación saca este movimiento de los totales del día y deja el motivo
              registrado. No borra la atención.
            </p>
          </div>

          {state.error ? (
            <p className="mt-3 rounded-[18px] border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-300" aria-live="assertive">
              {state.error}
            </p>
          ) : null}

          <form
            action={formAction}
            className="mt-3 flex flex-col gap-3"
            onSubmit={() => setSubmitted(true)}
          >
            <label
              htmlFor={`motivo-${atencionId}`}
              className="text-sm font-medium text-zinc-200"
            >
              Motivo de anulacion <span className="text-rose-300">*</span>
            </label>
            <input
              id={`motivo-${atencionId}`}
              name="motivoAnulacion"
              type="text"
              required
              placeholder="Ej: se cobró mal, error de medio de pago..."
              className="min-h-[46px] w-full rounded-[18px] border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-white outline-none transition focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/30"
            />
            {state.fieldErrors?.motivoAnulacion ? (
              <p className="text-xs text-rose-300">{state.fieldErrors.motivoAnulacion}</p>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-zinc-800 bg-zinc-900/70 p-3 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={isPending}
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-rose-500 focus:ring-rose-500/40"
              />
              <span>
                <span className="block font-semibold text-white">Confirmo que revisé el impacto</span>
                <span className="mt-1 block text-zinc-400">
                  Voy a anular esta atención sabiendo que afecta la caja del día.
                </span>
              </span>
            </label>

            <div className="mt-1 flex gap-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 min-h-[46px] rounded-2xl bg-rose-600 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-950 disabled:text-rose-300"
              >
                {isPending ? "Anulando..." : confirmed ? "Confirmar anulación" : "Confirmar anulación"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="min-h-[46px] rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
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
