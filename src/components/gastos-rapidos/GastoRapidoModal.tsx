"use client";

import { useActionState, useState } from "react";
import CategoriaEmojiGrid from "@/components/gastos-rapidos/CategoriaEmojiGrid";
import type { GastoRapidoActionState } from "@/app/(admin)/gastos-rapidos/actions";

type GastoRapidoModalProps = {
  action: (
    prevState: GastoRapidoActionState,
    formData: FormData
  ) => Promise<GastoRapidoActionState>;
  onClose: () => void;
  returnTo: string;
};

const initialState: GastoRapidoActionState = {};

export default function GastoRapidoModal({
  action,
  onClose,
  returnTo,
}: GastoRapidoModalProps) {
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-zinc-800 bg-zinc-950 shadow-[0_-8px_60px_rgba(0,0,0,0.6)] sm:max-w-lg sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-zinc-700" />
        </div>

        {/* Close */}
        <div className="flex justify-end px-5 pt-3 pb-1">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            ✕ Cerrar
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Gasto rápido
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Registrar gasto del día</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Impacta al instante en Mi Resultado y en el P&amp;L.
          </p>

          <form action={formAction} className="mt-5 flex flex-col gap-5">
            <input type="hidden" name="categoriaVisual" value={selectedEmoji} />
            <input type="hidden" name="returnTo" value={returnTo} />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-400">
                Categoría <span className="text-red-400">*</span>
              </label>
              <CategoriaEmojiGrid selectedEmoji={selectedEmoji} onSelect={setSelectedEmoji} />
              {state.fieldErrors?.categoriaVisual ? (
                <p className="text-xs text-red-400">{state.fieldErrors.categoriaVisual}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="monto" className="text-sm font-medium text-zinc-400">
                Monto <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
                <input
                  id="monto"
                  name="monto"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ej: 12000"
                  className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-900 pl-8 pr-4 text-sm text-white placeholder-zinc-600 focus:border-[#8cff59] focus:outline-none"
                />
              </div>
              {state.fieldErrors?.monto ? (
                <p className="text-xs text-red-400">{state.fieldErrors.monto}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="nota" className="text-sm font-medium text-zinc-400">
                Nota <span className="text-xs text-zinc-600">(opcional)</span>
              </label>
              <textarea
                id="nota"
                name="nota"
                rows={3}
                placeholder="Ej: 2 packs de cápsulas Nespresso"
                className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#8cff59] focus:outline-none"
              />
              {state.fieldErrors?.nota ? (
                <p className="text-xs text-red-400">{state.fieldErrors.nota}</p>
              ) : null}
            </div>

            {state.error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {state.error}
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="min-h-[48px] flex-1 rounded-2xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] hover:bg-[#a8ff80] disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Guardar gasto"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[48px] rounded-2xl border border-zinc-700 bg-zinc-900 px-5 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
