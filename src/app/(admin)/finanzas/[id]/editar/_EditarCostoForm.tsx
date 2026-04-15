"use client";

import { useActionState } from "react";
import { editarCosto, type CostoFormState } from "../../actions";
import Link from "next/link";

const CATEGORIAS = [
  { value: "alquiler", label: "Alquiler" },
  { value: "servicios", label: "Servicios (luz, agua, internet)" },
  { value: "insumos", label: "Insumos" },
  { value: "sueldos", label: "Sueldos" },
  { value: "marketing", label: "Marketing" },
  { value: "otro", label: "Otro" },
];

type CostoData = {
  id: string;
  nombre: string;
  categoria: string;
  notas: string | null;
};

const initialState: CostoFormState = {};

export default function EditarCostoForm({ costo }: { costo: CostoData }) {
  const editarCostoConId = editarCosto.bind(null, costo.id);
  const [state, formAction, pending] = useActionState(editarCostoConId, initialState);

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
          defaultValue={costo.nombre}
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
          defaultValue={costo.categoria}
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
          Notas <span className="text-zinc-500">(opcional)</span>
        </label>
        <textarea
          name="notas"
          defaultValue={costo.notas ?? ""}
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
          {pending ? "Guardando..." : "Actualizar ítem"}
        </button>
      </div>
    </form>
  );
}
