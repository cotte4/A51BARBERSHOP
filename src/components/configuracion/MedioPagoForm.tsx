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
    <div
      className={`rounded-[18px] px-4 py-3 ${
        strong ? "bg-zinc-800 text-white" : "bg-zinc-900 ring-1 ring-zinc-700"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className={`mt-2 ${strong ? "text-xl font-semibold" : "text-base font-medium"} text-white`}>
        {value}
      </p>
    </div>
  );
}

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
  const comisionTexto = comisionNumero > 0 ? `${comisionNumero}%` : "Sin comision";

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
              Configuracion del medio
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              Defini el nombre y la comision para que caja calcule el neto sin dudas.
            </p>
          </div>
          <div className="rounded-[20px] bg-zinc-900 px-4 py-3 text-sm text-zinc-300 ring-1 ring-zinc-700">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Lectura rapida</p>
            <p className="mt-2">{comisionTexto}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
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
                placeholder="Ej: Mercado Pago QR"
                inputMode="text"
                className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              {state.fieldErrors?.nombre ? (
                <p className="text-xs text-red-500">{state.fieldErrors.nombre}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="comisionPorcentaje" className="text-sm font-medium text-zinc-300">
                Comision <span className="text-xs text-zinc-400">(0 si no aplica)</span>
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
                  inputMode="decimal"
                  className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                  %
                </span>
              </div>
              {state.fieldErrors?.comisionPorcentaje ? (
                <p className="text-xs text-red-500">{state.fieldErrors.comisionPorcentaje}</p>
              ) : null}
              <p className="text-xs text-zinc-500">
                Si la comision es mayor a cero, el cobro resta neto al cierre.
              </p>
            </div>

            <div className="rounded-[22px] bg-zinc-800 p-4 ring-1 ring-zinc-700">
              <div className="inline-flex rounded-full bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-200">
                {comisionNumero > 0 ? "Comision activa" : "Sin comision"}
              </div>
              <p className="mt-3 text-sm font-medium text-zinc-300">
                La comision modifica el neto de caja
              </p>
              <p className="mt-3 text-xs text-zinc-500">
                El valor sirve como referencia operativa para no perder contexto en cierres.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] bg-zinc-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Impacto en caja
            </p>
            <div className="mt-4 space-y-3">
              <PreviewPill label="Medio" value={nombre.trim() || "Pendiente"} />
              <PreviewPill label="Comision" value={comisionTexto} strong={comisionNumero > 0} />
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
