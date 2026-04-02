"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import GastoRapidoList from "@/components/gastos-rapidos/GastoRapidoList";

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

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function GastosHistorialModal({ gastos, total }: GastosHistorialModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[40px] items-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
      >
        Ver historial de gastos
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Gastos rápidos</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">Historial del mes</h2>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-zinc-500">{gastos.length} gasto{gastos.length !== 1 ? "s" : ""} este mes</p>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-zinc-600">Total egresos</p>
                <p className="text-xl font-bold text-red-400">{formatARS(total)}</p>
              </div>
            </div>
          </div>
          <GastoRapidoList gastos={gastos} returnTo="/mi-resultado" />
        </Modal>
      )}
    </>
  );
}
