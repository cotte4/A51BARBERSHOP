"use client";

import { useState, useTransition } from "react";
import { reiniciarRevealAction, siguienteRevealAction } from "./actions";

type PantallaProps = {
  /** Pasos ya mostrados en la tele. */
  paso: number;
  total: number;
  /** Los primeros pasos son la ruleta de equipos (uno por jugador); el resto, los cruces. 0 = solo cruces. */
  pasosEquipos?: number;
};

export default function Pantalla({ paso, total, pasosEquipos = 0 }: PantallaProps) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const completo = paso >= total;
  const enEquipos = paso < pasosEquipos;
  const cruces = total - pasosEquipos;
  const fases = [
    ...(pasosEquipos > 0
      ? [{ titulo: "Equipos", hechos: Math.min(paso, pasosEquipos), total: pasosEquipos, activa: enEquipos }]
      : []),
    { titulo: "Cruces", hechos: Math.max(0, Math.min(paso - pasosEquipos, cruces)), total: cruces, activa: !enEquipos && !completo },
  ];

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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        {fases.map((fase) => (
          <div key={fase.titulo}>
            <div className="flex items-baseline justify-between gap-3">
              <p className={`text-sm ${fase.activa ? "font-semibold text-white" : "text-zinc-400"}`}>
                {fase.titulo === "Equipos" ? "Ruleta de equipos" : "Cruces mostrados"}
              </p>
              <p className="font-display text-3xl font-bold tabular-nums text-white">
                {fase.hechos}
                <span className="text-lg text-zinc-500">/{fase.total}</span>
              </p>
            </div>
            {/* Un punto por paso: los mostrados prenden, el próximo late. */}
            <div
              className="mt-2.5 grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${Math.max(fase.total, 1)}, minmax(0, 1fr))` }}
              aria-hidden="true"
            >
              {Array.from({ length: fase.total }, (_, i) => {
                const mostrado = i < fase.hechos;
                const proximo = fase.activa && i === fase.hechos;
                return (
                  <span
                    key={i}
                    className={`h-2 rounded-full transition-[background-color,box-shadow] duration-500 ${
                      mostrado
                        ? "bg-[#8cff59] shadow-[0_0_10px_rgba(140,255,89,0.55)]"
                        : proximo
                          ? "bg-[#8cff59]/35 motion-safe:animate-pulse"
                          : "bg-zinc-800"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={completo || pendiente}
        onClick={siguiente}
        className={`relative flex min-h-16 w-full items-center justify-center gap-3 overflow-hidden rounded-[22px] px-5 py-4 text-xl font-bold tracking-tight transition-transform duration-150 ease-out active:scale-[0.97] disabled:cursor-default ${
          completo ? "border border-[#8cff59]/30 bg-[#8cff59]/10 text-[#8cff59]" : "neon-button disabled:opacity-60"
        }`}
      >
        {pendiente ? (
          <span
            aria-hidden="true"
            className="h-5 w-5 rounded-full border-2 border-[#07130a]/30 border-t-[#07130a] motion-safe:animate-[a51-spin_0.7s_linear_infinite]"
          />
        ) : null}
        {completo ? "Sorteo completo ✓" : "Siguiente"}
        {!completo && !pendiente ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </button>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <a
          href="/torneo/pantalla"
          target="_blank"
          rel="noopener noreferrer"
          className="ghost-button flex min-h-12 items-center justify-center gap-1.5 rounded-[18px] px-3 text-sm font-semibold"
        >
          Abrir la tele
          <IconoAfuera />
        </a>
        <a
          href="/torneo/pantalla/demo"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center gap-1.5 rounded-[18px] border border-zinc-700 px-3 text-sm font-semibold text-zinc-300 hover:border-zinc-500"
        >
          Ensayar
          <IconoAfuera />
        </a>
      </div>

      <button
        type="button"
        disabled={pendiente}
        onClick={repetir}
        className="min-h-11 self-start px-1 text-sm font-medium text-zinc-500 hover:text-amber-300 disabled:opacity-60"
      >
        Repetir el sorteo en pantalla
      </button>
    </div>
  );
}

function IconoAfuera() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
