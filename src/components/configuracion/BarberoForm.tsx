"use client";

import { useActionState } from "react";
import type { BarberoFormState } from "@/app/(admin)/configuracion/barberos/actions";

interface BarberoFormProps {
  action: (
    prevState: BarberoFormState,
    formData: FormData
  ) => Promise<BarberoFormState>;
  initialData?: {
    nombre?: string;
    rol?: string;
    tipoModelo?: string;
    porcentajeComision?: string | null;
    alquilerBancoMensual?: string | null;
    sueldoMinimoGarantizado?: string | null;
    servicioDefectoId?: string | null;
    medioPagoDefectoId?: string | null;
  };
  serviciosOptions: Array<{ id: string; nombre: string }>;
  mediosPagoOptions: Array<{ id: string; nombre: string | null }>;
  submitLabel?: string;
  cancelHref?: string;
}

const initialState: BarberoFormState = {};

export default function BarberoForm({
  action,
  initialData,
  serviciosOptions,
  mediosPagoOptions,
  submitLabel = "Guardar",
  cancelHref = "/configuracion/barberos",
}: BarberoFormProps) {
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
          placeholder="Ej: Gabote"
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state.fieldErrors?.nombre && (
          <p className="text-red-500 text-xs">{state.fieldErrors.nombre}</p>
        )}
      </div>

      {/* Rol */}
      <div className="flex flex-col gap-1">
        <label htmlFor="rol" className="text-sm font-medium text-gray-700">
          Rol <span className="text-red-500">*</span>
        </label>
        <select
          id="rol"
          name="rol"
          defaultValue={initialData?.rol ?? "barbero"}
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="barbero">Barbero</option>
          <option value="admin">Admin (dueño)</option>
        </select>
        {state.fieldErrors?.rol && (
          <p className="text-red-500 text-xs">{state.fieldErrors.rol}</p>
        )}
      </div>

      {/* Tipo de modelo */}
      <div className="flex flex-col gap-1">
        <label htmlFor="tipoModelo" className="text-sm font-medium text-gray-700">
          Modelo de compensación <span className="text-red-500">*</span>
        </label>
        <select
          id="tipoModelo"
          name="tipoModelo"
          defaultValue={initialData?.tipoModelo ?? "variable"}
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="variable">Variable (solo % comisión)</option>
          <option value="hibrido">Híbrido (% comisión + alquiler banco)</option>
          <option value="fijo">Fijo (sueldo mínimo garantizado)</option>
        </select>
        {state.fieldErrors?.tipoModelo && (
          <p className="text-red-500 text-xs">{state.fieldErrors.tipoModelo}</p>
        )}
      </div>

      {/* Porcentaje de comisión */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="porcentajeComision"
          className="text-sm font-medium text-gray-700"
        >
          % de comisión sobre cortes <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="porcentajeComision"
            name="porcentajeComision"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue={initialData?.porcentajeComision ?? ""}
            placeholder="Ej: 75"
            className="min-h-[44px] w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            %
          </span>
        </div>
        {state.fieldErrors?.porcentajeComision && (
          <p className="text-red-500 text-xs">
            {state.fieldErrors.porcentajeComision}
          </p>
        )}
      </div>

      {/* Alquiler banco mensual */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="alquilerBancoMensual"
          className="text-sm font-medium text-gray-700"
        >
          Alquiler banco mensual{" "}
          <span className="text-gray-400 text-xs">(solo modelo híbrido)</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            $
          </span>
          <input
            id="alquilerBancoMensual"
            name="alquilerBancoMensual"
            type="number"
            min="0"
            step="1"
            defaultValue={initialData?.alquilerBancoMensual ?? ""}
            placeholder="Ej: 300000"
            className="min-h-[44px] w-full px-4 py-2 pl-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        {state.fieldErrors?.alquilerBancoMensual && (
          <p className="text-red-500 text-xs">
            {state.fieldErrors.alquilerBancoMensual}
          </p>
        )}
      </div>

      {/* Sueldo mínimo garantizado */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="sueldoMinimoGarantizado"
          className="text-sm font-medium text-gray-700"
        >
          Sueldo mínimo garantizado{" "}
          <span className="text-gray-400 text-xs">(opcional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            $
          </span>
          <input
            id="sueldoMinimoGarantizado"
            name="sueldoMinimoGarantizado"
            type="number"
            min="0"
            step="1"
            defaultValue={initialData?.sueldoMinimoGarantizado ?? ""}
            placeholder="Ej: 500000"
            className="min-h-[44px] w-full px-4 py-2 pl-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        {state.fieldErrors?.sueldoMinimoGarantizado && (
          <p className="text-red-500 text-xs">
            {state.fieldErrors.sueldoMinimoGarantizado}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="servicioDefectoId" className="text-sm font-medium text-gray-700">
          Servicio por defecto <span className="text-gray-400 text-xs">(acciÃ³n rÃ¡pida)</span>
        </label>
        <select
          id="servicioDefectoId"
          name="servicioDefectoId"
          defaultValue={initialData?.servicioDefectoId ?? ""}
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="">Sin configurar</option>
          {serviciosOptions.map((servicio) => (
            <option key={servicio.id} value={servicio.id}>
              {servicio.nombre}
            </option>
          ))}
        </select>
        {state.fieldErrors?.servicioDefectoId ? (
          <p className="text-red-500 text-xs">{state.fieldErrors.servicioDefectoId}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="medioPagoDefectoId" className="text-sm font-medium text-gray-700">
          Medio de pago por defecto <span className="text-gray-400 text-xs">(acciÃ³n rÃ¡pida)</span>
        </label>
        <select
          id="medioPagoDefectoId"
          name="medioPagoDefectoId"
          defaultValue={initialData?.medioPagoDefectoId ?? ""}
          className="min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="">Sin configurar</option>
          {mediosPagoOptions.map((medio) => (
            <option key={medio.id} value={medio.id}>
              {medio.nombre ?? "—"}
            </option>
          ))}
        </select>
        {state.fieldErrors?.medioPagoDefectoId ? (
          <p className="text-red-500 text-xs">{state.fieldErrors.medioPagoDefectoId}</p>
        ) : null}
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
