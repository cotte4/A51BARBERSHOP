"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { QuickStockAdjustState } from "@/app/(admin)/inventario/actions";

type InventoryQuickAdjustProps = {
  stock: number;
  decrementAction: (prevState: QuickStockAdjustState) => Promise<QuickStockAdjustState>;
  incrementAction: (prevState: QuickStockAdjustState) => Promise<QuickStockAdjustState>;
};

const initialState: QuickStockAdjustState = {};

export default function InventoryQuickAdjust({
  stock,
  decrementAction,
  incrementAction,
}: InventoryQuickAdjustProps) {
  const router = useRouter();
  const [minusState, minusFormAction, minusPending] = useActionState(decrementAction, initialState);
  const [plusState, plusFormAction, plusPending] = useActionState(incrementAction, initialState);
  const error = minusState.error ?? plusState.error;

  useEffect(() => {
    if (minusState.success || plusState.success) {
      router.refresh();
    }
  }, [minusState.success, plusState.success, router]);

  return (
    <div className="relative z-10 rounded-[22px] bg-stone-100 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Stock
          </p>
          <p className="mt-1 text-2xl font-bold text-stone-950">{stock}</p>
        </div>
        <div className="flex gap-2">
          <form action={minusFormAction}>
            <button
              type="submit"
              disabled={minusPending}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-200 bg-white text-xl font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
              aria-label="Bajar stock"
            >
              -
            </button>
          </form>
          <form action={plusFormAction}>
            <button
              type="submit"
              disabled={plusPending}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-xl font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
              aria-label="Subir stock"
            >
              +
            </button>
          </form>
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
