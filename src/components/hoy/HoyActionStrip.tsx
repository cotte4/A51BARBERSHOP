"use client";

import Link from "next/link";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import QuickCheckoutPanel from "@/components/caja/QuickCheckoutPanel";
import type { AtencionRapidaState } from "@/app/(barbero)/caja/actions";

type ProximoTurno = {
  id: string;
  clienteNombre: string;
  horaInicio: string;
  servicioNombre: string | null;
  estado: string;
};

type Servicio = { id: string; nombre: string; precioBase: string | null };
type MedioPago = { id: string; nombre: string | null; comisionPorcentaje: string | null };

type HoyActionStripProps = {
  proximoTurno: ProximoTurno | null;
  servicios: Servicio[];
  mediosPago: MedioPago[];
  action: (prevState: AtencionRapidaState, formData: FormData) => Promise<AtencionRapidaState>;
};

function LightningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M13 2 6 13h5l-1 9 8-12h-5l1-8Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarBoltIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M7.5 3.5V7" strokeLinecap="round" />
      <path d="M16.5 3.5V7" strokeLinecap="round" />
      <path d="M3.5 9.5h17" />
      <path d="m12 12.5-2 3h2l-1 3 3-4h-2l1-2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BottleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M10 3h4" strokeLinecap="round" />
      <path
        d="M11 3v3l-3 4.5V18a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3v-7.5L13 6V3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 11h6" strokeLinecap="round" />
    </svg>
  );
}

function getEstadoLabel(estado: string) {
  if (estado === "confirmado") return "Confirmado";
  if (estado === "pendiente") return "Pendiente";
  return estado;
}

function getEstadoTone(estado: string) {
  if (estado === "confirmado") {
    return "border-[#8cff59]/20 bg-[rgba(140,255,89,0.08)] text-[#8cff59]";
  }

  if (estado === "pendiente") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-200";
  }

  return "border-white/10 bg-white/5 text-zinc-300";
}

export default function HoyActionStrip({
  proximoTurno,
  servicios,
  mediosPago,
  action,
}: HoyActionStripProps) {
  const [showNueva, setShowNueva] = useState(false);

  return (
    <section id="comandos">
      <div className="panel-card rounded-[32px] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-xs font-semibold">Centro de comandos</p>
            <h2 className="font-display mt-2 text-2xl font-semibold text-white">Accion rapida</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Home operativo
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setShowNueva(true)}
            className="group flex min-h-[142px] items-center gap-4 rounded-[28px] border border-[#8cff59]/20 bg-[linear-gradient(135deg,rgba(140,255,89,1),rgba(182,255,132,0.92))] px-5 py-5 text-left text-[#07130a] shadow-[0_18px_36px_rgba(140,255,89,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(140,255,89,0.24)] sm:col-span-2"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[#07130a]/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
              <LightningIcon />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#07130a]/70">
                Cobro rapido
              </p>
              <p className="font-display mt-2 text-3xl font-bold uppercase tracking-[0.08em]">
                Nuevo cobro
              </p>
            </div>
          </button>

          <article className="flex min-h-[168px] flex-col rounded-[28px] border border-zinc-800 bg-zinc-950/60 p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-xs font-semibold">Proximo turno</p>
                <p className="font-display mt-3 text-3xl font-bold text-white">
                  {proximoTurno ? proximoTurno.horaInicio : "--:--"}
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/5 text-zinc-300">
                <CalendarBoltIcon />
              </span>
            </div>

            {proximoTurno ? (
              <div className="mt-auto">
                <p className="text-base font-semibold text-white">{proximoTurno.clienteNombre}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {proximoTurno.servicioNombre ?? "Servicio sin detalle"}
                </p>
                <span
                  className={`mt-4 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getEstadoTone(proximoTurno.estado)}`}
                >
                  {getEstadoLabel(proximoTurno.estado)}
                </span>
              </div>
            ) : (
              <div className="mt-auto">
                <p className="text-base font-semibold text-white">Sin turnos cargados</p>
                <p className="mt-1 text-sm text-zinc-400">La agenda de hoy esta libre por ahora.</p>
              </div>
            )}
          </article>

          <Link
            href="/caja/vender"
            className="group flex min-h-[168px] flex-col rounded-[28px] border border-zinc-800 bg-zinc-950/60 p-5 text-left text-white transition hover:-translate-y-0.5 hover:border-[#8cff59]/30"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/5 text-zinc-300">
              <BottleIcon />
            </span>
            <div className="mt-auto">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Stock
              </p>
              <p className="font-display mt-2 text-2xl font-semibold">Vender producto</p>
            </div>
          </Link>
        </div>
      </div>

      {showNueva ? (
        <Modal onClose={() => setShowNueva(false)}>
          <div className="mb-4">
            <p className="eyebrow text-xs font-semibold text-zinc-500">Caja</p>
            <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
              Atencion express
            </h2>
          </div>
          <QuickCheckoutPanel
            servicios={servicios}
            mediosPago={mediosPago}
            action={action}
            returnTo="/hoy"
            variant="embedded"
          />
        </Modal>
      ) : null}
    </section>
  );
}
