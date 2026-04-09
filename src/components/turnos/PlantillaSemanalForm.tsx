"use client";

import { useActionState, useState } from "react";
import type { TurnoActionState } from "@/app/(admin)/turnos/actions";

const DIAS = [
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mié", value: 3 },
  { label: "Jue", value: 4 },
  { label: "Vie", value: 5 },
  { label: "Sáb", value: 6 },
  { label: "Dom", value: 0 },
];

const SEMANAS_OPTIONS = [1, 2, 4, 8];

type PlantillaSemanalFormProps = {
  action: (prevState: TurnoActionState, formData: FormData) => Promise<TurnoActionState>;
};

const initialState: TurnoActionState = {};

function timeToMinutes(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export default function PlantillaSemanalForm({ action }: PlantillaSemanalFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([2, 3, 4, 5, 6]);
  const [horaInicio, setHoraInicio] = useState("10:00");
  const [horaFin, setHoraFin] = useState("19:00");
  const [duracion, setDuracion] = useState(45);
  const [semanas, setSemanas] = useState(4);

  function toggleDia(value: number) {
    setDiasSeleccionados((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  }

  const slotsPorDia = (() => {
    const start = timeToMinutes(horaInicio);
    const end = timeToMinutes(horaFin);
    if (end <= start || duracion <= 0) return 0;
    return Math.floor((end - start) / duracion);
  })();

  const totalSlots = slotsPorDia * diasSeleccionados.length * semanas;
  const totalDias = diasSeleccionados.length * semanas;

  return (
    <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5">
      <p className="eyebrow text-[11px] font-semibold text-[#8cff59]">Plantilla semanal</p>
      <p className="mt-1 text-sm text-zinc-400">
        Aplicá un horario tipo a múltiples semanas de un tirón.
      </p>

      <form
        action={(fd) => {
          fd.set("diasSemana", diasSeleccionados.join(","));
          fd.set("duracionMinutos", String(duracion));
          fd.set("semanas", String(semanas));
          return formAction(fd);
        }}
        className="mt-4 space-y-4"
      >
        {/* Días */}
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-zinc-400">Días de la semana</p>
          <div className="flex flex-wrap gap-2">
            {DIAS.map((dia) => {
              const active = diasSeleccionados.includes(dia.value);
              return (
                <button
                  key={dia.value}
                  type="button"
                  onClick={() => toggleDia(dia.value)}
                  className={`min-h-[36px] rounded-full border px-3 text-xs font-semibold transition ${
                    active
                      ? "border-[#8cff59]/40 bg-[#8cff59]/15 text-[#8cff59]"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {dia.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Horario */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400">Desde</label>
            <input
              name="horaInicio"
              type="time"
              required
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-[#8cff59]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400">Hasta</label>
            <input
              name="horaFin"
              type="time"
              required
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-[#8cff59]"
            />
          </div>
        </div>

        {/* Duración y semanas */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-zinc-400">Duración por slot</p>
            <div className="flex gap-2">
              {[45, 60].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDuracion(min)}
                  className={`min-h-[40px] rounded-xl border px-4 text-sm font-semibold transition ${
                    duracion === min
                      ? "border-[#8cff59]/40 bg-[#8cff59]/15 text-[#8cff59]"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400">Semanas a cargar</label>
            <select
              value={semanas}
              onChange={(e) => setSemanas(Number(e.target.value))}
              className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-[#8cff59]"
            >
              {SEMANAS_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "semana" : "semanas"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
          {diasSeleccionados.length === 0 ? (
            <p className="text-xs text-zinc-500">Elegí al menos un día para ver el preview.</p>
          ) : totalSlots > 0 ? (
            <p className="text-xs text-zinc-300">
              Va a generar{" "}
              <span className="font-semibold text-white">~{totalSlots} slots</span>{" "}
              en{" "}
              <span className="font-semibold text-white">{totalDias} días</span>
              {" "}(ya existentes se saltan)
            </p>
          ) : (
            <p className="text-xs text-zinc-500">El rango no alcanza para generar slots.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || diasSeleccionados.length === 0 || totalSlots === 0}
            className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#8cff59] px-5 text-sm font-semibold text-[#07130a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Generando..." : `Aplicar plantilla`}
          </button>

          {state.success ? (
            <p className="text-sm font-medium text-[#8cff59]">{state.success}</p>
          ) : state.error ? (
            <p className="text-sm text-red-300">{state.error}</p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
