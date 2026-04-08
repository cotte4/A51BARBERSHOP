"use client";

import { useActionState, useState } from "react";
import type { AtencionRapidaState } from "@/app/(barbero)/caja/actions";

function ScissorsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5${className ? ` ${className}` : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8.12 8.12 20 20M8.12 15.88 20 4" strokeLinecap="round" />
    </svg>
  );
}

function BanknoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" strokeLinecap="round" />
    </svg>
  );
}

function ArrowLeftRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path
        d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20" />
      <path d="M6 15h4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5${className ? ` ${className}` : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  variant?: "standalone" | "embedded";
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
  const normalized = (nombre ?? "").toLowerCase();
  if (normalized.includes("efectivo")) return <BanknoteIcon />;
  if (normalized.includes("transf")) return <ArrowLeftRightIcon />;
  return <CreditCardIcon />;
}

function getMedioPagoLabel(nombre: string | null): string {
  const normalized = (nombre ?? "").toLowerCase();
  if (normalized.includes("efectivo")) return "Efectivo";
  if (normalized.includes("transf")) return "Transferencia";
  if (normalized.includes("posnet") || normalized.includes("tarjeta")) return "Tarjeta";
  if (normalized.includes("mp") || normalized.includes("mercado")) return "Mercado Pago";
  return nombre ?? "Otro";
}

function esCorteYBarba(nombre: string): boolean {
  const normalized = nombre.toLowerCase();
  return normalized.includes("barba") || normalized.includes("beard");
}

export default function QuickCheckoutPanel({
  servicios,
  mediosPago,
  action,
  returnTo,
  variant = "standalone",
}: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedServicioId, setSelectedServicioId] = useState<string | null>(null);
  const [selectedMedioPagoId, setSelectedMedioPagoId] = useState<string | null>(null);

  const selectedServicio = servicios.find((servicio) => servicio.id === selectedServicioId) ?? null;
  const selectedMedioPago = mediosPago.find((medio) => medio.id === selectedMedioPagoId) ?? null;
  const precio = Number(selectedServicio?.precioBase ?? 0);
  const listo = selectedServicioId !== null && selectedMedioPagoId !== null;
  const embedded = variant === "embedded";

  const missingSteps: string[] = [];
  if (!selectedServicio) missingSteps.push("servicio");
  if (!selectedMedioPago) missingSteps.push("medio de pago");

  const statusLabel = isPending ? "Procesando" : listo ? "Listo para cobrar" : "Faltan datos";
  const statusClassName = isPending
    ? "border-zinc-700 bg-zinc-800 text-zinc-200"
    : listo
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : "border-amber-500/30 bg-amber-500/10 text-amber-200";

  const helperText = isPending
    ? "Estamos registrando el cobro. No cierres la pantalla."
    : listo
      ? "El monto ya esta listo para cobrar. Revisa el medio antes de confirmar."
      : `Te falta ${missingSteps.join(" y ")} para habilitar el cobro.`;

  const submitLabel = isPending
    ? "Registrando..."
    : listo
      ? `Cobrar ${formatARS(precio)}`
      : "Selecciona servicio y pago";

  return (
    <section
      className={
        embedded
          ? "overflow-hidden rounded-[26px] border border-zinc-800 bg-zinc-950/60"
          : "overflow-hidden rounded-[30px] border border-[#8cff59]/20 bg-zinc-950 shadow-[0_0_40px_rgba(140,255,89,0.08)]"
      }
    >
      <div className={`p-5 sm:p-6 ${isPending ? "opacity-80" : ""}`}>
        {embedded ? (
          <div className="flex justify-end">
            <span
              className={`inline-flex min-h-[36px] items-center rounded-full px-3 text-xs font-semibold uppercase tracking-[0.18em] ${statusClassName}`}
            >
              {statusLabel}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-xs font-semibold text-zinc-500">Cobro rapido</p>
              <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                Selecciona, mira el monto y cobra sin dudar
              </h2>
            </div>
            <span
              className={`inline-flex min-h-[36px] items-center rounded-full px-3 text-xs font-semibold uppercase tracking-[0.18em] ${statusClassName}`}
            >
              {statusLabel}
            </span>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="panel-soft rounded-[22px] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Servicio</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {selectedServicio ? selectedServicio.nombre : "Falta seleccionar"}
            </p>
          </div>
          <div className="panel-soft rounded-[22px] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Medio de pago
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {selectedMedioPago ? getMedioPagoLabel(selectedMedioPago.nombre) : "Falta seleccionar"}
            </p>
          </div>
          <div className="panel-soft rounded-[22px] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Monto</p>
            <p className="mt-2 text-lg font-semibold text-[#8cff59]">
              {selectedServicio ? formatARS(precio) : "--"}
            </p>
          </div>
        </div>

        <div
          className={`mt-4 rounded-[22px] border px-4 py-3 text-sm ${
            isPending
              ? "border-zinc-700 bg-zinc-900/80 text-zinc-200"
              : listo
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                : "border-amber-500/20 bg-amber-500/10 text-amber-100"
          }`}
          aria-live="polite"
        >
          {helperText}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {servicios.map((servicio) => {
            const isSelected = selectedServicioId === servicio.id;
            const doble = esCorteYBarba(servicio.nombre);

            return (
              <button
                key={servicio.id}
                type="button"
                aria-pressed={isSelected}
                disabled={isPending}
                onClick={() => setSelectedServicioId(isSelected ? null : servicio.id)}
                className={`relative flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-[22px] border px-4 py-4 text-center transition-all duration-150 disabled:cursor-wait ${
                  isSelected
                    ? "border-[#8cff59]/60 bg-[#8cff59]/10 text-[#8cff59] shadow-[0_0_20px_rgba(140,255,89,0.15)]"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {isSelected ? (
                  <span className="absolute right-3 top-3">
                    <CheckIcon className="text-[#8cff59]" />
                  </span>
                ) : null}
                <span className="flex items-center gap-0.5">
                  <ScissorsIcon />
                  {doble ? <ScissorsIcon className="opacity-60" /> : null}
                </span>
                <span className="text-center text-sm font-semibold leading-tight">{servicio.nombre}</span>
                <span className={`text-xs ${isSelected ? "text-[#8cff59]/80" : "text-zinc-500"}`}>
                  {formatARS(Number(servicio.precioBase ?? 0))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {mediosPago.map((medio) => {
            const isSelected = selectedMedioPagoId === medio.id;
            const icon = getMedioPagoIcon(medio.nombre);
            const label = getMedioPagoLabel(medio.nombre);
            const commission = Number(medio.comisionPorcentaje ?? 0);

            return (
              <button
                key={medio.id}
                type="button"
                aria-pressed={isSelected}
                disabled={isPending}
                onClick={() => setSelectedMedioPagoId(isSelected ? null : medio.id)}
                className={`relative flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-[18px] border px-2 py-3 text-center transition-all duration-150 disabled:cursor-wait ${
                  isSelected
                    ? "border-white/30 bg-white text-zinc-900 shadow-[0_0_16px_rgba(255,255,255,0.12)]"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {isSelected ? (
                  <span className="absolute right-2 top-2">
                    <CheckIcon className="text-zinc-600" />
                  </span>
                ) : null}
                {icon}
                <span className="text-xs font-medium leading-tight">{label}</span>
                {commission > 0 ? (
                  <span className={`text-[11px] ${isSelected ? "text-zinc-700" : "text-zinc-500"}`}>
                    {commission}% comision
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {state.error ? (
          <p
            className="mt-4 rounded-[18px] border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
            aria-live="assertive"
          >
            {state.error}
          </p>
        ) : null}

        <form action={formAction} className="mt-4">
          <input type="hidden" name="servicioId" value={selectedServicioId ?? ""} />
          <input type="hidden" name="medioPagoId" value={selectedMedioPagoId ?? ""} />
          <input type="hidden" name="precioCobrado" value={precio} />
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

          <button
            type="submit"
            disabled={!listo || isPending}
            aria-busy={isPending}
            className={`flex min-h-[56px] w-full items-center justify-center rounded-[22px] px-6 text-base font-bold transition-all duration-150 ${
              listo
                ? "bg-[#8cff59] text-zinc-950 shadow-[0_4px_24px_rgba(140,255,89,0.3)] hover:bg-[#a8ff80] active:scale-[0.98]"
                : "cursor-not-allowed bg-zinc-800 text-zinc-600"
            }`}
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </section>
  );
}
