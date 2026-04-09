"use client";

import { useActionState, useState } from "react";
import type { TurnoActionState } from "@/app/(admin)/turnos/actions";

const DIAS = [
  { label: "Lunes", value: 1 },
  { label: "Martes", value: 2 },
  { label: "Miércoles", value: 3 },
  { label: "Jueves", value: 4 },
  { label: "Viernes", value: 5 },
  { label: "Sábado", value: 6 },
  { label: "Domingo", value: 0 },
];

type BorrarDiaSemanaFormProps = {
  action: (prevState: TurnoActionState, formData: FormData) => Promise<TurnoActionState>;
};

const initialState: TurnoActionState = {};

export default function BorrarDiaSemanaForm({ action }: BorrarDiaSemanaFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const diaLabel = DIAS.find((d) => d.value === diaSeleccionado)?.label ?? "";

  function handleDiaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setDiaSeleccionado(e.target.value === "" ? null : Number(e.target.value));
    setConfirmando(false);
  }

  return (
    <div className="rounded-[24px] border border-red-500/15 bg-red-500/5 p-4 sm:p-5">
      <p className="eyebrow text-[11px] font-semibold text-red-400">Borrar día de la semana</p>
      <p className="mt-1 text-sm text-zinc-400">
        Eliminá todos los slots libres de un día de la semana desde hoy. Los que tengan turno
        pendiente o confirmado no se tocan.
      </p>

      <div className="mt-4 space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-zinc-400">¿Qué día querés sacar?</label>
          <select
            value={diaSeleccionado ?? ""}
            onChange={handleDiaChange}
            className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-red-400 sm:w-64"
          >
            <option value="">Elegí un día</option>
            {DIAS.map((dia) => (
              <option key={dia.value} value={dia.value}>
                {dia.label}
              </option>
            ))}
          </select>
        </div>

        {diaSeleccionado !== null && !confirmando ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2.5">
            <p className="text-xs text-amber-200">
              Esto va a borrar todos los slots libres de los{" "}
              <span className="font-semibold">{diaLabel}s</span> desde hoy en adelante.
              Los que tengan turno no se van a tocar.
            </p>
          </div>
        ) : null}

        {diaSeleccionado !== null ? (
          !confirmando ? (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/15 px-4 text-sm font-semibold text-red-300 hover:bg-red-500/25"
            >
              Borrar todos los {diaLabel}s
            </button>
          ) : (
            <form
              action={(fd) => {
                fd.set("diaSemana", String(diaSeleccionado));
                setConfirmando(false);
                return formAction(fd);
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <p className="w-full text-xs font-semibold text-red-300">
                ¿Confirmás? Esta acción no se puede deshacer.
              </p>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Borrando..." : `Sí, borrar los ${diaLabel}s`}
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
              >
                Cancelar
              </button>
            </form>
          )
        ) : null}

        {state.success ? (
          <p className="text-sm font-medium text-[#8cff59]">{state.success}</p>
        ) : state.error ? (
          <p className="text-sm text-red-300">{state.error}</p>
        ) : null}
      </div>
    </div>
  );
}
