"use client";

import Link from "next/link";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import QuickCheckoutPanel from "@/components/caja/QuickCheckoutPanel";
import type { AtencionRapidaState } from "@/app/(barbero)/caja/actions";

type TurnoMini = {
  id: string;
  clienteNombre: string;
  horaInicio: string;
  estado: string;
};

type Servicio = { id: string; nombre: string; precioBase: string | null };
type MedioPago = { id: string; nombre: string | null; comisionPorcentaje: string | null };

type HoyActionStripProps = {
  turnos: TurnoMini[];
  servicios: Servicio[];
  mediosPago: MedioPago[];
  action: (prevState: AtencionRapidaState, formData: FormData) => Promise<AtencionRapidaState>;
};

export default function HoyActionStrip({
  turnos,
  servicios,
  mediosPago,
  action,
}: HoyActionStripProps) {
  const [showTurnos, setShowTurnos] = useState(false);
  const [showNueva, setShowNueva] = useState(false);

  return (
    <section id="comandos" className="space-y-4">
      <div className="panel-card rounded-[32px] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-xs font-semibold">Centro de comandos</p>
            <h2 className="font-display mt-2 text-2xl font-semibold text-white">Accion rapida</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Una entrada clara para cobrar, abrir agenda, mover retail o revisar caja sin perder
              tiempo.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
            {turnos.length} turno{turnos.length === 1 ? "" : "s"} hoy
          </span>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setShowNueva(true)}
            className="group flex min-h-[118px] flex-col justify-between rounded-[28px] border border-[#8cff59]/20 bg-[linear-gradient(135deg,rgba(140,255,89,1),rgba(182,255,132,0.92))] px-5 py-4 text-left text-[#07130a] shadow-[0_18px_36px_rgba(140,255,89,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(140,255,89,0.24)] xl:col-span-2"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#07130a]/70">
              01 / Prioridad
            </span>
            <div>
              <p className="font-display text-2xl font-semibold">Atencion express</p>
              <p className="mt-1 text-sm text-[#07130a]/78">
                Registrar servicio, cobro o una salida rapida desde un solo modal.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#07130a]/10 px-3 py-1 text-[11px] font-semibold">
                Abrir modal
              </span>
              <span className="text-sm font-semibold">Cobrar ahora</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowTurnos((prev) => !prev)}
            className="group flex min-h-[118px] flex-col justify-between rounded-[28px] border border-zinc-800 bg-zinc-950/60 px-5 py-4 text-left text-white transition hover:-translate-y-0.5 hover:border-[#8cff59]/30"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
              02 / Agenda
            </span>
            <div>
              <p className="font-display text-2xl font-semibold">Turnos de hoy</p>
              <p className="mt-1 text-sm text-zinc-400">
                {turnos.length > 0
                  ? `${turnos.length} turno${turnos.length === 1 ? "" : "s"} en foco`
                  : "Sin turnos cargados"}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-zinc-300">
                Ver u ocultar
              </span>
              <span className="text-sm font-semibold text-[#8cff59]">Abrir agenda</span>
            </div>
          </button>

          <Link
            href="/caja/vender"
            className="group flex min-h-[118px] flex-col justify-between rounded-[28px] border border-zinc-800 bg-zinc-950/60 px-5 py-4 text-left text-white transition hover:-translate-y-0.5 hover:border-[#8cff59]/30"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
              03 / Retail
            </span>
            <div>
              <p className="font-display text-2xl font-semibold">Vender producto</p>
              <p className="mt-1 text-sm text-zinc-400">
                Cobro con stock disponible y salida clara.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-zinc-300">
                Stock listo
              </span>
              <span className="text-sm font-semibold text-[#8cff59]">Abrir venta</span>
            </div>
          </Link>

          <Link
            href="/caja"
            className="group flex min-h-[118px] flex-col justify-between rounded-[28px] border border-zinc-800 bg-zinc-950/60 px-5 py-4 text-left text-white transition hover:-translate-y-0.5 hover:border-[#8cff59]/30"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
              04 / Caja
            </span>
            <div>
              <p className="font-display text-2xl font-semibold">Ver caja</p>
              <p className="mt-1 text-sm text-zinc-400">Movimientos, cierre y estado del dia.</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-zinc-300">
                Estado
              </span>
              <span className="text-sm font-semibold text-[#8cff59]">Abrir caja</span>
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
          />
        </Modal>
      ) : null}

      {showTurnos ? (
        <section className="rounded-[28px] border border-zinc-800 bg-zinc-950/60 p-5 text-white shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-xs font-semibold">Mini agenda</p>
              <h3 className="font-display mt-2 text-2xl font-semibold">Lo proximo de hoy</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Clientes y horarios que conviene tener a la vista antes de volver al corte.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/turnos#agenda"
                className="inline-flex min-h-[44px] items-center rounded-xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a]"
              >
                + Nuevo turno
              </Link>
              <Link
                href="/turnos"
                className="inline-flex min-h-[44px] items-center rounded-xl border border-zinc-700 px-4 text-sm font-medium text-zinc-200 hover:bg-white/5"
              >
                Ver todos
              </Link>
            </div>
          </div>

          {turnos.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-dashed border-zinc-700 bg-zinc-950/30 px-4 py-5 text-sm text-zinc-400">
              No hay turnos cargados para hoy.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {turnos.map((turno) => (
                <div key={turno.id} className="rounded-[22px] border border-zinc-800 bg-zinc-950/80 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{turno.clienteNombre}</p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {turno.horaInicio} · {turno.estado}
                      </p>
                    </div>
                    <Link href="/turnos" className="text-sm font-medium text-[#8cff59] underline underline-offset-4">
                      Abrir
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
