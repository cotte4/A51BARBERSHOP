"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import {
  calcularEstadoRepago,
  convertirMontoAUsd,
  formatUSD,
  type PagoRepago,
  type PlanRepago,
} from "@/lib/amortizacion";
import type { RegistrarCuotaState } from "./actions";

interface RegistrarPagoFormProps {
  action: (
    prevState: RegistrarCuotaState,
    formData: FormData
  ) => Promise<RegistrarCuotaState>;
  plan: PlanRepago;
  /** Pagos ya registrados (USD) — para calcular el interés a la fecha elegida */
  pagos: PagoRepago[];
  /** "YYYY-MM-DD" de hoy en Argentina */
  hoy: string;
  /** TC del sistema (punto medio del blue). null si DolarAPI no respondió. */
  tcSistema: number | null;
  /** TC configurado en el negocio — solo como placeholder del input. */
  tcReferencia: number;
}

type Moneda = "USD" | "ARS";

// ARS entero. La forma del número ya dice qué moneda es.
function formatARS(value: number) {
  return "$ " + Math.round(value).toLocaleString("es-AR");
}

function formatEnMoneda(value: number, moneda: Moneda) {
  return moneda === "ARS" ? formatARS(value) : formatUSD(value);
}

function formatFechaCorta(value: string) {
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export default function RegistrarPagoForm({
  action,
  plan,
  pagos,
  hoy,
  tcSistema,
  tcReferencia,
}: RegistrarPagoFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  const ultimaFecha = pagos.reduce<string | null>(
    (max, pago) => (max === null || pago.fecha > max ? pago.fecha : max),
    null
  );

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [moneda, setMoneda] = useState<Moneda | null>(null);
  const [monto, setMonto] = useState("");
  const [fechaPago, setFechaPago] = useState(hoy);
  const [tcInput, setTcInput] = useState(tcSistema ? String(tcSistema) : "");
  const [notas, setNotas] = useState("");

  const tc = Number(tcInput) || 0;
  const montoNum = Number(monto) || 0;
  const montoUsd = moneda === "ARS" ? (tc > 0 ? convertirMontoAUsd(montoNum, "ARS", tc) : 0) : montoNum;

  const fechaValida =
    /^\d{4}-\d{2}-\d{2}$/.test(fechaPago) &&
    fechaPago <= hoy &&
    (ultimaFecha === null || fechaPago >= ultimaFecha);

  // Estado de la deuda al día del pago (interés corrido hasta esa fecha)
  const estadoAlDia = useMemo(
    () => calcularEstadoRepago(plan, pagos, fechaValida ? fechaPago : hoy),
    [plan, pagos, fechaPago, fechaValida, hoy]
  );

  // Cómo quedaría si se registra este pago
  const preview = useMemo(() => {
    if (!fechaValida || montoUsd <= 0) return null;
    const estado = calcularEstadoRepago(plan, [...pagos, { fecha: fechaPago, montoUsd }], fechaPago);
    return { estado, aplicacion: estado.aplicaciones.at(-1) ?? null };
  }, [plan, pagos, fechaPago, fechaValida, montoUsd]);

  const superaLoQueFalta = montoUsd > estadoAlDia.totalParaCancelar + 0.005;

  const enMoneda = (usd: number, m: Moneda) => (m === "ARS" ? usd * tc : usd);
  const redondear = (value: number, m: Moneda) =>
    m === "ARS" ? String(Math.round(value)) : value.toFixed(2);

  const elegirMoneda = (m: Moneda) => {
    setMoneda(m);
    setMonto(tc > 0 || m === "USD" ? redondear(enMoneda(estadoAlDia.cuotaSugerida, m), m) : "");
    setStep(2);
  };

  const sugerencias = moneda
    ? [
        {
          id: "sugerida",
          label: `Cuota sugerida (${formatEnMoneda(enMoneda(estadoAlDia.cuotaSugerida, moneda), moneda)})`,
          value: enMoneda(estadoAlDia.cuotaSugerida, moneda),
        },
        {
          id: "total",
          label: `Cancelar todo (${formatEnMoneda(enMoneda(estadoAlDia.totalParaCancelar, moneda), moneda)})`,
          value: enMoneda(estadoAlDia.totalParaCancelar, moneda),
        },
        { id: "other", label: "Otro monto", value: null as number | null },
      ]
    : [];

  // Tras un pago exitoso, volvemos al inicio del wizard.
  useEffect(() => {
    if (state.success) {
      setStep(1);
      setMoneda(null);
      setMonto("");
      setNotas("");
      setFechaPago(hoy);
    }
  }, [state.success, hoy]);

  const montoValido = montoNum > 0 && !superaLoQueFalta;
  const tcValido = tc > 0;
  const puedeSeguir = montoValido && tcValido && fechaValida;

  return (
    <form action={formAction} className="space-y-4">
      {/* Campos reales enviados al server action */}
      <input type="hidden" name="moneda" value={moneda ?? "USD"} />
      <input type="hidden" name="monto" value={monto} />
      <input type="hidden" name="tcDia" value={tc || ""} />
      <input type="hidden" name="fechaPago" value={fechaPago} />
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

      {/* PASO 2 — ¿Cuándo y cuánto? */}
      {step === 2 && moneda ? (
        <div className="space-y-4">
          <StepTitle n={2} title="¿Cuándo y cuánto pagaron?" />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-zinc-800 bg-zinc-900/60 p-4">
              <label htmlFor="fechaPago" className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Día que recibiste la plata
              </label>
              <input
                id="fechaPago"
                type="date"
                value={fechaPago}
                min={ultimaFecha ?? undefined}
                max={hoy}
                onChange={(event) => setFechaPago(event.target.value)}
                className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 text-base text-white outline-none transition focus:border-[#8cff59]/60 [color-scheme:dark]"
              />
              {!fechaValida ? (
                <p className="mt-2 text-xs text-red-300">
                  {fechaPago > hoy
                    ? "No puede ser una fecha futura."
                    : `No puede ser anterior al último pago (${ultimaFecha ? formatFechaCorta(ultimaFecha) : "-"}).`}
                </p>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">
                  El interés se calcula hasta este día.
                </p>
              )}
            </div>

            <div className="rounded-[22px] border border-zinc-800 bg-zinc-900/60 p-4">
              <label htmlFor="tcDia" className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Dólar de ese día
              </label>
              <input
                id="tcDia"
                type="number"
                min="1"
                step="0.01"
                value={tcInput}
                onChange={(event) => setTcInput(event.target.value)}
                placeholder={`Ej: ${Math.round(tcReferencia)}`}
                className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 text-base text-white outline-none transition focus:border-[#8cff59]/60"
              />
              <p className="mt-2 text-xs text-zinc-500">
                {tcSistema
                  ? `Blue promedio de hoy: ${formatARS(tcSistema)}. Cambialo si acordaron otro.`
                  : "No pudimos traer la cotización automática. Cargala a mano."}
                {moneda === "USD" ? " En dólares solo sirve para ver el equivalente en pesos." : ""}
              </p>
            </div>
          </div>

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
            {superaLoQueFalta ? (
              <p className="mt-2 text-xs text-red-300">
                Es más de lo que falta. Para cancelar todo al {formatFechaCorta(fechaPago)} alcanza con{" "}
                {formatEnMoneda(enMoneda(estadoAlDia.totalParaCancelar, moneda), moneda)}.
              </p>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">
                Cualquier monto sirve: primero cubre el interés corrido y el resto baja la deuda.
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={!puedeSeguir}
            onClick={() => setStep(3)}
            className="neon-button inline-flex min-h-[52px] w-full items-center justify-center rounded-[20px] px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continuar
          </button>
        </div>
      ) : step > 2 && moneda ? (
        <SummaryRow
          label="Pagan"
          value={`${formatEnMoneda(montoNum, moneda)} el ${formatFechaCorta(fechaPago)}`}
          onEdit={() => setStep(2)}
        />
      ) : null}

      {/* PASO 3 — Confirmación */}
      {step === 3 && moneda && preview?.aplicacion ? (
        <div className="space-y-4">
          <StepTitle n={3} title="Confirmá el pago" />

          <div className="rounded-[24px] border border-[#8cff59]/25 bg-[#8cff59]/8 p-5">
            <p className="text-sm leading-6 text-zinc-200">
              Pagan{" "}
              <strong className="font-semibold text-white">{formatEnMoneda(montoNum, moneda)}</strong>
              {moneda === "ARS" ? <> al dólar {formatARS(tc)}</> : null} ={" "}
              <strong className="font-semibold text-[#8cff59]">{formatUSD(montoUsd)}</strong>.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <BreakdownRow
                label={`Interés de ${preview.aplicacion.dias} días`}
                value={formatUSD(preview.aplicacion.interes)}
              />
              <BreakdownRow label="Baja la deuda" value={formatUSD(preview.aplicacion.capital)} strong />
              <BreakdownRow
                label="Deuda después del pago"
                value={
                  preview.estado.pagadoCompleto ? "¡Saldada!" : formatUSD(preview.estado.saldoCapital)
                }
              />
            </div>
            {moneda === "USD" && tc > 0 ? (
              <p className="mt-3 text-xs text-zinc-500">
                Equivale a {formatARS(montoUsd * tc)} al dólar {formatARS(tc)}.
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
              placeholder="Efectivo, transferencia, referencia..."
              className="mt-3 w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]/60"
            />
          </details>

          <button
            type="submit"
            disabled={isPending || !puedeSeguir}
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

function BreakdownRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-2">
      <span className="text-zinc-400">{label}</span>
      <span className={strong ? "font-semibold text-[#8cff59]" : "font-medium text-white"}>{value}</span>
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
