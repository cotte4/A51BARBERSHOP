"use client";

import { useActionState } from "react";
import { crearCosto, type CostoFormState } from "../actions";
import Link from "next/link";

const CATEGORIAS = [
  { value: "alquiler", label: "Alquiler" },
  { value: "servicios", label: "Servicios (luz, agua, internet)" },
  { value: "insumos", label: "Insumos" },
  { value: "sueldos", label: "Sueldos" },
  { value: "marketing", label: "Marketing" },
  { value: "otro", label: "Otro" },
];

const initialState: CostoFormState = {};

export default function NuevoCostoForm() {
  const [state, formAction, pending] = useActionState(crearCosto, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">Nombre del costo</label>
        <input
          name="nombre"
          type="text"
          placeholder="Ej: Alquiler del local"
          required
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
        />
        {state.fieldErrors?.nombre && (
          <p className="text-xs text-red-400">{state.fieldErrors.nombre}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">Categoría</label>
        <select
          name="categoria"
          required
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white focus:border-[#8cff59]/60 focus:outline-none"
        >
          <option value="">Seleccioná una categoría</option>
          {CATEGORIAS.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {state.fieldErrors?.categoria && (
          <p className="text-xs text-red-400">{state.fieldErrors.categoria}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">
          Monto del mes actual{" "}
          <span className="text-zinc-500">(opcional)</span>
        </label>
        <input
          name="montoMesActual"
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
        />
        {state.fieldErrors?.montoMesActual && (
          <p className="text-xs text-red-400">{state.fieldErrors.montoMesActual}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">
          Notas <span className="text-zinc-500">(opcional)</span>
        </label>
        <textarea
          name="notas"
          placeholder="Ej: Vence el 5 de cada mes"
          rows={2}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Link
          href="/finanzas"
          className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-[20px] border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="neon-button inline-flex min-h-[52px] flex-1 items-center justify-center rounded-[20px] text-sm font-semibold disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Crear ítem"}
        </button>
      </div>
    </form>
  );
}
