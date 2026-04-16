"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import GastoRapidoList from "@/components/gastos-rapidos/GastoRapidoList";
import { formatARS } from "@/lib/format";
import { getCategoriaGastoRapidoByEmoji } from "@/lib/gastos-rapidos";

type Gasto = {
  id: string;
  descripcion: string | null;
  monto: string | null;
  fecha: string | null;
  categoriaVisual: string | null;
  notas: string | null;
};

type GastosHistorialModalProps = {
  gastos: Gasto[];
  total: number;
};

function getTopCategory(gastos: Gasto[]) {
  const counts = new Map<string, number>();

  for (const gasto of gastos) {
    const categoria = getCategoriaGastoRapidoByEmoji(gasto.categoriaVisual ?? "");
    const label = categoria?.label ?? gasto.descripcion ?? "Otros";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "Sin categoria";
}

export default function GastosHistorialModal({ gastos, total }: GastosHistorialModalProps) {
  const [open, setOpen] = useState(false);
  const totalCount = gastos.length;
  const promedio = totalCount > 0 ? total / totalCount : 0;
  const topCategoria = totalCount > 0 ? getTopCategory(gastos) : "Sin categoria";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[52px] items-center gap-3 rounded-[20px] border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-200 transition hover:border-[#8cff59]/25 hover:bg-zinc-800 hover:text-white"
      >
        <span>Ver historial de gastos</span>
        <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-zinc-300">
          {totalCount}
        </span>
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="mb-5">
            <p className="eyebrow text-xs font-semibold">Gastos rapidos</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">Historial del mes</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Aqui ves el detalle sin perder la lectura general: cuantos movimientos hubo, cuanto suman y
              que categoria peso mas.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Movimientos</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{totalCount}</p>
                <p className="mt-1 text-xs text-zinc-500">Gastos cargados este mes</p>
              </div>
              <div className="rounded-[22px] border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-red-200/70">Total egresos</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-red-200">{formatARS(total)}</p>
                <p className="mt-1 text-xs text-red-200/70">Se descuenta del resultado mes</p>
              </div>
              <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Promedio</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{formatARS(promedio)}</p>
                <p className="mt-1 text-xs text-zinc-500">Por gasto registrado</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-300">
                Categoria mas repetida: {topCategoria}
              </div>
              <div className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-xs font-medium text-[#b9ff96]">
                Contexto unido con /mi-resultado
              </div>
            </div>
          </div>
          <GastoRapidoList gastos={gastos} returnTo="/mi-resultado" />
        </Modal>
      )}
    </>
  );
}
