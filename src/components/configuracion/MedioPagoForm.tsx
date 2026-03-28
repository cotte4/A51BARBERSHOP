"use client";

import { useActionState } from "react";
import type { MedioPagoFormState } from "@/app/(admin)/configuracion/medios-de-pago/actions";

interface MedioPagoFormProps {
  action: (
    prevState: MedioPagoFormState,
    formData: FormData
  ) => Promise<MedioPagoFormState>;
  initialData?: {
    nombre?: string | null;
    comisionPorcentaje?: string | null;
  };
  submitLabel?: string;
  cancelHref?: string;
}

const initialState: MedioPagoFormState = {};

export default function MedioPagoForm({
  action,
  initialData,
  submitLabel = "Guardar",
  cancelHref = "/configuracion/medios-de-pago",
}: MedioPagoFormProps) {
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
          placeholder="Ej: Mercado Pago QR"
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state.fieldErrors?.nombre && (
          <p className="text-red-500 text-xs">{state.fieldErrors.nombre}</p>
        )}
      </div>

      {/* Comisión */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="comisionPorcentaje"
          className="text-sm font-medium text-gray-700"
        >
          Comisión{" "}
          <span className="text-gray-400 text-xs">(0 si no aplica)</span>
        </label>
        <div className="relative">
          <input
            id="comisionPorcentaje"
            name="comisionPorcentaje"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue={initialData?.comisionPorcentaje ?? "0"}
            placeholder="Ej: 6"
            className="min-h-[44px] w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            %
          </span>
        </div>
        {state.fieldErrors?.comisionPorcentaje && (
          <p className="text-red-500 text-xs">
            {state.fieldErrors.comisionPorcentaje}
          </p>
        )}
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
