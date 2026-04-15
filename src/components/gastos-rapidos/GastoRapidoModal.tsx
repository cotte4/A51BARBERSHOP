"use client";

import { useActionState, useState } from "react";
import CategoriaEmojiGrid from "@/components/gastos-rapidos/CategoriaEmojiGrid";
import { getCategoriaGastoRapidoByEmoji } from "@/lib/gastos-rapidos";
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
  const selectedCategory = getCategoriaGastoRapidoByEmoji(selectedEmoji);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-zinc-800 bg-zinc-950 shadow-[0_-8px_60px_rgba(0,0,0,0.6)] sm:max-w-lg sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-12 rounded-full bg-zinc-700" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-white">Registrar gasto</p>
            {selectedCategory ? (
              <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-2.5 py-0.5 text-xs font-semibold text-[#b9ff96]">
                {selectedCategory.label}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[34px] items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            Cerrar
          </button>
        </div>

        {/* form */}
        <div className="overflow-y-auto px-5 pb-6 pt-2">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="categoriaVisual" value={selectedEmoji} />
            <input type="hidden" name="returnTo" value={returnTo} />

            {/* categoria */}
            <section className="rounded-[24px] border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Categoria
              </p>
              <CategoriaEmojiGrid selectedEmoji={selectedEmoji} onSelect={setSelectedEmoji} />
              {state.fieldErrors?.categoriaVisual ? (
                <p className="mt-2 text-xs text-red-300">{state.fieldErrors.categoriaVisual}</p>
              ) : null}
            </section>

            {/* monto */}
            <section className="rounded-[24px] border border-zinc-800 bg-zinc-900/60 p-4">
              <label htmlFor="monto" className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Monto
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
                  className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-800 pl-8 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-[#8cff59]/60"
                />
              </div>
              {state.fieldErrors?.monto ? (
                <p className="mt-2 text-xs text-red-300">{state.fieldErrors.monto}</p>
              ) : null}
            </section>

            {/* nota */}
            <section className="rounded-[24px] border border-zinc-800 bg-zinc-900/60 p-4">
              <label htmlFor="nota" className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Nota <span className="normal-case tracking-normal text-zinc-600">(opcional)</span>
              </label>
              <textarea
                id="nota"
                name="nota"
                rows={2}
                placeholder="Ej: 2 packs capsulas Nespresso"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-[#8cff59]/60"
              />
              {state.fieldErrors?.nota ? (
                <p className="mt-2 text-xs text-red-300">{state.fieldErrors.nota}</p>
              ) : null}
            </section>

            {state.error ? (
              <div className="rounded-[20px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {state.error}
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="neon-button inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
