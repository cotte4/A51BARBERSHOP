"use client";

import { useState, useTransition } from "react";
import { reiniciarRevealAction, siguienteRevealAction } from "./actions";

type PantallaProps = {
  revealPaso: number;
  totalRonda1: number;
};

export default function Pantalla({ revealPaso, totalRonda1 }: PantallaProps) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const completo = revealPaso >= totalRonda1;

  function siguiente() {
    setError(null);
    startTransition(async () => {
      const resultado = await siguienteRevealAction();
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  function repetir() {
    if (!window.confirm("¿Repetir el sorteo en la pantalla desde el principio?")) return;
    setError(null);
    startTransition(async () => {
      const resultado = await reiniciarRevealAction();
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-400">
        Cruces mostrados:{" "}
        <span className="font-semibold tabular-nums text-white">
          {revealPaso} de {totalRonda1}
        </span>
      </p>

      <button
        type="button"
        disabled={completo || pendiente}
        onClick={siguiente}
        className="neon-button min-h-[52px] w-full rounded-[20px] px-5 py-3 text-lg font-semibold disabled:opacity-60"
      >
        {completo ? "Sorteo completo ✓" : "Siguiente"}
      </button>

      {error ? (
        <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pendiente}
        onClick={repetir}
        className="ghost-button min-h-11 self-start rounded-[20px] px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        Repetir el sorteo en pantalla
      </button>

      <div className="flex flex-col gap-1">
        <a
          href="/torneo/pantalla"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block py-2 text-sm text-zinc-400 hover:text-[#8cff59] hover:underline"
        >
          Abrir la pantalla de la tele
        </a>
        <a
          href="/torneo/pantalla/demo"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block py-2 text-sm text-zinc-400 hover:text-[#8cff59] hover:underline"
        >
          Ensayar con jugadores de mentira
        </a>
      </div>
    </div>
  );
}
