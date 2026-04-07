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

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{helper}</p>
    </div>
  );
}

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
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-zinc-800 bg-zinc-950 shadow-[0_-8px_60px_rgba(0,0,0,0.6)] sm:max-w-2xl sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-12 rounded-full bg-zinc-700" />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
              Gasto rapido
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Impacta en Mi Resultado y en P&amp;L apenas lo guardas.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[38px] items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3.5 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Cerrar
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
            <div className="space-y-4">
              <div className="rounded-[28px] border border-[#8cff59]/15 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.12),_transparent_34%),linear-gradient(180deg,_rgba(24,24,27,0.94),_rgba(9,9,11,0.98))] p-5">
                <p className="eyebrow text-xs font-semibold">Carga guiada</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Registrar gasto del dia</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
                  Elegi categoria, monto y una nota corta para que el movimiento quede limpio en
                  reportes y sea facil de revisar despues.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <SummaryCard
                    label="Categoria"
                    value={selectedCategory?.label ?? "Pendiente"}
                    helper="Elegi una sola categoria para leer rapido."
                  />
                  <SummaryCard
                    label="Monto"
                    value="Pendiente"
                    helper="Se completa al escribir el importe."
                  />
                  <SummaryCard
                    label="Retorno"
                    value="Automatico"
                    helper="Volveras al mismo filtro al guardar."
                  />
                </div>
              </div>

              <form action={formAction} className="space-y-4">
                <input type="hidden" name="categoriaVisual" value={selectedEmoji} />
                <input type="hidden" name="returnTo" value={returnTo} />

                <section className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                        Categoria
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-white">Que categoria tuvo</h3>
                      <p className="mt-1 text-sm leading-6 text-zinc-400">
                        Esto ordena el historial y mejora la lectura del mes.
                      </p>
                    </div>
                    {selectedCategory ? (
                      <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#b9ff96]">
                        {selectedCategory.label}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    <CategoriaEmojiGrid selectedEmoji={selectedEmoji} onSelect={setSelectedEmoji} />
                  </div>
                  {state.fieldErrors?.categoriaVisual ? (
                    <p className="mt-3 text-xs text-red-300">{state.fieldErrors.categoriaVisual}</p>
                  ) : null}
                </section>

                <div className="grid gap-4 md:grid-cols-2">
                  <section className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-5">
                    <label htmlFor="monto" className="block text-sm font-medium text-zinc-200">
                      Monto
                    </label>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Cargá el valor exacto para no mezclarlo con reportes ni caja.
                    </p>
                    <div className="relative mt-4">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                        $
                      </span>
                      <input
                        id="monto"
                        name="monto"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Ej: 12000"
                        className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-900 pl-8 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-[#8cff59]/60"
                      />
                    </div>
                    {state.fieldErrors?.monto ? (
                      <p className="mt-3 text-xs text-red-300">{state.fieldErrors.monto}</p>
                    ) : null}
                  </section>

                  <section className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-5">
                    <label htmlFor="nota" className="block text-sm font-medium text-zinc-200">
                      Nota
                    </label>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Opcional, pero muy util cuando compras algo repetido o poco obvio.
                    </p>
                    <textarea
                      id="nota"
                      name="nota"
                      rows={4}
                      placeholder="Ej: 2 packs de capsulas Nespresso"
                      className="mt-4 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-[#8cff59]/60"
                    />
                    {state.fieldErrors?.nota ? (
                      <p className="mt-3 text-xs text-red-300">{state.fieldErrors.nota}</p>
                    ) : null}
                  </section>
                </div>

                {state.error ? (
                  <div className="rounded-[24px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {state.error}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="neon-button inline-flex min-h-[48px] items-center justify-center rounded-2xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? "Guardando..." : "Guardar gasto rapido"}
                  </button>
                </div>
              </form>
            </div>

            <aside className="space-y-4">
              <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
                <p className="eyebrow text-xs font-semibold">Lectura rapida</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Como queda registrado</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                  <li>La categoria impacta reportes y resumenes del mes.</li>
                  <li>El monto entra directo en el total de egresos.</li>
                  <li>La nota ayuda a explicar consumos repetidos.</li>
                </ul>
              </section>

              <section className="rounded-[28px] border border-[#8cff59]/20 bg-[#8cff59]/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8cff59]">
                  Estado
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">Volveras al mismo lugar</h3>
                <p className="mt-1 text-sm leading-6 text-zinc-200">
                  Cuando guardes, la pagina vuelve a {returnTo.startsWith("/") ? returnTo : "/gastos-rapidos"} para seguir con el mismo filtro.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
