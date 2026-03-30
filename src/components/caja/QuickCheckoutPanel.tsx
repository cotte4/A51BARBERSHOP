"use client";

import { useActionState } from "react";
import type { AtencionRapidaState } from "@/app/(barbero)/caja/actions";
import type { QuickActionDefaults, QuickActionOption } from "@/lib/types";

type QuickCheckoutPanelProps = {
  defaults: QuickActionDefaults | null;
  options: QuickActionOption[];
  action: (
    prevState: AtencionRapidaState,
    formData: FormData
  ) => Promise<AtencionRapidaState>;
};

const initialState: AtencionRapidaState = {};

function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

function getShortcutLabel(servicioNombre: string, medioNombre: string): string {
  const normalized = medioNombre.toLowerCase();
  if (normalized.includes("efectivo")) return `${servicioNombre} + Efectivo`;
  if (normalized.includes("transf")) return `${servicioNombre} + Transferencia`;
  if (normalized.includes("posnet") || normalized.includes("tarjeta")) {
    return `${servicioNombre} + Tarjeta`;
  }
  return `${servicioNombre} + ${medioNombre}`;
}

function getShortcutEmoji(medioNombre: string): string {
  const normalized = medioNombre.toLowerCase();
  if (normalized.includes("efectivo")) return "E";
  if (normalized.includes("transf")) return "T";
  if (normalized.includes("posnet") || normalized.includes("tarjeta")) return "M";
  return "Q";
}

export default function QuickCheckoutPanel({
  defaults,
  options,
  action,
}: QuickCheckoutPanelProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  if (!defaults) {
    return null;
  }

  const quickOptions = options.length > 0 ? options : [defaults];

  return (
    <section className="overflow-hidden rounded-[30px] border border-[#8cff59]/25 bg-zinc-950 text-white shadow-[0_24px_80px_rgba(140,255,89,0.12)]">
      <div className="bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.26),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.08),_transparent_35%)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="eyebrow text-xs font-semibold">Atencion rapida</p>
            <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight">
              Un toque y la atencion queda guardada.
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Ideal para el corte mas comun. Toca el combo y seguimos con el proximo cliente.
            </p>
          </div>

          <div className="panel-soft rounded-[22px] px-4 py-3 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Servicio base
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{defaults.servicioNombre}</p>
            <p className="mt-1 text-sm font-medium text-[#8cff59]">{formatARS(defaults.precioBase)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {quickOptions.map((option) => (
            <form key={option.medioPagoId} action={formAction}>
              <input type="hidden" name="medioPagoId" value={option.medioPagoId} />
              <button
                type="submit"
                disabled={isPending}
                className="flex min-h-[92px] w-full flex-col items-start justify-center rounded-[24px] border border-zinc-800 bg-white/6 px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#8cff59]/45 hover:bg-white/10 disabled:opacity-50"
              >
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Checkout 1 tap
                </span>
                <span className="mt-2 text-xl font-semibold text-white">
                  {getShortcutEmoji(option.medioPagoNombre)} {getShortcutLabel(defaults.servicioNombre, option.medioPagoNombre)}
                </span>
                <span className="mt-1 text-sm text-zinc-400">{option.medioPagoNombre}</span>
                <span className="mt-3 text-lg font-bold text-[#8cff59]">
                  {formatARS(option.precioBase)}
                </span>
              </button>
            </form>
          ))}
        </div>

        {state.error ? (
          <p className="mt-4 rounded-[22px] border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {state.error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
