"use client";

import { useState, useTransition } from "react";
import { sortearAction } from "./actions";

type SorteoProps = {
  pagados: number;
  equipos: number;
};

export default function Sorteo({ pagados, equipos }: SorteoProps) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const faltaJugadores = pagados < 2;
  const faltaEquipos = !faltaJugadores && equipos < pagados;
  const bloqueado = faltaJugadores || faltaEquipos;

  const motivo = faltaJugadores
    ? "Hacen falta al menos 2 jugadores con el pago confirmado."
    : faltaEquipos
      ? `Hay ${pagados} jugadores y ${equipos} equipos. Cargá más equipos abajo.`
      : null;

  function alTocar() {
    if (!window.confirm(`¿Hacer el sorteo con ${pagados} jugadores? No se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      const resultado = await sortearAction();
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={bloqueado || pendiente}
        onClick={alTocar}
        className="neon-button min-h-[52px] w-full rounded-[20px] px-5 py-3 text-lg font-semibold disabled:opacity-60"
      >
        {pendiente ? "Sorteando…" : "Hacer el sorteo"}
      </button>
      {motivo ? <p className="text-sm text-zinc-400">{motivo}</p> : null}
      {error ? (
        <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
