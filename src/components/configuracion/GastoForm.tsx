"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { GastoFormState } from "@/app/(admin)/configuracion/gastos-fijos/actions";

interface GastoFormProps {
  action: (
    prevState: GastoFormState,
    formData: FormData
  ) => Promise<GastoFormState>;
  categorias: Array<{ id: string; nombre: string | null }>;
  initialData?: {
    descripcion?: string | null;
    monto?: string | null;
    fecha?: string | null;
    categoriaId?: string | null;
    esRecurrente?: boolean | null;
    frecuencia?: string | null;
    notas?: string | null;
  };
  submitLabel?: string;
  cancelHref?: string;
}

const initialState: GastoFormState = {};

function formatARS(value: number) {
  if (!value) return "$ 0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function GastoForm({
  action,
  categorias,
  initialData,
  submitLabel = "Guardar",
  cancelHref = "/configuracion/gastos-fijos",
}: GastoFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [esRecurrente, setEsRecurrente] = useState(initialData?.esRecurrente ?? false);
  const [monto, setMonto] = useState(initialData?.monto ?? "");
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? "");
  const [notas, setNotas] = useState(initialData?.notas ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
          Gasto fijo
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="categoriaId" className="text-sm font-medium text-stone-700">
                Categoria <span className="text-xs text-stone-400">(opcional)</span>
              </label>
              <select
                id="categoriaId"
                name="categoriaId"
                defaultValue={initialData?.categoriaId ?? ""}
                className="min-h-[48px] rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
              >
                <option value="">Sin categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.categoriaId ? (
                <p className="text-xs text-red-500">{state.fieldErrors.categoriaId}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="descripcion" className="text-sm font-medium text-stone-700">
                Descripcion <span className="text-red-500">*</span>
              </label>
              <input
                id="descripcion"
                name="descripcion"
                type="text"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder="Ej: alquiler del local"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
              />
              {state.fieldErrors?.descripcion ? (
                <p className="text-xs text-red-500">{state.fieldErrors.descripcion}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="monto" className="text-sm font-medium text-stone-700">
                  Monto <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                    $
                  </span>
                  <input
                    id="monto"
                    name="monto"
                    type="number"
                    min="1"
                    step="1"
                    value={monto}
                    onChange={(event) => setMonto(event.target.value)}
                    placeholder="Ej: 150000"
                    className="min-h-[48px] w-full rounded-xl border border-stone-300 pl-8 pr-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                  />
                </div>
                {state.fieldErrors?.monto ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.monto}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="fecha" className="text-sm font-medium text-stone-700">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  id="fecha"
                  name="fecha"
                  type="date"
                  defaultValue={initialData?.fecha ?? ""}
                  className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                />
                {state.fieldErrors?.fecha ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.fecha}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[22px] bg-stone-50 p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="esRecurrente"
                  checked={esRecurrente}
                  onChange={(event) => setEsRecurrente(event.target.checked)}
                  className="h-5 w-5 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                />
                <span className="text-sm font-medium text-stone-700">Gasto recurrente</span>
              </label>

              {esRecurrente ? (
                <div className="mt-4 flex flex-col gap-2">
                  <label htmlFor="frecuencia" className="text-sm font-medium text-stone-700">
                    Frecuencia <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="frecuencia"
                    name="frecuencia"
                    defaultValue={initialData?.frecuencia ?? "mensual"}
                    className="min-h-[48px] rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                  >
                    <option value="mensual">Mensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="anual">Anual</option>
                    <option value="unica">Unica vez</option>
                  </select>
                  {state.fieldErrors?.frecuencia ? (
                    <p className="text-xs text-red-500">{state.fieldErrors.frecuencia}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="notas" className="text-sm font-medium text-stone-700">
                Notas <span className="text-xs text-stone-400">(opcional)</span>
              </label>
              <textarea
                id="notas"
                name="notas"
                rows={3}
                value={notas}
                onChange={(event) => setNotas(event.target.value)}
                placeholder="Informacion adicional, vencimiento o aclaraciones."
                className="rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-900 resize-none"
              />
            </div>
          </div>

          <div className="rounded-[24px] bg-stone-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-300">
              Resumen
            </p>
            <div className="mt-4 space-y-3">
              <SummaryRow label="Descripcion" value={descripcion.trim() || "Pendiente"} />
              <SummaryRow label="Monto" value={formatARS(Number(monto) || 0)} strong />
              <SummaryRow
                label="Modalidad"
                value={esRecurrente ? "Recurrente" : "Puntual"}
              />
              <SummaryRow
                label="Notas"
                value={notas.trim() ? "Con observaciones" : "Sin notas"}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-stone-100 px-5 text-sm font-medium text-stone-700 transition hover:bg-stone-200"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`rounded-[18px] px-4 py-3 ${strong ? "bg-white/12" : "bg-white/6"}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-stone-300">{label}</p>
      <p className={`mt-2 ${strong ? "text-xl font-semibold" : "text-base font-medium"} text-white`}>
        {value}
      </p>
    </div>
  );
}
