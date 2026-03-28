"use client";

import { useActionState } from "react";
import type { TemporadaFormState } from "@/app/(admin)/configuracion/temporadas/actions";

interface TemporadaFormProps {
  action: (
    prevState: TemporadaFormState,
    formData: FormData
  ) => Promise<TemporadaFormState>;
  initialData?: {
    nombre?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    cortesDiaProyectados?: number | null;
    precioBaseProyectado?: string | null;
  };
  submitLabel?: string;
  cancelHref?: string;
}

const initialState: TemporadaFormState = {};

export default function TemporadaForm({
  action,
  initialData,
  submitLabel = "Guardar",
  cancelHref = "/configuracion/temporadas",
}: TemporadaFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      {/* Nombre */}
      <div className="flex flex-col gap-1">
        <label htmlFor="nombre" className="text-sm font-medium text-gray-700">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          defaultValue={initialData?.nombre ?? ""}
          placeholder="Ej: Alta temporada verano 2026"
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state.fieldErrors?.nombre && (
          <p className="text-red-500 text-xs">{state.fieldErrors.nombre}</p>
        )}
      </div>

      {/* Fecha inicio */}
      <div className="flex flex-col gap-1">
        <label htmlFor="fechaInicio" className="text-sm font-medium text-gray-700">
          Fecha de inicio <span className="text-red-500">*</span>
        </label>
        <input
          id="fechaInicio"
          name="fechaInicio"
          type="date"
          defaultValue={initialData?.fechaInicio ?? ""}
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state.fieldErrors?.fechaInicio && (
          <p className="text-red-500 text-xs">{state.fieldErrors.fechaInicio}</p>
        )}
      </div>

      {/* Fecha fin */}
      <div className="flex flex-col gap-1">
        <label htmlFor="fechaFin" className="text-sm font-medium text-gray-700">
          Fecha de fin{" "}
          <span className="text-gray-400 text-xs">(opcional)</span>
        </label>
        <input
          id="fechaFin"
          name="fechaFin"
          type="date"
          defaultValue={initialData?.fechaFin ?? ""}
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state.fieldErrors?.fechaFin && (
          <p className="text-red-500 text-xs">{state.fieldErrors.fechaFin}</p>
        )}
      </div>

      {/* Cortes/día proyectados */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="cortesDiaProyectados"
          className="text-sm font-medium text-gray-700"
        >
          Cortes/día proyectados{" "}
          <span className="text-gray-400 text-xs">(opcional)</span>
        </label>
        <input
          id="cortesDiaProyectados"
          name="cortesDiaProyectados"
          type="number"
          min="0"
          step="1"
          defaultValue={
            initialData?.cortesDiaProyectados !== null &&
            initialData?.cortesDiaProyectados !== undefined
              ? String(initialData.cortesDiaProyectados)
              : ""
          }
          placeholder="Ej: 12"
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Precio base proyectado */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="precioBaseProyectado"
          className="text-sm font-medium text-gray-700"
        >
          Precio base proyectado{" "}
          <span className="text-gray-400 text-xs">(opcional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            $
          </span>
          <input
            id="precioBaseProyectado"
            name="precioBaseProyectado"
            type="number"
            min="0"
            step="0.01"
            defaultValue={initialData?.precioBaseProyectado ?? ""}
            placeholder="Ej: 5000"
            className="min-h-[44px] w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
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
