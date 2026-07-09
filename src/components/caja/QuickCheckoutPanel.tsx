"use client";

import { useActionState, useState, useEffect, useRef } from "react";
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
  defaultServicioId?: string;
  defaultMedioPagoId?: string;
};

const TIP_CHIPS = [500, 1000] as const;

function getMedioPagoShort(nombre: string | null): string {
  const n = (nombre ?? "").toLowerCase();
  if (n.includes("efectivo")) return "Efectivo";
  if (n.includes("transf")) return "Transfer";
  if (n.includes("posnet") || n.includes("tarjeta")) return "Tarjeta";
  if (n.includes("mp") || n.includes("mercado")) return "MP";
  return nombre ?? "Otro";
}

// ─── Main component ───────────────────────────────────────────────────────────

const initialState: AtencionRapidaState = {};

export default function QuickCheckoutPanel({
  servicios,
  mediosPago,
  action,
  returnTo,
  defaultServicioId,
  defaultMedioPagoId,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  const resolvedDefaultServicioId =
    (defaultServicioId && servicios.some((s) => s.id === defaultServicioId)
      ? defaultServicioId
      : undefined) ?? servicios[0]?.id ?? "";
  const resolvedDefaultMedioPagoId =
    (defaultMedioPagoId && mediosPago.some((m) => m.id === defaultMedioPagoId)
      ? defaultMedioPagoId
      : undefined) ?? mediosPago[0]?.id ?? "";

  const [selectedId, setSelectedId] = useState(resolvedDefaultServicioId);
  const [medioId, setMedioId] = useState(resolvedDefaultMedioPagoId);

  const selected = servicios.find((s) => s.id === selectedId) ?? servicios[0];
  const basePrice = Number(selected?.precioBase ?? 0);

  // Propina: 0, un chip fijo, o un monto "otro" ingresado a mano
  const [tip, setTip] = useState(0);
  const [tipMode, setTipMode] = useState<"none" | "chip" | "otro">("none");
  const [otroValue, setOtroValue] = useState("");
  const otroInputRef = useRef<HTMLInputElement>(null);

  // Al cambiar de servicio, la propina vuelve a cero
  const prevServiceId = useRef(selectedId);
  useEffect(() => {
    if (prevServiceId.current === selectedId) return;
    prevServiceId.current = selectedId;
    setTip(0);
    setTipMode("none");
    setOtroValue("");
  }, [selectedId]);

  useEffect(() => {
    if (tipMode === "otro") {
      otroInputRef.current?.focus();
    }
  }, [tipMode]);

  const precio = basePrice + tip;

  const medio = mediosPago.find((m) => m.id === medioId) ?? mediosPago[0];
  const listo = !!selected?.id && !!medio?.id && precio > 0;

  function handleServiceSelect(id: string) {
    setSelectedId(id);
  }

  function selectTipChip(amount: number) {
    setTip(amount);
    setTipMode("chip");
    setOtroValue("");
  }

  function selectNoTip() {
    setTip(0);
    setTipMode("none");
    setOtroValue("");
  }

  function selectOtro() {
    setTipMode("otro");
  }

  function handleOtroChange(value: string) {
    setOtroValue(value);
    const parsed = Number(value);
    setTip(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Precio del servicio + propina */}
      <div>
        <p className="eyebrow mb-3 text-center text-xs">Precio</p>
        <div className="rounded-[22px] border border-zinc-800 bg-zinc-900/60 p-5 text-center">
          <p className="font-display text-4xl font-bold tracking-tight text-white">
            {formatARS(precio)}
          </p>
          {tip > 0 ? (
            <div className="mt-2 flex items-center justify-center gap-3 text-xs">
              <span className="text-zinc-500">Servicio {formatARS(basePrice)}</span>
              <span className="text-zinc-700">+</span>
              <span className="font-semibold text-amber-300">Propina {formatARS(tip)}</span>
            </div>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">{selected?.nombre ?? "Seleccioná un servicio"}</p>
          )}
        </div>

        {/* Chips de propina */}
        <div className="mt-3">
          <p className="eyebrow mb-2 text-xs">Propina</p>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={selectNoTip}
              className={`rounded-[16px] border px-2 py-3 text-xs font-semibold transition disabled:cursor-wait ${
                tipMode === "none"
                  ? "border-[#8cff59]/40 bg-[#8cff59]/10 text-[#8cff59]"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              Sin propina
            </button>
            {TIP_CHIPS.map((amount) => (
              <button
                key={amount}
                type="button"
                disabled={isPending}
                onClick={() => selectTipChip(amount)}
                className={`rounded-[16px] border px-2 py-3 text-xs font-semibold transition disabled:cursor-wait ${
                  tipMode === "chip" && tip === amount
                    ? "border-[#8cff59]/40 bg-[#8cff59]/10 text-[#8cff59]"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
                }`}
              >
                +{formatARS(amount)}
              </button>
            ))}
            <button
              type="button"
              disabled={isPending}
              onClick={selectOtro}
              className={`rounded-[16px] border px-2 py-3 text-xs font-semibold transition disabled:cursor-wait ${
                tipMode === "otro"
                  ? "border-[#8cff59]/40 bg-[#8cff59]/10 text-[#8cff59]"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              Otro
            </button>
          </div>
          {tipMode === "otro" ? (
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
              <input
                ref={otroInputRef}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={otroValue}
                onChange={(event) => handleOtroChange(event.target.value)}
                placeholder="Monto de propina"
                className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 pl-8 pr-4 text-base text-white outline-none transition focus:border-[#8cff59]"
              />
            </div>
          ) : null}
        </div>
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
