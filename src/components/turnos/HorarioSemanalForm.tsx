"use client";

import { useActionState, useState } from "react";
import type { TurnoActionState } from "@/app/(admin)/turnos/actions";

// Lunes primero, como se piensa la semana en el local.
const DIAS = [
  { label: "Lunes", value: 1 },
  { label: "Martes", value: 2 },
  { label: "Miércoles", value: 3 },
  { label: "Jueves", value: 4 },
  { label: "Viernes", value: 5 },
  { label: "Sábado", value: 6 },
  { label: "Domingo", value: 0 },
];

type Rango = { desde: string; hasta: string };
type DiaEstado = { activo: boolean; rangos: Rango[] };

type HorarioSemanalFormProps = {
  semanal: { diaSemana: number; desde: string; hasta: string }[];
  action: (prevState: TurnoActionState, formData: FormData) => Promise<TurnoActionState>;
};

const initialState: TurnoActionState = {};
const inputClass =
  "h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-2 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none";

function estadoInicial(semanal: HorarioSemanalFormProps["semanal"]): Record<number, DiaEstado> {
  const estado: Record<number, DiaEstado> = {};
  for (const { value } of DIAS) {
    const rangos = semanal
      .filter((f) => f.diaSemana === value)
      .map((f) => ({ desde: f.desde, hasta: f.hasta }));
    estado[value] = { activo: rangos.length > 0, rangos: rangos.length > 0 ? rangos : [{ desde: "10:00", hasta: "19:00" }] };
  }
  return estado;
}

export default function HorarioSemanalForm({ semanal, action }: HorarioSemanalFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [dias, setDias] = useState(() => estadoInicial(semanal));

  function cambiarDia(dia: number, cambio: Partial<DiaEstado>) {
    setDias((prev) => ({ ...prev, [dia]: { ...prev[dia]!, ...cambio } }));
  }

  function cambiarRango(dia: number, index: number, campo: keyof Rango, valor: string) {
    const rangos = dias[dia]!.rangos.map((r, i) => (i === index ? { ...r, [campo]: valor } : r));
    cambiarDia(dia, { rangos });
  }

  return (
    <form action={formAction} className="panel-card rounded-[28px] p-5">
      <p className="eyebrow text-xs font-semibold">Mi semana</p>
      <h2 className="font-display mt-1 text-xl font-semibold text-white">Qué días y en qué horario trabajás</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Se repite todas las semanas. Los clientes ven turnos libres solo dentro de este horario.
      </p>

      <ul className="mt-4 divide-y divide-zinc-800/80">
        {DIAS.map(({ label, value }) => {
          const dia = dias[value]!;
          return (
            <li key={value} className="flex flex-wrap items-center gap-3 py-3">
              <label className="flex min-w-[130px] items-center gap-2 text-sm font-medium text-zinc-200">
                <input
                  type="checkbox"
                  name={`activo_${value}`}
                  checked={dia.activo}
                  onChange={(e) => cambiarDia(value, { activo: e.target.checked })}
                  className="h-5 w-5 accent-[#8cff59]"
                />
                {label}
              </label>

              {dia.activo ? (
                <div className="flex flex-wrap items-center gap-2">
                  {dia.rangos.map((rango, i) => (
                    <span key={i} className="flex items-center gap-1 text-sm text-zinc-400">
                      {i > 0 ? <span className="px-1">y</span> : null}
                      <input
                        type="time"
                        step={1800}
                        aria-label={`${label}: desde`}
                        name={`desde_${value}_${i + 1}`}
                        value={rango.desde}
                        onChange={(e) => cambiarRango(value, i, "desde", e.target.value)}
                        className={inputClass}
                      />
                      a
                      <input
                        type="time"
                        step={1800}
                        aria-label={`${label}: hasta`}
                        name={`hasta_${value}_${i + 1}`}
                        value={rango.hasta}
                        onChange={(e) => cambiarRango(value, i, "hasta", e.target.value)}
                        className={inputClass}
                      />
                    </span>
                  ))}
                  {dia.rangos.length === 1 ? (
                    <button
                      type="button"
                      onClick={() => cambiarDia(value, { rangos: [...dia.rangos, { desde: "15:00", hasta: "19:00" }] })}
                      className="text-xs text-zinc-400 hover:text-[#8cff59] hover:underline"
                    >
                      + corte al mediodía
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => cambiarDia(value, { rangos: dia.rangos.slice(0, 1) })}
                      className="text-xs text-zinc-400 hover:text-red-300 hover:underline"
                    >
                      Quitar segundo horario
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-sm text-zinc-500">No trabajo</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="neon-button rounded-[20px] px-5 py-3 font-semibold">
          {pending ? "Guardando…" : "Guardar horario"}
        </button>
        {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-[#8cff59]">{state.success}</p> : null}
      </div>
    </form>
  );
}
