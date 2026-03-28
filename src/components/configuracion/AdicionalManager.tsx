"use client";

import { useActionState, useTransition } from "react";
import type { AdicionalFormState } from "@/app/(admin)/configuracion/servicios/actions";

interface AdicionalManagerProps {
  servicioId: string;
  adicionales: Array<{ id: string; nombre: string; precioExtra: string | null }>;
  crearAdicionalAction: (
    servicioId: string,
    prevState: AdicionalFormState,
    formData: FormData
  ) => Promise<AdicionalFormState>;
  eliminarAdicionalAction: (id: string, servicioId: string) => Promise<void>;
}

function formatARS(val: string | null | undefined) {
  if (!val) return "$0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

const initialState: AdicionalFormState = {};

function EliminarButton({
  id,
  servicioId,
  eliminarAdicionalAction,
}: {
  id: string;
  servicioId: string;
  eliminarAdicionalAction: (id: string, servicioId: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(() => eliminarAdicionalAction(id, servicioId))
      }
      className="min-h-[44px] px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
    >
      {isPending ? "Eliminando..." : "Eliminar"}
    </button>
  );
}

export default function AdicionalManager({
  servicioId,
  adicionales,
  crearAdicionalAction,
  eliminarAdicionalAction,
}: AdicionalManagerProps) {
  const crearConId = crearAdicionalAction.bind(null, servicioId);
  const [state, formAction, isPending] = useActionState(crearConId, initialState);

  return (
    <div className="flex flex-col gap-4">
      {/* Lista de adicionales existentes */}
      {adicionales.length === 0 ? (
        <p className="text-sm text-gray-400">Sin adicionales cargados.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {adicionales.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900">
                  {a.nombre}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  +{formatARS(a.precioExtra)}
                </span>
              </div>
              <EliminarButton
                id={a.id}
                servicioId={servicioId}
                eliminarAdicionalAction={eliminarAdicionalAction}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Formulario para agregar nuevo adicional */}
      <form action={formAction} className="flex flex-col gap-3">
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        <div className="flex gap-2 flex-col sm:flex-row">
          {/* Nombre */}
          <div className="flex flex-col gap-1 flex-1">
            <label
              htmlFor="adicional-nombre"
              className="text-sm font-medium text-gray-700"
            >
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="adicional-nombre"
              name="nombre"
              type="text"
              placeholder="Ej: Diseño de barba"
              className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* Precio extra */}
          <div className="flex flex-col gap-1 sm:w-40">
            <label
              htmlFor="adicional-precio"
              className="text-sm font-medium text-gray-700"
            >
              Precio extra <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <input
                id="adicional-precio"
                name="precioExtra"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                className="min-h-[44px] w-full px-4 py-2 pl-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="min-h-[44px] px-6 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 self-start"
        >
          {isPending ? "Agregando..." : "+ Agregar adicional"}
        </button>
      </form>
    </div>
  );
}
