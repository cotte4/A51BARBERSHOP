"use client";

import { useActionState, useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { AtencionRapidaState } from "@/app/(barbero)/caja/actions";
import { formatARS } from "@/lib/format";

type Servicio = {
  id: string;
  nombre: string;
  precioBase: string | null;
};

type MedioPago = {
  id: string;
  nombre: string | null;
  comisionPorcentaje: string | null;
};

type Props = {
  servicios: Servicio[];
  mediosPago: MedioPago[];
  action: (prevState: AtencionRapidaState, formData: FormData) => Promise<AtencionRapidaState>;
  returnTo?: string;
};

const STEP = 500;
const ITEM_H = 58;
const VISIBLE = 5; // number of visible rows in the drum

function snapToStep(value: number): number {
  return Math.max(STEP, Math.round(value / STEP) * STEP);
}

function buildPrices(base: number): number[] {
  const snapped = snapToStep(base);
  const prices: number[] = [];
  for (let i = -24; i <= 24; i++) {
    const v = snapped + i * STEP;
    if (v >= STEP) prices.push(v);
  }
  return prices;
}

function getMedioPagoLabel(nombre: string | null): string {
  const n = (nombre ?? "").toLowerCase();
  if (n.includes("efectivo")) return "Efectivo";
  if (n.includes("transf")) return "Transferencia";
  if (n.includes("posnet") || n.includes("tarjeta")) return "Tarjeta";
  if (n.includes("mp") || n.includes("mercado")) return "Mercado Pago";
  return nombre ?? "Otro";
}

function getMedioPagoShort(nombre: string | null): string {
  const n = (nombre ?? "").toLowerCase();
  if (n.includes("efectivo")) return "Efectivo";
  if (n.includes("transf")) return "Transfer";
  if (n.includes("posnet") || n.includes("tarjeta")) return "Tarjeta";
  if (n.includes("mp") || n.includes("mercado")) return "MP";
  return nombre ?? "Otro";
}

// ─── Drum Picker ─────────────────────────────────────────────────────────────

function DrumPicker({
  prices,
  value,
  onChange,
}: {
  prices: number[];
  value: number;
  onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [liveIndex, setLiveIndex] = useState(() => {
    const i = prices.indexOf(value);
    return i >= 0 ? i : 0;
  });
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const padding = ITEM_H * Math.floor(VISIBLE / 2);
  const containerH = ITEM_H * VISIBLE;

  // Scroll to value on mount
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = prices.indexOf(value);
    if (idx >= 0) {
      el.scrollTop = idx * ITEM_H;
      setLiveIndex(idx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When parent changes the value (e.g. service changed), scroll there
  const prevValue = useRef(value);
  useEffect(() => {
    if (prevValue.current === value) return;
    prevValue.current = value;
    const el = ref.current;
    if (!el) return;
    const idx = prices.indexOf(value);
    if (idx >= 0) {
      el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
      setLiveIndex(idx);
    }
  }, [value, prices]);

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(prices.length - 1, idx));
    setLiveIndex(clamped);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChange(prices[clamped]);
    }, 80);
  }, [prices, onChange]);

  return (
    <div className="relative select-none" style={{ height: containerH }}>
      {/* Center highlight */}
      <div
        className="pointer-events-none absolute inset-x-3 rounded-[18px] border border-[#8cff59]/25 bg-[#8cff59]/8"
        style={{ top: padding, height: ITEM_H }}
      />
      {/* Top fade */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{
          height: padding,
          background: "linear-gradient(to bottom, #121212 0%, transparent 100%)",
        }}
      />
      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{
          height: padding,
          background: "linear-gradient(to top, #121212 0%, transparent 100%)",
        }}
      />

      <div
        ref={ref}
        onScroll={handleScroll}
        style={{
          height: containerH,
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          paddingTop: padding,
          paddingBottom: padding,
          scrollbarWidth: "none",
          // @ts-expect-error vendor prefix
          WebkitOverflowScrolling: "touch",
        }}
      >
        {prices.map((price, i) => {
          const dist = Math.abs(i - liveIndex);
          const isCenter = dist === 0;
          return (
            <div
              key={price}
              style={{
                height: ITEM_H,
                scrollSnapAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isCenter ? 1 : dist === 1 ? 0.4 : 0.18,
                transform: `scale(${isCenter ? 1 : dist === 1 ? 0.88 : 0.76})`,
                transition: "opacity 0.12s ease, transform 0.12s ease",
              }}
            >
              <span
                className={`font-display text-3xl font-bold tracking-tight ${
                  isCenter ? "text-[#8cff59]" : "text-zinc-300"
                }`}
              >
                {formatARS(price)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const initialState: AtencionRapidaState = {};

export default function QuickCheckoutPanel({
  servicios,
  mediosPago,
  action,
  returnTo,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedId, setSelectedId] = useState(servicios[0]?.id ?? "");
  const [medioId, setMedioId] = useState(mediosPago[0]?.id ?? "");

  const selected = servicios.find((s) => s.id === selectedId) ?? servicios[0];
  const basePrice = snapToStep(Number(selected?.precioBase ?? 0));
  const prices = useMemo(() => buildPrices(Number(selected?.precioBase ?? 0)), [selected?.precioBase]);
  const [precio, setPrecio] = useState(basePrice);

  // When service changes, reset price to its base
  const prevServiceId = useRef(selectedId);
  useEffect(() => {
    if (prevServiceId.current === selectedId) return;
    prevServiceId.current = selectedId;
    const newBase = snapToStep(Number(selected?.precioBase ?? 0));
    setPrecio(newBase);
  }, [selectedId, selected]);

  const medio = mediosPago.find((m) => m.id === medioId) ?? mediosPago[0];
  const listo = !!selected?.id && !!medio?.id && precio > 0;

  function handleServiceSelect(id: string) {
    setSelectedId(id);
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Drum price picker */}
      <div>
        <p className="eyebrow mb-1 text-center text-xs">¿Cuánto cobra?</p>
        <DrumPicker prices={prices} value={precio} onChange={setPrecio} />
        {precio > basePrice ? (
          <div className="mt-2 flex items-center justify-center gap-3 text-xs">
            <span className="text-zinc-500">Corte {formatARS(basePrice)}</span>
            <span className="text-zinc-700">+</span>
            <span className="font-semibold text-amber-300">
              Propina {formatARS(precio - basePrice)}
            </span>
          </div>
        ) : null}
      </div>

      {/* Service selector */}
      <div>
        <p className="eyebrow mb-3 text-xs">Servicio</p>
        <div
          className="flex gap-2.5 overflow-x-auto pb-1"
          style={{ scrollSnapType: "x mandatory" } as React.CSSProperties}
        >
          {servicios.map((s) => {
            const active = selectedId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={isPending}
                onClick={() => handleServiceSelect(s.id)}
                style={{ scrollSnapAlign: "start" } as React.CSSProperties}
                className={`min-w-[130px] flex-none rounded-[20px] border p-3.5 text-left transition disabled:cursor-wait ${
                  active
                    ? "border-[#8cff59]/40 bg-[#8cff59]/10 shadow-[0_0_14px_rgba(140,255,89,0.1)]"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                }`}
              >
                <p className="text-xs font-semibold text-white">{s.nombre}</p>
                <p className={`mt-1 text-xs ${active ? "text-[#8cff59]" : "text-zinc-400"}`}>
                  {formatARS(Number(s.precioBase ?? 0))}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment method — 4 boxes */}
      <div>
        <p className="eyebrow mb-3 text-xs">Medio de pago</p>
        <div className={`grid gap-2 ${mediosPago.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
          {mediosPago.slice(0, 4).map((m) => {
            const active = medioId === m.id;
            const comision = Number(m.comisionPorcentaje ?? 0);
            return (
              <button
                key={m.id}
                type="button"
                disabled={isPending}
                onClick={() => setMedioId(m.id)}
                className={`rounded-[20px] border px-3 py-3.5 text-center transition disabled:cursor-wait ${
                  active
                    ? "border-[#8cff59]/40 bg-[#8cff59]/10 shadow-[0_0_14px_rgba(140,255,89,0.1)]"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                }`}
              >
                <p className={`text-sm font-semibold ${active ? "text-[#8cff59]" : "text-white"}`}>
                  {getMedioPagoShort(m.nombre)}
                </p>
                {comision > 0 ? (
                  <p className="mt-0.5 text-[10px] text-zinc-500">{m.comisionPorcentaje}%</p>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {state.error ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      {/* Submit */}
      <form action={formAction}>
        <input type="hidden" name="servicioId" value={selected?.id ?? ""} />
        <input type="hidden" name="medioPagoId" value={medio?.id ?? ""} />
        <input type="hidden" name="precioCobrado" value={String(precio)} />
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <button
          type="submit"
          disabled={!listo || isPending}
          aria-busy={isPending}
          className={`flex min-h-[60px] w-full items-center justify-center rounded-[22px] px-6 text-base font-bold transition-all duration-150 ${
            listo
              ? "neon-button shadow-[0_4px_24px_rgba(140,255,89,0.3)] active:scale-[0.98]"
              : "cursor-not-allowed bg-zinc-800 text-zinc-600"
          }`}
        >
          {isPending ? "Registrando..." : listo ? `Cobrar ${formatARS(precio)}` : "Seleccioná servicio"}
        </button>
      </form>
    </div>
  );
}
