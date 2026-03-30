"use client";

import { useActionState, useState } from "react";
import type { GastoFormState } from "@/app/(admin)/configuracion/gastos-fijos/actions";

interface GastoFormProps {
  action: (
    prevState: GastoFormState,
    formData: FormData
  ) => Promise<GastoFormState>;
  categorias: Array<{ id: string; nombre: string | null }>;
  initialData?: {
    descripcion?: string | null;
    monto?: string | null;
    fecha?: string | null;
    categoriaId?: string | null;
    esRecurrente?: boolean | null;
    frecuencia?: string | null;
    notas?: string | null;
  };
  submitLabel?: string;
  cancelHref?: string;
}

const initialState: GastoFormState = {};

export default function GastoForm({
  action,
  categorias,
  initialData,
  submitLabel = "Guardar",
  cancelHref = "/configuracion/gastos-fijos",
}: GastoFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [esRecurrente, setEsRecurrente] = useState(
    initialData?.esRecurrente ?? false
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      {/* Categoría */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="categoriaId"
          className="text-sm font-medium text-gray-700"
        >
          Categoría{" "}
          <span className="text-gray-400 text-xs">(opcional)</span>
        </label>
        <select
          id="categoriaId"
          name="categoriaId"
          defaultValue={initialData?.categoriaId ?? ""}
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="">Sin categoría</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>
        {state.fieldErrors?.categoriaId && (
          <p className="text-red-500 text-xs">{state.fieldErrors.categoriaId}</p>
        )}
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="descripcion"
          className="text-sm font-medium text-gray-700"
        >
          Descripción <span className="text-red-500">*</span>
        </label>
        <input
          id="descripcion"
          name="descripcion"
          type="text"
          defaultValue={initialData?.descripcion ?? ""}
          placeholder="Ej: Alquiler del local"
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state.fieldErrors?.descripcion && (
          <p className="text-red-500 text-xs">
            {state.fieldErrors.descripcion}
          </p>
        )}
      </div>

      {/* Monto */}
      <div className="flex flex-col gap-1">
        <label htmlFor="monto" className="text-sm font-medium text-gray-700">
          Monto <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            $
          </span>
          <input
            id="monto"
            name="monto"
            type="number"
            min="1"
            step="1"
            defaultValue={initialData?.monto ?? ""}
            placeholder="Ej: 150000"
            className="min-h-[44px] w-full px-4 py-2 pl-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        {state.fieldErrors?.monto && (
          <p className="text-red-500 text-xs">{state.fieldErrors.monto}</p>
        )}
      </div>

      {/* Fecha */}
      <div className="flex flex-col gap-1">
        <label htmlFor="fecha" className="text-sm font-medium text-gray-700">
          Fecha <span className="text-red-500">*</span>
        </label>
        <input
          id="fecha"
          name="fecha"
          type="date"
          defaultValue={initialData?.fecha ?? ""}
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state.fieldErrors?.fecha && (
          <p className="text-red-500 text-xs">{state.fieldErrors.fecha}</p>
        )}
      </div>

      {/* Es recurrente */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="esRecurrente"
            checked={esRecurrente}
            onChange={(e) => setEsRecurrente(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
          />
          <span className="text-sm font-medium text-gray-700">
            Gasto recurrente
          </span>
        </label>

        {/* Frecuencia — solo visible si esRecurrente */}
        {esRecurrente && (
          <div className="flex flex-col gap-1 pl-8">
            <label
              htmlFor="frecuencia"
              className="text-sm font-medium text-gray-700"
            >
              Frecuencia <span className="text-red-500">*</span>
            </label>
            <select
              id="frecuencia"
              name="frecuencia"
              defaultValue={initialData?.frecuencia ?? "mensual"}
              className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            >
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
              <option value="anual">Anual</option>
              <option value="unica">Única vez</option>
            </select>
            {state.fieldErrors?.frecuencia && (
              <p className="text-red-500 text-xs">
                {state.fieldErrors.frecuencia}
              </p>
            )}
          </div>
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
          defaultValue={initialData?.notas ?? ""}
          placeholder="Información adicional..."
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 min-h-[44px] bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isPending ? "Guardando..." : submitLabel}
        </button>
        <a
          href={cancelHref}
          className="min-h-[44px] px-6 flex items-center justify-center bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
