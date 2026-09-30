"use client";

import { useActionState, useEffect, useState } from "react";
import { formatARS } from "@/lib/format";
import type { CierreFormState } from "../actions";

interface CierreFormProps {
  cerrarAction: (prevState: CierreFormState, formData: FormData) => Promise<CierreFormState>;
  efectivoCobrado: number;
  gastosEfectivoHoy: number;
}

// Una diferencia chica (vuelto, redondeo) no se marca como aviso
const TOLERANCIA_DIFERENCIA = 500;

export default function CierreForm({
  cerrarAction,
  efectivoCobrado,
  gastosEfectivoHoy,
}: CierreFormProps) {
  const [state, formAction, isPending] = useActionState(cerrarAction, {});
  const [contado, setContado] = useState("");
  // Cerrar no se puede deshacer: el primer toque arma, el segundo cierra
  const [armado, setArmado] = useState(false);

  useEffect(() => {
    if (state.error) setArmado(false);
  }, [state.error]);

  const esperado = efectivoCobrado - gastosEfectivoHoy;
  const contadoListo = contado.trim() !== "" && !isNaN(Number(contado)) && Number(contado) >= 0;
  const contadoNum = contadoListo ? Number(contado) : 0;
  const diferencia = Math.round((contadoNum - esperado) * 100) / 100;
  const fueraDeTolerancia = Math.abs(diferencia) > TOLERANCIA_DIFERENCIA;

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!armado) {
          event.preventDefault();
          setArmado(true);
        }
      }}
      className="panel-card rounded-[28px] p-6"
    >
      <input type="hidden" name="efectivoContado" value={contadoNum.toFixed(2)} />

      <dl className="text-base tabular-nums">
        {gastosEfectivoHoy > 0 ? (
          <>
            <div className="flex items-baseline justify-between gap-4 py-1.5">
              <dt className="text-zinc-300">Cobrado en efectivo</dt>
              <dd className="text-white">{formatARS(efectivoCobrado)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-1.5">
              <dt className="text-zinc-300">Gastos de hoy</dt>
              <dd className="text-white">− {formatARS(gastosEfectivoHoy)}</dd>
            </div>
          </>
        ) : null}
        <div className="flex items-baseline justify-between gap-4 py-1.5">
          <dt className="text-zinc-200">En efectivo debería haber</dt>
          <dd className="font-display text-3xl font-bold text-white">{formatARS(esperado)}</dd>
        </div>
      </dl>

      <label htmlFor="efectivo-contado" className="mt-5 block text-base font-medium text-white">
        ¿Cuánto contaste?
      </label>
      <div className="relative mt-2">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-zinc-400">$</span>
        <input
          id="efectivo-contado"
          type="number"
          min="0"
          inputMode="numeric"
          value={contado}
          onChange={(event) => {
            setContado(event.target.value);
            setArmado(false);
          }}
          placeholder="0"
          className="min-h-[56px] w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 px-4 pl-9 text-xl font-semibold tabular-nums text-white outline-none transition placeholder:text-zinc-500 focus:border-[#8cff59]/60"
        />
      </div>

      {contadoListo ? (
        <p
          role="status"
          className={`mt-3 text-sm font-medium ${fueraDeTolerancia ? "text-amber-300" : "text-zinc-200"}`}
        >
          {diferencia === 0
            ? "✓ Coincide."
            : `${fueraDeTolerancia ? "! " : ""}${diferencia < 0 ? "Faltan" : "Sobran"} ${formatARS(
                Math.abs(diferencia)
              )}. Se puede cerrar igual: queda anotado.`}
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className="mt-3 rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!contadoListo || isPending}
        className="neon-button mt-5 inline-flex min-h-[56px] w-full items-center justify-center rounded-[20px] px-5 text-lg font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Cerrando…" : armado ? "Sí, cerrar la caja de hoy" : "Cerrar caja"}
      </button>
      <p className="mt-3 text-sm text-zinc-300">Después de cerrar no se puede cobrar más hoy.</p>
    </form>
  );
}
