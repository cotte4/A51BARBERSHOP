"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { GastoFormState } from "@/app/(admin)/configuracion/gastos-fijos/actions";
import { formatARS } from "@/lib/format";

interface GastoFormProps {
  action: (prevState: GastoFormState, formData: FormData) => Promise<GastoFormState>;
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
    <div
      className={`rounded-[18px] px-4 py-3 ${
        strong ? "bg-white/12" : "bg-white/6"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className={`mt-2 ${strong ? "text-xl font-semibold" : "text-base font-medium"} text-white`}>
        {value}
      </p>
    </div>
  );
}

export default function GastoForm({
  action,
  categorias,
  initialData,
  submitLabel = "Guardar",
  cancelHref = "/configuracion/gastos-fijos",
}: GastoFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [categoriaId, setCategoriaId] = useState(initialData?.categoriaId ?? "");
  const [esRecurrente, setEsRecurrente] = useState(initialData?.esRecurrente ?? false);
  const [frecuencia, setFrecuencia] = useState(initialData?.frecuencia ?? "mensual");
  const [monto, setMonto] = useState(initialData?.monto ?? "");
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? "");
  const [notas, setNotas] = useState(initialData?.notas ?? "");
  const modalidad = esRecurrente ? "Recurrente" : "Puntual";
  const categoriaNombre = categorias.find((categoria) => categoria.id === categoriaId)?.nombre;
  const frecuenciaTexto = esRecurrente ? frecuencia : "No aplica";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      <section className="panel-card rounded-[28px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Gasto fijo
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              La combinacion de fecha, categoria y recurrencia define como entra en cierres y
              seguimiento mensual.
            </p>
          </div>
          <div className="rounded-[20px] bg-zinc-900 px-4 py-3 text-sm text-zinc-300 ring-1 ring-zinc-700">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Lectura rapida</p>
            <p className="mt-2">{modalidad}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="categoriaId" className="text-sm font-medium text-zinc-300">
                Categoria <span className="text-xs text-zinc-400">(opcional)</span>
              </label>
              <select
                id="categoriaId"
                name="categoriaId"
                value={categoriaId}
                onChange={(event) => setCategoriaId(event.target.value)}
                className="min-h-[48px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none"
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
              <label htmlFor="descripcion" className="text-sm font-medium text-zinc-300">
                Descripcion <span className="text-red-500">*</span>
              </label>
              <input
                id="descripcion"
                name="descripcion"
                type="text"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder="Ej: alquiler del local"
                inputMode="text"
                className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              {state.fieldErrors?.descripcion ? (
                <p className="text-xs text-red-500">{state.fieldErrors.descripcion}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="monto" className="text-sm font-medium text-zinc-300">
                  Monto <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
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
                    inputMode="numeric"
                    className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-8 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
                  />
                </div>
                {state.fieldErrors?.monto ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.monto}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="fecha" className="text-sm font-medium text-zinc-300">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  id="fecha"
                  name="fecha"
                  type="date"
                  defaultValue={initialData?.fecha ?? ""}
                  className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none"
                />
                {state.fieldErrors?.fecha ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.fecha}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[22px] bg-zinc-800 p-4 ring-1 ring-zinc-700">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="esRecurrente"
                  checked={esRecurrente}
                  onChange={(event) => setEsRecurrente(event.target.checked)}
                  className="h-5 w-5 rounded border-zinc-700 text-[#8cff59] focus:border-[#8cff59]/60 focus:outline-none"
                />
                <span className="text-sm font-medium text-zinc-300">Gasto recurrente</span>
              </label>
              <p className="mt-2 text-xs text-zinc-500">
                Activarlo si entra todos los meses o con una frecuencia repetible.
              </p>

              {esRecurrente ? (
                <div className="mt-4 flex flex-col gap-2">
                  <label htmlFor="frecuencia" className="text-sm font-medium text-zinc-300">
                    Frecuencia <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="frecuencia"
                    name="frecuencia"
                    value={frecuencia}
                    onChange={(event) => setFrecuencia(event.target.value)}
                    className="min-h-[48px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none"
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
              <label htmlFor="notas" className="text-sm font-medium text-zinc-300">
                Notas <span className="text-xs text-zinc-400">(opcional)</span>
              </label>
              <textarea
                id="notas"
                name="notas"
                rows={3}
                value={notas}
                onChange={(event) => setNotas(event.target.value)}
                placeholder="Informacion adicional, vencimiento o aclaraciones."
                className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-[24px] bg-zinc-900 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Impacto
            </p>
            <div className="mt-4 space-y-3">
              <SummaryRow label="Descripcion" value={descripcion.trim() || "Pendiente"} />
              <SummaryRow label="Monto" value={formatARS(Number(monto) || 0)} strong />
              <SummaryRow label="Modalidad" value={modalidad} />
              <SummaryRow label="Frecuencia" value={frecuenciaTexto} />
              <SummaryRow
                label="Categoria"
                value={categoriaNombre ?? "Sin categoria"}
              />
              <SummaryRow label="Notas" value={notas.trim() ? "Con observaciones" : "Sin notas"} />
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="neon-button inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition disabled:opacity-50"
        >
          {isPending ? "Guardando..." : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-zinc-800 px-5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
