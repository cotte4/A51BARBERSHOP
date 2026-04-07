"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ServicioFormState } from "@/app/(admin)/configuracion/servicios/actions";

interface ServicioFormProps {
  action: (
    prevState: ServicioFormState,
    formData: FormData
  ) => Promise<ServicioFormState>;
  initialData?: {
    nombre?: string;
    precioBase?: string | null;
    duracionMinutos?: number | null;
  };
  submitLabel?: string;
  cancelHref?: string;
  showMotivoField?: boolean;
}

const initialState: ServicioFormState = {};

function formatARS(value: number) {
  if (!value) return "$ 0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function ServicioForm({
  action,
  initialData,
  submitLabel = "Guardar",
  cancelHref = "/configuracion/servicios",
  showMotivoField = false,
}: ServicioFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [nombre, setNombre] = useState(initialData?.nombre ?? "");
  const [precioBase, setPrecioBase] = useState(initialData?.precioBase ?? "");
  const [duracionMinutos, setDuracionMinutos] = useState(
    String(initialData?.duracionMinutos ?? 60)
  );
  const [motivo, setMotivo] = useState("");
  const precioNumero = Number(precioBase) || 0;

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
            Identidad del servicio
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Este bloque define lo que va a ver caja y lo que se va a liquidar después. Mantenelo
            corto, claro y consistente para que la operación no tenga que adivinar.
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
                placeholder="Ej: Corte clasico"
                className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              {state.fieldErrors?.nombre ? (
                <p className="text-xs text-red-500">{state.fieldErrors.nombre}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="precioBase" className="text-sm font-medium text-zinc-300">
                Precio base <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                  $
                </span>
                <input
                  id="precioBase"
                  name="precioBase"
                  type="number"
                  min="1"
                  step="1"
                  value={precioBase}
                  onChange={(event) => setPrecioBase(event.target.value)}
                  placeholder="Ej: 5000"
                  className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 pl-8 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
                />
              </div>
              {state.fieldErrors?.precioBase ? (
                <p className="text-xs text-red-500">{state.fieldErrors.precioBase}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="duracionMinutos" className="text-sm font-medium text-zinc-300">
                Duracion <span className="text-red-500">*</span>
              </label>
              <select
                id="duracionMinutos"
                name="duracionMinutos"
                value={duracionMinutos}
                onChange={(event) => setDuracionMinutos(event.target.value)}
                className="min-h-[48px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none"
              >
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </select>
              {state.fieldErrors?.duracionMinutos ? (
                <p className="text-xs text-red-500">{state.fieldErrors.duracionMinutos}</p>
              ) : null}
            </div>

            {showMotivoField ? (
              <div className="rounded-[24px] bg-zinc-950/80 p-4 ring-1 ring-zinc-800">
                <div className="flex flex-col gap-2">
                  <label htmlFor="motivoCambioPrecio" className="text-sm font-medium text-zinc-300">
                    Motivo del cambio <span className="text-xs text-zinc-400">(opcional)</span>
                  </label>
                  <input
                    id="motivoCambioPrecio"
                    name="motivoCambioPrecio"
                    type="text"
                    value={motivo}
                    onChange={(event) => setMotivo(event.target.value)}
                    placeholder="Ej: actualizacion general de precios"
                    className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Este texto queda como respaldo en el historial cuando cambia el precio.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="panel-card rounded-[28px] p-5 sm:p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Lectura rapida
          </p>
          <div className="mt-4 space-y-3">
            <PreviewRow label="Servicio" value={nombre.trim() || "Nombre pendiente"} strong />
            <PreviewRow label="Precio visible en caja" value={formatARS(precioNumero)} strong />
            <PreviewRow label="Duracion" value={`${duracionMinutos} min`} />
            <PreviewRow label="Impacto" value="Se usa en caja, turnos y liquidaciones" />
            {showMotivoField ? (
              <PreviewRow
                label="Historial"
                value={motivo.trim() ? "Con motivo listo" : "Queda registro al guardar"}
              />
            ) : (
              <PreviewRow label="Historial" value="Precio inicial sin cambios previos" />
            )}
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
      <p
        className={`mt-2 ${
          strong ? "text-xl font-semibold text-[#8cff59]" : "text-base font-medium text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
