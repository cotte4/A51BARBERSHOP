"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { MedioPagoFormState } from "@/app/(admin)/configuracion/medios-de-pago/actions";

interface MedioPagoFormProps {
  action: (
    prevState: MedioPagoFormState,
    formData: FormData
  ) => Promise<MedioPagoFormState>;
  initialData?: {
    nombre?: string | null;
    comisionPorcentaje?: string | null;
  };
  submitLabel?: string;
  cancelHref?: string;
}

const initialState: MedioPagoFormState = {};

export default function MedioPagoForm({
  action,
  initialData,
  submitLabel = "Guardar",
  cancelHref = "/configuracion/medios-de-pago",
}: MedioPagoFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [nombre, setNombre] = useState(initialData?.nombre ?? "");
  const [comisionPorcentaje, setComisionPorcentaje] = useState(
    initialData?.comisionPorcentaje ?? "0"
  );
  const comisionNumero = Number(comisionPorcentaje) || 0;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
          Configuracion del medio
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
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
                placeholder="Ej: Mercado Pago QR"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
              />
              {state.fieldErrors?.nombre ? (
                <p className="text-xs text-red-500">{state.fieldErrors.nombre}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="comisionPorcentaje" className="text-sm font-medium text-stone-700">
                Comision <span className="text-xs text-stone-400">(0 si no aplica)</span>
              </label>
              <div className="relative">
                <input
                  id="comisionPorcentaje"
                  name="comisionPorcentaje"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={comisionPorcentaje}
                  onChange={(event) => setComisionPorcentaje(event.target.value)}
                  placeholder="Ej: 6"
                  className="min-h-[48px] w-full rounded-xl border border-stone-300 px-4 pr-10 text-sm text-stone-900 outline-none focus:border-stone-900"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                  %
                </span>
              </div>
              {state.fieldErrors?.comisionPorcentaje ? (
                <p className="text-xs text-red-500">{state.fieldErrors.comisionPorcentaje}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[24px] bg-stone-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              Impacto en caja
            </p>
            <div className="mt-4 space-y-3">
              <PreviewPill label="Medio" value={nombre.trim() || "Pendiente"} />
              <PreviewPill
                label="Comision"
                value={comisionNumero > 0 ? `${comisionNumero}%` : "Sin comision"}
                strong={comisionNumero > 0}
              />
              <PreviewPill
                label="Lectura operativa"
                value={
                  comisionNumero > 0
                    ? "Descuenta neto al cobrar"
                    : "Impacta limpio en caja"
                }
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

function PreviewPill({
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
