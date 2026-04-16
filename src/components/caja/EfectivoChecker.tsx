"use client";

import { useState } from "react";
import { formatARS } from "@/lib/format";

function getDifferenceTone(difference: number, contadoReady: boolean) {
  if (!contadoReady) {
    return {
      label: "Pendiente",
      hint: "Cargá el efectivo físico antes de cerrar.",
      className: "border-zinc-800 bg-zinc-950/70 text-zinc-300",
    };
  }

  if (difference === 0) {
    return {
      label: "Cuadra",
      hint: "El efectivo coincide con el sistema.",
      className: "border-emerald-500/30 bg-emerald-500/12 text-emerald-200",
    };
  }

  return {
    label: difference > 0 ? "Sobra" : "Falta",
    hint:
      difference > 0
        ? "Hay mas efectivo que el que marca el sistema."
        : "Falta efectivo respecto al sistema.",
    className: "border-amber-500/30 bg-amber-500/12 text-amber-200",
  };
}

export default function EfectivoChecker({
  totalEfectivoSistema,
}: {
  totalEfectivoSistema: number;
}) {
  const [contado, setContado] = useState("");

  const contadoNum = Number(contado) || 0;
  const diferencia = contadoNum - totalEfectivoSistema;
  const contadoReady = contado.trim() !== "";
  const tone = getDifferenceTone(diferencia, contadoReady);

  return (
    <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Control de efectivo
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">Chequeo antes de cerrar</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Compara lo que marca el sistema con lo que hay fisicamente en caja.
          </p>
        </div>

        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone.className}`}>
          {tone.label}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Sistema" value={formatARS(totalEfectivoSistema)} hint="Segun registros" />
        <StatCard
          label="Contado"
          value={contadoReady ? formatARS(contadoNum) : "Pendiente"}
          hint="Efectivo fisico"
        />
        <StatCard
          label="Diferencia"
          value={
            contadoReady
              ? `${diferencia > 0 ? "+" : ""}${formatARS(diferencia)}`
              : "-"
          }
          hint={contadoReady ? tone.hint : "La diferencia aparecera al cargar un monto."}
          tone={tone.className}
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          <label htmlFor="efectivo-contado" className="block text-sm font-medium text-zinc-200">
            Efectivo contado fisicamente
          </label>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Cargalo con calma. Esto es lo que vamos a comparar contra el sistema.
          </p>
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

        <div
          className={`rounded-[24px] border p-4 ${tone.className}`}
          aria-live="polite"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">
            Resultado
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {contadoReady ? `${diferencia > 0 ? "+" : ""}${formatARS(diferencia)}` : "Pendiente"}
          </p>
          <p className="mt-2 text-sm opacity-80">{tone.hint}</p>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className={`rounded-[22px] border px-4 py-4 ${tone ?? "border-zinc-800 bg-zinc-950/70"}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}
