"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { formatARS } from "@/lib/format";
import type { CierreFormState } from "../actions";

interface CierreWizardProps {
  cerrarAction: (prevState: CierreFormState, formData: FormData) => Promise<CierreFormState>;
  totalEfectivoSistema: number;
  gastosEfectivoHoy?: number;
}

const TOLERANCIA_DIFERENCIA = 500;

function getDifferenceTone(difference: number) {
  if (Math.abs(difference) <= TOLERANCIA_DIFERENCIA) {
    return {
      label: "Cuadra",
      hint: "El efectivo coincide con lo esperado.",
      className: "border-emerald-500/30 bg-emerald-500/12 text-emerald-200",
    };
  }

  return {
    label: difference > 0 ? "Sobra" : "Falta",
    hint:
      difference > 0
        ? "Hay mas efectivo que el esperado en caja."
        : "Falta efectivo respecto a lo esperado en caja.",
    className: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  };
}

export default function CierreWizard({
  cerrarAction,
  totalEfectivoSistema,
  gastosEfectivoHoy = 0,
}: CierreWizardProps) {
  const [state, formAction, isPending] = useActionState(cerrarAction, {});
  const [step, setStep] = useState<1 | 2>(1);
  const [contado, setContado] = useState("");
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (state.error) {
      setArmed(false);
      // Si el error viene del conteo (por ejemplo, el formulario se envio sin
      // pasar por el paso 1), volvemos al paso 1 para que lo corrija.
      if (state.fieldErrors?.efectivoContado) {
        setStep(1);
      }
    }
  }, [state.error, state.fieldErrors]);

  const efectivoEsperado = totalEfectivoSistema - gastosEfectivoHoy;
  const contadoReady = contado.trim() !== "" && !isNaN(Number(contado));
  const contadoNum = contadoReady ? Number(contado) : 0;
  const diferencia = contadoNum - efectivoEsperado;
  const tone = getDifferenceTone(diferencia);

  return (
    <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
          Cierre de caja
        </p>
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
          Paso {step} de 2
        </span>
      </div>

      {step === 1 ? (
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Contá el efectivo físico</h3>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Compará lo que hay en la caja con lo que marca el sistema. No podés cerrar sin este
              paso.
            </p>
          </div>

          <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300">
            {gastosEfectivoHoy > 0 ? (
              <div className="space-y-1">
                <p>
                  Ventas en efectivo: <span className="font-semibold text-white">{formatARS(totalEfectivoSistema)}</span>
                </p>
                <p>
                  − Gastos rápidos del día: <span className="font-semibold text-white">{formatARS(gastosEfectivoHoy)}</span>
                </p>
                <p>
                  = Esperado en caja: <span className="font-semibold text-[#8cff59]">{formatARS(efectivoEsperado)}</span>
                </p>
              </div>
            ) : (
              <>
                Efectivo esperado en caja:{" "}
                <span className="font-semibold text-white">{formatARS(efectivoEsperado)}</span>
              </>
            )}
          </div>

          <div>
            <label htmlFor="efectivo-contado" className="block text-sm font-medium text-zinc-200">
              Efectivo contado físicamente
            </label>
            <div className="relative mt-3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                $
              </span>
              <input
                id="efectivo-contado"
                type="number"
                min="0"
                inputMode="numeric"
                value={contado}
                onChange={(e) => setContado(e.target.value)}
                placeholder="0"
                className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 px-4 pl-8 text-base text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]/60"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={!contadoReady}
            onClick={() => setStep(2)}
            className="neon-button inline-flex min-h-[48px] w-full items-center justify-center rounded-[20px] px-5 text-sm font-semibold text-[#07130a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continuar
          </button>
        </div>
      ) : (
        <form
          action={formAction}
          onSubmit={(event) => {
            if (!armed) {
              event.preventDefault();
              setArmed(true);
            }
          }}
          className="mt-4 space-y-4"
        >
          <input type="hidden" name="efectivoContado" value={contadoNum.toFixed(2)} />

          {state.error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/12 px-4 py-3 text-sm text-red-200">
              {state.error}
            </div>
          ) : null}

          <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
            {gastosEfectivoHoy > 0 ? (
              <div className="mb-3 space-y-1 text-sm text-zinc-300">
                <p>
                  Ventas en efectivo: <span className="font-semibold text-white">{formatARS(totalEfectivoSistema)}</span>
                </p>
                <p>
                  − Gastos rápidos del día: <span className="font-semibold text-white">{formatARS(gastosEfectivoHoy)}</span>
                </p>
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Esperado</p>
                <p className="mt-1 text-base font-semibold text-white">{formatARS(efectivoEsperado)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Contado</p>
                <p className="mt-1 text-base font-semibold text-white">{formatARS(contadoNum)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Diferencia</p>
                <p className="mt-1 text-base font-semibold text-white">
                  {`${diferencia > 0 ? "+" : ""}${formatARS(diferencia)}`}
                </p>
              </div>
            </div>

            <div
              className={`mt-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${tone.className}`}
            >
              {Math.abs(diferencia) <= TOLERANCIA_DIFERENCIA ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.5l4.5 4.5 10.5-11" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4.5M12 17h.01" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 4.2 2.9 18a1.8 1.8 0 0 0 1.6 2.7h15a1.8 1.8 0 0 0 1.6-2.7L13.4 4.2a1.8 1.8 0 0 0-2.8 0Z" />
                </svg>
              )}
              <span className="font-semibold">
                {Math.abs(diferencia) <= TOLERANCIA_DIFERENCIA
                  ? "Cuadra: el efectivo coincide con lo esperado en caja."
                  : `${tone.label} ${formatARS(Math.abs(diferencia))} — se registra en el cierre para revisar después.`}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="neon-button inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[20px] px-5 text-sm font-semibold text-[#07130a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending && (
              <svg
                style={{ animation: "a51-spin 0.65s linear infinite" }}
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.8" />
                <path d="M 7 1.5 A 5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
            <span>
              {isPending ? "Cerrando caja..." : armed ? "Confirmar cierre del día" : "Revisar y habilitar cierre"}
            </span>
          </button>

          <p className="text-xs leading-5 text-zinc-500">
            {armed
              ? "Ahora ya podés confirmar sin perder el contexto."
              : "Tocá una vez más para confirmar el cierre."}
          </p>

          <button
            type="button"
            onClick={() => {
              setStep(1);
              setArmed(false);
            }}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
          >
            Volver a contar efectivo
          </button>
        </form>
      )}
    </section>
  );
}
