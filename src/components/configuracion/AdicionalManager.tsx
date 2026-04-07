"use client";

import { useActionState, useState, useTransition } from "react";
import type { AdicionalFormState } from "@/app/(admin)/configuracion/servicios/actions";

interface AdicionalManagerProps {
  servicioId: string;
  adicionales: Array<{ id: string; nombre: string; precioExtra: string | null }>;
  crearAdicionalAction: (
    servicioId: string,
    prevState: AdicionalFormState,
    formData: FormData
  ) => Promise<AdicionalFormState>;
  eliminarAdicionalAction: (id: string, servicioId: string) => Promise<void>;
}

function formatARS(val: string | null | undefined) {
  if (!val) return "$0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

const initialState: AdicionalFormState = {};

function EliminarButton({
  id,
  servicioId,
  eliminarAdicionalAction,
}: {
  id: string;
  servicioId: string;
  eliminarAdicionalAction: (id: string, servicioId: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(() => {
              eliminarAdicionalAction(id, servicioId);
            })
          }
          className="min-h-[44px] rounded-lg bg-red-500/15 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
        >
          {isPending ? "Eliminando..." : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-[44px] rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => setConfirming(true)}
      className="min-h-[44px] rounded-lg bg-red-500/15 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
    >
      Eliminar
    </button>
  );
}

export default function AdicionalManager({
  servicioId,
  adicionales,
  crearAdicionalAction,
  eliminarAdicionalAction,
}: AdicionalManagerProps) {
  const crearConId = crearAdicionalAction.bind(null, servicioId);
  const [state, formAction, isPending] = useActionState(crearConId, initialState);
  const totalExtra = adicionales.reduce(
    (acc, adicional) => acc + Number(adicional.precioExtra ?? 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] bg-zinc-950/80 p-4 ring-1 ring-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Panel de adicionales
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Los extras suman valor sin ensuciar la base. Mantenelos claros para que el cobro
              sea rápido y la explicación al cliente no se vuelva una charla larga.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatPill label="Adicionales" value={`${adicionales.length}`} />
            <StatPill label="Impacto total" value={formatARS(String(totalExtra))} accent />
          </div>
        </div>
      </div>

      {adicionales.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-zinc-800 bg-zinc-950/60 p-5 text-sm text-zinc-400">
          Sin adicionales cargados. Acá podés sumar extras que la caja reconocerá como parte del
          servicio.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {adicionales.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-[20px] bg-zinc-900 px-4 py-3 ring-1 ring-zinc-800"
            >
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{a.nombre}</span>
                <span className="mt-1 block text-sm text-zinc-400">+{formatARS(a.precioExtra)}</span>
              </div>
              <EliminarButton
                id={a.id}
                servicioId={servicioId}
                eliminarAdicionalAction={eliminarAdicionalAction}
              />
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="rounded-[24px] bg-zinc-950/80 p-4 ring-1 ring-zinc-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Nuevo adicional
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Sumá un extra puntual, como diseño o un servicio complementario.
            </p>
          </div>
          {state.success ? (
            <span className="rounded-full bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#8cff59] ring-1 ring-[#8cff59]/20">
              Agregado
            </span>
          ) : null}
        </div>

        {state.error ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-300">
            {state.error}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
          <div className="flex flex-col gap-2">
            <label htmlFor="adicional-nombre" className="text-sm font-medium text-zinc-300">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="adicional-nombre"
              name="nombre"
              type="text"
              placeholder="Ej: Diseño de barba"
              className="min-h-[48px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="adicional-precio" className="text-sm font-medium text-zinc-300">
              Precio extra <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                $
              </span>
              <input
                id="adicional-precio"
                name="precioExtra"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 pl-8 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="neon-button mt-4 inline-flex min-h-[48px] items-center justify-center rounded-2xl px-5 text-sm font-semibold transition disabled:opacity-50"
        >
          {isPending ? "Agregando..." : "+ Agregar adicional"}
        </button>
      </form>
    </div>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[18px] px-4 py-3 ring-1 ${
        accent ? "bg-[#8cff59]/10 ring-[#8cff59]/20" : "bg-white/5 ring-white/10"
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${accent ? "text-[#8cff59]" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
