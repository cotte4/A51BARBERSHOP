"use client";

import { useActionState } from "react";
import type { ServicioFormState } from "@/app/(admin)/configuracion/servicios/actions";

interface ServicioFormProps {
  action: (
    prevState: ServicioFormState,
    formData: FormData
  ) => Promise<ServicioFormState>;
  initialData?: {
    nombre?: string;
    precioBase?: string | null;
  };
  submitLabel?: string;
  cancelHref?: string;
  showMotivoField?: boolean;
}

const initialState: ServicioFormState = {};

export default function ServicioForm({
  action,
  initialData,
  submitLabel = "Guardar",
  cancelHref = "/configuracion/servicios",
  showMotivoField = false,
}: ServicioFormProps) {
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
          placeholder="Ej: Corte clásico"
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state.fieldErrors?.nombre && (
          <p className="text-red-500 text-xs">{state.fieldErrors.nombre}</p>
        )}
      </div>

      {/* Precio base */}
      <div className="flex flex-col gap-1">
        <label htmlFor="precioBase" className="text-sm font-medium text-gray-700">
          Precio base <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            $
          </span>
          <input
            id="precioBase"
            name="precioBase"
            type="number"
            min="1"
            step="1"
            defaultValue={initialData?.precioBase ?? ""}
            placeholder="Ej: 5000"
            className="min-h-[44px] w-full px-4 py-2 pl-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        {state.fieldErrors?.precioBase && (
          <p className="text-red-500 text-xs">{state.fieldErrors.precioBase}</p>
        )}
      </div>

      {/* Motivo del cambio de precio (solo modo editar) */}
      {showMotivoField && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor="motivoCambioPrecio"
            className="text-sm font-medium text-gray-700"
          >
            Motivo del cambio de precio{" "}
            <span className="text-gray-400 text-xs">(opcional)</span>
          </label>
          <input
            id="motivoCambioPrecio"
            name="motivoCambioPrecio"
            type="text"
            placeholder="Ej: Actualización por inflación"
            className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      )}

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
