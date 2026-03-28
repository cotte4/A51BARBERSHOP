"use client";

import { useActionState } from "react";
import { generarLiquidacion } from "../actions";
import type { LiquidacionFormState } from "../actions";

interface Props {
  barberosList: Array<{ id: string; nombre: string }>;
}

const initialState: LiquidacionFormState = {};

export default function NuevaLiquidacionForm({ barberosList }: Props) {
  const [state, formAction, isPending] = useActionState(generarLiquidacion, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      {/* Barbero */}
      <div className="flex flex-col gap-1">
        <label htmlFor="barberoId" className="text-sm font-medium text-gray-700">
          Barbero <span className="text-red-500">*</span>
        </label>
        <select
          id="barberoId"
          name="barberoId"
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="">Seleccioná un barbero</option>
          {barberosList.map(b => (
            <option key={b.id} value={b.id}>{b.nombre}</option>
          ))}
        </select>
        {state.fieldErrors?.barberoId && (
          <p className="text-red-500 text-xs">{state.fieldErrors.barberoId}</p>
        )}
      </div>

      {/* Período inicio */}
      <div className="flex flex-col gap-1">
        <label htmlFor="periodoInicio" className="text-sm font-medium text-gray-700">
          Desde <span className="text-red-500">*</span>
        </label>
        <input
          id="periodoInicio"
          name="periodoInicio"
          type="date"
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state.fieldErrors?.periodoInicio && (
          <p className="text-red-500 text-xs">{state.fieldErrors.periodoInicio}</p>
        )}
      </div>

      {/* Período fin */}
      <div className="flex flex-col gap-1">
        <label htmlFor="periodoFin" className="text-sm font-medium text-gray-700">
          Hasta <span className="text-red-500">*</span>
        </label>
        <input
          id="periodoFin"
          name="periodoFin"
          type="date"
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state.fieldErrors?.periodoFin && (
          <p className="text-red-500 text-xs">{state.fieldErrors.periodoFin}</p>
        )}
      </div>

      {/* Notas */}
      <div className="flex flex-col gap-1">
        <label htmlFor="notas" className="text-sm font-medium text-gray-700">
          Notas <span className="text-gray-400 text-xs">(opcional)</span>
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={2}
          placeholder="Notas opcionales..."
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 min-h-[44px] bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? "Generando..." : "Generar liquidación"}
        </button>
        <a
          href="/liquidaciones"
          className="min-h-[44px] px-6 flex items-center justify-center bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
