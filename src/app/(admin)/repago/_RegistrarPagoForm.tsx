"use client";

import { useActionState, useMemo, useState } from "react";
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
    <form action={formAction} className="flex flex-col gap-5">
      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Pago registrado correctamente.
        </div>
      ) : null}

      <section className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
          Monto sugerido
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {suggestedAmounts.map((option) => {
            const selected = Number(montoPagadoUsd) === option.value;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMontoPagadoUsd(option.value.toFixed(2))}
                className={`rounded-[22px] border px-4 py-4 text-left transition ${
                  selected
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-900 hover:border-stone-300 hover:bg-stone-100"
                }`}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className={`mt-2 block text-lg font-semibold ${selected ? "text-white" : "text-stone-950"}`}>
                  {formatUSD(option.value)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2">
            <label htmlFor="montoPagadoUsd" className="text-sm font-medium text-stone-700">
              Monto pagado <span className="text-xs text-stone-400">(u$d)</span>{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
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
                className="min-h-[52px] w-full rounded-xl border border-stone-300 px-4 pl-14 text-base text-stone-900 outline-none focus:border-stone-900"
              />
            </div>
            <p className="text-xs text-stone-500">
              La cuota sugerida actual es {formatUSD(cuotaTotalDefault)}.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <label htmlFor="tcDia" className="text-sm font-medium text-stone-700">
              TC del dia <span className="text-xs text-stone-400">(ARS por USD)</span>{" "}
              <span className="text-red-500">*</span>
            </label>
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
              className="min-h-[52px] w-full rounded-xl border border-stone-300 px-4 text-base text-stone-900 outline-none focus:border-stone-900"
            />
            <div className="flex flex-wrap gap-2">
              {suggestedTcs.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTcDia(String(value))}
                  className={`rounded-full px-3 py-2 text-sm transition ${
                    tcDia === String(value)
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  ${value.toLocaleString("es-AR")}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-500">
              Elegi un preset o carga el tipo de cambio real del pago.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <label htmlFor="notas" className="text-sm font-medium text-stone-700">
              Notas <span className="text-xs text-stone-400">(opcional)</span>
            </label>
            <textarea
              id="notas"
              name="notas"
              rows={3}
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
              placeholder="Ej: Transferencia, referencia, ajuste acordado, observacion interna."
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-900 resize-none"
            />
          </div>
        </section>

        <section className="rounded-[24px] bg-stone-950 p-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-300">
            Impacto del pago
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight">Resumen previo</h3>
          <p className="mt-2 text-sm text-stone-300">
            Antes de confirmar, chequea cuanto entra en USD y a cuanto equivale hoy en pesos.
          </p>

          <div className="mt-5 space-y-3">
            <ImpactRow label="Monto en USD" value={montoNumber > 0 ? formatUSD(montoNumber) : "Pendiente"} />
            <ImpactRow
              label="TC del dia"
              value={tcNumber > 0 ? `$${tcNumber.toLocaleString("es-AR")}` : "Pendiente"}
            />
            <ImpactRow
              label="Equivalente en ARS"
              value={montoNumber > 0 && tcNumber > 0 ? formatARS(montoArs) : "Completa ambos datos"}
              strong
            />
            <ImpactRow
              label="Notas"
              value={notas.trim() ? "Se guardan con el pago" : "Sin notas"}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-emerald-400 px-5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-50"
          >
            {isPending ? "Registrando pago..." : "Registrar pago"}
          </button>
        </section>
      </div>
    </form>
  );
}

function ImpactRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`rounded-[18px] px-4 py-3 ${strong ? "bg-white/12" : "bg-white/6"}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-stone-300">{label}</p>
      <p className={`mt-2 ${strong ? "text-xl font-semibold" : "text-base font-medium"} text-white`}>
        {value}
      </p>
    </div>
  );
}
