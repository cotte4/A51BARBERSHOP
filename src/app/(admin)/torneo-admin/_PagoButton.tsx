"use client";

import { useOptimistic, useState, useTransition } from "react";
import { eliminarJugadorAction, marcarPagoAction } from "./actions";

type PagoButtonProps = {
  jugadorId: string;
  nombre: string;
  pagado: boolean;
  disabled?: boolean;
  /** Ya hay 16 pagados: a uno pendiente no se lo puede marcar (el servidor también lo rechaza). */
  cupoLleno?: boolean;
};

/**
 * Interruptor grande "Sin pagar | Pagó" para el celular. Cambia al toque (optimista) y, si el
 * servidor no acepta, vuelve solo y muestra por qué.
 */
export default function PagoButton({ jugadorId, nombre, pagado, disabled = false, cupoLleno = false }: PagoButtonProps) {
  const [pendiente, startTransition] = useTransition();
  const [pagadoVista, setPagadoVista] = useOptimistic(pagado);
  const [error, setError] = useState<string | null>(null);

  const bloqueadoPorCupo = !pagado && cupoLleno;
  const apagado = disabled || pendiente || bloqueadoPorCupo;

  function alTocar() {
    if (pagado && !window.confirm(`¿Deshacer el pago de ${nombre}?`)) return;
    setError(null);
    startTransition(async () => {
      setPagadoVista(!pagado);
      const resultado = await marcarPagoAction(jugadorId, !pagado);
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  function alSacar() {
    if (!window.confirm(`¿Sacar a ${nombre} de la lista? Esto no se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      const resultado = await eliminarJugadorAction(jugadorId);
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={pagadoVista}
        aria-label={`${nombre}: ${pagadoVista ? "pagó" : "sin pagar"}`}
        disabled={apagado}
        onClick={alTocar}
        className={`relative grid min-h-[52px] w-full grid-cols-2 overflow-hidden rounded-[18px] border p-1 text-base font-semibold transition-[border-color,background-color,transform] duration-200 ease-out active:scale-[0.98] disabled:cursor-not-allowed ${
          pagadoVista ? "border-[#8cff59]/45 bg-[#8cff59]/[0.07]" : "border-zinc-700 bg-zinc-900/90"
        } ${bloqueadoPorCupo ? "opacity-50" : ""}`}
      >
        {/* La perilla: se desliza al lado que corresponde. */}
        <span
          aria-hidden="true"
          className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[14px] transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            pagadoVista
              ? "translate-x-full bg-gradient-to-br from-[#8cff59] to-[#b6ff84] shadow-[0_0_0_1px_rgba(140,255,89,0.3),0_8px_24px_rgba(140,255,89,0.35)] motion-safe:animate-[a51-btn-success_0.7s_ease-out]"
              : "translate-x-0 bg-zinc-700/80"
          }`}
        />
        <span
          aria-hidden="true"
          className={`relative z-10 flex items-center justify-center transition-colors duration-200 ${pagadoVista ? "text-zinc-500" : "text-white"}`}
        >
          {bloqueadoPorCupo ? "Cupo lleno" : "Sin pagar"}
        </span>
        <span
          aria-hidden="true"
          className={`relative z-10 flex items-center justify-center gap-1.5 transition-colors duration-200 ${pagadoVista ? "text-[#07130a]" : "text-zinc-400"}`}
        >
          {pagadoVista ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="22"
                className="motion-safe:animate-[a51-check-draw_0.35s_0.12s_ease-out_both]"
              />
            </svg>
          ) : null}
          Pagó
        </span>
      </button>

      {!pagado && !disabled ? (
        <button
          type="button"
          disabled={pendiente}
          onClick={alSacar}
          className="min-h-10 self-start px-1 text-xs font-medium text-zinc-500 hover:text-red-300 disabled:opacity-60"
        >
          Sacar de la lista
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
