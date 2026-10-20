"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { TurnoActionState } from "@/app/(admin)/turnos/actions";

type MoverTurnoFormProps = {
  fechaActual: string;
  horaActual: string;
  horasParaMover: (fecha: string) => Promise<{ horas: string[]; error?: string }>;
  moverAction: (prevState: TurnoActionState, formData: FormData) => Promise<TurnoActionState>;
  onClose: () => void;
};

const initialState: TurnoActionState = {};

function hoyArgentina() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

export default function MoverTurnoForm({
  fechaActual,
  horaActual,
  horasParaMover,
  moverAction,
  onClose,
}: MoverTurnoFormProps) {
  const [state, formAction, pending] = useActionState(moverAction, initialState);
  const hoy = hoyArgentina();
  const [fecha, setFecha] = useState(fechaActual < hoy ? hoy : fechaActual);
  const [hora, setHora] = useState("");
  const [horas, setHoras] = useState<string[]>([]);
  const [errorHoras, setErrorHoras] = useState<string | null>(null);
  const [buscando, startBuscar] = useTransition();

  useEffect(() => {
    setHora("");
    startBuscar(async () => {
      const resultado = await horasParaMover(fecha);
      setHoras(resultado.horas);
      setErrorHoras(resultado.error ?? null);
    });
  }, [fecha, horasParaMover]);

  useEffect(() => {
    if (!state.success) return;
    window.dispatchEvent(new CustomEvent("a51:toast", { detail: { tone: "success", message: state.success } }));
    onClose();
  }, [state.success, onClose]);

  return (
    <form action={formAction} className="space-y-3 rounded-[20px] border border-sky-400/20 bg-sky-500/8 p-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Mover turno</p>
        <p className="mt-1 text-sm text-zinc-300">
          Hoy está a las {horaActual.slice(0, 5)}. Elegí el día y la hora nuevos: solo aparecen los que están libres.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-400">
        Día
        <input
          type="date"
          name="fecha"
          min={hoy}
          required
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-sky-400"
        />
      </label>

      <input type="hidden" name="hora" value={hora} />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Hora nueva">
        {buscando ? <p className="text-sm text-zinc-400">Buscando horarios…</p> : null}
        {!buscando && errorHoras ? <p className="text-sm text-red-300">{errorHoras}</p> : null}
        {!buscando && !errorHoras && horas.length === 0 ? (
          <p className="text-sm text-zinc-400">Ese día no hay lugar. Probá otro.</p>
        ) : null}
        {!buscando
          ? horas.map((h) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={hora === h}
                onClick={() => setHora(h)}
                className={`min-h-[40px] rounded-xl border px-3 text-sm font-semibold tabular-nums ${
                  hora === h
                    ? "border-sky-300 bg-sky-300 text-[#04121a]"
                    : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-sky-400/60"
                }`}
              >
                {h}
              </button>
            ))
          : null}
      </div>

      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!hora || pending}
          className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-sky-300 px-4 text-sm font-semibold text-[#04121a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Moviendo…" : hora ? `Mover a las ${hora}` : "Elegí una hora"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
        >
          Volver
        </button>
      </div>
    </form>
  );
}
