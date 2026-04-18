"use client";

import { useActionState } from "react";
import { editarMovimiento, type MovimientoFormState } from "../../../actions";
import Link from "next/link";

type MovimientoData = {
  id: string;
  fecha: string;
  tipo: string;
  monto: string | null;
  descripcion: string | null;
};

const initialState: MovimientoFormState = {};

export default function EditarMovimientoForm({ mov }: { mov: MovimientoData }) {
  const editarConId = editarMovimiento.bind(null, mov.id);
  const [state, formAction, pending] = useActionState(editarConId, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">Tipo de movimiento</label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 has-[:checked]:border-[#8cff59]/60 has-[:checked]:bg-[#8cff59]/8">
            <input
              type="radio"
              name="tipo"
              value="aporte"
              defaultChecked={mov.tipo === "aporte"}
              className="accent-[#8cff59]"
            />
            <div>
              <p className="text-sm font-semibold text-white">Aporte</p>
              <p className="text-xs text-zinc-500">Dinero que entra</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 has-[:checked]:border-amber-500/60 has-[:checked]:bg-amber-500/8">
            <input
              type="radio"
              name="tipo"
              value="retiro"
              defaultChecked={mov.tipo === "retiro"}
              className="accent-amber-400"
            />
            <div>
              <p className="text-sm font-semibold text-white">Retiro</p>
              <p className="text-xs text-zinc-500">Dinero que sale</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 has-[:checked]:border-sky-500/60 has-[:checked]:bg-sky-500/8">
            <input
              type="radio"
              name="tipo"
              value="inversion_activo"
              defaultChecked={mov.tipo === "inversion_activo"}
              className="accent-sky-400"
            />
            <div>
              <p className="text-sm font-semibold text-white">Inversion activo</p>
              <p className="text-xs text-zinc-500">Movimiento conectado o ajuste del Hangar</p>
            </div>
          </label>
        </div>
        {state.fieldErrors?.tipo && (
          <p className="text-xs text-red-400">{state.fieldErrors.tipo}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">Monto (ARS)</label>
        <input
          name="monto"
          type="number"
          min="1"
          step="0.01"
          defaultValue={mov.monto ?? ""}
          required
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
        />
        {state.fieldErrors?.monto && (
          <p className="text-xs text-red-400">{state.fieldErrors.monto}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">Fecha</label>
        <input
          name="fecha"
          type="date"
          defaultValue={mov.fecha}
          required
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white focus:border-[#8cff59]/60 focus:outline-none"
        />
        {state.fieldErrors?.fecha && (
          <p className="text-xs text-red-400">{state.fieldErrors.fecha}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300">
          Descripción <span className="text-zinc-500">(opcional)</span>
        </label>
        <input
          name="descripcion"
          type="text"
          defaultValue={mov.descripcion ?? ""}
          placeholder="Ej: Inversión inicial de los socios"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Link
          href="/finanzas"
          className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-[20px] border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="neon-button inline-flex min-h-[52px] flex-1 items-center justify-center rounded-[20px] text-sm font-semibold disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Actualizar movimiento"}
        </button>
      </div>
    </form>
  );
}
