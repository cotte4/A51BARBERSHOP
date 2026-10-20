"use client";

import { useActionState, useState } from "react";
import type { TurnoActionState } from "@/app/(admin)/turnos/actions";

type DiaEspecial = {
  id: string;
  barberoId: string | null;
  fecha: string;
  cerrado: boolean;
  desde: string | null;
  hasta: string | null;
  nota: string | null;
};

type DiasEspecialesFormProps = {
  titulo: string;
  descripcion: string;
  especiales: DiaEspecial[];
  minFecha: string;
  action: (prevState: TurnoActionState, formData: FormData) => Promise<TurnoActionState>;
  quitarAction: (id: string) => Promise<void>;
};

const initialState: TurnoActionState = {};
const inputClass =
  "h-10 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none";

function formatFecha(fecha: string) {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function DiasEspecialesForm({
  titulo,
  descripcion,
  especiales,
  minFecha,
  action,
  quitarAction,
}: DiasEspecialesFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [tipo, setTipo] = useState<"cerrado" | "otro">("cerrado");

  return (
    <section className="panel-card rounded-[28px] p-5">
      <p className="eyebrow text-xs font-semibold">Días especiales</p>
      <h2 className="font-display mt-1 text-xl font-semibold text-white">{titulo}</h2>
      <p className="mt-1 text-sm text-zinc-400">{descripcion}</p>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-300">
          Fecha
          <input type="date" name="fecha" min={minFecha} required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-300">
          Ese día
          <select
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "cerrado" | "otro")}
            className={inputClass}
          >
            <option value="cerrado">No se trabaja</option>
            <option value="otro">Otro horario</option>
          </select>
        </label>
        {tipo === "otro" ? (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-300">
              Desde
              <input type="time" name="desde" step={1800} defaultValue="10:00" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-300">
              Hasta
              <input type="time" name="hasta" step={1800} defaultValue="13:00" className={inputClass} />
            </label>
          </>
        ) : null}
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-300">
          Nota (opcional)
          <input type="text" name="nota" placeholder="Vacaciones, feriado…" className={inputClass} />
        </label>
        <button type="submit" disabled={pending} className="ghost-button rounded-[20px] px-4 py-2 text-sm font-semibold">
          {pending ? "Guardando…" : "Agregar"}
        </button>
      </form>
      {state.error ? <p className="mt-2 text-sm text-red-300">{state.error}</p> : null}
      {state.success ? <p className="mt-2 text-sm text-[#8cff59]">{state.success}</p> : null}

      {especiales.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No hay días especiales cargados.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-800/80">
          {especiales.map((dia) => (
            <li key={dia.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span className="text-zinc-200">
                <span className="font-semibold capitalize">{formatFecha(dia.fecha)}</span>
                {" · "}
                {dia.cerrado ? "no se trabaja" : `de ${dia.desde} a ${dia.hasta}`}
                {dia.barberoId === null ? <span className="text-zinc-500"> · todo el local</span> : null}
                {dia.nota ? <span className="text-zinc-500"> · {dia.nota}</span> : null}
              </span>
              <form action={quitarAction.bind(null, dia.id)}>
                <button type="submit" className="text-xs text-zinc-400 hover:text-red-300 hover:underline">
                  Quitar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
