"use client";

import { useActionState, useState } from "react";
import { Scissors, Banknote, ArrowLeftRight, CreditCard, Check } from "lucide-react";
import type { AtencionRapidaState } from "@/app/(barbero)/caja/actions";

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
};

const initialState: AtencionRapidaState = {};

function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

function getMedioPagoIcon(nombre: string | null) {
  const n = (nombre ?? "").toLowerCase();
  if (n.includes("efectivo")) return Banknote;
  if (n.includes("transf")) return ArrowLeftRight;
  return CreditCard;
}

function getMedioPagoLabel(nombre: string | null): string {
  const n = (nombre ?? "").toLowerCase();
  if (n.includes("efectivo")) return "Efectivo";
  if (n.includes("transf")) return "Transferencia";
  if (n.includes("posnet") || n.includes("tarjeta")) return "Tarjeta";
  if (n.includes("mp") || n.includes("mercado")) return "Mercado Pago";
  return nombre ?? "Otro";
}

// Detecta si un servicio es "corte + barba" para mostrar icono doble
function esCorteYBarba(nombre: string): boolean {
  const n = nombre.toLowerCase();
  return n.includes("barba") || n.includes("beard");
}

export default function QuickCheckoutPanel({ servicios, mediosPago, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedServicioId, setSelectedServicioId] = useState<string | null>(null);
  const [selectedMedioPagoId, setSelectedMedioPagoId] = useState<string | null>(null);

  const selectedServicio = servicios.find((s) => s.id === selectedServicioId) ?? null;
  const precio = Number(selectedServicio?.precioBase ?? 0);
  const listo = selectedServicioId !== null && selectedMedioPagoId !== null;

  return (
    <section className="overflow-hidden rounded-[30px] border border-[#8cff59]/20 bg-zinc-950 shadow-[0_0_40px_rgba(140,255,89,0.08)]">
      <div className="p-5 sm:p-6">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Cobro rápido</p>

        {/* Servicios */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {servicios.map((servicio) => {
            const isSelected = selectedServicioId === servicio.id;
            const doble = esCorteYBarba(servicio.nombre);
            return (
              <button
                key={servicio.id}
                type="button"
                onClick={() => setSelectedServicioId(isSelected ? null : servicio.id)}
                className={`relative flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[22px] border px-4 py-4 transition-all duration-150 ${
                  isSelected
                    ? "border-[#8cff59]/60 bg-[#8cff59]/10 text-[#8cff59] shadow-[0_0_20px_rgba(140,255,89,0.15)]"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {isSelected && (
                  <span className="absolute right-3 top-3">
                    <Check size={14} className="text-[#8cff59]" />
                  </span>
                )}
                <span className="flex items-center gap-0.5">
                  <Scissors size={22} />
                  {doble && <Scissors size={16} className="opacity-60" />}
                </span>
                <span className="text-center text-sm font-semibold leading-tight">
                  {servicio.nombre}
                </span>
                <span className={`text-xs ${isSelected ? "text-[#8cff59]/80" : "text-zinc-500"}`}>
                  {formatARS(Number(servicio.precioBase ?? 0))}
                </span>
              </button>
            );
          })}
        </div>

        {/* Medios de pago */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {mediosPago.map((medio) => {
            const isSelected = selectedMedioPagoId === medio.id;
            const Icon = getMedioPagoIcon(medio.nombre);
            const label = getMedioPagoLabel(medio.nombre);
            return (
              <button
                key={medio.id}
                type="button"
                onClick={() => setSelectedMedioPagoId(isSelected ? null : medio.id)}
                className={`relative flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[18px] border px-2 py-3 text-center transition-all duration-150 ${
                  isSelected
                    ? "border-white/30 bg-white text-zinc-900 shadow-[0_0_16px_rgba(255,255,255,0.12)]"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {isSelected && (
                  <span className="absolute right-2 top-2">
                    <Check size={11} className="text-zinc-600" />
                  </span>
                )}
                <Icon size={18} />
                <span className="text-xs font-medium leading-tight">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {state.error ? (
          <p className="mt-4 rounded-[18px] border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {state.error}
          </p>
        ) : null}

        {/* Botón cobrar */}
        <form action={formAction} className="mt-4">
          <input type="hidden" name="servicioId" value={selectedServicioId ?? ""} />
          <input type="hidden" name="medioPagoId" value={selectedMedioPagoId ?? ""} />
          <input type="hidden" name="precioCobrado" value={precio} />

          <button
            type="submit"
            disabled={!listo || isPending}
            className={`flex min-h-[56px] w-full items-center justify-center rounded-[22px] px-6 text-base font-bold transition-all duration-150 ${
              listo
                ? "bg-[#8cff59] text-zinc-950 shadow-[0_4px_24px_rgba(140,255,89,0.3)] hover:bg-[#a8ff80] active:scale-[0.98]"
                : "cursor-not-allowed bg-zinc-800 text-zinc-600"
            }`}
          >
            {isPending
              ? "Registrando..."
              : listo
              ? `Cobrar ${formatARS(precio)}`
              : "Seleccioná servicio y pago"}
          </button>
        </form>
      </div>
    </section>
  );
}
