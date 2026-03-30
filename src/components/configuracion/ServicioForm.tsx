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
  const [motivo, setMotivo] = useState("");
  const precioNumero = Number(precioBase) || 0;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
          Identidad del servicio
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
                placeholder="Ej: Corte clasico"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
              />
              {state.fieldErrors?.nombre ? (
                <p className="text-xs text-red-500">{state.fieldErrors.nombre}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="precioBase" className="text-sm font-medium text-stone-700">
                Precio base <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
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
                  className="min-h-[48px] w-full rounded-xl border border-stone-300 px-4 pl-8 text-sm text-stone-900 outline-none focus:border-stone-900"
                />
              </div>
              {state.fieldErrors?.precioBase ? (
                <p className="text-xs text-red-500">{state.fieldErrors.precioBase}</p>
              ) : null}
            </div>

            {showMotivoField ? (
              <div className="flex flex-col gap-2">
                <label htmlFor="motivoCambioPrecio" className="text-sm font-medium text-stone-700">
                  Motivo del cambio <span className="text-xs text-stone-400">(opcional)</span>
                </label>
                <input
                  id="motivoCambioPrecio"
                  name="motivoCambioPrecio"
                  type="text"
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  placeholder="Ej: actualizacion general de precios"
                  className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-[24px] bg-stone-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-300">
              Preview
            </p>
            <div className="mt-4 rounded-[22px] bg-white/10 px-4 py-4">
              <p className="text-sm text-stone-300">Servicio</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {nombre.trim() || "Nombre pendiente"}
              </p>
              <p className="mt-4 text-sm text-stone-300">Precio visible en caja</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {formatARS(precioNumero)}
              </p>
              {showMotivoField && motivo.trim() ? (
                <p className="mt-4 text-sm text-stone-300">Motivo: {motivo}</p>
              ) : null}
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
