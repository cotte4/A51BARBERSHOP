"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { TemporadaFormState } from "@/app/(admin)/configuracion/temporadas/actions";
import { formatARS } from "@/lib/format";

interface TemporadaFormProps {
  action: (
    prevState: TemporadaFormState,
    formData: FormData
  ) => Promise<TemporadaFormState>;
  initialData?: {
    nombre?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    cortesDiaProyectados?: number | null;
    precioBaseProyectado?: string | null;
  };
  submitLabel?: string;
  cancelHref?: string;
}

const initialState: TemporadaFormState = {};

function formatRange(fechaInicio: string, fechaFin: string) {
  if (!fechaInicio && !fechaFin) return "Sin rango";
  if (fechaInicio && !fechaFin) return `${fechaInicio} -> abierto`;
  if (!fechaInicio && fechaFin) return `Hasta ${fechaFin}`;
  return `${fechaInicio} -> ${fechaFin}`;
}

export default function TemporadaForm({
  action,
  initialData,
  submitLabel = "Guardar",
  cancelHref = "/configuracion/temporadas",
}: TemporadaFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [nombre, setNombre] = useState(initialData?.nombre ?? "");
  const [fechaInicio, setFechaInicio] = useState(initialData?.fechaInicio ?? "");
  const [fechaFin, setFechaFin] = useState(initialData?.fechaFin ?? "");
  const [cortesDiaProyectados, setCortesDiaProyectados] = useState(
    initialData?.cortesDiaProyectados !== null && initialData?.cortesDiaProyectados !== undefined
      ? String(initialData.cortesDiaProyectados)
      : ""
  );
  const [precioBaseProyectado, setPrecioBaseProyectado] = useState(
    initialData?.precioBaseProyectado ?? ""
  );

  const cortesNumero = Number(cortesDiaProyectados) || 0;
  const precioNumero = Number(precioBaseProyectado) || 0;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel-card rounded-[28px] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Periodo proyectado
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Esta pantalla no solo guarda fechas: arma una referencia para leer ritmo, precio y
            ventana de trabajo. Dejalo limpio y fácil de releer dentro de unos meses.
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="nombre" className="text-sm font-medium text-zinc-300">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ej: Alta temporada verano 2026"
                className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              {state.fieldErrors?.nombre ? (
                <p className="text-xs text-red-500">{state.fieldErrors.nombre}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="fechaInicio" className="text-sm font-medium text-zinc-300">
                  Fecha de inicio <span className="text-red-500">*</span>
                </label>
                <input
                  id="fechaInicio"
                  name="fechaInicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(event) => setFechaInicio(event.target.value)}
                  className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none"
                />
                {state.fieldErrors?.fechaInicio ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.fechaInicio}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="fechaFin" className="text-sm font-medium text-zinc-300">
                  Fecha de fin <span className="text-xs text-zinc-400">(opcional)</span>
                </label>
                <input
                  id="fechaFin"
                  name="fechaFin"
                  type="date"
                  value={fechaFin}
                  onChange={(event) => setFechaFin(event.target.value)}
                  className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none"
                />
                {state.fieldErrors?.fechaFin ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.fechaFin}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="cortesDiaProyectados" className="text-sm font-medium text-zinc-300">
                  Cortes por dia <span className="text-xs text-zinc-400">(opcional)</span>
                </label>
                <input
                  id="cortesDiaProyectados"
                  name="cortesDiaProyectados"
                  type="number"
                  min="0"
                  step="1"
                  value={cortesDiaProyectados}
                  onChange={(event) => setCortesDiaProyectados(event.target.value)}
                  placeholder="Ej: 12"
                  className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="precioBaseProyectado" className="text-sm font-medium text-zinc-300">
                  Precio base proyectado <span className="text-xs text-zinc-400">(opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    $
                  </span>
                  <input
                    id="precioBaseProyectado"
                    name="precioBaseProyectado"
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioBaseProyectado}
                    onChange={(event) => setPrecioBaseProyectado(event.target.value)}
                    placeholder="Ej: 5000"
                    className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-8 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="panel-card rounded-[28px] p-5 sm:p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Lectura rapida
          </p>
          <div className="mt-4 space-y-3">
            <PreviewRow label="Temporada" value={nombre.trim() || "Pendiente"} strong />
            <PreviewRow
              label="Ventana"
              value={formatRange(fechaInicio || "Sin inicio", fechaFin || "abierta")}
            />
            <PreviewRow
              label="Ritmo proyectado"
              value={cortesDiaProyectados ? `${cortesNumero} cortes/dia` : "Sin proyeccion"}
            />
            <PreviewRow
              label="Precio estimado"
              value={precioBaseProyectado ? formatARS(precioNumero) : "Sin precio estimado"}
            />
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

function PreviewRow({
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
      className={`rounded-[18px] px-4 py-3 ring-1 ${
        strong ? "bg-[#8cff59]/10 ring-[#8cff59]/20" : "bg-white/5 ring-white/10"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className={`mt-2 ${strong ? "text-xl font-semibold text-[#8cff59]" : "text-base font-medium text-white"}`}>
        {value}
      </p>
    </div>
  );
}
