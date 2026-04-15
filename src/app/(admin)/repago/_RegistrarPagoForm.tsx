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

      <div className="space-y-4">
        {/* opciones rápidas */}
        <div className="grid grid-cols-3 gap-2">
          {suggestedAmounts.map((option) => {
            const selected = Number(montoPagadoUsd) === option.value;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMontoPagadoUsd(option.value.toFixed(2))}
                className={[
                  "rounded-[20px] border px-3 py-3 text-left transition",
                  selected
                    ? "border-[#8cff59]/35 bg-[#8cff59]/10"
                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800",
                ].join(" ")}
              >
                <span className="block text-xs text-zinc-400">{option.label}</span>
                <span className={`mt-1 block text-sm font-semibold ${selected ? "text-white" : "text-zinc-100"}`}>
                  {formatUSD(option.value)}
                </span>
              </button>
            );
          })}
        </div>

        {/* monto */}
        <div className="rounded-[22px] border border-zinc-800 bg-zinc-900/60 p-4">
          <label htmlFor="montoPagadoUsd" className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Monto pagado
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">u$d</span>
            <input
              id="montoPagadoUsd"
              name="montoPagadoUsd"
              type="number"
              min="0.01"
              step="0.01"
              value={montoPagadoUsd}
              onChange={(event) => setMontoPagadoUsd(event.target.value)}
              placeholder="0.00"
              className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 pl-14 text-base text-white outline-none transition focus:border-[#8cff59]/60"
            />
          </div>
          {state.fieldErrors && "montoPagadoUsd" in (state.fieldErrors ?? {}) ? (
            <p className="mt-2 text-xs text-red-300">{(state.fieldErrors as Record<string, string>).montoPagadoUsd}</p>
          ) : null}
        </div>

        {/* TC */}
        <div className="rounded-[22px] border border-zinc-800 bg-zinc-900/60 p-4">
          <label htmlFor="tcDia" className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            TC del dia
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
            className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 text-base text-white outline-none transition focus:border-[#8cff59]/60"
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
                    "rounded-full px-3 py-1.5 text-xs font-medium transition",
                    selected
                      ? "bg-[#8cff59]/10 text-[#b9ff96]"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
                  ].join(" ")}
                >
                  ${value.toLocaleString("es-AR")}
                </button>
              );
            })}
          </div>
        </div>

        {/* preview ARS */}
        {montoNumber > 0 && tcNumber > 0 ? (
          <div className="flex items-center justify-between rounded-[20px] border border-[#8cff59]/20 bg-[#8cff59]/8 px-4 py-3">
            <span className="text-xs text-zinc-400">{formatUSD(montoNumber)} × ${tcNumber.toLocaleString("es-AR")}</span>
            <span className="text-sm font-semibold text-[#b9ff96]">{formatARS(montoArs)}</span>
          </div>
        ) : null}

        {/* notas */}
        <div className="rounded-[22px] border border-zinc-800 bg-zinc-900/60 p-4">
          <label htmlFor="notas" className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Notas <span className="normal-case tracking-normal text-zinc-600">(opcional)</span>
          </label>
          <textarea
            id="notas"
            name="notas"
            rows={2}
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
            placeholder="Transferencia, referencia, ajuste acordado..."
            className="w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]/60"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="neon-button inline-flex min-h-[52px] w-full items-center justify-center rounded-[20px] px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Registrando..." : "Registrar pago"}
        </button>
      </div>
    </form>
  );
}

