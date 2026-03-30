"use client";

import { useActionState, useTransition } from "react";
import type { TurnoActionState } from "@/app/(admin)/turnos/actions";
import type { DisponibilidadSlot } from "@/lib/types";

type BlockedSlot = {
  fecha: string;
  horaInicio: string;
  estado: string;
};

type DisponibilidadGridProps = {
  barberoId: string;
  slots: DisponibilidadSlot[];
  blockedSlots: BlockedSlot[];
  createAction: (barberoId: string, prevState: TurnoActionState, formData: FormData) => Promise<TurnoActionState>;
  deleteAction: (slotId: string) => Promise<void>;
  minDate: string;
};

const initialState: TurnoActionState = {};

export default function DisponibilidadGrid({
  barberoId,
  slots,
  blockedSlots,
  createAction,
  deleteAction,
  minDate,
}: DisponibilidadGridProps) {
  const [state, formAction, isPending] = useActionState(createAction.bind(null, barberoId), initialState);
  const [isDeleting, startTransition] = useTransition();
  const blockedKeys = new Set(blockedSlots.map((slot) => `${slot.fecha}-${slot.horaInicio.slice(0, 5)}`));

  return (
    <div className="space-y-5">
      <form action={formAction} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Agregar disponibilidad</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input
            type="date"
            name="fecha"
            min={minDate}
            defaultValue={minDate}
            className="h-12 rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
          <input
            type="time"
            name="horaInicio"
            className="h-12 rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
          <select
            name="duracionMinutos"
            defaultValue="45"
            className="h-12 rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
          >
            <option value="45">45 min</option>
            <option value="60">60 min</option>
          </select>
        </div>

        {state.error ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Agregar slot"}
        </button>
      </form>

      <section className="space-y-3">
        {slots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            TodavÃ­a no hay disponibilidad cargada.
          </div>
        ) : (
          slots.map((slot) => {
            const blocked = blockedKeys.has(`${slot.fecha}-${slot.horaInicio.slice(0, 5)}`);
            return (
              <div
                key={slot.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {slot.fecha} · {slot.horaInicio.slice(0, 5)} · {slot.duracionMinutos} min
                  </p>
                  {blocked ? (
                    <p className="mt-1 text-xs text-amber-700">Bloqueado por turno confirmado o completado.</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={blocked || isDeleting}
                  onClick={() => startTransition(() => deleteAction(slot.id))}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
