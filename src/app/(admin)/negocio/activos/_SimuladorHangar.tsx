"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatARS } from "@/lib/format";

type SimAsset = {
  id: string;
  nombre: string;
  categoria: string;
  financials: {
    target: number;
    paid: number;
    pending: number;
    progress: number;
    estadoCompra: string;
  };
};

const STEPS = [1_000, 5_000, 10_000, 50_000] as const;
type Step = (typeof STEPS)[number];

function formatStepLabel(n: number) {
  if (n >= 1_000) return `$${n / 1_000}k`;
  return `$${n}`;
}

export default function SimuladorHangar({
  assets,
  capitalDisponible,
}: {
  assets: SimAsset[];
  capitalDisponible: number;
}) {
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [step, setStep] = useState<Step>(5_000);
  // raw input strings while editing (keyed by asset id)
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});

  const effectiveTarget = useCallback(
    (asset: SimAsset) => overrides[asset.id] ?? asset.financials.target,
    [overrides]
  );

  const simTotal = assets.reduce((sum, a) => sum + effectiveTarget(a), 0);
  const realTotal = assets.reduce((sum, a) => sum + a.financials.target, 0);
  const totalDelta = simTotal - realTotal;
  const simCapital = capitalDisponible - simTotal;
  const capitalAlcanza = simCapital >= 0;

  function adjust(assetId: string, currentTarget: number, dir: 1 | -1) {
    const next = Math.max(0, currentTarget + dir * step);
    setOverrides((prev) => ({ ...prev, [assetId]: next }));
    setRawInputs((prev) => ({ ...prev, [assetId]: String(next) }));
  }

  function handleInputChange(assetId: string, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    setRawInputs((prev) => ({ ...prev, [assetId]: cleaned }));
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed)) {
      setOverrides((prev) => ({ ...prev, [assetId]: parsed }));
    }
  }

  function handleInputBlur(asset: SimAsset) {
    const raw = rawInputs[asset.id];
    if (raw === undefined) return;
    const parsed = parseInt(raw, 10);
    const normalized = isNaN(parsed) ? 0 : parsed;
    setOverrides((prev) => ({ ...prev, [asset.id]: normalized }));
    setRawInputs((prev) => ({ ...prev, [asset.id]: String(normalized) }));
  }

  function resetAll() {
    setOverrides({});
    setRawInputs({});
  }

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div className="app-shell min-h-screen pb-24">
      {/* sticky summary header */}
      <div className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/negocio/activos"
                className="text-sm text-zinc-400 hover:text-[#8cff59]"
              >
                ← Hangar
              </Link>
              <span className="text-zinc-700">|</span>
              <span className="eyebrow text-xs font-semibold text-[#8cff59]">
                Modo simulación
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hasOverrides && (
                <button
                  onClick={resetAll}
                  className="ghost-button rounded-[16px] px-3 py-1.5 text-xs font-semibold"
                >
                  Resetear todo
                </button>
              )}
            </div>
          </div>

          {/* metrics row */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryMetric
              label="Total objetivo (sim)"
              value={formatARS(simTotal)}
              sub={
                totalDelta !== 0
                  ? `${totalDelta > 0 ? "+" : ""}${formatARS(totalDelta)} vs real`
                  : "Sin cambios"
              }
              subColor={
                totalDelta === 0
                  ? "text-zinc-500"
                  : totalDelta > 0
                    ? "text-red-400"
                    : "text-[#8cff59]"
              }
            />
            <SummaryMetric
              label="Capital disponible (sim)"
              value={formatARS(simCapital)}
              sub={capitalAlcanza ? "Capital alcanza" : "Capital insuficiente"}
              subColor={capitalAlcanza ? "text-[#8cff59]" : "text-red-400"}
              accent={!capitalAlcanza}
            />
            <SummaryMetric
              label="Total real"
              value={formatARS(realTotal)}
              sub="Valores actuales en DB"
              subColor="text-zinc-500"
            />
            <SummaryMetric
              label="Capital real disponible"
              value={formatARS(capitalDisponible)}
              sub="Antes de la simulación"
              subColor="text-zinc-500"
            />
          </div>

          {/* step selector */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">Paso:</span>
            {STEPS.map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  step === s
                    ? "border-[#8cff59]/30 bg-[#8cff59]/10 text-[#b9ff96]"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                {formatStepLabel(s)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <div className="space-y-2">
          {assets.map((asset) => {
            const current = effectiveTarget(asset);
            const real = asset.financials.target;
            const delta = current - real;
            const isEdited = overrides[asset.id] !== undefined;
            const inputVal =
              rawInputs[asset.id] !== undefined
                ? rawInputs[asset.id]
                : String(current);

            return (
              <div
                key={asset.id}
                className={`flex flex-wrap items-center gap-3 rounded-[22px] border px-4 py-3 transition ${
                  isEdited
                    ? "border-zinc-700 bg-zinc-900"
                    : "border-zinc-800 bg-zinc-950/70"
                }`}
              >
                {/* info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {asset.nombre}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {asset.categoria}
                    {isEdited && delta !== 0 && (
                      <span
                        className={`ml-2 font-semibold ${delta > 0 ? "text-red-400" : "text-[#8cff59]"}`}
                      >
                        {delta > 0 ? "+" : ""}
                        {formatARS(delta)}
                      </span>
                    )}
                  </p>
                </div>

                {/* controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjust(asset.id, current, -1)}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-lg font-bold text-zinc-300 transition hover:border-[#8cff59]/40 hover:bg-zinc-800 hover:text-white active:scale-95"
                    aria-label="Bajar precio"
                  >
                    −
                  </button>

                  <div className="flex flex-col items-center gap-0.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={inputVal}
                      onChange={(e) =>
                        handleInputChange(asset.id, e.target.value)
                      }
                      onBlur={() => handleInputBlur(asset)}
                      className="w-28 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-sm font-semibold text-white focus:border-[#8cff59]/60 focus:outline-none"
                      aria-label="Precio objetivo"
                    />
                    <span className="text-xs text-zinc-500">
                      {formatARS(current)}
                    </span>
                  </div>

                  <button
                    onClick={() => adjust(asset.id, current, 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-lg font-bold text-zinc-300 transition hover:border-[#8cff59]/40 hover:bg-zinc-800 hover:text-white active:scale-95"
                    aria-label="Subir precio"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {assets.length === 0 && (
          <div className="panel-card rounded-[30px] p-8 text-center">
            <p className="text-sm text-zinc-400">
              No hay activos cargados en el Hangar para simular.
            </p>
            <Link
              href="/negocio/activos/nuevo"
              className="mt-3 inline-flex text-sm font-semibold text-[#8cff59] hover:underline"
            >
              Cargar primer activo
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  sub,
  subColor,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  subColor: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[20px] border px-3 py-2.5 ${
        accent
          ? "border-red-500/30 bg-red-500/10"
          : "border-zinc-800 bg-zinc-950/80"
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
      <p className={`mt-0.5 text-[11px] font-medium ${subColor}`}>{sub}</p>
    </div>
  );
}
