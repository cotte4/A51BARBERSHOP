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
    <div className="flex flex-col gap-2">
      <p className="text-sm text-zinc-400">
        Este es un torneo de ensayo. Cuando termines de probar, borralo y creá el real.
      </p>
      <button
        type="button"
        disabled={pendiente}
        onClick={alTocar}
        className="ghost-button min-h-11 rounded-[20px] px-5 py-3 font-semibold text-red-300 disabled:opacity-60"
      >
        {pendiente ? "Borrando…" : "Borrar torneo de prueba"}
      </button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
