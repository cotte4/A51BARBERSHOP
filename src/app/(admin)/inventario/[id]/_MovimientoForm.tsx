"use client";

import { useActionState } from "react";
import type { MovimientoFormState } from "../actions";

interface Props {
  registrarAction: (prevState: MovimientoFormState, formData: FormData) => Promise<MovimientoFormState>;
}

const initialState: MovimientoFormState = {};

export default function MovimientoForm({ registrarAction }: Props) {
  const [state, formAction, isPending] = useActionState(registrarAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <p className="eyebrow text-[11px] font-semibold">Movimiento manual</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Registrar entrada o salida</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Elige cantidad, escribe una nota corta y usa el boton que describe la accion real.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400">
          <p className="font-medium text-zinc-200">Regla operativa</p>
          <p className="mt-1 leading-5">Toda carga deja trazabilidad en stock_movimientos.</p>
        </div>
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/12 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/12 px-4 py-3 text-sm text-emerald-200">
          Movimiento registrado correctamente.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 p-4">
          <label htmlFor="cantidad" className="block text-sm font-medium text-zinc-200">
            Cantidad
          </label>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Siempre usa un numero positivo. El tipo define si entra stock o si se descuenta.
          </p>
          <input
            id="cantidad"
            name="cantidad"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            className="mt-3 h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white outline-none transition focus:border-[#8cff59]/60"
            placeholder="Ej: 3"
          />
          {state.fieldErrors?.cantidad ? (
            <p className="mt-2 text-sm text-red-300">{state.fieldErrors.cantidad}</p>
          ) : null}
        </div>

        <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-sm font-medium text-zinc-200">Accion</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Elegi el sentido del movimiento. No hace falta escribir el tipo.
          </p>
          <div className="mt-4 grid gap-2">
            <button
              type="submit"
              name="tipo"
              value="entrada"
              disabled={isPending}
              className="neon-button inline-flex min-h-[52px] items-center justify-center rounded-2xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Registrando..." : "+ Ingresar stock"}
            </button>
            <button
              type="submit"
              name="tipo"
              value="uso_interno"
              disabled={isPending}
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Registrando..." : "- Restar stock"}
            </button>
          </div>
          {state.fieldErrors?.tipo ? (
            <p className="mt-2 text-sm text-red-300">{state.fieldErrors.tipo}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 p-4">
        <label htmlFor="notas" className="block text-sm font-medium text-zinc-200">
          Notas
        </label>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Opcional, pero ayuda a leer luego por que se toco el stock.
        </p>
        <textarea
          id="notas"
          name="notas"
          rows={3}
          className="mt-3 w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-[#8cff59]/60"
          placeholder="Motivo del movimiento"
        />
      </div>
    </form>
  );
}
