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

type VirtualAsset = {
  id: string;
  nombre: string;
  target: number;
};

type SavedSim = {
  id: string;
  name: string;
  overrides: Record<string, number>;
  virtualAssets: VirtualAsset[];
  capitalDisponible: number;
  savedAt: string;
};

const STEPS = [1_000, 5_000, 10_000, 50_000] as const;
type Step = (typeof STEPS)[number];

function formatStepLabel(n: number) {
  if (n >= 1_000) return `$${n / 1_000}k`;
  return `$${n}`;
}

function persistSim(sim: SavedSim) {
  try {
    const raw = localStorage.getItem("hangar_sims");
    const existing: SavedSim[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(
      "hangar_sims",
      JSON.stringify([sim, ...existing].slice(0, 20))
    );
  } catch {
    // ignore
  }
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
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});

  const [virtualAssets, setVirtualAssets] = useState<VirtualAsset[]>([]);
  const [virtualRawInputs, setVirtualRawInputs] = useState<
    Record<string, string>
  >({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDraft, setNewDraft] = useState({ nombre: "", target: "" });

  const [showSavePanel, setShowSavePanel] = useState(false);
  const [simName, setSimName] = useState("");
  const [savedFeedback, setSavedFeedback] = useState(false);

  const effectiveTarget = useCallback(
    (asset: SimAsset) => overrides[asset.id] ?? asset.financials.target,
    [overrides]
  );

  const realTotal = assets.reduce((sum, a) => sum + a.financials.target, 0);
  const simTotal =
    assets.reduce((sum, a) => sum + effectiveTarget(a), 0) +
    virtualAssets.reduce((sum, v) => sum + v.target, 0);
  const totalDelta = simTotal - realTotal;
  const simCapital = capitalDisponible - simTotal;
  const capitalAlcanza = simCapital >= 0;
  const hasChanges =
    Object.keys(overrides).length > 0 || virtualAssets.length > 0;

  // — real asset controls —
  function adjust(assetId: string, currentTarget: number, dir: 1 | -1) {
    const next = Math.max(0, currentTarget + dir * step);
    setOverrides((prev) => ({ ...prev, [assetId]: next }));
    setRawInputs((prev) => ({ ...prev, [assetId]: String(next) }));
  }

  function handleInputChange(assetId: string, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    setRawInputs((prev) => ({ ...prev, [assetId]: cleaned }));
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed))
      setOverrides((prev) => ({ ...prev, [assetId]: parsed }));
  }

  function handleInputBlur(asset: SimAsset) {
    const raw = rawInputs[asset.id];
    if (raw === undefined) return;
    const normalized = parseInt(raw, 10) || 0;
    setOverrides((prev) => ({ ...prev, [asset.id]: normalized }));
    setRawInputs((prev) => ({ ...prev, [asset.id]: String(normalized) }));
  }

  // — virtual asset controls —
  function adjustVirtual(id: string, currentTarget: number, dir: 1 | -1) {
    const next = Math.max(0, currentTarget + dir * step);
    setVirtualAssets((prev) =>
      prev.map((v) => (v.id === id ? { ...v, target: next } : v))
    );
    setVirtualRawInputs((prev) => ({ ...prev, [id]: String(next) }));
  }

  function handleVirtualInputChange(id: string, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    setVirtualRawInputs((prev) => ({ ...prev, [id]: cleaned }));
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed))
      setVirtualAssets((prev) =>
        prev.map((v) => (v.id === id ? { ...v, target: parsed } : v))
      );
  }

  function handleVirtualInputBlur(id: string) {
    const raw = virtualRawInputs[id];
    if (raw === undefined) return;
    const normalized = parseInt(raw, 10) || 0;
    setVirtualAssets((prev) =>
      prev.map((v) => (v.id === id ? { ...v, target: normalized } : v))
    );
    setVirtualRawInputs((prev) => ({ ...prev, [id]: String(normalized) }));
  }

  function removeVirtualAsset(id: string) {
    setVirtualAssets((prev) => prev.filter((v) => v.id !== id));
    setVirtualRawInputs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function addVirtualAsset() {
    const nombre = newDraft.nombre.trim();
    const target = parseInt(newDraft.target.replace(/\D/g, ""), 10);
    if (!nombre || isNaN(target) || target <= 0) return;
    const id = `sim-${Date.now()}`;
    setVirtualAssets((prev) => [...prev, { id, nombre, target }]);
    setVirtualRawInputs((prev) => ({ ...prev, [id]: String(target) }));
    setNewDraft({ nombre: "", target: "" });
    setShowAddForm(false);
  }

  // — reset —
  function resetAll() {
    setOverrides({});
    setRawInputs({});
    setVirtualAssets([]);
    setVirtualRawInputs({});
    setShowAddForm(false);
    setNewDraft({ nombre: "", target: "" });
  }

  // — save —
  function handleSave() {
    const name =
      simName.trim() ||
      `Simulación ${new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}`;
    persistSim({
      id: `sim-${Date.now()}`,
      name,
      overrides,
      virtualAssets,
      capitalDisponible,
      savedAt: new Date().toISOString(),
    });
    setSavedFeedback(true);
    setShowSavePanel(false);
    setSimName("");
    setTimeout(() => setSavedFeedback(false), 3000);
  }

  return (
    <div className="app-shell min-h-screen pb-24">
      {/* sticky header */}
      <div className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3">
          {/* top bar */}
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
              {hasChanges && (
                <button
                  onClick={resetAll}
                  className="ghost-button rounded-[16px] px-3 py-1.5 text-xs font-semibold"
                >
                  Resetear
                </button>
              )}
              <button
                onClick={() => setShowAddForm(true)}
                className="ghost-button rounded-[16px] px-3 py-1.5 text-xs font-semibold"
              >
                + Activo sim
              </button>
              {savedFeedback ? (
                <span className="rounded-[16px] border border-[#8cff59]/30 bg-[#8cff59]/10 px-3 py-1.5 text-xs font-semibold text-[#8cff59]">
                  Guardada ✓
                </span>
              ) : (
                <button
                  onClick={() => setShowSavePanel((p) => !p)}
                  className="neon-button rounded-[16px] px-3 py-1.5 text-xs font-semibold"
                >
                  Guardar sim
                </button>
              )}
            </div>
          </div>

          {/* metrics row — sim only */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <SummaryMetric
              label="Capital actual"
              value={formatARS(capitalDisponible)}
              sub="Punto de partida"
              subColor="text-zinc-500"
            />
            <SummaryMetric
              label="Comprometido (sim)"
              value={formatARS(simTotal)}
              sub={
                totalDelta === 0
                  ? "Sin cambios aún"
                  : `${totalDelta > 0 ? "+" : ""}${formatARS(totalDelta)} vs real`
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
              label="Resultado"
              value={formatARS(simCapital)}
              sub={capitalAlcanza ? "Capital alcanza" : "Capital insuficiente"}
              subColor={capitalAlcanza ? "text-[#8cff59]" : "text-red-400"}
              accent={!capitalAlcanza}
            />
          </div>

          {/* save panel */}
          {showSavePanel && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="Nombre de la simulación…"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              <button
                onClick={handleSave}
                className="neon-button rounded-[16px] px-4 py-2 text-xs font-semibold"
              >
                Guardar
              </button>
              <button
                onClick={() => setShowSavePanel(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Cancelar
              </button>
            </div>
          )}

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
          {/* real assets */}
          {assets.map((asset) => {
            const current = effectiveTarget(asset);
            const delta = current - asset.financials.target;
            const isEdited = overrides[asset.id] !== undefined;
            const inputVal =
              rawInputs[asset.id] !== undefined
                ? rawInputs[asset.id]
                : String(current);

            return (
              <AssetRow
                key={asset.id}
                nombre={asset.nombre}
                categoria={asset.categoria}
                isEdited={isEdited}
                delta={delta}
                inputVal={inputVal}
                current={current}
                onMinus={() => adjust(asset.id, current, -1)}
                onPlus={() => adjust(asset.id, current, 1)}
                onInputChange={(v) => handleInputChange(asset.id, v)}
                onBlur={() => handleInputBlur(asset)}
              />
            );
          })}

          {/* virtual assets */}
          {virtualAssets.map((v) => {
            const inputVal =
              virtualRawInputs[v.id] !== undefined
                ? virtualRawInputs[v.id]
                : String(v.target);
            return (
              <AssetRow
                key={v.id}
                nombre={v.nombre}
                categoria="Simulado"
                isEdited
                delta={v.target}
                inputVal={inputVal}
                current={v.target}
                isVirtual
                onMinus={() => adjustVirtual(v.id, v.target, -1)}
                onPlus={() => adjustVirtual(v.id, v.target, 1)}
                onInputChange={(val) => handleVirtualInputChange(v.id, val)}
                onBlur={() => handleVirtualInputBlur(v.id)}
                onRemove={() => removeVirtualAsset(v.id)}
              />
            );
          })}

          {/* inline add form */}
          {showAddForm && (
            <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-dashed border-[#8cff59]/30 bg-[#8cff59]/5 px-4 py-3">
              <input
                type="text"
                placeholder="Nombre del activo…"
                value={newDraft.nombre}
                onChange={(e) =>
                  setNewDraft((p) => ({ ...p, nombre: e.target.value }))
                }
                autoFocus
                className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder="Monto objetivo"
                value={newDraft.target}
                onChange={(e) =>
                  setNewDraft((p) => ({
                    ...p,
                    target: e.target.value.replace(/\D/g, ""),
                  }))
                }
                onKeyDown={(e) => e.key === "Enter" && addVirtualAsset()}
                className="w-36 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              <button
                onClick={addVirtualAsset}
                className="neon-button rounded-[16px] px-4 py-2 text-xs font-semibold"
              >
                Agregar
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewDraft({ nombre: "", target: "" });
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {assets.length === 0 && virtualAssets.length === 0 && !showAddForm && (
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

function AssetRow({
  nombre,
  categoria,
  isEdited,
  delta,
  inputVal,
  current,
  isVirtual = false,
  onMinus,
  onPlus,
  onInputChange,
  onBlur,
  onRemove,
}: {
  nombre: string;
  categoria: string;
  isEdited: boolean;
  delta: number;
  inputVal: string;
  current: number;
  isVirtual?: boolean;
  onMinus: () => void;
  onPlus: () => void;
  onInputChange: (v: string) => void;
  onBlur: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-[22px] border px-4 py-3 transition ${
        isEdited
          ? "border-zinc-700 bg-zinc-900"
          : "border-zinc-800 bg-zinc-950/70"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-white">{nombre}</p>
          {isVirtual && (
            <span className="rounded-full border border-[#8cff59]/30 bg-[#8cff59]/10 px-2 py-0.5 text-[10px] font-semibold text-[#8cff59]">
              SIM
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          {categoria}
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

      <div className="flex items-center gap-2">
        <button
          onClick={onMinus}
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
            onChange={(e) => onInputChange(e.target.value)}
            onBlur={onBlur}
            className="w-28 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-sm font-semibold text-white focus:border-[#8cff59]/60 focus:outline-none"
            aria-label="Precio objetivo"
          />
          <span className="text-xs text-zinc-500">{formatARS(current)}</span>
        </div>

        <button
          onClick={onPlus}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-lg font-bold text-zinc-300 transition hover:border-[#8cff59]/40 hover:bg-zinc-800 hover:text-white active:scale-95"
          aria-label="Subir precio"
        >
          +
        </button>

        {onRemove && (
          <button
            onClick={onRemove}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400"
            aria-label="Eliminar activo simulado"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
            >
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
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
