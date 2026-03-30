"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AtencionRapidaState } from "@/app/(barbero)/caja/actions";
import type { QuickActionDefaults, QuickActionOption } from "@/lib/types";

type QuickActionButtonProps = {
  defaults: QuickActionDefaults | null;
  options: QuickActionOption[];
  action: (
    prevState: AtencionRapidaState,
    formData: FormData
  ) => Promise<AtencionRapidaState>;
  editHref: string;
};

const initialState: AtencionRapidaState = {};

function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

function getOptionLabel(name: string): string {
  const normalized = name.trim().toLowerCase();

  if (normalized.includes("efectivo")) return "Corte efectivo";
  if (normalized.includes("transfer")) return "Corte transf.";
  if (normalized.includes("tarjeta")) return "Corte tarjeta";
  return `Corte ${name}`;
}

function getOptionIcon(name: string): string {
  const normalized = name.trim().toLowerCase();

  if (normalized.includes("efectivo")) return "💵";
  if (normalized.includes("transfer")) return "📱";
  if (normalized.includes("tarjeta")) return "💳";
  return "⚡";
}

export default function QuickActionButton({
  defaults,
  options,
  action,
  editHref,
}: QuickActionButtonProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  if (!defaults) {
    return (
      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">Acción rápida no configurada</p>
        <p className="mt-1 text-sm text-amber-800">
          Configurá el servicio y medio de pago por defecto del barbero para usarla.
        </p>
        <Link href={editHref} className="mt-3 inline-block text-sm font-medium text-amber-900 underline">
          Ir al formulario completo
        </Link>
      </div>
    );
  }

  const comisionMpMonto = (defaults.precioBase * defaults.comisionMedioPagoPct) / 100;
  const montoNeto = defaults.precioBase - comisionMpMonto;
  const quickOptions = options.length > 0 ? options : [defaults];

  return (
    <div className="mb-5 rounded-2xl bg-gray-900 p-4 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="block text-xs uppercase tracking-[0.2em] text-gray-300">
            Acción rápida
          </span>
          <h2 className="mt-1 text-lg font-semibold">Cobrar corte común</h2>
          <p className="mt-1 text-sm text-gray-300">
            Registrá el servicio más usado sin pasar por el formulario completo.
          </p>
        </div>
        <div className="rounded-xl bg-white/10 px-3 py-2 text-right text-xs text-gray-200">
          <div>{defaults.servicioNombre}</div>
          <div className="mt-1 font-semibold text-white">{formatARS(defaults.precioBase)}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {quickOptions.map((option) => {
          return (
            <form key={option.medioPagoId} action={formAction}>
              <input type="hidden" name="medioPagoId" value={option.medioPagoId} />
              <button
                type="submit"
                disabled={isPending}
                className="flex min-h-[72px] w-full flex-col items-start justify-center rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-left transition hover:bg-white/14 disabled:opacity-50"
              >
                <span className="text-sm font-semibold text-white">
                  {getOptionIcon(option.medioPagoNombre)} {getOptionLabel(option.medioPagoNombre)}
                </span>
                <span className="mt-1 text-xs text-gray-300">{option.medioPagoNombre}</span>
                <span className="mt-2 text-base font-bold text-white">
                  {formatARS(option.precioBase)}
                </span>
              </button>
            </form>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="text-gray-300">
          Neto estimado: <span className="font-semibold text-white">{formatARS(montoNeto)}</span>
        </div>
        <Link href={editHref} className="font-medium text-white underline underline-offset-4">
          Ir al formulario completo
        </Link>
      </div>

      {state.error ? (
        <p className="mt-3 rounded-xl border border-red-200/60 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
