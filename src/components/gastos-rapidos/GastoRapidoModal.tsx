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
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 sm:items-center sm:justify-center">
      <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
              Gasto rapido
            </p>
            <h2 className="mt-2 text-xl font-bold text-gray-900">Registrar gasto del dia</h2>
            <p className="mt-1 text-sm text-gray-500">
              Impacta al instante en Mi Resultado y en el P&amp;L.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full px-3 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            Cerrar
          </button>
        </div>

        <form action={formAction} className="mt-5 flex flex-col gap-5">
          <input type="hidden" name="categoriaVisual" value={selectedEmoji} />
          <input type="hidden" name="returnTo" value={returnTo} />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Categoria <span className="text-red-500">*</span>
            </label>
            <CategoriaEmojiGrid selectedEmoji={selectedEmoji} onSelect={setSelectedEmoji} />
            {state.fieldErrors?.categoriaVisual ? (
              <p className="text-xs text-red-500">{state.fieldErrors.categoriaVisual}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="monto" className="text-sm font-medium text-gray-700">
              Monto <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                $
              </span>
              <input
                id="monto"
                name="monto"
                type="number"
                min="1"
                step="1"
                placeholder="Ej: 12000"
                className="min-h-[48px] w-full rounded-2xl border border-gray-300 pl-8 pr-4 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>
            {state.fieldErrors?.monto ? (
              <p className="text-xs text-red-500">{state.fieldErrors.monto}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="nota" className="text-sm font-medium text-gray-700">
              Nota <span className="text-gray-400 text-xs">(opcional)</span>
            </label>
            <textarea
              id="nota"
              name="nota"
              rows={3}
              placeholder="Ej: 2 packs de capsulas Nespresso"
              className="rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
            {state.fieldErrors?.nota ? (
              <p className="text-xs text-red-500">{state.fieldErrors.nota}</p>
            ) : null}
          </div>

          {state.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          ) : null}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="min-h-[48px] flex-1 rounded-2xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar gasto"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-2xl bg-gray-100 px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
