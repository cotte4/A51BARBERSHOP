"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { TemporadaFormState } from "@/app/(admin)/configuracion/temporadas/actions";

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

function formatARS(value: number) {
  if (!value) return "$ 0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
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

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
          Periodo proyectado
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="nombre" className="text-sm font-medium text-stone-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ej: Alta temporada verano 2026"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
              />
              {state.fieldErrors?.nombre ? (
                <p className="text-xs text-red-500">{state.fieldErrors.nombre}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="fechaInicio" className="text-sm font-medium text-stone-700">
                  Fecha de inicio <span className="text-red-500">*</span>
                </label>
                <input
                  id="fechaInicio"
                  name="fechaInicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(event) => setFechaInicio(event.target.value)}
                  className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                />
                {state.fieldErrors?.fechaInicio ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.fechaInicio}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="fechaFin" className="text-sm font-medium text-stone-700">
                  Fecha de fin <span className="text-xs text-stone-400">(opcional)</span>
                </label>
                <input
                  id="fechaFin"
                  name="fechaFin"
                  type="date"
                  value={fechaFin}
                  onChange={(event) => setFechaFin(event.target.value)}
                  className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                />
                {state.fieldErrors?.fechaFin ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.fechaFin}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="cortesDiaProyectados" className="text-sm font-medium text-stone-700">
                  Cortes por dia <span className="text-xs text-stone-400">(opcional)</span>
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
                  className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="precioBaseProyectado" className="text-sm font-medium text-stone-700">
                  Precio base proyectado <span className="text-xs text-stone-400">(opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
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
                    className="min-h-[48px] w-full rounded-xl border border-stone-300 pl-8 pr-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-stone-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              Lectura rapida
            </p>
            <div className="mt-4 space-y-3">
              <SeasonStat label="Temporada" value={nombre.trim() || "Pendiente"} />
              <SeasonStat
                label="Ritmo proyectado"
                value={cortesDiaProyectados ? `${cortesDiaProyectados} cortes/dia` : "Sin proyeccion"}
              />
              <SeasonStat
                label="Precio estimado"
                value={precioBaseProyectado ? formatARS(Number(precioBaseProyectado)) : "Sin precio estimado"}
                strong={Boolean(precioBaseProyectado)}
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

function SeasonStat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`rounded-[18px] px-4 py-3 ${strong ? "bg-stone-900 text-white" : "bg-white ring-1 ring-stone-200"}`}>
      <p className={`text-xs uppercase tracking-[0.16em] ${strong ? "text-stone-300" : "text-stone-400"}`}>
        {label}
      </p>
      <p className={`mt-2 font-medium ${strong ? "text-white" : "text-stone-900"}`}>{value}</p>
    </div>
  );
}
