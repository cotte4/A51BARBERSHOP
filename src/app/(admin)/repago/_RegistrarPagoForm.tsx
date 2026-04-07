"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
import type { RegistrarCuotaState } from "./actions";

interface RegistrarPagoFormProps {
  action: (
    prevState: RegistrarCuotaState,
    formData: FormData
  ) => Promise<RegistrarCuotaState>;
  cuotaTotalDefault: number;
}

function formatUSD(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  })
    .format(value)
    .replace("US$", "u$d ");
}

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

function FieldBlock({
  htmlFor,
  label,
  description,
  error,
  children,
}: {
  htmlFor: string;
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="space-y-1">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-200">
          {label}
        </label>
        {description ? <p className="text-xs leading-5 text-zinc-500">{description}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

export default function RegistrarPagoForm({
  action,
  cuotaTotalDefault,
}: RegistrarPagoFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [montoPagadoUsd, setMontoPagadoUsd] = useState(cuotaTotalDefault.toFixed(2));
  const [tcDia, setTcDia] = useState("");
  const [notas, setNotas] = useState("");

  const montoNumber = Number(montoPagadoUsd) || 0;
  const tcNumber = Number(tcDia) || 0;
  const montoArs = montoNumber * tcNumber;
  const saldoRestante = Math.max(0, cuotaTotalDefault - montoNumber);
  const progresoCuota = cuotaTotalDefault > 0 ? Math.min(100, (montoNumber / cuotaTotalDefault) * 100) : 0;
  const statusLabel =
    montoNumber <= 0
      ? "Pendiente"
      : montoNumber >= cuotaTotalDefault
        ? "Cuota completa"
        : "Pago parcial";

  const suggestedAmounts = useMemo(
    () => [
      {
        id: "full",
        label: "Cuota completa",
        value: cuotaTotalDefault,
      },
      {
        id: "round-up",
        label: "Cuota + 10%",
        value: Number((cuotaTotalDefault * 1.1).toFixed(2)),
      },
      {
        id: "half",
        label: "Media cuota",
        value: Number((cuotaTotalDefault / 2).toFixed(2)),
      },
    ],
    [cuotaTotalDefault]
  );
  const suggestedTcs = [1100, 1200, 1250];

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-[24px] border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-[24px] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Pago registrado correctamente.
        </div>
      ) : null}

      <section className="rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.12),_transparent_28%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.98))] p-5">
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5">
          <div className="space-y-2">
            <p className="eyebrow text-xs font-semibold">Registro de cuota</p>
            <h3 className="font-display text-2xl font-semibold tracking-tight text-white">
              Registrar pago
            </h3>
            <p className="max-w-2xl text-sm leading-6 text-zinc-400">
              Cargá USD, tipo de cambio y notas. El resumen de abajo te muestra el impacto en
              pesos antes de confirmar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric
              label="Cuota sugerida"
              value={formatUSD(cuotaTotalDefault)}
              helper="Base del cronograma"
            />
            <MiniMetric
              label="Saldo restante"
              value={formatUSD(saldoRestante)}
              helper={montoNumber > 0 ? "Se recalcula en vivo" : "Se ajusta al cargar USD"}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="space-y-5">
            <section className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Monto sugerido
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Elegi una referencia rapida y despues ajustala si el pago fue parcial.
                  </p>
                </div>
                <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                  {statusLabel}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {suggestedAmounts.map((option) => {
                  const selected = Number(montoPagadoUsd) === option.value;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setMontoPagadoUsd(option.value.toFixed(2))}
                      className={[
                        "rounded-[22px] border px-4 py-4 text-left transition",
                        selected
                          ? "border-[#8cff59]/35 bg-[#8cff59]/10 text-white"
                          : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className={`mt-2 block text-lg font-semibold ${selected ? "text-white" : "text-zinc-50"}`}>
                        {formatUSD(option.value)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldBlock
                htmlFor="montoPagadoUsd"
                label="Monto pagado"
                description="Se guarda en USD y luego se convierte a ARS con el TC del dia."
              >
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                    u$d
                  </span>
                  <input
                    id="montoPagadoUsd"
                    name="montoPagadoUsd"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={montoPagadoUsd}
                    onChange={(event) => setMontoPagadoUsd(event.target.value)}
                    placeholder="0.00"
                    className="min-h-[52px] w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 pl-14 text-base text-white outline-none transition focus:border-[#8cff59]/60"
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  La cuota sugerida actual es {formatUSD(cuotaTotalDefault)}.
                </p>
              </FieldBlock>

              <FieldBlock
                htmlFor="tcDia"
                label="TC del dia"
                description="ARS por USD. Usalo para traducir el pago al monto local."
              >
                <input
                  id="tcDia"
                  name="tcDia"
                  type="number"
                  min="1"
                  step="1"
                  value={tcDia}
                  onChange={(event) => setTcDia(event.target.value)}
                  placeholder="Ej: 1200"
                  required
                  className="min-h-[52px] w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-base text-white outline-none transition focus:border-[#8cff59]/60"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestedTcs.map((value) => {
                    const selected = tcDia === String(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTcDia(String(value))}
                        className={[
                          "rounded-full px-3 py-2 text-sm transition",
                          selected
                            ? "bg-[#8cff59]/10 text-[#b9ff96]"
                            : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
                        ].join(" ")}
                      >
                        ${value.toLocaleString("es-AR")}
                      </button>
                    );
                  })}
                </div>
              </FieldBlock>
            </div>

            <FieldBlock
              htmlFor="notas"
              label="Notas"
              description="Opcional. Sirve para dejar referencia interna del pago."
            >
              <textarea
                id="notas"
                name="notas"
                rows={4}
                value={notas}
                onChange={(event) => setNotas(event.target.value)}
                placeholder="Ej: Transferencia, referencia, ajuste acordado, observacion interna."
                className="w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]/60"
              />
            </FieldBlock>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[24px] border border-[#8cff59]/20 bg-[#8cff59]/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8cff59]">
                Impacto del pago
              </p>
              <h4 className="mt-2 text-xl font-semibold text-white">Resumen previo</h4>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Antes de confirmar, chequea cuanto entra en USD y a cuanto equivale hoy en pesos.
              </p>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-[#8cff59] transition-all"
                  style={{ width: `${progresoCuota}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {progresoCuota.toFixed(0)}% de la cuota sugerida.
              </p>

              <div className="mt-4 space-y-3">
                <MetricLine label="Monto en USD" value={montoNumber > 0 ? formatUSD(montoNumber) : "Pendiente"} />
                <MetricLine
                  label="TC del dia"
                  value={tcNumber > 0 ? `$${tcNumber.toLocaleString("es-AR")}` : "Pendiente"}
                />
                <MetricLine
                  label="Equivalente en ARS"
                  value={montoNumber > 0 && tcNumber > 0 ? formatARS(montoArs) : "Completa ambos datos"}
                />
                <MetricLine label="Saldo restante" value={formatUSD(saldoRestante)} />
                <MetricLine label="Notas" value={notas.trim() ? "Se guardan con el pago" : "Sin notas"} />
              </div>
            </section>

            <section className="rounded-[24px] border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Checklist
              </p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
                <p>Usa una cuota completa si el pago cubre el saldo sugerido.</p>
                <p>Si el pago es parcial, deja la nota para no perder contexto.</p>
                <p>El monto en ARS se calcula en vivo con el TC elegido.</p>
              </div>
            </section>

            <button
              type="submit"
              disabled={isPending}
              className="neon-button inline-flex min-h-[54px] w-full items-center justify-center rounded-[20px] px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Registrando pago..." : "Registrar pago"}
            </button>
          </aside>
        </div>
      </section>
    </form>
  );
}

function MetricLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}
