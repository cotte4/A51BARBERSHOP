"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import type { RegistrarCuotaState } from "./actions";

interface RegistrarPagoFormProps {
  action: (
    prevState: RegistrarCuotaState,
    formData: FormData
  ) => Promise<RegistrarCuotaState>;
  cuotaTotalDefault: number;
  /** TC del sistema (punto medio del blue). null si DolarAPI no respondió. */
  tcSistema: number | null;
  /** TC configurado en el negocio — fallback para el input manual. */
  tcReferencia: number;
}

type Moneda = "USD" | "ARS";

// USD con 2 decimales; ARS entero. La forma del número ya dice qué moneda es.
function formatUSD(value: number) {
  return (
    "u$d " +
    value.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatARS(value: number) {
  return "$ " + Math.round(value).toLocaleString("es-AR");
}

function formatEnMoneda(value: number, moneda: Moneda) {
  return moneda === "ARS" ? formatARS(value) : formatUSD(value);
}

export default function RegistrarPagoForm({
  action,
  cuotaTotalDefault,
  tcSistema,
  tcReferencia,
}: RegistrarPagoFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [moneda, setMoneda] = useState<Moneda | null>(null);
  const [monto, setMonto] = useState("");
  const [tcManual, setTcManual] = useState("");
  const [notas, setNotas] = useState("");

  // TC efectivo: el del sistema, o el manual si la cotización online falló.
  const tc = tcSistema ?? (Number(tcManual) || 0);
  const necesitaTcManual = tcSistema === null;

  const montoNum = Number(monto) || 0;
  const montoUsd =
    moneda === "ARS" ? (tc > 0 ? montoNum / tc : 0) : montoNum;
  const montoArs = moneda === "ARS" ? montoNum : montoNum * tc;

  // La cuota está en USD; si pagan en pesos, la expresamos con el TC del día.
  const cuotaEnMoneda = (m: Moneda) =>
    m === "ARS" ? cuotaTotalDefault * tc : cuotaTotalDefault;

  const redondear = (value: number, m: Moneda) =>
    m === "ARS" ? String(Math.round(value)) : value.toFixed(2);

  const elegirMoneda = (m: Moneda) => {
    setMoneda(m);
    // Preseleccionamos la cuota completa: el camino feliz queda en pocos taps.
    setMonto(redondear(cuotaEnMoneda(m), m));
    setStep(2);
  };

  const sugerencias = useMemo(() => {
    if (!moneda) return [];
    const full = cuotaEnMoneda(moneda);
    return [
      { id: "full", label: `Cuota completa (${formatEnMoneda(full, moneda)})`, value: full },
      { id: "half", label: `La mitad (${formatEnMoneda(full / 2, moneda)})`, value: full / 2 },
      { id: "other", label: "Otro monto", value: null as number | null },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moneda, cuotaTotalDefault, tc]);

  // Tras un pago exitoso, volvemos al inicio del wizard.
  useEffect(() => {
    if (state.success) {
      setStep(1);
      setMoneda(null);
      setMonto("");
      setNotas("");
    }
  }, [state.success]);

  const montoValido = montoNum > 0;
  const tcValido = tc > 0;

  return (
    <form action={formAction} className="space-y-4">
      {/* Campos reales enviados al server action */}
      <input type="hidden" name="moneda" value={moneda ?? "USD"} />
      <input type="hidden" name="monto" value={monto} />
      <input type="hidden" name="tcDia" value={tc || ""} />
      <input type="hidden" name="notas" value={notas} />

      {state.error ? (
        <div className="rounded-[24px] border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-[24px] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          ¡Listo! Pago registrado.
        </div>
      ) : null}

      {/* PASO 1 — ¿En qué pagaron? */}
      {step === 1 ? (
        <div className="space-y-3">
          <StepTitle n={1} title="¿En qué pagaron?" />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => elegirMoneda("ARS")}
              className="flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-[24px] border border-zinc-700 bg-zinc-900 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              <span className="text-2xl font-bold text-white">$</span>
              <span className="text-sm font-semibold text-zinc-200">Pesos</span>
            </button>
            <button
              type="button"
              onClick={() => elegirMoneda("USD")}
              className="flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-[24px] border border-[#8cff59]/40 bg-[#8cff59]/10 transition hover:border-[#8cff59]/70 hover:bg-[#8cff59]/15"
            >
              <span className="text-2xl font-bold text-[#8cff59]">u$d</span>
              <span className="text-sm font-semibold text-[#b9ff96]">Dólares</span>
            </button>
          </div>
        </div>
      ) : (
        <SummaryRow
          label="Pagan en"
          value={moneda === "ARS" ? "Pesos" : "Dólares"}
          onEdit={() => setStep(1)}
        />
      )}

      {/* PASO 2 — ¿Cuánto? */}
      {step === 2 && moneda ? (
        <div className="space-y-4">
          <StepTitle n={2} title="¿Cuánto pagaron?" />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {sugerencias.map((option) => {
              const selected =
                option.value !== null &&
                Math.abs(Number(monto) - Number(redondear(option.value, moneda))) < 0.005;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    if (option.value !== null) setMonto(redondear(option.value, moneda));
                    else setMonto("");
                  }}
                  className={[
                    "rounded-[20px] border px-3 py-3 text-left transition",
                    selected
                      ? "border-[#8cff59]/35 bg-[#8cff59]/10"
                      : "border-zinc-700 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800",
                  ].join(" ")}
                >
                  <span className={`block text-sm font-semibold ${selected ? "text-white" : "text-zinc-100"}`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-[22px] border border-zinc-800 bg-zinc-900/60 p-4">
            <label htmlFor="montoVisible" className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Monto en {moneda === "ARS" ? "pesos" : "dólares"}
            </label>
            <div className="relative">
              <span
                className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${
                  moneda === "ARS" ? "text-zinc-400" : "text-[#8cff59]"
                }`}
              >
                {moneda === "ARS" ? "$" : "u$d"}
              </span>
              <input
                id="montoVisible"
                type="number"
                min="0.01"
                step={moneda === "ARS" ? "1" : "0.01"}
                value={monto}
                onChange={(event) => setMonto(event.target.value)}
                placeholder="0"
                className={`min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 text-base text-white outline-none transition focus:border-[#8cff59]/60 ${
                  moneda === "ARS" ? "pl-9" : "pl-14"
                }`}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Si este mes no llegan a la cuota, no pasa nada: lo que pongas descuenta igual.
            </p>
          </div>

          {/* TC del día — informativo, no editable (salvo que la cotización falle) */}
          {necesitaTcManual ? (
            <div className="rounded-[22px] border border-amber-500/30 bg-amber-500/10 p-4">
              <label htmlFor="tcManual" className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                Dólar de hoy
              </label>
              <p className="mb-2 text-xs text-amber-100/80">
                No pudimos traer la cotización automática. Cargá el dólar blue de hoy a mano.
              </p>
              <input
                id="tcManual"
                type="number"
                min="1"
                step="1"
                value={tcManual}
                onChange={(event) => setTcManual(event.target.value)}
                placeholder={`Ej: ${Math.round(tcReferencia)}`}
                className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 text-base text-white outline-none transition focus:border-[#8cff59]/60"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Dólar de hoy</p>
                <p className="text-xs text-zinc-600">Blue promedio (compra/venta)</p>
              </div>
              <span className="text-lg font-semibold text-white">{formatARS(tc)}</span>
            </div>
          )}

          <button
            type="button"
            disabled={!montoValido || !tcValido}
            onClick={() => setStep(3)}
            className="neon-button inline-flex min-h-[52px] w-full items-center justify-center rounded-[20px] px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continuar
          </button>
        </div>
      ) : step > 2 && moneda ? (
        <SummaryRow
          label="Pagan"
          value={formatEnMoneda(montoNum, moneda)}
          onEdit={() => setStep(2)}
        />
      ) : null}

      {/* PASO 3 — Confirmación */}
      {step === 3 && moneda ? (
        <div className="space-y-4">
          <StepTitle n={3} title="Confirmá el pago" />

          <div className="rounded-[24px] border border-[#8cff59]/25 bg-[#8cff59]/8 p-5">
            <p className="text-sm leading-6 text-zinc-200">
              Pagan{" "}
              <strong className="font-semibold text-white">{formatEnMoneda(montoNum, moneda)}</strong>
              {moneda === "ARS" ? (
                <>
                  {" "}al dólar de hoy ({formatARS(tc)})
                </>
              ) : null}{" "}
              →{" "}
              <strong className="font-semibold text-[#8cff59]">
                baja {formatUSD(montoUsd)}
              </strong>{" "}
              de la deuda.
            </p>
            {moneda === "USD" ? (
              <p className="mt-2 text-xs text-zinc-500">
                Equivale a {formatARS(montoArs)} al dólar de hoy ({formatARS(tc)}).
              </p>
            ) : null}
          </div>

          <details className="rounded-[22px] border border-zinc-800 bg-zinc-900/60 p-4">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 [&::-webkit-details-marker]:hidden">
              Agregar nota (opcional)
            </summary>
            <textarea
              rows={2}
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
              placeholder="Transferencia, referencia, ajuste acordado..."
              className="mt-3 w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]/60"
            />
          </details>

          <button
            type="submit"
            disabled={isPending || !montoValido || !tcValido}
            className="neon-button inline-flex min-h-[52px] w-full items-center justify-center rounded-[20px] px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Registrando..." : "Registrar pago"}
          </button>
        </div>
      ) : null}
    </form>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#8cff59] text-sm font-bold text-[#07130a]">
        {n}
      </span>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <span className="text-sm text-zinc-400">
        {label} <strong className="font-semibold text-white">{value}</strong>
      </span>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs font-semibold text-zinc-400 transition hover:text-[#8cff59]"
      >
        cambiar
      </button>
    </div>
  );
}
