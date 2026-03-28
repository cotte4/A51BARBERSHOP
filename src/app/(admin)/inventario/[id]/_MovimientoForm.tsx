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
      {state.error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">
          Movimiento registrado correctamente.
        </div>
      )}

      {/* Tipo */}
      <div>
        <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
          Tipo <span className="text-red-500">*</span>
        </label>
        <select
          id="tipo"
          name="tipo"
          required
          defaultValue=""
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="" disabled>Seleccioná un tipo</option>
          <option value="entrada">Entrada (reposición)</option>
          <option value="uso_interno">Uso interno (consumo del salón)</option>
          <option value="ajuste">Ajuste (corrección manual)</option>
        </select>
        {state.fieldErrors?.tipo && (
          <p className="text-red-500 text-xs mt-1">{state.fieldErrors.tipo}</p>
        )}
      </div>

      {/* Cantidad */}
      <div>
        <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 mb-1">
          Cantidad <span className="text-red-500">*</span>
        </label>
        <input
          id="cantidad"
          name="cantidad"
          type="number"
          step="1"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Ej: 3 (o -2 para reducir)"
        />
        <p className="text-xs text-gray-400 mt-1">
          Positivo para sumar, negativo para restar (solo en ajuste). Para uso interno ingresá positivo, se descuenta automáticamente.
        </p>
        {state.fieldErrors?.cantidad && (
          <p className="text-red-500 text-xs mt-1">{state.fieldErrors.cantidad}</p>
        )}
      </div>

      {/* Notas */}
      <div>
        <label htmlFor="notas" className="block text-sm font-medium text-gray-700 mb-1">
          Notas <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          placeholder="Motivo del movimiento"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-[44px] w-full bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
      >
        {isPending ? "Registrando..." : "Confirmar movimiento"}
      </button>
    </form>
  );
}
