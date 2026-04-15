"use client";

import { useActionState } from "react";
import { guardarValoresMes, type ValoresMesFormState } from "../../../actions";
import Link from "next/link";

type Costo = {
  id: string;
  nombre: string;
  categoria: string;
};

type ValorExistente = {
  costoId: string;
  monto: string | null;
};

const initialState: ValoresMesFormState = {};

function categoriaLabel(cat: string) {
  const map: Record<string, string> = {
    alquiler: "Alquiler",
    servicios: "Servicios",
    insumos: "Insumos",
    sueldos: "Sueldos",
    marketing: "Marketing",
    otro: "Otro",
  };
  return map[cat] ?? cat;
}

export default function EditarMesForm({
  mes,
  mesLabel,
  costos,
  valoresExistentes,
}: {
  mes: string;
  mesLabel: string;
  costos: Costo[];
  valoresExistentes: ValorExistente[];
}) {
  const guardarConMes = guardarValoresMes.bind(null, mes);
  const [state, formAction, pending] = useActionState(guardarConMes, initialState);

  const valoresMap = new Map(valoresExistentes.map((v) => [v.costoId, v.monto ?? ""]));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="rounded-2xl border border-[#8cff59]/25 bg-[#8cff59]/10 px-4 py-3 text-sm text-[#8cff59]">
          Valores guardados correctamente.
        </div>
      )}

      {costos.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-6 text-center">
          <p className="text-sm text-zinc-500">No hay ítems de costo configurados todavía.</p>
          <Link href="/finanzas/nuevo" className="mt-3 inline-flex min-h-[44px] items-center rounded-2xl bg-zinc-800 px-4 text-sm font-medium text-white hover:bg-zinc-700">
            Agregar ítem
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-zinc-800">
          {/* Header */}
          <div className="grid grid-cols-[1fr_160px] gap-3 border-b border-zinc-800 bg-zinc-900/60 px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Costo</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Monto (ARS)</p>
          </div>

          {/* Filas */}
          <div className="divide-y divide-zinc-800/60">
            {costos.map((costo) => (
              <div key={costo.id} className="grid grid-cols-[1fr_160px] items-center gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{costo.nombre}</p>
                  <p className="text-[11px] text-zinc-500">{categoriaLabel(costo.categoria)}</p>
                </div>
                <input
                  name={`monto_${costo.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={valoresMap.get(costo.id) ?? ""}
                  placeholder="0"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-right text-sm font-semibold text-white placeholder:text-zinc-600 focus:border-[#8cff59]/60 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Dejá un campo vacío para eliminar el valor de ese ítem en {mesLabel}. Los cambios no afectan otros meses.
      </p>

      <div className="flex gap-3 pt-1">
        <Link
          href="/finanzas"
          className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-[20px] border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending || costos.length === 0}
          className="neon-button inline-flex min-h-[52px] flex-1 items-center justify-center rounded-[20px] text-sm font-semibold disabled:opacity-60"
        >
          {pending ? "Guardando..." : `Guardar ${mesLabel}`}
        </button>
      </div>
    </form>
  );
}
