"use client";

import { useState, useTransition } from "react";
import { marcarPagoAction } from "./actions";

type PagoButtonProps = {
  jugadorId: string;
  nombre: string;
  pagado: boolean;
  disabled?: boolean;
};

export default function PagoButton({ jugadorId, nombre, pagado, disabled = false }: PagoButtonProps) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function alTocar() {
    if (pagado && !window.confirm(`¿Deshacer el pago de ${nombre}?`)) return;
    setError(null);
    startTransition(async () => {
      const resultado = await marcarPagoAction(jugadorId, !pagado);
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  const base = "min-h-11 min-w-[7.5rem] rounded-[20px] px-4 py-3 text-base font-semibold disabled:opacity-60";

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        disabled={disabled || pendiente}
        onClick={alTocar}
        className={pagado ? `ghost-button ${base}` : `neon-button ${base}`}
      >
        {pagado ? "Pagado ✓" : "Pagó"}
      </button>
      {error ? (
        <p className="max-w-[12rem] rounded-xl border border-red-500/35 bg-red-500/10 px-2 py-1 text-right text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
