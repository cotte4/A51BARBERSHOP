"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { QuickStockAdjustState } from "@/app/(admin)/inventario/actions";

type InventoryQuickAdjustProps = {
  stock: number;
  stockMinimo?: number | null;
  decrementAction: (prevState: QuickStockAdjustState) => Promise<QuickStockAdjustState>;
  incrementAction: (prevState: QuickStockAdjustState) => Promise<QuickStockAdjustState>;
};

const initialState: QuickStockAdjustState = {};

function getStockState(stock: number, stockMinimo?: number | null) {
  const minimo = stockMinimo ?? 5;
  if (stock <= 0) {
    return {
      label: "Sin stock",
      tone: "border-red-500/30 bg-red-500/12 text-red-200",
      hint: "No queda inventario disponible.",
    };
  }

  if (stock <= minimo) {
    return {
      label: "Bajo minimo",
      tone: "border-amber-500/30 bg-amber-500/12 text-amber-200",
      hint: "Conviene reponer pronto.",
    };
  }

  return {
    label: "Saludable",
    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    hint: "Todavia tiene margen operativo.",
  };
}

export default function InventoryQuickAdjust({
  stock,
  stockMinimo,
  decrementAction,
  incrementAction,
}: InventoryQuickAdjustProps) {
  const router = useRouter();
  const [minusState, minusFormAction, minusPending] = useActionState(decrementAction, initialState);
  const [plusState, plusFormAction, plusPending] = useActionState(incrementAction, initialState);
  const error = minusState.error ?? plusState.error;
  const stockState = getStockState(stock, stockMinimo);
  const busy = minusPending || plusPending;

  useEffect(() => {
    if (minusState.success || plusState.success) {
      router.refresh();
    }
  }, [minusState.success, plusState.success, router]);

  return (
    <div className="relative z-10 rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-[11px] font-semibold">Ajuste tactil</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Stock actual {stock}</h3>
          <p className="mt-1 text-sm text-zinc-400">{stockState.hint}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${stockState.tone}`}>
          {stockState.label}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Lectura rapida</p>
          <p className="mt-2 text-sm text-zinc-300">
            {stockMinimo !== null && stockMinimo !== undefined
              ? `Minimo sugerido: ${stockMinimo}`
              : "Sin minimo configurado"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Ajuste rapido para mover stock sin salir de la tarjeta.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <form action={minusFormAction}>
            <button
              type="submit"
              disabled={busy || stock <= 0}
              className="inline-flex h-14 w-full min-w-[84px] flex-col items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Bajar stock"
              title="Bajar stock"
            >
              <span className="text-lg leading-none">-1</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Bajar</span>
            </button>
          </form>
          <form action={plusFormAction}>
            <button
              type="submit"
              disabled={busy}
              className="neon-button inline-flex h-14 w-full min-w-[84px] flex-col items-center justify-center rounded-2xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Subir stock"
              title="Subir stock"
            >
              <span className="text-lg leading-none">+1</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#07130a]/80">Subir</span>
            </button>
          </form>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
