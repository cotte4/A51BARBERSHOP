"use client";

import { useActionState } from "react";
import type { RegistrarCuotaState } from "./actions";

interface RegistrarPagoFormProps {
  action: (
    prevState: RegistrarCuotaState,
    formData: FormData
  ) => Promise<RegistrarCuotaState>;
  cuotaTotalDefault: number;
}

export default function RegistrarPagoForm({
  action,
  cuotaTotalDefault,
}: RegistrarPagoFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          Pago registrado correctamente.
        </div>
      )}

      {/* Monto pagado en USD */}
      <div className="flex flex-col gap-1">
        <label htmlFor="montoPagadoUsd" className="text-sm font-medium text-gray-700">
          Monto pagado <span className="text-gray-400 text-xs">(u$d)</span>{" "}
          <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
            u$d
          </span>
          <input
            id="montoPagadoUsd"
            name="montoPagadoUsd"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={cuotaTotalDefault.toFixed(2)}
            placeholder="0.00"
            className="min-h-[44px] w-full px-4 py-2 pl-12 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* TC del día */}
      <div className="flex flex-col gap-1">
        <label htmlFor="tcDia" className="text-sm font-medium text-gray-700">
          TC del día <span className="text-gray-400 text-xs">(ARS por USD)</span>{" "}
          <span className="text-red-500">*</span>
        </label>
        <input
          id="tcDia"
          name="tcDia"
          type="number"
          min="1"
          step="1"
          placeholder="Ej: 1200"
          required
          className="min-h-[44px] w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
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
          placeholder="Ej: Transferencia banco nación, referencia 123456..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-[44px] bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {isPending ? "Registrando..." : "Registrar pago"}
      </button>
    </form>
  );
}
