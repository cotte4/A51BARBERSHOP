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
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Cobro rápido — abre modal */}
        <button
          type="button"
          onClick={() => setShowNueva(true)}
          className="flex min-h-[88px] flex-col justify-between rounded-[24px] bg-[#8cff59] px-5 py-4 text-left text-[#07130a] shadow-[0_18px_36px_rgba(140,255,89,0.18)] transition hover:bg-[#a8ff80]"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#07130a]/70">Primero</span>
          <div>
            <p className="text-xl font-semibold">Nueva atención</p>
            <p className="mt-1 text-sm text-[#07130a]/75">Registrar servicio o cobro rápido.</p>
          </div>
        </button>

        {/* Turnos */}
        <button
          type="button"
          onClick={() => setShowTurnos((prev) => !prev)}
          className="flex min-h-[88px] flex-col justify-between rounded-[24px] border border-zinc-800 bg-zinc-950/50 px-5 py-4 text-left text-white transition hover:border-[#8cff59]/30"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Agenda</span>
          <div>
            <p className="text-xl font-semibold">Turnos de hoy</p>
            <p className="mt-1 text-sm text-zinc-400">
              {turnos.length > 0 ? `${turnos.length} turno${turnos.length === 1 ? "" : "s"} en foco` : "Sin turnos cargados"}
            </p>
          </div>
        </button>

        {/* Vender producto */}
        <Link
          href="/caja/vender"
          className="flex min-h-[88px] flex-col justify-between rounded-[24px] border border-zinc-800 bg-zinc-950/50 px-5 py-4 text-left text-white transition hover:border-[#8cff59]/30"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Retail</span>
          <div>
            <p className="text-xl font-semibold">Vender producto</p>
            <p className="mt-1 text-sm text-zinc-400">Cobrar con stock disponible.</p>
          </div>
        </Link>

        {/* Ver caja */}
        <Link
          href="/caja"
          className="flex min-h-[88px] flex-col justify-between rounded-[24px] border border-zinc-800 bg-zinc-950/50 px-5 py-4 text-left text-white transition hover:border-[#8cff59]/30"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Control</span>
          <div>
            <p className="text-xl font-semibold">Ver caja</p>
            <p className="mt-1 text-sm text-zinc-400">Movimientos y estado del día.</p>
          </div>
        </Link>
      </div>

      {/* Modal nueva atención */}
      {showNueva && (
        <Modal onClose={() => setShowNueva(false)}>
          <div className="mb-4">
            <p className="eyebrow text-xs font-semibold text-zinc-500">Caja</p>
            <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
              Nueva atención
            </h2>
          </div>
          <QuickCheckoutPanel
            servicios={servicios}
            mediosPago={mediosPago}
            action={action}
            returnTo="/hoy"
          />
        </Modal>
      )}

      {/* Panel de turnos */}
      {showTurnos ? (
        <section className="rounded-[26px] border border-zinc-800 bg-zinc-950/50 p-5 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Mini agenda</p>
              <h3 className="mt-2 text-xl font-semibold">Lo próximo de hoy</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/turnos#agenda" className="inline-flex min-h-[44px] items-center rounded-xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a]">
                + Nuevo turno
              </Link>
              <Link href="/turnos" className="inline-flex min-h-[44px] items-center rounded-xl border border-zinc-700 px-4 text-sm font-medium text-zinc-200 hover:bg-white/5">
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
                <div key={turno.id} className="rounded-[22px] border border-zinc-800 bg-zinc-950 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{turno.clienteNombre}</p>
                      <p className="mt-1 text-sm text-zinc-400">{turno.horaInicio} · {turno.estado}</p>
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
    </div>
  );
}
