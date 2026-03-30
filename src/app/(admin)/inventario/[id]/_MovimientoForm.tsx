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
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      ) : null}

      {state.success ? (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Movimiento registrado correctamente.
        </div>
      ) : null}

      <div>
        <label htmlFor="cantidad" className="mb-1 block text-sm font-medium text-gray-700">
          Cantidad <span className="text-red-500">*</span>
        </label>
        <input
          id="cantidad"
          name="cantidad"
          type="number"
          min="1"
          step="1"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Ej: 3"
        />
        <p className="mt-1 text-xs text-gray-400">
          Carga siempre un numero positivo. El boton define si entra stock o si se descuenta.
        </p>
        {state.fieldErrors?.cantidad ? (
          <p className="mt-1 text-xs text-red-500">{state.fieldErrors.cantidad}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="notas" className="mb-1 block text-sm font-medium text-gray-700">
          Notas <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={2}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Motivo del movimiento"
        />
      </div>

      {state.fieldErrors?.tipo ? <p className="text-xs text-red-500">{state.fieldErrors.tipo}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="submit"
          name="tipo"
          value="entrada"
          disabled={isPending}
          className="min-h-[48px] rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {isPending ? "Registrando..." : "+ Ingresar stock"}
        </button>
        <button
          type="submit"
          name="tipo"
          value="uso_interno"
          disabled={isPending}
          className="min-h-[48px] rounded-xl bg-rose-600 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
        >
          {isPending ? "Registrando..." : "- Restar stock"}
        </button>
      </div>
    </form>
  );
}
