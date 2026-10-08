"use client";

import { useState, useTransition } from "react";
import { borrarTorneoPruebaAction } from "./actions";

/** Solo aparece en un torneo de ensayo (nombre que empieza con "Prueba"). */
export default function BorrarPrueba() {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function alTocar() {
    if (!window.confirm("¿Borrar este torneo de prueba con todos sus anotados y partidos? No se puede deshacer.")) return;
    setError(null);
    startTransition(async () => {
      const resultado = await borrarTorneoPruebaAction();
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-300/80">Torneo de ensayo</p>
        <p className="mt-1 text-sm leading-6 text-zinc-400">
          Cuando termines de probar, borralo y creá el real.
        </p>
      </div>
      <button
        type="button"
        disabled={pendiente}
        onClick={alTocar}
        className="min-h-12 rounded-[18px] border border-red-500/40 bg-red-500/10 px-5 py-3 font-semibold text-red-300 transition-[transform,background-color] duration-150 hover:bg-red-500/15 active:scale-[0.98] disabled:opacity-60"
      >
        {pendiente ? "Borrando…" : "Borrar torneo de prueba"}
      </button>
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
