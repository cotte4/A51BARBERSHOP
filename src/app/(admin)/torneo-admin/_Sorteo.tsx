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
  const listo = !bloqueado;

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
    <div className="flex flex-col gap-4">
      <ul className="grid gap-2 sm:grid-cols-2">
        <Requisito ok={!faltaJugadores} href="#jugadores">
          <span className="font-semibold tabular-nums text-white">{pagados}</span> jugadores pagaron
        </Requisito>
        <Requisito ok={!faltaJugadores && !faltaEquipos} href="#equipos">
          <span className="font-semibold tabular-nums text-white">{equipos}</span> equipos
          {pagados > 0 ? <span className="text-zinc-500"> · hacen falta {Math.max(pagados, 2)}</span> : null}
        </Requisito>
      </ul>

      <div className="relative">
        {/* Halo que respira detrás del botón cuando ya se puede sortear. */}
        {listo ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1.5 rounded-[26px] bg-[#8cff59]/25 blur-xl motion-safe:animate-pulse"
          />
        ) : null}
        <button
          type="button"
          disabled={bloqueado || pendiente}
          onClick={alTocar}
          className="neon-button relative flex min-h-16 w-full items-center justify-center gap-3 overflow-hidden rounded-[22px] px-5 py-4 text-xl font-bold tracking-tight transition-transform duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {/* Reflejo que cruza el botón, como un barrido de radar. */}
          {listo && !pendiente ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent motion-safe:animate-[a51-nav-glide_2.8s_ease-in-out_infinite] motion-reduce:hidden"
            />
          ) : null}
          {pendiente ? (
            <span
              aria-hidden="true"
              className="h-5 w-5 rounded-full border-2 border-[#07130a]/30 border-t-[#07130a] motion-safe:animate-[a51-spin_0.7s_linear_infinite]"
            />
          ) : (
            <svg viewBox="0 0 24 24" className="relative h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span className="relative">{pendiente ? "Sorteando…" : "Hacer el sorteo"}</span>
        </button>
      </div>

      {motivo ? <p className="text-sm text-zinc-400">{motivo}</p> : null}
      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Requisito({ ok, href, children }: { ok: boolean; href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className={`flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/[0.04] ${
          ok ? "border-[#8cff59]/25 bg-[#8cff59]/[0.06]" : "border-amber-500/30 bg-amber-500/[0.06]"
        }`}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            ok ? "bg-[#8cff59] text-[#07130a]" : "border border-amber-400/60 text-amber-300"
          }`}
          aria-hidden="true"
        >
          {ok ? (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className="text-xs font-bold">!</span>
          )}
        </span>
        <span className="min-w-0">{children}</span>
        <span className="sr-only">{ok ? "(listo)" : "(falta)"}</span>
      </a>
    </li>
  );
}
