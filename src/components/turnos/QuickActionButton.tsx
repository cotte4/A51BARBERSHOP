"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { AtencionRapidaState } from "@/app/(barbero)/caja/actions";
import type { QuickActionDefaults } from "@/lib/types";

type QuickActionButtonProps = {
  defaults: QuickActionDefaults | null;
  action: (prevState: AtencionRapidaState) => Promise<AtencionRapidaState>;
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

export default function QuickActionButton({ defaults, action, editHref }: QuickActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(action, initialState);

  if (!defaults) {
    return (
      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">AtenciÃ³n rÃ¡pida no configurada</p>
        <p className="mt-1 text-sm text-amber-800">
          ConfigurÃ¡ el servicio y medio de pago por defecto del barbero para usarla.
        </p>
        <Link href={editHref} className="mt-3 inline-block text-sm font-medium text-amber-900 underline">
          Ir al formulario completo
        </Link>
      </div>
    );
  }

  const comisionMpMonto = (defaults.precioBase * defaults.comisionMedioPagoPct) / 100;
  const montoNeto = defaults.precioBase - comisionMpMonto;

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full rounded-2xl bg-gray-900 px-5 py-4 text-left text-white shadow-sm transition hover:bg-gray-800"
      >
        <span className="block text-xs uppercase tracking-[0.2em] text-gray-300">AcciÃ³n rÃ¡pida</span>
        <span className="mt-1 block text-lg font-semibold">Registrar corte comÃºn</span>
        <span className="mt-1 block text-sm text-gray-300">
          {defaults.servicioNombre} · {defaults.medioPagoNombre} · {formatARS(defaults.precioBase)}
        </span>
      </button>

      {open ? (
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Confirmar atenciÃ³n rÃ¡pida</h2>
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            <p>Servicio: {defaults.servicioNombre}</p>
            <p>Medio de pago: {defaults.medioPagoNombre}</p>
            <p>Precio: {formatARS(defaults.precioBase)}</p>
            <p>Neto estimado: {formatARS(montoNeto)}</p>
          </div>

          {state.error ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <form action={formAction}>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Confirmar"}
              </button>
            </form>

            <Link
              href={editHref}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Editar
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
